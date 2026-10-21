/**
 * Hairstyle Changer Premium integration tests. A local HTTP stand-in for AILabTools (test-only) asserts that OUR request matches the official documentation of
 * POST /api/portrait/effects/hairstyle-editor-premium: header ailabapi-api-key, multipart: image (JPG/PNG <= 5 MB, > 200 px), hair_style (documented enum), color (documented enum);
 * `image_template` is never sent (the API ignores it when hair_style is present). Result: data.image (async task).
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const sharp = require('sharp')
const h = require('./helpers')
const JSON_TEMPLATES = require('../../src/data/ai-hairstyle-changer_templates.json').categories.flatMap((c) => c.templates)
const JSON_COLORS = require('../../src/data/ai-hairstyle-changer_templates.json').categories.flatMap((c) => c.colors)
const TABLE = require('../src/config/hairstyleTemplates')
const { HAIR_STYLES, COLORS } = require('../src/config/hairstyleOptions')

let mock, app
const part = (call, name) => call.parts?.find((p) => p.name === name)
const submitsCount = () => mock.calls.filter((c) => c.method === 'POST' && c.url.includes('hairstyle-editor-premium')).length
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST' && call.url.startsWith('/api/portrait/effects/hairstyle-editor-premium')) {
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_id: 'task_hair' } }
    }
    if (call.url.startsWith('/api/common/query-async-task-result')) {
      return { json: { request_id: 'r2', log_id: 'l2', error_detail: { code: '', code_message: '', message: '' }, task_status: 2, data: { image: 'https://example.invalid/hair.png' } } }
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

const img = async (format = 'jpeg', w = 600, hgt = 800) => ({ buffer: await h.solid(w, hgt, { r: 120, g: 90, b: 70 }, format), type: `image/${format}`, filename: `p.${format === 'jpeg' ? 'jpg' : format}` })
const post = (files, f) => fetch(`${app.base}/api/hairstyle/generate`, { method: 'POST', body: h.form(files, f) })

test('the documented enums have no duplicates and cover the numbered ranges; every JSON colour id is a documented API colour', () => {
  assert.equal(new Set(HAIR_STYLES).size, HAIR_STYLES.length, 'no duplicates')
  assert.ok(HAIR_STYLES.includes('male_hairstyle_0062') && !HAIR_STYLES.includes('male_hairstyle_0063'))
  assert.ok(HAIR_STYLES.includes('female_hairstyle_0073') && !HAIR_STYLES.includes('female_hairstyle_0074'))
  assert.equal(COLORS.length, 23)
  for (const c of JSON_COLORS) assert.ok(COLORS.includes(c.id), `JSON colour ${c.id} is a documented API colour`)
})

test('the backend table: 115 confirmed JSON ids, each a real JSON entry mapped to a documented hair_style (also the same style name as the JSON id)', () => {
  assert.equal(Object.keys(TABLE).length, 115)
  for (const [id, style] of Object.entries(TABLE)) {
    assert.ok(JSON_TEMPLATES.some((t) => t.id === id), `${id} exists in the JSON`)
    assert.ok(HAIR_STYLES.includes(style), `${id} -> ${style} is a documented hair_style`)
    assert.equal(norm(style), norm(id.replace(/^hair_(men|women)_/, '')), `${id} -> ${style}: same style`)
  }
})

test('a request without a colour (Hairstyle sidebar cards) sends only image + hair_style, so the API default `original` applies', async () => {
  const before = mock.calls.length
  assert.equal((await post({ image: await img() }, { template: 'hair_men_manbun' })).status, 200)
  assert.deepEqual(mock.calls.slice(before).find((c) => c.method === 'POST').parts.map((p) => p.name).sort(), ['hair_style', 'image'])
})

test('regression: ENOENT "open ...\ai-photo-generator-uploads\*.upload" - the upload dir is re-created per upload, so a temp dir removed while the server runs (OS temp cleanup) no longer breaks generate', async () => {
  const { UPLOAD_DIR } = require('../src/utils/tempFiles')
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })
  for (let i = 0; i < 2; i++) { // first request re-creates the dir, the second proves it keeps working
    const res = await post({ image: await img() }, { template: 'hair_men_manbun' })
    assert.equal(res.status, 200, 'upload after the temp dir was removed')
    assert.equal((await res.json()).status, 'succeeded')
  }
  assert.deepEqual(fs.readdirSync(UPLOAD_DIR), [], 'the uploaded file is removed once processing has finished')
  // an invalid request must also leave nothing behind
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })
  assert.equal((await post({ image: await img() }, { template: 'nope' })).status, 400)
  assert.deepEqual(fs.readdirSync(UPLOAD_DIR), [], 'no leftover after a rejected request')
})

test('EVERY confirmed template: request = image + hair_style (its own value) + color, nothing else (no image_template, no prompts)', async () => {
  const photo = await img()
  for (const [id, style] of Object.entries(TABLE)) {
    const before = mock.calls.length
    const res = await post({ image: photo }, { template: id, color: 'lightBlue' })
    assert.equal(res.status, 200, id)
    const body = await res.json()
    assert.equal(body.status, 'succeeded')
    assert.equal(body.provider, 'hairstyle-changer-premium')
    assert.deepEqual(body.images, ['https://example.invalid/hair.png'])
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['color', 'hair_style', 'image'], `${id}: no other fields are sent`)
    assert.equal(part(submit, 'hair_style').data.toString(), style, `${id}: hair_style`)
    assert.equal(part(submit, 'color').data.toString(), 'lightBlue')
    assert.ok(part(submit, 'image').data.equals(photo.buffer), `${id}: image is the user's photo`)
  }
})

test('every documented colour used by the Fun cards is forwarded unchanged', async () => {
  for (const color of ['blonde', 'platinumBlonde', 'lightBrown', 'multicolored', 'red', 'pink', 'lightBlue', 'orange', 'darkBlue', 'lightPurple', 'darkGreen', 'blue', 'grey', 'burgundy', 'silver']) {
    const before = mock.calls.length
    assert.equal((await post({ image: await img() }, { template: 'hair_men_manbun', color })).status, 200)
    assert.equal(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'color').data.toString(), color)
  }
})

test('validation: photo, template, unknown id (incl. unconfirmed JSON ids), colour, format, size, tiny image', async () => {
  const photo = await img()
  const start = submitsCount()
  let r = await post({}, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { color: 'red' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'MISSING_FIELDS')
  r = await post({ image: photo }, { template: 'ManBun', color: 'red' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TEMPLATE') // an API value is not a template id
  r = await post({ image: photo }, { template: 'hair_men_undercut', color: 'red' }); assert.equal(r.status, 400) // real JSON entry, but not a confirmed match (no preview image)
  r = await post({ image: photo }, { template: '__proto__', color: 'red' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: 'hair_men_manbun', color: 'Hot Pink' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_COLOR')
  r = await post({ image: await img('webp') }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 415)
  r = await post({ image: await img('jpeg', 150, 150) }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'IMAGE_TOO_SMALL')
  r = await post({ image: { buffer: Buffer.from('nope'), type: 'image/jpeg', filename: 'x.jpg' } }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 422)
  const big = await sharp({ create: { width: 1700, height: 1700, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 70 } } }).png({ compressionLevel: 0 }).toBuffer()
  assert.ok(big.length > 5 * 1048576 && big.length < 10 * 1048576)
  r = await post({ image: { buffer: big, type: 'image/png', filename: 'big.png' } }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 413)
  assert.equal(submitsCount(), start, 'invalid input never reaches AILabTools')
})

test('a photo of 4090 px or more is downscaled below 4090 before it is sent', async () => {
  const before = mock.calls.length
  assert.equal((await post({ image: await img('jpeg', 4300, 300) }, { template: 'hair_men_manbun', color: 'red' })).status, 200)
  const sent = await sharp(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'image').data).metadata()
  assert.ok(sent.width < 4090 && sent.height > 200, `${sent.width}x${sent.height}`)
})

test('the other endpoints are untouched', async () => {
  const before = mock.calls.length
  const f = h.form({ image: await img('webp') }, { style_title: 'Golden hour', style_desc: 'Warm light', image_size: '9:16' })
  await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.ok(mock.calls.slice(before).find((c) => c.method === 'POST').url.startsWith('/api/image/effects/ai-photography'))
})

test('no uploaded file is left on disk after any Hairstyle request', async () => {
  const before = h.tempFiles()
  await post({ image: await img() }, { template: 'hair_men_manbun', color: 'red' })
  await post({ image: await img() }, { template: 'bad', color: 'red' })
  await post({ image: await img('jpeg', 100, 100) }, { template: 'hair_men_manbun', color: 'red' })
  assert.deepEqual(h.newTempFiles(before), [])
})
