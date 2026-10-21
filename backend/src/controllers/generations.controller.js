const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const generations = require('../services/generations.service')

/** Reads the single uploaded "image" (verified by decoding, not by MIME type) and deletes the temp upload. */
async function readUpload(req) {
  const tmp = [req.file?.path]
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Missing required file field "image". Send multipart/form-data with one "image".')
    return await prepareImage(req.file.path, 'image')
  } finally {
    await removeFiles(tmp)
  }
}

/** POST /api/generations - multipart: image. Saves the user's original photo to Spaces and returns the new generation (id + public image URL). */
async function create(req, res) {
  const generation = await generations.create(await readUpload(req), { api: 'upload', template: generations.label(req), owner: req.user.id })
  res.status(201).set('Cache-Control', 'no-store').json({ success: true, generation })
}

/** POST /api/generations/:id/result - multipart: image. Saves an AI-generated image next to the original (409 if it already has one). */
async function saveResult(req, res) {
  const generation = await generations.saveResult(req.params.id, req.user.id, await readUpload(req))
  res.status(201).set('Cache-Control', 'no-store').json({ success: true, generation })
}

/** GET /api/generations/:id - the original and the AI-generated image (public, permanent image URLs). */
async function get(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, generation: await generations.get(req.params.id, req.user.id) })
}

/** GET /api/generations?limit=20&nextToken=... - the logged-in user's generations, newest first. */
async function list(req, res) {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50)
  const token = typeof req.query.nextToken === 'string' && req.query.nextToken ? req.query.nextToken : undefined
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await generations.list(req.user.id, { limit, token })) })
}

/** DELETE /api/generations/:id - removes both images; only for the user who created it. */
async function remove(req, res) {
  await generations.remove(req.params.id, req.user.id)
  res.json({ success: true })
}

module.exports = { create, saveResult, get, list, remove }
