/** Without AILAB_API_KEY the generate endpoint must refuse clearly and never reach AILabTools. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app
before(async () => {
  process.env.AILAB_API_KEY = ''
  app = await h.startApp(require('../src/app'))
})
after(async () => { await app.close() })

test('health reports the key is not configured', async () => {
  const body = await (await fetch(`${app.base}/api/health`)).json()
  assert.equal(body.status, 'ok')
  assert.equal(body.ailab.apiKeyConfigured, false)
})

test('generate answers 503 AILAB_API_KEY_MISSING with setup instructions', async () => {
  const before = h.tempFiles()
  const f = h.form({ image: { buffer: await h.solid(300, 300, { r: 1, g: 2, b: 3 }), type: 'image/png', filename: 'a.png' } })
  const res = await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.equal(res.status, 503)
  const body = await res.json()
  assert.equal(body.error.code, 'AILAB_API_KEY_MISSING')
  assert.match(body.error.message, /AILAB_API_KEY/)
  assert.deepEqual(h.newTempFiles(before), [])
})
