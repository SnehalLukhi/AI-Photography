const env = require('../config/env')
const plans = require('../config/plans')
const packs = require('../config/packs')
const offerRules = require('../services/offers.service')
const wallet = require('../services/wallet.service')
const payments = require('../services/payments.service')
const subscriptions = require('../services/subscriptions.service')

/** Items with the active offer for this user (if any) attached as `offer: { id, discountPercent, original, price, endsAt }`. `price` of the item stays the regular price. */
const withOffers = (items, user) => items.map((i) => { const o = offerRules.bestFor(i.id, user); return o ? { ...i, offer: offerRules.badge(o, user) } : i })

/** GET /api/plans - the coin plans for the Pricing page, with the offers this visitor gets (offers for new users need a login token), and `offer` = the popup's special offer. */
function listPlans(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, plans: withOffers(plans, req.user), offer: offerRules.popupOffer(req.user), costPerGeneration: env.coins.perGeneration })
}

/** GET /api/coin-packs - the one-time coin packs for the Get Coins page, with the offers this visitor gets. */
function listPacks(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, packs: withOffers(packs, req.user), costPerGeneration: env.coins.perGeneration })
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
  res.set('Cache-Control', 'no-store').json({ success: true, order: await payments.createCheckout(req.user, req.body?.itemId ?? req.body?.planId, req.body?.currency) })
}

/** POST /api/wallet/verify-payment - JSON { orderId, paymentId, signature } (from Razorpay's payment window) -> { credited, balance } */
async function verifyPayment(req, res) {
  const body = req.body || {}
  const out = body.subscriptionId ? await subscriptions.verify(req.user.id, body) : await payments.verifyPayment(req.user.id, body) // auto-renewing plan or one-time purchase
  res.set('Cache-Control', 'no-store').json({ success: true, ...out })
}

/** GET /api/wallet/subscription - the plan the user has now (auto-renewing or cancelled but still paid for), or null: { id, name, coins, status, cancelRequested, renewsAt, endsAt } */
async function getSubscription(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, subscription: await subscriptions.current(req.user.id) })
}

/** POST /api/wallet/subscription/cancel - stops the renewals; the plan stays until the end of the paid period. */
async function cancelSubscription(req, res) {
  res.set('Cache-Control', 'no-store').json({ success: true, subscription: await subscriptions.cancel(req.user.id) })
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

module.exports = { listPlans, listPacks, getWallet, redeem, checkout, verifyPayment, getSubscription, cancelSubscription, purchases, razorpayWebhook }
