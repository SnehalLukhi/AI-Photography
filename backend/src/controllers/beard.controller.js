const path = require('node:path')
const AppError = require('../utils/AppError')
const env = require('../config/env')
const TEMPLATES = require('../config/beardTemplates')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const ailab = require('../services/ailab.service')
const generations = require('../services/generations.service')

// AI Beard Styling image requirements (official docs, image and image_template): JPEG / JPG / PNG / WEBP, <= 10 MB, < 4096 x 4096 px.
const LIMITS = { maxBytes: 10 * 1024 * 1024 }

function payload(result) {
  const base = { success: true, status: result.status, provider: 'ai-beard-styling', taskId: result.taskId, requestId: result.requestId, logId: result.logId }
  if (result.status === 'succeeded') return generations.attach({ ...base, expiresInHours: result.expiresInHours, images: result.images, data: result.data }, result.generation)
  return generations.attach({ ...base, pollUrl: `/api/photos/tasks/${encodeURIComponent(result.taskId)}` }, result.generation) // same async task-result API as the other categories
}

/**
 * POST /api/beard/generate - multipart: image (the user's photo) + template (the `id` of an entry of ai-beard-styling_templates.json).
 * The backend looks the id up in its explicit table and sends that template's preview image to AILabTools as `image_template`.
 */
async function generate(req, res) {
  const tmp = [req.file?.path]
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Missing required file field "image". Send multipart/form-data with "image" and "template".')
    const id = typeof req.body?.template === 'string' ? req.body.template.trim() : ''
    if (!id) throw new AppError(400, 'MISSING_FIELDS', '"template" is required (the id of a Beard template, for example "beard_balbo").')
    if (!Object.hasOwn(TEMPLATES, id)) throw new AppError(400, 'INVALID_TEMPLATE', `"template" is not a known Beard template id: ${id.slice(0, 60)}`)
    const file = TEMPLATES[id]
    if (!file) throw new AppError(422, 'TEMPLATE_IMAGE_MISSING', `The Beard template "${id}" has no reference image, so it cannot be generated.`)

    const image = await prepareImage(req.file.path, 'image', LIMITS)
    await removeFiles(tmp)
    const template = await prepareImage(path.join(env.beardTemplateDir, file), 'image_template', LIMITS).catch((e) => {
      if (e instanceof AppError && e.status !== 422) throw e
      throw new AppError(500, 'TEMPLATE_IMAGE_UNAVAILABLE', `The reference image of the Beard template "${id}" could not be read on the server.`)
    })

    const submitted = await ailab.submitBeard({ image, template })
    const gen = await generations.begin(image, { api: 'ai-beard-styling', template: generations.label(req, id), owner: req.user.id }) // original photo -> Spaces, only for a job AILabTools accepted (null when storage is off)
    generations.linkTask(gen, submitted.taskId)
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
