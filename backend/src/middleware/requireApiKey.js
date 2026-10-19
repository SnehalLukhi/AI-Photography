const env = require('../config/env')
const AppError = require('../utils/AppError')

/** Fail fast (before parsing uploads) when AILAB_API_KEY has not been configured. */
module.exports = function requireApiKey(_req, _res, next) {
  if (!env.ailab.apiKey || /^your[_-]/i.test(env.ailab.apiKey)) {
    return next(new AppError(503, 'AILAB_API_KEY_MISSING', 'The AILabTools API key is not configured. Add AILAB_API_KEY to backend/.env (get one at https://www.ailabtools.com/docs/get-api-key) and restart the server.'))
  }
  next()
}
