/** Liked templates: saved per user, no duplicates, survive a new login, private to each user. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app
const call = (method, path, token, body) => fetch(`${app.base}/api${path}`, { method, headers: { 'content-type': 'application/json', authorization: token ? `Bearer ${token}` : '' }, body: body ? JSON.stringify(body) : undefined })
before(async () => { app = await h.startApp(require('../src/app')) })
after(async () => { await app.close() })

test('like / duplicate like / list / unlike, per user', async () => {
  const a = await h.createUser('fav-a@example.com')
  const b = await h.createUser('fav-b@example.com')
  assert.equal((await call('GET', '/favorites')).status, 401)
  const id = 'cartoon/3d-toon'
  assert.equal((await call('POST', '/favorites', a.token, { templateId: id })).status, 201)
  assert.equal((await call('POST', '/favorites', a.token, { templateId: id })).status, 201) // again: still one row
  assert.deepEqual((await (await call('GET', '/favorites', a.token)).json()).favorites, [id])
  assert.deepEqual((await (await call('GET', '/favorites', b.token)).json()).favorites, []) // private to the user
  assert.equal((await call('POST', '/favorites', a.token, {})).status, 400)
  assert.equal((await call('DELETE', `/favorites?templateId=${encodeURIComponent(id)}`, a.token)).status, 200)
  assert.deepEqual((await (await call('GET', '/favorites', a.token)).json()).favorites, [])
})
