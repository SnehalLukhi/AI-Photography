import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { exploreTabs, isOriginalTab, categoryItems, generateUrl, templatesByIds } from '../data/templates.js'
import TemplateCard from '../components/TemplateCard.jsx'
import PImage from '../components/PImage.jsx'
import MobileHome from '../components/MobileHome.jsx'
import { SparkIcon } from '../components/Header.jsx'
import { useTrending } from '../lib/useTrending.js'
import { getPlans } from '../lib/aiPhotography.js'

// Trending Templates until some are marked in the admin: twelve picks (category, template name), no two neighbours from the same category
const TRENDING_12 = [['80s-and-90s', 'Good Vibes'], ['cartoon', '3D Toon'], ['linkedin-headshot', 'Executive'], ['old-money', 'Retro Car'], ['beard', 'Bandholz'], ['hairstyle-woman', 'BoxBraids'],
  ['old-money', 'Vintage Sari'], ['cartoon', 'Neon Cyber'], ['80s-and-90s', 'Vintage Golden'], ['hairstyle-woman', 'Airy Short Curls'], ['linkedin-headshot', 'Corporate'], ['hairstyle-baby', 'Baby DoubleBun']]
const TREND_PAGE = 36 // 6 rows x 6 columns on a wide desktop

const SectionTitle = ({ title, aside, children }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div className="flex flex-col gap-1.5">
      <h2 className="gradient-text w-fit text-[32px] sm:text-[36px]">{title}</h2>
      {children && <p className="text-[14px] text-[#B4B0C0]">{children}</p>}
    </div>
    {aside}
  </div>
)

function SectionHead({ id, a, b, text, to, cta, mt = '', button = false }) {
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

export default function Home() {
  const nav = useNavigate()
  const pick = (t) => nav(generateUrl(t))

  // Collections: the newest categories first, then the original ones in their usual order
  const withItems = exploreTabs.filter((t) => categoryItems(t.id).length)
  const collections = [...withItems.filter((t) => !isOriginalTab(t)).reverse(), ...withItems.filter(isOriginalTab)]
  const newest = withItems.filter((t) => !isOriginalTab(t)).reverse().slice(0, 4).map((t) => t.name)

  // Trending: the admin's list (newest first); until some are set, the built-in picks
  const adminTrending = useTrending()
  const custom = adminTrending ? templatesByIds(adminTrending) : []
  const trendingPicks = custom.length ? custom : TRENDING_12.map(([id, name]) => categoryItems(id).find((t) => t.name === name)).filter(Boolean)
  const [trendPage, setTrendPage] = useState(0)
  const trendPages = Math.max(1, Math.ceil(trendingPicks.length / TREND_PAGE))
  const trendNow = Math.min(trendPage, trendPages - 1) // the list can shrink: never stay on a page that no longer exists
  const trendShown = trendingPicks.slice(trendNow * TREND_PAGE, (trendNow + 1) * TREND_PAGE)

  // Hero mosaic: the first three trending looks (any collection when none)
  const mosaic = (trendingPicks.length >= 3 ? trendingPicks : collections.flatMap((c) => categoryItems(c.id).slice(0, 1))).slice(0, 3)

  // Hero: three columns of looks that drift up and down
  // Only the templates marked Trending in the admin, however few; the older fallback applies only while none are marked
  const heroPool = (custom.length ? custom : trendingPicks.length >= 6 ? trendingPicks :collections.flatMap((c) => categoryItems(c.id))).slice(0, 18)
  const deck = heroPool.slice(0, 6)
  const [heroIdx, setHeroIdx] = useState(0)
  // each card takes the shape of its own picture (as in the admin): the real width / height is read once per picture, never one forced ratio
  const [shapes, setShapes] = useState({})
  useEffect(() => {
    deck.forEach((t) => {
      const im = new Image()
      im.onload = () => im.naturalWidth && im.naturalHeight && setShapes((m) => (m[t.image] ? m : { ...m, [t.image]: `${im.naturalWidth} / ${im.naturalHeight}` }))
      im.src = t.image
    })
  }, [deck.map((t) => t.image).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640)
  useEffect(() => { const f = () => setNarrow(window.innerWidth < 640); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [])
  useEffect(() => {
    if (deck.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % deck.length), 3200)
    return () => clearInterval(t)
  }, [deck.length])
  const shownCollections = collections
  const marqueeCopies = shownCollections.length ? Math.max(1, Math.ceil(2600 / (shownCollections.length * 168))) : 1 // enough repeats that one half is wider than any screen
  const [cost, setCost] = useState(null) // coins per image, from the backend
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])

  return (
    <>
      <MobileHome trending={trendingPicks} />
    <div className="mx-auto hidden w-full max-w-none flex-col gap-16 md:flex px-5 pb-8 pt-8 text-[#FAFAFA] sm:px-8 sm:pt-10 lg:gap-20 lg:px-10 lg:pt-12">

      {/* 1. Hero */}
      <section aria-label="Start" className="relative isolate rounded-2xl">
        <div className="pointer-events-none absolute -left-[12%] -top-[22%] -z-10 size-[860px] rounded-full bg-[radial-gradient(closest-side,rgba(112,92,255,0.32),rgba(112,92,255,0.1)_55%,transparent)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-[34%] right-[2%] -z-10 size-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(252,72,231,0.24),rgba(252,72,231,0.07)_55%,transparent)]" aria-hidden="true" />
        <div className="grid grid-cols-1 lg:min-h-[500px] lg:grid-cols-[1fr_1.05fr]">
          <div className="relative z-10 flex flex-col justify-center gap-6 px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-white"><SparkIcon className="size-3.5 text-[#FC48E7]" />AI Photography Platform</span>
            <h1 className="gradient-text w-fit text-[40px] font-semibold leading-[1.06] sm:text-[52px] xl:text-[60px]">Turn Your Ideas<br />Into Stunning Photos</h1>
            <p className="max-w-[480px] text-[15px] leading-relaxed text-[#B4B0C0] sm:text-[17px]">Create professional AI photos with powerful templates, advanced AI and endless possibilities.</p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/explore" className="btn-grad !px-7 !py-3.5 !text-[15px]">Start Creating<span aria-hidden="true">→</span></Link>
              <Link to="/explore?category=trending" className="btn-dark !px-7 !py-3.5 !text-[15px]">Explore Looks</Link>
            </div>
          </div>

          <div className="relative flex h-[470px] items-center justify-center py-8 sm:h-[560px] lg:h-auto lg:min-h-[560px]" aria-label="Example looks">
            {/* slowly turning gradient ring + soft rings behind the deck */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[290px] -translate-x-1/2 -translate-y-1/2 animate-[spin_16s_linear_infinite] rounded-full border-2 border-transparent opacity-80 [background:linear-gradient(#0A0809,#0A0809)_padding-box,conic-gradient(from_0deg,#705CFF,#FC48E7,transparent_60%,#705CFF)_border-box] motion-reduce:animate-none sm:size-[360px] lg:size-[400px]" aria-hidden="true" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 animate-[spin_26s_linear_infinite_reverse] rounded-full border border-dashed border-white/15 motion-reduce:animate-none sm:size-[470px] lg:size-[500px]" aria-hidden="true" />

            {/* the deck: the front look is large, the next ones fan out behind it, and the deck advances by itself */}
            <div className="relative h-[330px] w-[186px] [--step:40%] sm:h-[400px] sm:w-[225px] sm:[--step:52%] lg:h-[430px] lg:w-[242px]">
              {deck.map((t, i) => {
                let d = (i - heroIdx + deck.length) % deck.length // signed distance from the front card: ..., -2, -1, 0, 1, 2, ...
                if (d > deck.length / 2) d -= deck.length
                const a = Math.abs(d), side = Math.sign(d)
                const shown = a <= (narrow ? 1 : 2)
                const x = a === 0 ? '0%' : a === 1 ? `calc(var(--step) * ${side})` : `calc(var(--step) * 1.6 * ${side})`
                const rot = a === 0 ? 0 : a === 1 ? 8 * side : 14 * side
                const scale = a === 0 ? 1 : a === 1 ? 0.88 : 0.76
                return (
                  <Link key={t.id} to={generateUrl(t)} tabIndex={d === 0 ? undefined : -1} aria-hidden={d === 0 ? undefined : true}
                    className="absolute left-0 top-1/2 block max-h-full w-full overflow-hidden rounded-2xl bg-[#141011] shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ aspectRatio: shapes[t.image] || '9 / 16', transform: `translateY(-50%) translateX(${x}) rotate(${rot}deg) scale(${scale})`, opacity: !shown ? 0 : a === 0 ? 1 : a === 1 ? 0.92 : 0.6, zIndex: 30 - a * 10, pointerEvents: shown ? undefined : 'none', visibility: shown || a === 3 ? 'visible' : 'hidden' }}>
                    <PImage src={t.image} alt={d === 0 ? t.name : ''} className="absolute inset-0 h-full w-full object-contain" draggable="false" />
                    <span className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0A0809]/90 to-transparent px-4 pb-4 pt-14 text-[15px] font-semibold text-white transition-opacity duration-500 ${d === 0 ? 'opacity-100' : 'opacity-0'}`}>{t.name}</span>
                    {d !== 0 && <span className="absolute inset-0 bg-[#0A0809]/35" />}
                  </Link>
                )
              })}
            </div>

            {/* floating chips that follow the front look */}
            {deck[heroIdx] && (
              <>
                <div key={`a-${heroIdx}`} className="absolute left-4 top-6 z-40 animate-hero-float rounded-2xl border border-white/15 bg-[#0A0809]/80 px-4 py-3 backdrop-blur-md sm:left-8 sm:top-10">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#B4B0C0]">{deck[heroIdx].category || 'Look'}</p>
                  <p className="mt-0.5 text-[15px] font-semibold text-white">{deck[heroIdx].name}</p>
                </div>
                <div className="absolute bottom-14 right-4 z-40 flex animate-hero-float-2 items-center gap-2.5 rounded-full border border-white/15 bg-[#0A0809]/80 py-2 pl-2.5 pr-4 backdrop-blur-md sm:bottom-9 sm:right-8">
                  <img src="/images/features/coin.svg" alt="" className="size-6 object-contain" />
                  <span className="text-[13px] font-semibold text-white">{cost ? `${cost} coins` : 'Try it'}</span>
                  <span className="text-[12px] text-[#B4B0C0]">per photo</span>
                </div>
              </>
            )}

            <div className="absolute bottom-6 left-1/2 z-40 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
              {deck.map((t, i) => <span key={t.id} className={`h-1.5 rounded-full transition-all duration-500 ${i === heroIdx ? 'w-6 bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)]' : 'w-1.5 bg-white/25'}`} />)}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Collections */}
      {collections.length > 0 && (
        <section aria-label="Collections">
          <SectionTitle title="Collections">Every style, grouped. Open one to see all its looks.</SectionTitle>
          {/* one row that glides right to left forever: the list is repeated so the loop has no jump (two equal halves, the track moves by exactly one half) */}
          <div className="-mx-5 overflow-hidden sm:-mx-8 lg:mx-0 motion-reduce:overflow-x-auto" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)', maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)' }}>
            <div className="flex w-max animate-marquee-slow hover:[animation-play-state:paused] motion-reduce:animate-none" style={{ animationDuration: `${shownCollections.length * marqueeCopies * 5.2}s` }}>
              {Array.from({ length: marqueeCopies * 2 }, (_, rep) => (
                <div key={rep} aria-hidden={rep > 0 ? true : undefined} className="flex shrink-0 gap-3.5 pr-3.5">
                  {shownCollections.map((c) => {
                    const items = categoryItems(c.id)
                    const a = items[0]
                    return (
                      <Link key={c.id} to={`/explore?category=${c.id}`} tabIndex={rep === 0 ? undefined : -1} className="group relative block aspect-[3/4] w-[140px] shrink-0 overflow-hidden rounded-xl border border-[#2C2529] bg-[#141011] sm:w-[154px]">
                        <PImage src={a.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.05]" draggable="false" />
                        <span className="absolute inset-0 bg-gradient-to-t from-[#0A0809]/85 via-transparent to-transparent" />
                        <span className="absolute inset-x-2 bottom-2.5">
                          <span className="block truncate text-center text-[12px] font-semibold leading-none text-[#FAFAFA]">{c.category || c.name}</span>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Trending */}
      <section aria-label="Trending">
        <SectionHead id="trending-templates-section" a="Trending" b="Templates" text="Discover popular AI styles, viral portraits, and creative templates from all categories." to="/explore?category=trending" cta="View All Templates" button />
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
      </section>

      {/* 5. Coins */}
      <section aria-label="Coins" className="grid grid-cols-1 items-center rounded-md border border-[#2C2529] bg-[#141011] sm:grid-cols-2 lg:grid-cols-4">
        {[[cost ?? '...', 'coins for each image you create'], ['Refunded', 'automatically if a generation fails'], ['No expiry', 'coins stay in your wallet']].map(([big, small]) => (
          <div key={big} className="flex flex-col gap-1 border-b border-[#2C2529] px-7 py-6 sm:border-r lg:border-b-0">
            <span className="font-serif text-[36px] leading-none">{big}</span><span className="text-[14px] text-[#B4B0C0]">{small}</span>
          </div>
        ))}
        <div className="flex px-7 py-6 lg:justify-end"><Link to="/pricing" className="btn-dark !px-5 !py-3 !text-[14px]">Open wallet</Link></div>
      </section>
    </div>
    </>
  )
}
