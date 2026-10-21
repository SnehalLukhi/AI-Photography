const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const packs = require('../config/packs')
const wallet = require('./wallet.service')

/**
 * Payments. No payment gateway is connected yet, so no coins can be bought: createCheckout answers 503 and nothing is ever credited for free.
 * When a gateway is added, createCheckout creates its order / checkout session for the plan or coin pack, and the gateway's verified webhook calls
 * grantPurchase with the gateway's payment id.
 */
const CURRENCY = 'USD' // all prices are in US dollars

/** A subscription plan (config/plans.js) or a one-time coin pack (config/packs.js) by id. */
function itemById(id) {
  const item = plans.find((p) => p.id === id) || packs.find((p) => p.id === id)
  if (!item) throw new AppError(400, 'INVALID_ITEM', 'Unknown plan or coin pack.')
  return item
}

function createCheckout(_userId, itemId, currency) {
  itemById(itemId)
  if (currency !== undefined && currency !== CURRENCY) throw new AppError(400, 'INVALID_CURRENCY', `Prices are in ${CURRENCY} only.`)
  throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet. Please check back soon.')
}

/** Credits the coins of a plan or pack for one verified payment. Safe to call twice for the same payment id (credits once). @returns {Promise<boolean>} true if coins were added */
function grantPurchase(userId, itemId, paymentId) {
  if (!paymentId) throw new AppError(400, 'INVALID_PAYMENT', 'A payment id is required.')
  return wallet.credit(userId, itemById(itemId).coins, 'purchase', String(paymentId))
}

module.exports = { createCheckout, grantPurchase }
