const env = require('../config/env')

/**
 * Sets req.currency: 'INR' for visitors in India, 'USD' for everyone else. The country is read from the hosting platform's header (Vercel: x-vercel-ip-country,
 * Cloudflare: cf-ipcountry) - the browser cannot choose it. Without a header (local development) DEFAULT_CURRENCY is used; outside production `?currency=INR|USD` can override it.
 */
module.exports = function region(req, _res, next) {
  const country = (req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || '').toUpperCase()
  let currency = country ? (country === 'IN' ? 'INR' : 'USD') : env.defaultCurrency
  const forced = String(req.query.currency || '').toUpperCase()
  if (env.nodeEnv !== 'production' && (forced === 'INR' || forced === 'USD')) currency = forced
  req.currency = currency
  next()
}
