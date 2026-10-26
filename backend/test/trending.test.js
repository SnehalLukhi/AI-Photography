/** Trending templates: anyone can read the list, only the admin key can change it. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers')

let app
const KEY = 'admin-secret'
const call = (method, path, body, key = KEY) => fetch(`${app.base}/api${path}`, { method, headers: { 'content-type': 'application/json', ...(key ? { 'x-admin-key': key } : {}) }, body: body ? JSON.stringify(body) : undefined })
const ids = async () => (await (await call('GET', '/trending', null, '')).json()).templateIds

before(async () => { process.env.ADMIN_API_KEY = KEY; app = await h.startApp(require('../src/app')) })
after(async () => { await app.close() })

test('the list is public and starts empty; a newly added template is shown first; adding it again changes nothing', async () => {
  assert.deepEqual(await ids(), [])
  assert.equal((await call('POST', '/admin/trending', { templateId: 'old-money/vintage-sari' })).status, 200)
  await call('POST', '/admin/trending', { templateId: 'cartoon/3d-toon' })
  await call('POST', '/admin/trending', { templateId: 'old-money/vintage-sari' })
  assert.deepEqual(await ids(), ['cartoon/3d-toon', 'old-money/vintage-sari']) // the newest first
})

test('replace sets the order; delete removes one', async () => {
  await call('PUT', '/admin/trending', { templateIds: ['cartoon/3d-toon', 'beard/bandholz', 'old-money/vintage-sari'] })
  assert.deepEqual(await ids(), ['cartoon/3d-toon', 'beard/bandholz', 'old-money/vintage-sari'])
  assert.equal((await call('DELETE', `/admin/trending?templateId=${encodeURIComponent('beard/bandholz')}`)).status, 200)
  assert.deepEqual(await ids(), ['cartoon/3d-toon', 'old-money/vintage-sari'])
})

test('only the admin key may change it; bad ids are refused', async () => {
  assert.equal((await call('POST', '/admin/trending', { templateId: 'a/b' }, '')).status, 401)
  assert.equal((await call('PUT', '/admin/trending', { templateIds: [] }, 'wrong')).status, 401)
  assert.equal((await call('POST', '/admin/trending', { templateId: 'no slash' })).status, 400)
  assert.equal((await call('PUT', '/admin/trending', { templateIds: 'x' })).status, 400)
  assert.equal((await ids()).length, 2)
})

test('catalogue templates: the flag lives on the template, shows in /api/templates, follows the shared order and goes away with a delete', async () => {
  await call('PUT', '/admin/trending', { templateIds: [] })
  const tpl = (id) => ({ id, category_id: 'retro', name: id, preview_url: 'https://cdn.example.com/t.jpg', style_title_prompt: 't', style_desc_prompt: 'd' })
  await call('POST', '/admin/template-categories', { id: 'retro', name: 'Retro', flow: 'photography' })
  await call('POST', '/admin/templates', [tpl('r1'), tpl('r2')])
  await call('POST', '/admin/trending', { templateId: 'cartoon/3d-toon' }) // a bundled (folder) template
  await call('POST', '/admin/trending', { templateId: 'retro/r2' })
  assert.deepEqual(await ids(), ['retro/r2', 'cartoon/3d-toon']) // the newest first
  const listed = (await (await call('GET', '/templates?category=retro', undefined, {})).json()).templates
  assert.deepEqual(listed.map((t) => [t.id, t.trending]), [['r1', false], ['r2', true]]) // still in its own category
  await call('PUT', '/admin/trending', { templateIds: ['retro/r2', 'cartoon/3d-toon', 'retro/r1'] })
  assert.deepEqual(await ids(), ['retro/r2', 'cartoon/3d-toon', 'retro/r1'])
  assert.equal((await call('PUT', '/admin/templates/r1', { trending: false })).status, 200) // the template's own PUT works too
  assert.deepEqual(await ids(), ['retro/r2', 'cartoon/3d-toon'])
  await call('POST', '/admin/templates?upsert=true', tpl('r2')) // re-sent without a flag: still trending
  assert.deepEqual(await ids(), ['retro/r2', 'cartoon/3d-toon'])
  await call('DELETE', '/admin/templates/r2')
  assert.deepEqual(await ids(), ['cartoon/3d-toon'])
})

test('a template without a category goes to the reserved "trending-only" category and is always in Trending', async () => {
  await call('PUT', '/admin/trending', { templateIds: [] })
  const made = await call('POST', '/admin/templates', { id: 'loose1', name: 'Loose', preview_url: 'https://cdn.example.com/l.jpg' }) // no category_id
  assert.equal(made.status, 201)
  const t = (await made.json()).templates[0]
  assert.deepEqual([t.category_id, t.trending, t.active], ['trending-only', true, true])
  assert.deepEqual(await ids(), ['trending-only/loose1'])
  const pub = (await (await call('GET', '/templates', undefined, {})).json()).templates.find((x) => x.id === 'loose1')
  assert.deepEqual([pub.category_id, pub.trending], ['trending-only', true])
})
