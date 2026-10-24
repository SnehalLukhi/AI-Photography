/** Admin dashboard API: numbers, people and the catalogue (all behind the admin key). */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app, db
const H = { 'content-type': 'application/json', 'x-admin-key': 'admin-secret' }
const call = async (method, path, body, headers = H) => {
  const res = await fetch(`${app.base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  return { status: res.status, json: () => JSON.parse(text) }
}
before(async () => { process.env.ADMIN_API_KEY = 'admin-secret'; app = await h.startApp(require('../src/app')); db = require('../src/db') })
after(async () => { await app.close() })

test('every admin read needs the key', async () => {
  for (const p of ['/admin/ping', '/admin/stats', '/admin/users', '/admin/subscriptions', '/admin/catalogue']) assert.equal((await call('GET', p, undefined, {})).status, 401, p)
  assert.equal((await call('GET', '/admin/ping')).status, 200)
})

test('stats, users and subscriptions show who joined and who pays for what', async () => {
  const a = await h.createUser('ann@example.com')
  await h.createUser('bob@example.com')
  await db.query("INSERT INTO subscriptions (subscription_id, user_id, item_id, status, paid_count, current_end) VALUES ('sub_A', $1, 'monthly', 'active', 2, now() + interval '20 days')", [a.id])
  await db.query("INSERT INTO payments (order_id, user_id, item_id, amount, currency, status, subscription_id, paid_at) VALUES ('pay_1', $1, 'monthly', 999, 'USD', 'paid', 'sub_A', now())", [a.id])
  const stats = (await call('GET', '/admin/stats')).json()
  assert.equal(stats.users.total >= 2, true)
  assert.equal(stats.users.today >= 2, true)
  assert.equal(stats.signups.length, 30)
  assert.deepEqual(stats.subscribers.byPlan, [{ id: 'monthly', name: 'Monthly Premium', count: 1 }])
  assert.deepEqual(stats.revenue, [{ currency: 'USD', total: 999, payments: 1 }])
  const users = (await call('GET', '/admin/users?q=ann')).json()
  assert.equal(users.total, 1)
  assert.deepEqual([users.users[0].email, users.users[0].plan, users.users[0].plan_status], ['ann@example.com', 'Monthly Premium', 'active'])
  const bob = (await call('GET', '/admin/users?q=bob')).json().users[0]
  assert.equal(bob.plan, null)
  const subs = (await call('GET', '/admin/subscriptions?status=current')).json()
  assert.deepEqual(subs.subscriptions.map((s) => [s.email, s.plan, s.status, s.payments, s.paid_total, s.currency, s.current]), [['ann@example.com', 'Monthly Premium', 'active', 2, 999, 'USD', true]])
  assert.equal((await call('GET', '/admin/subscriptions?status=halted')).json().total, 0)
})

test('categories can be changed and deleted; one with templates needs cascade', async () => {
  await call('POST', '/admin/template-categories', { id: 'c1', name: 'C1', flow: 'photography' })
  await call('POST', '/admin/templates', { id: 'c1t', category_id: 'c1', name: 'T', preview_url: 'https://x.test/a.jpg', style_title_prompt: 't', style_desc_prompt: 'd' })
  assert.equal((await call('PUT', '/admin/template-categories/c1', { name: 'Renamed' })).json().category.name, 'Renamed')
  assert.equal((await call('PUT', '/admin/template-categories/c1', { flow: 'beard' })).status, 409) // it has templates
  assert.equal((await call('DELETE', '/admin/template-categories/c1')).status, 409)
  const cat = (await call('GET', '/admin/catalogue')).json()
  assert.equal(cat.categories.find((c) => c.id === 'c1').templates, 1)
  assert.equal((await call('DELETE', '/admin/template-categories/c1?cascade=true')).json().deletedTemplates, 1)
  assert.equal((await call('GET', '/admin/catalogue')).json().templates.some((t) => t.id === 'c1t'), false)
  assert.equal((await call('DELETE', '/admin/template-categories/c1')).status, 404)
})

const api = (method, path, body, headers) => fetch(`${app.base}/api${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
const signIn = async (username, password) => api('POST', '/admin/login', { username, password })

test('admins are created with the API: the first with the static key, then by a signed-in admin; passwords are stored hashed', async () => {
  assert.equal((await api('POST', '/admin/admins', { username: 'boss', password: 'correct horse battery' })).status, 401) // nobody signed in
  const made = await api('POST', '/admin/admins', { username: 'Boss', password: 'correct horse battery' }, H)
  assert.equal(made.status, 201)
  assert.equal((await made.json()).admin.username, 'boss')
  assert.equal((await api('POST', '/admin/admins', { username: 'boss', password: 'another long one' }, H)).status, 409)
  assert.equal((await api('POST', '/admin/admins', { username: 'x', password: 'correct horse battery' }, H)).status, 400) // user name too short
  assert.equal((await api('POST', '/admin/admins', { username: 'okname', password: 'short' }, H)).status, 400)
  const row = (await db.query("SELECT password_hash FROM admin_users WHERE username = 'boss'")).rows[0]
  assert.match(row.password_hash, /^scrypt\$/)
  assert.equal(row.password_hash.includes('correct horse'), false)

  assert.equal((await signIn('boss', 'wrong password!')).status, 401)
  assert.equal((await signIn('nobody', 'correct horse battery')).status, 401)
  const ok = await signIn('BOSS', 'correct horse battery') // the user name ignores capitals
  assert.equal(ok.status, 200)
  const { token, expiresAt } = await ok.json()
  assert.ok(expiresAt > Date.now())
  const withToken = (t, path = '/admin/stats') => fetch(`${app.base}/api${path}`, { headers: { authorization: `Bearer ${t}` } })
  assert.equal((await withToken(token)).status, 200)
  assert.equal((await withToken(`${token}x`)).status, 401) // tampered
  const [tag, , sig] = token.split('.')
  const forged = `${tag}.${Buffer.from(JSON.stringify({ k: 'db', i: 'x', u: 'boss', exp: 9999999999 })).toString('base64url')}.${sig}`
  assert.equal((await withToken(forged)).status, 401)

  // a signed-in admin creates another admin, lists them, and cannot delete or switch off themself
  const second = await (await api('POST', '/admin/admins', { username: 'helper', password: 'helper password 1' }, { authorization: `Bearer ${token}` })).json()
  const list = await (await withToken(token, '/admin/admins')).json()
  assert.deepEqual(list.admins.map((a) => a.username), ['boss', 'helper'])
  assert.equal(JSON.stringify(list).includes('scrypt'), false) // hashes never leave the server
  assert.equal((await api('DELETE', `/admin/admins/${list.you}`, undefined, { authorization: `Bearer ${token}` })).status, 400)
  assert.equal((await api('PUT', `/admin/admins/${list.you}`, { active: false }, { authorization: `Bearer ${token}` })).status, 400)

  // a new password ends the old sessions at once and the old password stops working
  const helperToken = (await (await signIn('helper', 'helper password 1')).json()).token
  assert.equal((await withToken(helperToken)).status, 200)
  assert.equal((await api('PUT', `/admin/admins/${second.admin.id}`, { password: 'brand new password' }, { authorization: `Bearer ${token}` })).status, 200)
  assert.equal((await withToken(helperToken)).status, 401)
  assert.equal((await signIn('helper', 'helper password 1')).status, 401)
  const again = (await (await signIn('helper', 'brand new password')).json()).token
  // switching off ends the session; delete removes the admin
  await api('PUT', `/admin/admins/${second.admin.id}`, { active: false }, { authorization: `Bearer ${token}` })
  assert.equal((await withToken(again)).status, 401)
  assert.equal((await signIn('helper', 'brand new password')).status, 401)
  assert.equal((await api('DELETE', `/admin/admins/${second.admin.id}`, undefined, { authorization: `Bearer ${token}` })).status, 200)
  assert.equal((await api('DELETE', `/admin/admins/${second.admin.id}`, undefined, { authorization: `Bearer ${token}` })).status, 404)
  assert.equal((await fetch(`${app.base}/api/admin/stats`, { headers: H })).status, 200) // the static key still works
})

test('an admin from the environment (ADMIN_USERNAME / ADMIN_PASSWORD) can sign in too; an expired token is refused', async () => {
  const env = require('../src/config/env')
  env.adminUsername = 'envboss'; env.adminPassword = 'env password long'
  const ok = await signIn('envboss', 'env password long')
  assert.equal(ok.status, 200)
  assert.equal((await fetch(`${app.base}/api/admin/stats`, { headers: { authorization: `Bearer ${(await ok.json()).token}` } })).status, 200)
  env.adminTokenHours = -1
  const old = await (await signIn('envboss', 'env password long')).json()
  env.adminTokenHours = 12
  assert.equal((await fetch(`${app.base}/api/admin/stats`, { headers: { authorization: `Bearer ${old.token}` } })).status, 401)
  env.adminPassword = 'changed password!'
  assert.equal((await signIn('envboss', 'env password long')).status, 401)
})
