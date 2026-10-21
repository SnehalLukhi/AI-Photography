const crypto = require('node:crypto')
const { promisify } = require('node:util')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { getDb, tx } = require('../db')
const wallet = require('./wallet.service')
const mailer = require('./mailer.service')

const scrypt = promisify(crypto.scrypt)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
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

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  return `scrypt$${salt.toString('base64url')}$${b64(await scrypt(password, salt, 64))}`
}
async function checkPassword(password, stored) {
  const [alg, salt, hash] = stored.split('$')
  if (alg !== 'scrypt') return false
  const expected = Buffer.from(hash, 'base64url')
  return crypto.timingSafeEqual(await scrypt(password, Buffer.from(salt, 'base64url'), expected.length), expected)
}
const DUMMY_HASH = hashPassword('not-a-real-password') // compared against when the email is unknown, so timing does not reveal which emails exist

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, coins: u.coins })

async function register({ email, password, name }) {
  email = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.')
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new AppError(400, 'INVALID_PASSWORD', 'Password must be 8 to 128 characters.')
  name = typeof name === 'string' ? name.trim().slice(0, 80) : ''
  const user = { id: crypto.randomUUID(), email, name, coins: 0, password_hash: await hashPassword(password), created_at: new Date().toISOString() }
  try {
    tx(() => { // the account and its free signup coins are created together
      getDb().prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(user.id, email, name, user.password_hash, user.created_at)
      wallet.credit(user.id, env.coins.signupBonus, 'signup_bonus', user.id)
    })
    user.coins = env.coins.signupBonus
  } catch (e) {
    if (/UNIQUE/i.test(e.message)) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists. Please log in.')
    throw e
  }
  return { token: signToken(user.id), user: publicUser(user) }
}

async function login({ email, password }) {
  email = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const user = getDb().prepare('SELECT * FROM users WHERE email = ?').get(email)
  const ok = typeof password === 'string' && password.length <= 128 && await checkPassword(password, user ? user.password_hash : await DUMMY_HASH)
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password.')
  return { token: signToken(user.id), user: publicUser(user) }
}

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex')
const RESET_COOLDOWN_MS = 60 * 1000 // at most one reset e-mail per account per minute

/**
 * "Forgot password": e-mails a one-time reset link. It ALWAYS answers the same (whether or not the e-mail has an account) so it cannot be used to find out who is registered;
 * the e-mail is sent in the background for the same reason (equal response time).
 */
async function requestPasswordReset(email) {
  email = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_RE.test(email) || email.length > 254) throw new AppError(400, 'INVALID_EMAIL', 'Enter a valid email address.')
  const db = getDb()
  const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email)
  if (!user) return
  const now = Date.now()
  if (db.prepare('SELECT 1 FROM password_resets WHERE user_id = ? AND created_at > ?').get(user.id, now - RESET_COOLDOWN_MS)) return
  const token = crypto.randomBytes(32).toString('base64url')
  db.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(sha256(token), user.id, now + env.passwordReset.expireMinutes * 60 * 1000, now)
  const link = `${env.passwordReset.frontendUrl}/reset-password?token=${token}`
  if (!mailer.isConfigured()) {
    console.warn('[mail] SMTP is not configured (SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM): the reset e-mail was not sent.')
    if (env.nodeEnv !== 'production') console.warn(`[mail] development only - reset link for ${user.email}: ${link}`)
    return
  }
  mailer.sendPasswordReset(user.email, link, env.passwordReset.expireMinutes).catch((e) => console.error('[mail] could not send the reset e-mail:', e.message))
}

/** Sets a new password with the token from the e-mail (one use; all other open reset links of the account are cancelled too). */
async function resetPassword(token, password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new AppError(400, 'INVALID_PASSWORD', 'Password must be 8 to 128 characters.')
  const invalid = () => new AppError(400, 'INVALID_RESET_TOKEN', 'This reset link is invalid or has expired. Please request a new one.')
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) throw invalid()
  const hash = await hashPassword(password)
  tx(() => {
    const db = getDb()
    const row = db.prepare('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > ?').get(sha256(token), Date.now())
    if (!row) throw invalid()
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, row.user_id)
    db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(Date.now(), row.user_id)
  })
}

const fetchJson = async (url, init) => {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) })
    return { ok: res.ok, body: await res.json().catch(() => ({})) }
  } catch { throw new AppError(502, 'GOOGLE_UNREACHABLE', 'Could not reach Google. Please try again.') }
}

/**
 * "Continue with Google": the browser gets a Google access token (scopes openid email profile) and sends it here. It is only trusted after Google itself
 * confirms that it was issued to OUR client id, and the email must be verified by Google. A matching email links to the existing account.
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

  const user = tx(() => {
    const db = getDb()
    let u = db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub)
    if (!u) {
      u = db.prepare('SELECT * FROM users WHERE email = ?').get(mail)
      if (u) db.prepare('UPDATE users SET google_sub = ? WHERE id = ?').run(sub, u.id) // same verified email: link to the existing account
    }
    if (!u) {
      u = { id: crypto.randomUUID(), email: mail, name: typeof name === 'string' ? name.trim().slice(0, 80) : '', password_hash: '', coins: 0, created_at: new Date().toISOString() }
      db.prepare('INSERT INTO users (id, email, name, password_hash, google_sub, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.email, u.name, '', sub, u.created_at)
      wallet.credit(u.id, env.coins.signupBonus, 'signup_bonus', u.id)
    }
    return getUser(u.id)
  })
  return { token: signToken(user.id), user }
}

function getUser(id) {
  const u = getDb().prepare('SELECT id, email, name, coins FROM users WHERE id = ?').get(id)
  return u ? publicUser(u) : null
}

module.exports = { register, login, loginWithGoogle, requestPasswordReset, resetPassword, getUser, verifyToken }
