/**
 * One-time (repeatable) import of the bundled template JSON files into the database:
 *   node scripts/seed-templates.js
 * Uses the same DATABASE_URL as the server (backend/.env). Safe to run again: it upserts by template id.
 *
 * A template is only imported when it has a preview image in public/images/explore/* - the same rule the app used to decide which cards to show.
 * The link between an image and its JSON entry follows the frontend's old matching (src/lib/aiPhotography.js promptFor): photography templates by id or
 * name, cartoon by name, beard through config/beardTemplates.js, hairstyle through the "(Style)" part of the file name + config/hairstyleTemplates.js.
 * preview_url is stored as the site-relative path of the image (/images/explore/...), which the frontend serves.
 */
const fs = require('node:fs')
const path = require('node:path')
const BEARD_FILES = require('../src/config/beardTemplates')
const HAIR_STYLES = require('../src/config/hairstyleTemplates')

const ROOT = path.join(__dirname, '..', '..')
const DATA = path.join(ROOT, 'src', 'data')
const IMAGES = path.join(ROOT, 'public', 'images')
const IMAGE = /\.(png|jpe?g|webp|avif)$/i

const json = (file) => JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'))
const entries = (file) => json(file).categories.flatMap((c) => c.templates)
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
const hairKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const stem = (f) => f.replace(/\.[^.]+$/, '')
// photos the app never listed (unconfirmed hair styles), kept out here too
const HAIR_EXCLUDE = ['Messy Bun (female_hairstyle_0039)', 'Textured Pixie(female_hairstyle_00020)']
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })

/** First of the candidate folders (relative to public/images) that exists, with its photos. */
function photos(folders) {
  for (const rel of folders) {
    try {
      const files = fs.readdirSync(path.join(IMAGES, rel)).filter((f) => IMAGE.test(f) && !f.startsWith('.')).sort(natural)
      if (files.length) return { rel, files }
    } catch { /* try the next folder */ }
  }
  return { rel: folders[0], files: [] }
}
const url = (rel, file) => `/images/${rel}/${encodeURIComponent(file)}`.replace(/%2F/g, '/')

// category: id = the app's Explore tab id; flow decides how the template is generated.
const PHOTOGRAPHY = [
  { id: '80s-and-90s', name: "80's & 90's", json: '80s-90s_templates.json', folders: ['explore/80&90'] },
  { id: 'old-money', name: 'Old Money', json: 'old-money_templates.json', folders: ['explore/old-money'] },
  { id: 'linkedin-headshot', name: 'LinkedIn Headshot', json: 'linkedin-headshot_templates.json', folders: ['explore/linkedin-headshot', 'explore/Linkedin Headshot', 'Linkedin Headshot'] },
  { id: 'top-carousel', name: 'Top Carousel', json: 'top-carousel_templates.json', folders: ['explore/top-carousel', 'explore/Top Carousel', 'Top Carousel'], hideFromAll: true },
  { id: 'christmas', name: 'Christmas', json: 'christmas_templates.json', folders: ['explore/Christmas'], hideFromAll: true },
  { id: 'cinematic', name: 'Cinematic', json: 'cinematic_templates.json', folders: ['explore/Cinematic'], hideFromAll: true },
  { id: 'halloween', name: 'Halloween', json: 'halloween_templates.json', folders: ['explore/Halloween'], hideFromAll: true },
]

function buildSeed() {
  const categories = []
  const templates = []
  const add = (category, list) => { categories.push({ ...category, sort_order: categories.length }); templates.push(...list.map((t, i) => ({ ...t, category_id: category.id, sort_order: i }))) }

  for (const c of PHOTOGRAPHY) {
    const json = entries(c.json)
    const { rel, files } = photos(c.folders)
    const list = []
    for (const file of files) {
      const keys = [norm(stem(file))]
      const t = json.find((x) => keys.includes(norm(x.id))) || json.find((x) => keys.includes(norm(x.name)))
      if (!t) continue
      list.push({ id: t.id, name: t.name, preview_url: url(rel, file), style_title_prompt: t.style_title_prompt, style_desc_prompt: t.style_desc_prompt, aspect_ratio: t.aspect_ratio, cost_coins: t.cost_coins, gender: t.gender })
    }
    add({ id: c.id, name: c.name, flow: 'photography', hide_from_all: !!c.hideFromAll }, list)
  }

  { // cartoon: JSON id = the API's `type`, matched to the photo by name
    const json = entries('cartoon-yourself_templates.json')
    const { rel, files } = photos(['explore/cartoon'])
    const list = files.flatMap((file) => { const t = json.find((x) => norm(x.name) === norm(stem(file))); return t ? [{ id: t.id, name: t.name, preview_url: url(rel, file), aspect_ratio: t.aspect_ratio, cost_coins: t.cost_coins }] : [] })
    add({ id: 'cartoon', name: 'Cartoon', flow: 'cartoon' }, list)
  }

  { // beard: the photo is sent to the API as the reference image; the card title is the file name before " ("
    const json = entries('ai-beard-styling_templates.json')
    const { rel, files } = photos(['explore/beard'])
    const byFile = Object.fromEntries(Object.entries(BEARD_FILES).filter(([, f]) => f).map(([id, f]) => [f, id]))
    const list = files.flatMap((file) => { const t = json.find((x) => x.id === byFile[file]); return t ? [{ id: t.id, name: file.split(/[\s(]/)[0], preview_url: url(rel, file), aspect_ratio: t.aspect_ratio, cost_coins: t.cost_coins, gender: t.gender }] : [] })
    add({ id: 'beard', name: 'Beard', flow: 'beard', hide_from_all: true }, list)
  }

  { // hairstyle: three sub-categories; the "(Style)" at the end of the file name is the API's hair_style
    const json = entries('ai-hairstyle-changer_templates.json')
    add({ id: 'hairstyle', name: 'Hairstyle', flow: 'hairstyle', hide_from_all: true }, [])
    for (const sub of ['baby', 'man', 'woman']) {
      const { rel, files } = photos([`explore/Hairstyle/${sub}`])
      const list = files.filter((file) => !HAIR_EXCLUDE.includes(stem(file))).flatMap((file) => {
        const style = /\(([^()]+)\)\.[a-z]+$/i.exec(file)?.[1]
        const found = style ? json.filter((x) => hairKey(x.id.replace(/^hair_(men|women)_/, '')) === hairKey(style)) : []
        return found.length === 1 && HAIR_STYLES[found[0].id] ? [{ id: found[0].id, name: file.replace(/\s*\(.*$/, '').trim() || stem(file), preview_url: url(rel, file), api_value: HAIR_STYLES[found[0].id], aspect_ratio: found[0].aspect_ratio, cost_coins: found[0].cost_coins, gender: found[0].gender }] : []
      })
      add({ id: `hairstyle-${sub}`, name: sub[0].toUpperCase() + sub.slice(1), flow: 'hairstyle', parent_id: 'hairstyle', hide_from_all: true }, list)
    }
  }
  return { categories, templates }
}

async function run() {
  const db = require('../src/db')
  const svc = require('../src/services/templates.service')
  const { categories, templates } = buildSeed()
  for (const c of categories) await svc.saveCategory(c, { upsert: true })
  // hairstyle sub-categories share template ids with nothing else, but two photos can map to one JSON entry: keep the first
  const seen = new Set()
  const unique = templates.filter((t) => !seen.has(t.id) && seen.add(t.id))
  for (let i = 0; i < unique.length; i += 100) await svc.createTemplates(unique.slice(i, i + 100), { upsert: true })
  console.log(`Imported ${categories.length} categories and ${unique.length} templates.`)
  await db.close()
}

module.exports = { buildSeed }
if (require.main === module) run().catch((e) => { console.error(e.message); process.exit(1) })
