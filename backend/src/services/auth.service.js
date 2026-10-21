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

  const user = await tx(async (db) => {
    let u = (await db.query('SELECT id FROM users WHERE google_sub = $1', [sub])).rows[0]
    if (!u) {
      u = (await db.query('SELECT id FROM users WHERE email = $1', [mail])).rows[0]
      if (u) await db.query('UPDATE users SET google_sub = $1 WHERE id = $2', [sub, u.id]) // same verified email: link to the existing account
    }
    if (!u) {
      u = { id: crypto.randomUUID() }
      await db.query('INSERT INTO users (id, email, name, password_hash, google_sub) VALUES ($1, $2, $3, $4, $5)', [u.id, mail, typeof name === 'string' ? name.trim().slice(0, 80) : '', '', sub])
      await wallet.credit(u.id, env.coins.signupBonus, 'signup_bonus', u.id, db)
    }
    return publicUser((await db.query('SELECT id, email, name, coins FROM users WHERE id = $1', [u.id])).rows[0])
  })
  return { token: signToken(user.id), user }
}

async function getUser(id) {
  const u = (await query('SELECT id, email, name, coins FROM users WHERE id = $1', [id])).rows[0]
  return u ? publicUser(u) : null
}

module.exports = { loginWithGoogle, getUser, verifyToken, signToken }
