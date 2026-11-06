/**
 * AI Photography integration tests. They run a local HTTP stand-in for AILabTools (test-only; the app itself
 * never fakes results) to assert that OUR requests match the official documentation:
 *   POST /api/image/effects/ai-photography  - header ailabapi-api-key, multipart: image, style_title, style_desc, [image_size]
 *   GET  /api/common/query-async-task-result?task_id=...   - task_status 0 queued / 1 processing / 2 completed
 * The shape of `data` for a completed AI Photography task is NOT documented, so these tests only check that whatever
 * the API returns is passed through untouched and that URLs inside it are listed in `images`.
 *
 * The client sends only `template_id` (never prompt text): the server looks that template up in the database and uses
 * ITS OWN saved style_title_prompt / style_desc_prompt. These tests set up real template rows (same services the
 * Admin Panel uses) and confirm the exact saved prompt is what reaches AILabTools, unchanged - and that a request
 * trying to send `style_title` / `style_desc` directly is rejected before anything is sent upstream.
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const sharp = require('sharp')
const h = require('./helpers')

let mock, app, T
let polls = 0
const RESULT = { anything: { nested: ['https://example.invalid/out-1.png'] }, note: 'not a url' }
const URL_IMG = 'https://cdn.example.com/p.jpg'

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    const key = call.headers['ailabapi-api-key']
    if (key === 'bad-key') return { status: 401, json: { error_detail: { code: 'ERROR_UNAUTHORIZED', code_message: 'x', message: 'bad key' } } }
    if (call.method === 'POST') {
      const title = call.parts?.find((p) => p.name === 'style_title')?.data.toString()
      if (title === 'NO CREDITS') return { status: 429, json: { error_detail: { code: 'ERROR_NOT_ENOUGH_CREDITS', code_message: 'credits', message: 'no credits' } } }
      if (title === 'NO FACE') return { status: 422, json: { error_detail: { code: 'ERROR_NO_FACE_IN_FILE', code_message: 'no face', message: 'No face found' } } }
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_type: 'async', task_id: 'task_PHOTO-001' } }
    }
    if (call.url.startsWith('/api/common/query-async-task-result')) {
      const id = new URL(call.url, 'http://x').searchParams.get('task_id')
      if (id === 'task_never_done') return { json: { task_status: 1, data: {} } }
      polls += 1
      if (polls < 3) return { json: { request_id: 'r2', log_id: 'l2', error_detail: { code: '', code_message: '', message: '' }, task_status: polls === 1 ? 0 : 1 } }
      return { json: { request_id: 'r3', log_id: 'l3', error_detail: { code: '', code_message: '', message: '' }, task_status: 2, data: RESULT } }
    }
    return { status: 404, json: {} }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '30'
  process.env.AILAB_POLL_TIMEOUT_MS = '1500'
  process.env.RATE_LIMIT_MAX = '1000' // the app's own rate limiter (default 10/min) would otherwise trip during the suite
  app = await h.startApp(require('../src/app'))

  // Fixture templates, created the same way the Admin Panel does (POST /api/admin/templates -> templates.service).
  T = require('../src/services/templates.service')
  await T.saveCategory({ id: 'photo-flow-test', name: 'Photo test', flow: 'photography' })
  await T.saveCategory({ id: 'cartoon-flow-test', name: 'Cartoon test', flow: 'cartoon' })
  await T.createTemplates([
    { id: 'photo-golden', category_id: 'photo-flow-test', name: 'Golden Hour', preview_url: URL_IMG, style_title_prompt: 'Golden hour portrait', style_desc_prompt: 'Warm cinematic light, soft film grain' },
    { id: 'photo-no-prompt', category_id: 'photo-flow-test', name: 'No Prompt', preview_url: URL_IMG }, // both prompts left blank in the Admin form
    { id: 'photo-hidden', category_id: 'photo-flow-test', name: 'Hidden', preview_url: URL_IMG, style_title_prompt: 'Hidden style', active: false },
    { id: 'photo-max-len', category_id: 'photo-flow-test', name: 'Max length', preview_url: URL_IMG, style_title_prompt: 'T'.repeat(500), style_desc_prompt: 'D'.repeat(1000) }, // the Admin Panel's own limit (500 / 1000)
    { id: 'photo-no-credits', category_id: 'photo-flow-test', name: 'No Credits', preview_url: URL_IMG, style_title_prompt: 'NO CREDITS', style_desc_prompt: 'x' },
    { id: 'photo-no-face', category_id: 'photo-flow-test', name: 'No Face', preview_url: URL_IMG, style_title_prompt: 'NO FACE', style_desc_prompt: 'x' },
    { id: 'anime', category_id: 'cartoon-flow-test', name: 'Anime', preview_url: URL_IMG }, // a real template, but NOT a photography one
  ])
})
after(async () => { await app.close(); await mock.close() })

const img = async (w = 600, hgt = 800, format = 'jpeg') => ({ buffer: await h.solid(w, hgt, { r: 120, g: 90, b: 70 }, format), type: `image/${format}`, filename: `p.${format}` })
const fields = (extra = {}) => ({ template_id: 'photo-golden', ...extra })
const post = (files, f, qs = '') => fetch(`${app.base}/api/photos/generate${qs}`, { method: 'POST', body: h.form(files, f) })

test('GET /api/health is unchanged and never leaks the key', async () => {
  const res = await fetch(`${app.base}/api/health`)
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.status, 'ok')
  assert.equal(body.ailab.provider, 'ai-photography')
  assert.equal(body.ailab.apiKeyConfigured, true)
  assert.ok(!JSON.stringify(body).includes('test-key'))
})

test('a valid template_id uses that template\'s exact saved prompt - the client never sends prompt text', async () => {
  polls = 0
  const res = await post({ image: await img() }, { template_id: 'photo-golden', image_size: '3:4' })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.success, true)
  assert.equal(body.status, 'succeeded')
  assert.equal(body.provider, 'ai-photography')
  assert.equal(body.taskId, 'task_PHOTO-001')
  assert.equal(body.expiresInHours, 24)
  assert.deepEqual(body.data, RESULT) // payload passed through untouched
  assert.deepEqual(body.images, ['https://example.invalid/out-1.png']) // URLs found in it

  const submit = mock.calls.find((c) => c.method === 'POST')
  assert.equal(submit.url, '/api/image/effects/ai-photography')
  assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
  assert.match(submit.headers['content-type'], /^multipart\/form-data; boundary=/)
  assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['image', 'image_size', 'style_desc', 'style_title']) // template_id itself is never forwarded to AILabTools
  const val = (n) => submit.parts.find((p) => p.name === n).data.toString()
  assert.equal(val('style_title'), 'Golden hour portrait') // exactly the saved row, not anything the request could have supplied
  assert.equal(val('style_desc'), 'Warm cinematic light, soft film grain')
  assert.equal(val('image_size'), '3:4')
  const imgPart = submit.parts.find((p) => p.name === 'image')
  assert.equal((await sharp(imgPart.data).metadata()).width, 600)

  const gets = mock.calls.filter((c) => c.method === 'GET')
  assert.ok(gets.length >= 3) // queued (0) -> processing (1) -> completed (2)
  assert.match(gets[0].url, /^\/api\/common\/query-async-task-result\?task_id=task_PHOTO-001$/)
  assert.equal(gets[0].headers['ailabapi-api-key'], 'test-key')
})

test('a template with no saved prompt is still accepted: both fields are simply left out, never replaced', async () => {
  polls = 0
  const res = await post({ image: await img() }, { template_id: 'photo-no-prompt' })
  assert.equal(res.status, 200)
  const submit = mock.calls.filter((c) => c.method === 'POST').at(-1)
  assert.deepEqual(submit.parts.map((p) => p.name), ['image']) // no style_title, no style_desc, no image_size (not sent)
})

test('sending style_title / style_desc directly is rejected outright, even with a valid template_id, and AILabTools is never called', async () => {
  const before = mock.calls.length
  let res = await post({ image: await img() }, { template_id: 'photo-golden', style_title: 'Attacker-controlled title' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'PROMPT_OVERRIDE_REJECTED')

  res = await post({ image: await img() }, { template_id: 'photo-golden', style_desc: 'Attacker-controlled description' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'PROMPT_OVERRIDE_REJECTED')
  assert.equal(mock.calls.length, before) // neither attempt ever reached AILabTools
})

test('an unknown template_id is rejected and AILabTools is never called', async () => {
  const before = mock.calls.length
  const res = await post({ image: await img() }, { template_id: 'not-a-real-template' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'INVALID_TEMPLATE')
  assert.equal(mock.calls.length, before)
})

test('an inactive template_id is rejected and AILabTools is never called', async () => {
  const before = mock.calls.length
  const res = await post({ image: await img() }, { template_id: 'photo-hidden' })
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'INVALID_TEMPLATE')
  assert.equal(mock.calls.length, before)
})

test('a template_id of a non-photography flow (e.g. Cartoon) is rejected and AILabTools is never called', async () => {
  const before = mock.calls.length
  const res = await post({ image: await img() }, { template_id: 'anime' }) // a real, active template - just not a photography one
  assert.equal(res.status, 400)
  const body = await res.json()
  assert.equal(body.error.code, 'INVALID_TEMPLATE')
  assert.match(body.error.message, /AI Photography flow/)
  assert.equal(mock.calls.length, before)
})

test('missing template_id is rejected and AILabTools is never called', async () => {
  const before = mock.calls.length
  const res = await post({ image: await img() }, {})
  assert.equal(res.status, 400)
  assert.equal((await res.json()).error.code, 'MISSING_FIELDS')
  assert.equal(mock.calls.length, before)
})

test('image_size is optional and omitted from the request when not given; PNG/WebP are forwarded unchanged', async () => {
  for (const format of ['png', 'webp']) {
    polls = 0
    const input = await img(500, 500, format)
    const res = await post({ image: input }, fields())
    assert.equal(res.status, 200)
    const submit = mock.calls.filter((c) => c.method === 'POST').at(-1)
    assert.ok(!submit.parts.some((p) => p.name === 'image_size'))
    const sent = submit.parts.find((p) => p.name === 'image')
    assert.equal((await sharp(sent.data).metadata()).format, format) // not re-encoded
    assert.ok(sent.data.equals(input.buffer))
  }
})

test('an image of 4096 px or more is downscaled (same format) before sending', async () => {
  polls = 0
  const res = await post({ image: await img(4200, 300, 'png') }, fields())
  assert.equal(res.status, 200)
  const sent = mock.calls.filter((c) => c.method === 'POST').at(-1).parts.find((p) => p.name === 'image')
  const meta = await sharp(sent.data).metadata()
  assert.equal(meta.format, 'png')
  assert.ok(meta.width < 4096)
})

test('response=image tries to download the first result URL (reported as an error if it cannot be fetched, never faked)', async () => {
  polls = 0
  const res = await post({ image: await img() }, fields(), '?response=image')
  assert.equal(res.status, 502) // https://example.invalid/... never resolves
  assert.equal((await res.json()).error.code, 'AILAB_UNREACHABLE')
})

test('validation: image, image_size, file type, fake image', async () => {
  let res = await post({}, fields())
  assert.equal(res.status, 400); assert.equal((await res.json()).error.code, 'MISSING_FIELDS')

  res = await post({ image: await img() }, fields({ image_size: '7:7' }))
  assert.equal(res.status, 400); assert.equal((await res.json()).error.code, 'INVALID_IMAGE_SIZE')

  res = await post({ image: { buffer: Buffer.from('hello'), type: 'text/plain', filename: 'x.txt' } }, fields())
  assert.equal(res.status, 415); assert.equal((await res.json()).error.code, 'UNSUPPORTED_FILE_TYPE')

  res = await post({ image: { buffer: Buffer.from('not really a png'), type: 'image/png', filename: 'x.png' } }, fields())
  assert.equal(res.status, 422); assert.equal((await res.json()).error.code, 'INVALID_IMAGE')
})

test('a saved prompt at the Admin Panel\'s own maximum length (500 / 1000 characters) reaches AILabTools complete and unchanged', async () => {
  polls = 0
  const res = await post({ image: await img() }, { template_id: 'photo-max-len' })
  assert.equal(res.status, 200)
  const submit = mock.calls.filter((c) => c.method === 'POST').at(-1)
  const val = (n) => submit.parts.find((p) => p.name === n).data.toString()
  assert.equal(val('style_title'), 'T'.repeat(500))
  assert.equal(val('style_desc'), 'D'.repeat(1000))
})

test('maps AILabTools errors: no credits -> 402, API error code passed through -> 422, unknown route -> 404', async () => {
  let res = await post({ image: await img() }, { template_id: 'photo-no-credits' })
  assert.equal(res.status, 402); assert.equal((await res.json()).error.code, 'AILAB_INSUFFICIENT_CREDITS')

  res = await post({ image: await img() }, { template_id: 'photo-no-face' })
  assert.equal(res.status, 422); assert.equal((await res.json()).error.code, 'ERROR_NO_FACE_IN_FILE')

  res = await fetch(`${app.base}/api/nope`)
  assert.equal(res.status, 404)
})

test('task status endpoint: 202 while processing, 400 for malformed ids', async () => {
  let res = await fetch(`${app.base}/api/photos/tasks/task_never_done`)
  assert.equal(res.status, 202)
  const body = await res.json()
  assert.equal(body.status, 'processing')
  assert.equal(body.pollUrl, '/api/photos/tasks/task_never_done')

  res = await fetch(`${app.base}/api/photos/tasks/bad id!`)
  assert.equal(res.status, 400)
})

test('no uploaded file is left on disk after any request (success and every failure path)', async () => {
  const before = h.tempFiles()
  polls = 0
  await post({ image: await img() }, fields())
  await post({ image: await img() }, {}) // validation error: no template_id
  await post({ image: { buffer: Buffer.from('nope'), type: 'image/png', filename: 'x.png' } }, fields()) // not an image
  await post({ image: await img() }, { template_id: 'photo-no-credits' }) // upstream error
  assert.deepEqual(h.newTempFiles(before), [])
})
