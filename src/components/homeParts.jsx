import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PImage from './PImage.jsx'
import TemplateCard from './TemplateCard.jsx'
import { exploreTabs, sortTabs, categoryItems, templatesByIds, generateUrl } from '../data/templates.js'
import { useTrending } from '../lib/useTrending.js'

// Pieces shared by the logged-out home (pages/Home.jsx) and the logged-in home (components/MemberHome.jsx).

// Trending Templates until some are marked in the admin: twelve picks (category, template name), no two neighbours from the same category
const TRENDING_12 = [['80s-and-90s', 'Good Vibes'], ['cartoon', '3D Toon'], ['linkedin-headshot', 'Executive'], ['old-money', 'Retro Car'], ['beard', 'Bandholz'], ['hairstyle-woman', 'BoxBraids'],
  ['old-money', 'Vintage Sari'], ['cartoon', 'Neon Cyber'], ['80s-and-90s', 'Vintage Golden'], ['hairstyle-woman', 'Airy Short Curls'], ['linkedin-headshot', 'Corporate'], ['hairstyle-baby', 'Baby DoubleBun']]

export const PASTELS = ['#2A2A2D', '#271425', '#2A2A2D', '#102419', '#2A1C10', '#262310']
export const tabLink = (tab) => (tab.parent ? `/explore?category=${tab.parent}&sub=${tab.id.replace(`${tab.parent}-`, '')}` : `/explore?category=${tab.id}`)

/** Collections, in the admin's category order (categories the admin has not placed come after). */
export function getCollections() {
  const withItems = exploreTabs.filter((t) => categoryItems(t.id).length)
  return sortTabs(withItems)
}

/** The admin's Trending list (newest first); until some are set, the built-in picks. `custom` is the admin's own list only. */
export function useTrendingPicks() {
  const adminTrending = useTrending()
  const custom = adminTrending ? templatesByIds(adminTrending) : []
  const trendingPicks = custom.length ? custom : TRENDING_12.map(([id, name]) => categoryItems(id).find((t) => t.name === name)).filter(Boolean)
  return { custom, trendingPicks }
}

/** The "See all" button: compact, one look everywhere, placed on the right of a section's heading row. */
export const SeeAll = ({ to }) => <Link to={to} className="btn-dark shrink-0 !px-5 !py-2 !text-[14px]">See all</Link>

// Section heading: title (and optional subtitle) on the left, the "See all" button (when `to` is given) on the right of the same row.
export const Head = ({ title, sub, to }) => (
  <div className="section-head">
    <div><h2 className="section-title">{title}</h2>{sub && <p className="mt-1.5 text-[15px] text-[#A1A1AA]">{sub}</p>}</div>
    {to && <SeeAll to={to} />}
  </div>
)

/**
 * "Create anything": every collection (all of them, including any category added in the admin) as a simple card: the category name, its first look shown WHOLE (contained, never cropped or
 * stretched, filling the card's width) and an Explore button. Six cards per row on a wide screen, fewer on smaller ones. The list comes from the backend catalogue (see data/templates.js),
 * nothing here is a fixed list; `exclude` leaves out category ids for a particular section (the category itself is untouched).
 */
export function CategoryTiles({ collections, limit = Infinity, exclude = [] }) {
  // the picture area takes the real shape of the category's first picture, so it fills the card width with nothing cropped or stretched; read once per picture
  const [shapes, setShapes] = useState({})
  const list = collections.filter((c) => !exclude.includes(c.id)).slice(0, limit)
  const urls = list.map((c) => categoryItems(c.id)[0]?.image).filter(Boolean)
  useEffect(() => {
    urls.forEach((u) => {
      const im = new Image()
      im.onload = () => im.naturalWidth && im.naturalHeight && setShapes((m) => (m[u] ? m : { ...m, [u]: `${im.naturalWidth} / ${im.naturalHeight}` }))
      im.src = u
    })
  }, [urls.join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grid grid-cols-2 items-start gap-3 min-[560px]:grid-cols-3 md:gap-4 min-[900px]:grid-cols-4 min-[1180px]:grid-cols-6">
      {list.map((c) => {
        const a = categoryItems(c.id)[0]
        return (
          <Link key={c.id} to={tabLink(c)} aria-label={c.category || c.name} className="group flex flex-col rounded-[24px] border border-[#3A3A3E] bg-[#272629] p-2.5 outline-none transition-[transform,border-color] duration-300 focus-visible:ring-2 focus-visible:ring-white/70">
            <span className="block min-h-[2.6em] px-1.5 pt-1 font-display text-[17px] font-bold leading-tight text-white">{c.category || c.name}</span>
            <span className="relative mt-1.5 block overflow-hidden rounded-[16px] bg-[#101011]" style={{ aspectRatio: (a && shapes[a.image]) || '9 / 16' }}>
              {a && <PImage src={a.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-contain" draggable="false" />}
            </span>
            <span className="mt-2.5 flex items-center justify-between rounded-full bg-[#2C2C2F] py-1 pl-3.5 pr-1 text-[13px] font-semibold text-white transition-colors group-hover:bg-white group-hover:text-[#000000]">
              Explore
              <span className="grid size-6 place-items-center rounded-full bg-[#FF3DF2] text-white"><svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}

const Arrow = ({ dir, onClick }) => (
  <button type="button" aria-label={dir < 0 ? 'Scroll left' : 'Scroll right'} onClick={onClick} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full border border-[#4A4A4F] bg-[#1C1C1E] text-[#FFFFFF] transition-colors max-md:hidden">
    <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir < 0 ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} /></svg>
  </button>
)

/** One category: heading, a "See all" link and ALL its templates in a single horizontal row (scroll / swipe, arrows on desktop). Every card is 9:16. */
function CategoryRow({ c, onSelect }) {
  const row = useRef(null)
  const items = categoryItems(c.id)
  const scroll = (d) => row.current?.scrollBy({ left: d * Math.max(240, row.current.clientWidth * 0.8), behavior: 'smooth' })
  // every category uses the same 9:16 card (the picture fills it) - except the Top Carousel, whose pictures are shown WHOLE at their own shape (horizontal ones stay horizontal, 3 across)
  const natural = c.id === 'top-carousel'
  const [shapes, setShapes] = useState({})
  const key = items.map((t) => t.image).join('|')
  useEffect(() => {
    if (!natural) return
    items.forEach((t) => {
      const im = new Image()
      im.onload = () => im.naturalWidth && im.naturalHeight && setShapes((m) => (m[t.image] ? m : { ...m, [t.image]: im.naturalWidth / im.naturalHeight }))
      im.src = t.image
    })
  }, [key, natural]) // eslint-disable-line react-hooks/exhaustive-deps
  const known = natural ? items.filter((t) => shapes[t.image]) : []
  const wide = known.length > 0 && known.filter((t) => shapes[t.image] > 1).length > known.length / 2
  const visible = wide ? 3 : 5
  return (
    <section aria-label={c.category || c.name}>
      <div className="section-head">
        <h2 className="section-title">{c.category || c.name}</h2>
        {items.length > visible && ( // "See all" and the arrows only make sense when the category holds more templates than the row shows at once
          <div className="flex items-center gap-3"><SeeAll to={`${tabLink(c)}&only=1`} /><Arrow dir={-1} onClick={() => scroll(-1)} /><Arrow dir={1} onClick={() => scroll(1)} /></div>
        )}
      </div>
      {/* 5 cards fill the row on a wide screen (4 / 3 / 2 and a peek of the next one on smaller ones); the rest scroll sideways. Every card is 9:16. */}
      <div ref={row} className={`no-scrollbar -mx-4 flex snap-x items-start overflow-x-auto scroll-smooth px-4 pb-1 ${wide ? '[--cols:1.3] min-[560px]:[--cols:2.2] md:[--cols:3] lg:[--cols:3]' : '[--cols:2.4] min-[560px]:[--cols:3.4] md:[--cols:4] lg:[--cols:5]'} [--gap:8px] sm:-mx-6 sm:px-6 md:[--gap:10px] lg:mx-0 lg:px-0`} style={{ gap: 'var(--gap)' }}>
        {items.map((t) => (
          <div key={t.id} className="shrink-0 snap-start" style={{ width: 'calc((100% - (var(--cols) - 1) * var(--gap)) / var(--cols))' }}>
            {natural ? <TemplateCard t={t} fit="contain" ratio={String(shapes[t.image] || 9 / 16)} onSelect={onSelect} /> : <TemplateCard t={t} fit="cover" ratio="9 / 16" onSelect={onSelect} />}
          </div>
        ))}
      </div>
    </section>
  )
}

/** A section for EVERY collection (nothing is limited or hand-picked): the list is the backend catalogue's categories, so a category added in the admin shows up by itself. */
export function CategoryRows({ collections, onSelect }) {
  return collections.map((c) => <CategoryRow key={c.id} c={c} onSelect={onSelect} />)
}

/**
 * The featured carousel: large image cards that glide endlessly from right to left. The list is shown twice side by side and the track moves by exactly one half, so it loops without a jump
 * (the second half is visual only: hidden from assistive tech and not focusable); it is repeated just enough that one half is wider than any screen. Pauses on hover; still (scrollable by hand) for
 * reduced motion. Each card keeps its picture's own tall shape (never cropped or stretched, the picture fills the card) with the name and a short line at the bottom-left. `items` are the templates to show (the admin's Trending list); every card opens that template's Generate page.
 */
// Cartoon-related templates (by name, id or category) go to the very end of the carousel; everyone else keeps the admin's order. Display order only: the list itself is not changed.
const isCartoon = (t) => /cartoon|toon/i.test(`${t.name} ${t.assetId || ''} ${t.categoryId || ''} ${t.category || ''}`)
/** A look's name on a carousel card: small text that is never cut with "...". A name that fits stays still; a longer one scrolls slowly to the left and comes back in from the right. */
function CardName({ name }) {
  const box = useRef(null)
  const measure = useRef(null)
  const [scroll, setScroll] = useState(false)
  useEffect(() => {
    const el = box.current; const m = measure.current
    if (!el || !m) return undefined
    const check = () => setScroll(m.offsetWidth > el.clientWidth + 1)
    check()
    const ro = new ResizeObserver(check); ro.observe(el)
    return () => ro.disconnect()
  }, [name])
  return (
    <span ref={box} className="name-ticker relative block overflow-hidden whitespace-nowrap text-[14px] font-bold leading-snug text-white">
      <span ref={measure} aria-hidden="true" className="invisible absolute left-0 top-0 whitespace-nowrap">{name}</span>
      {scroll ? (
        <span className="name-marquee inline-flex w-max" style={{ animationDuration: `${Math.max(6, name.length * 0.4)}s` }}>
          <span className="pr-10">{name}</span><span className="name-dup pr-10" aria-hidden="true">{name}</span>
        </span>
      ) : <span>{name}</span>}
    </span>
  )
}

export function FeaturedCarousel({ items: list, className = '' }) {
  if (!list.length) return null
  const items = [...list.filter((t) => !isCartoon(t)), ...list.filter(isCartoon)]
  const half = Array.from({ length: Math.ceil(10 / items.length) * items.length }, (_, i) => items[i % items.length])
  return (
    <div className={`-mx-4 overflow-hidden sm:-mx-6 lg:-mx-8 motion-reduce:overflow-x-auto ${className}`} aria-label="Featured looks">
      <div className="flex w-max animate-marquee-slow hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animationDuration: `${Math.max(40, half.length * 4.5)}s` }}>
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy ? true : undefined} className="flex shrink-0 gap-2 pr-2">
            {half.map((t, k) => (
              <Link key={`${t.id}-${k}`} to={generateUrl(t)} tabIndex={copy ? -1 : undefined} aria-label={t.name} className="group relative block aspect-[9/16] h-[300px] shrink-0 overflow-hidden rounded-[6px] border border-[#3A3A3E] bg-[#101011] lg:h-[380px]">
                <img src={t.image} alt="" loading="lazy" draggable="false" className="size-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-[#000000]/85 via-transparent to-transparent" />
                <span className="absolute inset-x-5 bottom-4">
                  <CardName name={t.name} />
                </span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
