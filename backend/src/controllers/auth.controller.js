const auth = require('../services/auth.service')

/** POST /api/auth/register - JSON { email, password (8+), name? } -> { token, user } */
async function register(req, res) {
  res.status(201).set('Cache-Control', 'no-store').json({ success: true, ...(await auth.register(req.body || {})) })
}

/** POST /api/auth/login - JSON { email, password } -> { token, user } */
async function login(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await auth.login(req.body || {})) })
}

/** POST /api/auth/google - JSON { accessToken } (Google access token from the browser) -> { token, user } */
async function google(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await auth.loginWithGoogle(req.body?.accessToken)) })
}

/** POST /api/auth/forgot-password - JSON { email }: sends a reset link when the account exists. Always the same answer. */
async function forgotPassword(req, res) {
  await auth.requestPasswordReset(req.body?.email)
  res.json({ success: true, message: 'If an account exists for this email, a reset link has been sent.' })
}

/** POST /api/auth/reset-password - JSON { token, password }: sets a new password with the token from the e-mail. */
async function resetPassword(req, res) {
  await auth.resetPassword(req.body?.token, req.body?.password)
  res.json({ success: true })
}

/** GET /api/auth/me - the logged-in user (also how the frontend checks that a saved token is still valid). */
function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, user: req.user })
}

module.exports = { register, login, google, forgotPassword, resetPassword, me }
