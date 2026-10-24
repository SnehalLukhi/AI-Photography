const env = require('../config/env')
const AppError = require('../utils/AppError')
const plans = require('../config/plans')
const wallet = require('./wallet.service')
const razorpay = require('./razorpay.client')
const { itemById, localize } = require('./catalog')
const offers = require('./offers.service')
const pricing = require('./pricing.service')
const { query, tx } = require('../db')

/**
 * Auto-renewing plans (Razorpay Subscriptions). A plan with a Razorpay plan id in .env (RAZORPAY_PLAN_WEEKLY / _MONTHLY / _YEARLY) is sold like this:
 *   1. createSubscription   makes the Razorpay subscription for the plan; the browser opens Razorpay's window with its id and the customer pays the first cycle
 *   2. verify               (browser, right after paying) and handleEvent 'subscription.charged' (Razorpay, for the first payment AND every renewal) both end in fulfilCharge():
 *                           it records the payment and adds the plan's coins ONCE per payment id
 *   3. cancel               stops renewals at the end of the paid period (the customer keeps the plan until then)
 */
const TOTAL_COUNT = { weekly: 100, monthly: 60, yearly: 10, test: 4 } // billing cycles Razorpay may charge in total: Razorpay allows at most 100 for these plans (weekly 100 = about 2 years, monthly 60 = 5 years, yearly 10 = 10 years); after that the customer subscribes again
const LIVE = ['active', 'authenticated', 'pending']
/**
 * Is this item sold as a subscription, and with which Razorpay plan? A plan is a subscription when its dollar plan id is set in .env (RAZORPAY_PLAN_*).
 * Returns the id for dollars, the optional override for rupees (RAZORPAY_PLAN_*_INR), or 'auto' for any other currency: resolvePlanId() then finds / creates the plan for that currency and price. '' = not a subscription.
 */
const planIdFor = (item) => {
  if (item.test) return env.razorpay.planIds.test || ''
  const usd = env.razorpay.planIds[item.id]
  if (!usd) return ''
  if (item.currency === 'USD') return usd
  return (item.currency === 'INR' && env.razorpay.planIdsInr[item.id]) || 'auto' // other currencies: the plan is found / created in Razorpay with the converted price
}

// Razorpay plans are looked up (or created once) by what they are: period, currency and amount - so no plan id has to be configured for the rupee versions.
const planCache = new Map()
async function findOrCreatePlan(item) {
  const amount = Math.round(item.price * 100)
  const name = item.currency === 'USD' ? item.name : `${item.name} (${item.currency})`
  for (let skip = 0; skip < 500; skip += 100) {
    const page = await razorpay.call('GET', `/plans?count=100&skip=${skip}`)
    const found = (page.items || []).find((p) => p.period === item.period && p.interval === 1 && p.item?.currency === item.currency && p.item?.amount === amount && String(p.item?.name || '').startsWith(item.name))
    if (found) return found.id
    if ((page.items || []).length < 100) break
  }
  const created = await razorpay.call('POST', '/plans', { period: item.period, interval: 1, item: { name, amount, currency: item.currency, description: `${item.name} (${item.currency})` } })
  if (!created.id) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment could not be started. Please try again later.')
  console.log(`[razorpay] created plan ${created.id} for ${name}`)
  return created.id
}

/** The plan id to subscribe to (the configured id, or the found / created plan for the rupee prices). */
async function resolvePlanId(item) {
  const id = planIdFor(item)
  if (id !== 'auto') return id
  const key = `${item.id}:${item.currency}:${item.price}`
  if (!planCache.has(key)) planCache.set(key, findOrCreatePlan(item).catch((e) => { planCache.delete(key); throw e })) // one lookup at a time; a failure is retried next time
  return planCache.get(key)
}

const view = (row) => {
  const item = plans.find((p) => p.id === row.item_id)
  return {
    id: row.subscription_id, itemId: row.item_id, name: item?.name ?? row.item_id, coins: item?.coins ?? 0, status: row.status, cancelRequested: row.cancel_requested,
    renewsAt: row.current_end && !row.cancel_requested && row.status !== 'cancelled' ? new Date(row.current_end).toISOString() : null,
    endsAt: row.current_end && (row.cancel_requested || row.status === 'cancelled') ? new Date(row.current_end).toISOString() : null,
  }
}

/** The plan the user has now (paid, not ended): active / authenticated, or cancelled but still inside the period they paid for. null when none. */
async function current(userId) {
  const row = (await query(
    "SELECT * FROM subscriptions WHERE user_id = $1 AND (status = ANY($2) OR (status = 'cancelled' AND current_end > now())) ORDER BY created_at DESC LIMIT 1", [userId, LIVE])).rows[0]
  return row ? view(row) : null
}

async function createSubscription(user, item, offer) {
  await wallet.expireEnded(user.id) // coins of a plan that has ended go before the new plan's coins arrive
  if (await current(user.id)) throw new AppError(409, 'ALREADY_SUBSCRIBED', 'You already have an active plan. Cancel it in your profile before choosing another.')
  const sub = await razorpay.call('POST', '/subscriptions', {
    plan_id: await resolvePlanId(item), total_count: TOTAL_COUNT[item.id] || 12, quantity: 1, customer_notify: 1,
    notes: { user_id: user.id, item_id: item.id, ...(offer ? { offer_id: offer.id } : {}) },
    ...(offer && offers.offerIdFor(offer, item.currency) ? { offer_id: offers.offerIdFor(offer, item.currency) } : {}),
  })
  if (!sub.id) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', 'The payment could not be started. Please try again later.')
  await query('INSERT INTO subscriptions (subscription_id, user_id, item_id, offer_id) VALUES ($1, $2, $3, $4)', [sub.id, user.id, item.id, offer ? offer.id : null])
  return { kind: 'subscription', subscriptionId: sub.id, keyId: env.razorpay.keyId, name: env.brandName, description: `${item.name} - ${item.coins.toLocaleString('en-US')} coins per renewal${offer ? ` (${offer.percentOff}% off the first payment)` : ''}` }
}

const toTs = (unix) => (unix ? new Date(unix * 1000).toISOString() : null)

/** Records one charge of a subscription and adds the plan's coins - once per payment id (a webhook retry or the browser check after the webhook changes nothing). */
function fulfilCharge(subscriptionId, payment, subEntity) {
  return tx(async (db) => {
    const sub = (await db.query('SELECT * FROM subscriptions WHERE subscription_id = $1 FOR UPDATE', [subscriptionId])).rows[0]
    if (!sub) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.')
    await pricing.ensureRates()
    const item = localize(itemById(sub.item_id), payment.currency) // the regular price in the currency that was charged
    const listAmount = Math.round(item.price * 100)
    const discounted = payment.amount < listAmount
    const ins = await db.query(
      "INSERT INTO payments (order_id, user_id, item_id, amount, currency, status, payment_id, subscription_id, offer_id, list_amount, paid_at) VALUES ($1, $2, $3, $4, $5, 'paid', $1, $6, $7, $8, now()) ON CONFLICT DO NOTHING RETURNING order_id",
      [payment.id, sub.user_id, item.id, payment.amount, payment.currency, subscriptionId, discounted ? sub.offer_id : null, listAmount])
    const credited = ins.rows.length > 0
    if (credited) await wallet.creditPlan(sub.user_id, item.coins, payment.id, db)
    await db.query(
      "UPDATE subscriptions SET status = CASE WHEN status IN ('cancelled', 'completed', 'halted') THEN status ELSE 'active' END, paid_count = paid_count + $2, current_end = COALESCE($3::timestamptz, current_end), charge_at = COALESCE($4::timestamptz, charge_at) WHERE subscription_id = $1",
      [subscriptionId, credited ? 1 : 0, toTs(subEntity?.current_end), toTs(subEntity?.charge_at)])
    return { credited, userId: sub.user_id }
  })
}

/** The browser's proof of the first payment: Razorpay signs "<payment_id>|<subscription_id>" with your key secret (note: payment id FIRST, unlike an order). */
async function verify(userId, { subscriptionId, paymentId, signature }) {
  if (!razorpay.isConfigured()) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet.')
  if (typeof subscriptionId !== 'string' || typeof paymentId !== 'string' || !razorpay.safeEqual(razorpay.hmac(env.razorpay.keySecret, `${paymentId}|${subscriptionId}`), signature)) {
    throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'The payment could not be verified.')
  }
  const owner = (await query('SELECT user_id FROM subscriptions WHERE subscription_id = $1', [subscriptionId])).rows[0]
  if (!owner || owner.user_id !== userId) throw new AppError(404, 'SUBSCRIPTION_NOT_FOUND', 'Subscription not found.')
  // what was actually paid comes from Razorpay, not from the browser
  const payment = await razorpay.call('GET', `/payments/${encodeURIComponent(paymentId)}`)
  if (!['captured', 'authorized'].includes(payment.status)) throw new AppError(400, 'PAYMENT_NOT_COMPLETED', 'The payment has not been completed.')
  const subEntity = await razorpay.call('GET', `/subscriptions/${encodeURIComponent(subscriptionId)}`).catch(() => null)
  const { credited } = await fulfilCharge(subscriptionId, { id: payment.id, amount: payment.amount, currency: payment.currency }, subEntity)
  const paid = (await query('SELECT * FROM payments WHERE order_id = $1', [payment.id])).rows[0]
  return { credited, balance: await wallet.balance(userId), purchase: describePayment(paid) }
}

// the same shape payments.service gives for one-time purchases (kept here to avoid a circular require)
const describePayment = (row) => {
  const item = plans.find((p) => p.id === row.item_id)
  return {
    orderId: row.order_id, paymentId: row.payment_id, itemId: row.item_id, name: item?.name ?? row.item_id, kind: 'plan', coins: item?.coins ?? 0, amount: row.amount, currency: row.currency,
    paidAt: new Date(row.paid_at).toISOString(), listAmount: row.list_amount ?? row.amount, offerPercent: row.offer_id && row.list_amount ? Math.round((1 - row.amount / row.list_amount) * 100) : 0,
  }
}

/** Razorpay's subscription notifications (verified by the webhook signature before they get here). */
async function handleEvent(event) {
  const sub = event.payload?.subscription?.entity
  if (!sub?.id) return { handled: false }
  const known = (await query('SELECT 1 FROM subscriptions WHERE subscription_id = $1', [sub.id])).rows.length > 0
  if (!known) return { handled: false } // not one of ours
  if (event.event === 'subscription.charged') {
    const payment = event.payload?.payment?.entity
    if (!payment?.id) return { handled: false }
    const { credited } = await fulfilCharge(sub.id, { id: payment.id, amount: payment.amount, currency: payment.currency }, sub)
    return { handled: true, credited }
  }
  const status = { 'subscription.activated': 'active', 'subscription.authenticated': 'authenticated', 'subscription.pending': 'pending', 'subscription.halted': 'halted', 'subscription.cancelled': 'cancelled', 'subscription.completed': 'completed', 'subscription.paused': 'paused', 'subscription.resumed': 'active' }[event.event]
  if (!status) return { handled: false }
  await query(
    'UPDATE subscriptions SET status = $2, current_end = COALESCE($3::timestamptz, current_end), charge_at = COALESCE($4::timestamptz, charge_at) WHERE subscription_id = $1',
    [sub.id, status, toTs(sub.current_end), toTs(sub.charge_at)])
  return { handled: true }
}

/** Stops the renewals at the end of the period the customer already paid for. */
async function cancel(userId) {
  if (!razorpay.isConfigured()) throw new AppError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payments are not available yet.')
  const mine = await current(userId)
  if (!mine) throw new AppError(404, 'NO_SUBSCRIPTION', 'You have no active plan.')
  if (!mine.cancelRequested && mine.status !== 'cancelled') {
    await razorpay.call('POST', `/subscriptions/${encodeURIComponent(mine.id)}/cancel`, { cancel_at_cycle_end: 1 })
    await query('UPDATE subscriptions SET cancel_requested = true WHERE subscription_id = $1', [mine.id])
  }
  return current(userId)
}

module.exports = { planIdFor, createSubscription, verify, handleEvent, current, cancel }
