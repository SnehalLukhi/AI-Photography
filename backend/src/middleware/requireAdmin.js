const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')

/** For the admin endpoints: the request must carry the secret ADMIN_API_KEY (header `x-admin-key`). Without the key set in .env the endpoints are switched off. */
module.exports = function requireAdmin(req, res, next) {
  const key = env.adminApiKey
  if (!key) return next(new AppError(503, 'ADMIN_NOT_CONFIGURED', 'Set ADMIN_API_KEY in the server environment to use the admin endpoints.'))
  const given = String(req.get('x-admin-key') || '')
  const hash = (v) => crypto.createHash('sha256').update(v).digest()
  if (!crypto.timingSafeEqual(hash(given), hash(key))) return next(new AppError(401, 'ADMIN_UNAUTHORIZED', 'Invalid admin key.'))
  next()
}
