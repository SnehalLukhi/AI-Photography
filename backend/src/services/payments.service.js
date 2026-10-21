const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const wallet = require('./wallet.service')

/**
 * Payments. No payment gateway is connected yet, so no coins can be bought: createCheckout answers 503 and nothing is ever credited for free.
 * When a gateway is added, createCheckout creates its order / checkout session for the plan, and the gateway's verified webhook calls
 * grantPurchase with the gateway's payment id.
 */
function planById(id) {
  const plan = plans.find((p) => p.id === id)
  if (!plan) throw new AppError(400, 'INVALID_PLAN', 'Unknown plan.')
  return plan
}

function createCheckout(_userId, planId) {
  planById(planId)
  throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet. Please check back soon.')
}

/** Credits the plan's coins for one verified payment. Safe to call twice for the same payment id (credits once). @returns {boolean} true if coins were added */
function grantPurchase(userId, planId, paymentId) {
  if (!paymentId) throw new AppError(400, 'INVALID_PAYMENT', 'A payment id is required.')
  return wallet.credit(userId, planById(planId).coins, 'purchase', String(paymentId))
}

module.exports = { createCheckout, grantPurchase }
