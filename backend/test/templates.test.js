/** Template catalogue: public read, admin-key protected writes, prompts optional except for the photography flow, bulk add across categories. */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const h = require('./helpers') // blanks ADMIN_API_KEY, so the key is set in before()

let app
const admin = { 'content-type': 'application/json', 'x-admin-key': 'admin-secret' }
// the body is always read (an unread response keeps its connection open and the server could not close)
const call = async (method, path, body, headers = admin) => {
  const res = await fetch(`${app.base}/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const text = await res.text()
  return { status: res.status, json: async () => JSON.parse(text) }
}
const url = 'https://cdn.example.com/t.jpg'
before(async () => {
  process.env.ADMIN_API_KEY = 'admin-secret'
  app = await h.startApp(require('../src/app'))
  await call('POST', '/admin/template-categories', { id: 'retro', name: 'Retro', flow: 'photography' })
  await call('POST', '/admin/template-categories', { id: 'toon', name: 'Toon', flow: 'cartoon' })
  await call('POST', '/admin/template-categories', { id: 'hair', name: 'Hair', flow: 'hairstyle' })
})
after(async () => { await app.close() })

test('admin routes need the x-admin-key header', async () => {
  assert.equal((await call('POST', '/admin/templates', [], {})).status, 401)
  assert.equal((await call('POST', '/admin/templates', [], { 'content-type': 'application/json', 'x-admin-key': 'wrong' })).status, 401)
  assert.equal((await call('GET', '/templates', undefined, {})).status, 200) // public read
})

test('photography needs both prompts, cartoon and others do not', async () => {
  const noPrompt = await call('POST', '/admin/templates', { id: 'p1', category_id: 'retro', name: 'P1', preview_url: url })
  assert.equal(noPrompt.status, 400)
  const cartoon = await call('POST', '/admin/templates', { id: 'anime', category_id: 'toon', name: 'Anime', preview_url: url })
  assert.equal(cartoon.status, 201)
  assert.equal((await call('POST', '/admin/templates', { id: 'not_a_style', category_id: 'toon', name: 'X', preview_url: url })).status, 400)
  assert.equal((await call('POST', '/admin/templates', { id: 'h1', category_id: 'hair', name: 'H', preview_url: url })).status, 400) // api_value missing
  assert.equal((await call('POST', '/admin/templates', { id: 'h1', category_id: 'hair', name: 'H', preview_url: url, api_value: 'BuzzCut' })).status, 201)
})

test('bulk add: several templates with different prompts in different categories, all or nothing', async () => {
  const good = (id, category_id) => ({ id, category_id, name: id, preview_url: '/images/explore/x/a.jpg', style_title_prompt: `title ${id}`, style_desc_prompt: `desc ${id}` })
  const res = await call('POST', '/admin/templates', [good('b1', 'retro'), good('b2', 'retro'), { id: 'pixar', category_id: 'toon', name: 'Pixar', preview_url: url }])
  assert.equal(res.status, 201)
  assert.equal((await res.json()).templates.length, 3)
  const bad = await call('POST', '/admin/templates', [good('b3', 'retro'), { id: 'b4', category_id: 'retro', name: 'no prompts', preview_url: url }])
  assert.equal(bad.status, 400)
  const list = (await (await call('GET', '/templates?category=retro', undefined, {})).json()).templates.map((t) => t.id)
  assert.deepEqual(list.sort(), ['b1', 'b2']) // b3 was rolled back
  assert.equal((await call('POST', '/admin/templates', good('b1', 'retro'))).status, 409)
  assert.equal((await call('POST', '/admin/templates?upsert=true', { ...good('b1', 'retro'), name: 'Renamed' })).status, 201)
  assert.equal((await call('POST', '/admin/templates', good('zz', 'nope'))).status, 404)
})

test('update and delete', async () => {
  const put = await call('PUT', '/admin/templates/b2', { name: 'Second' })
  assert.equal((await put.json()).template.name, 'Second')
  assert.equal((await call('PUT', '/admin/templates/b2', { style_title_prompt: '' })).status, 400) // photography keeps its prompts
  assert.equal((await call('DELETE', '/admin/templates/b2')).status, 200)
  assert.equal((await call('DELETE', '/admin/templates/b2')).status, 404)
})

test('seed script builds templates from the bundled JSON and photos', () => {
  const { buildSeed } = require('../scripts/seed-templates')
  const { categories, templates } = buildSeed()
  assert.ok(categories.length >= 10)
  const photography = new Set(categories.filter((c) => c.flow === 'photography').map((c) => c.id))
  assert.ok(templates.filter((t) => photography.has(t.category_id)).every((t) => t.style_title_prompt && t.style_desc_prompt))
})

test('multipart: the picture is stored in Spaces and its URL becomes preview_url', async () => {
  const storage = require('../src/services/storage.service')
  const put = []
  const real = { isConfigured: storage.isConfigured, putImage: storage.putImage, deleteObject: storage.deleteObject }
  storage.isConfigured = () => true
  storage.putImage = async (key, body, type) => { put.push({ key, size: body.length, type }) }
  storage.deleteObject = async (key) => { put.push({ deleted: key }) }
  const post = async (fields, file, path = '/admin/templates', method = 'POST') => {
    const f = new FormData()
    for (const [k, v] of Object.entries(fields)) f.append(k, v)
    if (file) f.append('image', new Blob([file.buffer], { type: file.type }), file.name)
    const res = await fetch(`${app.base}/api${path}`, { method, headers: { 'x-admin-key': 'admin-secret' }, body: f })
    const text = await res.text()
    return { status: res.status, body: JSON.parse(text) }
  }
  try {
    const png = { buffer: await h.solid(40, 60, { r: 200, g: 20, b: 20 }), type: 'image/png', name: 'a.png' }
    const ok = await post({ id: 'form1', category_id: 'retro', name: 'Form One', style_title_prompt: 'title', style_desc_prompt: 'desc', cost_coins: '20', sort_order: '3', style_unused: '' }, png)
    assert.equal(ok.status, 201)
    const t = ok.body.templates[0]
    assert.match(t.preview_url, /templates\/retro\/form1-[0-9a-f]{8}\.png$/)
    assert.equal(t.cost_coins, 20)
    assert.equal(put[0].type, 'image/png')
    // cartoon: no prompt needed
    assert.equal((await post({ id: 'anime', category_id: 'toon', name: 'Anime2' }, png)).status, 409) // exists from an earlier test; the picture is removed again
    assert.ok(put.some((p) => p.deleted))
    // not an image / photography without prompts: nothing is kept
    assert.equal((await post({ id: 'form2', category_id: 'retro', name: 'F2', style_title_prompt: 't', style_desc_prompt: 'd' }, { buffer: Buffer.from('not an image'), type: 'image/png', name: 'x.png' })).status, 422)
    const noPrompt = await post({ id: 'form3', category_id: 'retro', name: 'F3' }, png)
    assert.equal(noPrompt.status, 400)
    assert.equal((await post({ id: 'form4', category_id: 'retro', name: 'F4', style_title_prompt: 't', style_desc_prompt: 'd' }, { buffer: png.buffer, type: 'text/plain', name: 'x.txt' })).status, 415)
    // PUT with a new picture
    const upd = await post({ name: 'Form One v2' }, png, '/admin/templates/form1', 'PUT')
    assert.equal(upd.status, 200)
    assert.equal(upd.body.template.name, 'Form One v2')
    assert.notEqual(upd.body.template.preview_url, t.preview_url)
    // storage not configured: clear 503
    storage.isConfigured = () => false
    assert.equal((await post({ id: 'form5', category_id: 'retro', name: 'F5', style_title_prompt: 't', style_desc_prompt: 'd' }, png)).status, 503)
  } finally {
    Object.assign(storage, real)
  }
})

test('prompts of any length are stored and returned complete (no 500 / 1000 character cut)', async () => {
  const title = `T${'x'.repeat(2999)}`, desc = `D${'y '.repeat(5000)}end`
  const res = await call('POST', '/admin/templates', { id: 'long1', category_id: 'retro', name: 'Long', preview_url: url, style_title_prompt: title, style_desc_prompt: desc })
  assert.equal(res.status, 201)
  const get = async () => (await (await call('GET', '/templates?category=retro', undefined, {})).json()).templates.find((t) => t.id === 'long1')
  assert.equal((await get()).style_title_prompt, title)
  assert.equal((await get()).style_desc_prompt, desc)
  const longer = `${desc} and more ${'z'.repeat(4000)}`
  assert.equal((await call('PUT', '/admin/templates/long1', { style_desc_prompt: longer })).status, 200) // edit keeps it whole too
  assert.equal((await get()).style_desc_prompt, longer)
})
