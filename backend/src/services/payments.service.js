const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const packs = require('../config/packs')
const offers = require('../config/offers')
const wallet = require('./wallet.service')
const { query, tx } = require('../db')

/**
 * Payments with Razorpay (Standard Checkout). Prices are in US dollars (the Razorpay account must have international payments / USD enabled).
 *   1. createCheckout   creates a Razorpay order for a plan or coin pack and remembers it in the `payments` table (the amount comes from OUR price list, never from the browser)
 *   2. the browser opens Razorpay's payment window with that order
 *   3. verifyPayment    (browser, right after paying) and handleWebhook (Razorpay, in case the tab was closed) both end in fulfil(): it adds the coins ONCE per order
 */
const CURRENCY = 'USD'
const ORDERS_URL = 'https://api.razorpay.com/v1/orders'

/** A subscription plan (config/plans.js) or a one-time coin pack (config/packs.js) by id. */
function itemById(id) {
  const item = plans.find((p) => p.id === id) || packs.find((p) => p.id === id) || offers.find((p) => p.id === id)
  if (!item) throw new AppError(400, 'INVALID_ITEM', 'Unknown plan or coin pack.')
  return item
}

const isConfigured = () => !!(env.razorpay.keyId && env.razorpay.keySecret)
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** A paid order as the frontend shows it (what was bought, how many coins, what it cost). */
function describe(row) {
  const item = [...plans, ...packs].find((p) => p.id === row.item_id) // an item removed from the price list later still shows up under its id
  return {
    orderId: row.order_id, paymentId: row.payment_id, itemId: row.item_id, name: item?.name ?? row.item_id, kind: plans.some((p) => p.id === row.item_id) ? 'plan' : 'pack',
    coins: item?.coins ?? 0, amount: row.amount, currency: row.currency, paidAt: new Date(row.paid_at).toISOString(),
  }
}

/** The user's paid purchases, newest first (plans and coin packs). */
async function listPurchases(userId, limit = 50) {
  const rows = (await query("SELECT * FROM payments WHERE user_id = $1 AND status = 'paid' ORDER BY paid_at DESC LIMIT $2", [userId, limit])).rows
  return rows.map(describe)
}

/** Creates the Razorpay order for an item. @returns what the browser needs to open the payment window */
async function createCheckout(userId, itemId, currency) {
  const item = itemById(itemId)
  if (currency !== undefined && currency !== CURRENCY) throw new AppError(400, 'INVALID_CURRENCY', `Prices are in ${CURRENCY} only.`)
  if (!isConfigured()) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet. Please check back soon.')
  const amount = Math.round(item.price * 100)
  let res
  try {
    res = await fetch(ORDERS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount, currency: CURRENCY, receipt: `rcpt_${crypto.randomBytes(8).toString('hex')}`, notes: { user_id: userId, item_id: item.id } }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch { throw new AppError(502, 'PAYMENT_PROVIDER_UNREACHABLE', 'Could not reach the payment provider. Please try again.') }
  const order = await res.json().catch(() => ({}))
  if (!res.ok || !order.id) {
    console.error('[razorpay] order creation failed:', res.status, JSON.stringify(order.error || order))
    throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment could not be started. Please try again later.')
  }
  await query('INSERT INTO payments (order_id, user_id, item_id, amount, currency) VALUES ($1, $2, $3, $4, $5)', [order.id, userId, item.id, amount, CURRENCY])
  return { orderId: order.id, amount, currency: CURRENCY, keyId: env.razorpay.keyId, name: 'Pixora', description: `${item.name} - ${item.coins.toLocaleString('en-US')} coins` }
}

/** Marks the order paid and adds its coins, exactly once (a repeated call - webhook retry, or webhook after the browser check - changes nothing). */
function fulfil(orderId, paymentId) {
  return tx(async (db) => {
    const row = (await db.query('SELECT * FROM payments WHERE order_id = $1 FOR UPDATE', [orderId])).rows[0]
    if (!row) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.')
    if (row.status === 'paid') return { credited: false, userId: row.user_id }
    await db.query("UPDATE payments SET status = 'paid', payment_id = $2, paid_at = now() WHERE order_id = $1", [orderId, paymentId])
    await wallet.credit(row.user_id, itemById(row.item_id).coins, 'purchase', paymentId, db)
    return { credited: true, userId: row.user_id }
  })
}

/** The browser's proof of payment: Razorpay signs "<order_id>|<payment_id>" with your key secret. Only the user who started the order can claim it. */
async function verifyPayment(userId, { orderId, paymentId, signature }) {
  if (!isConfigured()) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet.')
  if (typeof orderId !== 'string' || typeof paymentId !== 'string' || !safeEqual(hmac(env.razorpay.keySecret, `${orderId}|${paymentId}`), signature)) {
    throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'The payment could not be verified.')
  }
  const order = (await query('SELECT user_id FROM payments WHERE order_id = $1', [orderId])).rows[0]
  if (!order || order.user_id !== userId) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.')
  const { credited } = await fulfil(orderId, paymentId)
  const paid = (await query('SELECT * FROM payments WHERE order_id = $1', [orderId])).rows[0]
  return { credited, balance: await wallet.balance(userId), purchase: describe(paid) }
}

/** Razorpay's server-to-server notification (set up in Razorpay Dashboard > Webhooks, events payment.captured and order.paid). `raw` is the unparsed request body. */
async function handleWebhook(raw, signature) {
  if (!env.razorpay.webhookSecret) throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'The payment webhook is not configured (RAZORPAY_WEBHOOK_SECRET is missing).')
  if (!Buffer.isBuffer(raw) || !safeEqual(hmac(env.razorpay.webhookSecret, raw), signature)) throw new AppError(400, 'INVALID_SIGNATURE', 'Invalid signature.')
  let event
  try { event = JSON.parse(raw.toString('utf8')) } catch { throw new AppError(400, 'BAD_REQUEST', 'Malformed body.') }
  const payment = event.payload?.payment?.entity
  if (!['payment.captured', 'order.paid'].includes(event.event) || !payment?.id || !payment.order_id) return { handled: false } // other events: nothing to do
  const row = (await query('SELECT amount, currency FROM payments WHERE order_id = $1', [payment.order_id])).rows[0]
  if (!row) return { handled: false } // not one of our orders
  if (payment.amount !== row.amount || payment.currency !== row.currency) {
    console.error('[razorpay] webhook amount mismatch for order', payment.order_id)
    return { handled: false }
  }
  const { credited } = await fulfil(payment.order_id, payment.id)
  return { handled: true, credited }
}

/** Credits the coins of a plan or pack for one verified payment, once per payment id. @returns {Promise<boolean>} true if coins were added */
function grantPurchase(userId, itemId, paymentId) {
  if (!paymentId) throw new AppError(400, 'INVALID_PAYMENT', 'A payment id is required.')
  return wallet.credit(userId, itemById(itemId).coins, 'purchase', String(paymentId))
}

module.exports = { createCheckout, verifyPayment, handleWebhook, listPurchases, grantPurchase }
