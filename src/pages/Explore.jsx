import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import TemplateCard from '../components/TemplateCard.jsx'
import PImage from '../components/PImage.jsx'
import { exploreTabs, sortTabs, hairstyleTab, exploreEverything, categoryItems, generateUrl, templatesByIds } from '../data/templates.js'
import { useTrending } from '../lib/useTrending.js'
import { useStudio } from '../context/StudioContext.jsx'
import { getPlans } from '../lib/aiPhotography.js'

// "Hairstyle" is offered through its sub-categories (Man / Woman / Baby); only non-empty ones are listed.
const subsWithItems = (parent) => { const subs = parent.subs.filter((s) => categoryItems(s.tabId).length); return subs.length ? [{ ...parent, subs }] : [] }

// Trending until some looks are marked in the admin: up to 5 from each category, round-robin so neighbours differ
const TRENDING_GROUPS = [['80s-and-90s'], ['cartoon'], ['linkedin-headshot'], ['old-money'], ['beard'], ['hairstyle-baby', 'hairstyle-man', 'hairstyle-woman']]
const roundRobin = (ids, max) => {
  const lists = ids.map((id) => categoryItems(id)); const out = []
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length && out.length < max) out.push(l[i]) })
  return out
}
const trendingGroups = TRENDING_GROUPS.map((g) => roundRobin(g, 5))
const defaultGrid = [0, 1, 2, 3, 4].flatMap((i) => trendingGroups.map((g) => g[i])).filter(Boolean)

const Chip = ({ on, onClick, children, count }) => (
  <button type="button" role="tab" aria-selected={on} onClick={onClick}
    className={`chip h-10 shrink-0 ${on ? 'chip-on !font-semibold' : ''}`}>
    {children}
  </button>
)

/** Quick preview: the look large, what it needs and costs, "Use this look". A side panel on desktop, a bottom sheet on phones. */
function Preview({ list, index, onClose, onStep, onUse }) {
  const t = list[index]
  const { signedIn, favorites, toggleFavorite, openLogin } = useStudio()
  const [cost, setCost] = useState(null)
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onStep(1); if (e.key === 'ArrowLeft') onStep(-1) }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose, onStep])
  if (!t) return null
  const liked = favorites.has(t.id)
  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label={`${t.name} preview`}>
      <div onClick={onClose} className="absolute inset-0 bg-[#08080D]/50 backdrop-blur-[2px]" />
      <aside className="absolute inset-x-0 bottom-0 flex max-h-[92dvh] flex-col gap-5 overflow-y-auto overscroll-contain rounded-t-3xl bg-[#12101B] p-5 shadow-[0_-18px_40px_rgba(0,0,0,0.14)] md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-l-3xl md:rounded-tr-none md:p-7">
        <div className="flex items-center justify-between">
          <span className="font-plexmono text-[11px] uppercase tracking-[0.1em] text-[#A1A1AA]">Look {index + 1} of {list.length}</span>
          <button type="button" aria-label="Close preview" onClick={onClose} className="grid size-9 cursor-pointer place-items-center rounded-full bg-[#12101B] text-[#FFFFFF] transition hover:bg-[#1A1626]"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <div className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-2xl bg-[#12101B]" style={{ maxWidth: 'max(200px, calc((100dvh - 330px) * 0.5625))' }}>
          <PImage src={t.image} alt={t.name} className="absolute inset-0 h-full w-full object-cover" draggable="false" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08080D]/85 via-[#08080D]/40 to-transparent px-4 pb-4 pt-20">
            <span className="inline-block rounded-full bg-[#12101B]/90 px-2.5 py-1 font-plexmono text-[10px] uppercase tracking-[0.1em] text-[#FFFFFF]">{t.category}</span>
            <h2 className="mt-2 text-[30px] font-bold leading-[1.05] text-white">{t.name}</h2>
          </div>
          <button type="button" aria-pressed={liked} aria-label={liked ? 'Remove from favourites' : 'Add to favourites'} onClick={() => (signedIn ? toggleFavorite(t.id) : openLogin())} className="absolute right-3 top-3 grid size-10 cursor-pointer place-items-center rounded-full bg-[#12101B]/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm transition-transform hover:bg-[#1A1626] active:scale-90">
            <svg viewBox="0 0 24 24" className={`size-[18px] ${liked ? 'fill-[#C026D3] text-[#C026D3]' : 'fill-none text-[#FFFFFF]'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" /></svg>
          </button>
        </div>
        <dl className="grid grid-cols-3 rounded-2xl bg-[#12101B]">
          {[['Cost', cost ? `${cost} coins` : '...'], ['Shape', '9:16'], ['Needs', t.slots?.length > 1 ? `${t.slots.length} photos` : '1 photo']].map(([k, v], i) => (
            <div key={k} className={`px-3.5 py-3 ${i < 2 ? 'border-r border-[#272033]' : ''}`}><dt className="font-plexmono text-[10px] uppercase tracking-[0.08em] text-[#A1A1AA]">{k}</dt><dd className="mt-1 text-[15px] font-semibold text-[#FFFFFF]">{v}</dd></div>
          ))}
        </dl>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => onUse(t)} className="btn-grad !py-3.5 !text-[16px]">Use this look</button>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => onStep(-1)} disabled={list.length < 2} className="btn-dark flex-1 !px-3 !py-2.5 !text-[14px]">← Previous</button>
            <button type="button" onClick={() => onStep(1)} disabled={list.length < 2} className="btn-dark flex-1 !px-3 !py-2.5 !text-[14px]">Next →</button>
          </div>
        </div>
      </aside>
    </div>
  )
}

export default function Explore() {
  // Trending = the looks marked in the admin (they also stay in their own collection); until some are set, the built-in picks above
  const trendingIds = useTrending()
  const custom = trendingIds ? templatesByIds(trendingIds) : []
  const trendingGrid = custom.length ? custom : defaultGrid
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  // Hairstyle has no dropdown: each sub-category is a collection of its own ("Hairstyle Man", ...). Old links (?category=hairstyle&sub=man) still work.
  const hairstyleChips = subsWithItems(hairstyleTab).flatMap((p) => p.subs.map((sc) => ({ id: sc.tabId, subId: sc.id, name: `${p.name} ${sc.name}` })))
  const rawCategory = params.get('category')
  const active = rawCategory === 'hairstyle' ? (hairstyleChips.find((c) => c.subId === params.get('sub')) || hairstyleChips[0])?.id ?? rawCategory : rawCategory
  const tabsWithItems = exploreTabs.filter((t) => !t.parent && categoryItems(t.id).length)
  const chips = [{ id: 'trending', name: 'Trending' }, ...sortTabs([...tabsWithItems, ...hairstyleChips])] // Trending is always first; the rest follow the admin's order. A collection appears once it has looks
  const chip = chips.find((c) => c.id === active) || chips[0]
  const only = params.get('only') === '1' && !params.get('q') // arrived through a category's "See all": show just that category, no other collection chips
  const shownChips = only ? [chip] : chips
  const q = (params.get('q') || '').trim()
  const setChip = (c) => setParams({ category: c.id }, { replace: false })
  const countOf = (c) => (c.id === 'trending' ? trendingGrid.length : categoryItems(c.id).length)

  // everything searchable: every look of every collection (de-duplicated)
  const everything = useMemo(() => {
    const seen = new Set()
    return [...exploreEverything, ...chips.flatMap((c) => (c.id === 'trending' ? [] : categoryItems(c.id)))].filter((t) => !seen.has(t.id) && seen.add(t.id))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const results = q ? everything.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(q.toLowerCase())) : null
  const list = results || (chip.id === 'trending' ? trendingGrid : categoryItems(chip.id))

  // Top Carousel: every card takes the shape of its own picture (as in the admin) and shows it whole; the real width / height is read once per picture
  const isTop = chip.id === 'top-carousel' && !results
  const [shapes, setShapes] = useState({})
  useEffect(() => {
    if (!isTop) return
    list.forEach((t) => {
      const im = new Image()
      im.onload = () => im.naturalWidth && im.naturalHeight && setShapes((m) => (m[t.image] ? m : { ...m, [t.image]: `${im.naturalWidth} / ${im.naturalHeight}` }))
      im.src = t.image
    })
  }, [isTop, list.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const searchBox = useRef(null)
  const [draft, setDraft] = useState(q)
  useEffect(() => { setDraft(q) }, [q])
  useEffect(() => { if (params.get('focus') === 'search') searchBox.current?.focus() }, [params])
  const submitSearch = (e) => { e.preventDefault(); const v = draft.trim(); setParams(v ? { q: v } : {}) }

  const [open, setOpen] = useState(-1) // index in `list` of the look shown in the preview
  const viewKey = `${chip.id}|${q}`
  const first = useRef(true)
  useEffect(() => { setOpen(-1); if (first.current) { first.current = false; return } window.scrollTo(0, 0) }, [viewKey])
  const step = (d) => setOpen((i) => (list.length ? (i + d + list.length) % list.length : -1))

  const card = (t, i) => (
    <TemplateCard key={t.id} t={t} fav selected={open === i} action="Quick preview" onSelect={() => setOpen(i)}
      ratio={isTop ? shapes[t.image] || '9 / 16' : '9 / 16'} fit={isTop ? 'contain' : 'cover'} />
  )

  const fromHome = params.get('from') === 'home' // phones: opened from a Home category's "More"
  const { signedIn, favorites, toggleFavorite, openLogin } = useStudio()
  const mobileTitle = chip.id === 'trending' ? 'Trending Templates' : `${chip.name} Templates`

  return (
    <>
    {/* ---------- phone Explore, like the reference: eyebrow + title, underlined tabs, one titled 2-column grid ---------- */}
    <div className="pb-32 text-[#FFFFFF] md:hidden">
      {fromHome ? (
        <div className="flex items-center gap-3 px-4 pb-3 pt-3">
          <Link to="/" aria-label="Back to Home" className="grid size-9 shrink-0 place-items-center rounded-full bg-[#12101B] text-[#FFFFFF]"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <h1 className="truncate text-xl font-bold tracking-tight text-[#FFFFFF]">{chip.name}</h1>
        </div>
      ) : (
        <>
          <header className="px-5 pt-7">
            <p className="eyebrow">Discover AI styles</p>
            <h1 className="mt-3 text-[40px] font-bold leading-[1.05] tracking-tight text-[#FFFFFF]">Explore <span className="grad-text">Templates</span></h1>
            <p className="mt-3 text-[16px] leading-relaxed text-[#A1A1AA]">Find the perfect AI photo for start creating in seconds.</p>
          </header>
          <div className="mt-7">
            <div role="tablist" aria-label="Collections" className="no-scrollbar flex gap-2 overflow-x-auto px-5">
              {shownChips.map((c) => {
                const on = chip.id === c.id
                return (
                  <button key={c.id} type="button" role="tab" aria-selected={on} onClick={() => setChip(c)} className={`chip h-10 shrink-0 outline-none ${on ? 'chip-on !font-semibold' : ''}`}>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="section-head mt-8 !mb-0 px-5"><h2 className="section-title">{mobileTitle}</h2><span className="text-[13px] text-[#A1A1AA]">{list.length} {list.length === 1 ? 'look' : 'looks'}</span></div>
        </>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2 px-5">
        {list.map((t) => {
          const liked = favorites.has(t.id)
          return (
            <div key={t.id} className="relative">
              <Link to={generateUrl(t)} aria-label={t.name} className="relative block aspect-[9/16] overflow-hidden rounded-[6px] bg-[#12101B] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <PImage src={t.image} alt={t.name} loading="lazy" className="absolute inset-0 size-full object-cover" draggable="false" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#08080D]/60 via-transparent to-transparent" />
                <span className="absolute inset-x-2 bottom-2.5 truncate text-center text-[12px] font-medium text-white">{t.name}</span>
              </Link>
              <button type="button" aria-pressed={liked} aria-label={liked ? 'Remove from favourites' : 'Add to favourites'} onClick={() => (signedIn ? toggleFavorite(t.id) : openLogin())} className="absolute right-2 top-2 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-[#12101B]/90 shadow-[0_4px_12px_rgba(0,0,0,0.15)] backdrop-blur-sm">
                <svg viewBox="0 0 24 24" className={`size-[18px] ${liked ? 'fill-[#C026D3] text-[#C026D3]' : 'fill-none text-[#FFFFFF]'}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z" /></svg>
              </button>
            </div>
          )
        })}
      </div>
    </div>

    <div className="mx-auto hidden w-full max-w-none px-5 pb-8 pt-8 text-[#FFFFFF] sm:px-8 sm:pt-10 md:block lg:px-10">
      <div className="mb-7 flex flex-col gap-3 rounded-3xl bg-[#12101B] px-8 py-9">
        <p className="eyebrow">{q ? 'Search results' : 'Discover AI styles'}</p>
        <h1 className="w-fit text-[48px] font-bold leading-[1.05] tracking-tight sm:text-[60px]">{q ? <>Search <span className="grad-text">results</span></> : <>Explore <span className="grad-text">Looks</span></>}</h1>
        <p className="text-[16px] text-[#A1A1AA]">
          {q
            ? <>{list.length} {list.length === 1 ? 'look' : 'looks'} for “{q}”. <Link to="/explore" className="font-semibold text-[#8B5CF6] underline underline-offset-4">Clear search</Link></>
            : <>{list.length} {list.length === 1 ? 'look' : 'looks'} in {chip.name}. Pick one to see it large.</>}
        </p>
      </div>

      <form onSubmit={submitSearch} role="search" className="mb-5 flex h-14 w-full max-w-[620px] items-center gap-3 rounded-full border border-[#272033] bg-[#12101B] px-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] focus-within:border-[#8B5CF6]">
        <svg className="size-[18px] shrink-0 text-[#A1A1AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <input ref={searchBox} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Search looks" placeholder="Search looks, styles, keywords..." className="min-w-0 flex-1 bg-transparent text-[15px] text-[#FFFFFF] outline-none placeholder:text-[#A1A1AA]" />
      </form>

      <div role="tablist" aria-label="Collections" className="no-scrollbar -mx-5 mb-8 flex gap-2 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0">
        {shownChips.map((c) => <Chip key={c.id} on={!q && chip.id === c.id} count={countOf(c)} onClick={() => setChip(c)}>{c.name}</Chip>)}
      </div>

      {list.length ? (
        <div className={`grid gap-x-3 gap-y-5 ${isTop ? 'grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 items-start' : 'grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
          {list.map(card)}
        </div>
      ) : (
        <div className="rounded-3xl bg-[#12101B] px-6 py-16 text-center">
          <p className="text-[28px] font-bold text-[#FFFFFF]">{q ? 'No looks match that search' : 'No looks here yet'}</p>
          <p className="mt-2 text-[14px] text-[#A1A1AA]">{q ? 'Try another word, or browse a collection.' : 'Check back soon, or try another collection.'}</p>
          {q && <Link to="/explore" className="btn-dark mt-5 !px-5 !py-2.5 !text-[14px]">Browse all looks</Link>}
        </div>
      )}

      {open >= 0 && <Preview list={list} index={open} onClose={() => setOpen(-1)} onStep={step} onUse={(t) => nav(generateUrl(t))} />}
    </div>
    </>
  )
}
