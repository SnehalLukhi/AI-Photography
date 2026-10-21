/** Login tokens: /me, tampered / missing tokens on every private endpoint, and the daily generation limit. (Google sign-in itself: google.test.js) */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let mock, app

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

test('/api/auth/me returns the logged-in user', async () => {
  const u = await h.createUser('nia@example.com', 'Nia')
  const me = await (await fetch(`${app.base}/api/auth/me`, { headers: { authorization: `Bearer ${u.token}` } })).json()
  assert.equal(me.user.email, 'nia@example.com')
  assert.equal(me.user.name, 'Nia')
  assert.ok(!JSON.stringify(me).includes('password'))
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
  const gen = async (token, fields = { style_title: 'a', style_desc: 'b' }) => fetch(`${app.base}/api/photos/generate`, { method: 'POST', headers: token ? { authorization: `Bearer ${token}` } : {}, body: h.form({ image: await img() }, fields) })
  assert.equal((await gen(undefined, { style_title: 'a' })).status, 400) // invalid request: not counted
  assert.equal((await gen()).status, 200)
  assert.equal((await gen()).status, 200)
  const third = await gen()
  assert.equal(third.status, 429)
  assert.equal((await third.json()).error.code, 'DAILY_LIMIT_REACHED')
  const other = await h.createUser('second@example.com')
  assert.equal((await gen(other.token)).status, 200) // another user still has theirs
})
