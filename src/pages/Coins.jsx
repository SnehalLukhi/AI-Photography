import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'
import { useStudio } from '../context/StudioContext.jsx'
import { getCoinPacks, buyCoins } from '../lib/aiPhotography.js'
import { formatPrice } from '../lib/format.js'

const usd = (amount, currency = 'USD') => formatPrice(amount, currency) // dollars, or rupees for visitors in India

const TINTS = ['#1C1C1E'] // one neutral theme gray for every plan (no per-plan colour tints)

// The packs come from the backend; the last answer is kept in this browser so the cards appear at once on the next visit while a fresh copy loads.
const CACHE_KEY = 'pictrify-coin-packs'
const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null') } catch { return null } }

// Opening or reloading /coins: the request starts the moment this file is loaded (before React has rendered anything), not after the first render.
let early = typeof location !== 'undefined' && location.pathname.startsWith('/coins') ? getCoinPacks().catch(() => null) : null
const loadPacks = () => { const p = early || getCoinPacks(); early = null; return p.then((d) => d || getCoinPacks()) } // the early request failed: try once more

const Skel = ({ className = '' }) => <div className={`animate-pulse rounded-[20px] border border-[#3A3A3E] bg-[#191919] ${className}`} />

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
  const pillBtn = 'btn-primary !h-11 !w-full !px-4 !text-[14px] !font-bold disabled:cursor-wait'
  const mobile = (
    <div className="px-4 pb-32 pt-4 sm:hidden">
      <div className="relative flex items-center justify-center pb-4">
        <button type="button" aria-label="Close" onClick={() => nav(-1)} className="absolute left-0 grid size-10 cursor-pointer place-items-center rounded-full bg-[#1C1C1E] text-[#FFFFFF]"><svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        <h1 className="font-display text-[20px] font-bold text-[#FFFFFF]">Buy More Coins</h1>
      </div>
      {signedIn && <p className="mb-3 text-center text-[13px] text-[#A1A1AA]">You have <strong className="text-[#FFFFFF]">{coins.toLocaleString()}</strong> coins</p>}
      {failed && <p role="alert" className="mb-3 rounded-2xl border border-[#F3B6C8] bg-[#FFF0F4] px-4 py-3 text-sm text-[#B4234F]">Could not load the coin packs. Please check your connection and refresh.</p>}
      {loading && <><Skel className="h-[132px]" /><div className="mt-5 grid grid-cols-2 gap-3">{[0, 1, 2, 3].map((k) => <Skel key={k} className="h-[230px]" />)}</div></>}
      {featured && (
        <div className="relative overflow-hidden rounded-[28px] bg-[#191919] ring-1 ring-[#FF3DF2]/30 p-4 pt-5 text-center">
          <img src={brandImages.coin} alt="" width="56" height="56" className="absolute -left-1 -top-1 size-14 -rotate-12 object-contain" />
          <p className="font-display text-[22px] font-bold text-white">{featured.coins.toLocaleString('en-US')} Coins <span className="badge ml-1 align-middle !text-[10px]">BEST VALUE</span></p>
          <p className="mt-0.5 text-[12px] text-white/65">About {Math.floor(featured.coins / data.costPerGeneration)} photos · {featured.name}</p>
          <button type="button" disabled={busy === featured.id} onClick={() => buy(featured)} className="btn-grad mt-4 !h-12 !w-full !text-[15px] !font-bold disabled:cursor-wait">{busy === featured.id ? 'Please wait…' : `Get for ${priceOf(featured)}`}</button>
        </div>
      )}
      {rest.length > 0 && <p className="mb-3 mt-6 text-center font-display text-[16px] font-semibold text-[#FFFFFF]">Choose Your Coins</p>}
      <div className="grid grid-cols-2 gap-3">
        {rest.map((p, idx) => (
          <article key={p.id} className={`relative flex flex-col items-center overflow-hidden rounded-[24px] border px-3 pb-3.5 pt-6 text-center ${p.popular ? 'border-[#FFFFFF] bg-[#191919]' : 'border-[#3A3A3E] bg-[#191919]'}`}>
            {p.popular && <span className="badge absolute left-0 top-0 !rounded-none !rounded-br-xl !px-2.5 !py-1 !text-[10px]">Popular</span>}
            <span className="grid size-14 place-items-center rounded-full" style={{ background: TINTS[idx % TINTS.length] }}><img src={brandImages.coin} alt="" width="36" height="36" className="size-9 object-contain" /></span>
            <p className="mt-2.5 text-[16px] font-semibold text-[#FFFFFF]">{p.coins.toLocaleString('en-US')} Coins</p>
            <span className="mt-1.5 rounded-full bg-[#1C1C1E] px-2.5 py-0.5 text-[11px] text-[#A1A1AA]">About {Math.floor(p.coins / data.costPerGeneration)} photos</span>
            <div className="my-3 h-px w-full bg-[#3A3A3E]" />
            <div className="flex items-baseline gap-1.5"><p className="font-display text-[20px] font-bold text-[#FFFFFF]">{priceOf(p)}</p>{p.offer && <span className="text-[11px] text-[#A1A1AA] line-through">{usd(typeof p.price === 'object' ? p.price.USD : p.price)}</span>}</div>
            <button type="button" disabled={busy === p.id} onClick={() => buy(p)} className={`${pillBtn} mt-3`}>{busy === p.id ? 'Please wait…' : 'Buy Now'}</button>
          </article>
        ))}
      </div>
      {note && <p role="status" className="mt-4 rounded-2xl border border-[#3A3A3E] bg-[#191919] px-4 py-3 text-center text-sm text-[#A1A1AA]">{note}</p>}
      <p className="mt-6 text-center text-[13px] font-semibold text-[#FFFFFF]"><span className="mr-1.5 text-[#FF3DF2]">✓</span>Safe &amp; Secure Payment</p>
      <p className="mx-auto mt-2 max-w-[300px] text-center text-[11px] leading-snug text-[#A1A1AA]">Payment is secure and processed instantly. This is a one-time purchase with no subscriptions or automatic renewals.</p>
      <p className="mt-4 text-center text-[13px] text-[#A1A1AA]">Prefer a subscription? <Link to="/pricing" className="font-semibold text-[#FFFFFF] underline">See the plans</Link></p>
    </div>
  )

  return (
    <>
    {mobile}
    <div className="mx-auto w-full max-w-[1280px] px-4 max-sm:hidden pb-28 pt-4 text-[#FFFFFF] sm:px-6 sm:pb-20 sm:pt-10 md:px-8 lg:px-12">
      <header className="mx-auto max-w-3xl text-center">
        <span className="pill-tag"><SparkIcon className="size-3.5 text-[#FF3DF2]" /><span>Top up anytime</span></span>
        <h1 className="mt-5 font-display text-[36px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[52px] lg:text-[60px]">Get More <span className="grad-text">Coins</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg">Buy a coin pack once - no subscription. Coins never expire{signedIn ? <>, and you have <strong className="text-[#FFFFFF]">{coins.toLocaleString()}</strong> now.</> : '.'}</p>
      </header>

      <section className="mt-10 lg:mt-14">
        <h2 className="sr-only">Coin packs</h2>
        {failed && <p role="alert" className="rounded-2xl border border-[#F3B6C8] bg-[#FFF0F4] px-4 py-3 text-sm text-[#B4234F]">Could not load the coin packs. Please check your connection and refresh.</p>}
        <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 sm:pt-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
          {loading && [0, 1, 2, 3, 4].map((k) => <Skel key={k} className="h-[300px] !rounded-[32px]" />)}
          {(data?.packs || []).map((p, idx) => {
            const photos = Math.floor(p.coins / data.costPerGeneration)
            const list = typeof p.price === 'object' ? p.price.USD : p.price // regular price; with an offer the discounted price is what is charged
            return (
              <article key={p.id} className={`card-orbit relative flex flex-col overflow-visible rounded-[32px] border p-6 transition-transform duration-200 sm:p-8 lg:p-6 ${p.popular ? 'border-[#FFFFFF] bg-[#191919] ring-1 ring-[#FF3DF2]/30 text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)]' : 'border-[#3A3A3E] bg-[#191919]'}`}>
                {p.popular && <span className="badge absolute right-6 top-0 z-10 -translate-y-1/2 !px-3.5 !py-1 !text-[11px] uppercase tracking-wide shadow-[0_6px_18px_rgba(255,61,242,0.35)]">Most Popular</span>}
                <h3 className={`font-display ${p.popular ? 'pr-20 ' : ''}text-[20px] font-bold leading-tight sm:text-[24px] ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{p.name}</h3>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className={`font-display text-[36px] font-extrabold leading-none sm:text-[42px] ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{usd(p.offer ? p.offer.price : list, p.currency)}</p>
                  {p.offer && <><span className={`text-[15px] line-through ${p.popular ? 'text-white/65' : 'text-[#A1A1AA]'}`}>{usd(list, p.currency)}</span><span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${p.popular ? 'bg-[#FF3DF2] text-white' : 'bg-[#271425] text-[#FF3DF2]'}`}>{p.offer.discountPercent}% OFF</span></>}
                </div>
                <div className={`mt-5 flex items-center gap-3 rounded-2xl px-3 py-2.5 ${p.popular ? 'bg-[#1C1C1E]/10' : ''}`} style={p.popular ? undefined : { background: TINTS[idx % TINTS.length] }}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1C1C1E]"><img src={brandImages.coin} alt="" width="44" height="44" className="size-7 object-contain" /></span>
                  <p className={`text-[15px] font-semibold ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{p.coins.toLocaleString('en-US')} Coins</p>
                </div>
                <p className={`mt-7 flex flex-1 items-start gap-2.5 text-[13px] sm:text-[14px] ${p.popular ? 'text-white/65' : 'text-[#A1A1AA]'}`}><span aria-hidden="true" className={`mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${p.popular ? 'bg-[#1C1C1E]/15 text-white' : 'bg-[#2A2A2D] text-[#FF3DF2]'}`}>✓</span><span>About <strong className={p.popular ? 'text-white' : 'text-[#FFFFFF]'}>{photos}</strong> {photos === 1 ? 'photo' : 'photos'}</span></p>
                <button type="button" disabled={busy === p.id} onClick={() => buy(p)}
                  className={`${p.popular ? 'btn-primary' : 'btn-dark'} mt-8 !h-[52px] w-full disabled:cursor-wait`}>
                  {busy === p.id ? 'Please wait…' : `Buy ${p.name}`}
                </button>
              </article>
            )
          })}
        </div>
        {note && <p role="status" className="mt-4 rounded-2xl border border-[#3A3A3E] bg-[#191919] px-4 py-3 text-center text-sm text-[#A1A1AA]">{note}</p>}
        <p className="mt-8 text-center text-sm text-[#A1A1AA]">Prefer a subscription? <Link to="/pricing" className="font-semibold text-[#FFFFFF] underline">See the plans</Link></p>
      </section>
    </div>
    </>
  )
}
