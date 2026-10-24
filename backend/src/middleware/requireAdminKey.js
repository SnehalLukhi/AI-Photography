const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')

const digest = (v) => crypto.createHash('sha256').update(String(v)).digest()

/** Guards /api/admin/*: the x-admin-key header must equal ADMIN_API_KEY. Answers 503 while no key is configured, so the routes are never open by accident. */
module.exports = function requireAdminKey(req, _res, next) {
  if (!env.adminApiKey) return next(new AppError(503, 'ADMIN_KEY_MISSING', 'ADMIN_API_KEY is not configured on the server.'))
  const sent = req.get('x-admin-key') || ''
  if (!crypto.timingSafeEqual(digest(sent), digest(env.adminApiKey))) return next(new AppError(401, 'INVALID_ADMIN_KEY', 'A valid x-admin-key header is required.'))
  next()
}
