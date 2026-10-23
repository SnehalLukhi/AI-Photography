const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const packs = require('../config/packs')
const offers = require('../config/offers')

/** A subscription plan (config/plans.js) or a one-time coin pack (config/packs.js) by id. An offer id (config/offers.js) resolves to the item it discounts. */
function itemById(id) {
  const offer = offers.find((o) => o.id === id)
  const item = plans.find((p) => p.id === (offer ? offer.itemId : id)) || packs.find((p) => p.id === (offer ? offer.itemId : id))
  if (!item) throw new AppError(400, 'INVALID_ITEM', 'Unknown plan or coin pack.')
  return item
}

const isPlan = (id) => plans.some((p) => p.id === id)

/** Is this item sold in rupees? When it has a rupee price (a Razorpay plan for it is found or created automatically). */
const inrAvailable = (item) => !!item.inr

/** The item priced for the visitor's currency: a copy with `price` and `currency` of 'INR' (rupees) or 'USD' (dollars). Falls back to dollars when there is no rupee price / plan. */
function localize(item, currency) {
  return currency === 'INR' && inrAvailable(item) ? { ...item, price: item.inr, currency: 'INR' } : item
}

module.exports = { itemById, isPlan, localize }
