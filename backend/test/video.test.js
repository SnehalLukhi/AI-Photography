/** Admin "Video lab": the Picsart API is replaced by a stand-in; checks the requests we send (bearer key, model + params) and how results and errors are passed on. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app, baseFetch, db
const sent = []
const viggleSent = []
let viggleState = 0
let polls = 0
const H = { 'content-type': 'application/json', 'x-admin-key': 'admin-secret' }
const call = async (method, path, body, headers = H) => { const r = await fetch(`${app.base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); const t = await r.text(); return { status: r.status, json: () => JSON.parse(t) } }

before(async () => {
  Object.assign(process.env, { ADMIN_API_KEY: 'admin-secret', PICSART_API_KEY: 'pk_test_123', VIGGLE_API_KEY: 'vk_test_1' })
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    if (u.startsWith('https://clips.example/')) return u.includes('/watch') ? new Response('<html></html>', { headers: { 'content-type': 'text/html; charset=utf-8' } }) : u.includes('/gone') ? new Response('', { status: 404 }) : new Response('VIDEO', { status: 206, headers: { 'content-type': 'video/mp4' } })
    if (u.startsWith('https://apis.viggle.ai/v1/')) {
      const j = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
      viggleSent.push({ method: init.method, path: u.slice('https://apis.viggle.ai/v1'.length), auth: init.headers?.authorization, form: init.body instanceof FormData ? Object.fromEntries(init.body) : null })
      if (u.endsWith('/renders')) return init.body.get('image_url').includes('bad') ? j({ error: { message: 'Image not reachable' } }, 422) : j({ id: 'rnd_1', status: 'queued' }, 201)
      viggleState += 1
      return viggleState < 2 ? j({ id: 'rnd_1', status: 'processing' }) : j({ id: 'rnd_1', status: 'ready', video_url: 'https://cdn.viggle.ai/out.mp4' })
    }
    if (!u.startsWith('https://api.picsart.com/')) return baseFetch(url, init)
    const path = u.slice('https://api.picsart.com'.length)
    sent.push({ method: init.method, path, auth: init.headers?.authorization, body: init.body ? JSON.parse(init.body) : null })
    const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
    if (path === '/workflows/v1/models/submit') return init.body.includes('bad-model') ? json({ message: 'Unknown model' }, 400) : json({ status: 'success', response: { id: 'task_abc123' } })
    if (path === '/workflows/v1/models/task_abc123/result') { polls += 1; return polls < 2 ? json({ status: 'success', response: { id: 'task_abc123', status: 'IN_PROGRESS' } }) : json({ status: 'success', response: { id: 'task_abc123', status: 'COMPLETED', result: { url: 'https://cdn.picsart.com/v.mp4', items: [{ url: 'https://cdn.picsart.com/v.mp4' }] }, usage: { credits: 12 } } }) }
    return json({ message: 'nope' }, 404)
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

test('admin only; config says the key is set', async () => {
  assert.equal((await call('GET', '/admin/video/config', undefined, {})).status, 401)
  const c = (await call('GET', '/admin/video/config')).json()
  assert.deepEqual([c.configured, c.apiUrl], [true, 'https://api.picsart.com'])
})

test('submit sends the model and its params with the bearer key; polling gives the video url and credits; the job is logged', async () => {
  const params = { prompt: 'She smiles', imageUrls: ['https://img.example/a.jpg'], quality: '720p', duration: 5 }
  const sub = await call('POST', '/admin/video/submit', { model: 'pixverse-c1-image', params })
  assert.equal(sub.status, 202)
  assert.equal((await sub.json()).id, 'task_abc123')
  assert.deepEqual(sent.at(-1), { method: 'POST', path: '/workflows/v1/models/submit', auth: 'Bearer pk_test_123', body: { params: { model: 'pixverse-c1-image', params } } })
  const first = (await call('GET', '/admin/video/task_abc123/result')).json()
  assert.deepEqual([first.status, first.url], ['IN_PROGRESS', null])
  const done = (await call('GET', '/admin/video/task_abc123/result')).json()
  assert.deepEqual([done.status, done.url, done.credits, done.model], ['COMPLETED', 'https://cdn.picsart.com/v.mp4', 12, 'pixverse-c1-image'])
  const row = (await db.query("SELECT api, template, status FROM api_calls WHERE task_id = 'task_abc123'")).rows[0]
  assert.deepEqual({ ...row }, { api: 'picsart:pixverse-c1-image', template: 'She smiles', status: 'succeeded' })
})

test('errors from Picsart and bad input are passed on clearly', async () => {
  const bad = await call('POST', '/admin/video/submit', { model: 'bad-model', params: { prompt: 'x' } })
  assert.equal(bad.status, 400)
  assert.equal(bad.json().error.message, 'Unknown model')
  assert.equal((await call('POST', '/admin/video/submit', { model: 'no spaces allowed', params: {} })).status, 400)
  assert.equal((await call('POST', '/admin/video/submit', { model: 'kling-v3' })).status, 400) // params missing
  assert.equal((await call('GET', '/admin/video/..%2F/result')).status >= 400, true)
})

test('without PICSART_API_KEY the lab says so', async () => {
  const env = require('../src/config/env')
  env.picsart.apiKey = ''
  assert.equal((await call('GET', '/admin/video/config')).json().configured, false)
  assert.equal((await call('POST', '/admin/video/submit', { model: 'kling-v3', params: { prompt: 'x' } })).status, 503)
  env.picsart.apiKey = 'pk_test_123'
})

test('Viggle: picture + reference video are sent as a form with the bearer key; ready -> COMPLETED with the video url; errors and a missing key are clear', async () => {
  const img = 'https://img.example/me.png'; const vid = 'https://clips.example/dance.mp4'
  const sub = await call('POST', '/admin/video/viggle/submit', { imageUrl: img, motionVideoUrl: vid })
  assert.equal(sub.status, 202)
  assert.equal((await sub.json()).id, 'rnd_1')
  assert.deepEqual(viggleSent.at(-1), { method: 'POST', path: '/renders', auth: 'Bearer vk_test_1', form: { image_url: img, motion_video_url: vid } })
  const first = (await call('GET', '/admin/video/viggle/rnd_1/result')).json()
  assert.deepEqual([first.status, first.url], ['IN_PROGRESS', null])
  const done = (await call('GET', '/admin/video/viggle/rnd_1/result')).json()
  assert.deepEqual([done.status, done.url, done.model], ['COMPLETED', 'https://cdn.viggle.ai/out.mp4', 'viggle'])
  assert.equal((await db.query("SELECT status FROM api_calls WHERE task_id = 'rnd_1' AND api = 'viggle'")).rows[0].status, 'succeeded')

  const bad = await call('POST', '/admin/video/viggle/submit', { imageUrl: 'https://img.example/bad.png', motionVideoUrl: vid })
  assert.equal(bad.status, 400)
  assert.equal(bad.json().error.message, 'Image not reachable')
  assert.equal((await call('POST', '/admin/video/viggle/submit', { imageUrl: 'nope', motionVideoUrl: vid })).status, 400)

  const env = require('../src/config/env')
  env.viggle.apiKey = ''
  assert.equal((await call('POST', '/admin/video/viggle/submit', { imageUrl: img, motionVideoUrl: vid })).status, 503)
  env.viggle.apiKey = 'vk_test_1'
})

test('Viggle: a reference link that is a web page or gone is rejected with a plain message before Viggle is called', async () => {
  const before = viggleSent.length
  const page = await call('POST', '/admin/video/viggle/submit', { imageUrl: 'https://img.example/me.png', motionVideoUrl: 'https://clips.example/watch?v=1' })
  assert.equal(page.status, 400)
  assert.match(page.json().error.message, /text\/html, not a video/)
  const gone = await call('POST', '/admin/video/viggle/submit', { imageUrl: 'https://img.example/me.png', motionVideoUrl: 'https://clips.example/gone.mp4' })
  assert.equal(gone.status, 400)
  assert.match(gone.json().error.message, /HTTP 404/)
  assert.equal(viggleSent.length, before)
})
