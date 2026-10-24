const crypto = require('node:crypto')
const { promisify } = require('node:util')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { query } = require('../db')

const scrypt = promisify(crypto.scrypt)

/**
 * Admin sign-in with a user name and password. Admins live in the table `admin_users` (passwords stored only as scrypt hashes) and are created with the API:
 * POST /api/admin/admins - by a signed-in admin, or with the static ADMIN_API_KEY (x-admin-key), which is how the first admin is made.
 * ADMIN_USERNAME / ADMIN_PASSWORD in the environment still work as one extra admin.
 * A successful login returns a signed token (valid ADMIN_TOKEN_HOURS, default 12) sent as `Authorization: Bearer <token>`. A database admin's token is signed with a key that
 * includes that admin's password hash, so changing the password (or disabling / deleting the admin) ends the sessions at once.
 */
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest()
const same = (a, b) => crypto.timingSafeEqual(sha(a), sha(b))
const b64 = (v) => Buffer.from(v).toString('base64url')
const unb64 = (v) => Buffer.from(v, 'base64url').toString()

const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,39}$/
const bad = (message) => new AppError(400, 'INVALID_ADMIN', message)

async function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  return `scrypt$${salt.toString('base64url')}$${(await scrypt(password, salt, 64)).toString('base64url')}`
}
async function checkPassword(password, stored) {
  const [tag, salt, hash] = String(stored || '').split('$')
  if (tag !== 'scrypt' || !salt || !hash) return false
  const got = await scrypt(String(password || ''), Buffer.from(salt, 'base64url'), 64)
  const want = Buffer.from(hash, 'base64url')
  return got.length === want.length && crypto.timingSafeEqual(got, want)
}
const DUMMY = hashPassword('not-a-real-password') // checked when the user name is unknown, so the time taken does not reveal which user names exist

const envAdminConfigured = () => !!(env.adminUsername && env.adminPassword)
const baseKey = () => `${env.auth.jwtSecret}|${env.adminApiKey}`
const keyFor = (kind, id, secretPart) => crypto.createHmac('sha256', baseKey()).update(`admin|${kind}|${id}|${secretPart}`).digest()

function sign(kind, id, username, secretPart) {
  const exp = Math.floor(Date.now() / 1000) + env.adminTokenHours * 3600
  const body = `adm.${b64(JSON.stringify({ k: kind, i: id, u: username, exp }))}`
  return { token: `${body}.${crypto.createHmac('sha256', keyFor(kind, id, secretPart)).update(body).digest('base64url')}`, username, expiresAt: exp * 1000 }
}

async function login(username, password) {
  const name = String(username || '').trim().toLowerCase()
  const row = name ? (await query('SELECT * FROM admin_users WHERE username = $1', [name])).rows[0] : null
  const ok = await checkPassword(password, row?.password_hash ?? (await DUMMY))
  if (row && row.active && ok) {
    await query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [row.id])
    return sign('db', row.id, row.username, row.password_hash)
  }
  if (envAdminConfigured() && name === env.adminUsername.toLowerCase() && same(password || '', env.adminPassword)) return sign('env', 'env', env.adminUsername, env.adminPassword)
  throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong user name or password.')
}

/** The admin a valid, unexpired token belongs to ({ id, username }), else null. */
async function verify(token) {
  if (typeof token !== 'string') return null
  const [tag, payload, sig] = token.split('.')
  if (tag !== 'adm' || !payload || !sig) return null
  let p
  try { p = JSON.parse(unb64(payload)) } catch { return null }
  if (!(p.exp * 1000 > Date.now())) return null
  let secretPart
  if (p.k === 'db') {
    const row = (await query('SELECT id, username, password_hash, active FROM admin_users WHERE id = $1', [String(p.i)])).rows[0]
    if (!row || !row.active) return null
    secretPart = row.password_hash
  } else if (p.k === 'env' && envAdminConfigured()) secretPart = env.adminPassword
  else return null
  const expected = crypto.createHmac('sha256', keyFor(p.k, p.i, secretPart)).update(`adm.${payload}`).digest('base64url')
  return same(sig, expected) ? { id: String(p.i), username: String(p.u) } : null
}

const out = (r) => ({ id: r.id, username: r.username, active: r.active, created_at: r.created_at, last_login_at: r.last_login_at })

const list = async () => (await query('SELECT * FROM admin_users ORDER BY created_at')).rows.map(out)

function checkNew(username, password) {
  const name = String(username || '').trim().toLowerCase()
  if (!USERNAME_RE.test(name)) throw bad('User name: 3-40 characters, letters, digits, "." "_" or "-".')
  checkPassword10(password)
  return name
}
const checkPassword10 = (password) => { if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw bad('Password: at least 10 characters.') }

async function create(username, password) {
  const name = checkNew(username, password)
  const id = crypto.randomUUID()
  const res = await query('INSERT INTO admin_users (id, username, password_hash) VALUES ($1, $2, $3) ON CONFLICT (username) DO NOTHING RETURNING *', [id, name, await hashPassword(password)])
  if (!res.rows[0]) throw new AppError(409, 'ADMIN_EXISTS', `The admin "${name}" already exists.`)
  return out(res.rows[0])
}

/** Changes the password and / or switches the admin on or off. Either one ends that admin's current sessions. */
async function update(id, { password, active }, actingId) {
  const cur = (await query('SELECT * FROM admin_users WHERE id = $1', [id])).rows[0]
  if (!cur) throw new AppError(404, 'ADMIN_NOT_FOUND', 'No such admin.')
  if (active === false && cur.id === actingId) throw bad('You cannot switch off your own account.')
  let hash = cur.password_hash
  if (password !== undefined) { checkPassword10(password); hash = await hashPassword(password) }
  const res = await query('UPDATE admin_users SET password_hash = $2, active = $3 WHERE id = $1 RETURNING *', [id, hash, typeof active === 'boolean' ? active : cur.active])
  return out(res.rows[0])
}

async function remove(id, actingId) {
  if (id === actingId) throw bad('You cannot delete your own account.')
  const res = await query('DELETE FROM admin_users WHERE id = $1', [id])
  if (!res.rowCount) throw new AppError(404, 'ADMIN_NOT_FOUND', 'No such admin.')
}

module.exports = { login, verify, envAdminConfigured, list, create, update, remove }
