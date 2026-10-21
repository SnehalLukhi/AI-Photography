const AppError = require('../utils/AppError')
const CARTOON_TYPES = require('../config/cartoonTypes')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const ailab = require('../services/ailab.service')
const generations = require('../services/generations.service')

// Cartoon Yourself image requirements (official docs): JPEG / JPG / PNG, <= 5 MB, < 4096 x 4096 px (no WebP).
const LIMITS = { formats: ['jpeg', 'png'], maxBytes: 5 * 1024 * 1024 }

function payload(result) {
  const base = { success: true, status: result.status, provider: 'cartoon-yourself', taskId: result.taskId, requestId: result.requestId, logId: result.logId }
  if (result.status === 'succeeded') return generations.attach({ ...base, expiresInHours: result.expiresInHours, images: result.images, data: result.data }, result.generation)
  return generations.attach({ ...base, pollUrl: `/api/photos/tasks/${encodeURIComponent(result.taskId)}` }, result.generation) // same async task-result API as AI Photography
}

/** POST /api/cartoon/generate - multipart: image (JPG/PNG <= 5 MB) + type (one of the documented Cartoon Yourself styles). */
async function generate(req, res) {
  const tmp = [req.file?.path] // removed in `finally`, success or failure
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Missing required file field "image". Send multipart/form-data with "image" and "type".')
    const type = typeof req.body?.type === 'string' ? req.body.type.trim() : ''
    if (!type) throw new AppError(400, 'MISSING_FIELDS', '"type" is required (the Cartoon Yourself style, for example "anime").')
    if (!CARTOON_TYPES.includes(type)) throw new AppError(400, 'INVALID_TYPE', `"type" must be one of the ${CARTOON_TYPES.length} supported Cartoon Yourself styles.`)

    const image = await prepareImage(req.file.path, 'image', LIMITS)
    await removeFiles(tmp) // the upload is in memory now: delete it before the (slow) API call

    const submitted = await ailab.submitCartoon({ image, type })
    const gen = await generations.begin(image, { api: 'cartoon-yourself', template: generations.label(req, type), owner: req.user.id }) // original photo -> Spaces, only for a job AILabTools accepted (null when storage is off)
    generations.linkTask(gen, submitted.taskId)
    let result
    try { result = await ailab.waitForTask(submitted.taskId) } catch (e) { await generations.discard(gen); throw e } // asynchronous API: poll every 5 s; a failed job leaves no stored photo behind
    const full = { ...result, requestId: result.requestId || submitted.requestId, logId: result.logId || submitted.logId }
    full.generation = await generations.complete(gen, full) // AI result -> Spaces

    const wantsBinary = (req.query.response || req.body?.response) === 'image'
    if (full.status === 'succeeded' && wantsBinary) {
      if (!full.images.length) throw new AppError(502, 'AILAB_NO_IMAGE_URL', 'The finished task contains no image URL to download. Use the JSON response and read "data".', { data: full.data })
      const { buffer, mimeType } = await ailab.downloadImage(full.images[0])
      return res.set({ 'Content-Type': mimeType, 'Content-Length': buffer.length, 'Cache-Control': 'no-store' }).status(200).send(buffer)
    }
    return res.status(full.status === 'succeeded' ? 200 : 202).set('Cache-Control', 'no-store').json(payload(full))
  } finally {
    await removeFiles(tmp)
  }
}

module.exports = { generate, LIMITS }
