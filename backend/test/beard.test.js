/**
 * AI Beard Styling integration tests. A local HTTP stand-in for AILabTools (test-only) asserts that OUR request matches the official documentation of
 * POST /api/portrait/editing/ai-beard-styling: header ailabapi-api-key, multipart: image (the user's photo) + image_template (reference image FILE),
 * and never the `beard` preset (it would override image_template). Result: data.result_urls (async task).
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const h = require('./helpers')
const JSON_TEMPLATES = require('../../src/data/ai-beard-styling_templates.json').categories[0].templates
const TABLE = require('../src/config/beardTemplates')
const DIR = path.join(__dirname, '..', '..', 'public', 'images', 'explore', 'beard')

let mock, app
const part = (call, name) => call.parts?.find((p) => p.name === name)
const beardPosts = () => mock.calls.filter((c) => c.method === 'POST' && c.url.includes('ai-beard-styling')).length

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST' && call.url.startsWith('/api/portrait/editing/ai-beard-styling')) {
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_id: 'task_beard' } }
    }
    if (call.url.startsWith('/api/common/query-async-task-result')) {
      return { json: { request_id: 'r2', log_id: 'l2', error_detail: { code: '', code_message: '', message: '' }, task_status: 2, data: { result_urls: ['https://example.invalid/beard.png'] } } }
    }
    return { status: 404, json: {} }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '10'
  process.env.AILAB_POLL_TIMEOUT_MS = '1500'
  process.env.RATE_LIMIT_MAX = '1000'
  app = await h.startApp(require('../src/app'))
})
after(async () => { await app.close(); await mock.close() })

const img = async (format = 'jpeg') => ({ buffer: await h.solid(600, 800, { r: 120, g: 90, b: 70 }, format), type: `image/${format}`, filename: `p.${format === 'jpeg' ? 'jpg' : format}` })
const post = (files, f) => fetch(`${app.base}/api/beard/generate`, { method: 'POST', body: h.form(files, f) })

test('the backend table covers exactly the JSON ids; only beard_vandykerefined has no preview image; every mapped file exists', () => {
  assert.equal(JSON_TEMPLATES.length, 24)
  assert.deepEqual(Object.keys(TABLE).sort(), JSON_TEMPLATES.map((t) => t.id).sort())
  assert.deepEqual(Object.entries(TABLE).filter(([, f]) => !f).map(([id]) => id), ['beard_vandykerefined'])
  for (const f of Object.values(TABLE).filter(Boolean)) assert.ok(fs.existsSync(path.join(DIR, f)), f)
})

test('ALL 23 templates: image = the photo, image_template = that template\'s own preview image, nothing else (no `beard`)', async () => {
  const photo = await img()
  for (const [id, file] of Object.entries(TABLE).filter(([, f]) => f)) {
    const before = mock.calls.length
    const res = await post({ image: photo }, { template: id })
    assert.equal(res.status, 200, id)
    const body = await res.json()
    assert.equal(body.status, 'succeeded')
    assert.equal(body.provider, 'ai-beard-styling')
    assert.deepEqual(body.images, ['https://example.invalid/beard.png'])
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['image', 'image_template'], `${id}: no other fields are sent`)
    assert.ok(part(submit, 'image').data.equals(photo.buffer), `${id}: image is the user's photo`)
    assert.ok(part(submit, 'image_template').data.equals(fs.readFileSync(path.join(DIR, file))), `${id}: image_template is ${file}`)
    assert.equal(part(submit, 'image_template').type, 'image/jpeg')
  }
})

test('validation: photo, template, unknown id, id without a preview image, path tricks, fake image', async () => {
  const photo = await img()
  const start = beardPosts()
  let r = await post({}, { template: 'beard_balbo' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, {}); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'MISSING_FIELDS')
  r = await post({ image: photo }, { template: 'Balbo' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TEMPLATE') // a file name is not an id
  r = await post({ image: photo }, { template: '../../package.json' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: '__proto__' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: 'beard_vandykerefined' }); assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'TEMPLATE_IMAGE_MISSING')
  r = await post({ image: { buffer: Buffer.from('nope'), type: 'image/jpeg', filename: 'x.jpg' } }, { template: 'beard_balbo' }); assert.equal(r.status, 422)
  assert.equal(beardPosts(), start, 'invalid input never reaches AILabTools')
})

test('WebP photos are accepted (docs: JPEG/JPG/PNG/WEBP)', async () => {
  assert.equal((await post({ image: await img('webp') }, { template: 'beard_balbo' })).status, 200)
})

test('the existing AI Photography endpoint is untouched', async () => {
  const before = mock.calls.length
  const f = h.form({ image: await img('webp') }, { style_title: 'Golden hour', style_desc: 'Warm light', image_size: '9:16' })
  await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.ok(mock.calls.slice(before).find((c) => c.method === 'POST').url.startsWith('/api/image/effects/ai-photography'))
})

test('no uploaded file is left on disk after any Beard request', async () => {
  const before = h.tempFiles()
  await post({ image: await img() }, { template: 'beard_balbo' })
  await post({ image: await img() }, { template: 'bad' })
  await post({ image: await img() }, { template: 'beard_vandykerefined' })
  assert.deepEqual(h.newTempFiles(before), [])
})
