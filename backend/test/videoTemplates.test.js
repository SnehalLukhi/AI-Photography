/** Video templates: admin saves a reference video + prompt, a user adds a photo. Picsart and Spaces are stand-ins; checks what is sent, coins taken / refunded once, and results. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app, baseFetch, db, wallet, user
const store = new Map()
const sent = []
let nextTask = 0
let state = 'IN_PROGRESS' // what the stand-in Picsart reports for every task
const A = { 'content-type': 'application/json', 'x-admin-key': 'admin-secret' }
const api = (path, init = {}) => fetch(`${app.base}/api${path}`, init)
const admin = (method, path, body) => api(path, { method, headers: A, body: body === undefined ? undefined : JSON.stringify(body) })
const photo = async () => h.form({ image: { buffer: await h.solid(64, 64, { r: 200, g: 100, b: 50 }, 'jpeg'), type: 'image/jpeg', filename: 'me.jpg' } })

before(async () => {
  Object.assign(process.env, { ADMIN_API_KEY: 'admin-secret', PICSART_API_KEY: 'pk_test_123' })
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  wallet = require('../src/services/wallet.service')
  user = await db.query("SELECT id FROM users WHERE email = 'tester@example.com'").then((r) => r.rows[0])
  const storage = require('../src/services/storage.service')
  storage.isConfigured = () => true
  storage.putImage = async (key, body) => { store.set(key, Buffer.from(body)) }
  storage.deleteObject = async (key) => { store.delete(key) }
  storage.publicUrl = (key) => `https://public.invalid/${key}`
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
    if (u.startsWith('https://clips.example/')) return new Response(Buffer.from('VIDEO'), { headers: { 'content-type': 'video/mp4' } })
    if (u.startsWith('https://api.picsart.com/')) {
      const path = u.slice('https://api.picsart.com'.length)
      if (path === '/workflows/v1/models/submit') { sent.push(JSON.parse(init.body)); return json({ response: { id: `task_${++nextTask}` } }) }
      if (/\/result$/.test(path)) {
        const id = path.split('/')[4]
        return json({ response: { id, status: state, ...(state === 'COMPLETED' ? { result: { url: 'https://clips.example/done.mp4' } } : {}), ...(state === 'FAILED' ? { error: { message: 'bad photo' } } : {}) } })
      }
    }
    return baseFetch(url, init)
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

let tplId
test('admin creates a template; the reference video is copied into storage; the app list hides the prompt and model', async () => {
  assert.equal((await api('/admin/video-templates', { headers: { 'x-admin-key': 'wrong' } })).status, 401)
  assert.equal((await admin('POST', '/admin/video-templates', { title: 'Dance', videoUrl: 'not a url' })).status, 400)
  assert.equal((await admin('POST', '/admin/video-templates', { title: 'Dance', videoUrl: 'https://clips.example/ref.mp4', params: { imageUrls: ['x'] } })).status, 400)
  const res = await admin('POST', '/admin/video-templates', { title: 'Dance', videoUrl: 'https://clips.example/ref.mp4', prompt: 'She dances', params: { resolution: '720p' }, costCoins: 900 })
  assert.equal(res.status, 201)
  const t = (await res.json()).template
  tplId = t.id
  assert.match(t.videoUrl, /^https:\/\/public\.invalid\/video-templates\/[0-9a-f]+\.mp4$/)
  assert.deepEqual([t.model, t.videoKey, t.cost], ['kling-motion-control', 'videoUrl', 900])
  const list = (await (await api('/video-templates')).json()).templates
  assert.equal(list.length, 1)
  assert.deepEqual(Object.keys(list[0]).sort(), ['cost', 'description', 'id', 'previewUrl', 'title'])
})

test('generating takes the coins, sends the photo + reference video + prompt to the model, and stores nothing of the photo afterwards', async () => {
  const before = await wallet.balance(user.id)
  const res = await api(`/video-templates/${tplId}/generate`, { method: 'POST', body: await photo() })
  assert.equal(res.status, 202)
  const { job } = await res.json()
  assert.equal(await wallet.balance(user.id), before - 900)
  const body = sent.at(-1).params
  assert.equal(body.model, 'kling-motion-control')
  assert.equal(body.params.prompt, 'She dances')
  assert.equal(body.params.resolution, '720p')
  assert.match(body.params.imageUrls[0], /^https:\/\/public\.invalid\/video-inputs\//)
  assert.match(body.params.videoUrl, /video-templates\//)

  state = 'IN_PROGRESS'
  assert.equal((await (await api(`/video-jobs/${job.id}`)).json()).job.status, 'processing')
  state = 'COMPLETED'
  const done = (await (await api(`/video-jobs/${job.id}`)).json()).job
  assert.equal(done.status, 'succeeded')
  assert.match(done.url, /^https:\/\/public\.invalid\/video-results\//) // copied: lasts longer than Picsart's link
  assert.equal([...store.keys()].some((k) => k.startsWith('video-inputs/')), false) // the user's photo is gone
  assert.equal(await wallet.balance(user.id), before - 900) // no refund for a success
})

test('a failed video gives the coins back once, however often it is polled', async () => {
  state = 'IN_PROGRESS'
  const before = await wallet.balance(user.id)
  const { job } = await (await api(`/video-templates/${tplId}/generate`, { method: 'POST', body: await photo() })).json()
  state = 'FAILED'
  for (let i = 0; i < 3; i++) assert.equal((await (await api(`/video-jobs/${job.id}`)).json()).job.status, 'failed')
  assert.equal(await wallet.balance(user.id), before)
})

test('not enough coins: 402 and nothing is sent to Picsart; another user cannot see the job; inactive templates are hidden', async () => {
  const sentBefore = sent.length
  await db.query('UPDATE users SET coins = 10 WHERE id = $1', [user.id])
  assert.equal((await api(`/video-templates/${tplId}/generate`, { method: 'POST', body: await photo() })).status, 402)
  assert.equal(sent.length, sentBefore)
  await db.query('UPDATE users SET coins = 1000000 WHERE id = $1', [user.id])
  const other = await h.createUser('other@example.com')
  assert.equal((await api('/video-jobs/task_1', { headers: { authorization: `Bearer ${other.token}` } })).status, 404)
  await admin('PUT', `/admin/video-templates/${tplId}`, { active: false })
  assert.equal((await (await api('/video-templates')).json()).templates.length, 0)
  assert.equal((await api(`/video-templates/${tplId}/generate`, { method: 'POST', body: await photo() })).status, 404)
})

test('a Picsart error while starting refunds the coins', async () => {
  await admin('PUT', `/admin/video-templates/${tplId}`, { active: true })
  const before = await wallet.balance(user.id)
  const real = globalThis.fetch
  globalThis.fetch = async (url, init) => (String(url).endsWith('/models/submit') ? new Response(JSON.stringify({ message: 'Unknown model' }), { status: 400, headers: { 'content-type': 'application/json' } }) : real(url, init))
  const res = await api(`/video-templates/${tplId}/generate`, { method: 'POST', body: await photo() })
  globalThis.fetch = real
  assert.equal(res.status, 400)
  assert.equal(await wallet.balance(user.id), before)
})
