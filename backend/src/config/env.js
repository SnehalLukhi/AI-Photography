const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })

const int = (v, d) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : d
}
const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d)

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5000),
  corsOrigins: list(process.env.CORS_ORIGIN, ['http://localhost:5173', 'http://localhost:5174']),

  ailab: {
    apiKey: (process.env.AILAB_API_KEY || '').trim(),
    baseUrl: (process.env.AILAB_BASE_URL || 'https://www.ailabapi.com').replace(/\/+$/, ''),
    provider: 'ai-photography', // AILabTools "AI Photography" API (POST /api/image/effects/ai-photography)
    requestTimeoutMs: int(process.env.AILAB_REQUEST_TIMEOUT_MS, 90_000),
    pollIntervalMs: int(process.env.AILAB_POLL_INTERVAL_MS, 5_000), // docs: "query every 5 seconds"
    pollTimeoutMs: int(process.env.AILAB_POLL_TIMEOUT_MS, 120_000),
  },

  upload: {
    maxFileSizeBytes: int(process.env.MAX_UPLOAD_MB, 10) * 1024 * 1024, // AI Photography limit: 10 MB
  },
  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: int(process.env.RATE_LIMIT_MAX, 10),
  },
}
