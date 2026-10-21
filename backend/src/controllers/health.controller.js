const env = require('../config/env')
const pkg = require('../../package.json')

/** GET /api/health - never exposes the key itself, only whether one is configured. */
function health(_req, res) {
  res.json({
    status: 'ok',
    service: pkg.name,
    version: pkg.version,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    ailab: { provider: env.ailab.provider, apiKeyConfigured: Boolean(env.ailab.apiKey) },
    storage: { provider: 'digitalocean-spaces', configured: Boolean(env.spaces.key && env.spaces.secret && env.spaces.bucket) },
  })
}
module.exports = { health }
