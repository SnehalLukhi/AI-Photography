const env = require('../config/env')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const ailab = require('../services/ailab.service')

const TASK_ID_RE = /^[A-Za-z0-9_-]{6,128}$/
// Documented limits: style_title <= 500 chars, style_desc <= 1000 chars, English only. AILabTools truncates extra text itself.
const MAX_TITLE = 500
const MAX_DESC = 1000
// "English only": reject text written in non-Latin scripts (a script check cannot identify the language itself).
const NON_LATIN = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{Z}\p{M}\n\r\t]/u

function styleText(raw, field, max) {
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (!text) throw new AppError(400, 'MISSING_FIELDS', `"${field}" is required (English text, up to ${max} characters).`)
  if (NON_LATIN.test(text)) throw new AppError(422, 'INVALID_STYLE_TEXT', `"${field}" must be written in English (Latin letters).`)
  return text.slice(0, max)
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
    return { ...base, expiresInHours: result.expiresInHours, images: result.images, data: result.data }
  }
  return { ...base, pollUrl: `/api/photos/tasks/${encodeURIComponent(result.taskId)}` }
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
    const styleTitle = styleText(req.body?.style_title, 'style_title', MAX_TITLE)
    const styleDesc = styleText(req.body?.style_desc, 'style_desc', MAX_DESC)
    const imageSize = parseImageSize(req.body?.image_size)

    const image = await prepareImage(req.file.path, 'image')
    await removeFiles(tmp) // the upload is in memory now: delete it before the (slow) API call

    const submitted = await ailab.submitPhotography({ image, styleTitle, styleDesc, imageSize })
    const result = await ailab.waitForTask(submitted.taskId) // asynchronous API: poll every 5 s
    return await respond(req, res, { ...result, requestId: result.requestId || submitted.requestId, logId: result.logId || submitted.logId })
  } finally {
    await removeFiles(tmp)
  }
}

/** GET /api/photos/tasks/:taskId - status / result of an asynchronous AI Photography job. */
async function taskStatus(req, res) {
  const { taskId } = req.params
  if (!TASK_ID_RE.test(taskId)) throw new AppError(400, 'INVALID_TASK_ID', 'Invalid task id.')
  return respond(req, res, await ailab.getTask(taskId))
}

module.exports = { generate, taskStatus }
