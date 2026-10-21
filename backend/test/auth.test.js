/** Accounts: register / login / token checks, and that every costly or private endpoint needs a login and respects the daily limit. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let mock, app
const json = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json', authorization: '' }, body: JSON.stringify(body) })

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST') return { json: { task_type: 'async', task_id: 'task_AUTH-001' } }
    return { json: { task_status: 2, data: { url: 'https://example.invalid/a.jpg' } } }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '10'
  process.env.AILAB_POLL_TIMEOUT_MS = '1000'
  process.env.RATE_LIMIT_MAX = '1000'
  process.env.DAILY_GENERATION_LIMIT = '2'
  app = await h.startApp(require('../src/app'))
})
after(async () => { await app.close(); await mock.close() })

test('register, login and /me; wrong password and duplicate email are refused', async () => {
  const reg = await fetch(`${app.base}/api/auth/register`, json({ email: ' New@Example.com ', password: 'long-enough-1', name: 'Nia' }))
  assert.equal(reg.status, 201)
  const { token, user } = await reg.json()
  assert.equal(user.email, 'new@example.com')
  assert.ok(!JSON.stringify(user).includes('password'))
  assert.equal((await fetch(`${app.base}/api/auth/register`, json({ email: 'new@example.com', password: 'long-enough-1' }))).status, 409)
  assert.equal((await fetch(`${app.base}/api/auth/register`, json({ email: 'bad', password: 'long-enough-1' }))).status, 400)
  assert.equal((await fetch(`${app.base}/api/auth/register`, json({ email: 'x@example.com', password: 'short' }))).status, 400)

  assert.equal((await fetch(`${app.base}/api/auth/login`, json({ email: 'NEW@example.com', password: 'long-enough-1' }))).status, 200)
  assert.equal((await fetch(`${app.base}/api/auth/login`, json({ email: 'new@example.com', password: 'wrong-password' }))).status, 401)
  assert.equal((await fetch(`${app.base}/api/auth/login`, json({ email: 'nobody@example.com', password: 'whatever-123' }))).status, 401)

  const me = await fetch(`${app.base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })
  assert.equal((await me.json()).user.name, 'Nia')
})

test('bad, tampered or missing tokens are refused everywhere', async () => {
  const tampered = `${app.token.slice(0, -2)}xx`
  for (const authorization of ['', 'Bearer nonsense', `Bearer ${tampered}`]) {
    for (const [method, path] of [['GET', '/auth/me'], ['GET', '/generations'], ['GET', '/photos/tasks/task_abcdef'], ['POST', '/photos/generate'], ['POST', '/cartoon/generate'], ['POST', '/beard/generate'], ['POST', '/hairstyle/generate']]) {
      const res = await fetch(`${app.base}/api${path}`, { method, headers: { authorization } })
      assert.equal(res.status, 401, `${method} ${path} with "${authorization.slice(0, 12)}"`)
    }
  }
  assert.equal((await fetch(`${app.base}/api/health`, { headers: { authorization: '' } })).status, 200) // health stays public
})

test('daily generation limit: counted per user, failed requests are given back', async () => {
  const img = async () => ({ buffer: await h.solid(300, 400, { r: 9, g: 9, b: 9 }, 'jpeg'), type: 'image/jpeg', filename: 'p.jpg' })
  const gen = async (fields = { style_title: 'a', style_desc: 'b' }) => fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: h.form({ image: await img() }, fields) })
  assert.equal((await gen({ style_title: 'a' })).status, 400) // invalid request: not counted
  assert.equal((await gen()).status, 200)
  assert.equal((await gen()).status, 200)
  const third = await gen()
  assert.equal(third.status, 429)
  assert.equal((await third.json()).error.code, 'DAILY_LIMIT_REACHED')
  const other = (await (await fetch(`${app.base}/api/auth/register`, json({ email: 'second@example.com', password: 'long-enough-1' }))).json()).token
  const res = await fetch(`${app.base}/api/photos/generate`, { method: 'POST', headers: { authorization: `Bearer ${other}` }, body: h.form({ image: await img() }, { style_title: 'a', style_desc: 'b' }) })
  assert.equal(res.status, 200) // another user still has theirs
})
