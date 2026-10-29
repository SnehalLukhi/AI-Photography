import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudio } from '../context/StudioContext.jsx'
import { displayName } from './Header.jsx'
import TemplateCard from './TemplateCard.jsx'
import { TopCarousel } from './MobileHome.jsx'
import { Head, SeeAll, FeaturedCarousel, CategoryRows, getCollections, useTrendingPicks } from './homeParts.jsx'
import { templatesByIds, generateUrl, categoryItems } from '../data/templates.js'
import { listGenerations } from '../lib/aiPhotography.js'

/**
 * The logged-in home: a dashboard in the style of a creative-platform workspace (all of it only READS existing data and links to existing routes). Navigation is the app's shared top header
 * (components/Header.jsx) and its profile menu; there is no sidebar. Main column: a featured carousel, quick tools, ready-made presets (category pills + a gallery), trending, the user's
 * recent creations and favourites, every photo style as its own row, and the video section.
 */
const I = {
  create: 'M12 4v16M4 12h16', discover: 'M12 3a9 9 0 100 18 9 9 0 000-18zM15.5 8.5l-2 5-5 2 2-5z', photo: 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', video: 'M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM17 10l5-3v10l-5-3z',
  library: 'M3 7h18M3 12h18M3 17h12', coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 12h6M12 9v6', plan: 'M12 2l2.6 6.9L22 12l-7.4 3.1L12 22l-2.6-6.9L2 12l7.4-3.1z', list: 'M4 7h16M4 12h16M4 17h10',
  help: 'M9.5 9a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17.2v.1M12 21a9 9 0 100-18 9 9 0 000 18z', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.5-6 8-6s8 2 8 6', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
}
const Icon = ({ d, className = 'size-[18px]' }) => <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>

const TOOLS = [
  ['Photo studio', '/explore', I.photo], ['Video studio', '/video', I.video], ['My creations', '/creations', I.library], ['Trending looks', '/explore?category=trending', I.discover],
  ['Plans', '/pricing', I.plan], ['Coin packs', '/coins', I.coin], ['Transactions', '/transactions', I.list], ['Help', '/help', I.help],
]

/** A horizontally scrolling row of image cards (each shown whole, at its own shape). */
function Rail({ items, onSelect, h = 'h-[220px] lg:h-[260px]', label }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0" aria-label={label}>
      {items.map((t) => (
        <button key={t.id} type="button" onClick={() => onSelect(t)} aria-label={t.name} className={`group relative block ${h} shrink-0 cursor-pointer snap-start overflow-hidden rounded-[6px] border border-[#272033] bg-[#12101B] text-left outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]`}>
          <img src={t.image} alt="" loading="lazy" draggable="false" className="h-full w-auto object-contain transition-transform duration-500 group-hover:scale-[1.03]" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#08080D]/90 to-transparent px-3.5 pb-2.5 pt-9"><span className="block truncate text-[13px] font-semibold text-white">{t.name}</span></span>
        </button>
      ))}
    </div>
  )
}

export default function MemberHome() {
  const nav = useNavigate()
  const { user, userEmail, favorites } = useStudio()
  const collections = getCollections()
  const { custom, trendingPicks } = useTrendingPicks()
  const pick = (t) => nav(generateUrl(t))
  const first = (user?.name || displayName(userEmail || '')).split(' ')[0] || 'there'

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
  const top = categoryItems('top-carousel') // phones: the top carousel (the same one the public phone home shows)
  const feat = custom // ONLY the templates marked Trending in the admin (no built-in fallback, no cap); nothing is shown until some are marked

  return (
    <>
      <div className="w-full text-white">
        <div className="w-full px-4 pb-12 pt-5 sm:px-6 lg:px-8">
          {/* featured carousel */}
          <section aria-label="Featured">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div><p className="text-[14px] font-semibold text-[#C4B5FD]">Welcome back</p><h1 className="text-[28px] sm:text-[36px]">Hi {first}, what will you create today?</h1></div>
              <SeeAll to="/explore?category=trending" />
            </div>
            <FeaturedCarousel items={feat} className="max-md:hidden" />
            {top.length > 0 && <div className="-mx-4 md:hidden"><TopCarousel items={top} /></div>} {/* phones: the same top carousel as the public home (one card at a time, Try It, dots) */}
          </section>

          {/* quick tools */}
          <section aria-label="Tools" className="mt-8 max-md:hidden">
            <Head title="Tools & shortcuts" />
            <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
              {TOOLS.map(([label, to, d]) => (
                <Link key={label} to={to} className="chip !gap-2.5 !rounded-2xl !px-4 !py-2.5 lg:min-w-0 lg:flex-1 lg:justify-center"><span className="grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#7C3AED,#C026D3)] text-white"><Icon d={d} className="size-4" /></span>{label}</Link>
              ))}
            </div>
          </section>

          {/* ready-made presets */}
          {collections.length > 0 && (
            <section aria-label="Ready-made presets" className="mt-9 max-md:hidden">
              <Head title="Ready-made presets" sub="Pick a style, then pick a look." />
              <div role="tablist" aria-label="Preset categories" className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
                {presets.map((c) => <button key={c.id} type="button" role="tab" aria-selected={activePreset?.id === c.id} onClick={() => setPreset(c.id)} className={`chip shrink-0 ${activePreset?.id === c.id ? 'chip-on' : ''}`}>{c.category || c.name}</button>)}
              </div>
              <Rail items={presetItems} onSelect={pick} label={`${activePreset?.name} looks`} />
            </section>
          )}

          {/* trending */}
          {trendingPicks.length > 0 && (
            <section aria-label="Trending" className="mt-9 max-md:hidden">
              <Head title="Trending templates" sub="Popular looks picked by the Pictrify team." to="/explore?category=trending" />
              <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 md:gap-3 xl:grid-cols-6">
                {trendingPicks.slice(0, 12).map((t) => <TemplateCard key={t.id} t={t} fav fit="cover" onSelect={pick} />)}
              </div>
            </section>
          )}

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
            <section aria-label="Favourites" className="mt-9 max-md:hidden">
              <Head title="Your favourites" sub="Looks you saved with the heart." />
              <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 md:gap-3 xl:grid-cols-6">
                {favs.slice(0, 6).map((t) => <TemplateCard key={t.id} t={t} fav fit="cover" onSelect={pick} />)}
              </div>
            </section>
          )}

          {/* every photo style as its own row */}
          {collections.length > 0 && (
            <section aria-label="Photo styles" className="mt-9 max-md:hidden">
              <div className="flex flex-col gap-8"><CategoryRows collections={collections} onSelect={pick} /></div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
