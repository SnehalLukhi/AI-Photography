const env = require('../config/env')
const AppError = require('../utils/AppError')

/**
 * Viggle API: copies the motion of a reference video onto a picture of a character. Every call needs  Authorization: Bearer <VIGGLE_API_KEY>  and goes to VIGGLE_API_URL:
 *   POST /renders        multipart form { image_url, motion_video_url }  ->  { id, ... }
 *   GET  /videos/<id>    ->  { id, status: ... | ready | failed | cancelled, video_url, error }
 * Jobs are always submitted and then polled (status "ready" = finished). The statuses are mapped to the ones the Video lab already knows (see `result`).
 */
const base = () => env.viggle.apiUrl.replace(/\/+$/, '')
const configured = () => !!env.viggle.apiKey

async function call(method, path, body) {
  if (!configured()) throw new AppError(503, 'VIGGLE_NOT_CONFIGURED', 'Set VIGGLE_API_KEY in the server environment (backend/.env, and on Vercel).')
  let res
  try {
    res = await fetch(`${base()}${path}`, { method, headers: { authorization: `Bearer ${env.viggle.apiKey}` }, body, signal: AbortSignal.timeout(env.viggle.timeoutMs) })
  } catch (e) {
    throw new AppError(502, 'VIGGLE_UNREACHABLE', `Could not reach Viggle (${e.name === 'TimeoutError' ? 'timed out' : e.message}).`)
  }
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }
  if (!res.ok) {
    const e = data?.error
    const message = (typeof e === 'string' ? e : e?.message) || data?.message || `Viggle answered HTTP ${res.status}.`
    throw new AppError(res.status === 401 || res.status === 403 ? 502 : res.status === 429 ? 429 : res.status >= 500 ? 502 : 400, 'VIGGLE_ERROR', message, { httpStatus: res.status, viggle: data })
  }
  return data
}

const isUrl = (v) => { try { return ['http:', 'https:'].includes(new URL(v).protocol) } catch { return false } }

/**
 * Viggle's own error for a bad link is "remote content is not a valid video", which does not say what the link gave back. Look at the link first: a page (YouTube,
 * Instagram, Google Drive share links ...), a login wall or an expired link is reported plainly. If the link cannot be checked from here, Viggle gets to try it.
 */
async function checkVideoLink(url) {
  let res
  try { res = await fetch(url, { headers: { range: 'bytes=0-1023' }, signal: AbortSignal.timeout(10_000) }) } catch { return }
  await res.body?.cancel().catch(() => {})
  if (!res.ok) throw new AppError(400, 'VIDEO_LINK_NOT_REACHABLE', `The reference video link answered HTTP ${res.status}. It must open the video file without signing in, and must not be expired.`)
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (type.startsWith('text/') || type.startsWith('image/') || type === 'application/json' || type === 'application/xml') {
    throw new AppError(400, 'NOT_A_VIDEO_FILE', `The reference video link gives back ${type}, not a video. Use a direct link to the file (it opens the video on its own, usually ending in .mp4). Share links from YouTube, Instagram, TikTok or Google Drive are web pages and do not work.`)
  }
}

/** Starts a render: `imageUrl` = the character picture, `motionVideoUrl` = the video whose motion is copied (both public links). Returns the render id. */
async function submit(imageUrl, motionVideoUrl) {
  if (!isUrl(imageUrl)) throw new AppError(400, 'INVALID_IMAGE_URL', 'The picture must be a full https:// link.')
  if (!isUrl(motionVideoUrl)) throw new AppError(400, 'INVALID_VIDEO_URL', 'The reference video must be a full https:// link.')
  await checkVideoLink(motionVideoUrl)
  const form = new FormData()
  form.append('image_url', imageUrl)
  form.append('motion_video_url', motionVideoUrl)
  const data = await call('POST', '/renders', form)
  const id = data?.id
  if (!id) throw new AppError(502, 'VIGGLE_UNEXPECTED_RESPONSE', 'Viggle did not return a render id.', { viggle: data })
  return { id: String(id), raw: data }
}

const STATUS = { ready: 'COMPLETED', failed: 'FAILED', cancelled: 'FAILED' } // anything else (queued, processing ...) is still running

/** The state of a render: { id, status (COMPLETED | FAILED | IN_PROGRESS), url, credits, error, raw } - the same shape as picsart.result. */
async function result(renderId) {
  if (typeof renderId !== 'string' || !/^[A-Za-z0-9_-]{3,120}$/.test(renderId)) throw new AppError(400, 'INVALID_TASK_ID', 'Invalid render id.')
  const r = await call('GET', `/videos/${encodeURIComponent(renderId)}`)
  const status = STATUS[String(r?.status || '').toLowerCase()] || 'IN_PROGRESS'
  const err = r?.error
  return { id: r?.id || renderId, status, url: status === 'COMPLETED' ? r?.video_url || null : null, credits: null, error: status === 'FAILED' ? (typeof err === 'string' ? err : err?.message) || `The render ${String(r?.status || 'failed').toLowerCase()}.` : null, raw: r }
}

module.exports = { configured, submit, result }
