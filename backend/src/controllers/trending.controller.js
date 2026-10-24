const trending = require('../services/trending.service')

/** GET /api/trending (public) - the ids of the trending templates, in display order. */
async function list(req, res) {
  res.set('Cache-Control', 'public, max-age=30').json({ success: true, templateIds: await trending.list() })
}

/** POST /api/admin/trending { templateId } - mark one template as trending (it stays in its own category too). */
async function add(req, res) {
  res.json({ success: true, templateIds: await trending.add(req.body?.templateId) })
}

/** DELETE /api/admin/trending?templateId=... - remove one template from Trending. */
async function remove(req, res) {
  res.json({ success: true, templateIds: await trending.remove(req.query.templateId ?? req.body?.templateId) })
}

/** PUT /api/admin/trending { templateIds: [...] } - replace the whole list; the array order is the display order. */
async function replace(req, res) {
  res.json({ success: true, templateIds: await trending.replace(req.body?.templateIds) })
}

module.exports = { list, add, remove, replace }
