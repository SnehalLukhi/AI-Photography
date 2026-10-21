import eightiesNineties from '../data/80s-90s_templates.json'
import oldMoney from '../data/old-money_templates.json'
import linkedin from '../data/linkedin-headshot_templates.json'
import topCarousel from '../data/top-carousel_templates.json'
import cartoonYourself from '../data/cartoon-yourself_templates.json'
import beardStyling from '../data/ai-beard-styling_templates.json'
import hairstyleChanger from '../data/ai-hairstyle-changer_templates.json'

/**
 * AILabTools AI Photography, called through the existing backend endpoint (POST /api/photos/generate). The AILabTools key lives only in the
 * backend's environment - the browser never sees it. Only the 80's & 90's, Old Money, LinkedIn Headshot and Top Carousel templates use this; every other template keeps the demo behaviour.
 * Cartoon templates use the Cartoon Yourself API through a separate backend route (POST /api/cartoon/generate): the JSON `id` of the
 * selected template is sent as the API's `type` (style) parameter - that API takes no text prompts.
 * Beard templates use the AI Beard Styling API through POST /api/beard/generate: the confirmed JSON `id` of the selected template is sent as `template`
 * and the backend turns it into the API's `image_template` (the template's preview image). No prompts are used.
 * Hairstyle templates (Baby / Man / Woman) use the Hairstyle Changer Premium API through POST /api/hairstyle/generate: the confirmed JSON `id` of the template is sent as
 * `template` (the Hairstyle cards carry no colour); the backend turns the id into the API's `hair_style`. The JSON prompts are not used by that API.
 */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/+$/, '')
export const IMAGE_SIZE = '9:16'
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_BYTES = 10 * 1024 * 1024
const POLL_MS = 5000
const GIVE_UP_MS = 5 * 60 * 1000

// Each category with a JSON catalogue: the folder its template images live in, and its JSON templates (the single source of the prompts).
const CATALOGUES = [
  { folder: '/explore/80&90/', templates: eightiesNineties.categories.flatMap((c) => c.templates) },
  { folder: '/explore/old-money/', templates: oldMoney.categories.flatMap((c) => c.templates) },
  { folder: '/explore/Linkedin Headshot/', templates: linkedin.categories.flatMap((c) => c.templates) },
  { folder: '/explore/Top Carousel/', templates: topCarousel.categories.flatMap((c) => c.templates) },
  { folder: '/explore/cartoon/', kind: 'cartoon', templates: cartoonYourself.categories.flatMap((c) => c.templates) }, // JSON `id` = API `type`; matched by name (the app's ids are slugs of the file names)
]
const BEARD_TEMPLATES = beardStyling.categories.flatMap((c) => c.templates)
// Beard: confirmed link between each preview image (file name before " (", which is the card name) and its JSON entry `id`. Explicit on purpose:
// the JSON `name`s differ from the file names (e.g. "Full Ducktail" = DucktailBeardFull), so a name or file-name guess would be wrong.
// JSON `beard_vandykerefined` has no preview image; `common_image` is not a template.
const BEARD_IDS = {
  AnchorBeardClean: 'beard_anchorbeardclean', AnchorBeardFull: 'beard_anchorbeardfull', Balbo: 'beard_balbo', Bandholz: 'beard_bandholz',
  ChevronMoustache: 'beard_chevronmoustache', ChinStrap: 'beard_chinstrap', CircleBeard: 'beard_circlebeard', CorporateBeard: 'beard_corporatebeard',
  DucktailBeardFull: 'beard_ducktailbeardfull', DucktailBeardPointed: 'beard_ducktailbeardpointed', ExtendedGoatee: 'beard_extendedgoatee',
  FullBeardClassic: 'beard_fullbeardclassic', FullBeardTapered: 'beard_fullbeardtapered', Garibaldi: 'beard_garibaldi', Goatee: 'beard_goatee',
  HandlebarMoustache: 'beard_handlebarmoustache', HeavyStubble: 'beard_heavystubble', ImperialMoustache: 'beard_imperialmoustache',
  MuttonChops: 'beard_muttonchops', PetiteGoatee: 'beard_petitegoatee', SoulPatch: 'beard_soulpatch', VanDyke: 'beard_vandyke', Verdi: 'beard_verdi',
}
export const BEARD_FOLDER = '/explore/beard/'

// Hairstyle (Baby / Man / Woman): the JSON is the single source for all three sub-categories; Baby has no category of its own in it, so its cards use the Men / Women entries.
const HAIR_TEMPLATES = hairstyleChanger.categories.flatMap((c) => c.templates.map((t) => ({ ...t, category: c })))
const HAIRSTYLE_FOLDERS = ['/explore/Hairstyle/baby/', '/explore/Hairstyle/man/', '/explore/Hairstyle/woman/']
const hairKey = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') // "retro-80s-lounge" / "Retro 80s Lounge" -> "retro_80s_lounge"

/**
 * The JSON template that belongs to a template image (null for any template without a JSON catalogue; `{ error }` when the category has one
 * but this template has no entry in it). The category is taken from the folder
 * of the image, then the template is matched on its own id (the app's asset id, e.g. "retro-80s-lounge" = JSON "retro_80s_lounge") and then on
 * its name, only inside that category's JSON. The JSON values are returned untouched.
 */
export function promptFor(asset) {
  if (!asset?.image) return null
  const src = (() => { try { return decodeURIComponent(asset.image) } catch { return asset.image } })() // image URLs are percent-encoded ("Linkedin%20Headshot")
  if (HAIRSTYLE_FOLDERS.some((f) => src.includes(f))) {
    // Hairstyle sidebar entry (Baby / Man / Woman): the file name ends with the template's hair style in brackets, "Baby Bun (ManBun).jpg" - the API's own `hair_style` name.
    // It is matched to the JSON entry whose id has the same style name (same letters and digits); no match or more than one = no confirmed template = error. Cards have no colour.
    const style = /\(([^()]+)\)\.[a-z]+$/i.exec(src)?.[1]
    const found = style ? HAIR_TEMPLATES.filter((x) => hairKey(x.id.replace(/^hair_(men|women)_/, '')) === hairKey(style)) : []
    return found.length === 1
      ? { id: found[0].id, name: found[0].name, hairTemplate: found[0].id }
      : { error: `This template (${asset.name || asset.assetId}) has no entry in its template data, so it cannot be generated. Please choose another template.` }
  }
  if (src.includes(BEARD_FOLDER)) {
    const entry = BEARD_TEMPLATES.find((x) => x.id === BEARD_IDS[asset.name])
    return entry ? { id: entry.id, name: entry.name, beardTemplate: entry.id } : { error: `This template (${asset.name || asset.assetId}) has no entry in its template data, so it cannot be generated. Please choose another template.` }
  }
  const cat = CATALOGUES.find((c) => src.includes(c.folder))
  if (!cat) return null
  // A template of a catalogue category that has no entry in its JSON is an ERROR (never another template's data, never a silent demo fallback).
  const missing = { error: `This template (${asset.name || asset.assetId}) has no entry in its template data, so it cannot be generated. Please choose another template.` }
  if (cat.kind === 'cartoon') {
    const c = cat.templates.find((x) => norm(x.name) === norm(asset.name))
    return c ? { id: c.id, name: c.name, cartoonType: c.id } : missing
  }
  const keys = [norm(asset.assetId), norm(asset.name)]
  const t = cat.templates.find((x) => keys.includes(norm(x.id))) || cat.templates.find((x) => keys.includes(norm(x.name)))
  return t ? { id: t.id, name: t.name, title: t.style_title_prompt, desc: t.style_desc_prompt } : missing
}

/** Real image format from the file's first bytes (not the file name or the browser-reported type). Returns a MIME type, 'heic', or ''. */
async function sniffFormat(file) {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const at = (i, text) => [...text].every((c, k) => b[i + k] === c.charCodeAt(0))
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && at(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png'
  if (at(0, 'RIFF') && at(8, 'WEBP')) return 'image/webp'
  if (at(4, 'ftyp') && /^(heic|heix|hevc|hevx|mif1|msf1|heim|heis)$/.test(String.fromCharCode(b[8], b[9], b[10], b[11]))) return 'heic'
  return ''
}

/** Cartoon Yourself accepts only JPG / PNG, up to 5 MB (official docs). */
async function inspectCartoonUpload(file) {
  if (!file) return { error: 'Please add your photo first.' }
  if (!file.size) return { error: 'The file is empty. Please choose a valid JPG or PNG image.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'This photo is larger than 5 MB. Please choose a smaller JPG or PNG image.' }
  const type = await sniffFormat(file)
  if (type === 'heic') return { error: 'HEIC photos are not supported for this style. Please use a JPG or PNG image.' }
  if (type === 'image/webp') return { error: 'WebP photos are not supported for this style. Please use a JPG or PNG image.' }
  if (type !== 'image/jpeg' && type !== 'image/png') return { error: 'This file is not a supported image. Please use a JPG or PNG photo.' }
  return { file: file.type === type ? file : new File([file], file.name, { type }) }
}

/**
 * Checks the photo against the AI Photography limits (real JPG / PNG / WebP content, up to 10 MB) and returns
 * { file, error }. `file` is the same photo re-labelled with its true MIME type, so a wrong or missing browser type
 * (or a wrong extension) cannot make the backend reject a valid image.
 */
export async function inspectUpload(file, kind) {
  if (kind === 'cartoon' || kind === 'hair') return inspectCartoonUpload(file) // Cartoon Yourself and Hairstyle Changer Premium: JPG / PNG only, <= 5 MB
  if (!file) return { error: 'Please add your photo first.' }
  if (file.size > MAX_BYTES) return { error: 'This photo is larger than 10 MB. Please choose a smaller JPG, PNG or WebP image.' }
  if (!file.size) return { error: 'The file is empty. Please choose a valid JPG, PNG or WebP image.' }
  const type = await sniffFormat(file)
  if (type === 'heic') return { error: 'HEIC photos are not supported for this template. Please use a JPG, PNG or WebP image.' }
  if (!ALLOWED_TYPES.includes(type)) return { error: 'This file is not a supported image. Please use a JPG, PNG or WebP photo.' }
  return { file: file.type === type ? file : new File([file], file.name, { type }) }
}

const sleep = (ms, signal) => new Promise((res, rej) => {
  const t = setTimeout(res, ms)
  signal?.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')) }, { once: true })
})

async function readJson(res) {
  try { return await res.json() } catch { return {} }
}

const failure = (body, res) => new Error(
  body?.error?.message
  || (res.status === 404 ? `The AI Photography backend was not found at ${API_BASE}. Start it (npm start in /backend) and check VITE_API_BASE_URL.` : `The generation service returned an error (HTTP ${res.status}).`))

/** First usable https image URL from a succeeded response, or throws. */
function pickImage(body) {
  const url = (body.images || []).find((u) => /^https?:\/\//i.test(u))
  if (!url) throw new Error('The AI finished but did not return an image. Please try again.')
  return url
}

/**
 * Sends the photo plus the template's title/description to the backend and resolves with the generated image URL.
 * Rejects (never resolves with the original photo) on any failure: network, API error, no image, or timeout.
 */
export async function generatePhoto({ file, title, desc, cartoonType, beardTemplate, hairTemplate, hairColor, signal }) {
  const form = new FormData()
  form.append('image', file, file.name)
  if (hairTemplate) { form.append('template', hairTemplate); if (hairColor) form.append('color', hairColor) } // Hairstyle: JSON template id; the backend maps them to the API's hair_style / color
  else if (beardTemplate) form.append('template', beardTemplate) // Beard: the JSON id only; the backend sends the template's reference image as `image_template`
  else if (cartoonType) form.append('type', cartoonType) // Cartoon Yourself: the style is chosen with `type`; no prompts, no image_size
  else {
    form.append('style_title', title)
    form.append('style_desc', desc)
    form.append('image_size', IMAGE_SIZE)
  }

  let res
  try {
    res = await fetch(`${API_BASE}${hairTemplate ? '/api/hairstyle/generate' : beardTemplate ? '/api/beard/generate' : cartoonType ? '/api/cartoon/generate' : '/api/photos/generate'}`, { method: 'POST', body: form, signal })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error('Could not reach the generation service. Make sure the backend is running and try again.')
  }
  let body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  if (body.status === 'succeeded') return pickImage(body)

  // still processing: the backend gives a poll URL; check every 5 seconds
  const pollUrl = body.pollUrl || `/api/photos/tasks/${encodeURIComponent(body.taskId || '')}`
  const deadline = Date.now() + GIVE_UP_MS
  while (Date.now() < deadline) {
    await sleep(POLL_MS, signal)
    try {
      res = await fetch(`${API_BASE}${pollUrl}`, { signal })
    } catch (e) {
      if (e.name === 'AbortError') throw e
      throw new Error('Lost the connection to the generation service. Please try again.')
    }
    body = await readJson(res)
    if (!res.ok) throw failure(body, res)
    if (body.status === 'succeeded') return pickImage(body)
  }
  throw new Error('The generation is taking too long. Please try again in a moment.')
}
