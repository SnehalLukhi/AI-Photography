/**
 * Hairstyle Changer Premium integration tests. A local HTTP stand-in for AILabTools (test-only) asserts that OUR request matches the official documentation of
 * POST /api/portrait/effects/hairstyle-editor-premium: header ailabapi-api-key, multipart: image (JPG/PNG <= 5 MB, > 200 px), hair_style (documented enum), color (documented enum, default `original`);
 * `image_template` is never sent (the API ignores it when hair_style is present, so the documented hair_style value alone controls the hairstyle). Result: data.image (async task).
 *
 * The 57 Hairstyle templates of the Admin (31 Men's + 26 Woman's: id, name and the documented hair_style each must resolve to) are seeded into the throw-away in-memory database in two
 * categories whose flow is `hairstyle`, exactly as they are saved in the Admin (no api_value, a title prompt that this API never uses).
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const sharp = require('sharp')
const h = require('./helpers')
const TABLE = require('../src/config/hairstyleTemplates')
const { HAIR_STYLES, COLORS } = require('../src/config/hairstyleOptions')

const MEN = [
  ['hair_men_buzzcut', 'Buzz Cut', 'BuzzCut'],
  ['hair_men_undercut', 'Undercut', 'UnderCut'],
  ['hair_men_pompadour', 'Pompadour', 'Pompadour'],
  ['hair_men_slickback', 'Slick Back', 'SlickBack'],
  ['hair_men_curlyshag', 'Curly Shag', 'CurlyShag'],
  ['hair_men_wavyshag', 'Wavy Shag', 'WavyShag'],
  ['hair_men_fauxhawk', 'Faux Hawk', 'FauxHawk'],
  ['hair_men_spiky', 'Spiky', 'Spiky'],
  ['hair_men_combover', 'Comb Over', 'CombOver'],
  ['hair_men_hightightfade', 'High Tight Fade', 'HighTightFade'],
  ['hair_men_manbun', 'Man Bun', 'ManBun'],
  ['hair_men_lowfade', 'Low Fade', 'LowFade'],
  ['hair_men_texturedfringe', 'Textured Fringe', 'TexturedFringe'],
  ['hair_men_bluntbowlcut', 'Blunt Bowl Cut', 'BluntBowlCut'],
  ['hair_men_longwavycurtainbangs', 'Long Wavy Curtain Bangs', 'LongWavyCurtainBangs'],
  ['hair_men_messytousled', 'Messy Tousled', 'MessyTousled'],
  ['hair_men_cornrowbraids', 'Cornrow Braids', 'CornrowBraids'],
  ['hair_men_longhairtiedup', 'Long Hair Tied Up', 'LongHairTiedUp'],
  ['hair_men_middle_parted', 'Middle Parted', 'Middle-parted'],
  ['hair_men_wavymiddlepart', 'Wavy Middle Part', 'WavyMiddlePart'],
  ['hair_men_natural_side_part', 'Natural Side Part', 'Natural_Side-Part'],
  ['hair_men_wolf_crop', 'Wolf Crop', 'Wolf_Crop'],
  ['hair_men_side_parted_textured', 'Side Parted Textured', 'Side-Parted_Textured'],
  ['hair_men_fluffymiddlepart', 'Fluffy Middle Part', 'FluffyMiddlePart'],
  ['hair_men_freshside_parted', 'Fresh Side Parted', 'FreshSide-Parted'],
  ['hair_men_korean_wavy_crop', 'Korean Wavy Crop', 'Korean_Wavy_Crop'],
  ['hair_men_comma_hair', 'Comma Hair', 'Comma_Hair'],
  ['men-s-hairstyles-side-part-crop', 'Side Part Crop', 'Side-Part_Crop'],
  ['hair_men_natural_middle_part', 'Natural Middle Part', 'Natural_Middle_Part'],
  ['hair_men_chestnut', 'Chestnut', 'Chestnut'],
  ['hair_men_choppybangs', 'Choppy Bangs', 'ChoppyBangs'],
]
const WOMEN = [
  ['hair_women_doublebun', 'Double Bun', 'DoubleBun'],
  ['hair_women_updo', 'Updo', 'Updo'],
  ['hair_women_bowlcut', 'Bowl Cut', 'bowlCut'],
  ['hair_women_chignon', 'Chignon', 'Chignon'],
  ['hair_women_longcurly', 'Long Curly', 'LongCurly'],
  ['hair_women_curlybob', 'Curly Bob', 'CurlyBob'],
  ['hair_women_bobcut', 'Bob Cut', 'BobCut'],
  ['hair_women_fishtailbraid', 'Fishtail Braid', 'FishtailBraid'],
  ['hair_women_dreadlocks', 'Dreadlocks', 'Dreadlocks'],
  ['woman-s-hairstyles-cornrows', 'Cornrows', 'Cornrows'],
  ['hair_women_shoulderlengthhair', 'Shoulder Length Hair', 'ShoulderLengthHair'],
  ['hair_women_longhimecut', 'Long Hime Cut', 'LongHimeCut'],
  ['hair_women_boxbraids', 'Box Braids', 'BoxBraids'],
  ['hair_women_layered_waves', 'Layered Waves', 'Layered_Waves'],
  ['hair_women_chic_tapered_bob', 'Chic Tapered Bob', 'Chic_Tapered_Bob'],
  ['hair_women_elegant_wavy_crop', 'Elegant Wavy Crop', 'Elegant_Wavy_Crop'],
  ['hair_women_chic_wavy_pixie', 'Chic Wavy Pixie', 'Chic_Wavy_Pixie'],
  ['woman-s-hairstyles-elegant-side-wave', 'Elegant Side Wave', 'Elegant_Side_Wave'],
  ['hair_women_executive_pixie', 'Executive Pixie', 'Executive_Pixie'],
  ['hair_women_curved_chic_bob', 'Curved Chic Bob', 'Curved_Chic_Bob'],
  ['hair_women_airy_short_curls', 'Airy Short Curls', 'Airy_Short_Curls'],
  ['hair_women_elegant_soft_curl', 'Elegant Soft Curl', 'Elegant_Soft_Curl'],
  ['hair_women_elegant_smooth_bob', 'Elegant Smooth Bob', 'Elegant_Smooth_Bob'],
  ['hair_women_elegant_volumized_bob', 'Elegant Volumized Bob', 'Elegant_Volumized_Bob'],
  ['hair_women_elegant_side_flow', 'Elegant Side Flow', 'Elegant_Side_Flow'],
  ['woman-s-hairstyles-classic-wavy-bob', 'Classic Wavy Bob', 'ClassicWavyBob'],
]
const ALL = [...MEN.map((r) => [...r, 'men-s-hairstyles']), ...WOMEN.map((r) => [...r, 'woman-s-hairstyles'])]

let mock, app, T
const part = (call, name) => call.parts?.find((p) => p.name === name)
const submitsCount = () => mock.calls.filter((c) => c.method === 'POST' && c.url.includes('hairstyle-editor-premium')).length
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const TITLE = 'a title prompt saved in the Admin; the Hairstyle API never uses it'

before(async () => {
  mock = await h.startMockAilab(async (call) => {
    if (call.method === 'POST' && call.url.startsWith('/api/portrait/effects/hairstyle-editor-premium')) {
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_id: 'task_hair' } }
    }
    if (call.method === 'POST' && call.url.startsWith('/api/portrait/effects/portrait-animation')) {
      return { json: { request_id: 'r1', log_id: 'l1', error_detail: { code: '', code_message: '', message: '' }, task_id: 'task_cartoon' } }
    }
    if (call.url.startsWith('/api/common/query-async-task-result')) {
      return { json: { request_id: 'r2', log_id: 'l2', error_detail: { code: '', code_message: '', message: '' }, task_status: 2, data: { image: 'https://example.invalid/hair.png' } } }
    }
    return { status: 404, json: {} }
  })
  process.env.AILAB_API_KEY = 'test-key'
  process.env.AILAB_BASE_URL = mock.url
  process.env.AILAB_POLL_INTERVAL_MS = '10'
  process.env.AILAB_POLL_TIMEOUT_MS = '1500'
  process.env.RATE_LIMIT_MAX = '1000'

  T = require('../src/services/templates.service')
  await T.saveCategory({ id: 'men-s-hairstyles', name: "Men's Hairstyles", flow: 'hairstyle' })
  await T.saveCategory({ id: 'woman-s-hairstyles', name: "Woman's Hairstyles", flow: 'hairstyle' })
  await T.saveCategory({ id: 'photo-other', name: 'Other photos', flow: 'photography' })
  await T.saveCategory({ id: 'toon', name: 'Toon', flow: 'cartoon' })
  const url = 'https://cdn.example.com/preview.jpg'
  await T.createTemplates([
    ...ALL.map(([id, name, , category_id]) => ({ id, name, category_id, preview_url: url, style_title_prompt: TITLE, active: true })), // exactly as saved in the Admin: no api_value
    { id: 'plain-photo', category_id: 'photo-other', name: 'Plain photo', preview_url: url, style_title_prompt: 't', style_desc_prompt: 'd' },
    { id: 'anime', category_id: 'toon', name: 'Anime Style', preview_url: url },
  ])
  app = await h.startApp(require('../src/app'))
})
after(async () => { await app.close(); await mock.close() })

const img = async (format = 'jpeg', w = 600, hgt = 800) => ({ buffer: await h.solid(w, hgt, { r: 120, g: 90, b: 70 }, format), type: `image/${format}`, filename: `p.${format === 'jpeg' ? 'jpg' : format}` })
const post = (files, f) => fetch(`${app.base}/api/hairstyle/generate`, { method: 'POST', body: h.form(files, f) })

test('the documented enums have no duplicates and cover the numbered ranges; `original` is a documented colour', () => {
  assert.equal(new Set(HAIR_STYLES).size, HAIR_STYLES.length, 'no duplicates')
  assert.ok(HAIR_STYLES.includes('male_hairstyle_0062') && !HAIR_STYLES.includes('male_hairstyle_0063'))
  assert.ok(HAIR_STYLES.includes('female_hairstyle_0073') && !HAIR_STYLES.includes('female_hairstyle_0074'))
  assert.equal(COLORS.length, 23)
  assert.ok(COLORS.includes('original'))
})

test('the backend table: 123 ids (115 bundled + the 8 Admin templates added later), each mapped to a documented hair_style with the same style name as the id', () => {
  assert.equal(Object.keys(TABLE).length, 123)
  for (const [id, style] of Object.entries(TABLE)) {
    assert.ok(HAIR_STYLES.includes(style), `${id} -> ${style} is a documented hair_style`)
    assert.equal(norm(style), norm(id.replace(/^(hair_(men|women)_|men-s-hairstyles-|woman-s-hairstyles-)/, '')), `${id} -> ${style}: same style`)
  }
})

test('the 8 mappings added for the Admin templates are exactly the documented values', () => {
  assert.deepEqual(
    { hair_men_undercut: 'UnderCut', 'men-s-hairstyles-side-part-crop': 'Side-Part_Crop', hair_women_updo: 'Updo', 'woman-s-hairstyles-cornrows': 'Cornrows', hair_women_shoulderlengthhair: 'ShoulderLengthHair', hair_women_layered_waves: 'Layered_Waves', 'woman-s-hairstyles-elegant-side-wave': 'Elegant_Side_Wave', 'woman-s-hairstyles-classic-wavy-bob': 'ClassicWavyBob' },
    Object.fromEntries(['hair_men_undercut', 'men-s-hairstyles-side-part-crop', 'hair_women_updo', 'woman-s-hairstyles-cornrows', 'hair_women_shoulderlengthhair', 'hair_women_layered_waves', 'woman-s-hairstyles-elegant-side-wave', 'woman-s-hairstyles-classic-wavy-bob'].map((id) => [id, TABLE[id]])),
  )
})

test('the Admin data: 31 Men + 26 Woman templates, all with the hairstyle flow, names / ids / title prompts untouched', async () => {
  assert.equal(MEN.length, 31)
  assert.equal(WOMEN.length, 26)
  for (const [id, name, , category_id] of ALL) {
    const t = await T.getTemplate(id)
    assert.equal(t.flow, 'hairstyle', id)
    assert.equal(t.name, name)
    assert.equal(t.category_id, category_id)
    assert.equal(t.style_title_prompt, TITLE)
    assert.equal(t.api_value, null)
  }
  assert.equal((await T.getTemplate('plain-photo')).flow, 'photography')
  assert.equal((await T.getTemplate('anime')).flow, 'cartoon')
})

test('ALL 57 Admin templates: image = the photo, hair_style = the documented value for THAT template, color = original, nothing else', async () => {
  const photo = await img()
  for (const [id, name, style] of ALL) {
    const before = mock.calls.length
    const res = await post({ image: photo }, { template: id })
    assert.equal(res.status, 200, `${name} (${id})`)
    const body = await res.json()
    assert.equal(body.status, 'succeeded')
    assert.equal(body.provider, 'hairstyle-changer-premium')
    assert.deepEqual(body.images, ['https://example.invalid/hair.png'])
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.ok(submit.url.startsWith('/api/portrait/effects/hairstyle-editor-premium'), id)
    assert.equal(submit.headers['ailabapi-api-key'], 'test-key')
    assert.match(submit.headers['content-type'], /^multipart\/form-data; boundary=/)
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['color', 'hair_style', 'image'], `${id}: no other fields are sent (no image_template, no prompts)`)
    assert.equal(part(submit, 'hair_style').data.toString(), style, `${name}: hair_style`)
    assert.ok(HAIR_STYLES.includes(style), `${style} is documented`)
    assert.equal(part(submit, 'color').data.toString(), 'original')
    assert.ok(part(submit, 'image').data.equals(photo.buffer), `${id}: image is the user's photo`)
  }
})

test('the internal Admin id is only sent when it is itself a documented value (never otherwise)', async () => {
  const sentSameAsId = ALL.filter(([id, , style]) => id === style)
  assert.deepEqual(sentSameAsId, [], 'no Admin id is an API value, so every template is translated')
  assert.ok(!HAIR_STYLES.includes('hair_men_pompadour'))
  const before = mock.calls.length
  await post({ image: await img() }, { template: 'hair_men_pompadour' })
  assert.equal(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'hair_style').data.toString(), 'Pompadour')
})

test('a request without a colour sends the documented default color=original (plus image + hair_style, nothing else)', async () => {
  const before = mock.calls.length
  assert.equal((await post({ image: await img() }, { template: 'hair_men_manbun' })).status, 200)
  const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
  assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['color', 'hair_style', 'image'])
  assert.equal(part(submit, 'color').data.toString(), 'original')
})

test('regression: ENOENT "open ...\\ai-photo-generator-uploads\\*.upload" - the upload dir is re-created per upload, so a temp dir removed while the server runs (OS temp cleanup) no longer breaks generate', async () => {
  const { UPLOAD_DIR } = require('../src/utils/tempFiles')
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })
  for (let i = 0; i < 2; i++) { // first request re-creates the dir, the second proves it keeps working
    const res = await post({ image: await img() }, { template: 'hair_men_manbun' })
    assert.equal(res.status, 200, 'upload after the temp dir was removed')
    assert.equal((await res.json()).status, 'succeeded')
  }
  assert.deepEqual(fs.readdirSync(UPLOAD_DIR), [], 'the uploaded file is removed once processing has finished')
  // an invalid request must also leave nothing behind
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true })
  assert.equal((await post({ image: await img() }, { template: 'nope' })).status, 400)
  assert.deepEqual(fs.readdirSync(UPLOAD_DIR), [], 'no leftover after a rejected request')
})

test('EVERY id of the backend table: request = image + hair_style (its own value) + color, nothing else', async () => {
  const photo = await img()
  for (const [id, style] of Object.entries(TABLE)) {
    const before = mock.calls.length
    const res = await post({ image: photo }, { template: id, color: 'lightBlue' })
    assert.equal(res.status, 200, id)
    const submit = mock.calls.slice(before).find((c) => c.method === 'POST')
    assert.deepEqual(submit.parts.map((p) => p.name).sort(), ['color', 'hair_style', 'image'], `${id}: no other fields are sent`)
    assert.equal(part(submit, 'hair_style').data.toString(), style, `${id}: hair_style`)
    assert.equal(part(submit, 'color').data.toString(), 'lightBlue')
  }
})

test('every documented colour is forwarded unchanged', async () => {
  for (const color of ['blonde', 'platinumBlonde', 'lightBrown', 'multicolored', 'red', 'pink', 'lightBlue', 'orange', 'darkBlue', 'lightPurple', 'darkGreen', 'blue', 'grey', 'burgundy', 'silver', 'reference']) {
    const before = mock.calls.length
    assert.equal((await post({ image: await img() }, { template: 'hair_men_manbun', color })).status, 200)
    assert.equal(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'color').data.toString(), color)
  }
})

test('Admin validation: a hairstyle template needs a documented hair_style (its own api_value or a table id)', async () => {
  await assert.rejects(() => T.createTemplates({ id: 'not-in-table', category_id: 'men-s-hairstyles', name: 'No value', preview_url: 'https://cdn.example.com/p.jpg' }), /api_value/)
  await assert.rejects(() => T.createTemplates({ id: 'bad-value', category_id: 'men-s-hairstyles', name: 'Bad', preview_url: 'https://cdn.example.com/p.jpg', api_value: 'NotAStyle' }), /not a supported/)
  await T.createTemplates({ id: 'own-value', category_id: 'men-s-hairstyles', name: 'Own value', preview_url: 'https://cdn.example.com/p.jpg', api_value: 'Afro' }) // its own documented value
  const before = mock.calls.length
  assert.equal((await post({ image: await img() }, { template: 'own-value' })).status, 200)
  assert.equal(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'hair_style').data.toString(), 'Afro')
  // editing an existing Admin template (name only) keeps working although it has no api_value of its own
  await T.updateTemplate('hair_men_pompadour', { name: 'Pompadour' })
})

test('validation: photo, template, unknown id, non-hairstyle templates, colour, format, size, tiny image', async () => {
  const photo = await img()
  const start = submitsCount()
  let r = await post({}, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { color: 'red' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'MISSING_FIELDS')
  r = await post({ image: photo }, { template: 'ManBun', color: 'red' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_TEMPLATE') // an API value is not a template id
  r = await post({ image: photo }, { template: 'hair_men_not_a_style', color: 'red' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: 'plain-photo', color: 'red' }); assert.equal(r.status, 400) // a photography template is never sent to the Hairstyle API
  r = await post({ image: photo }, { template: 'anime', color: 'red' }); assert.equal(r.status, 400) // neither is a cartoon template
  r = await post({ image: photo }, { template: '__proto__', color: 'red' }); assert.equal(r.status, 400)
  r = await post({ image: photo }, { template: 'hair_men_manbun', color: 'Hot Pink' }); assert.equal(r.status, 400); assert.equal((await r.json()).error.code, 'INVALID_COLOR')
  r = await post({ image: await img('webp') }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 415)
  r = await post({ image: await img('jpeg', 150, 150) }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 422); assert.equal((await r.json()).error.code, 'IMAGE_TOO_SMALL')
  r = await post({ image: { buffer: Buffer.from('nope'), type: 'image/jpeg', filename: 'x.jpg' } }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 422)
  const big = await sharp({ create: { width: 1700, height: 1700, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 70 } } }).png({ compressionLevel: 0 }).toBuffer()
  assert.ok(big.length > 5 * 1048576 && big.length < 10 * 1048576)
  r = await post({ image: { buffer: big, type: 'image/png', filename: 'big.png' } }, { template: 'hair_men_manbun', color: 'red' }); assert.equal(r.status, 413)
  assert.equal(submitsCount(), start, 'invalid input never reaches AILabTools')
})

test('a photo of 4090 px or more is downscaled below 4090 before it is sent', async () => {
  const before = mock.calls.length
  assert.equal((await post({ image: await img('jpeg', 4300, 300) }, { template: 'hair_men_manbun', color: 'red' })).status, 200)
  const sent = await sharp(part(mock.calls.slice(before).find((c) => c.method === 'POST'), 'image').data).metadata()
  assert.ok(sent.width < 4090 && sent.height > 200, `${sent.width}x${sent.height}`)
})

test('the other endpoints are untouched (Photography and Cartoon still use their own AILabTools APIs)', async () => {
  let before = mock.calls.length
  const f = h.form({ image: await img('webp') }, { style_title: 'Golden hour', style_desc: 'Warm light', image_size: '9:16' })
  await fetch(`${app.base}/api/photos/generate`, { method: 'POST', body: f })
  assert.ok(mock.calls.slice(before).find((c) => c.method === 'POST').url.startsWith('/api/image/effects/ai-photography'))
  before = mock.calls.length
  const res = await fetch(`${app.base}/api/cartoon/generate`, { method: 'POST', body: h.form({ image: await img() }, { type: 'anime' }) })
  assert.equal(res.status, 200)
  assert.ok(mock.calls.slice(before).find((c) => c.method === 'POST').url.startsWith('/api/portrait/effects/portrait-animation'))
})

test('no uploaded file is left on disk after any Hairstyle request', async () => {
  const before = h.tempFiles()
  await post({ image: await img() }, { template: 'hair_men_manbun', color: 'red' })
  await post({ image: await img() }, { template: 'bad', color: 'red' })
  await post({ image: await img('jpeg', 100, 100) }, { template: 'hair_men_manbun', color: 'red' })
  assert.deepEqual(h.newTempFiles(before), [])
})

test('Admin: ALL 57 existing hairstyle templates can be edited and saved with an empty api_value (the built-in table is the fallback); nothing else changes', async () => {
  for (const [id, name, style, category_id] of ALL) {
    const before = await T.getTemplate(id)
    const saved = await T.updateTemplate(id, { id, category_id, name: `${name}`, preview_url: before.preview_url, style_title_prompt: before.style_title_prompt, style_desc_prompt: null, api_value: null, aspect_ratio: '9:16', sort_order: before.sort_order, active: true })
    assert.equal(saved.flow, 'hairstyle', id)
    assert.equal(saved.api_value, null, `${id}: no api_value is invented or stored`)
    assert.equal(saved.style_title_prompt, before.style_title_prompt, `${id}: prompt untouched`)
    const b = mock.calls.length
    assert.equal((await post({ image: await img() }, { template: id })).status, 200)
    assert.equal(part(mock.calls.slice(b).find((c) => c.method === 'POST'), 'hair_style').data.toString(), style, `${id}: still resolves through the table after the save`)
  }
  // a new hairstyle id that is neither built in nor given a value is refused with a clear message
  await assert.rejects(() => T.createTemplates({ id: 'brand-new-style', category_id: 'men-s-hairstyles', name: 'New', preview_url: 'https://cdn.example.com/p.jpg' }), /not a built-in hairstyle/)
})
