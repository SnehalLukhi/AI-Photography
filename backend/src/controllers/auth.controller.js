const auth = require('../services/auth.service')

/** POST /api/auth/google - JSON { accessToken } (Google access token from the browser) -> { token, user } */
async function google(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await auth.loginWithGoogle(req.body?.accessToken)) })
}

/** POST /api/auth/apple - JSON { identityToken, nonce, name? } (from Apple's sign-in window in the browser) -> { token, user } */
async function apple(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await auth.loginWithApple(req.body || {})) })
}

/** GET /api/auth/me - the logged-in user (also how the frontend checks that a saved token is still valid). */
function me(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, user: req.user })
}

module.exports = { google, apple, me }
