import { API_BASE } from './aiPhotography.js'

/**
 * The template catalogue from the backend (GET /api/templates): { categories, templates }. It is fetched once, before the app's modules
 * (src/data/templates.js) are evaluated - see main.jsx - so the rest of the code can keep reading plain constants.
 * Returns null while it has not loaded, when the request fails or when the database holds no templates yet: the bundled folders + JSON are used then.
 */
let catalogue = null
export const getCatalogue = () => catalogue

// The last catalogue answer is kept in this browser (localStorage), so the next visit shows the templates at once instead of waiting for the request; a fresh copy is
// fetched in the background and saved for the visit after that. Nothing here depends on the user being logged in.
const CACHE_KEY = 'pictrify-catalogue'
const valid = (d) => Array.isArray(d?.templates) && d.templates.length && Array.isArray(d.categories)
const readCache = () => { try { const d = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return valid(d) ? d : null } catch { return null } }

// The request itself is never cut short: a slow answer (a cold serverless start + the database connection can take several seconds) still arrives and is saved in the cache below.
// `timeoutMs` only limits how long the first screen WAITS for it. When the screen did not wait long enough (so it shows the bundled templates) and the live answer arrives afterwards,
// the page may reload once (the live catalogue is then read from the cache), so the live templates replace the bundled ones instead of staying hidden until the next visit.
// Safety rules for that reload: at most once per tab session (sessionStorage flag, set before reloading), only when the answer is really stored in the cache (otherwise the reload
// would fall back again), only within LATE_RELOAD_MS of the page start and only if the visitor has not touched the page yet (a reload would wipe a chosen photo or a running generation).
// A response never overwrites a cache written by a request that STARTED later. Every reason for falling back is written to the browser console.
const LATE_RELOAD_MS = 20_000
const pageStart = Date.now()
let touched = false
if (typeof window !== 'undefined') for (const ev of ['pointerdown', 'keydown', 'touchstart', 'wheel', 'input']) window.addEventListener(ev, () => { touched = true }, { once: true, passive: true, capture: true })

const saveCache = (data, startedAt) => {
  try {
    const current = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (current?._startedAt > startedAt) return valid(current) // a newer request already saved its answer: keep it
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, _startedAt: startedAt }))
    return true
  } catch { return false } // storage full or blocked
}
async function fetchFresh() {
  const startedAt = Date.now()
  try {
    const res = await fetch(`${API_BASE}/api/templates`)
    if (!res.ok) { console.warn(`[catalogue] ${API_BASE}/api/templates answered HTTP ${res.status}; the bundled templates are used.`); return null }
    const data = await res.json()
    if (valid(data)) return { data, stored: saveCache(data, startedAt) }
    console.warn('[catalogue] /api/templates returned no templates or categories; the bundled templates are used.', { templates: data?.templates?.length, categories: data?.categories?.length })
  } catch (e) { console.warn('[catalogue] /api/templates could not be fetched; the bundled templates are used.', e?.message || e) }
  return null
}
const wait = (ms) => new Promise((r) => setTimeout(() => r(null), ms))
const RELOADED = 'pictrify-catalogue-reloaded'
const reloadWhenLate = (fresh) => fresh.then((got) => {
  if (!got?.stored || touched || Date.now() - pageStart > LATE_RELOAD_MS) return
  try { if (sessionStorage.getItem(RELOADED)) return; sessionStorage.setItem(RELOADED, '1') } catch { return } // no flag = no reload: it could loop
  window.location.reload()
})

export async function loadCatalogue(timeoutMs = 4000) {
  const cached = readCache()
  if (cached) { // known templates: wait only briefly for a fresh copy (so templates just added / changed in the admin show up at once), else use the cached one
    const got = await Promise.race([fetchFresh(), wait(1500)])
    catalogue = got?.data || cached
    return catalogue
  }
  const fresh = fetchFresh() // first visit: nothing to show yet, so this request is the only wait (up to timeoutMs)
  const got = await Promise.race([fresh, wait(timeoutMs)])
  catalogue = got?.data || null
  if (!catalogue) reloadWhenLate(fresh)
  return catalogue
}
