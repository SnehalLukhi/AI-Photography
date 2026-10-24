import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from './client.js'

/**
 * Console state: which app is open, its sign-in (token kept in this browser until it expires), toasts.
 * The route is the URL hash: #/<appId>/<pageId>.
 */
const Ctx = createContext(null)
export const useConsole = () => useContext(Ctx)

const KEY = 'console.sessions'
const read = () => { try { const all = JSON.parse(localStorage.getItem(KEY) || '{}'); return Object.fromEntries(Object.entries(all).filter(([, s]) => s?.token && s.expiresAt > Date.now())) } catch { return {} } } // an ended session is dropped
const write = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* private window: the connection lasts until reload */ } }

const parseHash = () => { const [a, p] = location.hash.replace(/^#\/?/, '').split('/'); return [a || '', p || ''] }

export function ConsoleProvider({ apps, children }) {
  const [[appId, pageId], setRoute] = useState(parseHash)
  const [conns, setConns] = useState(read)
  const [toasts, setToasts] = useState([])
  const seq = useRef(0)

  useEffect(() => { const on = () => setRoute(parseHash()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on) }, [])
  const go = useCallback((a, p) => { location.hash = `#/${a}${p ? `/${p}` : ''}` }, [])

  const app = apps.find((x) => x.id === appId) || null
  const conn = app ? conns[app.id] || null : null
  const disconnect = useCallback((id) => { setConns((c) => { const { [id]: _drop, ...n } = c; write(n); return n }) }, [])
  const api = useMemo(() => (conn ? createClient({ url: app.apiUrl, token: conn.token, onExpired: () => disconnect(app.id) }) : null), [conn, app, disconnect])
  const connect = useCallback((id, session) => { setConns((c) => { const n = { ...c, [id]: session }; write(n); return n }) }, [])

  const toast = useCallback((message, kind = 'ok') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3200)
  }, [])

  const value = useMemo(() => ({ apps, app, pageId, conn, conns, api, go, connect, disconnect, toast, toasts, dismiss: (id) => setToasts((t) => t.filter((x) => x.id !== id)) }), [apps, app, pageId, conn, conns, api, go, connect, disconnect, toast, toasts])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
