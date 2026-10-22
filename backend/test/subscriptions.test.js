/** Auto-renewing plans (Razorpay Subscriptions): the Razorpay API is replaced by a stand-in; signatures and webhooks are computed exactly like Razorpay does. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const h = require('./helpers')

const KEY_SECRET = 'key-secret'
const HOOK_SECRET = 'hook-secret'
let app, baseFetch, db, wallet
let subCount = 0
const calls = []
const payments = {} // payment id -> amount (what Razorpay "knows")

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const api = (path, init = {}) => fetch(`${app.base}/api${path}`, init)
const post = (path, body, u) => api(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: u ? `Bearer ${u.token}` : '' }, body: JSON.stringify(body) })
const getSub = async (u) => (await (await api('/wallet/subscription', { headers: { authorization: `Bearer ${u.token}` } })).json()).subscription
const hook = (event) => { const raw = JSON.stringify(event); return fetch(`${app.base}/api/webhooks/razorpay`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '', 'x-razorpay-signature': hmac(HOOK_SECRET, raw) }, body: raw }) }
const sec = (ms) => Math.floor(ms / 1000)
const charged = (subId, paymentId, amount, endMs) => ({ event: 'subscription.charged', payload: { subscription: { entity: { id: subId, current_end: sec(endMs), charge_at: sec(endMs) } }, payment: { entity: { id: paymentId, amount, currency: 'USD' } } } })

before(async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = HOOK_SECRET
  process.env.RAZORPAY_PLAN_MONTHLY = 'plan_MONTHLY1'
  process.env.RAZORPAY_PLAN_YEARLY = 'plan_YEARLY1'
  process.env.COIN_COST_PER_GENERATION = '15'
  process.env.SIGNUP_BONUS_COINS = '50'
  const offers = require('../src/config/offers')
  offers.length = 0
  offers.push(
    { id: 'monthly-20', itemId: 'monthly', percentOff: 20, audience: 'all' }, // no razorpayOfferId: cannot discount a subscription
    { id: 'yearly-offer', itemId: 'yearly', percentOff: 50, audience: 'new', windowHours: 24, popup: true, razorpayOfferId: 'offer_YEARLY50' },
  )
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  wallet = require('../src/services/wallet.service')
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    if (!u.startsWith('https://api.razorpay.com/v1/')) return baseFetch(url, init)
    const path = u.slice('https://api.razorpay.com/v1'.length)
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    calls.push({ method: init.method, path, body: init.body ? JSON.parse(init.body) : null })
    if (path === '/orders') return json({ id: `order_${++subCount}`, ...JSON.parse(init.body) }) // one-time purchases
    if (path === '/subscriptions' && init.method === 'POST') return json({ id: `sub_${++subCount}`, status: 'created', ...JSON.parse(init.body) })
    if (path.startsWith('/subscriptions/') && path.endsWith('/cancel')) return json({ id: path.split('/')[2], status: 'active', cancel_at_cycle_end: 1 })
    if (path.startsWith('/subscriptions/')) return json({ id: path.split('/')[2], status: 'active', current_end: sec(Date.now() + 30 * 86400000), charge_at: sec(Date.now() + 30 * 86400000) })
    if (path.startsWith('/payments/')) { const id = path.split('/')[2]; return payments[id] ? json({ id, status: 'captured', amount: payments[id], currency: 'USD' }) : json({ error: { description: 'not found' } }, 400) }
    return json({}, 404)
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

const start = async (u, itemId) => { const r = await post('/wallet/checkout', { itemId }, u); return { status: r.status, body: await r.json() } }
const pay = async (u, subId, paymentId, amount, { swap = false } = {}) => {
  payments[paymentId] = amount
  const signature = hmac(KEY_SECRET, swap ? `${subId}|${paymentId}` : `${paymentId}|${subId}`) // the right order is payment id FIRST
  return post('/wallet/verify-payment', { subscriptionId: subId, paymentId, signature }, u)
}

test('buying a plan with a Razorpay plan id creates a subscription; coin packs stay one-time orders', async () => {
  const u = await h.createUser('sub1@example.com')
  const { status, body } = await start(u, 'monthly')
  assert.equal(status, 200)
  assert.equal(body.order.kind, 'subscription')
  assert.match(body.order.subscriptionId, /^sub_/)
  const call = calls.filter((c) => c.path === '/subscriptions').at(-1).body
  assert.equal(call.plan_id, 'plan_MONTHLY1')
  assert.equal(call.total_count, 60)
  assert.equal(call.notes.user_id, u.id)
  assert.equal(call.offer_id, undefined) // the 20% offer has no Razorpay offer id: nothing is applied
  const row = (await db.query('SELECT status, user_id FROM subscriptions WHERE subscription_id = $1', [body.order.subscriptionId])).rows[0]
  assert.deepEqual({ ...row }, { status: 'created', user_id: u.id })
  const pack = await start(u, 'popular') // a pack
  assert.equal(pack.body.order.kind, 'order')
  assert.equal((await start(u, 'weekly')).body.order.kind, 'order') // weekly has no plan id in this setup: one-time
})

test('the first payment: right signature adds the plan coins once; wrong order, other users and unpaid payments are refused', async () => {
  const u = await h.createUser('sub2@example.com')
  const before = await wallet.balance(u.id)
  const { subscriptionId } = (await start(u, 'monthly')).body.order
  assert.equal((await pay(u, subscriptionId, 'pay_S1', 999, { swap: true })).status, 400) // signature built in the wrong order
  assert.equal((await pay(await h.createUser('thief2@example.com'), subscriptionId, 'pay_S1', 999)).status, 404) // not their subscription
  assert.equal((await post('/wallet/verify-payment', { subscriptionId, paymentId: 'pay_NOPE', signature: hmac(KEY_SECRET, `pay_NOPE|${subscriptionId}`) }, u)).status, 502) // Razorpay does not know this payment
  assert.equal(await wallet.balance(u.id), before)

  const ok = await pay(u, subscriptionId, 'pay_S1', 999)
  assert.equal(ok.status, 200)
  const body = await ok.json()
  assert.deepEqual([body.credited, body.balance, body.purchase.name, body.purchase.kind, body.purchase.amount], [true, before + 220, 'Monthly Premium', 'plan', 999])
  assert.equal((await (await pay(u, subscriptionId, 'pay_S1', 999)).json()).credited, false) // repeated check: nothing more
  assert.equal(await wallet.balance(u.id), before + 220)
  const mine = await getSub(u)
  assert.deepEqual([mine.name, mine.status, mine.cancelRequested], ['Monthly Premium', 'active', false])
  assert.ok(Date.parse(mine.renewsAt) > Date.now())
})

test('a renewal (webhook subscription.charged) adds the coins again, once per payment; the first payment is not counted twice', async () => {
  const u = await h.createUser('sub3@example.com')
  const { subscriptionId } = (await start(u, 'monthly')).body.order
  const before = await wallet.balance(u.id)
  await pay(u, subscriptionId, 'pay_R1', 999)
  assert.equal((await hook(charged(subscriptionId, 'pay_R1', 999, Date.now() + 30 * 86400000))).status, 200) // Razorpay's notice for the SAME first payment
  assert.equal(await wallet.balance(u.id), before + 220)
  assert.equal((await hook(charged(subscriptionId, 'pay_R2', 999, Date.now() + 60 * 86400000))).status, 200) // next month
  assert.equal(await wallet.balance(u.id), before + 440)
  assert.equal((await hook(charged(subscriptionId, 'pay_R2', 999, Date.now() + 60 * 86400000))).status, 200) // retry
  assert.equal(await wallet.balance(u.id), before + 440)
  const list = (await (await api('/wallet/purchases', { headers: { authorization: `Bearer ${u.token}` } })).json()).purchases
  assert.equal(list.filter((p) => p.name === 'Monthly Premium').length, 2) // both charges are in the history
  assert.equal((await hook(charged('sub_unknown', 'pay_X', 999, Date.now()))).status, 200) // not ours: ignored
})

test('one live plan at a time; cancelling stops the renewals but keeps the plan until the period ends', async () => {
  const u = await h.createUser('sub4@example.com')
  const { subscriptionId } = (await start(u, 'monthly')).body.order
  await pay(u, subscriptionId, 'pay_C1', 999)
  const again = await start(u, 'yearly')
  assert.equal(again.status, 409)
  assert.equal(again.body.error.code, 'ALREADY_SUBSCRIBED')

  const cancelled = await post('/wallet/subscription/cancel', {}, u)
  assert.equal(cancelled.status, 200)
  assert.deepEqual(calls.filter((c) => c.path.endsWith('/cancel')).at(-1).body, { cancel_at_cycle_end: 1 })
  const mine = (await cancelled.json()).subscription
  assert.deepEqual([mine.cancelRequested, mine.renewsAt === null, mine.endsAt !== null], [true, true, true])
  assert.equal((await post('/wallet/subscription/cancel', {}, await h.createUser('nosub@example.com'))).status, 404)

  // the period ends: Razorpay says cancelled with an end date in the past -> no plan any more, a new one can be bought
  await hook({ event: 'subscription.cancelled', payload: { subscription: { entity: { id: subscriptionId, current_end: sec(Date.now() - 1000) } } } })
  assert.equal(await getSub(u), null)
  assert.equal((await start(u, 'yearly')).status, 200)
})

test('a plan offer needs a Razorpay offer id: it is sent to Razorpay with the first payment, otherwise the plan is not discounted', async () => {
  const fresh = await h.createUser('sub5@example.com')
  const { body } = await start(fresh, 'yearly-offer')
  assert.equal(body.order.kind, 'subscription')
  const call = calls.filter((c) => c.path === '/subscriptions').at(-1).body
  assert.equal(call.plan_id, 'plan_YEARLY1')
  assert.equal(call.offer_id, 'offer_YEARLY50')
  assert.match(body.order.description, /50% off the first payment/)
  // the first payment is discounted by Razorpay: it is stored with the offer
  await pay(fresh, body.order.subscriptionId, 'pay_O1', 1999)
  const purchase = (await (await api('/wallet/purchases', { headers: { authorization: `Bearer ${fresh.token}` } })).json()).purchases[0]
  assert.deepEqual([purchase.amount, purchase.listAmount, purchase.offerPercent, purchase.coins], [1999, 3999, 50, 2700])
  // a monthly offer without a Razorpay offer id is not applied (nor shown) for the auto-renewing plan
  const plans = (await (await api('/plans', { headers: { authorization: `Bearer ${fresh.token}` } })).json()).plans
  assert.equal(plans.find((p) => p.id === 'monthly').offer, undefined)
  assert.equal(plans.find((p) => p.id === 'yearly').offer.discountPercent, 50)
})
