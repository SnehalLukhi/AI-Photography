import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { getCoinPacks, buyCoins } from '../lib/aiPhotography.js'

const usd = (amount) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

// The packs come from the backend; the last answer is kept in this browser so the cards appear at once on the next visit while a fresh copy loads.
const CACHE_KEY = 'pictrify-coin-packs'
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null } }

// Opening or reloading /coins: the request starts the moment this file is loaded (before React has rendered anything), not after the first render.
let early = typeof location !== 'undefined' && location.pathname.startsWith('/coins') ? getCoinPacks().catch(() => null) : null
const loadPacks = () => { const p = early || getCoinPacks(); early = null; return p.then((d) => d || getCoinPacks()) } // the early request failed: try once more

const Skel = ({ className = '' }) => <div className={`animate-pulse rounded-[20px] border border-white/[0.06] bg-white/[0.04] ${className}`} />

/** "Get Coins": one-time coin packs (no subscription). Opened by the coin badge in the header. */
export default function Coins() {
  const nav = useNavigate()
  const { signedIn, coins, user, refreshUser, openLogin } = useStudio()
  const [data, setData] = useState(readCache) // { packs, costPerGeneration }
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => {
    loadPacks().then((d) => { setData(d); setFailed(false); try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)) } catch { /* storage blocked */ } }).catch(() => setFailed(true))
  }, [])
  const loading = !data && !failed // first visit: placeholders instead of an empty page

  const buy = async (pack) => {
    if (!signedIn) { openLogin(); return }
    setBusy(pack.id); setNote('')
    try {
      const out = await buyCoins(pack.id, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy('')
  }

  // phones: "Buy More Coins" sheet-style page - the biggest pack is the featured banner, the others sit in a 2-column grid
  const packs = data?.packs || []
  const featured = packs.reduce((a, p) => (!a || p.coins > a.coins ? p : a), null)
  const rest = packs.filter((p) => p !== featured)
  const priceOf = (p) => usd(p.offer ? p.offer.price : (typeof p.price === 'object' ? p.price.USD : p.price))
  const pillBtn = 'flex h-11 w-full cursor-pointer items-center justify-center rounded-full text-[14px] font-bold text-white shadow-[0_6px_20px_rgba(255,85,170,0.3)] transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-70'
  const pinkBg = { background: 'linear-gradient(90deg, #FF88C7 0%, #FF55AA 100%)' }
  const mobile = (
    <div className="px-4 pb-32 pt-4 sm:hidden">
      <div className="relative flex items-center justify-center pb-4">
        <button type="button" aria-label="Close" onClick={() => nav(-1)} className="absolute left-0 grid size-10 cursor-pointer place-items-center rounded-full bg-[#2B2B2B] text-white"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <h1 className="text-[18px] font-semibold text-white">Buy More Coins</h1>
      </div>
      {signedIn && <p className="mb-3 text-center text-[13px] text-[#A0A0A0]">You have <strong className="text-white">{coins.toLocaleString()}</strong> coins</p>}
      {failed && <p role="alert" className="mb-3 rounded-xl border border-red-500/40 bg-[#2B2B2B] px-4 py-3 text-sm text-red-300">Could not load the coin packs. Please check your connection and refresh.</p>}
      {loading && <><Skel className="h-[132px]" /><div className="mt-5 grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((k) => <Skel key={k} className="h-[230px]" />)}</div></>}
      {featured && (
        <div className="relative overflow-hidden rounded-[22px] border border-white/15 bg-gradient-to-br from-[#2a1a22] via-[#161214] to-[#0F0D0F] p-4 pt-5 text-center">
          <img src={brandImages.coin} alt="" width="56" height="56" className="absolute -left-1 -top-1 size-14 -rotate-12 object-contain" />
          <p className="text-[20px] font-bold text-white">{featured.coins.toLocaleString('en-US')} Coins <span className="ml-1 rounded-md bg-[#FF55AA]/20 px-1.5 py-0.5 align-middle text-[10px] font-bold text-[#FF88C7]">BEST VALUE</span></p>
          <p className="mt-0.5 text-[12px] text-[#A0A0A0]">About {Math.floor(featured.coins / data.costPerGeneration)} photos · {featured.name}</p>
          <button type="button" disabled={busy === featured.id} onClick={() => buy(featured)} className={`${pillBtn} mt-4 h-12 text-[15px]`} style={pinkBg}>{busy === featured.id ? 'Please wait…' : `Get for ${priceOf(featured)}`}</button>
        </div>
      )}
      {rest.length > 0 && <p className="mb-3 mt-5 text-center text-[15px] font-semibold text-white">Choose Your Coins</p>}
      <div className="grid grid-cols-2 gap-3">
        {rest.map((p) => (
          <article key={p.id} className={`relative flex flex-col items-center overflow-hidden rounded-[20px] border bg-[#121012] px-3 pb-3.5 pt-6 text-center ${p.popular ? 'border-white/25' : 'border-white/[0.08]'}`}>
            {p.popular && <span className="absolute left-0 top-0 rounded-br-xl bg-white/[0.12] px-2.5 py-1 text-[10px] font-semibold text-white">Popular</span>}
            <span className="grid size-14 place-items-center rounded-full bg-white/[0.06]"><img src={brandImages.coin} alt="" width="36" height="36" className="size-9 object-contain" /></span>
            <p className="mt-2.5 text-[16px] font-semibold text-white">{p.coins.toLocaleString('en-US')} Coins</p>
            <span className="mt-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-[#A0A0A0]">About {Math.floor(p.coins / data.costPerGeneration)} photos</span>
            <div className="my-3 h-px w-full bg-white/[0.08]" />
            <div className="flex items-baseline gap-1.5"><p className="text-[19px] font-bold text-white">{priceOf(p)}</p>{p.offer && <span className="text-[11px] text-[#A0A0A0] line-through">{usd(typeof p.price === 'object' ? p.price.USD : p.price)}</span>}</div>
            <button type="button" disabled={busy === p.id} onClick={() => buy(p)} className={`${pillBtn} mt-3`} style={pinkBg}>{busy === p.id ? 'Please wait…' : 'Buy Now'}</button>
          </article>
        ))}
      </div>
      {note && <p role="status" className="mt-4 rounded-xl border border-white/15 bg-[#121012] px-4 py-3 text-center text-sm text-[#A0A0A0]">{note}</p>}
      <p className="mt-6 text-center text-[13px] font-semibold text-white"><span className="mr-1.5 text-[#FF88C7]">✓</span>Safe &amp; Secure Payment</p>
      <p className="mx-auto mt-2 max-w-[300px] text-center text-[11px] leading-snug text-[#A0A0A0]">Payment is secure and processed instantly. This is a one-time purchase with no subscriptions or automatic renewals.</p>
      <p className="mt-4 text-center text-[13px] text-[#A0A0A0]">Prefer a subscription? <Link to="/pricing" className="font-semibold text-white underline">See the plans</Link></p>
    </div>
  )

  return (
    <>
    {mobile}
    <div className="mx-auto w-full max-w-[1408px] px-4 max-sm:hidden pb-28 pt-4 sm:px-6 sm:pb-20 sm:pt-8 md:px-8 lg:px-12">
      <header>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#FF55AA]" /><span>Top up anytime</span></div>
          <h1 className="mt-6 max-sm:mt-4 text-[32px] max-sm:text-[28px] font-bold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]"><span className="text-[#ffffff]">Get More </span><span className="grad-text">Coins</span></h1>
          <p className="mt-3 max-sm:mt-2 max-w-2xl text-base max-sm:text-[14px] leading-relaxed text-[#A0A0A0] sm:mt-4">Buy a coin pack once - no subscription. Coins never expire{signedIn ? <>, and you have <strong className="text-white">{coins.toLocaleString()}</strong> now.</> : '.'}</p>
        </div>
      </header>

      <section className="mt-8 max-sm:mt-6 sm:mt-10 lg:mt-12">
        <h2 className="sr-only">Coin packs</h2>
        {failed && <p role="alert" className="rounded-xl border border-red-500/40 bg-[#2B2B2B] px-4 py-3 text-sm text-red-300">Could not load the coin packs. Please check your connection and refresh.</p>}
        <div className="grid grid-cols-1 gap-4 max-sm:gap-3.5 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
          {loading && [0, 1, 2, 3, 4].map((k) => <Skel key={k} className="h-[300px] !rounded-[24px]" />)}
          {(data?.packs || []).map((p) => {
            const photos = Math.floor(p.coins / data.costPerGeneration)
            const list = typeof p.price === 'object' ? p.price.USD : p.price // regular price; with an offer the discounted price is what is charged
            return (
              <article key={p.id} className={`relative flex flex-col max-sm:grid max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-center max-sm:gap-x-3 max-sm:gap-y-1.5 max-sm:rounded-[20px] max-sm:p-4 overflow-visible rounded-[24px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 lg:p-6 xl:p-6 ${p.popular ? 'border-white/25 bg-[#2B2B2B]' : 'border-white/[0.08] bg-[#2B2B2B]'}`}>
                {p.popular && <span className="grad-alt-bg absolute right-5 top-0 z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] uppercase tracking-wide sm:text-[11px]">Most Popular</span>}
                <h3 className={`${p.popular ? 'pr-16 ' : ''}text-[18px] font-bold leading-tight text-white max-sm:col-start-1 max-sm:row-start-1 sm:text-[22px]`}>{p.name}</h3>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1 max-sm:col-start-2 max-sm:row-span-2 max-sm:row-start-1 max-sm:mt-0 max-sm:justify-end">
                  <p className="text-[34px] font-bold leading-none text-white max-sm:text-[28px] sm:text-[40px]">{usd(p.offer ? p.offer.price : list)}</p>
                  {p.offer && <><span className="text-[15px] text-[#A0A0A0] line-through">{usd(list)}</span><span className="rounded-md bg-[#FF55AA]/15 px-2 py-0.5 text-[11px] font-bold text-[#FF88C7]">{p.offer.discountPercent}% OFF</span></>}
                </div>
                <div className="mt-4 flex items-center gap-2.5 max-sm:col-start-1 max-sm:row-start-2 max-sm:mt-0 max-sm:gap-2">
                  <img src={brandImages.coin} alt="" width="44" height="44" className="size-9 max-sm:size-7 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
                  <p className="text-[14px] font-semibold text-white">{p.coins.toLocaleString('en-US')} Coins</p>
                </div>
                <p className="mt-7 flex-1 text-[13px] text-[#A0A0A0] max-sm:col-span-2 max-sm:row-start-3 max-sm:mt-0 max-sm:text-[12px] sm:text-[14px]"><span aria-hidden="true" className="mr-2 text-[#A0A0A0]">✓</span>About <strong className="text-white">{photos}</strong> {photos === 1 ? 'photo' : 'photos'}</p>
                <button type="button" disabled={busy === p.id} onClick={() => buy(p)}
                  className={`group relative mt-8 max-sm:col-span-2 max-sm:row-start-4 max-sm:mt-2 flex h-[52px] max-sm:h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[15px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF55AA] disabled:cursor-wait disabled:opacity-70 ${p.popular ? 'grad-bg shadow-[0_0_28px_rgba(255,85,170,0.35)] hover:shadow-[0_0_36px_rgba(255,85,170,0.45)]' : 'border border-white/[0.08] bg-[#2B2B2B] hover:border-transparent hover:shadow-[0_0_28px_rgba(255,85,170,0.35)]'}`}>
                  {!p.popular && <span className="grad-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                  <span className="relative z-10">{busy === p.id ? 'Please wait…' : `Buy ${p.name}`}</span>
                </button>
              </article>
            )
          })}
        </div>
        {note && <p role="status" className="mt-4 rounded-xl border border-white/15 bg-[#2B2B2B] px-4 py-3 text-center text-sm text-[#A0A0A0]">{note}</p>}
        <p className="mt-6 text-center text-sm text-[#A0A0A0]">Prefer a subscription? <Link to="/pricing" className="font-semibold text-white underline">See the plans</Link></p>
      </section>
    </div>
    </>
  )
}
