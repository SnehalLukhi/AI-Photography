const AppError = require('../utils/AppError')
const auth = require('../services/auth.service')
const quota = require('../services/quota.service')

/** Requires `Authorization: Bearer <token>` from POST /api/auth/login or /register. Sets req.user = { id, email, name }. */
async function requireAuth(req, _res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '')
  const id = m && auth.verifyToken(m[1])
  const user = id && await auth.getUser(id)
  if (!user) return next(new AppError(401, 'UNAUTHORIZED', 'Please log in to continue.'))
  req.user = user
  next()
}

/** Like requireAuth, but a visitor without a (valid) token just continues with req.user undefined - for public pages that look different for a logged-in user (offers). */
async function optionalAuth(req, _res, next) {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '')
  const id = m && auth.verifyToken(m[1])
  req.user = (id && await auth.getUser(id)) || undefined
  next()
}

/** For the generate endpoints: counts the request against the user's daily limit and gives it back when the request fails (AILabTools does not bill failed requests). */
async function dailyQuota(req, res, next) {
  const day = await quota.consume(req.user.id)
  res.on('finish', () => { if (res.statusCode >= 400) quota.refund(req.user.id, day).catch((e) => console.error('[quota] refund failed:', e.message)) })
  next()
}

module.exports = { requireAuth, optionalAuth, dailyQuota }
