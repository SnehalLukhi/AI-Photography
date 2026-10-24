const env = require('../config/env')
const { query } = require('../db')

/**
 * Prices in the visitor's own currency. Every price in config/plans.js and config/packs.js is in US dollars; for another currency it is converted with the exchange rate
 * and then rounded UP to a "charm" price: currencies with big numbers end in 99 (rupees: $1 = ₹94 -> ₹99, $2.99 -> ₹281 -> ₹299, $39.99 -> ₹3,759 -> ₹3,799), the others in .99 (€2.99).
 *
 * Exchange rates: pinned with FX_RATES='{"INR":94}' (per 1 US dollar) when you want a fixed rate, else fetched from a free rates API at most once a day and shared by all
 * server instances through the table fx_rates; if that fails the last known rates (or the built-in ones below) are used. Rates are loaded by ensureRates() BEFORE a price is worked out.
 */
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED'] // currencies with 2 decimals that Razorpay can charge (international payments must be enabled for all but INR)
const BUILT_IN = { USD: 1, INR: 94, EUR: 0.92, GBP: 0.78, AUD: 1.52, CAD: 1.37, SGD: 1.31, AED: 3.67 }
const BIG = new Set(['INR']) // currencies whose prices are whole numbers ending in 99 (the dollar amount is small compared to the local one); the rest end in .99
const EURO = 'AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ')
const COUNTRY = { IN: 'INR', US: 'USD', GB: 'GBP', AU: 'AUD', CA: 'CAD', SG: 'SGD', AE: 'AED', ...Object.fromEntries(EURO.map((c) => [c, 'EUR'])) }

const DAY = 24 * 3600 * 1000
let rates = { ...BUILT_IN, ...pinned() }
let loadedAt = 0

function pinned() {
  try { const o = JSON.parse(process.env.FX_RATES || '{}'); return Object.fromEntries(Object.entries(o).filter(([c, r]) => CURRENCIES.includes(c) && Number(r) > 0).map(([c, r]) => [c, Number(r)])) } catch { return {} }
}

const supported = (c) => CURRENCIES.includes(c)
/** The currency to charge visitors of a country (ISO code like 'IN'); USD for countries without their own. */
const currencyFor = (country) => COUNTRY[String(country || '').toUpperCase()] || 'USD'

/** Loads the exchange rates (from the shared table, refreshing it from the rates API when it is a day old). Never throws. */
async function ensureRates() {
  if (Date.now() - loadedAt < 5 * 60 * 1000) return
  loadedAt = Date.now() // one attempt per 5 minutes, also when it fails
  if (process.env.FX_LIVE === 'false') return
  try {
    const row = (await query('SELECT rates, fetched_at FROM fx_rates WHERE id = 1')).rows[0]
    let fresh = row && Date.now() - new Date(row.fetched_at).getTime() < DAY ? row.rates : null
    if (!fresh) {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(4000) })
        const body = res.ok ? await res.json() : null
        const got = body?.rates && Object.fromEntries(CURRENCIES.filter((c) => Number(body.rates[c]) > 0).map((c) => [c, Number(body.rates[c])]))
        if (got && got.INR) { fresh = got; await query('INSERT INTO fx_rates (id, rates, fetched_at) VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET rates = EXCLUDED.rates, fetched_at = now()', [JSON.stringify(got)]) }
      } catch (e) { console.warn('[fx] could not refresh the exchange rates:', e.message) }
    }
    rates = { ...BUILT_IN, ...(fresh || row?.rates || {}), ...pinned() }
  } catch (e) { console.warn('[fx] exchange rates unavailable, using the last known ones:', e.message) }
}

/** Rounds up to the next charm price: 94 -> 99, 282 -> 299 (rupees); 2.76 -> 2.99 (others). */
function charm(raw, currency) {
  if (BIG.has(currency)) return Math.max(99, Math.ceil((raw - 99) / 100) * 100 + 99)
  return Math.max(0.99, Math.round((Math.ceil(raw + 0.01) - 0.01) * 100) / 100)
}

/** A dollar price in another currency (charm-rounded); dollars stay as they are. */
function convert(usd, currency) {
  if (currency === 'USD' || !supported(currency)) return usd
  return charm(usd * (rates[currency] || BUILT_IN[currency]), currency)
}

const rateOf = (currency) => rates[currency] || BUILT_IN[currency]

module.exports = { CURRENCIES, supported, currencyFor, ensureRates, convert, charm, rateOf }
