const env = require('../config/env')
const AppError = require('../utils/AppError')
const { sniffMime } = require('./image.service')

/**
 * AILabTools client for the "AI Photography" API. Everything here follows the official documentation:
 *
 *  Submit  POST {base}/api/image/effects/ai-photography
 *          header  ailabapi-api-key: <key>
 *          multipart/form-data: image (file, required) | style_title (string, required, <=500 chars, English)
 *                               style_desc (string, required, <=1000 chars, English)
 *                               image_size (optional: auto|1:1|2:3|3:2|3:4|4:3|4:5|5:4|9:16|16:9|21:9, default auto)
 *          -> { request_id, log_id, error_detail { code, code_message, message }, task_type: "async", task_id }
 *
 *  Result  GET  {base}/api/common/query-async-task-result?task_id=<task_id>      (header ailabapi-api-key)
 *          -> { request_id, log_id, error_detail, task_status: 0 queued | 1 processing | 2 completed, data }
 *          "It is recommended that asynchronous task results be queried every 5 seconds."
 *          "Asynchronous task results are valid for 24 hours."
 *          `data` is the "result payload, available when task_status is 2; structure depends on the async API".
 *          The docs do not define the fields of `data` for AI Photography. Observed on a real completed task: { cost_time, result_urls: [<https image URL>] }.
 *          `data` is passed through untouched and any http(s) URLs found inside it are listed in `images` (see collectUrls).
 *
 *  Errors  A request succeeded only if the HTTP status is 200 (docs: "Response Description"); otherwise
 *          error_detail.code / .code_message / .message describe the failure.
 */

const SUBMIT_PATH = '/api/image/effects/ai-photography'
const CARTOON_PATH = '/api/portrait/effects/portrait-animation' // Cartoon Yourself
const BEARD_PATH = '/api/portrait/editing/ai-beard-styling' // AI Beard Styling
const HAIRSTYLE_PATH = '/api/portrait/effects/hairstyle-editor-premium' // Hairstyle Changer Premium
const TASK_RESULT_PATH = '/api/common/query-async-task-result'
const IMAGE_SIZES = ['auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const STATUS = { 0: 'queued', 1: 'processing', 2: 'succeeded' }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Map AILabTools error responses (docs: "Error Codes") to our HTTP statuses. */
function mapAilabError(httpStatus, body) {
  const d = body?.error_detail || {}
  const code = d.code || `HTTP_${httpStatus}`
  const msg = d.message || d.code_message || `AILabTools returned HTTP ${httpStatus}.`
  const info = { ailabCode: code, ailabStatus: httpStatus, requestId: body?.request_id, logId: body?.log_id }

  if (httpStatus === 401 || httpStatus === 403 || code === 'AI_SERVICE_UNAUTHORIZED') {
    return new AppError(502, 'AILAB_AUTH_FAILED', 'AILabTools rejected the configured AILAB_API_KEY (missing, invalid, or not enabled for this API). Check the key and that your plan includes AI Photography.', info)
  }
  if (httpStatus === 402 || code === 'ERROR_NOT_ENOUGH_CREDITS' || code === 'ERROR_PAYMENT_REQUIRED') {
    return new AppError(402, 'AILAB_INSUFFICIENT_CREDITS', 'The AILabTools account has no credits left for this request.', info)
  }
  if (httpStatus === 429 || code === 'ERROR_TOO_MANY_REQUESTS' || code === 'AI_SERVICE_FLOW_RESTRICTION' || httpStatus === 503) {
    return new AppError(429, 'AILAB_RATE_LIMITED', 'AILabTools is rate limiting requests. Please retry shortly.', info)
  }
  if (httpStatus === 413) return new AppError(413, code, msg, info)
  if (httpStatus === 415 || httpStatus === 422 || httpStatus === 400) return new AppError(422, code, msg, info)
  return new AppError(502, 'AILAB_ERROR', msg, info)
}

async function parseJson(res) {
  const text = await res.text()
  try { return text ? JSON.parse(text) : {} } catch { return { _raw: text.slice(0, 300) } }
}

async function ailabFetch(url, init) {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(env.ailab.requestTimeoutMs) })
  } catch (e) {
    if (e.name === 'TimeoutError' || e.name === 'AbortError') throw new AppError(504, 'AILAB_TIMEOUT', 'AILabTools did not answer in time.')
    throw new AppError(502, 'AILAB_UNREACHABLE', `Could not reach AILabTools (${e.cause?.code || e.message}).`)
  }
}

/** Public-field check (docs: validate public response fields first, then the business fields). */
function assertOk(res, body) {
  if (!res.ok) throw mapAilabError(res.status, body)
  if (body?.error_detail?.code) throw mapAilabError(422, body) // error reported inside a 200 payload
}

/**
 * Every http(s) URL inside the result payload (its shape is not documented for AI Photography), without duplicates, most likely result image first:
 * URLs under a key that looks like a result (image, result, output, photo, url) and URLs that end in an image extension rank ahead of the rest
 * (an echo of the input image or a link to documentation must not be taken as the result). Same-rank URLs keep their order.
 */
function collectUrls(value) {
  const found = new Map() // url -> score (lower = better)
  const visit = (v, key = '') => {
    if (typeof v === 'string') {
      if (!/^https?:\/\//i.test(v)) return
      const score = (/\.(png|jpe?g|webp)(\?|#|$)/i.test(v) ? 0 : 2) + (/image|result|output|photo|url/i.test(key) ? 0 : 1)
      if (!found.has(v) || found.get(v) > score) found.set(v, score)
    } else if (Array.isArray(v)) v.forEach((x) => visit(x, key))
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => visit(x, k))
  }
  visit(value)
  return [...found.entries()].sort((a, b) => a[1] - b[1]).map(([url]) => url) // Array.sort is stable
}

/**
 * Submit an AI Photography job.
 * @param {{ image: {buffer, mimeType, filename}, styleTitle: string, styleDesc: string, imageSize?: string }} p
 * @returns {{ taskId: string, taskType: string, requestId: string, logId: string }}
 */
async function submitPhotography({ image, styleTitle, styleDesc, imageSize }) {
  const form = new FormData()
  form.append('image', new Blob([image.buffer], { type: image.mimeType }), image.filename)
  form.append('style_title', styleTitle)
  form.append('style_desc', styleDesc)
  if (imageSize) form.append('image_size', imageSize)

  const res = await ailabFetch(`${env.ailab.baseUrl}${SUBMIT_PATH}`, {
    method: 'POST',
    headers: { 'ailabapi-api-key': env.ailab.apiKey }, // fetch sets the multipart boundary itself
    body: form,
  })
  const body = await parseJson(res)
  assertOk(res, body)
  if (!body.task_id) throw new AppError(502, 'AILAB_NO_TASK_ID', 'AILabTools did not return a task_id.', { requestId: body.request_id, logId: body.log_id })
  return { taskId: body.task_id, taskType: body.task_type, requestId: body.request_id, logId: body.log_id }
}

/**
 * Submit a Cartoon Yourself job (official docs: POST /api/portrait/effects/portrait-animation, multipart: image, type, task_type).
 * Always async (`task_type=async`, the mode the docs recommend); the result is read with the same task-result API as AI Photography
 * and its `data.image_url` is listed in `images` by getTask/collectUrls.
 * @param {{ image: {buffer, mimeType, filename}, type: string }} p
 */
async function submitCartoon({ image, type }) {
  const form = new FormData()
  form.append('task_type', 'async')
  form.append('type', type)
  form.append('image', new Blob([image.buffer], { type: image.mimeType }), image.filename)

  const res = await ailabFetch(`${env.ailab.baseUrl}${CARTOON_PATH}`, {
    method: 'POST',
    headers: { 'ailabapi-api-key': env.ailab.apiKey },
    body: form,
  })
  const body = await parseJson(res)
  assertOk(res, body)
  if (!body.task_id) throw new AppError(502, 'AILAB_NO_TASK_ID', 'AILabTools did not return a task_id.', { requestId: body.request_id, logId: body.log_id })
  return { taskId: body.task_id, taskType: body.task_type, requestId: body.request_id, logId: body.log_id }
}

/**
 * Submit an AI Beard Styling job (official docs: POST /api/portrait/editing/ai-beard-styling, multipart: image, image_template).
 * `image_template` is a reference image FILE (not an id or text). The optional `beard` preset is deliberately never sent: it would take precedence over image_template.
 * Async like the other APIs (submit returns task_id; result in data.result_urls, picked up by getTask/collectUrls).
 * @param {{ image: {buffer, mimeType, filename}, template: {buffer, mimeType, filename} }} p
 */
async function submitBeard({ image, template }) {
  const form = new FormData()
  form.append('image', new Blob([image.buffer], { type: image.mimeType }), image.filename)
  form.append('image_template', new Blob([template.buffer], { type: template.mimeType }), template.filename)

  const res = await ailabFetch(`${env.ailab.baseUrl}${BEARD_PATH}`, {
    method: 'POST',
    headers: { 'ailabapi-api-key': env.ailab.apiKey },
    body: form,
  })
  const body = await parseJson(res)
  assertOk(res, body)
  if (!body.task_id) throw new AppError(502, 'AILAB_NO_TASK_ID', 'AILabTools did not return a task_id.', { requestId: body.request_id, logId: body.log_id })
  return { taskId: body.task_id, taskType: body.task_type, requestId: body.request_id, logId: body.log_id }
}

/**
 * Submit a Hairstyle Changer Premium job (official docs: POST /api/portrait/effects/hairstyle-editor-premium, multipart: image, hair_style, color, image_template).
 * `hair_style` is a documented enum value. `image_template` is deliberately not sent: the docs say it is ignored whenever `hair_style` is present.
 * Async; the result image URL is data.image (picked up by getTask/collectUrls).
 * @param {{ image: {buffer, mimeType, filename}, hairStyle: string, color?: string }} p
 */
async function submitHairstyle({ image, hairStyle, color }) {
  const form = new FormData()
  form.append('image', new Blob([image.buffer], { type: image.mimeType }), image.filename)
  form.append('hair_style', hairStyle)
  if (color) form.append('color', color)

  const res = await ailabFetch(`${env.ailab.baseUrl}${HAIRSTYLE_PATH}`, {
    method: 'POST',
    headers: { 'ailabapi-api-key': env.ailab.apiKey },
    body: form,
  })
  const body = await parseJson(res)
  assertOk(res, body)
  if (!body.task_id) throw new AppError(502, 'AILAB_NO_TASK_ID', 'AILabTools did not return a task_id.', { requestId: body.request_id, logId: body.log_id })
  return { taskId: body.task_id, taskType: body.task_type, requestId: body.request_id, logId: body.log_id }
}

/** One status check. Returns { status: 'queued'|'processing'|'succeeded', taskId, data?, images? }. */
async function getTask(taskId) {
  const res = await ailabFetch(`${env.ailab.baseUrl}${TASK_RESULT_PATH}?task_id=${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: { 'ailabapi-api-key': env.ailab.apiKey },
  })
  const body = await parseJson(res)
  assertOk(res, body)

  const status = STATUS[body.task_status]
  if (!status) throw new AppError(502, 'AILAB_UNEXPECTED_RESPONSE', `AILabTools returned an unknown task_status (${body.task_status}).`, { requestId: body.request_id })
  const base = { status, taskId, requestId: body.request_id, logId: body.log_id }
  if (status !== 'succeeded') return base
  const images = collectUrls(body.data)
  if (!images.length) console.warn('[ailab] task finished without any image URL; data keys:', Object.keys(body.data ?? {}).join(', ') || '(none)') // lets the real shape be seen in the logs
  return { ...base, data: body.data ?? {}, images, expiresInHours: 24 }
}

/** Poll every pollIntervalMs until the task completes or pollTimeoutMs passes (then returns the last state). */
async function waitForTask(taskId) {
  const deadline = Date.now() + env.ailab.pollTimeoutMs
  let last = { status: 'processing', taskId }
  while (Date.now() < deadline) {
    await sleep(env.ailab.pollIntervalMs)
    last = await getTask(taskId)
    if (last.status === 'succeeded') return last
  }
  return last
}

/** Download a result image (result URLs are stored by AILabTools for 24 h) so it can be streamed through our API. */
async function downloadImage(url) {
  if (!/^https:\/\//i.test(url)) throw new AppError(502, 'AILAB_BAD_RESULT_URL', 'AILabTools returned an unexpected result URL.')
  const res = await ailabFetch(url, { method: 'GET' })
  if (!res.ok) throw new AppError(502, 'AILAB_DOWNLOAD_FAILED', `Could not download the generated image (HTTP ${res.status}).`)
  const buffer = Buffer.from(await res.arrayBuffer())
  return { buffer, mimeType: res.headers.get('content-type')?.split(';')[0] || sniffMime(buffer) }
}

module.exports = { submitPhotography, submitCartoon, submitBeard, submitHairstyle, getTask, waitForTask, downloadImage, collectUrls, IMAGE_SIZES, SUBMIT_PATH, CARTOON_PATH, BEARD_PATH, TASK_RESULT_PATH }
