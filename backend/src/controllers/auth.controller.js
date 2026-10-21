const auth = require('../services/auth.service')

/** POST /api/auth/google - JSON { accessToken } (Google access token from the browser) -> { token, user } */
async function google(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await auth.loginWithGoogle(req.body?.accessToken)) })
}

/** GET /api/auth/me - the logged-in user (also how the frontend checks that a saved token is still valid). */
function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, user: req.user })
}

module.exports = { google, me }
