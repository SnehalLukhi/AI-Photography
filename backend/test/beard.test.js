/**
 * AI Beard Styling integration tests. A local HTTP stand-in for AILabTools (test-only) asserts that OUR request matches the official documentation of
 * POST /api/portrait/editing/ai-beard-styling: header ailabapi-api-key, multipart: image (the user's photo) + image_template (reference image FILE),
 * and never the `beard` preset (it would override image_template). Result: data.result_urls (async task).
 *
 * The 19 Beard Styling templates of the Admin (id, name) are seeded into the throw-away in-memory database in a category whose flow is `beard`; each one has its OWN
 * preview image (served by a local server, a different picture per template), and that preview is what must arrive as `image_template`.
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const http = require('node:http')
const h = require('./helpers')

const BEARD = [
  ['beard-styling-classic-full-beard', 'Classic Full Beard'],
  ['beard_corporatebeard', 'Corporate Beard'],
  ['beard_garibaldi', 'Garibaldi'],
  ['beard_verdi', 'Verdi'],
  ['beard-styling-tapered-full-beard', 'Tapered Full Beard'],
  ['beard_vandyke', 'Van Dyke'],
  ['beard_goatee', 'Goatee'],
  ['beard_extendedgoatee', 'Extended Goatee'],
  ['beard-styling-balbo', 'Balbo'],
  ['beard_ducktailbeardpointed', 'Pointed Ducktail'],
  ['beard_ducktailbeardfull', 'Full Ducktail'],
  ['beard-styling-heavy-stubble', 'Heavy Stubble'],
  ['beard_chevronmoustache', 'Chevron Moustache'],
  ['beard_handlebarmoustache', 'Handlebar Moustache'],
  ['beard_circlebeard', 'Circle Beard'],
  ['beard_chinstrap', 'Chin Strap'],
  ['beard_muttonchops', 'Mutton Chops'],
  ['beard_soulpatch', 'Soul Patch'],
  ['beard_petitegoatee', 'Petite Goatee'],
]

let mock, app, previews, previewBase
const part = (call, name) => call.parts?.find((p) => p.name === name)
const beardPosts = () => mock.calls.filter((c) => c.method === 'POST' && c.url.includes('ai-beard-styling')).length
const previewOf = new Map() // template id -> the exact bytes its preview URL serves

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

  // one distinct picture per template, served like the Admin's storage bucket would
  for (const [i, [id]] of BEARD.entries()) previewOf.set(id, await h.solid(300, 400, { r: (i * 13) % 256, g: (i * 29 + 40) % 256, b: (i * 47 + 90) % 256 }, 'jpeg'))
  previews = http.createServer((req, res) => {
    const id = decodeURIComponent(req.url.replace(/^\/preview\//, '').replace(/\.jpg$/, ''))
    const buf = previewOf.get(id)
    if (!buf) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': buf.length }).end(buf)
  })
  await new Promise((r) => previews.listen(0, '127.0.0.1', r))
  previewBase = `http://127.0.0.1:${previews.address().port}`

  const T = require('../src/services/templates.service')
  await T.saveCategory({ id: 'beard-styling', name: 'Beard Styling', flow: 'beard' })
  await T.saveCategory({ id: 'photo-other', name: 'Other photos', flow: 'photography' })
  await T.createTemplates([
    ...BEARD.map(([id, name]) => ({ id, category_id: 'beard-styling', name, preview_url: `${previewBase}/preview/${encodeURIComponent(id)}.jpg`, active: true })),
    { id: 'plain-photo', category_id: 'photo-other', name: 'Plain photo', preview_url: `${previewBase}/preview/beard_goatee.jpg`, style_title_prompt: 't', style_desc_prompt: 'd' },
    { id: 'broken-preview', category_id: 'beard-styling', name: 'Broken preview', preview_url: `${previewBase}/preview/does-not-exist.jpg`, active: true },
  ])
  app = await h.startApp(require('../src/app'))
})
after(async () => { await app.close(); await mock.close(); await new Promise((r) => previews.close(r)) })

const img = async (format = 'jpeg') => ({ buffer: await h.solid(600, 800, { r: 120, g: 90, b: 70 }, format), type: `image/${format}`, filename: `p.${format === 'jpeg' ? 'jpg' : format}` })
const post = (files, f) => fetch(`${app.base}/api/beard/generate`, { method: 'POST', body: h.form(files, f) })

test('the catalogue reports all 19 Beard Styling templates with the beard flow (never photography)', async () => {
  const T = require('../src/services/templates.service')
  const list = await T.listTemplates({ category: 'beard-styling' })
  const mine = list.filter((t) => BEARD.some(([id]) => id === t.id))
  assert.equal(mine.length, 19)
  assert.ok(mine.every((t) => t.flow === 'beard'))
  assert.equal((await T.getTemplate('plain-photo')).flow, 'photography')
})

test("ALL 19 templates: image = the photo, image_template = that template's own preview image, nothing else (no `beard`)", async () => {
  const photo = await img()
  for (const [id] of BEARD) {
    const before = mock.calls.length
    const res = await post({ image: photo }, { template: id })
    assert.equal(res.status, 200, id)
    const body = await res.json()
    assert.equal(body.status, 'succeeded')
    assert.equal(body.provider, 'ai-beard-styling')
    assert.deepEqual(body.images, ['https://example.invalid/beard.png'])
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.ok(submit.url.startsWith('/api/portrait/editing/ai-beard-styling'), id)
    assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
    assert.match(submit.headers['content-type'], /^multipart\/form-data; boundary=/)
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['image', 'image_template'], `${id}: no other fields are sent`)
    assert.ok(part(submit, 'image').data.equals(photo.buffer), `${id}: image is the user's photo`)
    assert.ok(part(submit, 'image_template').data.equals(previewOf.get(id)), `${id}: image_template is this template's own preview`)
    assert.equal(part(submit, 'image_template').type, 'image/jpeg')
  }
})

test("every template sends a DIFFERENT reference image (no template reuses another one's preview)", async () => {
  const seen = new Set()
  for (const [id] of BEARD.slice(0, 6)) {
    const before = mock.calls.length
    await post({ image: await img() }, { template: id })
    seen.add(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'image_template').data.toString('base64'))
  }
  assert.equal(seen.size, 6)
})

test('validation: photo, template, unknown id, a non-beard template, unreachable preview, path tricks, fake image', async () => {
  const photo = await img()
  const start = beardPosts()
  let r = await post({}, { template: 'beard_goatee' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, {}); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'MISSING_FIELDS')
  r = await post({ image: photo }, { template: 'Balbo' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TEMPLATE')
  r = await post({ image: photo }, { template: '../../package.json' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: '__proto__' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: 'plain-photo' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TEMPLATE') // a photography template is never sent to the Beard API
  r = await post({ image: photo }, { template: 'broken-preview' }); assert.equal(r.status, 500); assert.equal((await r.json()).error.code, 'TEMPLATE_IMAGE_UNAVAILABLE')
  r = await post({ image: { buffer: Buffer.from('nope'), type: 'image/jpeg', filename: 'x.jpg' } }, { template: 'beard_goatee' }); assert.equal(r.status, 422)
  assert.equal(beardPosts(), start, 'invalid input never reaches AILabTools')
})

test('WebP photos are accepted (docs: JPEG/JPG/PNG/WEBP)', async () => {
  assert.equal((await post({ image: await img('webp') }, { template: 'beard_goatee' })).status, 200)
})

test('the existing AI Photography endpoint is untouched', async () => {
  const before = mock.calls.length
  const f = h.form({ image: await img('webp') }, { template_id: 'plain-photo', image_size: '9:16' }) // a photography template created in before(), unrelated to Beard
  await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.ok(mock.calls.slice(before).find((c) => c.method === 'POST').url.startsWith('/api/image/effects/ai-photography'))
})

test('no uploaded file is left on disk after any Beard request', async () => {
  const before = h.tempFiles()
  await post({ image: await img() }, { template: 'beard_goatee' })
  await post({ image: await img() }, { template: 'bad' })
  await post({ image: await img() }, { template: 'broken-preview' })
  assert.deepEqual(h.newTempFiles(before), [])
})
