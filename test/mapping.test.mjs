/**
 * Template -> JSON -> request mapping audit. For every category that has its own original JSON file in src/data/ it checks that
 *   - every template image of the category is matched to its own JSON entry (and every JSON entry is used exactly once),
 *   - the outgoing request carries the EXACT values of that entry: style_title / style_desc (+ image_size) for the AI Photography API,
 *     or the entry's `id` as `type` for Cartoon Yourself - and no other fields,
 *   - an image of a catalogue category that has no JSON entry is reported as an error (never matched to another template),
 *   - categories without a JSON catalogue get no generation data,
 *   - the JSON prompts fit the API limits, so the backend never truncates or rejects them.
 * The app code is loaded through Vite (same plugins as the real app). `fetch` is replaced by a recorder: NO request ever leaves the machine.
 *
 * Run:  npm run test:mapping
 */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { createServer } from 'vite'

const root = path.resolve(import.meta.dirname, '..')
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data', f), 'utf8')).categories.flatMap((c) => c.templates)
const require = createRequire(import.meta.url)

// category tab id (src/data/templates.js) -> its original JSON file and API contract
const CATALOGUES = [
  { tab: '80s-and-90s', file: '80s-90s_templates.json', api: 'photography', folder: '/explore/80&90/' },
  { tab: 'old-money', file: 'old-money_templates.json', api: 'photography', folder: '/explore/old-money/' },
  { tab: 'linkedin-headshot', file: 'linkedin-headshot_templates.json', api: 'photography', folder: '/explore/Linkedin Headshot/' },
  { tab: 'top-carousel', file: 'top-carousel_templates.json', api: 'photography', folder: '/explore/Top Carousel/' },
  { tab: 'cartoon', file: 'cartoon-yourself_templates.json', api: 'cartoon', folder: '/explore/cartoon/' },
]
const NO_CATALOGUE_TABS = [] // every category with template photos now has a catalogue (Hairstyle: ai-hairstyle-changer_templates.json)

let vite, ai, T
const calls = []
const realFetch = globalThis.fetch

before(async () => {
  vite = await createServer({ root, configFile: path.join(root, 'vite.config.js'), server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' })
  ai = await vite.ssrLoadModule('/src/lib/aiPhotography.js')
  T = await vite.ssrLoadModule('/src/data/templates.js')
  globalThis.fetch = async (url, init) => { // recorder: nothing is sent anywhere
    const fields = {}
    for (const [k, v] of init.body.entries()) fields[k] = v instanceof File ? `[file ${v.name} ${v.type}]` : v
    calls.push({ url: String(url), method: init.method, fields })
    return new Response(JSON.stringify({ success: true, status: 'succeeded', images: ['https://example.invalid/out.png'] }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
})
after(async () => { globalThis.fetch = realFetch; await vite.close() })

const photo = () => new File([Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], 'me.jpg', { type: 'image/jpeg' })
const decode = (s) => { try { return decodeURIComponent(s) } catch { return s } }

for (const cat of CATALOGUES) {
  test(`${cat.tab}: every template image has its own JSON entry, and every JSON entry has an image`, () => {
    const json = read(cat.file)
    const items = T.categoryItems(cat.tab)
    assert.ok(items.length > 0, 'the category has template images')
    const used = new Map()
    for (const t of items) {
      assert.ok(decode(t.image).includes(cat.folder), `${t.name}: image is in ${cat.folder}`)
      const info = ai.promptFor(t)
      assert.ok(info && !info.error, `${t.name}: no JSON entry matched (${info?.error})`)
      const entry = json.find((e) => e.id === info.id)
      assert.ok(entry, `${t.name}: matched id ${info.id} is not in ${cat.file}`)
      used.set(entry.id, [...(used.get(entry.id) || []), t.name])
    }
    for (const [id, names] of used) assert.equal(names.length, 1, `JSON entry ${id} is used by more than one template: ${names}`)
    assert.deepEqual(json.map((e) => e.id).filter((id) => !used.has(id)), [], 'JSON entries without a template image')
    assert.equal(items.length, json.length)
  })

  test(`${cat.tab}: the outgoing request carries exactly that JSON entry's values (${cat.api === 'cartoon' ? 'id -> type' : 'style_title / style_desc'})`, async () => {
    const json = read(cat.file)
    for (const t of T.categoryItems(cat.tab)) {
      const info = ai.promptFor(t)
      const entry = json.find((e) => e.id === info.id)
      calls.length = 0
      // exactly what Generate.jsx does
      await ai.generatePhoto({ file: photo(), title: info.title, desc: info.desc, cartoonType: info.cartoonType })
      assert.equal(calls.length, 1)
      const c = calls[0]
      assert.equal(c.method, 'POST')
      if (cat.api === 'cartoon') {
        assert.ok(c.url.endsWith('/api/cartoon/generate'), c.url)
        assert.deepEqual(Object.keys(c.fields).sort(), ['image', 'type'], `${t.name}: only image + type are sent`)
        assert.equal(c.fields.type, entry.id, `${t.name}: type must equal the JSON id`)
      } else {
        assert.ok(c.url.endsWith('/api/photos/generate'), c.url)
        assert.deepEqual(Object.keys(c.fields).sort(), ['image', 'image_size', 'style_desc', 'style_title'], `${t.name}: fields`)
        assert.equal(c.fields.style_title, entry.style_title_prompt, `${t.name}: style_title`)
        assert.equal(c.fields.style_desc, entry.style_desc_prompt, `${t.name}: style_desc`)
        assert.equal(c.fields.image_size, '9:16')
      }
    }
  })

  test(`${cat.tab}: an image in this category's folder with no JSON entry is an explicit error, never another template's data`, () => {
    const info = ai.promptFor({ name: 'Not In The JSON', assetId: 'not-in-the-json', image: `/images${cat.folder}${encodeURIComponent('Not In The JSON.jpg')}` })
    assert.ok(info && info.error, 'must report an error')
    assert.equal(info.title, undefined)
    assert.equal(info.desc, undefined)
    assert.equal(info.cartoonType, undefined)
  })
}

test('categories without their own JSON catalogue get no generation data (they keep their existing behaviour)', () => {
  for (const tab of NO_CATALOGUE_TABS) {
    const items = T.categoryItems(tab)
    assert.ok(items.length > 0, tab)
    for (const t of items) assert.equal(ai.promptFor(t), null, `${tab}/${t.name}`)
  }
})

test('Beard: each preview image resolves to its own JSON id, the request carries only image + template, and unmatched images are errors', async () => {
  const json = read('ai-beard-styling_templates.json')
  const used = []
  assert.equal(T.categoryItems('beard').length, 23)
  assert.ok(![...T.categoryItems('beard'), ...T.exploreEverything].some((t) => t.name === 'common_image' || t.assetId === 'common-image'), 'common_image is not listed anywhere')
  assert.ok(!T.findAsset('beard', 'common-image'), 'common_image is not selectable')
  for (const t of T.categoryItems('beard')) {
    const info = ai.promptFor(t)
    assert.ok(info && !info.error, `${t.name}: ${info?.error}`)
    assert.equal(info.id, 'beard_' + t.name.toLowerCase(), `${t.name} -> ${info.id}`)
    assert.ok(json.some((e) => e.id === info.id), `${info.id} is in the JSON`)
    calls.length = 0
    await ai.generatePhoto({ file: photo(), beardTemplate: info.beardTemplate })
    assert.ok(calls[0].url.endsWith('/api/beard/generate'), calls[0].url)
    assert.deepEqual(Object.keys(calls[0].fields).sort(), ['image', 'template'])
    assert.equal(calls[0].fields.template, info.id)
    used.push(info.id)
  }
  assert.equal(new Set(used).size, 23)
  assert.deepEqual(json.map((e) => e.id).filter((id) => !used.includes(id)), ['beard_vandykerefined']) // JSON entry without a preview image
  const stray = ai.promptFor({ name: 'Not In The JSON', assetId: 'not-in-the-json', image: '/images/explore/beard/x.jpg' })
  assert.ok(stray.error && stray.beardTemplate === undefined)
})

test('Hairstyle sidebar entry (Baby / Man / Woman): no card falls back to the demo flow; each resolves to its JSON entry, its bracketed hair style is the backend hair_style, and no colour is sent', async () => {
  const json = read('ai-hairstyle-changer_templates.json')
  const TABLE = require('../backend/src/config/hairstyleTemplates.js')
  const { HAIR_STYLES } = require('../backend/src/config/hairstyleOptions.js')
  const expected = { baby: 11, man: 49, woman: 49 }
  for (const sub of ['baby', 'man', 'woman']) {
    const items = T.categoryItems(`hairstyle-${sub}`)
    assert.equal(items.length, expected[sub], `${sub}: number of cards`)
    for (const t of items) {
      const info = ai.promptFor(t)
      assert.ok(info !== null, `${sub}/${t.name}: promptFor must not be null (null = demo flow)`)
      assert.ok(!info.error, `${sub}/${t.name}: ${info.error}`)
      const style = /\(([^()]+)\)\.[a-z]+$/i.exec(decode(t.image))[1]
      assert.ok(json.some((e) => e.id === info.id), `${info.id} is in the JSON`)
      assert.equal(TABLE[info.id], style, `${t.name}: backend hair_style ${TABLE[info.id]} = bracketed ${style}`)
      assert.ok(HAIR_STYLES.includes(style))
      calls.length = 0
      await ai.generatePhoto({ file: photo(), hairTemplate: info.hairTemplate, hairColor: info.hairColor })
      assert.ok(calls[0].url.endsWith('/api/hairstyle/generate'), calls[0].url)
      assert.deepEqual(Object.keys(calls[0].fields).sort(), ['image', 'template'])
      assert.equal(calls[0].fields.template, info.id)
    }
  }
  assert.ok(!T.categoryItems('hairstyle-baby').some((t) => /Messy Bun/.test(t.name)) && !T.categoryItems('hairstyle-woman').some((t) => /^Textured Pixie/.test(t.name)), 'unconfirmed cards are hidden')
})

test('Cartoon: every JSON id is a documented API `type` (same list the backend validates against)', () => {
  const types = require('../backend/src/config/cartoonTypes.js')
  assert.deepEqual(read('cartoon-yourself_templates.json').map((t) => t.id), types)
})

test('JSON prompts fit the AI Photography limits, so the backend never truncates or rejects them', () => {
  const NON_LATIN = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\p{Z}\p{M}\n\r\t]/u // same check as backend/src/controllers/photos.controller.js
  for (const cat of CATALOGUES.filter((c) => c.api === 'photography')) {
    const json = read(cat.file)
    assert.equal(new Set(json.map((e) => e.id)).size, json.length, `${cat.file}: ids are unique`)
    for (const e of json) {
      for (const [field, max] of [['style_title_prompt', 500], ['style_desc_prompt', 1000]]) {
        const v = e[field]
        assert.equal(typeof v, 'string', `${cat.file}/${e.id}: ${field} exists`)
        assert.ok(v.length > 0 && v.length <= max, `${cat.file}/${e.id}: ${field} is ${v.length} chars (max ${max})`)
        assert.equal(v, v.trim(), `${cat.file}/${e.id}: ${field} has spaces at the ends (the backend would trim them)`)
        assert.ok(!NON_LATIN.test(v), `${cat.file}/${e.id}: ${field} has non-Latin characters`)
      }
    }
  }
})

test('Retro is Retro: it never picks Vintage Car, Good Vibes, Old Money "Retro Car" / "Retro Portrait" or any other template', async () => {
  const eighties = read('80s-90s_templates.json')
  const retro = T.categoryItems('80s-and-90s').find((t) => t.name === 'Retro')
  assert.ok(retro, 'the 80s & 90s template "Retro" exists')
  const info = ai.promptFor(retro)
  const entry = eighties.find((e) => e.id === 'retro')
  assert.equal(info.id, 'retro')
  assert.equal(info.title, entry.style_title_prompt)
  assert.equal(info.desc, entry.style_desc_prompt)
  for (const other of eighties.filter((e) => e.id !== 'retro')) {
    assert.notEqual(info.title, other.style_title_prompt, `Retro must not carry the title of ${other.id}`)
    assert.notEqual(info.desc, other.style_desc_prompt, `Retro must not carry the description of ${other.id}`)
  }
  // the same word in another category stays in that category
  for (const [tab, name, id] of [['old-money', 'Retro Car', 'retro_car'], ['old-money', 'Retro Portrait', 'retro_portrait']]) {
    assert.equal(ai.promptFor(T.categoryItems(tab).find((t) => t.name === name)).id, id)
  }
  // and the home-page gallery copy of the same image resolves to the same entry
  assert.equal(ai.promptFor(T.folderTemplates.find((t) => t.name === 'Retro')).id, 'retro')
})

test('every template resolves to the entry with its own name, no two templates share a prompt, and none uses a different category JSON', () => {
  const seen = new Map()
  for (const cat of CATALOGUES.filter((c) => c.api === 'photography')) {
    const json = read(cat.file)
    for (const t of T.categoryItems(cat.tab)) {
      const info = ai.promptFor(t)
      if (cat.tab !== 'top-carousel') assert.equal(info.name, t.name, `${cat.tab}/${t.name} resolved to "${info.name}"`) // Top Carousel's file names are longer than its JSON names; it matches on id
      assert.ok(json.some((e) => e.id === info.id && e.style_title_prompt === info.title), `${cat.tab}/${t.name}: the values do not come from ${cat.file}`)
      const key = `${info.title}
--
${info.desc}`
      assert.ok(!seen.has(key), `${cat.tab}/${t.name} has the same prompts as ${seen.get(key)}`)
      seen.set(key, `${cat.tab}/${t.name}`)
    }
  }
})
