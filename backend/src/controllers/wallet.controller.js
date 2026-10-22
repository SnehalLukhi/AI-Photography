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

/** POST /api/wallet/checkout - JSON { itemId (plan or coin pack id) } -> { order }: what the browser needs to open Razorpay's payment window (503 until the Razorpay keys are set). */
async function checkout(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, order: await payments.createCheckout(req.user.id, req.body?.itemId ?? req.body?.planId, req.body?.currency) })
}

/** POST /api/wallet/verify-payment - JSON { orderId, paymentId, signature } (from Razorpay's payment window) -> { credited, balance } */
async function verifyPayment(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, ...(await payments.verifyPayment(req.user.id, req.body || {})) })
}

/** GET /api/wallet/purchases - the user's paid plans and coin packs, newest first: [{ name, kind: 'plan' | 'pack', coins, amount (cents), currency, paidAt, ... }] */
async function purchases(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, purchases: await payments.listPurchases(req.user.id) })
}

/** POST /api/webhooks/razorpay - called by Razorpay (not by the browser); the signature header proves it. */
async function razorpayWebhook(req, res) {
  await payments.handleWebhook(req.rawBody, req.get('x-razorpay-signature'))
  res.json({ success: true }) // always 200 once the signature is valid, so Razorpay does not keep retrying events we ignore
}

module.exports = { listPlans, listPacks, getWallet, redeem, checkout, verifyPayment, purchases, razorpayWebhook }
