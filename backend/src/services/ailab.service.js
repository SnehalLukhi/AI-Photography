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
 *          The docs do not define the fields of `data` for AI Photography, so it is passed through untouched and
 *          any http(s) URLs found inside it are listed in `images` (see collectUrls).
 *
 *  Errors  A request succeeded only if the HTTP status is 200 (docs: "Response Description"); otherwise
 *          error_detail.code / .code_message / .message describe the failure.
 */

const SUBMIT_PATH = '/api/image/effects/ai-photography'
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

/** Collect every http(s) URL inside the (undocumented-shape) result payload, in order, without duplicates. */
function collectUrls(value, out = new Set()) {
  if (typeof value === 'string') { if (/^https?:\/\//i.test(value)) out.add(value) }
  else if (Array.isArray(value)) value.forEach((v) => collectUrls(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectUrls(v, out))
  return [...out]
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
  return { ...base, data: body.data ?? {}, images: collectUrls(body.data), expiresInHours: 24 }
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

module.exports = { submitPhotography, getTask, waitForTask, downloadImage, collectUrls, IMAGE_SIZES, SUBMIT_PATH, TASK_RESULT_PATH }
