const AppError = require('../utils/AppError')
const { query, tx } = require('../db')
const CARTOON_TYPES = require('../config/cartoonTypes')
const trending = require('./trending.service')

const FLOWS = ['photography', 'cartoon', 'beard', 'hairstyle']
// A template that belongs to no category (it exists only for Trending) lives in this reserved, hidden category. It is created on first use, never shown as a category
// in the app, and its templates are always trending-capable; un-trending one leaves it stored (and invisible) - nothing is deleted.
const UNCATEGORISED = { id: 'trending-only', name: 'No category (Trending only)', flow: 'photography' }
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/

const text = (v) => (typeof v === 'string' ? v.trim() : '')
const optText = (v, max) => { const s = text(v); return s ? s.slice(0, max) : null }
const promptText = (v) => (typeof v === 'string' && v.trim() ? v : null) // prompts are stored exactly as entered: no length limit, no trimming, no rewriting
const bad = (message) => new AppError(400, 'INVALID_TEMPLATE', message)

const templateOut = (r) => ({
  id: r.id, category_id: r.category_id, flow: r.flow, name: r.name, preview_url: r.preview_url,
  style_title_prompt: r.style_title_prompt, style_desc_prompt: r.style_desc_prompt, api_value: r.api_value,
  aspect_ratio: r.aspect_ratio, cost_coins: r.cost_coins, gender: r.gender, extra: r.extra || {}, sort_order: r.sort_order, active: r.active,
  trending: r.trending, trending_position: r.trending_position,
})
const categoryOut = (r) => ({ id: r.id, name: r.name, flow: r.flow, parent_id: r.parent_id, sort_order: r.sort_order, hide_from_all: r.hide_from_all })

const SELECT = 'SELECT t.*, c.flow FROM templates t JOIN template_categories c ON c.id = t.category_id'

/** Active templates, optionally of one category, in display order. */
async function listTemplates({ category, includeInactive = false } = {}) {
  const where = []
  const params = []
  if (category) { params.push(category); where.push(`t.category_id = $${params.length}`) }
  if (!includeInactive) where.push('t.active')
  const { rows } = await query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.sort_order, t.category_id, t.sort_order, t.created_at, t.id`, params)
  return rows.map(templateOut)
}

async function getTemplate(id) {
  const { rows } = await query(`${SELECT} WHERE t.id = $1`, [id])
  return rows[0] ? templateOut(rows[0]) : null
}

async function listCategories() {
  const { rows } = await query('SELECT * FROM template_categories ORDER BY sort_order, id')
  return rows.map(categoryOut)
}

/** Validates a category body; returns the row values. */
function categoryValues(b) {
  const id = text(b?.id)
  if (!ID.test(id)) throw bad('Category "id" is required (letters, digits, "_", "-", "."; max 100 characters).')
  const name = optText(b.name, 100)
  if (!name) throw bad('Category "name" is required.')
  const flow = text(b.flow)
  if (!FLOWS.includes(flow)) throw bad(`Category "flow" must be one of: ${FLOWS.join(', ')}.`)
  return { id, name, flow, parent_id: optText(b.parent_id, 100), sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0, hide_from_all: b.hide_from_all === true }
}

/** Changes the sent fields of a category (its id cannot change). */
async function updateCategory(id, patch) {
  const { rows } = await query('SELECT * FROM template_categories WHERE id = $1', [id])
  if (!rows[0]) throw new AppError(404, 'CATEGORY_NOT_FOUND', `Unknown category "${id}".`)
  const v = categoryValues({ ...categoryOut(rows[0]), ...patch, id })
  if (v.flow !== rows[0].flow && (await query('SELECT 1 FROM templates WHERE category_id = $1 LIMIT 1', [id])).rows.length) throw new AppError(409, 'CATEGORY_NOT_EMPTY', 'The generation flow of a category with templates cannot change: move or delete its templates first.')
  const out = await query('UPDATE template_categories SET name = $2, flow = $3, parent_id = $4, sort_order = $5, hide_from_all = $6 WHERE id = $1 RETURNING *', [id, v.name, v.flow, v.parent_id, v.sort_order, v.hide_from_all])
  return categoryOut(out.rows[0])
}

/** Deletes a category. One that still has templates is refused (409) unless `cascade` - then its templates go too. Returns how many templates were deleted. */
async function deleteCategory(id, { cascade = false } = {}) {
  const count = (await query('SELECT count(*)::int AS n FROM templates WHERE category_id = $1', [id])).rows[0].n
  if (count && !cascade) throw new AppError(409, 'CATEGORY_NOT_EMPTY', `Category "${id}" has ${count} template(s). Delete them first or confirm deleting them together with the category.`)
  return tx(async (db) => {
    await db.query('DELETE FROM templates WHERE category_id = $1', [id])
    const res = await db.query('DELETE FROM template_categories WHERE id = $1', [id])
    if (!res.rowCount) throw new AppError(404, 'CATEGORY_NOT_FOUND', `Unknown category "${id}".`)
    return count
  })
}

async function saveCategory(b, { upsert = false } = {}) {
  const v = categoryValues(b)
  const sql = `INSERT INTO template_categories (id, name, flow, parent_id, sort_order, hide_from_all) VALUES ($1, $2, $3, $4, $5, $6)
    ${upsert ? 'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, flow = EXCLUDED.flow, parent_id = EXCLUDED.parent_id, sort_order = EXCLUDED.sort_order, hide_from_all = EXCLUDED.hide_from_all' : 'ON CONFLICT (id) DO NOTHING'} RETURNING *`
  const { rows } = await query(sql, [v.id, v.name, v.flow, v.parent_id, v.sort_order, v.hide_from_all])
  if (!rows[0]) throw new AppError(409, 'CATEGORY_EXISTS', `Category "${v.id}" already exists.`)
  return categoryOut(rows[0])
}

/**
 * Validates a template body against its category's flow and returns the row values. Prompts are OPTIONAL in every flow (a missing one is stored as null and
 * simply not sent to the AI). Cartoon ids must be a real Cartoon Yourself `type`; hairstyle needs the API's hair_style in `api_value`.
 */
function templateValues(b, category) {
  const id = text(b?.id)
  if (!ID.test(id)) throw bad('Template "id" is required (letters, digits, "_", "-", "."; max 100 characters).')
  const name = optText(b.name, 100)
  if (!name) throw bad(`Template "${id}": "name" is required.`)
  const previewUrl = text(b.preview_url)
  let ok = /^\/(?!\/)\S+$/.test(previewUrl) // a site-relative path (/images/...) served by the frontend
  try { ok ||= /^https?:$/.test(new URL(previewUrl).protocol) } catch { /* not a URL */ }
  if (!ok) throw bad(`Template "${id}": "preview_url" must be an http(s) image URL (or a site path starting with "/").`)
  const title = promptText(b.style_title_prompt)
  const desc = promptText(b.style_desc_prompt)
  const apiValue = optText(b.api_value, 100)
  if (category.flow === 'cartoon' && !CARTOON_TYPES.includes(apiValue || id)) throw bad(`Template "${id}": for a cartoon category the id (or "api_value") must be a supported Cartoon Yourself style.`)
  if (category.flow === 'hairstyle' && !apiValue) throw bad(`Template "${id}": "api_value" (the Hairstyle Changer hair_style) is required for the hairstyle flow.`)
  const extra = b.extra && typeof b.extra === 'object' && !Array.isArray(b.extra) ? b.extra : {}
  return {
    id, category_id: category.id, name, preview_url: previewUrl, style_title_prompt: title, style_desc_prompt: desc, api_value: apiValue,
    aspect_ratio: optText(b.aspect_ratio, 10) || '9:16', cost_coins: Number.isInteger(b.cost_coins) && b.cost_coins >= 0 ? b.cost_coins : null,
    gender: optText(b.gender, 20), extra: JSON.stringify(extra), sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0, active: b.active !== false,
    trending: b.trending === true, trending_position: Number.isInteger(b.trending_position) ? b.trending_position : 0,
  }
}

const COLS = ['id', 'category_id', 'name', 'preview_url', 'style_title_prompt', 'style_desc_prompt', 'api_value', 'aspect_ratio', 'cost_coins', 'gender', 'extra', 'sort_order', 'active', 'trending', 'trending_position']

async function categoryById(db, id) {
  if (id === UNCATEGORISED.id) await db.query('INSERT INTO template_categories (id, name, flow, sort_order, hide_from_all) VALUES ($1, $2, $3, 9999, true) ON CONFLICT (id) DO NOTHING', [UNCATEGORISED.id, UNCATEGORISED.name, UNCATEGORISED.flow])
  const { rows } = await db.query('SELECT * FROM template_categories WHERE id = $1', [id])
  if (!rows[0]) throw new AppError(404, 'CATEGORY_NOT_FOUND', `Unknown category "${id}". Create it first with POST /api/admin/template-categories.`)
  return rows[0]
}

/** Creates templates (one object or an array) all-or-nothing. `upsert` replaces a template with the same id instead of answering 409. Each body names its "category_id". */
async function createTemplates(bodies, { upsert = false } = {}) {
  const list = Array.isArray(bodies) ? bodies : [bodies]
  if (!list.length) throw bad('Send a template object or a non-empty array of templates.')
  if (list.length > 500) throw bad('At most 500 templates per request.')
  const ids = await tx(async (db) => {
    const out = []
    for (const b of list) {
      const category = await categoryById(db, text(b?.category_id) || UNCATEGORISED.id) // no category given = the Trending-only (uncategorised) group
      const v = templateValues(b, category)
      if (category.id === UNCATEGORISED.id) v.trending = true // an uncategorised template exists for Trending
      if (v.trending && !Number.isInteger(b.trending_position)) v.trending_position = await trending.frontPosition(db) // a newly trending template is shown first
      const keep = 'trending' in b ? [] : ['trending', 'trending_position'] // re-sending a template (upsert) without a trending flag does not un-trend it
      const set = COLS.filter((c) => c !== 'id' && !keep.includes(c)).map((c) => `${c} = EXCLUDED.${c}`).join(', ')
      const { rows } = await db.query(
        `INSERT INTO templates (${COLS.join(', ')}) VALUES (${COLS.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT (id) DO ${upsert ? `UPDATE SET ${set}` : 'NOTHING'} RETURNING id`,
        COLS.map((c) => v[c]),
      )
      if (!rows[0]) throw new AppError(409, 'TEMPLATE_EXISTS', `Template "${v.id}" already exists. Use PUT /api/admin/templates/${v.id} to change it.`)
      out.push(v.id)
    }
    return out
  })
  return Promise.all(ids.map(getTemplate)) // read after the commit: another connection cannot see the rows before it
}

/** Changes the sent fields of a template; the result is validated as a whole. */
async function updateTemplate(id, patch) {
  const current = await getTemplate(id)
  if (!current) throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Unknown template "${id}".`)
  const merged = { ...current, ...patch, id }
  const category = await categoryById({ query }, text(merged.category_id))
  const v = templateValues(merged, category)
  if (v.trending && !current.trending && !Number.isInteger(patch.trending_position)) v.trending_position = await trending.frontPosition() // newly trending: shown first
  const set = COLS.filter((c) => c !== 'id')
  await query(`UPDATE templates SET ${set.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [id, ...set.map((c) => v[c])])
  return getTemplate(id)
}

async function deleteTemplate(id) {
  const { rowCount } = await query('DELETE FROM templates WHERE id = $1', [id])
  if (!rowCount) throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Unknown template "${id}".`)
}

module.exports = { UNCATEGORISED, FLOWS, listTemplates, getTemplate, listCategories, saveCategory, updateCategory, deleteCategory, createTemplates, updateTemplate, deleteTemplate }
