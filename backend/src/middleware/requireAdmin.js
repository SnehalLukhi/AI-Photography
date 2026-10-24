const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const adminAuth = require('../services/adminAuth.service')

/**
 * For the admin endpoints. The request must carry EITHER the token from POST /api/admin/login (`Authorization: Bearer <token>`, what the dashboard uses)
 * OR the static secret ADMIN_API_KEY (`x-admin-key`, for scripts / curl and for creating the first admin). `req.admin` = { id, username } of the signed-in admin ('key' for the static key).
 * With no way to sign in configured at all (no ADMIN_API_KEY, no ADMIN_USERNAME / ADMIN_PASSWORD) the endpoints answer 503.
 */
module.exports = async function requireAdmin(req, res, next) {
  const bearer = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '')?.[1]
  if (bearer) {
    const admin = await adminAuth.verify(bearer)
    if (admin) { req.admin = admin; return next() }
  }
  const key = req.get('x-admin-key')
  if (key && env.adminApiKey) {
    const hash = (v) => crypto.createHash('sha256').update(v).digest()
    if (crypto.timingSafeEqual(hash(String(key)), hash(env.adminApiKey))) { req.admin = { id: 'key', username: 'api key' }; return next() }
  }
  if (!env.adminApiKey && !adminAuth.envAdminConfigured() && !bearer) return next(new AppError(503, 'ADMIN_NOT_CONFIGURED', 'Set ADMIN_API_KEY in the server environment, then create an admin with POST /api/admin/admins.'))
  next(new AppError(401, 'ADMIN_UNAUTHORIZED', bearer ? 'Your session has expired. Please sign in again.' : 'Admin sign-in required.'))
}
