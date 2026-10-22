/** Razorpay: the Razorpay API is replaced by a stand-in (test-only); signatures are computed exactly like Razorpay does. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const h = require('./helpers')

const KEY_ID = 'rzp_test_key'
const KEY_SECRET = 'key-secret'
const WEBHOOK_SECRET = 'hook-secret'
let app, baseFetch, db, wallet
let orderCount = 0
const orders = {}

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex')
const post = (path, body, token) => fetch(`${app.base}/api${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(body) })
const hook = (event, signature) => {
  const raw = JSON.stringify(event)
  return fetch(`${app.base}/api/webhooks/razorpay`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '', 'x-razorpay-signature': signature ?? hmac(WEBHOOK_SECRET, raw) }, body: raw })
}
const captured = (order, paymentId, over = {}) => ({ event: 'payment.captured', payload: { payment: { entity: { id: paymentId, order_id: order.orderId, amount: order.amount, currency: order.currency, ...over } } } })

before(async () => {
  process.env.RAZORPAY_KEY_ID = KEY_ID
  process.env.RAZORPAY_KEY_SECRET = KEY_SECRET
  process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET
  process.env.COIN_COST_PER_GENERATION = '15'
  process.env.SIGNUP_BONUS_COINS = '50'
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  wallet = require('../src/services/wallet.service')
  baseFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.razorpay.com/v1/orders') return baseFetch(url, init)
    assert.equal(init.headers.Authorization, `Basic ${Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64')}`)
    const body = JSON.parse(init.body)
    const order = { id: `order_${++orderCount}`, ...body }
    orders[order.id] = order
    return new Response(JSON.stringify(order), { headers: { 'content-type': 'application/json' } })
  }
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

const checkout = async (user, itemId) => {
  const res = await post('/wallet/checkout', { itemId }, user.token)
  assert.equal(res.status, 200)
  return (await res.json()).order
}

test('checkout creates a Razorpay order priced by the server and remembers it', async () => {
  const u = await h.createUser('pay1@example.com')
  const order = await checkout(u, 'popular')
  assert.equal(order.amount, 999) // $9.99 in cents - from OUR price list
  assert.equal(order.currency, 'USD')
  assert.equal(order.keyId, KEY_ID)
  assert.ok(!JSON.stringify(order).includes(KEY_SECRET))
  assert.equal(orders[order.orderId].notes.item_id, 'popular')
  const row = (await db.query('SELECT user_id, item_id, status FROM payments WHERE order_id = $1', [order.orderId])).rows[0]
  assert.deepEqual({ ...row }, { user_id: u.id, item_id: 'popular', status: 'created' })
  assert.equal((await post('/wallet/checkout', { itemId: 'gold' }, u.token)).status, 400)
  assert.equal((await post('/wallet/checkout', { itemId: 'popular' })).status, 401)
})

test('a correct signature credits the coins once; a repeat or the webhook adds nothing more', async () => {
  const u = await h.createUser('pay2@example.com')
  const before = await wallet.balance(u.id)
  const order = await checkout(u, 'popular') // 195 coins
  const proof = { orderId: order.orderId, paymentId: 'pay_AAA', signature: hmac(KEY_SECRET, `${order.orderId}|pay_AAA`) }
  const ok = await post('/wallet/verify-payment', proof, u.token)
  assert.equal(ok.status, 200)
  const body = await ok.json()
  assert.deepEqual({ ...body, purchase: undefined }, { success: true, credited: true, balance: before + 195, purchase: undefined })
  assert.deepEqual({ name: body.purchase.name, kind: body.purchase.kind, coins: body.purchase.coins, amount: body.purchase.amount, currency: body.purchase.currency, paymentId: body.purchase.paymentId },
    { name: 'Popular', kind: 'pack', coins: 195, amount: 999, currency: 'USD', paymentId: 'pay_AAA' })
  const again = await (await post('/wallet/verify-payment', proof, u.token)).json()
  assert.deepEqual([again.credited, again.balance, again.purchase.paymentId], [false, before + 195, 'pay_AAA'])
  const mine = (await (await fetch(`${app.base}/api/wallet/purchases`, { headers: { authorization: `Bearer ${u.token}` } })).json()).purchases
  assert.equal(mine.length, 1) // one purchase, however many times it was confirmed
  assert.equal(mine[0].name, 'Popular')
  assert.ok(!Number.isNaN(Date.parse(mine[0].paidAt)))
  assert.equal((await (await fetch(`${app.base}/api/wallet/purchases`, { headers: { authorization: `Bearer ${(await h.createUser('nobuy@example.com')).token}` } })).json()).purchases.length, 0) // nobody else sees it
  assert.equal((await fetch(`${app.base}/api/wallet/purchases`, { headers: { authorization: '' } })).status, 401)
  assert.equal((await hook(captured(order, 'pay_AAA'))).status, 200)
  assert.equal(await wallet.balance(u.id), before + 195) // still once
  assert.equal((await (await db.query("SELECT COUNT(*)::int AS n FROM coin_ledger WHERE user_id = $1 AND reason = 'purchase'", [u.id])).rows[0]).n, 1)
})

test('forged proofs and other users\' orders are refused', async () => {
  const u = await h.createUser('pay3@example.com')
  const thief = await h.createUser('thief@example.com')
  const order = await checkout(u, 'starter')
  const good = { orderId: order.orderId, paymentId: 'pay_BBB', signature: hmac(KEY_SECRET, `${order.orderId}|pay_BBB`) }
  assert.equal((await post('/wallet/verify-payment', { ...good, signature: hmac('wrong', `${order.orderId}|pay_BBB`) }, u.token)).status, 400)
  assert.equal((await post('/wallet/verify-payment', { ...good, paymentId: 'pay_OTHER' }, u.token)).status, 400) // signature is for another payment
  assert.equal((await post('/wallet/verify-payment', { orderId: order.orderId }, u.token)).status, 400)
  assert.equal((await post('/wallet/verify-payment', good, thief.token)).status, 404) // valid proof, but not the thief's order
  assert.equal(await wallet.balance(thief.id), 50)
  assert.equal(await wallet.balance(u.id), 50) // nothing credited by any of the above
})

test('the webhook credits a payment even if the tab was closed; bad signatures, wrong amounts and unknown orders do nothing', async () => {
  const u = await h.createUser('pay4@example.com')
  const order = await checkout(u, 'small') // 90 coins
  assert.equal((await hook(captured(order, 'pay_CCC'), 'f'.repeat(64))).status, 400)
  assert.equal((await hook(captured(order, 'pay_CCC'), 'short')).status, 400)
  assert.equal((await hook(captured(order, 'pay_CCC', { amount: 1 }))).status, 200) // signed, but the amount is not the order's
  assert.equal((await hook(captured({ orderId: 'order_unknown', amount: 499, currency: 'USD' }, 'pay_DDD'))).status, 200)
  assert.equal((await hook({ event: 'payment.failed', payload: {} })).status, 200)
  assert.equal(await wallet.balance(u.id), 50)
  assert.equal((await hook(captured(order, 'pay_CCC'))).status, 200)
  assert.equal(await wallet.balance(u.id), 140)
  assert.equal((await hook(captured(order, 'pay_CCC'))).status, 200) // Razorpay retry
  assert.equal(await wallet.balance(u.id), 140)
})
