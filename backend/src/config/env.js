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
  corsLanDev: (process.env.NODE_ENV || 'development') !== 'production' && process.env.CORS_ALLOW_LAN !== 'false', // development: also accept the frontend opened through this PC's LAN address (http://192.168.x.x:5173)
  corsOrigins: list(process.env.CORS_ORIGIN, ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5180']).map((o) => o.replace(/\/+$/, '')), // a browser's Origin header never ends with "/", so a trailing slash in the setting would never match

  ailab: {
    apiKey: (process.env.AILAB_API_KEY || '').trim(),
    baseUrl: (process.env.AILAB_BASE_URL || 'https://www.ailabapi.com').replace(/\/+$/, ''),
    provider: 'ai-photography', // AILabTools "AI Photography" API (POST /api/image/effects/ai-photography)
    requestTimeoutMs: int(process.env.AILAB_REQUEST_TIMEOUT_MS, 90_000),
    pollIntervalMs: int(process.env.AILAB_POLL_INTERVAL_MS, 5_000), // docs: "query every 5 seconds"
    pollTimeoutMs: int(process.env.AILAB_POLL_TIMEOUT_MS, 120_000),
  },

  webUrl: (process.env.WEB_URL || '').trim(), // Vercel Services binding to the frontend service: beard reference images are fetched from it (the api function has no /public folder)
  publicDir: process.env.PUBLIC_DIR || path.join(__dirname, '..', '..', '..', 'public'), // the frontend's public folder: reference images of database templates with a site path (/images/...) are read from it
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
    // base address of the public image URLs: the Space's CDN address if you enabled the CDN (SPACES_PUBLIC_URL), else the Space's own address
    publicUrl: (process.env.SPACES_PUBLIC_URL || `https://${(process.env.SPACES_BUCKET || '').trim()}.${(process.env.SPACES_REGION || 'nyc3').trim()}.digitaloceanspaces.com`).trim().replace(/\/+$/, ''),
  },

  // Accounts: Google sign-in, PostgreSQL (Supabase) database, JWT bearer tokens.
  databaseUrl: (process.env.DATABASE_URL || '').trim(), // Supabase: Project Settings > Database > Connection string (pooler). 'pglite://memory' = throw-away in-memory database (tests)
  auth: {
    jwtSecret: (process.env.JWT_SECRET || '').trim(),
    appleClientId: (process.env.APPLE_CLIENT_ID || '').trim(), // "Sign in with Apple": the Services ID (same value as the frontend's VITE_APPLE_CLIENT_ID)
    googleClientId: (process.env.GOOGLE_CLIENT_ID || '').trim(), // OAuth client id for "Continue with Google" (same value as the frontend's VITE_GOOGLE_CLIENT_ID)
    tokenTtlSeconds: int(process.env.TOKEN_TTL_SECONDS, 7 * 24 * 3600),
    dailyLimit: int(process.env.DAILY_GENERATION_LIMIT, 100), // generations per user per day (abuse cap; the coin balance is the normal limit)
    rateLimitMax: int(process.env.AUTH_RATE_LIMIT_MAX, 20), // sign-in attempts per IP per 15 minutes
  },

  // Visitors are charged in their own currency (rupees in India, euros in the euro countries ...), everyone else in dollars. The country comes from the hosting platform (Vercel: x-vercel-ip-country). DEFAULT_CURRENCY is used when no country is known (local development): e.g. USD or INR.
  defaultCurrency: (process.env.DEFAULT_CURRENCY || 'USD').trim().toUpperCase(),
  // Visitors are charged in their own currency (rupees in India, euros in the euro countries ...), everyone else in dollars. The country comes from the hosting platform (Vercel: x-vercel-ip-country). DEFAULT_CURRENCY is used when no country is known (local development): e.g. USD or INR.
  defaultCurrency: (process.env.DEFAULT_CURRENCY || 'USD').trim().toUpperCase(),
  // What the image provider costs you per finished call, in US dollars, only to show an ESTIMATED spend in the admin dashboard (the provider reports no price per call).
  // AILAB_COST_PER_CALL=0.03 for all APIs; AILAB_API_COSTS='{"cartoon-yourself":0.02}' to override some.
  apiCostPerCall: Number(process.env.AILAB_COST_PER_CALL) || 0,
  apiCosts: (() => { try { return JSON.parse(process.env.AILAB_API_COSTS || '{}') } catch { return {} } })(),
  adminUsername: (process.env.ADMIN_USERNAME || '').trim(), // the admin dashboard signs in with these two (POST /api/admin/login)
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminTokenHours: Number(process.env.ADMIN_TOKEN_HOURS) > 0 ? Number(process.env.ADMIN_TOKEN_HOURS) : 12, // how long one sign-in lasts
  // Picsart API Platform (AI video / image models), used by the admin Video lab. https://picsart.com/api-platform/docs
  picsart: { apiKey: (process.env.PICSART_API_KEY || '').trim(), apiUrl: (process.env.PICSART_API_URL || 'https://api.picsart.com').trim(), timeoutMs: int(process.env.PICSART_TIMEOUT_MS, 30_000) },
  // Viggle API (motion transfer: a picture + a reference video), used by the admin Video lab. Sent as  Authorization: Bearer <key>
  viggle: { apiKey: (process.env.VIGGLE_API_KEY || '').trim(), apiUrl: (process.env.VIGGLE_API_URL || 'https://apis.viggle.ai/v1').trim(), timeoutMs: int(process.env.VIGGLE_TIMEOUT_MS, 60_000) },
  adminApiKey: (process.env.ADMIN_API_KEY || '').trim(), // secret for the /api/admin/* endpoints (header x-admin-key); empty = those endpoints are off
  brandName: (process.env.BRAND_NAME || 'Pictrify').trim(), // the name of the site: shown at the top of Razorpay's payment window

  // Razorpay (payments for coin packs / plans). Without the keys checkout answers 503.
  razorpay: {
    keyId: (process.env.RAZORPAY_KEY_ID || '').trim(), // public: also used by the browser's checkout window
    keySecret: (process.env.RAZORPAY_KEY_SECRET || '').trim(), // secret: server only
    webhookSecret: (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim(), // the secret you type in Razorpay Dashboard > Webhooks
    // Razorpay Subscription Plans (Dashboard > Subscriptions > Plans, ids like plan_xxx). A plan with an id here is sold as an auto-renewing subscription; without one it is a one-time purchase.
    planIds: { weekly: (process.env.RAZORPAY_PLAN_WEEKLY || '').trim(), monthly: (process.env.RAZORPAY_PLAN_MONTHLY || '').trim(), yearly: (process.env.RAZORPAY_PLAN_YEARLY || '').trim(), test: (process.env.RAZORPAY_PLAN_TEST || '').trim() },
    // OPTIONAL: the same plans in rupees. Normally not needed - the rupee plan is found (or created once) in Razorpay automatically from the INR prices of config/plans.js.
    planIdsInr: { weekly: (process.env.RAZORPAY_PLAN_WEEKLY_INR || '').trim(), monthly: (process.env.RAZORPAY_PLAN_MONTHLY_INR || '').trim(), yearly: (process.env.RAZORPAY_PLAN_YEARLY_INR || '').trim() },
  },

  coins: {
    perGeneration: int(process.env.COIN_COST_PER_GENERATION, 150), // coins one generation costs
    perVideo: int(process.env.VIDEO_COST_COINS, 1500), // coins one video costs (a template can set its own price)
    signupBonus: int(process.env.SIGNUP_BONUS_COINS, 100), // free coins for a new account
  },

  upload: {
    maxFileSizeBytes: int(process.env.MAX_UPLOAD_MB, 10) * 1024 * 1024, // AI Photography limit: 10 MB
  },
  rateLimit: {
    windowMs: int(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: int(process.env.RATE_LIMIT_MAX, 10),
  },
}
