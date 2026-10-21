/** "Continue with Google": Google's servers are replaced by a stand-in (test-only). The token is only trusted when Google says it was issued to OUR client id. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

const CLIENT_ID = 'test-client.apps.googleusercontent.com'
let app, baseFetch
const profiles = {
  good: { sub: 'g-1', email: 'Gina@Example.com', email_verified: true, name: 'Gina G' },
  unverified: { sub: 'g-2', email: 'nope@example.com', email_verified: false, name: 'N' },
  existing: { sub: 'g-3', email: 'tester@example.com', email_verified: true, name: 'Tester' }, // same email as the helper's password account
}
const googleStandIn = (url, init = {}) => {
  const u = String(url)
  const reply = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }))
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const t = new URL(u).searchParams.get('access_token')
    if (t === 'foreign') return reply(200, { aud: 'someone-elses-app' }) // valid Google token, but for another app
    return t in profiles ? reply(200, { aud: CLIENT_ID }) : reply(400, { error: 'invalid_token' })
  }
  if (u.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) return reply(200, profiles[/Bearer (.+)/.exec(new Headers(init.headers).get('authorization'))[1]])
  return baseFetch(url, init)
}

before(async () => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID
  process.env.COIN_COST_PER_GENERATION = '15'
  process.env.SIGNUP_BONUS_COINS = '50'
  app = await h.startApp(require('../src/app'))
  baseFetch = globalThis.fetch
  globalThis.fetch = googleStandIn
})
after(async () => { globalThis.fetch = baseFetch; await app.close() })

const google = (accessToken) => fetch(`${app.base}/api/auth/google`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '' }, body: JSON.stringify({ accessToken }) })

test('a verified Google account signs up (email lower-cased, free coins) and logs in again as the same user', async () => {
  const first = await google('good')
  assert.equal(first.status, 200)
  const { token, user } = await first.json()
  assert.equal(user.email, 'gina@example.com')
  assert.equal(user.name, 'Gina G')
  assert.equal(user.coins, 50)
  const me = await (await fetch(`${app.base}/api/auth/me`, { headers: { authorization: `Bearer ${token}` } })).json()
  assert.equal(me.user.id, user.id)

  const again = await (await google('good')).json()
  assert.equal(again.user.id, user.id) // same account, no second signup bonus
  assert.equal(again.user.coins, 50)
})

test('the same email as a password account links to it instead of creating a duplicate', async () => {
  const body = await (await google('existing')).json()
  assert.equal(body.user.email, 'tester@example.com')
  assert.ok(body.user.coins >= 50)
})

test('Google-only accounts have no password; bad, foreign and unverified tokens are refused', async () => {
  const login = await fetch(`${app.base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: '' }, body: JSON.stringify({ email: 'gina@example.com', password: '' }) })
  assert.equal(login.status, 401)
  for (const t of ['garbage', 'foreign', 'unverified']) {
    const res = await google(t)
    assert.equal(res.status, 401, t)
    assert.equal((await res.json()).error.code, 'INVALID_GOOGLE_TOKEN')
  }
  assert.equal((await google('')).status, 400)
  assert.equal((await google(undefined)).status, 400)
})
