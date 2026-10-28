import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { Logo, ProfileMenu, displayName, walletTarget } from './Header.jsx'
import TemplateCard from './TemplateCard.jsx'
import { Head, SeeAll, FeaturedCarousel, CategoryRows, tabLink, getCollections, useTrendingPicks } from './homeParts.jsx'
import { templatesByIds, generateUrl, categoryItems } from '../data/templates.js'
import { getPlans, listGenerations } from '../lib/aiPhotography.js'

/**
 * The logged-in home: a dashboard in the style of a creative-platform workspace (all of it only READS existing data and links to existing routes). Desktop: a fixed top bar (logo, search, coins, profile)
 * and a fixed left sidebar; phones keep the app's own top bar and bottom tabs. Main column: a featured carousel, quick tools, ready-made presets (category pills + a gallery), trending, the user's
 * recent creations and favourites, every photo style as its own row, and the video section (honestly marked as coming soon - the backend has no video generation yet).
 */
const I = {
  create: 'M12 4v16M4 12h16', discover: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z', photo: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', video: 'M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM17 10l5-3v10l-5-3z',
  library: 'M3 7h18M3 12h18M3 17h12', coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 12h6M12 9v6', plan: 'M12 2l2.6 6.9L22 12l-7.4 3.1L12 22l-2.6-6.9L2 12l7.4-3.1z', list: 'M4 7h16M4 12h16M4 17h10',
  help: 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17.2v.1M12 21a9 9 0 100-18 9 9 0 000 18z', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
}
const Icon = ({ d, className = 'size-[18px]' }) => <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

const SIDE = [
  { to: '/', label: 'Create', icon: I.create, end: true },
  { to: '/explore', label: 'Discover', icon: I.discover },
  { to: '/explore?category=trending', label: 'Trending', icon: I.photo },
  { to: '/video', label: 'Video', icon: I.video, soon: true },
  { to: '/creations', label: 'My Creations', icon: I.library },
]
const SIDE2 = [['/pricing', 'Plans', I.plan], ['/coins', 'Coin packs', I.coin], ['/help', 'Help', I.help]]
const TOOLS = [
  ['Photo studio', '/explore', I.photo], ['Video studio', '/video', I.video], ['My creations', '/creations', I.library], ['Trending looks', '/explore?category=trending', I.discover],
  ['Plans', '/pricing', I.plan], ['Coin packs', '/coins', I.coin], ['Transactions', '/transactions', I.list], ['Help', '/help', I.help],
]

function Sidebar({ coins, cost }) {
  const item = (on) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${on ? 'bg-[#1A1626] text-white' : 'text-[#A1A1AA] hover:bg-[#12101B] hover:text-white'}`
  return (
    <aside aria-label="Dashboard" className="no-scrollbar fixed bottom-0 left-0 top-16 z-30 hidden w-60 flex-col overflow-y-auto border-r border-[#272033] bg-[#0D0B14] p-3 md:flex">
      <Link to="/explore" className="btn-grad !w-full !py-2.5 !text-[14px]"><span aria-hidden="true">+</span> Start creating</Link>
      <nav className="mt-4 flex flex-col gap-0.5">
        {SIDE.map((n) => (
          <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => item(isActive && n.to === '/')}>
            <Icon d={n.icon} />{n.label}{n.soon && <span className="ml-auto rounded-full bg-[#1A1626] px-1.5 py-px text-[10px] font-semibold text-[#C4B5FD]">Soon</span>}
          </NavLink>
        ))}
      </nav>
      <div className="mt-5 border-t border-[#272033] pt-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A]">Account</p>
        <nav className="flex flex-col gap-0.5">{SIDE2.map(([to, label, d]) => <Link key={to} to={to} className={item(false)}><Icon d={d} />{label}</Link>)}</nav>
      </div>
      <div className="mt-auto rounded-2xl border border-[#272033] bg-[#12101B] p-4">
        <p className="text-[12px] text-[#A1A1AA]">Your coins</p>
        <div className="mt-1 flex items-center gap-2"><img src="/images/features/coin.svg" alt="" className="size-6 object-contain" /><span className="font-display text-[26px] font-bold leading-none">{coins.toLocaleString()}</span></div>
        <p className="mt-1.5 text-[12px] text-[#A1A1AA]">{cost ? `About ${Math.floor(coins / cost)} photo${Math.floor(coins / cost) === 1 ? '' : 's'} at ${cost} coins each` : 'Coins are used for each photo.'}</p>
        <Link to={walletTarget(coins)} className="btn-dark !mt-3 !w-full !py-2 !text-[13px]">Get more coins</Link>
      </div>
    </aside>
  )
}

function TopBar({ coins }) {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const go = (e) => { e.preventDefault(); const v = q.trim(); nav(v ? `/explore?q=${encodeURIComponent(v)}` : '/explore') }
  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-16 items-center gap-4 border-b border-[#272033] bg-[#08080D]/95 px-4 backdrop-blur-xl md:flex">
      <div className="w-[216px] shrink-0"><Logo /></div>
      <form onSubmit={go} role="search" className="flex h-11 min-w-0 max-w-[640px] flex-1 items-center gap-3 rounded-full border border-[#272033] bg-[#12101B] px-4 focus-within:border-[#8B5CF6]">
        <Icon d={I.search} className="size-[17px] text-[#A1A1AA]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search templates" placeholder="Search for looks, styles, keywords..." className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#71717A]" />
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <Link to="/explore" className="btn-primary !h-10 !px-5 !py-0 !text-[14px]"><span aria-hidden="true">+</span>Create</Link>
        <Link to={walletTarget(coins)} aria-label={`${coins} coins - open wallet`} className="inline-flex h-10 items-center gap-2 rounded-full border border-[#272033] bg-[#12101B] pl-2.5 pr-3.5 text-[13px] font-medium text-white transition-colors hover:border-[#8B5CF6]"><img src="/images/features/coin.svg" alt="" className="size-5 object-contain" />{coins.toLocaleString()}<span className="text-[#A78BFA]">+</span></Link>
        <ProfileMenu />
      </div>
    </header>
  )
}

/** A horizontally scrolling row of image cards (each shown whole, at its own shape). */
function Rail({ items, onSelect, h = 'h-[220px] lg:h-[260px]', label }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t)} aria-label={t.name} className={`group relative block ${h} shrink-0 cursor-pointer snap-start overflow-hidden rounded-[20px] border border-[#272033] bg-[#12101B] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]`}>
          <img src={t.image} alt="" loading="lazy" draggable="false" className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08080D]/90 to-transparent px-3.5 pb-2.5 pt-9"><span className="block truncate text-[13px] font-semibold text-white">{t.name}</span></span>
        </button>
      ))}
    </div>
  )
}

export default function MemberHome() {
  const nav = useNavigate()
  const { user, userEmail, coins, favorites } = useStudio()
  const collections = getCollections()
  const { custom, trendingPicks } = useTrendingPicks()
  const pick = (t) => nav(generateUrl(t))
  const first = (user?.name || displayName(userEmail || '')).split(' ')[0] || 'there'

  const [cost, setCost] = useState(null) // coins per image, from the backend
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])

  // the user's latest saved creations (read-only; the Creations page does the full list)
  const [recent, setRecent] = useState(null) // null while loading
  useEffect(() => {
    const ctrl = new AbortController()
    listGenerations({ signal: ctrl.signal })
      .then(({ generations }) => setRecent(generations.filter((g) => g.result?.url).slice(0, 8).map((g) => ({ id: g.id, name: g.template || 'AI photo', image: g.result.url }))))
      .catch(() => { if (!ctrl.signal.aborted) setRecent([]) })
    return () => ctrl.abort()
  }, [])
  const favs = templatesByIds([...favorites]).slice(0, 12)

  // ready-made presets: category pills; the gallery shows the chosen collection's templates
  const [preset, setPreset] = useState(null)
  const toonLast = (c) => /toon|cartoon/i.test(`${c.id} ${c.name}`) // cartoon-style categories (Toon World) go to the end of the pills; the others keep their order
  const presets = [...collections.filter((c) => !toonLast(c)), ...collections.filter(toonLast)]
  const activePreset = presets.find((c) => c.id === preset) || presets[0]
  const presetItems = activePreset ? categoryItems(activePreset.id) : []

  // featured carousel: the admin's Trending list as large cards, snapping one after another
  const feat = custom // ONLY the templates marked Trending in the admin (no built-in fallback, no cap); nothing is shown until some are marked

  return (
    <>
      <TopBar coins={coins} />
      <Sidebar coins={coins} cost={cost} />
      <div className="w-full text-white md:pl-60 md:pt-16">
        <div className="mx-auto w-full max-w-[1500px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
          {/* featured carousel */}
          <section aria-label="Featured">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-[14px] font-semibold text-[#C4B5FD]">Welcome back</p><h1 className="text-[28px] sm:text-[36px]">Hi {first}, what will you create today?</h1></div>
              <SeeAll to="/explore?category=trending" />
            </div>
            <FeaturedCarousel items={feat} />
          </section>

          {/* quick tools */}
          <section aria-label="Tools" className="mt-8">
            <Head title="Tools & shortcuts" />
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {TOOLS.map(([label, to, d]) => (
                <Link key={label} to={to} className="chip !gap-2.5 !rounded-2xl !px-4 !py-2.5"><span className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#7C3AED,#C026D3)] text-white"><Icon d={d} className="size-4" /></span>{label}{label === 'Video studio' && <span className="rounded-full bg-[#1A1626] px-1.5 py-px text-[10px] font-semibold text-[#C4B5FD]">Soon</span>}</Link>
              ))}
            </div>
          </section>

          {/* ready-made presets */}
          {collections.length > 0 && (
            <section aria-label="Ready-made presets" className="mt-9">
              <Head title="Ready-made presets" sub="Pick a style, then pick a look." to={activePreset ? tabLink(activePreset) : '/explore'} />
              <div role="tablist" aria-label="Preset categories" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                {presets.map((c) => <button key={c.id} type="button" role="tab" aria-selected={activePreset?.id === c.id} onClick={() => setPreset(c.id)} className={`chip shrink-0 ${activePreset?.id === c.id ? 'chip-on' : ''}`}>{c.category || c.name}</button>)}
              </div>
              <Rail items={presetItems} onSelect={pick} label={`${activePreset?.name} looks`} />
            </section>
          )}

          {/* trending */}
          {trendingPicks.length > 0 && (
            <section aria-label="Trending" className="mt-9">
              <Head title="Trending templates" sub="Popular looks picked by the Pictrify team." to="/explore?category=trending" />
              <div className="grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 md:gap-5 xl:grid-cols-6">
                {trendingPicks.slice(0, 12).map((t) => <TemplateCard key={t.id} t={t} fav fit="cover" onSelect={pick} />)}
              </div>
            </section>
          )}

          {/* video creation */}
          <section aria-label="Video creation" className="mt-9 max-md:hidden">
            <Link to="/video" className="group relative isolate flex flex-col gap-4 overflow-hidden rounded-[28px] border border-[#272033] bg-[#0D0B14] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div><span className="badge">Coming soon</span><h2 className="mt-3 text-[26px] sm:text-[32px]">Video creation</h2><p className="mt-1.5 max-w-xl text-[15px] text-[#A1A1AA]">Bring your photos to life with short clips. The studio is being built - open it to see what is planned.</p></div>
              <span className="btn-primary shrink-0">Open video studio<span className="arrow" aria-hidden="true">→</span></span>
            </Link>
          </section>

          {/* recent creations */}
          <section aria-label="Recent creations" className="mt-9 max-md:hidden">
            <Head title="Your recent creations" to={recent?.length ? '/creations' : undefined} />
            {recent === null ? (
              <div className="flex gap-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[220px] w-[160px] animate-pulse rounded-[20px] bg-[#12101B]" aria-hidden="true" />)}</div>
            ) : recent.length ? (
              <Rail items={recent} onSelect={() => nav('/creations')} label="Recent creations" />
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-[24px] bg-[#12101B] p-6 sm:flex-row sm:items-center sm:justify-between">
                <div><h3 className="text-[19px]">Nothing here yet</h3><p className="mt-1 text-[14px] text-[#A1A1AA]">Your first creation will show up here.</p></div>
                <Link to="/explore" className="btn-primary !px-6 !py-2.5">Pick a look<span className="arrow" aria-hidden="true">→</span></Link>
              </div>
            )}
          </section>

          {/* favourites */}
          {favs.length > 0 && (
            <section aria-label="Favourites" className="mt-9">
              <Head title="Your favourites" sub="Looks you saved with the heart." />
              <div className="grid grid-cols-2 gap-4 min-[480px]:grid-cols-3 md:gap-5 xl:grid-cols-6">
                {favs.slice(0, 6).map((t) => <TemplateCard key={t.id} t={t} fav fit="cover" onSelect={pick} />)}
              </div>
            </section>
          )}

          {/* every photo style as its own row */}
          {collections.length > 0 && (
            <section aria-label="Photo styles" className="mt-9">
              <div className="flex flex-col gap-8"><CategoryRows collections={collections} onSelect={pick} /></div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
