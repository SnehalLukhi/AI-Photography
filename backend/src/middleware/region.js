const env = require('../config/env')
const pricing = require('../services/pricing.service')

/**
 * Sets req.currency from the visitor's country: rupees in India, euros in the euro countries, pounds in the UK ... (see pricing.service), dollars everywhere else. The country is read
 * from the hosting platform's header (Vercel: x-vercel-ip-country, Cloudflare: cf-ipcountry) - the browser cannot choose it. Without a header (local development) DEFAULT_CURRENCY
 * is used; outside production `?currency=EUR` (any supported currency) can override it. Also loads the exchange rates the prices are worked out with.
 */
module.exports = async function region(req, _res, next) {
  const country = (req.get('x-vercel-ip-country') || req.get('cf-ipcountry') || '').toUpperCase()
  let currency = country ? pricing.currencyFor(country) : env.defaultCurrency
  const forced = String(req.query.currency || '').toUpperCase()
  if (env.nodeEnv !== 'production' && pricing.supported(forced)) currency = forced
  req.currency = currency
  await pricing.ensureRates()
  next()
}
