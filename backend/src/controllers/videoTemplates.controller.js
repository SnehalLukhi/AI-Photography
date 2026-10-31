const crypto = require('node:crypto')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { query } = require('../db')
const { prepareImage } = require('../services/image.service')
const storage = require('../services/storage.service')
const picsart = require('../services/picsart.service')
const wallet = require('../services/wallet.service')
const apiusage = require('../services/apiusage.service')
const templates = require('../services/videoTemplates.service')

const GIVE_UP_MS = 30 * 60 * 1000 // a job that is still not finished after this is treated as failed (and the coins go back)

// ---- admin: manage the templates ----
const adminList = async (_req, res) => res.set('Cache-Control', 'no-store').json({ success: true, templates: await templates.listAll() })
const adminCreate = async (req, res) => res.status(201).json({ success: true, template: await templates.create(req.body) })
const adminUpdate = async (req, res) => res.json({ success: true, template: await templates.update(req.params.id, req.body) })
const adminRemove = async (req, res) => { await templates.remove(req.params.id); res.json({ success: true }) }

// ---- app: browse and use ----
/** GET /api/video-templates */
const list = async (_req, res) => res.set('Cache-Control', 'public, max-age=60').json({ success: true, templates: await templates.listActive() })

const publicJob = (j) => ({ id: j.id, templateId: j.template_id, status: j.status, url: j.video_url || null, error: j.error || null, coins: j.coins, createdAt: j.created_at })

/** POST /api/video-templates/:id/generate - multipart "image" (the person). Charges the coins, starts the video and answers 202 { job }; the app then polls /api/video-jobs/:id. */
async function generate(req, res) {
  const tmp = [req.file?.path]
  let charged = 0
  const refund = (ref) => wallet.credit(req.user.id, charged, 'refund', ref).catch((e) => console.error('[video] refund failed:', e.message))
  let inputKey
  try {
    const tpl = await templates.get(req.params.id)
    if (!tpl || !tpl.active) throw new AppError(404, 'NOT_FOUND', 'This video template is not available.')
    if (!req.file) throw new AppError(400, 'MISSING_FIELDS', 'Send your photo in the form field "image".')
    if (!storage.isConfigured()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Video needs DigitalOcean Spaces to hold your photo.')
    if (!picsart.configured()) throw new AppError(503, 'PICSART_NOT_CONFIGURED', 'Video is not set up on this server yet.')
    const image = await prepareImage(req.file.path, 'image')
    await removeFiles(tmp)

    const cost = templates.costOf(tpl)
    await wallet.charge(req.user.id, cost, 'video') // 402 when the balance is too low; nothing is taken then
    charged = cost
    const jobKey = crypto.randomUUID()
    try {
      inputKey = `video-inputs/${crypto.randomBytes(10).toString('hex')}.${image.filename.split('.').pop()}`
      await storage.putImage(inputKey, image.buffer, image.mimeType)
      const params = { ...(tpl.params || {}), ...(tpl.prompt ? { prompt: tpl.prompt } : {}), imageUrls: [storage.publicUrl(inputKey)], [tpl.video_key]: tpl.video_key.endsWith('s') ? [tpl.video_url] : tpl.video_url }
      const { id } = await picsart.submit(tpl.model, params)
      const row = (await query('INSERT INTO video_jobs (id, user_id, template_id, coins, input_key) VALUES ($1, $2, $3, $4, $5) RETURNING *', [id, req.user.id, tpl.id, cost, inputKey])).rows[0]
      await apiusage.record({ userId: req.user.id, api: `picsart:${tpl.model}`, template: `video:${tpl.id}`, status: 'processing', taskId: id, coins: cost })
      res.status(202).set('Cache-Control', 'no-store').json({ success: true, job: publicJob(row) })
    } catch (e) {
      await refund(`video:${jobKey}`)
      if (inputKey) storage.deleteObject(inputKey).catch(() => {})
      throw e
    }
  } finally {
    await removeFiles(tmp)
  }
}

/** Marks a processing job finished exactly once (the UPDATE only matches while it is still processing), so two polls cannot both refund. */
const settle = async (job, status, patch = {}) => (await query(
  "UPDATE video_jobs SET status = $2, video_url = $3, error = $4, finished_at = now() WHERE id = $1 AND status = 'processing' RETURNING *", [job.id, status, patch.url || null, patch.error || null])).rows[0]

/** GET /api/video-jobs/:id - the state of one of the user's videos. Asks Picsart while it is processing; a finished video is copied into Spaces so its link lasts. */
async function job(req, res) {
  let j = (await query('SELECT * FROM video_jobs WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])).rows[0]
  if (!j) throw new AppError(404, 'NOT_FOUND', 'No such video.')
  if (j.status === 'processing') {
    let r = null
    try { r = await picsart.result(j.id) } catch (e) { if (Date.now() - new Date(j.created_at).getTime() < GIVE_UP_MS) r = { status: 'IN_PROGRESS' }; else r = { status: 'FAILED', error: e.message } }
    if (r.status === 'COMPLETED' && r.url) {
      const url = await templates.keep(r.url, 'video-results')
      j = (await settle(j, 'succeeded', { url })) || j
      await apiusage.finishTask(j.id, 'succeeded')
    } else if (r.status === 'FAILED' || (r.status !== 'COMPLETED' && Date.now() - new Date(j.created_at).getTime() > GIVE_UP_MS)) {
      const done = await settle(j, 'failed', { error: r.error || 'The video could not be made.' })
      if (done) { j = done; await wallet.credit(j.user_id, j.coins, 'refund', `video:${j.id}`); await apiusage.finishTask(j.id, 'failed') }
    }
    if (j.status !== 'processing' && j.input_key) storage.deleteObject(j.input_key).catch(() => {}) // the user's photo is not kept
  }
  res.set('Cache-Control', 'no-store').json({ success: true, job: publicJob(j) })
}

/** GET /api/video-jobs - the user's latest videos. */
async function jobs(req, res) {
  const rows = (await query('SELECT * FROM video_jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [req.user.id])).rows
  res.set('Cache-Control', 'no-store').json({ success: true, jobs: rows.map(publicJob) })
}

module.exports = { adminList, adminCreate, adminUpdate, adminRemove, list, generate, job, jobs }
