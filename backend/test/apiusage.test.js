/** Every call to the image provider is logged (outcome, time, ids, coins) and shown to the admin together with the result image. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let mock, app, user
const store = new Map()
const H = { 'x-admin-key': 'admin-secret' }
const usage = async (q = '') => (await (await fetch(`${app.base}/api/admin/api-usage${q}`, { headers: H })).json())
const generate = async (title) => fetch(`${app.base}/api/photos/generate`, { method: 'POST', headers: { authorization: `Bearer ${user.token}` }, body: h.form({ image: { buffer: await h.solid(300, 400, { r: 5, g: 50, b: 90 }, 'jpeg'), type: 'image/jpeg', filename: 'p.jpg' } }, { style_title: title, style_desc: 'd', template_name: title }) })

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST') {
      const title = call.parts?.find((p) => p.name === 'style_title')?.data.toString()
      if (title === 'NO FACE') return { status: 422, json: { error_detail: { code: 'ERROR_NO_FACE_IN_FILE', code_message: 'no face', message: 'No face found' } } }
      return { json: { request_id: 'r1', log_id: 'l1', task_type: 'async', task_id: 'task_USAGE-1' } }
    }
    return { json: { request_id: 'r2', log_id: 'l2', task_status: 2, data: { out: ['https://example.invalid/out.jpg'] } } }
  })
  Object.assign(process.env, { ADMIN_API_KEY: 'admin-secret', AILAB_API_KEY: 'test-key', AILAB_BASE_URL: mock.url, AILAB_POLL_INTERVAL_MS: '20', AILAB_POLL_TIMEOUT_MS: '1500', RATE_LIMIT_MAX: '1000', AILAB_COST_PER_CALL: '0.03', SIGNUP_BONUS_COINS: '1000', COIN_COST_PER_GENERATION: '150' })
  const storage = require('../src/services/storage.service')
  storage.isConfigured = () => true
  storage.putImage = async (key, body) => { store.set(key, Buffer.from(body)) }
  storage.publicUrl = (key) => `https://public.invalid/${key}`
  require('../src/services/ailab.service').downloadImage = async () => ({ buffer: await h.resultJpeg(), mimeType: 'image/jpeg' })
  app = await h.startApp(require('../src/app'))
  user = await h.createUser('usage@example.com', 'Una User')
})
after(async () => { await app.close(); await mock.close() })

test('a finished and a failed call are both logged, with user, template, coins and the result image', async () => {
  assert.equal((await generate('Golden hour')).status, 200)
  assert.equal((await generate('NO FACE')).status, 422)
  const u = await usage()
  assert.deepEqual([u.summary.calls, u.summary.succeeded, u.summary.failed, u.summary.coins, u.summary.success_rate], [2, 1, 1, 150, 50])
  assert.equal(u.summary.estimated_cost_usd, 0.03) // one finished call x $0.03
  assert.deepEqual(u.by_api.map((a) => [a.api, a.calls, a.name]), [['ai-photography', 2, 'AI Photography']])
  assert.deepEqual(u.errors, [{ error_code: 'ERROR_NO_FACE_IN_FILE', count: 1 }])
  const ok = u.calls.items.find((c) => c.status === 'succeeded')
  assert.deepEqual([ok.email, ok.user, ok.template, ok.coins, ok.task_id], ['usage@example.com', 'Una User', 'Golden hour', 150, 'task_USAGE-1'])
  assert.match(ok.result_url, /^https:\/\/public\.invalid\/generations\/.+\/result\.jpg$/)
  const bad = u.calls.items.find((c) => c.status === 'failed')
  assert.deepEqual([bad.coins, bad.error_code, bad.result_url], [0, 'ERROR_NO_FACE_IN_FILE', null]) // refunded: no coins, no image
  assert.equal((await usage('?status=failed')).calls.total, 1)
  assert.equal((await fetch(`${app.base}/api/admin/api-usage`)).status, 401)
})
