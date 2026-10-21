import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { categories, steps, features, exploreCategories, exploreTabs, byCategory, exploreList, folderTemplates, exploreEverything, categoryItems, generateUrl } from '../data/templates.js'
import TemplateCard from '../components/TemplateCard.jsx'
import { SparkIcon } from '../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'

// Hero showcase, built to a 725 x 335 reference mock-up (all numbers below are px inside that stage). The stage is scaled
// uniformly to the width of its column, so proportions stay exact on desktop, tablet and phone.
const STAGE_W = 725
const STAGE_H = 335
// visible bounds of the composition inside the stage (px) - the empty margin around them is cropped so the artwork fills its column
const BOX_X = 55, BOX_Y = 15, BOX_W = 620, BOX_H = 290
// Orbit rings, traced from the reference. Each ring is a tilted ellipse drawn in two halves: the upper (back) arc under the cards and the lower
// (front) arc over them, so the ring passes behind the picture and comes round in front. `clipFrom` hides a front arc left of that stage x.
function RingHalf({ ring, half, z, clipFrom = 0 }) {
  const { id, cx, cy, rx, ry, rot, width, pulse } = ring
  const clip = `${id}-${half}`
  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" style={{ zIndex: z, clipPath: clipFrom ? `inset(-40px -40px -40px ${clipFrom}px)` : undefined }} width={STAGE_W} height={STAGE_H} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-s`} gradientUnits="userSpaceOnUse" x1={cx - rx} y1="0" x2={cx + rx} y2="0">
          <stop offset="0" stopColor="#B070FA" stopOpacity="0.85" /><stop offset="0.55" stopColor="#C4B5FD" stopOpacity="0.9" /><stop offset="1" stopColor="#F066D8" stopOpacity="1" />
        </linearGradient>
        <filter id={`${clip}-g`} x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <clipPath id={clip}><rect x={cx - rx - 20} y={half === 'back' ? cy - ry - 20 : cy} width={rx * 2 + 40} height={ry + 20} /></clipPath>
      </defs>
      <g transform={`rotate(${rot} ${cx} ${cy})`} clipPath={`url(#${clip})`} filter={`url(#${clip}-g)`}>
        <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={`url(#${id}-s)`} strokeWidth={width}>
          {pulse && <animate attributeName="stroke-opacity" values="0.7;1;0.7" dur="6s" repeatCount="indefinite" />}
        </ellipse>
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
  const side = 'hero-card group absolute block overflow-hidden rounded-[12px] border border-white/15 bg-[#000000] shadow-[0_18px_34px_-12px_rgba(0,0,0,0.9),0_0_22px_-8px_rgba(176,112,250,0.55)]'
  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[860px] lg:-mr-4 lg:ml-0 lg:justify-self-start xl:max-w-none" style={{ height: BOX_H * scale }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(${-BOX_X * scale}px, ${-BOX_Y * scale}px) scale(${scale})` }}>
        {/* soft glow + thin orbit rings passing behind the side cards */}
        <div className="pointer-events-none absolute left-[120px] top-[60px] h-[230px] w-[420px] rounded-full bg-[#B070FA]/20 blur-[70px]" />
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
        <Link to={generateUrl(center)} aria-label={center.name} className="hero-card group absolute z-10 block rounded-[14px] bg-gradient-to-br from-[#B070FA] to-[#F066D8] p-[2px] shadow-[0_0_34px_rgba(176,112,250,0.45),0_24px_44px_-16px_rgba(0,0,0,0.9)]" style={{ left: 238, top: 27, width: 229, height: 272 }}>
          <span className="relative block h-full w-full overflow-hidden rounded-[12px] bg-[#000000]">
            <img src={center.image} alt={center.name} className="absolute inset-0 h-full w-full object-cover object-[50%_18%]" draggable="false" />
          </span>
        </Link>

        {/* AI badge on the centre card's top-left corner */}
        <div className="absolute z-20 flex items-center justify-center gap-1 rounded-[10px] bg-gradient-to-br from-[#B070FA] to-[#F066D8] text-[15px] font-semibold text-white shadow-[0_6px_20px_rgba(176,112,250,0.6)]" style={{ left: 221, top: 40, width: 49, height: 37 }}>
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 20l-2.2-7.3L3 10.5l6.8-2.2z" /></svg>AI
        </div>

        {/* glass caption card, bottom right of the centre card */}
        <div className="absolute z-20 flex items-center gap-2.5 rounded-[12px] border border-white/10 bg-gradient-to-br from-[#2A1B52]/80 to-[#1A284F]/80 px-3 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.9)] backdrop-blur-md" style={{ left: 380, top: 231, width: 167, height: 59 }}>
          <svg className="size-6 shrink-0 text-[#B070FA]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.3L21 10.5l-6.8 2.2L12 20l-2.2-7.3L3 10.5l6.8-2.2z" /></svg>
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
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-[#C4B5FD] sm:text-lg">{text}</p>
        </div>
        {button ? (
          <Link to={to} className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-[#B070FA]/60 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#B070FA]/10 sm:self-auto">
            {cta} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <Link to={to} className="shrink-0 self-start text-[15px] font-medium text-[#B070FA] transition-colors hover:text-white sm:self-auto sm:text-base">
            {cta} →
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

export default function Home() {
  const nav = useNavigate()
  const { signedIn, coins } = useStudio()
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
  const trendingPicks = TRENDING_12.map(([id, name]) => categoryItems(id).find((t) => t.name === name)).filter(Boolean)
  const stepIcons = ['M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z', 'M4 5h16v14H4zM4 15l5-5 4 4 3-3 4 4', 'M8 5v14l11-7z']

  return (
    <>
      {/* ---------- Desktop / tablet home ---------- */}
      <div className="block">
        <div className="relative z-20 w-full overflow-visible pb-6 text-white sm:pb-8 lg:pb-10">
          <div className="pointer-events-none absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B070FA]/[0.07] blur-[140px]" />
          <div className="pointer-events-none absolute right-1/4 top-1/3 h-[600px] w-[600px] rounded-full bg-[#B070FA]/[0.08] blur-[160px]" />

          <div className="relative z-10 mx-auto w-full max-w-none px-6 lg:px-8">
            {/* 1. Hero: big headline left, staggered print collage right */}
            <div className="grid grid-cols-1 items-center gap-6 py-6 sm:gap-10 sm:py-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4 lg:py-12 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.05fr)] xl:gap-0">
              <div className="z-20 flex min-w-0 flex-col items-start">
                <div className="eyebrow mb-4 sm:mb-6"><span>AI-Powered Photo &amp; Video Creation</span></div>
                <h1 className="mb-6 text-left text-[34px] leading-[1.05] min-[400px]:text-[40px] sm:mb-7 sm:text-[60px] lg:text-[clamp(44px,4vw,76px)]">
                  <span className="text-[#ffffff]">Create Extraordinary</span>
                  <span className="grad-text block">AI Photos &amp; Videos</span>
                </h1>
                <p className="mb-9 max-w-md text-left text-base leading-relaxed text-[#C4B5FD] xl:text-[17px]">Choose a template, upload your photo, and let AI create stunning visuals in minutes.</p>
                <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
                  <Link to="/explore" className="btn-grad !px-7 !py-3.5"><span>Start Creating</span><span className="leading-none">→</span></Link>
                  <Link to="/explore" className="btn-dark !px-7 !py-3.5">Explore Templates</Link>
                </div>
              </div>

              <HeroShowcase items={fan} />
            </div>

            {/* template strip (scrolls slowly, pauses on hover) */}
            <div className="relative w-full overflow-hidden border-y border-[#3A3552] py-5 [mask-image:linear-gradient(to_right,transparent_0%,black_8%,black_92%,transparent_100%)]">
              <div className="flex w-max animate-marquee-slow gap-3 pr-3 will-change-transform hover:[animation-play-state:paused]" style={{ animationDuration: `${marqueeSeconds}s` }}>
                {marquee.map((c, k) => (
                  <Link key={k} to={c.assetId ? generateUrl(c) : '/explore'} className="group relative aspect-[3/4] w-[130px] shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] transition-all duration-300 hover:border-[#B070FA]/60 sm:w-[145px]">
                    {/* every photo sits in the same centred 9:16 frame, so the space left and right of it is equal on every card */}
                    <span className="absolute inset-y-0 left-1/2 aspect-[9/16] -translate-x-1/2 overflow-hidden"><img src={c.image} alt={c.name} loading="lazy" className="size-full object-cover object-center" /></span>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute inset-x-2 bottom-2 text-center"><span className="block truncate text-[11px] font-semibold text-white/90 drop-shadow-md">{c.name}</span></div>
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
                  <div key={st.n} className="group relative overflow-hidden rounded-[24px] border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-5 transition-colors duration-300 hover:border-[#B070FA]/40 sm:p-7">
                    <div className="flex items-start justify-between">
                      <span className="font-display text-[44px] font-bold leading-none sm:text-[64px] text-[#B070FA]/90">0{st.n}</span>
                      <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-[#2A1B52] to-[#1A284F] text-[#B070FA]">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d={stepIcons[k]} /></svg>
                      </span>
                    </div>
                    <div className="mt-4 font-display text-xl font-semibold text-[#ffffff] sm:mt-8">{st.title}</div>
                    <div className="mt-1.5 text-sm leading-snug text-[#C4B5FD]/75">{st.text}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Trending templates: a short selection + a button to the full Explore page */}
            <SectionHead id="trending-templates-section" a="Trending" b="Templates" text="Discover popular AI styles, viral portraits, and creative templates from all categories." to="/explore?category=trending" cta="View All Templates" mt="mt-20" button />
            <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-3 sm:gap-2.5 md:gap-3 xl:grid-cols-6">
              {trendingPicks.map((t) => <TemplateCard key={t.id} t={t} fit="cover" onSelect={pick} />)}
            </div>

            {/* 7. Features */}
            <div className="card-box mt-20 grid w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div key={f.title} className={`flex items-center gap-4 p-6 ${i < features.length - 1 ? 'lg:border-r lg:border-[#3A3552]' : ''}`}>
                  <div className="flex size-10 shrink-0 items-center justify-center"><img src={f.image} alt={f.title} className="gold-img size-10 object-contain" /></div>
                  <div>
                    <h4 className="font-display text-[15px] font-semibold leading-tight text-[#ffffff]">{f.title}</h4>
                    <p className="mt-1 text-[13px] leading-snug text-[#C4B5FD]/75">{f.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* 8. Call to action */}
            <section className="card-box relative mt-8 overflow-hidden px-6 py-12 text-center sm:py-14">
              <div className="pointer-events-none absolute inset-x-0 -bottom-24 mx-auto h-48 w-2/3 rounded-full bg-[#B070FA]/20 blur-[90px]" />
              <h2 className="relative text-[30px] leading-[1.1] sm:text-[38px] lg:text-[46px]">{signedIn ? <>You have <span className="grad-text">{coins.toLocaleString()} Coins</span></> : <>Claim <span className="grad-text">50 Coins</span></>}</h2>
              <p className="relative mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#C4B5FD] sm:text-lg">Choose a template, upload your photo, and let AI create stunning visuals in minutes.</p>
              <Link to={signedIn ? '/explore' : '/login'} className="btn-grad relative mt-7"><span>{signedIn ? 'Start Creating' : 'Claim 50 Coins'}</span><span className="leading-none">→</span></Link>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
