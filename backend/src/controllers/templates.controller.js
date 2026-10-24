const crypto = require('node:crypto')
const AppError = require('../utils/AppError')
const { removeFiles } = require('../utils/tempFiles')
const { prepareImage } = require('../services/image.service')
const storage = require('../services/storage.service')
const svc = require('../services/templates.service')
const trending = require('../services/trending.service')

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

/** GET /api/admin/catalogue - everything for the admin: categories with their template counts, and every template (inactive ones too). */
async function adminCatalogue(req, res) {
  const [categories, templates] = await Promise.all([svc.listCategories(), svc.listTemplates({ includeInactive: true })])
  const counts = templates.reduce((m, t) => ({ ...m, [t.category_id]: (m[t.category_id] || 0) + 1 }), {})
  res.set('Cache-Control', 'no-store').json({ success: true, flows: svc.FLOWS, categories: categories.map((c) => ({ ...c, templates: counts[c.id] || 0 })), templates })
}

/** PUT /api/admin/template-categories/:id */
async function updateCategory(req, res) {
  res.json({ success: true, category: await svc.updateCategory(req.params.id, req.body || {}) })
}

/** DELETE /api/admin/template-categories/:id[?cascade=true] */
async function removeCategory(req, res) {
  res.json({ success: true, id: req.params.id, deletedTemplates: await svc.deleteCategory(req.params.id, { cascade: req.query.cascade === 'true' }) })
}

/** The text fields of a multipart form are all strings: blank ones are dropped and the numeric / boolean / JSON ones converted. */
function formBody(req) {
  const b = Object.fromEntries(Object.entries(req.body || {}).filter(([, v]) => v !== ''))
  for (const k of ['cost_coins', 'sort_order', 'trending_position']) if (k in b) b[k] = Number(b[k])
  for (const k of ['active', 'trending']) if (k in b) b[k] = b[k] !== 'false'
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

/** Reads a JSON field that arrives as text in a multipart form (or already parsed in a JSON request). */
const jsonField = (v, name) => {
  if (v === undefined || v === null || v === '') return undefined
  if (typeof v !== 'string') return v
  try { return JSON.parse(v) } catch { throw new AppError(400, 'INVALID_TEMPLATE', `"${name}" must be valid JSON.`) }
}

/**
 * POST /api/admin/templates/bulk - add many templates in one go, all or nothing (add ?upsert=true to replace ones that exist).
 *   { "defaults": { "category_id": "retro", "style_desc_prompt": "..." }, "templates": [ { "id": "a", "name": "A", "preview_url": "https://..." }, ... ] }
 * Every template is its own object merged over "defaults". Its picture is its "preview_url", or - with multipart/form-data - the file name of one of the
 * uploaded "images" in the template's "image" field (stored in Spaces). A template with "trending": true is also added to Trending.
 */
async function bulk(req, res) {
  const files = req.files || []
  const stored = []
  try {
    const list = jsonField(req.body?.templates, 'templates')
    const defaults = jsonField(req.body?.defaults, 'defaults') || {}
    if (!Array.isArray(list) || !list.length) throw new AppError(400, 'INVALID_TEMPLATE', '"templates" must be a non-empty array.')
    if (list.length > 100) throw new AppError(400, 'INVALID_TEMPLATE', 'At most 100 templates per bulk request.')
    const byName = new Map(files.map((f) => [f.originalname, f]))
    const items = []
    for (const raw of list) {
      const t = { ...defaults, ...(raw && typeof raw === 'object' ? raw : {}) }
      if (t.image) {
        const file = byName.get(t.image)
        if (!file) throw new AppError(400, 'INVALID_TEMPLATE', `Template "${t.id}": no uploaded file named "${t.image}".`)
        const s = await storeImage(file, t.category_id, t.id)
        stored.push(s); t.preview_url = s.url
      }
      items.push(t)
    }
    const wantTrending = items.map((t) => (t.trending === true || t.trending === 'true') && `${t.category_id}/${t.id}`).filter(Boolean)
    const clean = items.map(({ image, trending: _t, ...t }) => t) // eslint-disable-line no-unused-vars
    const templates = await svc.createTemplates(clean, { upsert: req.query.upsert === 'true' })
    for (const id of wantTrending) await trending.add(id)
    res.status(201).json({ success: true, count: templates.length, templates })
  } catch (e) {
    await Promise.all(stored.map((s) => storage.deleteObject(s.key).catch(() => {}))) // nothing was saved: do not leave the pictures behind
    throw e
  } finally {
    await removeFiles(files.map((f) => f.path))
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

module.exports = { list, bulk, adminCatalogue, updateCategory, removeCategory, createCategory, create, update, remove }
