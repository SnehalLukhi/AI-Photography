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
// Where the backend is. Local development: http://localhost:5001. Deployed (Vercel services, backend under /api on the same domain): '' = same origin.
// A production build ignores a localhost VITE_API_BASE_URL (copied from the local .env by mistake): it could never work for visitors.
const CONFIGURED_API = import.meta.env.VITE_API_BASE_URL
const API_BASE = ((CONFIGURED_API && !(import.meta.env.PROD && /(^|\/\/)(localhost|127\.0\.0\.1)(:|\/|$)/.test(CONFIGURED_API))) ? CONFIGURED_API : (import.meta.env.DEV ? 'http://localhost:5001' : '')).replace(/\/+$/, '')
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

let tokenClient
let waiting // { resolve, reject } of the sign-in that is currently open
/** Loads Google's script and creates the sign-in client once. Call when the Login page opens: the click must open Google's window at once (browsers block pop-ups opened after a wait). */
export async function prepareGoogle() {
  if (!(await loadGoogle())) return false
  tokenClient ||= window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    callback: (r) => (r.access_token ? waiting?.resolve(r.access_token) : waiting?.reject(new Error(r.error_description || 'Google sign-in failed. Please try again.'))),
    error_callback: (e) => waiting?.reject(new Error(e?.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'The Google window could not open. Please allow pop-ups for this site and try again.')),
  })
  return true
}

/** "Continue with Google": opens Google's account chooser, then the backend checks the Google token and returns our own { token, user }. Rejects with a user-facing message. */
export function loginWithGoogle() {
  // everything up to requestAccessToken() runs synchronously inside the click, so the browser lets the pop-up open
  const popup = new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) return reject(new Error('Google sign-in is not set up yet (VITE_GOOGLE_CLIENT_ID is missing).'))
    if (!tokenClient) return reject(new Error('Google sign-in is still loading. Please try again in a moment.'))
    waiting = { resolve, reject }
    tokenClient.requestAccessToken({ prompt: 'select_account' })
  })
  return popup.then((accessToken) => authRequest('google', jsonPost({ accessToken })))
}

const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || ''
let appleLoading
/** Loads Apple's sign-in script once (call when the Login page opens, so the click can open Apple's window at once). */
export function prepareApple() {
  if (!APPLE_CLIENT_ID) return Promise.resolve(false)
  appleLoading ||= new Promise((resolve) => {
    if (window.AppleID?.auth) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'; s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => { appleLoading = undefined; resolve(false) }
    document.head.appendChild(s)
  })
  return appleLoading
}

/** "Continue with Apple": opens Apple's sign-in window, then the backend checks Apple's identity token and returns our own { token, user }. Rejects with a user-facing message. */
export function loginWithApple() {
  // init + signIn run synchronously inside the click, so the browser lets the pop-up open
  const popup = new Promise((resolve, reject) => {
    if (!APPLE_CLIENT_ID) return reject(new Error('Apple sign-in is not set up yet (VITE_APPLE_CLIENT_ID is missing).'))
    if (!window.AppleID?.auth) return reject(new Error('Apple sign-in is still loading. Please try again in a moment.'))
    const nonce = crypto.randomUUID() // ties the identity token to this sign-in; the backend checks it
    window.AppleID.auth.init({ clientId: APPLE_CLIENT_ID, scope: 'name email', redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || window.location.origin, state: nonce, nonce, usePopup: true })
    window.AppleID.auth.signIn().then(
      (r) => {
        const n = r.user?.name // Apple shares the name only the first time
        resolve({ identityToken: r.authorization?.id_token, nonce, name: n ? `${n.firstName || ''} ${n.lastName || ''}`.trim() : '' })
      },
      (e) => reject(new Error(e?.error === 'popup_closed_by_user' || e?.error === 'user_cancelled_authorize' ? 'Apple sign-in was cancelled.' : 'Apple sign-in failed. Please try again.')),
    )
  })
  return popup.then((body) => authRequest('apple', jsonPost(body)))
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
  const res = await fetch(`${API_BASE}/api/plans`, { headers: headers() }) // the token lets the backend add the offers meant for this user
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
  const res = await fetch(`${API_BASE}/api/coin-packs`, { headers: headers() })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

let razorpayLoading
function loadRazorpay() {
  razorpayLoading ||= new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'; s.async = true
    s.onload = () => resolve(true)
    s.onerror = () => { razorpayLoading = undefined; resolve(false) }
    document.head.appendChild(s)
  })
  return razorpayLoading
}

async function post(path, data) {
  const res = await fetch(`${API_BASE}${path}`, { ...jsonPost(data), headers: { 'Content-Type': 'application/json', ...headers() } })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body
}

/** The user's paid plans and coin packs, newest first: [{ name, kind: 'plan' | 'pack', coins, amount (cents), currency, paidAt, paymentId }]. */
export async function getPurchases() {
  const res = await fetch(`${API_BASE}/api/wallet/purchases`, { headers: headers() })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body.purchases
}

/**
 * Buys a plan or coin pack with Razorpay: the backend creates the order (the price comes from the server), Razorpay's payment window opens, and after paying the backend
 * checks Razorpay's signature and adds the coins. Resolves with { credited, balance, purchase }; rejects with a message when the payment is cancelled, fails, or payments are not set up (503).
 */
export async function buyCoins(itemId, { name = '', email = '' } = {}) {
  const [{ order }, loaded] = await Promise.all([post('/api/wallet/checkout', { itemId }), loadRazorpay()])
  if (!loaded) throw new Error('Could not load the payment window. Check your connection and try again.')
  const subscription = order.kind === 'subscription' // an auto-renewing plan: Razorpay's window gets the subscription id (the amount belongs to the plan)
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId, name: order.name, description: order.description, prefill: { name, email }, theme: { color: '#FF55AA' },
      image: `${window.location.origin}/images/features/logo-256.png`, // the logo in Razorpay's payment window (it must be a small picture on a public address)
      ...(subscription ? { subscription_id: order.subscriptionId } : { amount: order.amount, currency: order.currency, order_id: order.orderId }),
      handler: (r) => post('/api/wallet/verify-payment', subscription
        ? { subscriptionId: r.razorpay_subscription_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }
        : { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }).then(resolve, reject),
      modal: { ondismiss: () => reject(new Error('Payment cancelled.')) },
    })
    rzp.on('payment.failed', (r) => reject(new Error(r?.error?.description || 'The payment failed. Please try again.')))
    rzp.open()
  })
}

/** The plan the user has now (auto-renewing, or cancelled but still paid for): { id, name, coins, status, cancelRequested, renewsAt, endsAt } or null. */
export async function getSubscription() {
  const res = await fetch(`${API_BASE}/api/wallet/subscription`, { headers: headers() })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body.subscription
}

/** Stops the renewals of the current plan; it stays until the end of the period already paid for. Resolves with the updated plan. */
export async function cancelSubscription() {
  return (await post('/api/wallet/subscription/cancel', {})).subscription
}

/**
 * Saves one image of a creation to the user's device: `which` = 'result' (the AI image) | 'original'. The backend sends it as a file download (a plain link to the image
 * would only open it in a tab), so this fetches it with the login token and saves it under the file name the backend gives.
 */
export async function downloadGeneration(id, which = 'result') {
  const res = await fetch(`${API_BASE}/api/generations/${encodeURIComponent(id)}/download?which=${which}`, { headers: headers() })
  if (!res.ok) throw failure(await readJson(res), res)
  const filename = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || `pictrify-${which}.jpg`
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
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

/** Liked templates of the logged-in user (ids), saved in the database. */
export async function listFavorites() {
  const res = await fetch(`${API_BASE}/api/favorites`, { headers: headers() })
  const body = await readJson(res)
  if (!res.ok) throw failure(body, res)
  return body.favorites || []
}
export async function setFavorite(templateId, on) {
  const res = on
    ? await fetch(`${API_BASE}/api/favorites`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers() }, body: JSON.stringify({ templateId }) })
    : await fetch(`${API_BASE}/api/favorites?templateId=${encodeURIComponent(templateId)}`, { method: 'DELETE', headers: headers() })
  if (!res.ok) throw failure(await readJson(res), res)
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
