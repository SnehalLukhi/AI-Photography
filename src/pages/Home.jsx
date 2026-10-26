import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categories, steps, exploreCategories, exploreTabs, byCategory, exploreList, folderTemplates, exploreEverything, categoryItems, generateUrl, templatesByIds } from '../data/templates.js'
import { useTrending } from '../lib/useTrending.js'
import TemplateCard from '../components/TemplateCard.jsx'
import PImage from '../components/PImage.jsx'
import { SparkIcon } from '../components/Header.jsx'

// Hero showcase, built to a 725 x 335 reference mock-up (all numbers below are px inside that stage). The stage is scaled
// uniformly to the width of its column, so proportions stay exact on desktop, tablet and phone.
const STAGE_W = 725
const STAGE_H = 335
// visible bounds of the composition inside the stage (px) - the empty margin around them is cropped so the artwork fills its column
const BOX_X = 55, BOX_Y = 15, BOX_W = 620, BOX_H = 290
// Orbit rings, traced from the reference. Each ring is a tilted ellipse drawn in two halves: the upper (back) arc under the cards and the lower
// (front) arc over them, so the ring passes behind the picture and comes round in front. `clipFrom` hides a front arc left of that stage x.
// The ring is drawn as RING_COLORS.length arcs, one after another round the ellipse; each arc fades from its colour into the next one (a straight gradient between
// the arc's two end points), so the colours follow the curve and the last one blends back into the first.
const RING_COLORS = ['#705CFF', '#FC48E7', '#FF88C7', '#FF55AA', '#9B7BFF']
function RingHalf({ ring, half, z, clipFrom = 0 }) {
  const { id, cx, cy, rx, ry, rot, width, pulse } = ring
  const clip = `${id}-${half}`
  const n = RING_COLORS.length
  const pt = (deg) => { const t = (deg * Math.PI) / 180; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)] }
  const arcs = RING_COLORS.map((c, i) => {
    const d0 = -90 + (360 / n) * i, d1 = d0 + 360 / n + 0.6 // a hair of overlap hides the seams
    const [x0, y0] = pt(d0), [x1, y1] = pt(d1)
    return { id: `${id}-g${i}`, from: c, to: RING_COLORS[(i + 1) % n], x0, y0, x1, y1, d: `M${x0} ${y0}A${rx} ${ry} 0 0 1 ${x1} ${y1}` }
  })
  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: z, clipPath: clipFrom ? `inset(-40px -40px -40px ${clipFrom}px)` : undefined }} width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
      <defs>
        {arcs.map((a) => (
          <linearGradient key={a.id} id={a.id} gradientUnits="userSpaceOnUse" x1={a.x0} y1={a.y0} x2={a.x1} y2={a.y1}>
            <stop offset="0" stopColor={a.from} /><stop offset="1" stopColor={a.to} />
          </linearGradient>
        ))}
        <filter id={`${clip}-g`} x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <clipPath id={clip}><rect x={cx - rx - 20} y={half === 'back' ? cy - ry - 20 : cy} width={rx * 2 + 40} height={ry + 20} /></clipPath>
      </defs>
      <g transform={`rotate(${rot} ${cx} ${cy})`} clipPath={`url(#${clip})`} filter={`url(#${clip}-g)`}>
        <g fill="none" strokeWidth={width}>
          {arcs.map((a) => <path key={a.id} d={a.d} stroke={`url(#${a.id})`} />)}
          {pulse && <animate attributeName="stroke-opacity" values="0.75;1;0.75" dur="6s" repeatCount="indefinite" />}
        </g>
      </g>
    </svg>
  )
}
// The ONE orbit ring, fitted to the reference: a thin ellipse (rx 293, ry 81) tilted -13deg around all three cards. Its upper arc rises behind the
// centre card and loops over the right card; its lower arc passes in front of the left card, behind the centre card and in front of the caption and right card.
const ringA = { id: 'hr-a', cx: 356, cy: 156, rx: 293, ry: 81, rot: -13, width: 1.3, pulse: true }

function HeroShowcase({ items }) {
  const wrap = useRef(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const fit = () => setScale(el.clientWidth / BOX_W)
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const [left, center, right] = [items[0], items[1] || items[0], items[2] || items[0]]
  if (!center) return null
  const side = 'hero-card group absolute block overflow-hidden rounded-[12px] border border-white/15 bg-[#0A0809]'
  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[860px] lg:-mr-4 lg:ml-0 lg:justify-self-start xl:max-w-none" style={{ height: BOX_H * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${-BOX_X * scale}px, ${-BOX_Y * scale}px) scale(${scale})` }}>
        {/* soft glow + thin orbit rings passing behind the side cards */}
        <div className="pointer-events-none absolute left-[120px] top-[60px] h-[230px] w-[420px] rounded-full bg-white/[0.06] blur-[70px]" />
        {/* rings: back halves sit under the cards, front halves come round over them */}
        <RingHalf ring={ringA} half="back" z={0} />
        {/* left card (tilted back) */}
        <Link to={generateUrl(left)} aria-label={left.name} className={side} style={{ left: 114, top: 108, width: 118, height: 158, transform: 'rotate(-12deg)', zIndex: 1 }}>
          <img src={left.image} alt={left.name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" draggable="false" />
        </Link>
        {/* right card (tilted forward) */}
        <Link to={generateUrl(right)} aria-label={right.name} className={side} style={{ left: 476, top: 79, width: 125, height: 167, transform: 'rotate(10deg)', zIndex: 2 }}>
          <img src={right.image} alt={right.name} className="absolute inset-0 h-full w-full object-cover object-[50%_20%]" draggable="false" />
        </Link>

        {/* centre card with gradient border */}
        <Link to={generateUrl(center)} aria-label={center.name} className="hero-card group absolute z-10 block rounded-[14px] bg-white/25 p-[2px]" style={{ left: 238, top: 27, width: 229, height: 272 }}>
          <span className="relative block h-full w-full overflow-hidden rounded-[12px] bg-[#0A0809]">
            <img src={center.image} alt={center.name} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" draggable="false" />
          </span>
        </Link>

        {/* AI badge on the centre card's top-left corner */}
        <div className="absolute z-20 flex items-center justify-center gap-1 rounded-[10px] border border-white/25 bg-white/15 text-[15px] font-semibold text-white backdrop-blur-md" style={{ left: 221, top: 40, width: 49, height: 37 }}>
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 20l-2.2-7.3L3 10.5l6.8-2.2z" /></svg>AI
        </div>

        {/* glass caption card, bottom right of the centre card */}
        <div className="absolute z-20 flex items-center gap-2.5 rounded-[12px] border border-white/10 bg-[#2B2B2B]/80 px-3 backdrop-blur-md" style={{ left: 380, top: 231, width: 167, height: 59 }}>
          <svg className="size-6 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 20l-2.2-7.3L3 10.5l6.8-2.2z" /></svg>
          <span className="whitespace-nowrap text-[10px] font-medium leading-[1.35] text-[#ffffff]">Turn your imagination<br />into reality</span>
        </div>
        <RingHalf ring={ringA} half="front" z={5} />
        <RingHalf ring={ringA} half="front" z={25} clipFrom={410} />
      </div>
    </div>
  )
}

function SectionHead({ id, a, b, text, to, cta, mt, button = false }) {
  return (
    <div id={id} className={`relative overflow-visible ${mt}`}>
      <div className="mb-9 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">
            <span className="text-white">{a}</span>{' '}<span className="grad-text">{b}</span>
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#A0A0A0] sm:text-lg">{text}</p>
        </div>
        {button ? (
          <Link to={to} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/15 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.06] sm:self-auto">
            {cta} <span className="arrow" aria-hidden="true">→</span>
          </Link>
        ) : (
          <Link to={to} className="shrink-0 self-start text-[15px] font-medium text-[#FF55AA] transition-colors hover:text-white sm:self-auto sm:text-base">
            {cta} <span className="arrow" aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  )
}

/** Mobile coverflow: centre card full size, neighbours scaled to .82 (as on the reference). */
function Coverflow({ items, render, widthCls, aspect, overlap, pad = 'py-2' }) {
  const [i, setI] = useState(0)
  const start = useRef(null)
  const n = items.length
  const at = (k) => items[(i + k + n) % n]
  const go = (d) => setI((x) => (x + d + n) % n)
  return (
    <div className={`flex w-full items-center justify-center gap-1 overflow-hidden ${pad}`} style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => { start.current = e.clientX }}
      onPointerUp={(e) => { if (start.current != null && Math.abs(e.clientX - start.current) > 30) go(e.clientX < start.current ? 1 : -1); start.current = null }}>
      {[-1, 0, 1].map((k) => (
        <div key={k} onClick={() => k !== 0 && go(k)} className={`${widthCls} ${aspect} shrink-0 transition-all duration-300 ${k === 0 ? 'z-20 scale-100' : 'z-10 scale-[0.82] opacity-80'} ${k !== 0 ? overlap : ''}`}>
          {render(at(k), k === 0)}
        </div>
      ))}
    </div>
  )
}

/** Mobile row: equal-size cards in one horizontal swipeable line (snaps card by card). */
function SnapRow({ items, cardCls, rowCls, render }) {
  return (
    <div className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${rowCls}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      {items.map((t) => (
        <div key={t.id} className={`relative shrink-0 snap-start overflow-hidden border border-white/5 bg-[#2B2B2B] ${cardCls}`}>
          {render(t)}
        </div>
      ))}
    </div>
  )
}

/** Mobile top carousel: one full card at a time, endless in one direction. The row is [copy of last, ...cards, copy of first]; whenever it settles on a copy it is moved
 *  (unseen, snapping off for that instant) onto the identical real card, so the loop never jumps, reverses or restarts. Slides on by itself every 3 s (0.7 s glide),
 *  can be swiped by hand (pauses while touched and for a few seconds after); the dots follow the real card. */
const SLIDE_MS = 3000
const SLIDE_ANIM_MS = 700 // one slide takes 0.7 s
function TopCarousel({ items }) {
  const row = useRef(null)
  const pausedUntil = useRef(0)
  const gliding = useRef(false)
  const n = items.length
  const loop = n > 1
  const slides = loop ? [items[n - 1], ...items, items[0]] : items
  const [active, setActive] = useState(0)
  const pause = (ms = 6000) => { pausedUntil.current = Date.now() + ms }
  const posOf = (el) => Math.round(el.scrollLeft / el.clientWidth)
  const jump = (el, pos) => { el.style.scrollSnapType = 'none'; el.scrollLeft = pos * el.clientWidth; requestAnimationFrame(() => { el.style.scrollSnapType = '' }) }
  // glide to slide position `pos` over SLIDE_ANIM_MS with an ease-in-out (snapping is off while it runs)
  const slideTo = (pos) => {
    const el = row.current
    if (!el) return
    const from = el.scrollLeft, d = pos * el.clientWidth - from
    if (!d) return
    gliding.current = true
    const t0 = performance.now()
    el.style.scrollSnapType = 'none'
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / SLIDE_ANIM_MS)
      el.scrollLeft = from + d * (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2)
      if (k < 1) requestAnimationFrame(tick); else { gliding.current = false; el.style.scrollSnapType = ''; settle() }
    }
    requestAnimationFrame(tick)
  }
  // when at rest on a copy, move onto the real card it duplicates
  const settle = () => {
    const el = row.current
    if (!el || !loop || gliding.current) return
    const pos = posOf(el)
    if (pos === 0) jump(el, n)
    else if (pos === n + 1) jump(el, 1)
  }
  useLayoutEffect(() => {
    const el = row.current
    if (!el || !loop) return
    jump(el, 1) // start on the first real card
    const onResize = () => jump(el, Math.min(n, Math.max(1, posOf(el) || 1)))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loop) return
    const t = setInterval(() => {
      const el = row.current
      if (!el || gliding.current || Date.now() < pausedUntil.current) return
      slideTo(posOf(el) + 1) // always forward; after the last card it lands on the copy of the first, then settles onto the real one
    }, SLIDE_MS)
    return () => clearInterval(t)
  }, [n]) // eslint-disable-line react-hooks/exhaustive-deps
  const timer = useRef(0)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <>
    <div ref={row} onTouchStart={() => pause(8000)} onPointerDown={() => pause(8000)} onWheel={() => pause()}
      onScroll={(e) => {
        const el = e.currentTarget
        if (loop) setActive(((posOf(el) - 1) % n + n) % n)
        clearTimeout(timer.current)
        timer.current = setTimeout(settle, 120) // the swipe has come to rest
      }}
      className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto py-3">
      {slides.map((t, k) => {
        const copy = loop && (k === 0 || k === n + 1)
        return (
          <div key={copy ? `${t.id}-copy${k}` : t.id} className="w-full shrink-0 snap-start px-4" aria-hidden={copy ? 'true' : undefined}>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[24px] border border-white/5 bg-[#2B2B2B] shadow-xl">
              <Link to={generateUrl(t)} aria-label={t.name} tabIndex={copy ? -1 : undefined} className="block size-full">
                <PImage src={t.image} alt={t.name} className="absolute inset-0 size-full object-cover" draggable="false" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute inset-x-3.5 bottom-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[15px] text-white/90">{t.name}</span>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/50">Try It</span>
                </span>
              </Link>
            </div>
          </div>
        )
      })}
    </div>
    {loop && (
      <div className="flex items-center justify-center gap-2 pb-1 pt-1" role="tablist" aria-label="Carousel slides">
        {items.map((t, i) => (
          <button key={t.id} type="button" role="tab" aria-selected={i === active} aria-label={`Slide ${i + 1}`}
            onClick={() => { pause(8000); if (!gliding.current) slideTo(i + 1) }}
            className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-white' : 'w-2 bg-white/35'}`} />
        ))}
      </div>
    )}
    </>
  )
}

// One-line description under each category title on the phone home (keyed by the category tab id)
const CATEGORY_INFO = {
  '80s-and-90s': 'Explore retro styles inspired by the 80s and 90s.',
  cartoon: 'Turn your photos into fun cartoon-style art.',
  'linkedin-headshot': 'Create sharp, professional headshots for your profile.',
  'old-money': 'Get a timeless, elegant old-money look.',
  beard: 'Try different beard styles on your photo.',
  'hairstyle-baby': 'Try cute hairstyles on baby photos.',
  'hairstyle-man': 'Try new hairstyles for men.',
  'hairstyle-woman': 'Try new hairstyles for women.',
}

/** Phone home, laid out like the Glymo reference: a top carousel, then one titled snap row per category. No hero or intro before the templates. */
function MobileHome() {
  const top = categoryItems('top-carousel')
  const rows = exploreTabs.filter((tab) => tab.id !== 'top-carousel').map((tab) => ({
    id: tab.id, title: tab.category || tab.name, info: CATEGORY_INFO[tab.id], items: categoryItems(tab.id),
    to: tab.parent ? `/explore?category=${tab.parent}&sub=${tab.id.replace(`${tab.parent}-`, '')}&from=home` : `/explore?category=${tab.id}&from=home`, // from=home: Explore shows a phone-only back-to-Home bar for this one category
  })).filter((r) => r.items.length)
  return (
    <div className="pb-32 text-white md:hidden">
      {top.length > 0 && (
        <div className="mt-1">
          <TopCarousel items={top} />
        </div>
      )}
      {rows.map((r) => (
        <section key={r.id} className="mt-[34px] space-y-3 first:mt-4">
          <div className="flex items-center justify-between gap-3 px-4">
            <div className="min-w-0"><h2 className="text-base font-normal tracking-wide text-white">{r.title}</h2>{r.info && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#A0A0A0]">{r.info}</p>}</div>
            <Link to={r.to} className="flex cursor-pointer items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold text-white ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/10">
              More <svg className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
          </div>
          <SnapRow items={r.items} rowCls="scroll-px-4 gap-3 px-4 py-[7px]" cardCls="aspect-[9/16] w-[42vw] max-w-[190px] rounded-2xl"
            render={(t) => (
              <Link to={generateUrl(t)} aria-label={t.name} className="block size-full">
                <PImage src={t.image} alt={t.name} loading="lazy" className="absolute inset-0 size-full object-cover" draggable="false" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute inset-x-2 bottom-2.5 truncate text-center text-[11px] text-white/90">{t.name}</span>
              </Link>
            )} />
        </section>
      ))}
    </div>
  )
}

export default function Home() {
  const nav = useNavigate()
  const pick = (t) => nav(generateUrl(t))
  // Hero marquee: 5 templates per category, mixed (see below). One "half" is the full list
  // (repeated only if there are fewer than 12, so the strip is always wider than the box); the strip shows two identical halves,
  // which makes the -50% scroll loop seamless. Falls back to the sample categories if the folder is empty.
  // Source: up to 5 templates from EACH category (all categories), interleaved round-robin so categories are mixed along the whole strip.
  // A category made of sub-folders (Hairstyle) contributes its 5 spread across its subs. Duplicate images are dropped.
  const MIX_GROUPS = [['80s-and-90s'], ['cartoon'], ['linkedin-headshot'], ['old-money'], ['top-carousel'], ['beard'], ['hairstyle-baby', 'hairstyle-man', 'hairstyle-woman']]
  const groupPicks = MIX_GROUPS.map((ids) => {
    const lists = ids.map((id) => categoryItems(id)); const out = []
    for (let i = 0; out.length < 5 && lists.some((l) => i < l.length); i++) lists.forEach((l) => { if (i < l.length && out.length < 5) out.push(l[i]) })
    return out
  })
  const seenImg = new Set()
  const carouselPicks = [0, 1, 2, 3, 4].flatMap((i) => groupPicks.map((g) => g[i])).filter((t) => t && !seenImg.has(t.image) && seenImg.add(t.image))
  const source = carouselPicks.length ? carouselPicks : categories
  const half = Array.from({ length: Math.ceil(12 / source.length) * source.length }, (_, i) => source[i % source.length])
  const marquee = [...half, ...half]
  const marqueeSeconds = Math.round((80 * half.length) / 8) // keeps the original scroll speed (80 s per 8 cards)
  // Hero: the first three marquee templates shown as tilted prints (full image, never cropped)
  // Hero showcase: one existing template from three different categories (80's & 90's, Cartoon, LinkedIn Headshot)
  const pickOf = (id, k = 0) => categoryItems(id)[k]
  const fan = [(categoryItems('80s-and-90s').find((t) => t.name === 'Good Vibes') || pickOf('80s-and-90s', 0)), pickOf('cartoon', 0), categoryItems('linkedin-headshot').find((t) => t.name === 'Studio Grey') || pickOf('linkedin-headshot', 0)].filter(Boolean)
  // Trending Templates: twelve hand-picked templates (category, template name), ordered so no two neighbouring cards share a category
  const TRENDING_12 = [['80s-and-90s', 'Good Vibes'], ['cartoon', '3D Toon'], ['linkedin-headshot', 'Executive'], ['old-money', 'Retro Car'], ['beard', 'Bandholz'], ['hairstyle-woman', 'BoxBraids'],
    ['old-money', 'Vintage Sari'], ['cartoon', 'Neon Cyber'], ['80s-and-90s', 'Vintage Golden'], ['hairstyle-woman', 'Airy Short Curls'], ['linkedin-headshot', 'Corporate'], ['hairstyle-baby', 'Baby DoubleBun']]
  const adminTrending = useTrending() // the templates marked as Trending in the admin; until some are set, the picks above
  const custom = adminTrending ? templatesByIds(adminTrending) : []
  const trendingPicks = custom.length ? custom : TRENDING_12.map(([id, name]) => categoryItems(id).find((t) => t.name === name)).filter(Boolean)
  // Trending Templates is paged: 36 at a time (6 rows x 6 columns on desktop), left / right arrows below the grid when there are more than 36
  const TREND_PAGE = 36
  const [trendPage, setTrendPage] = useState(0)
  const trendPages = Math.max(1, Math.ceil(trendingPicks.length / TREND_PAGE))
  const trendNow = Math.min(trendPage, trendPages - 1) // the list can shrink (a template removed): never stay on a page that no longer exists
  const trendShown = trendingPicks.slice(trendNow * TREND_PAGE, (trendNow + 1) * TREND_PAGE)
  const stepIcons = ['M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z', 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', 'M8 5v14l11-7z']

  return (
    <>
      <MobileHome />
      {/* ---------- Desktop / tablet home ---------- */}
      <div className="hidden md:block">
        <div className="relative z-20 w-full overflow-visible pb-6 text-white sm:pb-8 lg:pb-10">
          <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF55AA]/[0.07] blur-[140px]" />
          <div className="pointer-events-none absolute right-1/4 top-1/3 h-[600px] w-[600px] rounded-full bg-[#FF55AA]/[0.08] blur-[160px]" />

          <div className="relative z-10 mx-auto w-full max-w-none px-6 lg:px-8">
            {/* 1. Hero: big headline left, staggered print collage right */}
            <div className="grid grid-cols-1 items-center gap-6 py-6 sm:gap-10 sm:py-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4 lg:py-12 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.05fr)] xl:gap-0">
              <div className="z-20 flex min-w-0 flex-col items-start">
                <div className="eyebrow mb-4 sm:mb-6"><span>AI-Powered Photo &amp; Video Creation</span></div>
                <h1 className="mb-6 text-left text-[34px] leading-[1.05] min-[400px]:text-[40px] sm:mb-7 sm:text-[60px] lg:text-[clamp(44px,4vw,76px)]">
                  <span className="text-[#ffffff]">Create Extraordinary</span>
                  <span className="grad-text block">AI Photos &amp; Videos</span>
                </h1>
                <p className="mb-9 max-w-md text-left text-base leading-relaxed text-[#A0A0A0] xl:text-[17px]">Choose a template, upload your photo, and let AI create stunning visuals in minutes.</p>
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                  <Link to="/explore" className="btn-grad !px-7 !py-3.5"><span>Start Creating</span><span className="arrow" aria-hidden="true">→</span></Link>
                  <Link to="/explore" className="btn-dark !border-white/10 !bg-[#2B2B2B] !px-7 !py-3.5 hover:!border-white/30 hover:!bg-[#2B2B2B]">Explore Templates</Link>
                </div>
              </div>

              <div className="hidden lg:contents"><HeroShowcase items={fan} /></div>
            </div>

            {/* template strip (scrolls slowly, pauses on hover) */}
            <div className="relative w-full overflow-hidden border-y border-[#2B2B2B] py-5 [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]">
              <div className="flex w-max animate-marquee-slow gap-3 pr-3 will-change-transform hover:[animation-play-state:paused]" style={{ animationDuration: `${marqueeSeconds}s` }}>
                {marquee.map((c, k) => (
                  <Link key={k} to={c.assetId ? generateUrl(c) : '/explore'} className="group relative aspect-[3/4] w-[130px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-[#2B2B2B] bg-gradient-to-br bg-[#2B2B2B] from-[#FF55AA]/[0.07] to-[#FF55AA]/0 transition-all duration-300 hover:border-white/40 sm:w-[145px]">
                    {/* the photo fills the whole card image area (object-cover): no empty space left or right of it */}
                    <span className="absolute inset-0 overflow-hidden"><img src={c.image} alt={c.name} loading="lazy" className="size-full object-cover object-center" /></span>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0809]/70 via-transparent to-transparent" />
                    <div className="absolute inset-x-2 bottom-2 text-center"><span className="block break-words text-[11px] font-semibold leading-snug text-white/90 drop-shadow-md">{c.name}</span></div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 2. Steps */}
            <section className="mt-16">
              <div className="eyebrow mb-4"><span>How It Works</span></div>
              <h2 className="mb-9 text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">Create in <span className="grad-text">3 Steps</span></h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {steps.map((st, k) => (
                  <div key={st.n} className="group relative overflow-hidden rounded-[24px] bg-white/[0.05] p-5 sm:p-7">
                    <div className="flex items-start justify-between">
                      <span className="font-display text-[44px] font-bold leading-none sm:text-[64px] text-[#A0A0A0]">0{st.n}</span>
                      <span className="grid size-12 place-items-center rounded-full bg-[#2B2B2B] text-[#FF55AA]">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d={stepIcons[k]} /></svg>
                      </span>
                    </div>
                    <div className="mt-4 font-display text-xl font-semibold text-[#ffffff] sm:mt-8">{st.title}</div>
                    <div className="mt-1.5 text-sm leading-snug text-[#A0A0A0]">{st.text}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Trending templates: a short selection + a button to the full Explore page */}
            <SectionHead id="trending-templates-section" a="Trending" b="Templates" text="Discover popular AI styles, viral portraits, and creative templates from all categories." to="/explore?category=trending" cta="View All Templates" mt="mt-20" button />
            <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:gap-2.5 md:gap-3 xl:grid-cols-6">
              {trendShown.map((t) => <TemplateCard key={t.id} t={t} fit="cover" onSelect={pick} />)}
            </div>
            {trendPages > 1 && (
              <nav aria-label="Trending templates pages" className="mt-8 flex items-center justify-center gap-4">
                <button type="button" aria-label="Previous templates" disabled={trendNow === 0} onClick={() => setTrendPage(trendNow - 1)} className="grid size-11 cursor-pointer place-items-center rounded-full border border-white/15 bg-[#2B2B2B] text-white transition-colors hover:border-white/30 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30 sm:size-12">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-[#A0A0A0]">{trendNow + 1} / {trendPages}</span>
                <button type="button" aria-label="Next templates" disabled={trendNow >= trendPages - 1} onClick={() => setTrendPage(trendNow + 1)} className="grid size-11 cursor-pointer place-items-center rounded-full border border-white/15 bg-[#2B2B2B] text-white transition-colors hover:border-white/30 hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-30 sm:size-12">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
