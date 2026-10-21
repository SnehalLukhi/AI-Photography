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

// Login token from POST /api/auth/google, sent as `Authorization: Bearer` on every backend call. Kept in localStorage so a refresh stays logged in.
const TOKEN_KEY = 'ai-photo-token'
let token = ''
try { token = localStorage.getItem(TOKEN_KEY) || '' } catch { /* storage blocked: the login lasts until the page is closed */ }
export const getAuthToken = () => token
export function setAuthToken(value) {
  token = value || ''
  try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
}
const headers = () => (token ? { Authorization: `Bearer ${token}` } : {})
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

// Problems on our side (the AI provider's account is out of credits or its key is rejected) are not something a user can fix: show a neutral message.
const PROVIDER_PROBLEM = new Set(['AILAB_INSUFFICIENT_CREDITS', 'AILAB_AUTH_FAILED', 'AILAB_API_KEY_MISSING'])
/** Error with the backend's message; `.status` is the HTTP status (401 = not logged in / login expired), `.code` the backend's error code (e.g. INSUFFICIENT_COINS). */
const failure = (body, res) => Object.assign(new Error(
  PROVIDER_PROBLEM.has(body?.error?.code) ? 'Generation is temporarily unavailable. Please try again later. Your coins were not used.'
  : body?.error?.message
  || (res.status === 404 ? `The AI Photography backend was not found at ${API_BASE}. Start it (npm start in /backend) and check VITE_API_BASE_URL.` : `The generation service returned an error (HTTP ${res.status}).`)), { status: res.status, code: body?.error?.code })

async function authRequest(path, init) {
  let res
  try { res = await fetch(`${API_BASE}/api/auth/${path}`, init) } catch { throw new Error('Could not reach the server. Make sure the backend is running and try again.') }
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}
const jsonPost = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
let gisLoading
/** Loads Google's sign-in script once. Call early (e.g. when the Login page opens) so the later click can open the Google window without a delay. */
export function loadGoogle() {
  if (!GOOGLE_CLIENT_ID) return Promise.resolve(false)
  gisLoading ||= new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => { gisLoading = undefined; resolve(false) }
    document.head.appendChild(s)
  })
  return gisLoading
}

/** "Continue with Google": opens Google's window, then the backend checks the Google token and returns our own { token, user }. Rejects with a user-facing message. */
export async function loginWithGoogle() {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google sign-in is not set up yet (VITE_GOOGLE_CLIENT_ID is missing).')
  if (!(await loadGoogle())) throw new Error('Could not load Google sign-in. Check your connection and try again.')
  const accessToken = await new Promise((resolve, reject) => {
    window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error('Google sign-in was cancelled.'))),
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Please allow pop-ups and try again.')),
    }).requestAccessToken()
  })
  return authRequest('google', jsonPost({ accessToken }))
}

/** The user a saved token belongs to ({ id, email, name }); rejects with status 401 when the token is no longer valid. */
export const fetchMe = async () => (await authRequest('me', { headers: headers() })).user

/**
 * Result of a succeeded response: { url, original, generationId }. When the backend stored the images (DigitalOcean Spaces) `url` is the stored copy,
 * which does not expire like the AI provider's 24 h link; `original` is the stored upload. Throws when there is no image.
 */
function pickImage(body) {
  const g = body.generation
  const ai = (body.images || []).find((u) => /^https?:\/\//i.test(u))
  const url = g?.result?.url || ai
  if (!url) throw new Error('The AI finished but did not return an image. Please try again.')
  return { url, original: g?.original?.url || '', generationId: g?.id || '' }
}

/** Coin plans for the Pricing page: { plans: [{ id, name, price, currency, per, coins, popular? }], costPerGeneration }. Public. */
export async function getPlans() {
  const res = await fetch(`${API_BASE}/api/plans`)
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/** Coin balance, cost of one generation and the latest coin movements: { coins, costPerGeneration, history }. */
export async function getWallet() {
  const res = await fetch(`${API_BASE}/api/wallet`, { headers: headers() })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/** Redeems a one-time code. Resolves with { coins, balance }. */
export async function redeemCode(code) {
  const res = await fetch(`${API_BASE}/api/wallet/redeem`, { ...jsonPost({ code }), headers: { 'Content-Type': 'application/json', ...headers() } })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/** One-time coin packs for the Get Coins page: { packs: [{ id, name, coins, price (USD), currency, popular? }], costPerGeneration }. Public. */
export async function getCoinPacks() {
  const res = await fetch(`${API_BASE}/api/coin-packs`)
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/** Starts the payment for a plan or coin pack (`itemId`) in US dollars (`currency` is optional and can only be "USD"). Rejects with the backend's message (503 while no payment gateway is connected). */
export async function startCheckout(itemId, currency) {
  const res = await fetch(`${API_BASE}/api/wallet/checkout`, { ...jsonPost({ itemId, currency }), headers: { 'Content-Type': 'application/json', ...headers() } })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/**
 * One page of the logged-in user's stored generations, newest first: { generations: [{ id, status, createdAt, template, original: { url }, result: { url } | null }], nextToken }.
 * Pass the previous `nextToken` to get the next page. Empty when storage is off.
 */
export async function listGenerations({ nextToken, signal } = {}) {
  const res = await fetch(`${API_BASE}/api/generations?limit=24${nextToken ? `&nextToken=${encodeURIComponent(nextToken)}` : ''}`, { headers: headers(), signal })
  const body = await readJson(res)
  if (res.status === 503) return { generations: [], nextToken: undefined }
  if (!res.ok) throw failure(body, res)
  return { generations: body.generations || [], nextToken: body.nextToken }
}

/** One stored generation with fresh signed URLs for the original and the AI image (use it to show both side by side). */
export async function getGeneration(id, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/generations/${encodeURIComponent(id)}`, { headers: headers(), signal })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body.generation
}

/** Deletes both stored images of a generation (only works from the browser that created it). */
export async function deleteGeneration(id) {
  const res = await fetch(`${API_BASE}/api/generations/${encodeURIComponent(id)}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw failure(await readJson(res), res)
}

/**
 * Sends the photo plus the template's title/description to the backend and resolves with the generated image URL.
 * Rejects (never resolves with the original photo) on any failure: network, API error, no image, or timeout.
 */
export async function generatePhoto({ file, title, desc, cartoonType, beardTemplate, hairTemplate, hairColor, name, signal }) {
  const form = new FormData()
  form.append('image', file, file.name)
  if (name) form.append('template_name', name) // shown in My Creations
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
    res = await fetch(`${API_BASE}${hairTemplate ? '/api/hairstyle/generate' : beardTemplate ? '/api/beard/generate' : cartoonType ? '/api/cartoon/generate' : '/api/photos/generate'}`, { method: 'POST', body: form, headers: headers(), signal })
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
      res = await fetch(`${API_BASE}${pollUrl}`, { headers: headers(), signal })
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
