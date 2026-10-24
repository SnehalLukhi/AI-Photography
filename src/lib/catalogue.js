import { API_BASE } from './aiPhotography.js'

/**
 * The template catalogue from the backend (GET /api/templates): { categories, templates }. It is fetched once, before the app's modules
 * (src/data/templates.js) are evaluated - see main.jsx - so the rest of the code can keep reading plain constants.
 * Returns null while it has not loaded, when the request fails or when the database holds no templates yet: the bundled folders + JSON are used then.
 */
let catalogue = null
export const getCatalogue = () => catalogue

export async function loadCatalogue(timeoutMs = 4000) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetch(`${API_BASE}/api/templates`, { signal: ctl.signal })
    const data = res.ok ? await res.json() : null
    if (Array.isArray(data?.templates) && data.templates.length && Array.isArray(data.categories)) catalogue = data
  } catch { /* offline, backend down or timed out: bundled templates */ } finally { clearTimeout(timer) }
  return catalogue
}
