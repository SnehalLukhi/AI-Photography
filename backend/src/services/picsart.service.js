const env = require('../config/env')
const AppError = require('../utils/AppError')

/**
 * Picsart API Platform (video / image models). Every call needs  Authorization: Bearer <PICSART_API_KEY>  and goes to PICSART_API_URL (https://api.picsart.com):
 *   POST /workflows/v1/models/submit            { params: { model, params: { prompt, imageUrls, ... } } }  ->  { response: { id } }
 *   GET  /workflows/v1/models/<id>/result       ->  { response: { id, status: ACCEPTED | IN_PROGRESS | COMPLETED | FAILED, result: { url, items }, usage: { credits } } }
 * Video takes longer than the ~20 s of the quick /execute call, so jobs are always submitted and then polled. The input fields differ per model (see its page on
 * https://picsart.com/api-platform/models), so `params` is passed through as given.
 */
const base = () => env.picsart.apiUrl.replace(/\/+$/, '')
const configured = () => !!env.picsart.apiKey

async function call(method, path, body) {
  if (!configured()) throw new AppError(503, 'PICSART_NOT_CONFIGURED', 'Set PICSART_API_KEY in the server environment (backend/.env, and on Vercel).')
  let res
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: { authorization: `Bearer ${env.picsart.apiKey}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(env.picsart.timeoutMs),
    })
  } catch (e) {
    throw new AppError(502, 'PICSART_UNREACHABLE', `Could not reach Picsart (${e.name === 'TimeoutError' ? 'timed out' : e.message}).`)
  }
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }
  if (!res.ok) {
    const message = data?.message || data?.error?.message || (typeof data?.error === 'string' ? data.error : '') || `Picsart answered HTTP ${res.status}.`
    throw new AppError(res.status === 401 || res.status === 403 ? 502 : res.status === 429 ? 429 : res.status >= 500 ? 502 : 400, 'PICSART_ERROR', message, { httpStatus: res.status, picsart: data })
  }
  return data
}

/** Starts a generation with `model` (e.g. "pixverse-c1-image") and its input `params`. Returns the task id. */
async function submit(model, params) {
  if (typeof model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(model)) throw new AppError(400, 'INVALID_MODEL', 'model must be a Picsart model id such as "pixverse-c1-image".')
  if (!params || typeof params !== 'object' || Array.isArray(params)) throw new AppError(400, 'INVALID_PARAMS', 'params must be an object with the model\'s inputs (prompt, imageUrls, ...).')
  const data = await call('POST', '/workflows/v1/models/submit', { params: { model, params } })
  const id = data?.response?.id
  if (!id) throw new AppError(502, 'PICSART_UNEXPECTED_RESPONSE', 'Picsart did not return a task id.', { picsart: data })
  return { id, raw: data }
}

/** The state of a task: { id, status, url, credits, error, raw }. `url` is the finished video / image. */
async function result(taskId) {
  if (typeof taskId !== 'string' || !/^[A-Za-z0-9_-]{3,120}$/.test(taskId)) throw new AppError(400, 'INVALID_TASK_ID', 'Invalid task id.')
  const data = await call('GET', `/workflows/v1/models/${encodeURIComponent(taskId)}/result`)
  const r = data?.response || {}
  const url = r.result?.url || r.result?.items?.[0]?.url || null
  const status = String(r.status || '').toUpperCase() || 'UNKNOWN'
  return { id: r.id || taskId, status, url, credits: r.usage?.credits ?? null, error: status === 'FAILED' ? (r.error?.message || r.result?.error || r.message || 'The generation failed.') : null, raw: data }
}

module.exports = { configured, submit, result }
