const AppError = require('../utils/AppError')
const { query, tx } = require('../db')
const CARTOON_TYPES = require('../config/cartoonTypes')

const FLOWS = ['photography', 'cartoon', 'beard', 'hairstyle']
const ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/

const text = (v) => (typeof v === 'string' ? v.trim() : '')
const optText = (v, max) => { const s = text(v); return s ? s.slice(0, max) : null }
const bad = (message) => new AppError(400, 'INVALID_TEMPLATE', message)

const templateOut = (r) => ({
  id: r.id, category_id: r.category_id, flow: r.flow, name: r.name, preview_url: r.preview_url,
  style_title_prompt: r.style_title_prompt, style_desc_prompt: r.style_desc_prompt, api_value: r.api_value,
  aspect_ratio: r.aspect_ratio, cost_coins: r.cost_coins, gender: r.gender, extra: r.extra || {}, sort_order: r.sort_order, active: r.active,
  trending: r.trending, trending_position: r.trending_position,
})
const categoryOut = (r) => ({ id: r.id, name: r.name, flow: r.flow, parent_id: r.parent_id, sort_order: r.sort_order, hide_from_all: r.hide_from_all })

// a template without a category (category_id null) carries its own flow; the others use their category's
const SELECT = 'SELECT t.*, COALESCE(c.flow, t.flow) AS flow FROM templates t LEFT JOIN template_categories c ON c.id = t.category_id'
/** The id the app and the Trending API use for a template card: "<category>/<id>"; without a category: "uncategorized/<id>". */
const UNCATEGORIZED = 'uncategorized'
const cardId = (t) => `${t.category_id || UNCATEGORIZED}/${t.id}`

/** Active templates, optionally of one category, in display order. */
async function listTemplates({ category, includeInactive = false } = {}) {
  const where = []
  const params = []
  if (category === UNCATEGORIZED) where.push('t.category_id IS NULL')
  else if (category) { params.push(category); where.push(`t.category_id = $${params.length}`) }
  if (!includeInactive) where.push('t.active')
  const { rows } = await query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.sort_order NULLS LAST, t.category_id NULLS LAST, t.sort_order, t.created_at, t.id`, params)
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
 * `category` is { id, flow }; with id null the template has no category: it is always in Trending (that is the only place it shows) and stores its own flow.
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
  const title = optText(b.style_title_prompt, 500)
  const desc = optText(b.style_desc_prompt, 1000)
  const apiValue = optText(b.api_value, 100)
  if (category.flow === 'cartoon' && !CARTOON_TYPES.includes(apiValue || id)) throw bad(`Template "${id}": for a cartoon category the id (or "api_value") must be a supported Cartoon Yourself style.`)
  if (category.flow === 'hairstyle' && !apiValue) throw bad(`Template "${id}": "api_value" (the Hairstyle Changer hair_style) is required for the hairstyle flow.`)
  const extra = b.extra && typeof b.extra === 'object' && !Array.isArray(b.extra) ? b.extra : {}
  return {
    id, category_id: category.id, flow: category.id ? null : category.flow, name, preview_url: previewUrl, style_title_prompt: title, style_desc_prompt: desc, api_value: apiValue,
    aspect_ratio: optText(b.aspect_ratio, 10) || '9:16', cost_coins: Number.isInteger(b.cost_coins) && b.cost_coins >= 0 ? b.cost_coins : null,
    gender: optText(b.gender, 20), extra: JSON.stringify(extra), sort_order: Number.isInteger(b.sort_order) ? b.sort_order : 0, active: b.active !== false,
    trending: category.id ? b.trending === true : true, trending_position: Number.isInteger(b.trending_position) ? b.trending_position : 0,
  }
}

const COLS = ['id', 'category_id', 'flow', 'name', 'preview_url', 'style_title_prompt', 'style_desc_prompt', 'api_value', 'aspect_ratio', 'cost_coins', 'gender', 'extra', 'sort_order', 'active', 'trending', 'trending_position']

/** The category of a template body: a real one (404 when unknown), or { id: null, flow } when the body names none - then "flow" says how it is generated (photography by default). */
async function categoryOf(db, b) {
  const id = text(b?.category_id)
  if (id && id !== UNCATEGORIZED) return categoryById(db, id)
  const flow = text(b?.flow) || 'photography'
  if (!FLOWS.includes(flow)) throw bad(`"flow" must be one of: ${FLOWS.join(', ')}.`)
  if (b?.trending === false) throw bad('A template without a category only shows in Trending, so it cannot be taken out of it. Give it a category first, or hide / delete it.')
  return { id: null, flow }
}

async function categoryById(db, id) {
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
      const category = await categoryOf(db, b)
      const v = templateValues(b, category)
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
  const category = await categoryOf({ query }, merged)
  const v = templateValues(merged, category)
  const set = COLS.filter((c) => c !== 'id')
  await query(`UPDATE templates SET ${set.map((c, i) => `${c} = $${i + 2}`).join(', ')} WHERE id = $1`, [id, ...set.map((c) => v[c])])
  return getTemplate(id)
}

async function deleteTemplate(id) {
  const { rowCount } = await query('DELETE FROM templates WHERE id = $1', [id])
  if (!rowCount) throw new AppError(404, 'TEMPLATE_NOT_FOUND', `Unknown template "${id}".`)
}

module.exports = { FLOWS, UNCATEGORIZED, cardId, listTemplates, getTemplate, listCategories, saveCategory, updateCategory, deleteCategory, createTemplates, updateTemplate, deleteTemplate }
