const AppError = require('../utils/AppError')
const { query } = require('../db')

const idOf = (v) => {
  const id = typeof v === 'string' ? v.trim() : ''
  if (!id || id.length > 200) throw new AppError(400, 'INVALID_TEMPLATE', 'A valid templateId is required.')
  return id
}

/** GET /api/favorites - ids of the templates the logged-in user has liked. */
async function list(req, res) {
  const { rows } = await query('SELECT template_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id])
  res.set('Cache-Control', 'no-store').json({ success: true, favorites: rows.map((r) => r.template_id) })
}

/** POST /api/favorites { templateId } - likes a template (safe to repeat: the (user, template) pair is unique). */
async function add(req, res) {
  const templateId = idOf(req.body?.templateId)
  await query('INSERT INTO favorites (user_id, template_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.id, templateId])
  res.status(201).set('Cache-Control', 'no-store').json({ success: true, templateId })
}

/** DELETE /api/favorites?templateId=... - unlikes a template (safe to repeat). */
async function remove(req, res) {
  const templateId = idOf(req.query.templateId)
  await query('DELETE FROM favorites WHERE user_id = $1 AND template_id = $2', [req.user.id, templateId])
  res.set('Cache-Control', 'no-store').json({ success: true, templateId })
}

module.exports = { list, add, remove }
