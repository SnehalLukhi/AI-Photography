/** Coins: signup bonus, 15 coins per generation (given back on failure), 402 when empty, redeem codes, plans and the (not yet connected) checkout. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let mock, app, db, wallet, payments
const post = (path, body, token) => fetch(`${app.base}/api${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(body) })
const get = (path, token) => fetch(`${app.base}/api${path}`, { headers: { authorization: token ? `Bearer ${token}` : '' } })

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST') return { json: { task_type: 'async', task_id: 'task_WALLET-001' } }
    return { json: { task_status: 2, data: { url: 'https://example.invalid/a.jpg' } } }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '10'
  process.env.AILAB_POLL_TIMEOUT_MS = '1000'
  process.env.RATE_LIMIT_MAX = '1000'
  process.env.COIN_COST_PER_GENERATION = '15' // the real defaults
  process.env.SIGNUP_BONUS_COINS = '50'
  app = await h.startApp(require('../src/app'))
  db = require('../src/db')
  wallet = require('../src/services/wallet.service')
  payments = require('../src/services/payments.service')
})
after(async () => { await app.close(); await mock.close() })

const newUser = async (email) => {
  const u = await h.createUser(email)
  return { token: u.token, id: u.id, coins: await wallet.balance(u.id) }
}
const generate = async (token, fields = { style_title: 'a', style_desc: 'b' }) => fetch(`${app.base}/api/photos/generate`, {
  method: 'POST', headers: { authorization: `Bearer ${token}` },
  body: h.form({ image: { buffer: await h.solid(300, 400, { r: 9, g: 9, b: 9 }, 'jpeg'), type: 'image/jpeg', filename: 'p.jpg' } }, fields),
})
const coins = async (token) => (await (await get('/wallet', token)).json()).coins

test('a new account gets the 50 free coins; plans are public; wallet needs a login', async () => {
  const u = await newUser('coins1@example.com')
  assert.equal(u.coins, 50)
  assert.equal(await coins(u.token), 50)
  const w = await (await get('/wallet', u.token)).json()
  assert.equal(w.costPerGeneration, 15)
  assert.deepEqual(w.history.map((x) => [x.reason, x.delta]), [['signup_bonus', 50]])

  const plans = await (await get('/plans')).json()
  assert.deepEqual(plans.plans.map((p) => [p.id, p.price, p.currency, p.coins]), [['weekly', 4.99, 'USD', 1100], ['monthly', 9.99, 'USD', 2200], ['yearly', 39.99, 'USD', 27000]])
  assert.equal((await get('/wallet')).status, 401)

  const packs = await (await get('/coin-packs')).json()
  assert.deepEqual(packs.packs.map((p) => [p.id, p.coins, p.price, p.currency]), [['starter', 450, 2.99, 'USD'], ['small', 900, 4.99, 'USD'], ['popular', 1950, 9.99, 'USD'], ['value', 4200, 19.99, 'USD'], ['mega', 10800, 49.99, 'USD']])
  assert.equal(packs.costPerGeneration, 15)
})

test('a generation costs 15 coins; a failed one is refunded; an empty wallet gets 402 before any work is done', async () => {
  const u = await newUser('coins2@example.com')
  assert.equal((await generate(u.token)).status, 200)
  assert.equal(await coins(u.token), 35)

  assert.equal((await generate(u.token, { style_title: 'only a title' })).status, 400) // invalid request
  assert.equal(await coins(u.token), 35) // charged, then given back
  const reasons = (await (await get('/wallet', u.token)).json()).history.map((x) => x.reason)
  assert.deepEqual(reasons.slice(0, 2), ['refund', 'generation'])

  for (let i = 0; i < 2; i++) assert.equal((await generate(u.token)).status, 200)
  assert.equal(await coins(u.token), 5)
  const calls = mock.calls.length
  const broke = await generate(u.token)
  assert.equal(broke.status, 402)
  assert.equal((await broke.json()).error.code, 'INSUFFICIENT_COINS')
  assert.equal(mock.calls.length, calls) // AILabTools was never called
  assert.equal(await coins(u.token), 5)
})

test('redeem codes work once, case-insensitively, and unknown codes are refused', async () => {
  const u = await newUser('coins3@example.com')
  await db.query("INSERT INTO redeem_codes (code, coins) VALUES ('GLY-TEST-0001', 100)")
  const ok = await post('/wallet/redeem', { code: ' gly-test-0001 ' }, u.token)
  assert.equal(ok.status, 200)
  assert.deepEqual(await ok.json(), { success: true, coins: 100, balance: 150 })
  assert.equal((await post('/wallet/redeem', { code: 'GLY-TEST-0001' }, u.token)).status, 404) // already used
  const other = await newUser('coins4@example.com')
  assert.equal((await post('/wallet/redeem', { code: 'GLY-TEST-0001' }, other.token)).status, 404) // by anyone
  assert.equal((await post('/wallet/redeem', { code: 'nope' }, u.token)).status, 404)
  assert.equal((await post('/wallet/redeem', {}, u.token)).status, 404)
  assert.equal(await coins(u.token), 150)
})

test('checkout is refused until a payment gateway is connected; a verified payment credits exactly once', async () => {
  const u = await newUser('coins5@example.com')
  const res = await post('/wallet/checkout', { planId: 'monthly' }, u.token)
  assert.equal(res.status, 503)
  assert.equal((await res.json()).error.code, 'PAYMENTS_NOT_CONFIGURED')
  assert.equal((await post('/wallet/checkout', { planId: 'gold' }, u.token)).status, 400)
  assert.equal((await post('/wallet/checkout', { itemId: 'popular', currency: 'USD' }, u.token)).status, 503) // coin packs too
  assert.equal((await post('/wallet/checkout', { itemId: 'popular', currency: 'INR' }, u.token)).status, 503) // the currency is chosen by the server (from the visitor's country), not by the browser
  assert.equal(await coins(u.token), 50) // nothing was credited for free

  assert.equal(await payments.grantPurchase(u.id, 'weekly', 'pay_123'), true)
  assert.equal(await payments.grantPurchase(u.id, 'weekly', 'pay_123'), false) // same payment again (webhook retry)
  assert.equal(await coins(u.token), 1150)
  assert.equal(await payments.grantPurchase(u.id, 'popular', 'pay_456'), true) // a coin pack: +1950
  assert.equal(await coins(u.token), 3100)
  assert.throws(() => payments.grantPurchase(u.id, 'weekly', ''), { code: 'INVALID_PAYMENT' })
  assert.equal(await wallet.balance(u.id), 3100)
})
