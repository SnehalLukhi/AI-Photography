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

async function fetchFresh(timeoutMs) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/templates`, { signal: ctl.signal })
    const data = res.ok ? await res.json() : null
    if (valid(data)) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)) } catch { /* storage full or blocked */ } return data }
  } catch { /* offline, backend down or timed out */ } finally { clearTimeout(timer) }
  return null
}

export async function loadCatalogue(timeoutMs = 4000) {
  const cached = readCache()
  if (cached) { // known templates: wait only briefly for a fresh copy (so templates just added / changed in the admin show up at once), else use the cached one
    const fresh = fetchFresh(timeoutMs)
    catalogue = await Promise.race([fresh, new Promise((r) => setTimeout(() => r(null), 1500))]) || cached
    return catalogue
  }
  catalogue = await fetchFresh(timeoutMs) // first visit: nothing to show yet, so this request is the only wait
  return catalogue
}
