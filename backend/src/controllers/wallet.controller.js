const env = require('../config/env')
const plans = require('../config/plans')
const wallet = require('../services/wallet.service')
const payments = require('../services/payments.service')

/** GET /api/plans - public: the coin plans for the Pricing page. */
function listPlans(_req, res) {
  res.json({ success: true, plans, costPerGeneration: env.coins.perGeneration })
}

/** GET /api/wallet - balance, cost of one generation and the latest coin movements. */
function getWallet(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, coins: wallet.balance(req.user.id), costPerGeneration: env.coins.perGeneration, history: wallet.history(req.user.id) })
}

/** POST /api/wallet/redeem - JSON { code } */
function redeem(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...wallet.redeem(req.user.id, req.body?.code) })
}

/** POST /api/wallet/checkout - JSON { planId } -> starts a payment (503 until a payment gateway is connected). */
function checkout(req, res) {
  res.json({ success: true, ...payments.createCheckout(req.user.id, req.body?.planId) })
}

module.exports = { listPlans, getWallet, redeem, checkout }
