const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const packs = require('../config/packs')
const offers = require('../config/offers')
const pricing = require('./pricing.service')

/** A subscription plan (config/plans.js) or a one-time coin pack (config/packs.js) by id. An offer id (config/offers.js) resolves to the item it discounts. */
function itemById(id) {
  const offer = offers.find((o) => o.id === id)
  const item = plans.find((p) => p.id === (offer ? offer.itemId : id)) || packs.find((p) => p.id === (offer ? offer.itemId : id))
  if (!item) throw new AppError(400, 'INVALID_ITEM', 'Unknown plan or coin pack.')
  return item
}

const isPlan = (id) => plans.some((p) => p.id === id)

/**
 * The item priced for the visitor's currency: a copy with `price` and `currency`. The dollar price of config/plans.js / config/packs.js is converted with the exchange
 * rate and rounded up to a charm price (see pricing.service); an item can pin its own price for a currency with `prices: { INR: 299 }`. Unknown currencies stay dollars.
 * Call pricing.ensureRates() first (the region middleware and the checkout do) so the current rates are loaded.
 */
function localize(item, currency) {
  if (!currency || currency === 'USD' || item.currency !== 'USD' || !pricing.supported(currency)) return item
  return { ...item, price: item.prices?.[currency] ?? pricing.convert(item.price, currency), currency }
}

module.exports = { itemById, isPlan, localize }
