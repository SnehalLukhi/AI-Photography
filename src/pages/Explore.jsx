import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader, { pageWrap } from '../components/PageHeader.jsx'
import TemplateCard from '../components/TemplateCard.jsx'
import { exploreTabs, funTab, hairstyleTab, folderTemplates, exploreAllTemplates, exploreEverything, categoryItems, generateUrl } from '../data/templates.js'

const pad = (n) => String(n).padStart(2, '0')

// "Fun" / "Hairstyle" appear in the sidebar once at least one of their sub-folders has images; only non-empty subs are offered.
const subsWithItems = (parent) => { const subs = parent.subs.filter((s) => categoryItems(s.tabId).length); return subs.length ? [{ ...parent, subs }] : [] }

// Trending page: one template per category for the Spotlight Roll (the first six groups below, plus a second Old Money card) and up to 5 templates
// from EACH category in the grid (Top Carousel is not part of Trending). A category made of sub-folders (Fun, Hairstyle) is sampled round-robin across its subs.
const TRENDING_GROUPS = [['80s-and-90s'], ['cartoon'], ['linkedin-headshot'], ['old-money'], ['beard'], ['fun-baby', 'fun-men', 'fun-woman'], ['hairstyle-baby', 'hairstyle-man', 'hairstyle-woman']]
const roundRobin = (ids, max) => {
  const lists = ids.map((id) => categoryItems(id)); const out = []
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length && out.length < max) out.push(l[i]) })
  return out
}
// Spotlight Roll: the first six categories' lead templates, plus a second Old Money template as the 7th card
const trendingSpotlight = [...TRENDING_GROUPS.slice(0, 6).map((g) => roundRobin(g, 1)[0]), categoryItems('old-money')[1]].filter(Boolean)
const trendingGroups = TRENDING_GROUPS.map((g) => roundRobin(g, 5))
// Grid order: round-robin across the categories (one from each, then the next one from each, ...), so templates of a category are never next to each other
const trendingGrid = [0, 1, 2, 3, 4].flatMap((i) => trendingGroups.map((g) => g[i])).filter(Boolean)

export default function Explore() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const drag = useRef(null)
  const [openSub, setOpenSub] = useState(() => (['fun', 'hairstyle'].includes(params.get('category')) ? params.get('category') : null)) // desktop sidebar accordion: the one parent (Fun or Hairstyle) that is expanded, or null
  const active = params.get('category') // null = All; 'trending' or a category slug
  const chips = [{ id: 'trending', name: 'Trending' }, ...exploreTabs.filter((t) => !t.parent && categoryItems(t.id).length), ...subsWithItems(funTab), ...subsWithItems(hairstyleTab)] // a tab appears once its folder has images
  const chip = chips.find((c) => c.id === active) || chips[0]
  const sub = chip.subs ? (chip.subs.find((s) => s.id === params.get('sub')) || chip.subs[0]) : null // Fun: the selected sub-category (Baby / Men / Woman)
  const setChip = (c) => setParams(c.id ? (c.subs ? { category: c.id, sub: c.subs[0].id } : { category: c.id }) : {}, { replace: false })
  const setSub = (s) => setParams({ category: chip.id, sub: s.id }, { replace: false })
  // "All" and "Trending" come from the template folder (same source as Home > Trending Templates); category chips keep their own lists.
  const list = chip.id === null ? exploreEverything : chip.id === 'trending' ? trendingGrid : sub ? categoryItems(sub.tabId) : categoryItems(chip.id)
  const allLandscape = list.length > 0 && list.every((t) => t.landscape) // e.g. Top Carousel: every photo is a horizontal 16:9 picture
  const pick = (t) => nav(generateUrl(t))
  // switching category / sub-category always starts from the top (first template), not the previous scroll position
  const viewKey = `${chip.id}|${sub?.id || ''}`
  const firstView = useRef(true)
  useEffect(() => { if (firstView.current) { firstView.current = false; return } window.scrollTo(0, 0) }, [viewKey])
  const isTrending = chip.id === 'trending'
  const thumbs = isTrending ? trendingSpotlight : folderTemplates.slice(0, 9)
  const countOf = (c) => (c.subs ? c.subs.reduce((n, s) => n + categoryItems(s.tabId).length, 0) : c.id === null ? exploreEverything.length : c.id === 'trending' ? trendingGrid.length : categoryItems(c.id).length)

  const card = (t) => (
    <TemplateCard key={t.id} t={t} fav onSelect={pick}
      ratio={t.landscape ? '16 / 9' : '9 / 16'}
      fit="cover" /* every photo fills its card edge to edge (no dark bands): exact 9:16 photos are unchanged, 2:3 / 3:4 photos lose a little at the sides, nothing is stretched */
      objectPos="center"
      className={t.landscape && !allLandscape ? 'col-span-2' : ''} />
  )

  return (
    <div className={pageWrap}>
      <PageHeader pill="Discover AI styles" a="Explore" b="Templates" sub="Find the perfect AI photo for start creating in seconds."
        right={<div className="hidden shrink-0 border-l-2 border-[#8b5cf6] pl-4"><div className="font-display text-[40px] leading-none text-white tabular-nums sm:text-[52px]">{pad(list.length)}</div><div className="mono mt-1">{chip.id === null ? 'frames on the sheet' : `frames in ${sub ? `${chip.name} · ${sub.name}` : chip.name}`}</div></div>} />

      <div className="mt-8 sprockets" />

      {/* Tablet / phone: horizontal roll selector (drag to scroll) */}
      <div className="sticky top-[56px] z-30 -mx-4 border-b border-[#292536] bg-[#0b0a12]/90 px-4 backdrop-blur-xl min-[375px]:-mx-5 min-[375px]:px-5 sm:-mx-6 sm:px-6 md:top-[96px] lg:hidden">
        <div className="cursor-grab select-none overflow-x-auto [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          onPointerDown={(e) => { drag.current = { x: e.clientX, left: e.currentTarget.scrollLeft } }}
          onPointerMove={(e) => { if (drag.current && e.buttons) e.currentTarget.scrollLeft = drag.current.left - (e.clientX - drag.current.x) }}
          onPointerUp={() => { drag.current = null }} onPointerLeave={() => { drag.current = null }}>
          <div role="tablist" className="flex w-max flex-nowrap items-end gap-1">
            {chips.map((c) => {
              const on = chip.id === c.id
              return (
                <button key={c.name} type="button" role="tab" aria-selected={on} onClick={() => setChip(c)}
                  className={`relative flex h-12 shrink-0 cursor-pointer select-none items-center gap-2 px-3 font-mono text-[11px] uppercase tracking-[0.14em] outline-none transition-colors focus-visible:text-white ${on ? 'font-bold text-[#8b5cf6]' : 'text-[#858094] hover:text-white'}`}>
                  <span className="pointer-events-none">{c.name}</span>
                  <span className="pointer-events-none hidden text-[10px] tabular-nums opacity-70">{countOf(c)}</span>
                  <span className={`absolute inset-x-2 -bottom-px h-[3px] bg-gradient-to-r from-[#a78bfa] via-[#8b5cf6] via-[55%] to-[#7c54f0] shadow-[0_0_10px_rgba(139,92,246,0.7)] transition-opacity ${on ? 'opacity-100' : 'opacity-0'}`} />
                </button>
              )
            })}
          </div>
        </div>
        {chip.subs && (
          <div role="tablist" aria-label={`${chip.name} subcategories`} className="flex gap-2 pb-2.5 pt-1">
            {chip.subs.map((sc) => {
              const son = sub?.id === sc.id
              return (
                <button key={sc.id} type="button" role="tab" aria-selected={son} onClick={() => setSub(sc)}
                  className={`h-8 cursor-pointer rounded-full border px-4 font-mono text-[11px] uppercase tracking-[0.14em] outline-none transition-colors ${son ? 'border-[#8b5cf6] bg-[#8b5cf6]/15 font-bold text-[#8b5cf6]' : 'border-[#292536] text-[#8f8aa3] hover:text-white'}`}>{sc.name}</button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-8 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[270px_minmax(0,1fr)] xl:gap-14">
        {/* Desktop: vertical "roll index", sticks while the sheet scrolls */}
        <aside className="hidden lg:block">
          <nav role="tablist" aria-label="Template categories" className="sticky top-[116px]">
            <p className="mono mb-3">Rolls</p>
            <ul className="border-t border-[#292536]">
              {chips.map((c, i) => {
                const on = chip.id === c.id
                return (
                  <li key={c.name}>
                    <button type="button" role="tab" aria-selected={on} aria-expanded={c.subs ? openSub === c.id : undefined}
                      onClick={() => { if (!c.subs) return setChip(c); if (!on) { setChip(c); setOpenSub(c.id) } else setOpenSub((o) => (o === c.id ? null : c.id)) }}
                      className={`group/r relative flex w-full cursor-pointer items-baseline gap-3 border-b border-[#292536] py-3 pl-3 pr-2 text-left outline-none transition-colors focus-visible:bg-white/5 ${on ? 'bg-[#8b5cf6]/10' : 'hover:bg-[#14121d]'}`}>
                      <span className={`absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-[#a78bfa] via-[#8b5cf6] via-[55%] to-[#7c54f0] shadow-[0_0_10px_rgba(139,92,246,0.7)] transition-opacity ${on ? 'opacity-100' : 'opacity-0 group-hover/r:opacity-40'}`} />
                      <span className="mono w-6 shrink-0 !tracking-[0.1em]">{pad(i + 1)}</span>
                      <span className={`font-display min-w-0 flex-1 truncate text-[16px] font-medium leading-none ${on ? 'text-[#8b5cf6]' : 'text-white'}`}>{c.name}</span>
                      <span className="mono hidden tabular-nums">{countOf(c)}</span>
                      {c.subs && (
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={`size-4 shrink-0 self-center transition-transform duration-300 ease-out ${openSub === c.id ? 'rotate-180' : ''} ${on ? 'text-[#8b5cf6]' : 'text-[#858094] group-hover/r:text-white'}`}><path d="M6 9l6 6 6-6" /></svg>
                      )}
                    </button>
                    {c.subs && (
                      <div className={`grid border-[#292536] bg-[#0f0d17] transition-[grid-template-rows,border-color] duration-300 ease-out ${openSub === c.id ? 'grid-rows-[1fr] border-b' : 'grid-rows-[0fr] border-b-0'}`} aria-hidden={!openSub === c.id}>
                        <ul aria-label={`${c.name} subcategories`} className="min-h-0 overflow-hidden py-1">
                          {c.subs.map((sc) => {
                            const son = on && sub?.id === sc.id
                            return (
                              <li key={sc.id}>
                                <button type="button" role="tab" aria-selected={son} tabIndex={openSub === c.id ? 0 : -1} onClick={() => setSub(sc)}
                                  className={`group/s relative flex w-full cursor-pointer items-center gap-3 py-2.5 pl-[3.25rem] pr-3 text-left outline-none transition-colors focus-visible:bg-white/5 ${son ? 'bg-[#8b5cf6]/10' : 'hover:bg-[#14121d]'}`}>
                                  <span className={`absolute left-[1.6rem] top-1/2 h-px w-3 -translate-y-1/2 transition-colors ${son ? 'bg-[#8b5cf6]' : 'bg-[#292536] group-hover/s:bg-[#858094]'}`} />
                                  <span className={`font-display min-w-0 flex-1 truncate text-[14px] font-medium leading-none ${son ? 'text-[#8b5cf6]' : 'text-[#c9c4da] group-hover/s:text-white'}`}>{sc.name}</span>
                                  <span className={`size-1.5 shrink-0 rounded-full bg-[#8b5cf6] shadow-[0_0_8px_rgba(139,92,246,0.8)] transition-opacity ${son ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {(chip.id === null || chip.id === 'trending') && (
          <section className="overflow-hidden rounded-[18px] border border-[#292536] bg-gradient-to-b from-white/[0.05] to-white/[0.015]">
            <div className="sprockets" />
            <div className="flex flex-col gap-6 p-5 sm:p-6 xl:flex-row xl:items-center xl:gap-8">
              {/* compact left column: title, description, button */}
              <div className="min-w-0 xl:w-[250px] xl:shrink-0">
                <div className="eyebrow"><span>Spotlight roll</span></div>
                <h2 className="mt-3 text-[32px] leading-[1.1] text-[#f8f5ff] sm:text-[38px] xl:text-[34px]">Trending <span className="grad-text">This Week</span></h2>
                <p className="mt-3 text-base leading-relaxed text-[#b8b4c7]">Fresh cinematic portraits, couple edits and viral AI video effects.</p>
                {chip.id === null && <button type="button" onClick={() => { nav('/explore?category=trending'); window.scrollTo(0, 0) }} className="btn-grad mt-5 !py-3">View Trending&nbsp;→</button>}
              </div>
              {/* one row of equal portrait cards on the right (3 x 2 on phones); full image, never cropped */}
              <div className={`grid min-w-0 grid-cols-3 gap-2.5 sm:grid-cols-6 xl:flex-1 ${isTrending ? 'xl:grid-cols-7' : '2xl:grid-cols-7'}`}>
                {thumbs.slice(0, 7).map((t, i) => (
                  <button key={t.id} type="button" onClick={() => pick(t)} aria-label={t.name} title={t.name} className={`group relative aspect-[9/16] min-w-0 cursor-pointer overflow-hidden rounded-xl border border-[#292536] bg-[#0b0a12] transition-all duration-300 hover:-translate-y-1 hover:border-[#8b5cf6]/70 ${i === 6 ? (isTrending ? 'hidden xl:block' : 'hidden 2xl:block') : ''}`}>
                    <img src={t.image} alt={t.name} loading="lazy" className={`absolute inset-0 h-full w-full object-center ${isTrending ? 'object-cover' : 'object-contain'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="sprockets" />
          </section>
          )}

          <section id="all-templates" className={chip.id === null || chip.id === 'trending' ? 'mt-10' : ''}>
            <div className="flex items-baseline gap-4">
              <h2 className="shrink-0 text-[30px] leading-[1.1] text-[#f8f5ff] sm:text-[38px] lg:text-[42px]">{chip.id === null ? 'All Templates' : chip.id === 'trending' ? 'Trending Templates' : 'Category Templates'}</h2>
              <span className="h-px flex-1 bg-[#292536]" />
              <span className="mono hidden shrink-0 tabular-nums">{pad(list.length)} frames</span>
            </div>
            {list.length ? (
              <div className={`mt-6 grid gap-2 sm:gap-2.5 md:gap-3 ${allLandscape ? 'grid-cols-1 min-[480px]:grid-cols-2 xl:grid-cols-3' : 'grid-cols-2 min-[480px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`} style={{ alignItems: 'start' }}>
                {/* each card's shape follows its own photo: horizontal photos get 16:9, portrait photos keep the tall 9:16 card */}
                {list.map((t) => card(t))}
              </div>
            ) : (
              <div className="mt-6 rounded-[18px] border border-[#292536] bg-[#14121d] px-6 py-16 text-center text-[#b8b4c7]">No templates in this style yet.</div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
