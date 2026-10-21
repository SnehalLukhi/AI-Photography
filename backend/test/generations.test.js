/**
 * Stored images (DigitalOcean Spaces): the storage service is replaced by an in-memory stand-in (test-only) and AILabTools by the local mock,
 * to check that the original and the AI result are saved together, can be fetched / listed / deleted, and that storage problems never break generation.
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

const store = new Map()
let mock, app, storageUp = true
let other // token of a second user

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST') return { json: { request_id: 'r1', log_id: 'l1', task_type: 'async', task_id: 'task_STORE-001' } }
    return { json: { request_id: 'r2', log_id: 'l2', task_status: 2, data: { out: ['https://example.invalid/out.jpg'] } } }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '20'
  process.env.AILAB_POLL_TIMEOUT_MS = '1500'
  process.env.RATE_LIMIT_MAX = '1000'

  const storage = require('../src/services/storage.service')
  storage.isConfigured = () => storageUp
  storage.putImage = async (key, body) => { if (!storageUp) throw new Error('down'); store.set(key, Buffer.from(body)) }
  storage.deleteObject = async (key) => { store.delete(key) }
  storage.publicUrl = (key) => `https://public.invalid/${key}`
  require('../src/services/ailab.service').downloadImage = async () => ({ buffer: await h.resultJpeg(), mimeType: 'image/jpeg' })

  app = await h.startApp(require('../src/app'))
  other = (await h.createUser('other@example.com')).token
})
after(async () => { await app.close(); await mock.close() })

const img = async () => ({ buffer: await h.solid(300, 400, { r: 5, g: 50, b: 90 }, 'jpeg'), type: 'image/jpeg', filename: 'p.jpg' })
const api = (path, init = {}) => fetch(`${app.base}/api${path}`, init)
const as = (token) => ({ headers: { authorization: `Bearer ${token}` } })

test('generate saves the original and the AI result and returns both signed URLs', async () => {
  const res = await api('/photos/generate', { method: 'POST', body: h.form({ image: await img() }, { style_title: 'Golden hour', style_desc: 'Warm light', template_name: 'Retro Vibes' }) })
  assert.equal(res.status, 200)
  const { generation } = await res.json()
  assert.equal(generation.status, 'completed')
  assert.equal(generation.template, 'Retro Vibes')
  assert.equal(generation.original.url, `https://public.invalid/generations/${generation.id}/original.jpg`)
  assert.equal(generation.result.url, `https://public.invalid/generations/${generation.id}/result.jpg`)
  assert.deepEqual([...store.keys()].sort(), [`generations/${generation.id}/original.jpg`, `generations/${generation.id}/result.jpg`]) // ONLY the two images are stored

  const got = await (await api(`/generations/${generation.id}`)).json()
  assert.equal(got.generation.id, generation.id)
  assert.equal(got.generation.status, 'completed')
})

test('GET /api/generations lists only the user\'s own generations; others cannot read or delete them', async () => {
  const list = await (await api('/generations')).json()
  assert.equal(list.generations.length, 1)
  const id = list.generations[0].id
  assert.equal((await (await api('/generations', as(other))).json()).generations.length, 0)
  assert.equal((await api('/generations', { headers: { authorization: '' } })).status, 401) // not logged in
  assert.equal((await api(`/generations/${id}`, as(other))).status, 404) // someone else's generation looks missing
  assert.equal((await api(`/generations/${id}`, { method: 'DELETE', ...as(other) })).status, 404)
  assert.equal((await api(`/generations/${id}`)).status, 200)
  assert.equal((await api(`/generations/${id}`, { method: 'DELETE' })).status, 200)
  assert.equal((await api(`/generations/${id}`)).status, 404)
  assert.equal(store.size, 0) // both images are gone from storage
  assert.equal((await (await api('/generations')).json()).generations.length, 0)
})

test('upload endpoint saves an original, result endpoint adds the AI image once', async () => {
  const created = await api('/generations', { method: 'POST', body: h.form({ image: await img() }) })
  assert.equal(created.status, 201)
  const { generation } = await created.json()
  assert.equal(generation.status, 'pending')
  assert.equal(generation.result, null)

  const saved = await api(`/generations/${generation.id}/result`, { method: 'POST', body: h.form({ image: await img() }) })
  assert.equal(saved.status, 201)
  assert.equal((await saved.json()).generation.status, 'completed')
  assert.equal((await api(`/generations/${generation.id}/result`, { method: 'POST', body: h.form({ image: await img() }) })).status, 409)
  assert.equal((await api('/generations/not-a-uuid')).status, 400)
  assert.equal((await api('/generations/00000000-0000-4000-8000-000000000000')).status, 404)
  assert.equal((await api('/generations', { method: 'POST', body: h.form({}) })).status, 400)
})

test('a storage outage never breaks generation', async () => {
  storageUp = false
  const res = await api('/photos/generate', { method: 'POST', body: h.form({ image: await img() }, { style_title: 'x', style_desc: 'y' }) })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, 'succeeded')
  assert.equal(body.generation, undefined)
  assert.deepEqual(await (await api('/generations')).json(), { success: true, generations: [] }) // nothing to list while storage is off
  storageUp = true
})

test('listing pages through the newest generations first', async () => {
  const ids = []
  for (let i = 0; i < 3; i++) {
    const res = await api('/generations', { method: 'POST', body: h.form({ image: await img() }, { template_name: `t${i}` }) })
    ids.push((await res.json()).generation.id)
    await new Promise((r) => setTimeout(r, 5)) // distinct creation times
  }
  const first = await (await api('/generations?limit=2')).json()
  assert.deepEqual(first.generations.map((g) => g.template), ['t2', 't1'])
  assert.ok(first.nextToken)
  const second = await (await api(`/generations?limit=2&nextToken=${first.nextToken}`)).json()
  assert.ok(second.generations.map((g) => g.template).includes('t0'))
  assert.equal(second.nextToken, undefined)
  assert.equal((await api('/generations?nextToken=garbage')).status, 400)
})
