const AppError = require('../utils/AppError')
const TEMPLATES = require('../config/hairstyleTemplates')
const { COLORS } = require('../config/hairstyleOptions')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const ailab = require('../services/ailab.service')
const generations = require('../services/generations.service')

// Hairstyle Changer Premium image requirements (official docs): JPEG / JPG / PNG, <= 5 MB, larger than 200 x 200 px and smaller than 4090 x 4090 px.
const LIMITS = { formats: ['jpeg', 'png'], maxBytes: 5 * 1024 * 1024, maxSide: 4089 }
const MIN_SIDE = 200

function payload(result) {
  const base = { success: true, status: result.status, provider: 'hairstyle-changer-premium', taskId: result.taskId, requestId: result.requestId, logId: result.logId }
  if (result.status === 'succeeded') return generations.attach({ ...base, expiresInHours: result.expiresInHours, images: result.images, data: result.data }, result.generation)
  return generations.attach({ ...base, pollUrl: `/api/photos/tasks/${encodeURIComponent(result.taskId)}` }, result.generation) // same async task-result API as the other categories
}

/**
 * POST /api/hairstyle/generate - multipart: image (JPG/PNG <= 5 MB) + template (id of a template of ai-hairstyle-changer_templates.json) + color (optional, a documented colour value).
 * The backend turns the template id into the API's `hair_style` with its explicit table and sends image + hair_style + color to AILabTools.
 */
async function generate(req, res) {
  const tmp = [req.file?.path]
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Missing required file field "image". Send multipart/form-data with "image", "template" and "color".')
    const id = typeof req.body?.template === 'string' ? req.body.template.trim() : ''
    if (!id) throw new AppError(400, 'MISSING_FIELDS', '"template" is required (the id of a Hairstyle template, for example "hair_men_manbun").')
    if (!Object.hasOwn(TEMPLATES, id)) throw new AppError(400, 'INVALID_TEMPLATE', `"template" is not a known Hairstyle template id: ${id.slice(0, 60)}`)
    const color = typeof req.body?.color === 'string' ? req.body.color.trim() : ''
    if (color && !COLORS.includes(color)) throw new AppError(400, 'INVALID_COLOR', `"color" must be one of the supported hair colours (received: ${color.slice(0, 40)}).`)

    const image = await prepareImage(req.file.path, 'image', LIMITS)
    await removeFiles(tmp)
    if (Math.min(image.width, image.height) <= MIN_SIDE) throw new AppError(422, 'IMAGE_TOO_SMALL', `"image" must be larger than ${MIN_SIDE} x ${MIN_SIDE} pixels.`)

    const submitted = await ailab.submitHairstyle({ image, hairStyle: TEMPLATES[id], color })
    const gen = await generations.begin(image, { api: 'hairstyle-changer-premium', template: generations.label(req, id), owner: req.user.id }) // original photo -> Spaces, only for a job AILabTools accepted (null when storage is off)
    await generations.linkTask(gen, submitted.taskId)
    let result
    try { result = await ailab.waitForTask(submitted.taskId) } catch (e) { await generations.discard(gen); throw e } // asynchronous API: poll every 5 s; a failed job leaves no stored photo behind
    const full = { ...result, requestId: result.requestId || submitted.requestId, logId: result.logId || submitted.logId }
    full.generation = await generations.complete(gen, full) // AI result -> Spaces
    return res.status(full.status === 'succeeded' ? 200 : 202).set('Cache-Control', 'no-store').json(payload(full))
  } finally {
    await removeFiles(tmp)
  }
}

module.exports = { generate, LIMITS }
