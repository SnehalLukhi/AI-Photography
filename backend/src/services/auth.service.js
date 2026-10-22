const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { query, tx } = require('../db')
const wallet = require('./wallet.service')

const b64 = (buf) => Buffer.from(buf).toString('base64url')

// Without JWT_SECRET: a random per-start secret outside production (logins end at restart), no logins at all in production.
let devSecret
function secret() {
  if (env.auth.jwtSecret) return env.auth.jwtSecret
  if (env.nodeEnv === 'production') throw new AppError(503, 'AUTH_NOT_CONFIGURED', 'Login is not configured on the server (JWT_SECRET is missing).')
  if (!devSecret) { devSecret = crypto.randomBytes(32).toString('hex'); console.warn('[auth] JWT_SECRET is not set: using a temporary secret, logins end when the server restarts.') }
  return devSecret
}

/** Minimal HS256 JWT (header.payload.signature). */
function signToken(userId) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64(JSON.stringify({ sub: userId, iat: now, exp: now + env.auth.tokenTtlSeconds }))}`
  return `${body}.${crypto.createHmac('sha256', secret()).update(body).digest('base64url')}`
}

/** @returns {string|null} the user id, or null for a bad / expired token */
function verifyToken(token) {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3) return null
  const expected = crypto.createHmac('sha256', secret()).update(`${parts[0]}.${parts[1]}`).digest()
  const given = Buffer.from(parts[2], 'base64url')
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
    return typeof p.sub === 'string' && p.exp > Math.floor(Date.now() / 1000) ? p.sub : null
  } catch { return null }
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, coins: u.coins })

const fetchJson = async (url, init) => {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, body: await res.json().catch(() => ({})) }
  } catch { throw new AppError(502, 'GOOGLE_UNREACHABLE', 'Could not reach Google. Please try again.') }
}

/**
 * "Continue with Google": the browser gets a Google access token (scopes openid email profile) and sends it here. It is only trusted after Google itself
 * confirms that it was issued to OUR client id, and the email must be verified by Google. This one call is both log in and sign up: an unknown
 * Google account gets a new user with the free signup coins; a matching email links to the existing user.
 */
async function loginWithGoogle(accessToken) {
  if (!env.auth.googleClientId) throw new AppError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured on the server (GOOGLE_CLIENT_ID is missing).')
  if (typeof accessToken !== 'string' || !accessToken || accessToken.length > 4096) throw new AppError(400, 'INVALID_GOOGLE_TOKEN', 'Google sign-in failed. Please try again.')
  const bad = () => new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Google sign-in failed. Please try again.')

  const info = await fetchJson(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`)
  if (!info.ok || info.body.aud !== env.auth.googleClientId) throw bad() // not issued to this app
  const prof = await fetchJson('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } })
  const { sub, email, email_verified: verified, name } = prof.body
  if (!prof.ok || !sub || typeof email !== 'string' || !(verified === true || verified === 'true')) throw bad()
  const mail = email.trim().toLowerCase()

  const user = await signInWith('google', sub, mail, name)
  return { token: signToken(user.id), user }
}

/**
 * Log in or sign up the user of an outside identity (Google / Apple): the account of that provider id if there is one, else the account with the same verified
 * email (it is linked), else a new account with the free signup coins.
 */
const PROVIDER_COLUMN = { google: 'google_sub', apple: 'apple_sub' } // fixed names: never taken from user input
function signInWith(provider, sub, mail, name) {
  const col = PROVIDER_COLUMN[provider]
  return tx(async (db) => {
    let u = (await db.query(`SELECT id FROM users WHERE ${col} = $1`, [sub])).rows[0]
    if (!u) {
      u = (await db.query('SELECT id FROM users WHERE email = $1', [mail])).rows[0]
      if (u) await db.query(`UPDATE users SET ${col} = $1 WHERE id = $2`, [sub, u.id]) // same verified email: link to the existing account
    }
    if (!u) {
      u = { id: crypto.randomUUID() }
      await db.query(`INSERT INTO users (id, email, name, password_hash, ${col}) VALUES ($1, $2, $3, $4, $5)`, [u.id, mail, typeof name === 'string' ? name.trim().slice(0, 80) : '', '', sub])
      await wallet.credit(u.id, env.coins.signupBonus, 'signup_bonus', u.id, db)
    }
    return publicUser((await db.query('SELECT id, email, name, coins FROM users WHERE id = $1', [u.id])).rows[0])
  })
}

// ---- Sign in with Apple ----
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys'
let appleKeys // { at, keys: [jwk] } - Apple's public signing keys, cached for an hour
async function appleKey(kid) {
  for (const force of [false, true]) { // a kid that is not cached may be a new key: reload once
    if (force || !appleKeys || Date.now() - appleKeys.at > 3600_000) {
      const res = await fetchJson(APPLE_KEYS_URL)
      if (!res.ok || !Array.isArray(res.body.keys)) throw new AppError(502, 'APPLE_UNREACHABLE', 'Could not reach Apple. Please try again.')
      appleKeys = { at: Date.now(), keys: res.body.keys }
    }
    const jwk = appleKeys.keys.find((k) => k.kid === kid)
    if (jwk) return crypto.createPublicKey({ key: jwk, format: 'jwk' })
  }
  return null
}

/** Checks an Apple identity token (a JWT signed by Apple, RS256): signature, issuer, audience = our Services ID, expiry and the nonce the browser made. @returns the token's claims */
async function verifyAppleToken(idToken, nonce) {
  const bad = () => new AppError(401, 'INVALID_APPLE_TOKEN', 'Apple sign-in failed. Please try again.')
  const parts = typeof idToken === 'string' && idToken.length < 8192 ? idToken.split('.') : []
  if (parts.length !== 3) throw bad()
  let header, claims
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch { throw bad() }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string') throw bad()
  const key = await appleKey(header.kid)
  if (!key || !crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'))) throw bad()
  const aud = [].concat(claims.aud)
  if (claims.iss !== 'https://appleid.apple.com' || !aud.includes(env.auth.appleClientId) || !(claims.exp > Date.now() / 1000) || !claims.sub) throw bad()
  if (typeof nonce !== 'string' || !nonce || claims.nonce !== nonce) throw bad() // the token must belong to THIS sign-in (replay protection)
  return claims
}

/**
 * "Continue with Apple": the browser gets an identity token from Apple's sign-in window and sends it here with the nonce it made. Same rules as Google: log in and sign up
 * in one call. Apple sends the user's name only on the very first sign-in, in the browser; the browser passes it along as `name`.
 */
async function loginWithApple({ identityToken, nonce, name }) {
  if (!env.auth.appleClientId) throw new AppError(503, 'APPLE_NOT_CONFIGURED', 'Apple sign-in is not configured on the server (APPLE_CLIENT_ID is missing).')
  const claims = await verifyAppleToken(identityToken, nonce)
  if (typeof claims.email !== 'string' || !(claims.email_verified === true || claims.email_verified === 'true')) throw new AppError(401, 'INVALID_APPLE_TOKEN', 'Apple did not share a verified email for this account. Please try again and allow sharing your email.')
  const user = await signInWith('apple', claims.sub, claims.email.trim().toLowerCase(), name)
  return { token: signToken(user.id), user }
}

async function getUser(id) {
  const u = (await query('SELECT id, email, name, coins FROM users WHERE id = $1', [id])).rows[0]
  return u ? publicUser(u) : null
}

module.exports = { loginWithGoogle, loginWithApple, getUser, verifyToken, signToken }
