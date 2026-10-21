const env = require('../config/env')
const plans = require('../config/plans')
const packs = require('../config/packs')
const wallet = require('../services/wallet.service')
const payments = require('../services/payments.service')

/** GET /api/plans - public: the coin plans for the Pricing page. */
function listPlans(_req, res) {
  res.json({ success: true, plans, costPerGeneration: env.coins.perGeneration })
}

/** GET /api/coin-packs - public: the one-time coin packs for the Get Coins page. */
function listPacks(_req, res) {
  res.json({ success: true, packs, costPerGeneration: env.coins.perGeneration })
}

/** GET /api/wallet - balance, cost of one generation and the latest coin movements. */
async function getWallet(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, coins: await wallet.balance(req.user.id), costPerGeneration: env.coins.perGeneration, history: await wallet.history(req.user.id) })
}

/** POST /api/wallet/redeem - JSON { code } */
async function redeem(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await wallet.redeem(req.user.id, req.body?.code)) })
}

/** POST /api/wallet/checkout - JSON { itemId (plan or coin pack id), currency?: 'USD' } -> starts a payment (503 until a payment gateway is connected). */
function checkout(req, res) {
  res.json({ success: true, ...payments.createCheckout(req.user.id, req.body?.itemId ?? req.body?.planId, req.body?.currency) })
}

module.exports = { listPlans, listPacks, getWallet, redeem, checkout }
