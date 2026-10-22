/** Offers: a percentage off a plan / pack is worked out by the server and charged in Razorpay; new-user, dated and overlapping offers. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const h = require('./helpers')

const KEY_SECRET = 'key-secret'
let app, baseFetch, db, wallet
let orderCount = 0
const orders = {}
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const api = (path, init = {}) => fetch(`${app.base}/api${path}`, init)
const as = (u) => ({ headers: { authorization: `Bearer ${u.token}` } })
const post = (path, body, u) => api(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: u ? `Bearer ${u.token}` : '' }, body: JSON.stringify(body) })
const checkout = async (u, itemId) => { const r = await post('/wallet/checkout', { itemId }, u); return { status: r.status, body: await r.json() } }
const DAY = 24 * 3600 * 1000

before(async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.COIN_COST_PER_GENERATION = '15'
  process.env.SIGNUP_BONUS_COINS = '50'
  // the offers under test (the same list the server reads)
  const offers = require('../src/config/offers')
  offers.length = 0
  offers.push(
    { id: 'monthly-20', itemId: 'monthly', percentOff: 20, audience: 'all' },
    { id: 'popular-new-30', itemId: 'popular', percentOff: 30, audience: 'new', windowHours: 24 },
    { id: 'popular-all-10', itemId: 'popular', percentOff: 10, audience: 'all' },
    { id: 'small-ended', itemId: 'small', percentOff: 50, audience: 'all', endsAt: new Date(Date.now() - 1000).toISOString() },
    { id: 'value-later', itemId: 'value', percentOff: 50, audience: 'all', startsAt: new Date(Date.now() + DAY).toISOString() },
    { id: 'yearly-offer', itemId: 'yearly', percentOff: 50, audience: 'new', windowHours: 24, popup: true },
  )
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  wallet = require('../src/services/wallet.service')
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.razorpay.com/v1/orders') return baseFetch(url, init)
    const order = { id: `order_${++orderCount}`, ...JSON.parse(init.body) }
    orders[order.id] = order
    return new Response(JSON.stringify(order), { headers: { 'content-type': 'application/json' } })
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

const oldUser = async (email) => { const u = await h.createUser(email); await db.query("UPDATE users SET created_at = now() - interval '3 days' WHERE id = $1", [u.id]); return u }

test('an offer for everyone: the server charges the discounted price in Razorpay', async () => {
  const u = await oldUser('off1@example.com')
  const { status, body } = await checkout(u, 'monthly') // $9.99 list, 20% off -> $7.99
  assert.equal(status, 200)
  assert.equal(body.order.amount, 799)
  assert.match(body.order.description, /20% off/)
  assert.equal(orders[body.order.orderId].amount, 799) // what Razorpay was asked for
  assert.equal(orders[body.order.orderId].notes.offer_id, 'monthly-20')
  const row = (await db.query('SELECT amount, list_amount, offer_id FROM payments WHERE order_id = $1', [body.order.orderId])).rows[0]
  assert.deepEqual({ ...row }, { amount: 799, list_amount: 999, offer_id: 'monthly-20' })
})

test('paying the discounted order still gives the full coins, and the purchase shows the offer', async () => {
  const u = await oldUser('off2@example.com')
  const before = await wallet.balance(u.id)
  const { body } = await checkout(u, 'monthly')
  const proof = { orderId: body.order.orderId, paymentId: 'pay_OFF', signature: hmac(KEY_SECRET, `${body.order.orderId}|pay_OFF`) }
  const ok = await (await post('/wallet/verify-payment', proof, u)).json()
  assert.equal(ok.balance, before + 220) // Monthly Premium = 220 coins, whatever was paid
  assert.deepEqual([ok.purchase.amount, ok.purchase.listAmount, ok.purchase.offerPercent], [799, 999, 20])
})

test('the biggest matching offer wins; a new-user offer ends after its window; they never add up', async () => {
  const fresh = await h.createUser('off3@example.com')
  const old = await oldUser('off4@example.com')
  assert.equal((await checkout(fresh, 'popular')).body.order.amount, 699) // $9.99 - 30% (new user) beats 10%
  assert.equal((await checkout(old, 'popular')).body.order.amount, 899) // only the 10% for everyone remains
  assert.equal((await checkout(fresh, 'weekly')).body.order.amount, 499) // no offer on this plan: list price
})

test('ended and not-yet-started offers do nothing', async () => {
  const u = await oldUser('off5@example.com')
  assert.equal((await checkout(u, 'small')).body.order.amount, 499) // offer ended a second ago
  assert.equal((await checkout(u, 'value')).body.order.amount, 1999) // offer starts tomorrow
})

test('buying by an offer id works for an eligible user and is refused once it has expired for them', async () => {
  const fresh = await h.createUser('off6@example.com')
  const ok = await checkout(fresh, 'yearly-offer') // $39.99 - 50% = $19.99 (rounded down)
  assert.equal(ok.status, 200)
  assert.equal(ok.body.order.amount, 1999)
  const old = await oldUser('off7@example.com')
  const refused = await checkout(old, 'yearly-offer')
  assert.equal(refused.status, 400)
  assert.equal(refused.body.error.code, 'OFFER_EXPIRED')
  assert.equal((await checkout(old, 'yearly')).body.order.amount, 3999) // the plain plan is still available at the list price
})

test('GET /api/plans and /api/coin-packs show each visitor the offers they get', async () => {
  const fresh = await h.createUser('off8@example.com')
  const old = await oldUser('off9@example.com')
  const plansFor = async (u) => (await (await api('/plans', u ? as(u) : { headers: { authorization: '' } })).json())
  const monthly = (await plansFor(old)).plans.find((p) => p.id === 'monthly')
  assert.equal(monthly.price, 9.99) // the list price stays
  assert.deepEqual([monthly.offer.discountPercent, monthly.offer.original, monthly.offer.price], [20, 9.99, 7.99])
  const popup = (await plansFor(fresh)).offer
  assert.deepEqual([popup.id, popup.name, popup.discountPercent, popup.original, popup.price], ['yearly-offer', 'Yearly Premium', 50, 39.99, 19.99])
  assert.ok(popup.endsAt > Date.now() && popup.endsAt <= Date.now() + DAY) // counts down from the signup time
  assert.equal((await plansFor(old)).offer, null) // too late for the new-user popup offer
  const visitor = await plansFor(null)
  assert.equal(visitor.offer, null)
  assert.equal(visitor.plans.find((p) => p.id === 'monthly').offer.discountPercent, 20) // offers for everyone show without a login
  const packs = (await (await api('/coin-packs', as(fresh))).json()).packs
  assert.equal(packs.find((p) => p.id === 'popular').offer.price, 6.99)
  assert.equal(packs.find((p) => p.id === 'starter').offer, undefined)
})
