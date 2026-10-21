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

/** GET /api/auth/me - the logged-in user (also how the frontend checks that a saved token is still valid). */
function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, user: req.user })
}

module.exports = { register, login, google, me }
