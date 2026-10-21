/**
 * Cartoon Yourself integration tests. A local HTTP stand-in for AILabTools (test-only; the app itself never fakes results) asserts that OUR
 * request matches the official documentation of POST /api/portrait/effects/portrait-animation:
 *   header ailabapi-api-key, multipart: task_type=async, type=<style>, image (JPG/PNG <= 5 MB)
 * and that every one of the 49 templates of src/data/cartoon-yourself_templates.json is sent with its own JSON `id` as `type`.
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const h = require('./helpers')
const TEMPLATES = require('../../src/data/cartoon-yourself_templates.json').categories[0].templates

let mock, app
const part = (call, name) => call.parts?.find((p) => p.name === name)?.data.toString()

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.headers['ailabapi-api-key'] === 'bad-key') return { status: 401, json: { error_detail: { code: 'ERROR_UNAUTHORIZED', code_message: 'x', message: 'bad key' } } }
    if (call.method === 'POST' && call.url.startsWith('/api/portrait/effects/portrait-animation')) {
      const type = part(call, 'type')
      if (type === 'comic') return { status: 429, json: { error_detail: { code: 'ERROR_NOT_ENOUGH_CREDITS', code_message: 'credits', message: 'no credits' } } }
      if (type === 'sketch') return { status: 422, json: { error_detail: { code: 'ERROR_NO_FACE_IN_FILE', code_message: 'no face', message: 'No face found' } } }
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_type: 'async', task_id: `task_${type}` } }
    }
    if (call.url.startsWith('/api/common/query-async-task-result')) {
      const id = new URL(call.url, 'http://x').searchParams.get('task_id')
      const ok = { request_id: 'r2', log_id: 'l2', error_detail: { code: '', code_message: '', message: '' }, task_status: 2 }
      if (id === 'task_pixar') return { json: { ...ok, data: { image_url: 'https://example.invalid/string-url.png' } } } // `image_url` as a plain string
      return { json: { ...ok, data: { image_url: [`https://example.invalid/${id}.png`] } } } // documented as an array
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
const post = (files, f, qs = '') => fetch(`${app.base}/api/cartoon/generate${qs}`, { method: 'POST', body: h.form(files, f) })

test('the JSON has 49 templates and each id is a unique, documented style', () => {
  const types = require('../src/config/cartoonTypes')
  assert.equal(TEMPLATES.length, 49)
  assert.equal(new Set(TEMPLATES.map((t) => t.id)).size, 49)
  assert.deepEqual(TEMPLATES.map((t) => t.id), types)
})

test('ALL 49 templates: the request carries the template id as `type`, task_type=async, the photo and the key', async () => {
  const photo = await img()
  for (const t of TEMPLATES) {
    if (t.id === 'comic' || t.id === 'sketch') continue // error-path styles, covered below
    const before = mock.calls.length
    const res = await post({ image: photo }, { type: t.id })
    assert.equal(res.status, 200, `${t.id}`)
    const body = await res.json()
    assert.equal(body.status, 'succeeded')
    assert.equal(body.provider, 'cartoon-yourself')
    assert.ok(body.images.length === 1 && body.images[0].startsWith('https://'), `${t.id}: ${JSON.stringify(body.images)}`)
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.ok(submit.url.startsWith('/api/portrait/effects/portrait-animation'))
    assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
    assert.equal(part(submit, 'type'), t.id, `${t.id}: type`)
    assert.equal(part(submit, 'task_type'), 'async')
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['image', 'task_type', 'type'], `${t.id}: no other fields are sent`)
    assert.equal(submit.parts.find((p) => p.name === 'image').type, 'image/jpeg')
  }
})

test('the two error-path styles (comic, sketch) are also sent with their own id', async () => {
  for (const id of ['comic', 'sketch']) {
    const before = mock.calls.length
    await post({ image: await img() }, { type: id })
    assert.equal(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'type'), id)
  }
})

test('both `image_url` shapes (array and plain string) end up in `images`', async () => {
  const arr = await (await post({ image: await img() }, { type: 'anime' })).json()
  assert.deepEqual(arr.images, ['https://example.invalid/task_anime.png'])
  const str = await (await post({ image: await img() }, { type: 'pixar' })).json()
  assert.deepEqual(str.images, ['https://example.invalid/string-url.png'])
})

test('PNG is forwarded unchanged; response=image tries to download the result (an error if it cannot, never faked)', async () => {
  const before = mock.calls.length
  const res = await post({ image: await img('png') }, { type: 'watercolor' })
  assert.equal(res.status, 200)
  assert.equal(mock.calls.slice(before).find((c) => c.method === 'POST').parts.find((p) => p.name === 'image').type, 'image/png')
  const bin = await post({ image: await img() }, { type: 'anime' }, '?response=image')
  assert.equal(bin.status, 502) // the result URL is not downloadable in the test
})

test('validation: image, type, unknown type, WebP, fake image, > 5 MB', async () => {
  const photo = await img()
  let r = await post({}, { type: 'anime' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, {}); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'MISSING_FIELDS')
  r = await post({ image: photo }, { type: 'not_a_style' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TYPE')
  r = await post({ image: await img('webp') }, { type: 'anime' }); assert.equal(r.status, 415); assert.match((await r.json()).error.message, /JPG or PNG/)
  r = await post({ image: { buffer: Buffer.from('not an image'), type: 'image/jpeg', filename: 'x.jpg' } }, { type: 'anime' }); assert.equal(r.status, 422)
  const big = await sharp({ create: { width: 1700, height: 1700, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 70 } } }).png({ compressionLevel: 0 }).toBuffer()
  assert.ok(big.length > 5 * 1048576 && big.length < 10 * 1048576, `test image is ${(big.length / 1048576).toFixed(1)} MB`)
  r = await post({ image: { buffer: big, type: 'image/png', filename: 'big.png' } }, { type: 'anime' }); assert.equal(r.status, 413)
  assert.equal(mock.calls.filter((c) => c.method === 'POST' && part(c, 'type') === 'not_a_style').length, 0, 'invalid input never reaches AILabTools')
})

test('maps AILabTools errors: no credits -> 402, API error code passed through -> 422', async () => {
  const credits = await post({ image: await img() }, { type: 'comic' })
  assert.equal(credits.status, 402); assert.equal((await credits.json()).error.code, 'AILAB_INSUFFICIENT_CREDITS')
  const noFace = await post({ image: await img() }, { type: 'sketch' })
  assert.equal(noFace.status, 422); assert.equal((await noFace.json()).error.code, 'ERROR_NO_FACE_IN_FILE')
})

test('the existing AI Photography endpoint is untouched: still accepts WebP and its own fields', async () => {
  const before = mock.calls.length
  const f = h.form({ image: await img('webp') }, { style_title: 'Golden hour', style_desc: 'Warm light', image_size: '9:16' })
  const res = await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.notEqual(res.status, 415)
  const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
  assert.ok(submit.url.startsWith('/api/image/effects/ai-photography'))
  assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['image', 'image_size', 'style_desc', 'style_title'])
})

test('no uploaded file is left on disk after any Cartoon request', async () => {
  const before = h.tempFiles()
  await post({ image: await img() }, { type: 'anime' })
  await post({ image: await img() }, { type: 'bad' })
  await post({ image: await img('webp') }, { type: 'anime' })
  assert.deepEqual(h.newTempFiles(before), [])
})
