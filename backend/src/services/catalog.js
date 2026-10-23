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

module.exports = { itemById, isPlan }
