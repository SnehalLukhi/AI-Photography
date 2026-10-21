/** Forgot / reset password: the e-mail is replaced by a recorder (test-only). */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app, db
const sent = []
const post = (path, body) => fetch(`${app.base}/api/auth/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '' }, body: JSON.stringify(body) })
const tokenOf = (mail) => new URL(mail.link).searchParams.get('token')

before(async () => {
  process.env.FRONTEND_BASE_URL = 'http://app.test'
  process.env.PASSWORD_RESET_EXPIRE_MINUTES = '30'
  const mailer = require('../src/services/mailer.service')
  mailer.isConfigured = () => true
  mailer.sendPasswordReset = async (to, link, minutes) => { sent.push({ to, link, minutes }) }
  app = await h.startApp(require('../src/app'))
  db = require('../src/db').getDb()
  await post('register', { email: 'reset@example.com', password: 'old-password-1' })
})
after(async () => { await app.close() })

test('forgot password answers the same for known and unknown emails; only a known one gets a link', async () => {
  const known = await post('forgot-password', { email: ' Reset@Example.com ' })
  const unknown = await post('forgot-password', { email: 'nobody@example.com' })
  assert.equal(known.status, 200)
  assert.equal(unknown.status, 200)
  assert.deepEqual(await known.json(), await unknown.json())
  assert.equal(sent.length, 1)
  assert.equal(sent[0].to, 'reset@example.com')
  assert.equal(sent[0].minutes, 30)
  assert.match(sent[0].link, /^http:\/\/app\.test\/reset-password\?token=[A-Za-z0-9_-]{40,}$/)
  assert.equal((await post('forgot-password', { email: 'not-an-email' })).status, 400)
  assert.equal((await post('forgot-password', {})).status, 400)
  const stored = db.prepare('SELECT token_hash FROM password_resets').all()
  assert.ok(stored.every((r) => r.token_hash !== tokenOf(sent[0]))) // only a hash is stored
})

test('a second request within a minute does not send another e-mail', async () => {
  const before = sent.length
  assert.equal((await post('forgot-password', { email: 'reset@example.com' })).status, 200)
  assert.equal(sent.length, before)
})

test('the link sets a new password once; the old password stops working', async () => {
  const token = tokenOf(sent[0])
  assert.equal((await post('reset-password', { token, password: 'short' })).status, 400)
  assert.equal((await post('reset-password', { token: 'x'.repeat(43), password: 'new-password-1' })).status, 400) // unknown token
  const ok = await post('reset-password', { token, password: 'new-password-1' })
  assert.equal(ok.status, 200)
  assert.equal((await post('login', { email: 'reset@example.com', password: 'new-password-1' })).status, 200)
  assert.equal((await post('login', { email: 'reset@example.com', password: 'old-password-1' })).status, 401)
  const again = await post('reset-password', { token, password: 'another-password-1' })
  assert.equal(again.status, 400)
  assert.equal((await again.json()).error.code, 'INVALID_RESET_TOKEN')
})

test('an expired link is refused', async () => {
  db.prepare('UPDATE password_resets SET created_at = 0')  .run() // lift the one-per-minute limit
  await post('forgot-password', { email: 'reset@example.com' })
  const token = tokenOf(sent.at(-1))
  db.prepare('UPDATE password_resets SET expires_at = 1').run()
  assert.equal((await post('reset-password', { token, password: 'new-password-2' })).status, 400)
  assert.equal((await post('login', { email: 'reset@example.com', password: 'new-password-1' })).status, 200) // unchanged
})
