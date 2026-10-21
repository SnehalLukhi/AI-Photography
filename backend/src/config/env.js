const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })

const int = (v, d) => {
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : d
}
const list = (v, d) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : d)

// Regional endpoint WITHOUT the bucket: the S3 SDK adds the bucket name itself. A copied "https://<bucket>.<region>.digitaloceanspaces.com" is cleaned up (otherwise the host becomes <bucket>.<bucket>.<region>... and TLS fails).
function spacesEndpoint() {
  const region = (process.env.SPACES_REGION || 'nyc3').trim()
  const bucket = (process.env.SPACES_BUCKET || '').trim()
  const url = new URL((process.env.SPACES_ENDPOINT || '').trim() || `https://${region}.digitaloceanspaces.com`)
  if (bucket && url.hostname.startsWith(`${bucket}.`)) url.hostname = url.hostname.slice(bucket.length + 1)
  return url.origin
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 5001),
  corsOrigins: list(process.env.CORS_ORIGIN, ['http://localhost:5173', 'http://localhost:5174']),

  ailab: {
    apiKey: (process.env.AILAB_API_KEY || '').trim(),
    baseUrl: (process.env.AILAB_BASE_URL || 'https://www.ailabapi.com').replace(/\/+$/, ''),
    provider: 'ai-photography', // AILabTools "AI Photography" API (POST /api/image/effects/ai-photography)
    requestTimeoutMs: int(process.env.AILAB_REQUEST_TIMEOUT_MS, 90_000),
    pollIntervalMs: int(process.env.AILAB_POLL_INTERVAL_MS, 5_000), // docs: "query every 5 seconds"
    pollTimeoutMs: int(process.env.AILAB_POLL_TIMEOUT_MS, 120_000),
  },

  beardTemplateDir: process.env.BEARD_TEMPLATE_DIR || path.join(__dirname, '..', '..', '..', 'public', 'images', 'explore', 'beard'), // preview images sent as `image_template`

  // DigitalOcean Spaces (S3-compatible object storage) for the user's original photo and the AI result. Storage is skipped when not configured.
  spaces: {
    key: (process.env.SPACES_KEY || '').trim(),
    secret: (process.env.SPACES_SECRET || '').trim(),
    region: (process.env.SPACES_REGION || 'nyc3').trim(),
    // regional endpoint WITHOUT the bucket (the SDK adds the bucket name itself); a copied "https://<bucket>.<region>.digitaloceanspaces.com" is accepted and cleaned up
    endpoint: spacesEndpoint(),
    bucket: (process.env.SPACES_BUCKET || '').trim(),
    prefix: (process.env.SPACES_PREFIX || '').trim().replace(/^\/+|\/+$/g, ''),
    signedUrlTtlSeconds: int(process.env.SPACES_SIGNED_URL_TTL_SECONDS, 3600),
  },

  // Accounts: email + password, SQLite file, JWT bearer tokens.
  databasePath: process.env.DATABASE_PATH === ':memory:' ? ':memory:' : path.resolve(process.env.DATABASE_PATH || path.join(__dirname, '..', '..', 'data', 'app.db')),
  auth: {
    jwtSecret: (process.env.JWT_SECRET || '').trim(),
    googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim(), // OAuth client id for "Continue with Google" (same value as the frontend's VITE_GOOGLE_CLIENT_ID)
    tokenTtlSeconds: int(process.env.TOKEN_TTL_SECONDS, 7 * 24 * 3600),
    dailyLimit: int(process.env.DAILY_GENERATION_LIMIT, 100), // generations per user per day (abuse cap; the coin balance is the normal limit)
    rateLimitMax: int(process.env.AUTH_RATE_LIMIT_MAX, 20), // login / register attempts per IP per 15 minutes
  },

  coins: {
    perGeneration: int(process.env.COIN_COST_PER_GENERATION, 15), // coins one generation costs
    signupBonus: int(process.env.SIGNUP_BONUS_COINS, 50), // free coins for a new account
  },

  upload: {
    maxFileSizeBytes: int(process.env.MAX_UPLOAD_MB, 10) * 1024 * 1024, // AI Photography limit: 10 MB
  },
  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: int(process.env.RATE_LIMIT_MAX, 10),
  },
}
