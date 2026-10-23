/** Test helpers: a local stand-in for the AILabTools server (used ONLY by tests) and image builders. */
const http = require('node:http')
const fs = require('node:fs')
const sharp = require('sharp')
const { UPLOAD_DIR } = require('../src/utils/tempFiles')

// Test environment, set before the app is loaded: throw-away in-memory Postgres (PGlite), fixed token secret, no login rate limit.
process.env.DATABASE_URL = 'pglite://memory'
process.env.JWT_SECRET = 'test-secret'
process.env.AUTH_RATE_LIMIT_MAX = '1000'
process.env.DAILY_GENERATION_LIMIT = '100000'
// the developer's real backend/.env must never leak into the tests (dotenv does not override variables that are already set, even empty ones)
for (const k of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RAZORPAY_PLAN_WEEKLY', 'RAZORPAY_PLAN_MONTHLY', 'RAZORPAY_PLAN_YEARLY', 'RAZORPAY_PLAN_TEST', 'RAZORPAY_PLAN_WEEKLY_INR', 'RAZORPAY_PLAN_MONTHLY_INR', 'RAZORPAY_PLAN_YEARLY_INR', 'RAZORPAY_OFFER_YEARLY', 'RAZORPAY_OFFER_YEARLY_INR', 'DEFAULT_CURRENCY']) process.env[k] = ''
process.env.COIN_COST_PER_GENERATION = '1' // tests make many generations: plenty of cheap coins
process.env.SIGNUP_BONUS_COINS = '1000000'
const rawFetch = globalThis.fetch

const solid = (w, h, rgb, format = 'png') => sharp({ create: { width: w, height: h, channels: 3, background: rgb } })[format]().toBuffer()
const resultJpeg = () => solid(64, 64, { r: 10, g: 200, b: 90 }, 'jpeg')

/** Split a multipart/form-data body into parts. */
function parseMultipart(body, contentType) {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1]
  if (!boundary) return null
  const parts = []
  const sep = Buffer.from(`--${boundary}`)
  let idx = body.indexOf(sep)
  while (idx !== -1) {
    const next = body.indexOf(sep, idx + sep.length)
    if (next === -1) break
    const chunk = body.subarray(idx + sep.length + 2, next - 2) // strip CRLF around the part
    const headEnd = chunk.indexOf('\r\n\r\n')
    const head = chunk.subarray(0, headEnd).toString()
    parts.push({
      name: /name="([^"]+)"/.exec(head)?.[1],
      filename: /filename="([^"]*)"/.exec(head)?.[1],
      type: /Content-Type:\s*(.+)/i.exec(head)?.[1]?.trim(),
      data: chunk.subarray(headEnd + 4),
    })
    idx = next
  }
  return parts
}

/** Mock AILabTools. `handlers` decides every response; every request is recorded in `calls`. */
async function startMockAilab(handlers) {
  const calls = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', async () => {
      const body = Buffer.concat(chunks)
      const call = { method: req.method, url: req.url, headers: req.headers, body, parts: parseMultipart(body, req.headers['content-type'] || '') }
      calls.push(call)
      const out = await handlers(call, calls.length)
      res.writeHead(out.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(out.json ?? {}))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => server.close(r)) }
}

/** Test-only: creates a user (with the signup coins, like a first Google sign-in) and a login token for it. */
async function createUser(email, name = '') {
  const db = require('../src/db')
  const env = require('../src/config/env')
  const wallet = require('../src/services/wallet.service')
  const id = require('node:crypto').randomUUID()
  await db.tx(async (d) => {
    await d.query('INSERT INTO users (id, email, name) VALUES ($1, $2, $3)', [id, email, name])
    await wallet.credit(id, env.coins.signupBonus, 'signup_bonus', id, d)
  })
  return { id, email, token: require('../src/services/auth.service').signToken(id) }
}

/**
 * Starts the app on a free port. Test-only convenience: creates a user and makes fetch() send that user's token to this app,
 * unless a request sets its own Authorization header (an empty one = not logged in).
 */
async function startApp(app) {
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const { token } = await createUser('tester@example.com')
  globalThis.fetch = (url, init = {}) => {
    if (!String(url).startsWith(base)) return rawFetch(url, init)
    const headers = new Headers(init.headers)
    if (!headers.has('authorization')) headers.set('authorization', `Bearer ${token}`)
    return rawFetch(url, { ...init, headers })
  }
  return { base, token, close: () => { globalThis.fetch = rawFetch; return new Promise((r) => server.close(r)) } }
}

function form(files, fields = {}) {
  const f = new FormData()
  for (const [name, { buffer, type, filename }] of Object.entries(files)) f.append(name, new Blob([buffer], { type }), filename)
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

const tempFiles = () => fs.readdirSync(UPLOAD_DIR)
/** Files that appeared in the upload dir since `before` (ignores leftovers from older runs). */
const newTempFiles = (before) => tempFiles().filter((f) => !before.includes(f))

module.exports = { createUser, solid, resultJpeg, parseMultipart, startMockAilab, startApp, form, tempFiles, newTempFiles }
