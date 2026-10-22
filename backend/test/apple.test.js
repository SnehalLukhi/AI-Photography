/** "Continue with Apple": Apple's key server is replaced by a stand-in and tokens are signed with a throw-away key (test-only). */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const h = require('./helpers')

const CLIENT_ID = 'com.example.web'
const KID = 'test-key-1'
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 })
let app, baseFetch

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const token = (claims, { key = privateKey, kid = KID, alg = 'RS256' } = {}) => {
  const body = `${b64({ alg, kid })}.${b64({ iss: 'https://appleid.apple.com', aud: CLIENT_ID, exp: Math.floor(Date.now() / 1000) + 600, nonce: 'n-1', sub: 'apple-1', email: 'Ann@Example.com', email_verified: 'true', ...claims })}`
  return `${body}.${crypto.sign('RSA-SHA256', Buffer.from(body), key).toString('base64url')}`
}

before(async () => {
  process.env.APPLE_CLIENT_ID = CLIENT_ID
  process.env.SIGNUP_BONUS_COINS = '50'
  app = await h.startApp(require('../src/app'))
  baseFetch = globalThis.fetch
  globalThis.fetch = (url, init) => String(url) === 'https://appleid.apple.com/auth/keys'
    ? Promise.resolve(new Response(JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' }] }), { headers: { 'content-type': 'application/json' } }))
    : baseFetch(url, init)
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

const apple = (body) => fetch(`${app.base}/api/auth/apple`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '' }, body: JSON.stringify(body) })

test('a valid Apple token signs up a new user (email lower-cased, name from the first sign-in, free coins) and logs in again as the same user', async () => {
  const res = await apple({ identityToken: token({}), nonce: 'n-1', name: 'Ann Apple' })
  assert.equal(res.status, 200)
  const { token: jwt, user } = await res.json()
  assert.equal(user.email, 'ann@example.com')
  assert.equal(user.name, 'Ann Apple')
  assert.equal(user.coins, 50)
  const me = await (await fetch(`${app.base}/api/auth/me`, { headers: { authorization: `Bearer ${jwt}` } })).json()
  assert.equal(me.user.id, user.id)

  const again = await (await apple({ identityToken: token({}), nonce: 'n-1' })).json() // later sign-ins carry no name
  assert.equal(again.user.id, user.id)
  assert.equal(again.user.coins, 50) // no second signup bonus
})

test('the same email as an existing account links to it', async () => {
  const existing = await h.createUser('linked@example.com')
  const body = await (await apple({ identityToken: token({ sub: 'apple-2', email: 'linked@example.com' }), nonce: 'n-1' })).json()
  assert.equal(body.user.id, existing.id)
})

test('forged, foreign, expired, replayed and unverified tokens are refused', async () => {
  const bad = [
    ['signed by another key', token({}, { key: other.privateKey })],
    ['unknown key id', token({}, { kid: 'nope' })],
    ['issued to another app', token({ aud: 'com.someone.else' })],
    ['wrong issuer', token({ iss: 'https://evil.example' })],
    ['expired', token({ exp: Math.floor(Date.now() / 1000) - 10 })],
    ['email not verified', token({ email_verified: 'false' })],
    ['not a token', 'garbage'],
  ]
  for (const [why, identityToken] of bad) {
    const res = await apple({ identityToken, nonce: 'n-1' })
    assert.equal(res.status, 401, why)
    assert.equal((await res.json()).error.code, 'INVALID_APPLE_TOKEN', why)
  }
  assert.equal((await apple({ identityToken: token({}), nonce: 'other-nonce' })).status, 401) // token of a different sign-in
  assert.equal((await apple({ identityToken: token({}) })).status, 401) // no nonce
  assert.equal((await apple({})).status, 401)
})
