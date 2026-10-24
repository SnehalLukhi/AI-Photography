const AppError = require('../utils/AppError')
const { query, tx } = require('../db')

/**
 * The templates marked as Trending, in the order they are shown. A template is identified by the id the app uses for its card: `<category>/<template id>`
 * (e.g. "old-money/vintage-sari"). Two kinds exist:
 *   - templates of the database catalogue (templates.service): the flag lives on the template itself (templates.trending + trending_position), so it is also
 *     set / read through /api/admin/templates and disappears with the template when it is deleted;
 *   - templates that only exist as bundled folders in the frontend: their ids are kept in the table trending_templates.
 * Both share one order (position), and a template stays in its own category either way.
 */
const ID_RE = /^[a-z0-9][a-z0-9-]*\/[^\s/][^\s]{0,119}$/i
const MAX = 200

const cleanId = (id) => {
  if (typeof id !== 'string' || !ID_RE.test(id.trim())) throw new AppError(400, 'INVALID_TEMPLATE_ID', 'templateId must look like "category/template-id".')
  return id.trim()
}
const split = (id) => { const i = id.indexOf('/'); return [id.slice(0, i), id.slice(i + 1)] }

/** Template ids, first = shown first. */
async function list(db = { query }) {
  const rows = (await db.query(
    `SELECT category_id || '/' || id AS tid, trending_position AS position, created_at FROM templates WHERE trending AND active
     UNION ALL SELECT template_id, position, created_at FROM trending_templates ORDER BY position, created_at`)).rows
  return [...new Set(rows.map((r) => r.tid))]
}

const inCatalogue = async (db, id) => { const [c, t] = split(id); return (await db.query('SELECT 1 FROM templates WHERE category_id = $1 AND id = $2', [c, t])).rows.length > 0 }

/** Saves one id at a position: on the template when it is in the catalogue, else in trending_templates. */
async function put(db, id, position) {
  if (await inCatalogue(db, id)) {
    const [c, t] = split(id)
    await db.query('UPDATE templates SET trending = true, trending_position = $3 WHERE category_id = $1 AND id = $2', [c, t, position])
  } else {
    await db.query('INSERT INTO trending_templates (template_id, position) VALUES ($1, $2) ON CONFLICT (template_id) DO UPDATE SET position = EXCLUDED.position', [id, position])
  }
}

/** Adds one template to the end of the list (nothing changes when it is already in). */
async function add(templateId) {
  const id = cleanId(templateId)
  return tx(async (db) => {
    const current = await list(db)
    if (current.includes(id)) return current
    if (current.length >= MAX) throw new AppError(400, 'TOO_MANY', `At most ${MAX} templates can be trending.`)
    await put(db, id, current.length)
    return list(db)
  })
}

async function remove(templateId) {
  const id = cleanId(templateId)
  const [c, t] = split(id)
  await query('UPDATE templates SET trending = false WHERE category_id = $1 AND id = $2', [c, t])
  await query('DELETE FROM trending_templates WHERE template_id = $1', [id])
  return list()
}

/** Replaces the whole list (this is also how the order is changed): the array order is the display order. */
async function replace(templateIds) {
  if (!Array.isArray(templateIds) || templateIds.length > MAX) throw new AppError(400, 'INVALID_LIST', `templateIds must be an array of at most ${MAX} ids.`)
  const ids = [...new Set(templateIds.map(cleanId))]
  return tx(async (db) => {
    await db.query('UPDATE templates SET trending = false')
    await db.query('DELETE FROM trending_templates')
    for (let i = 0; i < ids.length; i++) await put(db, ids[i], i)
    return list(db)
  })
}

module.exports = { list, add, remove, replace }
