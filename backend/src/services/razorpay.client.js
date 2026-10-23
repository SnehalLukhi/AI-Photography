const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')

/** Small Razorpay REST client + the signature helpers (used by payments.service for orders and by subscriptions.service for subscriptions). */
const BASE = 'https://api.razorpay.com/v1'
const isConfigured = () => !!(env.razorpay.keyId && env.razorpay.keySecret)
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Calls the Razorpay API with the key id / secret. Rejects with 502 errors (the details go to the log, not to the customer). */
async function call(method, path, body) {
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64')}` },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new AppError(502, 'PAYMENT_PROVIDER_UNREACHABLE', 'Could not reach the payment provider. Please try again.') }
  const out = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`[razorpay] ${method} ${path} failed:`, res.status, JSON.stringify(out.error || out))
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment could not be processed. Please try again later.')
  }
  return out
}

module.exports = { isConfigured, call, hmac, safeEqual }
