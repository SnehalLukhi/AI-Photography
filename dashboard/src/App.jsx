import { useEffect, useState } from 'react'
import { useConsole } from './core/store.jsx'
import { login } from './core/client.js'
import { Icon } from './core/icons.jsx'
import { Spinner, Toasts, cx } from './core/ui.jsx'

/** The page shell: sidebar (app switcher + that app's pages), top bar, the open page, and the connect screen for an app that is not connected yet. */

function Logo() {
  return <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-pink shadow-[0_8px_20px_-6px_rgba(139,108,255,.8)]"><svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"><path d="M8 19V6h5.5a3.5 3.5 0 010 7H10" /></svg></span>
}

function Connect({ app }) {
  const { connect, toast, go } = useConsole()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      const out = await login(app.apiUrl, app.loginPath, username.trim(), password)
      connect(app.id, { token: out.token, username: out.username, expiresAt: out.expiresAt })
      toast(`Welcome, ${out.username}`)
    } catch (err) { setError(err.status === 503 ? 'Admin sign-in is not set up on the server yet (ADMIN_USERNAME and ADMIN_PASSWORD).' : err.message); setPassword('') }
    setBusy(false)
  }
  return (
    <div className="grid min-h-full place-items-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-7 animate-rise">
        <div className="mb-6 flex items-center gap-3"><Logo /><div><h1 className="text-xl font-bold text-white">{app.name} admin</h1><p className="text-sm text-white/45">Sign in to continue</p></div></div>
        <label className="label" htmlFor="user">User name</label>
        <div className="relative mb-4"><Icon name="users" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><input id="user" className="input pl-9" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required /></div>
        <label className="label" htmlFor="pass">Password</label>
        <div className="relative"><Icon name="lock" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" /><input id="pass" type={show ? 'text' : 'password'} className="input px-9" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md px-1.5 py-1 text-xs text-white/40 hover:text-white">{show ? 'Hide' : 'Show'}</button></div>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
        <button className="btn-primary mt-6 w-full" disabled={busy || !username || !password}>{busy ? <Spinner className="size-4" /> : null}{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="mt-3 w-full cursor-pointer text-center text-sm text-white/40 hover:text-white" onClick={() => go('')}>Back to apps</button>
      </form>
    </div>
  )
}

function Home() {
  const { apps, conns, go } = useConsole()
  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-10">
      <div className="mb-8 flex items-center gap-3 animate-rise"><Logo /><div><h1 className="text-3xl font-bold text-white">Admin Console</h1><p className="text-sm text-white/45">Pick an app to manage.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        {apps.map((a) => (
          <button key={a.id} type="button" onClick={() => go(a.id, a.nav[0].pages[0].id)} className="card group cursor-pointer p-6 text-left transition hover:-translate-y-1 hover:border-white/20 animate-rise">
            <span className="mb-4 grid size-12 place-items-center rounded-2xl text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${a.accent}, #8B6CFF)` }}>{a.name[0]}</span>
            <p className="font-display text-xl font-bold text-white">{a.name}</p><p className="text-sm text-white/45">{a.tagline}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-white/40"><span className={cx('size-2 rounded-full', conns[a.id] ? 'bg-emerald-400' : 'bg-white/25')} />{conns[a.id] ? 'Signed in' : 'Sign in required'}<Icon name="chevron" className="ml-auto size-4 transition group-hover:translate-x-1" /></p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { apps, app, pageId, conn, api, go, disconnect, toasts, dismiss } = useConsole()
  const [menu, setMenu] = useState(false)
  const [tick, setTick] = useState(0) // bumping it re-mounts the page: "Refresh"
  useEffect(() => { setMenu(false); window.scrollTo(0, 0) }, [app?.id, pageId])
  useEffect(() => { if (app && !pageId) go(app.id, app.nav[0].pages[0].id) }, [app, pageId, go])

  const pages = app ? app.nav.flatMap((g) => g.pages) : []
  const page = pages.find((p) => p.id === pageId) || pages[0]
  const Page = page?.component

  let body
  if (!app) body = <Home />
  else if (!conn) body = <Connect app={app} />
  else body = <div className="mx-auto w-full max-w-[1280px] p-4 sm:p-6 lg:p-8" key={`${app.id}/${page.id}/${tick}`}><Page api={api} app={app} /></div>

  return (
    <div className="flex h-full">
      {app && conn && (
        <>
          {menu && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMenu(false)} />}
          <aside className={cx('fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-panel/95 backdrop-blur transition-transform lg:static lg:translate-x-0', menu ? 'translate-x-0' : '-translate-x-full')}>
            <button type="button" onClick={() => go('')} className="flex cursor-pointer items-center gap-3 px-5 py-5 text-left"><Logo /><span className="font-display text-lg font-bold text-white">Console</span></button>
            <div className="px-3">
              <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">Apps</p>
              <div className="mb-4 space-y-1">
                {apps.map((a) => (
                  <button key={a.id} type="button" onClick={() => go(a.id, a.nav[0].pages[0].id)} className={cx('flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition', a.id === app.id ? 'bg-white/[0.08] text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white')}>
                    <span className="grid size-7 place-items-center rounded-lg text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${a.accent}, #8B6CFF)` }}>{a.name[0]}</span>{a.name}
                  </button>
                ))}
              </div>
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {app.nav.map((g) => (
                <div key={g.group} className="mb-4">
                  <p className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">{g.group}</p>
                  {g.pages.map((p) => (
                    <button key={p.id} type="button" onClick={() => go(app.id, p.id)} className={cx('relative mb-0.5 flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition', p.id === page.id ? 'bg-gradient-to-r from-brand/25 to-pink/10 text-white' : 'text-white/55 hover:bg-white/[0.05] hover:text-white')}>
                      {p.id === page.id && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-gradient-to-b from-brand to-pink" />}
                      <Icon name={p.icon} className="size-[18px]" />{p.label}
                    </button>
                  ))}
                </div>
              ))}
            </nav>
            <div className="border-t border-line p-3">
              <p className="truncate px-2 pb-2 text-xs text-white/35"><span className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400" />{conn.username || 'admin'}</p>
              <button type="button" onClick={() => disconnect(app.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/50 transition hover:bg-white/[0.05] hover:text-white"><Icon name="logout" className="size-[18px]" />Sign out</button>
            </div>
          </aside>
        </>
      )}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {app && conn && (
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-ink/80 px-4 py-3 backdrop-blur sm:px-6">
            <button type="button" aria-label="Menu" onClick={() => setMenu(true)} className="cursor-pointer rounded-lg p-2 text-white/70 hover:bg-white/10 lg:hidden"><Icon name="menu" /></button>
            <div className="min-w-0 flex-1 text-sm"><span className="text-white/40">{app.name}</span><span className="mx-2 text-white/20">/</span><span className="font-medium text-white">{page.label}</span></div>
            <button type="button" onClick={() => setTick((t) => t + 1)} className="btn-ghost !px-3 !py-2" title="Reload this page's data"><Icon name="refresh" className="size-4" /><span className="hidden sm:inline">Refresh</span></button>
          </header>
        )}
        {body}
      </main>
      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  )
}

