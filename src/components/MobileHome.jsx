import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { exploreTabs, sortTabs, hasAdminOrder, categoryItems, generateUrl } from '../data/templates.js'
import PImage from './PImage.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { SeeAll } from './homeParts.jsx'

function SnapRow({ items, cardCls, rowCls, render }) {
  return (
    <div className={`no-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${rowCls}`} style={{ WebkitOverflowScrolling: 'touch' }}>
      {items.map((t) => (
        <div key={t.id} className={`relative shrink-0 snap-start overflow-hidden border border-[#272033] bg-[#12101B] ${cardCls}`}>
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
export function TopCarousel({ items }) {
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
  // each card takes the shape of its own picture (as shown in the admin): read the real width / height of every picture, never force one ratio
  const [shapes, setShapes] = useState({})
  useEffect(() => {
    items.forEach((t) => {
      const im = new Image()
      im.onload = () => im.naturalWidth && im.naturalHeight && setShapes((m) => (m[t.image] ? m : { ...m, [t.image]: `${im.naturalWidth} / ${im.naturalHeight}` }))
      im.src = t.image
    })
  }, [items]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
    <div ref={row} onTouchStart={() => pause(8000)} onPointerDown={() => pause(8000)} onWheel={() => pause()}
      onScroll={(e) => {
        const el = e.currentTarget
        if (loop) setActive(((posOf(el) - 1) % n + n) % n)
        clearTimeout(timer.current)
        timer.current = setTimeout(settle, 120) // the swipe has come to rest
      }}
      className="no-scrollbar flex snap-x snap-mandatory items-center overflow-x-auto py-3">
      {slides.map((t, k) => {
        const copy = loop && (k === 0 || k === n + 1)
        return (
          <div key={copy ? `${t.id}-copy${k}` : t.id} className="w-full shrink-0 snap-start px-4" aria-hidden={copy ? 'true' : undefined}>
            <div className="relative max-h-[78vh] w-full overflow-hidden rounded-[24px] border border-[#272033] bg-[#12101B] shadow-xl" style={{ aspectRatio: shapes[t.image] || '16 / 10' }}>
              <Link to={generateUrl(t)} aria-label={t.name} tabIndex={copy ? -1 : undefined} className="block size-full">
                <PImage src={t.image} alt={t.name} className="absolute inset-0 size-full object-contain" draggable="false" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <span className="absolute inset-x-3.5 bottom-3 flex items-center justify-between gap-2">
                  <span className="truncate text-[16px] font-semibold text-white">{t.name}</span>
                  <span className="shrink-0 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-[#08080D]">Try It</span>
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
            className={`h-2 cursor-pointer rounded-full transition-all duration-300 ${i === active ? 'w-6 bg-[linear-gradient(90deg,#7C3AED_0%,#C026D3_100%)]' : 'w-2 bg-white/35'}`} />
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
export default function MobileHome({ trending = [] }) {
  const { openLogin } = useStudio()
  const top = categoryItems('top-carousel')
  const rows = (hasAdminOrder ? sortTabs(exploreTabs) : exploreTabs).filter((tab) => tab.id !== 'top-carousel').map((tab) => ({
    id: tab.id, title: tab.category || tab.name, info: CATEGORY_INFO[tab.id], items: categoryItems(tab.id),
    to: tab.parent ? `/explore?category=${tab.parent}&sub=${tab.id.replace(`${tab.parent}-`, '')}&from=home` : `/explore?category=${tab.id}&from=home`, // from=home: Explore shows a phone-only back-to-Home bar for this one category
  })).filter((r) => r.items.length)
  const FIRST = ['diwali', 'halloween', 'christmas'] // festival collections come right after Trending, then every other category in its usual order
  if (!hasAdminOrder) rows.sort((x, y) => { const f = (r) => { const i = FIRST.indexOf(r.id); return i < 0 ? FIRST.length : i }; return f(x) - f(y) }) // stable: the rest keep their order
  if (trending.length) rows.unshift({ id: 'trending', title: 'Trending Templates', info: 'Chosen by the Pictrify team, newest first.', items: trending.slice(0, 20), to: '/explore?category=trending&from=home' }) // first section on the phone home
  return (
    <div className="pb-2 text-[#FFFFFF] md:hidden">
      <section aria-label="Welcome" className="mx-4 mt-3 rounded-[28px] bg-[linear-gradient(135deg,#1B1530_0%,#271425_100%)] p-5">
        <h1 className="text-[28px] leading-[1.08]">Create stunning <span className="grad-text">photos</span> with AI</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#A1A1AA]">Pick a template, add your photo and get a professional result.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={openLogin} className="btn-grad !px-5 !py-2.5 !text-[14px]">Sign up, get 100 coins</button>
          <Link to="/explore" className="btn-dark !px-5 !py-2.5 !text-[14px]">Browse</Link>
        </div>
      </section>
      {top.length > 0 && (
        <div className="mt-1">
          <TopCarousel items={top} />
        </div>
      )}
      {rows.map((r) => (
        <section key={r.id} className="mt-6 space-y-2 first:mt-4">
          <div className="flex items-center justify-between gap-3 px-4">
            <div className="min-w-0"><h2 className="text-base font-normal tracking-wide text-[#FFFFFF]">{r.title}</h2>{r.info && <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#A1A1AA]">{r.info}</p>}</div>
            <SeeAll to={r.to} />
          </div>
          <SnapRow items={r.items} rowCls="scroll-px-4 gap-3 px-4 py-0" cardCls="aspect-[9/16] w-[42vw] max-w-[190px] rounded-2xl"
            render={(t) => (
              <Link to={generateUrl(t)} aria-label={t.name} className="block size-full">
                <PImage src={t.image} alt={t.name} loading="lazy" className="absolute inset-0 size-full object-cover" draggable="false" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute inset-x-2 bottom-2.5 truncate text-center text-[11px] text-white/95">{t.name}</span>
              </Link>
            )} />
        </section>
      ))}
    </div>
  )
}
