import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TemplateCard from '../components/TemplateCard.jsx'
import { generateUrl } from '../data/templates.js'
import MobileHome from '../components/MobileHome.jsx'
import MemberHome from '../components/MemberHome.jsx'
import { Head, SeeAll, FeaturedCarousel, CategoryRows, tabLink, getCollections, useTrendingPicks } from '../components/homeParts.jsx'
import { SparkIcon } from '../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { getPlans } from '../lib/aiPhotography.js'

const TREND_PAGE = 36 // 6 rows x 6 columns on a wide desktop
const HOW = [['Pick a template', 'Browse looks from every category.'], ['Add your photo', 'One clear photo is enough.'], ['Get your result', 'Saved to My Creations, ready to download.']]

function GuestHome() {
  const nav = useNavigate()
  const { openLogin } = useStudio()
  const pick = (t) => nav(generateUrl(t))

  const collections = getCollections()
  const { custom, trendingPicks } = useTrendingPicks() // the admin's Trending list (newest first); until some are set, the built-in picks
  const [trendPage, setTrendPage] = useState(0)
  const trendPages = Math.max(1, Math.ceil(trendingPicks.length / TREND_PAGE))
  const trendNow = Math.min(trendPage, trendPages - 1) // the list can shrink: never stay on a page that no longer exists
  const trendShown = trendingPicks.slice(trendNow * TREND_PAGE, (trendNow + 1) * TREND_PAGE)
  // the hero's row of featured looks scrolls endlessly: one half = the list repeated until it holds at least 14 cards (so a half is wider than any screen); the repeats are visual only

  // Creation bar: Photo searches the templates (an existing /explore?q= route), Video opens the video page
  const [mode, setMode] = useState('photo')
  const [q, setQ] = useState('')
  const [vq, setVq] = useState('') // Video mode: the idea typed in the bar is carried to the Video page
  const start = (e) => { e.preventDefault(); if (mode === 'video') { const t = vq.trim(); nav(t ? `/video?prompt=${encodeURIComponent(t)}` : '/video'); return } const v = q.trim(); nav(v ? `/explore?q=${encodeURIComponent(v)}` : '/explore') }

  const [cost, setCost] = useState(null) // coins per image, from the backend
  useEffect(() => { getPlans().then((r) => setCost(r.costPerGeneration)).catch(() => {}) }, [])

  return (
    <>
      <MobileHome trending={trendingPicks} />
      <div className="hidden w-full text-[#FFFFFF] md:block">

        {/* 1. Hero: centred headline, the creation bar, quick category chips, a collage of trending looks */}
        <section aria-label="Start" className="relative isolate overflow-hidden bg-[#08080D] bg-[url('/images/bg.png')] bg-cover bg-center px-4 pb-14 pt-20 sm:px-6 lg:px-8 lg:pt-28">
          {/* dark overlay: keeps the text readable on the photo and fades into the page colour at the bottom */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#08080D]/55 via-[#08080D]/60 to-[#08080D]" aria-hidden="true" />
          <div className="mx-auto flex max-w-[1100px] flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0D0B14]/60 px-4 py-1.5 text-[13px] font-semibold backdrop-blur-md text-[#FF3DF2]"><SparkIcon className="size-3.5 text-[#FF3DF2]" />AI photo and video creation</span>
            <h1 className="mt-6 text-[52px] drop-shadow-[0_4px_24px_rgba(0,0,0,0.55)] lg:text-[76px]">Create stunning <span className="grad-text">photos</span><br />and <span className="grad-text">videos</span> with AI</h1>
            <p className="mt-6 max-w-[560px] text-[18px] leading-relaxed text-[#D4D4D8]">Pick a template, add your photo and get a professional result in moments. Video creation is on its way.</p>

            <form onSubmit={start} className="shine-ring mt-9 flex w-full max-w-[760px] items-center gap-1.5 rounded-full border border-white/[0.14] bg-[#0D0B14]/60 p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 sm:gap-2 sm:p-2">
              <div className="flex shrink-0 rounded-full border border-white/[0.08] bg-black/30 p-1" role="tablist" aria-label="What to create">
                {[['photo', 'Photo'], ['video', 'Video']].map(([k, label]) => (
                  <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)} className={`cursor-pointer rounded-full px-4 py-2 text-[14px] font-semibold transition-all duration-200 sm:px-5 ${mode === k ? 'bg-[#FF3DF2] text-[#08080D] shadow-[0_6px_18px_-6px_rgba(255,61,242,0.7)]' : 'text-[#B4B4BC] hover:bg-white/[0.07] hover:text-white'}`}>{label}</button>
                ))}
              </div>
              {mode === 'photo'
                ? <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search templates" placeholder="Search a look, e.g. corporate headshot, cartoon, diwali" className="min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[#FFFFFF] outline-none placeholder:text-[#8B8B96] sm:px-3" />
                : <input value={vq} onChange={(e) => setVq(e.target.value)} maxLength={500} aria-label="Describe the video" placeholder="Describe a video, e.g. a slow drone shot over a misty lake" className="min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[#FFFFFF] outline-none placeholder:text-[#8B8B96] sm:px-3" />}
              <button type="submit" className="btn-accent group shrink-0 !px-5 !py-3 sm:!px-7">{mode === 'video' ? 'Create video' : 'Start creating'}<span className="arrow transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">→</span></button>
            </form>

            {collections.length > 0 && (
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                {collections.slice(0, 6).map((c) => <Link key={c.id} to={tabLink(c)} className="chip-glass">{c.category || c.name}</Link>)}
              </div>
            )}
          </div>

          {/* the hero's featured carousel: the admin's Trending list only (no fallback); endless right-to-left glide */}
          <FeaturedCarousel items={custom} className="mt-12" />
        </section>

        <div className="flex w-full flex-col gap-12 px-4 pb-8 pt-6 sm:px-6 lg:gap-14 lg:px-8">

          {/* 3. Photo and Video */}
          <section aria-label="Create">
            <div className="grid gap-5 md:grid-cols-2">
              <Link to="/explore" className="group relative isolate flex flex-col overflow-hidden rounded-[28px] border border-[#272033] bg-[#12101B] p-7 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:bg-[#161322] sm:p-8">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#FF3DF2]/10 text-[#FF3DF2] ring-1 ring-[#FF3DF2]/25 transition-colors group-hover:bg-[#FF3DF2]/15"><svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M17 8.5h.01" /></svg></span>
                <h3 className="mt-6 font-display text-[30px] font-bold leading-tight">Create photos</h3>
                <p className="mb-6 mt-2 max-w-md text-[16px] leading-relaxed text-[#B4B4BC]">Pick a template, add one photo and get a styled result in moments.</p>
                <span className="btn-accent mt-auto w-fit !rounded-[14px] !px-5 !py-2.5 !text-[14px]">Browse templates<span className="arrow transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span></span>
              </Link>
              <Link to="/video" className="group relative isolate flex flex-col overflow-hidden rounded-[28px] border border-[#272033] bg-[#12101B] p-7 transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:bg-[#161322] sm:p-8">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#FF3DF2]/10 text-[#FF3DF2] ring-1 ring-[#FF3DF2]/25 transition-colors group-hover:bg-[#FF3DF2]/15"><svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h11a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2zM17 10l5-3v10l-5-3z" /></svg></span>
                <h3 className="mt-6 font-display text-[30px] font-bold leading-tight">Create videos</h3>
                <p className="mb-6 mt-2 max-w-md text-[16px] leading-relaxed text-[#B4B4BC]">Bring your photos to life with short clips.</p>
                <span className="chip-glass mt-auto w-fit gap-2 !px-5 !py-2.5 !text-[14px]">Open video studio<span className="arrow transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span></span>
              </Link>
            </div>
          </section>

          {/* 4. Trending templates (the admin's Trending list) */}
          <section id="trending-templates-section" aria-label="Trending">
            <Head title="Trending templates" sub="Discover popular AI styles, viral portraits, and creative templates from all categories." to="/explore?category=trending" />
            <div className="grid grid-cols-2 gap-2.5 min-[480px]:grid-cols-3 md:gap-3 xl:grid-cols-6">
              {trendShown.map((t) => <TemplateCard key={t.id} t={t} fit="cover" onSelect={pick} />)}
            </div>
            {trendPages > 1 && (
              <nav aria-label="Trending templates pages" className="mt-8 flex items-center justify-center gap-4">
                <button type="button" aria-label="Previous templates" disabled={trendNow === 0} onClick={() => setTrendPage(trendNow - 1)} className="grid size-11 cursor-pointer place-items-center rounded-full border border-[#3A2F52] bg-[#12101B] text-[#FFFFFF] transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:size-12">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <span className="min-w-[3.5rem] text-center text-sm tabular-nums text-[#A1A1AA]">{trendNow + 1} / {trendPages}</span>
                <button type="button" aria-label="Next templates" disabled={trendNow >= trendPages - 1} onClick={() => setTrendPage(trendNow + 1)} className="grid size-11 cursor-pointer place-items-center rounded-full border border-[#3A2F52] bg-[#12101B] text-[#FFFFFF] transition-colors disabled:cursor-not-allowed disabled:opacity-30 sm:size-12">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </nav>
            )}
          </section>

          {/* 5. Every category as its own row of templates */}
          <CategoryRows collections={collections} onSelect={pick} />

          {/* 6. Coins */}
          <section aria-label="Coins" className="grid grid-cols-1 items-center overflow-hidden rounded-[36px] bg-[#12101B] sm:grid-cols-2 lg:grid-cols-4">
            {[[cost ?? '...', 'coins for each image you create'], ['Refunded', 'automatically if a generation fails'], ['No expiry', 'coins stay in your wallet']].map(([big, small]) => (
              <div key={big} className="flex flex-col gap-1 px-8 py-8">
                <span className="font-display text-[40px] font-bold leading-none">{big}</span><span className="text-[15px] text-[#A1A1AA]">{small}</span>
              </div>
            ))}
            <div className="flex px-8 py-8 lg:justify-end"><Link to="/pricing" className="btn-primary !px-6 !py-3">See plans and coins</Link></div>
          </section>

          {/* 7. How it works */}
          <section aria-label="How it works">
            <Head title="Create in three steps" />
            <ol className="grid gap-4 sm:grid-cols-3">
              {HOW.map(([t, d], i) => (
                <li key={t} className="rounded-[28px] bg-[#12101B] p-7">
                  <span className="grid size-11 place-items-center rounded-full bg-white font-display text-[18px] font-bold text-[#08080D]">{i + 1}</span>
                  <h3 className="mt-5 text-[20px]">{t}</h3>
                  <p className="mt-1.5 text-[15px] text-[#A1A1AA]">{d}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* 8. Closing call to action */}
          <section aria-label="Start creating" className="relative isolate overflow-hidden rounded-[40px] bg-[#0D0B14] ring-1 ring-[#FF3DF2]/30 px-6 py-16 text-center sm:px-12">
            <div className="pointer-events-none absolute -left-20 -top-24 -z-10 size-[420px] rounded-full bg-[#FF3DF2]/25 blur-[80px]" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-28 -right-16 -z-10 size-[460px] rounded-full bg-[#FF3DF2]/20 blur-[80px]" aria-hidden="true" />
            <h2 className="mx-auto max-w-2xl text-[34px] !text-white sm:text-[48px]">Ready to create something worth sharing?</h2>
            <p className="mx-auto mt-4 max-w-lg text-[17px] text-white/70">Choose a look, add your photo and watch it come together.</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={openLogin} className="btn-grad !px-9 !py-4 !text-[16px]">Sign up and claim 100 coins<span className="arrow" aria-hidden="true">→</span></button>
              <Link to="/explore" className="inline-flex items-center rounded-full border border-white/30 px-7 py-4 text-[16px] font-semibold text-white transition-colors hover:bg-[#1A1626]/10">Browse templates</Link>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

/** One home, two experiences: the signed-out visitor sees the public landing page, a signed-in user sees their personal start page. */
export default function Home() {
  const { signedIn } = useStudio()
  return signedIn ? <MemberHome /> : <GuestHome />
}
