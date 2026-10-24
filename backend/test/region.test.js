/** Regional prices: visitors in India see and pay rupees, everyone else dollars. The country comes from the host's header; the Razorpay API is replaced by a stand-in. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const h = require('./helpers')

const KEY_SECRET = 'key-secret'
let app, baseFetch, db
let n = 0
const calls = []
const existingPlans = [{ id: 'plan_WEEKLY_INR_EXISTING', period: 'weekly', interval: 1, item: { name: 'Weekly Premium', amount: 49900, currency: 'INR' } }] // a rupee weekly plan already in Razorpay
const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const IN = { 'x-vercel-ip-country': 'IN' }
const US = { 'x-vercel-ip-country': 'US' }
const get = (path, headers = {}, u) => fetch(`${app.base}/api${path}`, { headers: { ...(u ? { authorization: `Bearer ${u.token}` } : {}), ...headers } })
const checkout = async (u, itemId, headers) => { const r = await fetch(`${app.base}/api/wallet/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${u.token}`, ...headers }, body: JSON.stringify({ itemId }) }); return { status: r.status, body: await r.json() } }

before(async () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_key'
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = 'hook'
  process.env.RAZORPAY_PLAN_MONTHLY = 'plan_MONTHLY_USD'
  process.env.RAZORPAY_PLAN_MONTHLY_INR = 'plan_MONTHLY_INR' // only the monthly plan has a rupee plan
  process.env.RAZORPAY_PLAN_WEEKLY = 'plan_WEEKLY_USD'
  process.env.RAZORPAY_PLAN_YEARLY = 'plan_YEARLY_USD'
  process.env.COIN_COST_PER_GENERATION = '15'
  process.env.SIGNUP_BONUS_COINS = '50'
  const offers = require('../src/config/offers')
  offers.length = 0
  offers.push({ id: 'popular-20', itemId: 'popular', percentOff: 20, audience: 'all' }) // an offer on a coin pack
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    if (!u.startsWith('https://api.razorpay.com/v1/')) return baseFetch(url, init)
    const path = u.slice('https://api.razorpay.com/v1'.length)
    const body = init.body ? JSON.parse(init.body) : null
    calls.push({ path, body })
    const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })
    if (path.startsWith('/plans?')) return json({ items: existingPlans })
    if (path === '/plans') return json({ id: `plan_NEW${++n}`, ...body })
    if (path === '/orders') return json({ id: `order_${++n}`, ...body })
    if (path === '/subscriptions') return json({ id: `sub_${++n}`, ...body })
    return json({}, 404)
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

test('plans: each country sees its own currency (rupees, euros, pounds), converted from dollars and rounded up to a charm price; everyone else dollars', async () => {
  const inPlans = (await (await get('/plans', IN)).json()).plans
  assert.deepEqual(inPlans.map((p) => [p.id, p.price, p.currency]), [['weekly', 499, 'INR'], ['monthly', 999, 'INR'], ['yearly', 3799, 'INR']]) // $4.99 / $9.99 / $39.99 at 1 dollar = 94 rupees, rounded up to x99
  const us = (await (await get('/plans', US)).json()).plans
  assert.deepEqual(us.map((p) => [p.id, p.price, p.currency]), [['weekly', 4.99, 'USD'], ['monthly', 9.99, 'USD'], ['yearly', 39.99, 'USD']])
  const de = (await (await get('/plans', { 'x-vercel-ip-country': 'DE' })).json()).plans
  assert.deepEqual(de.map((p) => [p.price, p.currency]), [[4.99, 'EUR'], [9.99, 'EUR'], [36.99, 'EUR']]) // 4.99 x 0.92 = 4.59 -> 4.99
  assert.equal((await (await get('/plans', { 'x-vercel-ip-country': 'GB' })).json()).plans[1].currency, 'GBP')
  assert.equal((await (await get('/plans', { 'x-vercel-ip-country': 'BR' })).json()).plans[1].currency, 'USD') // no currency of its own: dollars
  const none = (await (await get('/plans')).json()).plans // no country known (local development): DEFAULT_CURRENCY = USD
  assert.equal(none.find((p) => p.id === 'monthly').currency, 'USD')
})

test('coin packs are converted too: $1 = 94 rupees shows 99, $2.99 shows 299; the offer percentage is applied to that price', async () => {
  const inPacks = (await (await get('/coin-packs', IN)).json()).packs
  assert.deepEqual(inPacks.map((p) => [p.id, p.price, p.currency]), [['starter', 299, 'INR'], ['small', 499, 'INR'], ['popular', 999, 'INR'], ['value', 1899, 'INR'], ['mega', 4799, 'INR']])
  assert.deepEqual([inPacks[2].offer.price, inPacks[2].offer.original], [799.2, 999]) // 20% off 999 rupees
  const us = (await (await get('/coin-packs', US)).json()).packs
  assert.deepEqual([us[2].price, us[2].currency, us[2].offer.price], [9.99, 'USD', 7.99])
})

test('checkout charges in the visitor\'s currency: a rupee order is in paise, a dollar order in cents; the browser cannot pick the currency', async () => {
  const u = await h.createUser('region1@example.com')
  const rupees = await checkout(u, 'popular', IN)
  assert.deepEqual([rupees.body.order.currency, rupees.body.order.amount], ['INR', 79920]) // 999 - 20% = 799.20 rupees = 79,920 paise
  assert.equal(calls.filter((c) => c.path === '/orders').at(-1).body.currency, 'INR')
  const dollars = await checkout(u, 'popular', US)
  assert.deepEqual([dollars.body.order.currency, dollars.body.order.amount], ['USD', 799])
  const row = (await db.query('SELECT currency, amount, list_amount FROM payments WHERE order_id = $1', [rupees.body.order.orderId])).rows[0]
  assert.deepEqual({ ...row }, { currency: 'INR', amount: 79920, list_amount: 99900 })
  // the browser's own ?currency / body cannot override the country in production-like requests with a country header... (a header-less local request may use ?currency)
  const forged = await fetch(`${app.base}/api/wallet/checkout`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${u.token}`, ...US }, body: JSON.stringify({ itemId: 'starter', currency: 'INR' }) })
  assert.equal((await forged.json()).order.currency, 'USD')
})

test('a plan is a subscription on the rupee plan for India (the configured id, else one found / created in Razorpay once) and on the dollar plan elsewhere', async () => {
  const u = await h.createUser('region2@example.com')
  const indian = await checkout(u, 'monthly', IN)
  assert.equal(indian.body.order.kind, 'subscription')
  assert.equal(calls.filter((c) => c.path === '/subscriptions').at(-1).body.plan_id, 'plan_MONTHLY_INR')
  await db.query("DELETE FROM subscriptions WHERE user_id = $1", [u.id]) // one live plan at a time: start again
  assert.equal((await checkout(u, 'monthly', US)).status, 200)
  assert.equal(calls.filter((c) => c.path === '/subscriptions').at(-1).body.plan_id, 'plan_MONTHLY_USD')
  await db.query("DELETE FROM subscriptions WHERE user_id = $1", [u.id])
  assert.equal((await checkout(u, 'yearly', IN)).status, 200) // no yearly rupee id configured: created in Razorpay with the rupee price
  assert.match(calls.filter((c) => c.path === '/subscriptions').at(-1).body.plan_id, /^plan_NEW/)
  const made = calls.findLast((c) => c.path === '/plans')
  assert.deepEqual([made.body.period, made.body.item.amount, made.body.item.currency], ['yearly', 379900, 'INR'])
  const before = calls.filter((c) => c.path === '/plans').length
  await db.query("DELETE FROM subscriptions WHERE user_id = $1", [u.id])
  await checkout(u, 'yearly', IN) // remembered: no second plan created
  assert.equal(calls.filter((c) => c.path === '/plans').length, before)
  await db.query("DELETE FROM subscriptions WHERE user_id = $1", [u.id])
  await checkout(u, 'weekly', IN) // an existing rupee plan with the same period and price is reused
  assert.equal(calls.filter((c) => c.path === '/subscriptions').at(-1).body.plan_id, 'plan_WEEKLY_INR_EXISTING')
  assert.equal(calls.filter((c) => c.path === '/plans').length, before)
})

test('what a rupee subscription charge records: the rupee amount, with the regular price in rupees', async () => {
  const u = await h.createUser('region3@example.com')
  const { body } = await checkout(u, 'monthly', IN)
  const subId = body.order.subscriptionId
  const hook = (event) => { const raw = JSON.stringify(event); return fetch(`${app.base}/api/webhooks/razorpay`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '', 'x-razorpay-signature': hmac('hook', raw) }, body: raw }) }
  assert.equal((await hook({ event: 'subscription.charged', payload: { subscription: { entity: { id: subId, current_end: Math.floor(Date.now() / 1000) + 86400 * 30 } }, payment: { entity: { id: 'pay_INR1', amount: 99900, currency: 'INR' } } } })).status, 200)
  const row = (await db.query('SELECT amount, currency, list_amount, offer_id FROM payments WHERE order_id = $1', ['pay_INR1'])).rows[0]
  assert.deepEqual({ ...row }, { amount: 99900, currency: 'INR', list_amount: 99900, offer_id: null }) // list price in rupees, not the dollar price
  const list = (await (await get('/wallet/purchases', {}, u)).json()).purchases
  assert.deepEqual([list[0].currency, list[0].amount, list[0].offerPercent], ['INR', 99900, 0])
})

test('a plan in euros is a subscription on a euro plan found / created in Razorpay with the converted price', async () => {
  const u = await h.createUser('region4@example.com')
  await db.query('DELETE FROM subscriptions WHERE user_id = $1', [u.id])
  const res = await checkout(u, 'yearly', { 'x-vercel-ip-country': 'FR' })
  assert.equal(res.body.order.kind, 'subscription')
  const made = calls.findLast((c) => c.path === '/plans')
  assert.deepEqual([made.body.period, made.body.item.amount, made.body.item.currency], ['yearly', 3699, 'EUR']) // 39.99 x 0.92 = 36.79 -> 36.99
})
