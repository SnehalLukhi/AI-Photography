/**
 * Talks to one app's admin API. Every app the console manages exposes the same small contract: sign in once for a token, send it as `Authorization: Bearer`, JSON in / out.
 *   const { token } = await login('https://example.com', '/api/admin/login', username, password)
 *   const api = createClient({ url: 'https://example.com', token, onExpired })
 *   await api.get('/api/admin/stats')
 * A page never builds a request by hand, so adding another app only means pointing a client at its API.
 */
export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

/** Signs in and returns { token, username, expiresAt, app }. */
export async function login(url, path, username, password) {
  let res
  try {
    res = await fetch(`${String(url || '').replace(/\/+$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username, password }) })
  } catch {
    throw new ApiError("Cannot reach the server. Check that it is running and that this console's address is allowed by it (CORS_ORIGIN).", 0, 'NETWORK')
  }
  let data = null
  try { data = await res.json() } catch { /* not JSON */ }
  if (!res.ok) throw new ApiError(data?.error?.message || `Sign-in failed (${res.status}).`, res.status, data?.error?.code)
  return data
}

export function createClient({ url, token, onExpired }) {
  const base = String(url || '').replace(/\/+$/, '')
  async function request(method, path, { body, query } = {}) {
    const qs = query ? `?${new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString()}` : ''
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData
    let res
    try {
      res = await fetch(`${base}${path}${qs}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body && !isForm ? { 'content-type': 'application/json' } : {}) },
        body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      })
    } catch {
      throw new ApiError('Cannot reach the server. Check the address, that it is running, and that this console\'s address is allowed by it (CORS_ORIGIN).', 0, 'NETWORK')
    }
    let data = null
    try { data = await res.json() } catch { /* empty or not JSON */ }
    if (res.status === 401) onExpired?.() // the session ended: back to the sign-in screen
    if (!res.ok) throw new ApiError(data?.error?.message || `Request failed (${res.status}).`, res.status, data?.error?.code)
    return data
  }
  return {
    url: base,
    get: (path, query) => request('GET', path, { query }),
    post: (path, body, query) => request('POST', path, { body, query }),
    put: (path, body) => request('PUT', path, { body }),
    del: (path, query) => request('DELETE', path, { query }),
  }
}
