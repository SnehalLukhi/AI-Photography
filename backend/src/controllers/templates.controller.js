const crypto = require('node:crypto')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const storage = require('../services/storage.service')
const svc = require('../services/templates.service')

/** GET /api/templates?category= - the active templates for the app (public). */
async function list(req, res) {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined
  const [categories, templates] = await Promise.all([svc.listCategories(), svc.listTemplates({ category })])
  res.set('Cache-Control', 'public, max-age=60').json({ success: true, categories, templates })
}

/** POST /api/admin/template-categories - one category object (idempotent with ?upsert=true). */
async function createCategory(req, res) {
  const category = await svc.saveCategory(req.body, { upsert: req.query.upsert === 'true' })
  res.status(201).json({ success: true, category })
}

/** The text fields of a multipart form are all strings: blank ones are dropped and the numeric / boolean / JSON ones converted. */
function formBody(req) {
  const b = Object.fromEntries(Object.entries(req.body || {}).filter(([, v]) => v !== ''))
  for (const k of ['cost_coins', 'sort_order']) if (k in b) b[k] = Number(b[k])
  if ('active' in b) b.active = b.active !== 'false'
  if (typeof b.extra === 'string') {
    try { b.extra = JSON.parse(b.extra) } catch { throw new AppError(400, 'INVALID_TEMPLATE', '"extra" must be valid JSON.') }
  }
  return b
}

/** Stores the uploaded picture in Spaces and returns its public URL (the template's preview_url). */
async function storeImage(file, category, id) {
  if (!storage.isConfigured()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Image upload needs DigitalOcean Spaces (SPACES_KEY, SPACES_SECRET, SPACES_BUCKET in backend/.env). Send "preview_url" instead.')
  const image = await prepareImage(file.path, 'image')
  const safe = (v) => String(v || 'template').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 100)
  const key = `templates/${safe(category)}/${safe(id)}-${crypto.randomBytes(4).toString('hex')}.${image.filename.split('.').pop()}` // random part: a replaced picture gets a new URL (the old one is cached for a year)
  await storage.putImage(key, image.buffer, image.mimeType)
  return { key, url: storage.publicUrl(key) }
}

/**
 * POST /api/admin/templates - JSON: one template object or an array (all-or-nothing); prompts are optional except for photography categories.
 * Or multipart/form-data: one template, its picture in the file field "image" (stored in Spaces, preview_url is filled in) + the other fields as text.
 */
async function create(req, res) {
  if (!req.is('multipart/form-data')) return res.status(201).json({ success: true, templates: await svc.createTemplates(req.body, { upsert: req.query.upsert === 'true' }) })
  const tmp = [req.file?.path]
  let stored
  try {
    const body = formBody(req)
    if (req.file) { stored = await storeImage(req.file, body.category_id, body.id); body.preview_url = stored.url }
    const templates = await svc.createTemplates(body, { upsert: req.query.upsert === 'true' })
    res.status(201).json({ success: true, templates })
  } catch (e) {
    if (stored) await storage.deleteObject(stored.key).catch(() => {}) // the template was not saved: do not leave the picture behind
    throw e
  } finally {
    await removeFiles(tmp)
  }
}

/** PUT /api/admin/templates/:id - changes only the sent fields (JSON or multipart; a new "image" file replaces the picture). */
async function update(req, res) {
  if (!req.is('multipart/form-data')) return res.json({ success: true, template: await svc.updateTemplate(req.params.id, req.body || {}) })
  const tmp = [req.file?.path]
  let stored
  try {
    const patch = formBody(req)
    if (req.file) {
      const current = await svc.getTemplate(req.params.id)
      stored = await storeImage(req.file, patch.category_id || current?.category_id, req.params.id)
      patch.preview_url = stored.url
    }
    res.json({ success: true, template: await svc.updateTemplate(req.params.id, patch) })
  } catch (e) {
    if (stored) await storage.deleteObject(stored.key).catch(() => {})
    throw e
  } finally {
    await removeFiles(tmp)
  }
}

/** DELETE /api/admin/templates/:id */
async function remove(req, res) {
  await svc.deleteTemplate(req.params.id)
  res.json({ success: true, id: req.params.id })
}

module.exports = { list, createCategory, create, update, remove }
