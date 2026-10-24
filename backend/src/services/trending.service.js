const AppError = require('../utils/AppError')
const { query, tx } = require('../db')

/**
 * The templates marked as Trending, in the order they are shown. A template is identified by its id in the app (`<category>/<name>`, e.g. "old-money/vintage-sari");
 * the templates themselves live in the frontend, so only the ids are stored here. Marking a template as trending does not remove it from its own category.
 */
const ID_RE = /^[a-z0-9][a-z0-9-]*\/[^\s/][^\s]{0,119}$/i
const MAX = 200

const cleanId = (id) => {
  if (typeof id !== 'string' || !ID_RE.test(id.trim())) throw new AppError(400, 'INVALID_TEMPLATE_ID', 'templateId must look like "category/template-name".')
  return id.trim()
}

/** Template ids, first = shown first. */
const list = async () => (await query('SELECT template_id FROM trending_templates ORDER BY position, created_at')).rows.map((r) => r.template_id)

/** Adds one template to the end of the list (nothing changes when it is already in). */
async function add(templateId) {
  const id = cleanId(templateId)
  if ((await list()).length >= MAX) throw new AppError(400, 'TOO_MANY', `At most ${MAX} templates can be trending.`)
  await query('INSERT INTO trending_templates (template_id, position) VALUES ($1, COALESCE((SELECT MAX(position) + 1 FROM trending_templates), 0)) ON CONFLICT DO NOTHING', [id])
  return list()
}

async function remove(templateId) {
  await query('DELETE FROM trending_templates WHERE template_id = $1', [cleanId(templateId)])
  return list()
}

/** Replaces the whole list (this is also how the order is changed). */
async function replace(templateIds) {
  if (!Array.isArray(templateIds) || templateIds.length > MAX) throw new AppError(400, 'INVALID_LIST', `templateIds must be an array of at most ${MAX} ids.`)
  const ids = [...new Set(templateIds.map(cleanId))]
  await tx(async (d) => {
    await d.query('DELETE FROM trending_templates')
    for (let i = 0; i < ids.length; i++) await d.query('INSERT INTO trending_templates (template_id, position) VALUES ($1, $2)', [ids[i], i])
  })
  return list()
}

module.exports = { list, add, remove, replace }
