const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const storage = require('../services/storage.service')
const picsart = require('../services/picsart.service')
const viggle = require('../services/viggle.service')
const apiusage = require('../services/apiusage.service')

/**
 * "Video lab" for the admin dashboard: try the Picsart video models with your own image and text. Everything here is admin-only (it spends Picsart credits).
 * Each job is logged in api_calls as `picsart:<model>`, so it also shows on the dashboard's API usage page.
 */
const started = new Map() // task id -> { model, at }: lets a finished task be logged with the time it took (kept in memory; a restart only loses the duration)

/** GET /api/admin/video/config */
const config = (req, res) => res.set('Cache-Control', 'no-store').json({ success: true, configured: picsart.configured(), viggleConfigured: viggle.configured(), apiUrl: env.picsart.apiUrl, upload: storage.isConfigured() })

/** POST /api/admin/video/upload (multipart "image") - stores the picture in Spaces and returns its public URL, which the models take as `imageUrls`. */
async function upload(req, res) {
  const tmp = [req.file?.path]
  try {
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Send the picture in the form field "image".')
    if (!storage.isConfigured()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Uploading needs DigitalOcean Spaces (SPACES_KEY, SPACES_SECRET, SPACES_BUCKET). Paste a public image link instead.')
    const image = await prepareImage(req.file.path, 'image')
    const key = `video-lab/${crypto.randomBytes(8).toString('hex')}.${image.filename.split('.').pop()}`
    await storage.putImage(key, image.buffer, image.mimeType)
    res.status(201).json({ success: true, url: storage.publicUrl(key) })
  } finally {
    await removeFiles(tmp)
  }
}

/** POST /api/admin/video/submit { model, params } -> { id } (then poll /result). */
async function submit(req, res) {
  const { model, params } = req.body || {}
  const out = await picsart.submit(model, params)
  started.set(out.id, { model, at: Date.now() })
  await apiusage.record({ userId: req.admin?.id || 'admin', api: `picsart:${model}`, template: String(params?.prompt || '').slice(0, 120), status: 'processing', taskId: out.id })
  res.status(202).set('Cache-Control', 'no-store').json({ success: true, id: out.id, model })
}

/** POST /api/admin/video/viggle/submit { imageUrl, motionVideoUrl } -> { id } (then poll /viggle/:id/result). Copies the motion of the video onto the picture. */
async function viggleSubmit(req, res) {
  const { imageUrl, motionVideoUrl } = req.body || {}
  const out = await viggle.submit(imageUrl, motionVideoUrl)
  started.set(out.id, { model: 'viggle', at: Date.now() })
  await apiusage.record({ userId: req.admin?.id || 'admin', api: 'viggle', template: String(motionVideoUrl).slice(0, 120), status: 'processing', taskId: out.id })
  res.status(202).set('Cache-Control', 'no-store').json({ success: true, id: out.id, model: 'viggle', raw: out.raw })
}

/** GET /api/admin/video/viggle/:id/result -> { status, url, error, seconds, raw } */
async function viggleResult(req, res) {
  const r = await viggle.result(req.params.id)
  const job = started.get(r.id)
  if (r.status === 'COMPLETED') { await apiusage.finishTask(r.id, 'succeeded'); started.delete(r.id) }
  else if (r.status === 'FAILED') { await apiusage.finishTask(r.id, 'failed'); started.delete(r.id) }
  res.set('Cache-Control', 'no-store').json({ success: true, ...r, model: 'viggle', seconds: job ? Math.round((Date.now() - job.at) / 1000) : null })
}

/** GET /api/admin/video/:id/result -> { status, url, credits, error, seconds, raw } */
async function result(req, res) {
  const r = await picsart.result(req.params.id)
  const job = started.get(r.id)
  if (r.status === 'COMPLETED') { await apiusage.finishTask(r.id, 'succeeded'); started.delete(r.id) }
  else if (r.status === 'FAILED') { await apiusage.finishTask(r.id, 'failed'); started.delete(r.id) }
  res.set('Cache-Control', 'no-store').json({ success: true, ...r, model: job?.model || null, seconds: job ? Math.round((Date.now() - job.at) / 1000) : null })
}

module.exports = { config, upload, submit, result, viggleSubmit, viggleResult }
