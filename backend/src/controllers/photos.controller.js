const env = require('../config/env')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const ailab = require('../services/ailab.service')
const generations = require('../services/generations.service')

const TASK_ID_RE = /^[A-Za-z0-9_-]{6,128}$/
// The template prompts (style_title / style_desc) come from the template JSON files and are passed to AILabTools EXACTLY as received: no trimming, truncation,
// character filtering or any other change. Only a missing / empty value is refused (a replacement prompt is never created). AILabTools applies its own length limits.
function styleText(raw, field) {
  if (typeof raw !== 'string' || !raw.trim()) throw new AppError(400, 'MISSING_FIELDS', `"${field}" is required (the template's prompt text).`)
  return raw
}

function parseImageSize(raw) {
  if (raw == null || raw === '') return undefined // API default: auto
  if (!ailab.IMAGE_SIZES.includes(raw)) {
    throw new AppError(400, 'INVALID_IMAGE_SIZE', `"image_size" must be one of: ${ailab.IMAGE_SIZES.join(', ')}.`)
  }
  return raw
}

function sendImage(res, { buffer, mimeType }) {
  res.set({ 'Content-Type': mimeType, 'Content-Length': buffer.length, 'Cache-Control': 'no-store' }).status(200).send(buffer)
}

/** Shape of every success/processing response (documented in the README). */
function payload(result) {
  const base = { success: true, status: result.status, provider: env.ailab.provider, taskId: result.taskId, requestId: result.requestId, logId: result.logId }
  if (result.status === 'succeeded') {
    return generations.attach({ ...base, expiresInHours: result.expiresInHours, images: result.images, data: result.data }, result.generation)
  }
  return generations.attach({ ...base, pollUrl: `/api/photos/tasks/${encodeURIComponent(result.taskId)}` }, result.generation)
}

async function respond(req, res, result) {
  const wantsBinary = (req.query.response || req.body?.response) === 'image'
  if (result.status === 'succeeded' && wantsBinary) {
    if (!result.images.length) {
      throw new AppError(502, 'AILAB_NO_IMAGE_URL', 'The finished task contains no image URL to download. Use the JSON response and read "data".', { data: result.data })
    }
    return sendImage(res, await ailab.downloadImage(result.images[0]))
  }
  // 200 = finished, 202 = still queued/processing (poll pollUrl)
  return res.status(result.status === 'succeeded' ? 200 : 202).set('Cache-Control', 'no-store').json(payload(result))
}

/** POST /api/photos/generate */
async function generate(req, res) {
  const tmp = [req.file?.path] // removed in `finally`, success or failure

  try {
    if (!req.file) {
      throw new AppError(400, 'MISSING_FIELDS', 'Missing required file field "image". Send multipart/form-data with "image", "style_title" and "style_desc" (optional "image_size").')
    }
    const styleTitle = styleText(req.body?.style_title, 'style_title')
    const styleDesc = styleText(req.body?.style_desc, 'style_desc')
    const imageSize = parseImageSize(req.body?.image_size)

    const image = await prepareImage(req.file.path, 'image')
    await removeFiles(tmp) // the upload is in memory now: delete it before the (slow) API call

    const submitted = await ailab.submitPhotography({ image, styleTitle, styleDesc, imageSize })
    const gen = await generations.begin(image, { api: 'ai-photography', template: generations.label(req, styleTitle), owner: req.user.id }) // original photo -> Spaces, only for a job AILabTools accepted (null when storage is off)
    await generations.linkTask(gen, submitted.taskId)
    let result
    try { result = await ailab.waitForTask(submitted.taskId) } catch (e) { await generations.discard(gen); throw e } // asynchronous API: poll every 5 s; a failed job leaves no stored photo behind
    const full = { ...result, requestId: result.requestId || submitted.requestId, logId: result.logId || submitted.logId }
    return await respond(req, res, { ...full, generation: await generations.complete(gen, full) }) // AI result -> Spaces
  } finally {
    await removeFiles(tmp)
  }
}

/** GET /api/photos/tasks/:taskId - status / result of an asynchronous AI Photography job. */
async function taskStatus(req, res) {
  const { taskId } = req.params
  if (!TASK_ID_RE.test(taskId)) throw new AppError(400, 'INVALID_TASK_ID', 'Invalid task id.')
  const result = await ailab.getTask(taskId)
  return respond(req, res, { ...result, generation: await generations.completeByTask(taskId, result, req.user.id) })
}

module.exports = { generate, taskStatus }
