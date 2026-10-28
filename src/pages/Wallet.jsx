import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { plans as fallbackPlans } from '../data/templates.js'
import { getPlans, cachedPlans, getCoinPacks, buyCoins, getPurchases } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import { formatPrice, formatMoney, formatDate } from '../lib/format.js'
import { SparkIcon } from '../components/Header.jsx'

// ---------- plans (Weekly / Monthly / Yearly): from the backend, the last answer is kept so they show at once ----------
function buildPlans(r) {
  return r.plans.map((p) => {
    const card = fallbackPlans.find((f) => f.id === p.id) || {}
    const money = (n) => formatPrice(n, p.currency)
    // with an offer the discounted price is the price (the server charges exactly this); the regular price is shown struck through
    const pay = p.offer ? p.offer.price : p.price
    const photos = Math.floor(p.coins / r.costPerGeneration)
    return { ...card, ...p, priceText: money(pay), each: photos ? money(pay / photos) : '', photos, originalPrice: p.offer ? money(p.price) : '', discount: p.offer?.discountPercent || 0, coinsText: p.coins.toLocaleString('en-US') }
  })
}

// ---------- coin packs: opening /coins starts the request the moment this file loads, before React has rendered anything ----------
const PACK_CACHE = 'pictrify-coin-packs'
const readPackCache = () => { try { return JSON.parse(localStorage.getItem(PACK_CACHE) || 'null') } catch { return null } }
let early = typeof location !== 'undefined' && location.pathname.startsWith('/coins') ? getCoinPacks().catch(() => null) : null
const loadPacks = () => { const p = early || getCoinPacks(); early = null; return p.then((d) => d || getCoinPacks()) } // the early request failed: try once more

const Skel = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-md border border-[#2C2529] bg-[#141011] ${className}`} />


export default function Wallet({ tab = 'plans' }) {
  const nav = useNavigate()
  const { signedIn, coins, user, refreshUser, openLogin } = useStudio()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  const [sel, setSel] = useState(null) // phone plan picker: the chosen radio row

  // plans
  const [plans, setPlans] = useState(() => (cachedPlans() ? buildPlans(cachedPlans()) : null))
  const [cost, setCost] = useState(cachedPlans()?.costPerGeneration || null)
  useEffect(() => { getPlans().then((r) => { setPlans(buildPlans(r)); setCost(r.costPerGeneration) }).catch(() => setPlans((cur) => cur || fallbackPlans.map((p) => ({ ...p, priceText: p.price, each: '', photos: 0, coinsText: String(p.coins).replace(/[^\d,]/g, '') })))) }, [])

  // packs
  const [packData, setPackData] = useState(readPackCache) // { packs, costPerGeneration }
  const [packsFailed, setPacksFailed] = useState(false)
  useEffect(() => {
    if (tab !== 'packs' && packData) return
    loadPacks().then((d) => { setPackData(d); setPacksFailed(false); if (d?.costPerGeneration) setCost(d.costPerGeneration); try { localStorage.setItem(PACK_CACHE, JSON.stringify(d)) } catch { /* storage blocked */ } }).catch(() => setPacksFailed(true))
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  const packs = packData?.packs || []

  // history
  const [history, setHistory] = useState(null)
  useEffect(() => {
    if (!signedIn || tab !== 'history') return
    let live = true
    getPurchases().then((l) => live && setHistory(l)).catch(() => live && setHistory([]))
    return () => { live = false }
  }, [signedIn, tab])

  const buy = async (id) => {
    if (!signedIn) { openLogin(); return }
    setBusy(id); setNote('')
    try {
      const out = await buyCoins(id, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy('')
  }

  const selId = sel || (plans?.find((p) => p.popular) || plans?.[0])?.id
  const chosen = plans?.find((p) => p.id === selId)
  const HEAD = {
    plans: ['Flexible plans', 'Choose ', 'Your Plan', 'Unlock premium templates, faster generation and more creative freedom.'],
    packs: ['Top up anytime', 'Get More ', 'Coins', null],
    history: ['Payments and coins', 'Transaction ', 'History', 'Track subscriptions, coin purchases and refunds.'],
  }[tab]
  const sub = tab === 'packs'
    ? <>Buy a coin pack once - no subscription. Coins never expire{signedIn ? <>, and you have <strong className="text-white">{coins.toLocaleString()}</strong> now.</> : '.'}</>
    : HEAD[3]
  const card = 'relative flex flex-col rounded-[24px] border bg-[#141011] p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 lg:p-6 xl:p-8'
  const badge = <span className="absolute right-5 top-0 z-10 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-[11px]">Most Popular</span>
  const btn = (popular) => `group relative mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[15px] font-semibold text-white transition-shadow duration-300 disabled:cursor-wait disabled:opacity-70 ${popular ? 'bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)] shadow-[0_0_28px_rgba(252,72,231,0.3)] hover:shadow-[0_0_36px_rgba(252,72,231,0.45)]' : 'border border-white/15 bg-[#1D181B]'}`
  const hover = (popular) => !popular && <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
  return (
    <div className="mx-auto w-full max-w-none px-4 pb-8 max-md:pb-32 pt-6 text-[#FAFAFA] sm:px-6 sm:pt-8 md:px-8 lg:px-10">
      <header className={`max-w-3xl ${tab === 'plans' ? 'max-md:hidden' : ''}`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#FC48E7]" /><span>{HEAD[0]}</span></div>
        <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]"><span className="text-white">{HEAD[1]}</span><span className="gradient-text">{HEAD[2]}</span></h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#B4B0C0] sm:mt-4">{sub}</p>
      </header>

      {note && <p role="status" className="mt-6 rounded-xl border border-[#D98282]/40 bg-[#241518] px-4 py-3 text-center text-sm text-[#F2A0A0]">{note}</p>}

      {tab === 'plans' && (
        <>
        {/* ---------- phone: pick a plan from radio rows, then Continue (like the reference) ---------- */}
        <section aria-label="Choose your plan" className="md:hidden">
          <div className="relative flex items-center justify-center pb-3 pt-1">
            <button type="button" aria-label="Back" onClick={() => nav(-1)} className="absolute left-0 grid size-10 cursor-pointer place-items-center rounded-full bg-[#141011] text-white"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
            <h1 className="text-[18px] font-semibold text-white">Choose Your Plan</h1>
          </div>
          <p className="mb-4 text-center text-[13px] text-[#B4B0C0]">Unlock premium templates, faster generation and more creative freedom.</p>
          <div className="space-y-3" role="radiogroup" aria-label="Subscription plans">
            {!plans && [0, 1, 2].map((i) => <Skel key={i} className="h-[76px] !rounded-[20px]" />)}
            {plans?.map((p) => {
              const on = p.id === selId
              return (
                <div key={p.id} role="radio" aria-checked={on} tabIndex={0} onClick={() => setSel(p.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(p.id)}
                  className={`relative cursor-pointer overflow-hidden rounded-[20px] border bg-[#141011] p-4 transition-colors ${on ? 'border-[#705CFF]/70 bg-[#171218]' : 'border-white/[0.08]'}`}>
                  {p.popular && <span className="absolute right-0 top-0 rounded-bl-xl bg-[linear-gradient(90deg,#705CFF_0%,#FC48E7_100%)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Most Popular</span>}
                  <div className="flex items-center gap-3">
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-[#FC48E7]' : 'border-white/30'}`}>{on && <span className="size-2.5 rounded-full bg-[#FC48E7]" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-semibold text-white">{p.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#B4B0C0]"><img src="/images/features/coin.svg" alt="" width="16" height="16" className="size-4 object-contain" />{p.coinsText} Coins{p.per?.includes('year') ? ' / year' : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[20px] font-bold leading-none text-white">{p.priceText} <span className="text-[11px] font-normal text-[#B4B0C0]">{p.per}</span></p>
                      {p.originalPrice && <p className="mt-1 text-[11px] text-[#B4B0C0]"><span className="line-through">{p.originalPrice}</span> <span className="font-bold text-[#FC48E7]">{p.discount}% OFF</span></p>}
                    </div>
                  </div>
                  {on && p.details?.length > 0 && (
                    <dl className="mt-3.5 space-y-2 border-t border-white/[0.08] pt-3 text-[12px] text-[#B4B0C0]">
                      {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="text-[#FC48E7]">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold text-white">{value}</dd></div>)}
                    </dl>
                  )}
                </div>
              )
            })}
          </div>
          <button type="button" disabled={!chosen?.priceText || busy === selId} onClick={() => chosen && buy(chosen.id)} className="btn-grad mt-5 !h-[54px] !w-full !text-[16px] !font-bold shadow-[0_8px_28px_rgba(252,72,231,0.3)] active:scale-[0.98] disabled:cursor-wait">{busy === selId ? 'Please wait…' : chosen?.priceText ? `Continue · ${chosen.priceText}` : 'Continue'}</button>
          <p className="mt-3 text-center text-[11px] text-[#B4B0C0]">Auto-renewable subscription. Cancel anytime.</p>
        </section>
        <section aria-label="Plans" className="mt-8 hidden sm:mt-10 md:block lg:mt-12">
          <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:grid-cols-3 lg:gap-6">
            {!plans && [0, 1, 2].map((i) => <Skel key={i} className="h-[420px] !rounded-[24px]" />)}
            {plans?.map((p) => (
              <article key={p.id} className={`${card} ${p.popular ? 'border-[#705CFF]/60' : 'border-white/[0.08]'}`}>
                {p.popular && badge}
                <h3 className={`${p.popular ? 'pr-24 ' : ''}text-[18px] font-bold leading-tight text-white sm:text-[22px]`}>{p.name}</h3>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className="text-[34px] font-bold leading-none text-white sm:text-[40px]">{p.priceText}</p>
                  {p.originalPrice && <span className="text-[15px] text-[#B4B0C0] line-through">{p.originalPrice}</span>}
                  <span className="text-[13px] text-[#B4B0C0] sm:text-[14px]">{p.per}</span>
                  {p.discount > 0 && <span className="rounded-md bg-[#FC48E7]/15 px-2 py-0.5 text-[11px] font-bold text-[#FC48E7]">{p.discount}% OFF</span>}
                </div>
                <div className="mt-4 flex items-center gap-2.5">
                  <img src="/images/features/coin.svg" alt="Coins" width="44" height="44" className="size-9 shrink-0 object-contain" />
                  <p className="text-[14px] font-semibold text-white">{p.coinsText} Coins</p>
                </div>
                <dl className="mt-7 flex flex-1 flex-col gap-3.5 text-[13px] text-[#B4B0C0] sm:mt-8 sm:gap-4 sm:text-[14px]">
                  {[p.photos > 0 && ['Photos you can create', p.photos], p.each && ['Cost per photo', p.each]].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="mt-px text-[#FC48E7]">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold leading-snug text-white">{value}</dd></div>
                  ))}
                </dl>
                <button type="button" disabled={busy === p.id || !p.priceText} onClick={() => buy(p.id)} className={btn(p.popular)}>
                  {hover(p.popular)}<span className="relative z-10">{busy === p.id ? 'Please wait…' : `Choose ${p.name}`}</span>
                </button>
              </article>
            ))}
          </div>
          <p className="mt-6 text-center text-[12px] text-[#B4B0C0]">Auto-renewable subscription. Cancel anytime. Prices are shown in your currency and paid securely through Razorpay.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-[#B4B0C0]"><span>Just need a few more coins?</span><Link to="/coins" className="btn-dark !px-5 !py-2.5 !text-[14px]">Buy a coin pack<span aria-hidden="true">→</span></Link></div>
        </section>
        </>
      )}

      {tab === 'packs' && (
        <section aria-label="Coin packs" className="mt-8 sm:mt-10 lg:mt-12">
          {packsFailed && <p role="alert" className="rounded-xl border border-[#D98282]/40 bg-[#241518] px-4 py-3 text-sm text-[#F2A0A0]">Could not load the coin packs. Please check your connection and refresh.</p>}
          <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
            {!packData && !packsFailed && [0, 1, 2, 3, 4].map((k) => <Skel key={k} className="h-[300px] !rounded-[24px]" />)}
            {packs.map((p) => {
              const list = typeof p.price === 'object' ? p.price.USD : p.price // regular price; with an offer the discounted price is what is charged
              const per = packData.costPerGeneration ? Math.floor(p.coins / packData.costPerGeneration) : null
              return (
                <article key={p.id} className={`${card} ${p.popular ? 'border-[#705CFF]/60' : 'border-white/[0.08]'}`}>
                  {p.popular && badge}
                  <h3 className={`${p.popular ? 'pr-20 ' : ''}text-[18px] font-bold leading-tight text-white sm:text-[22px]`}>{p.name}</h3>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-[34px] font-bold leading-none text-white sm:text-[40px]">{formatPrice(p.offer ? p.offer.price : list, p.currency)}</p>
                    {p.offer && <><span className="text-[15px] text-[#B4B0C0] line-through">{formatPrice(list, p.currency)}</span><span className="rounded-md bg-[#FC48E7]/15 px-2 py-0.5 text-[11px] font-bold text-[#FC48E7]">{p.offer.discountPercent}% OFF</span></>}
                  </div>
                  <div className="mt-4 flex items-center gap-2.5">
                    <img src="/images/features/coin.svg" alt="" width="44" height="44" className="size-9 shrink-0 object-contain" />
                    <p className="text-[14px] font-semibold text-white">{p.coins.toLocaleString('en-US')} Coins</p>
                  </div>
                  {per != null && <p className="mt-7 flex-1 text-[13px] text-[#B4B0C0] sm:text-[14px]"><span aria-hidden="true" className="mr-2 text-[#FC48E7]">✓</span>About <strong className="text-white">{per}</strong> {per === 1 ? 'photo' : 'photos'}</p>}
                  <button type="button" disabled={busy === p.id} onClick={() => buy(p.id)} className={btn(p.popular)}>
                    {hover(p.popular)}<span className="relative z-10">{busy === p.id ? 'Please wait…' : `Buy ${p.name}`}</span>
                  </button>
                </article>
              )
            })}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-[#B4B0C0]"><span>Prefer a subscription?</span><Link to="/pricing" className="btn-dark !px-5 !py-2.5 !text-[14px]">See the plans<span aria-hidden="true">→</span></Link></div>
        </section>
      )}

      {tab === 'history' && (
        <section aria-label="History" className="mt-8 sm:mt-10 lg:mt-12">
          {!signedIn ? (
            <div className="rounded-[24px] border border-white/[0.08] bg-[#141011] px-6 py-14 text-center"><p className="text-[20px] font-semibold">Sign in to see your transactions</p><button type="button" onClick={openLogin} className="btn-grad mt-5 !px-6 !py-2.5 !text-[14px]">Sign in</button></div>
          ) : history === null ? (
            <div className="flex flex-col gap-3">{[0, 1, 2].map((k) => <Skel key={k} className="h-16 !rounded-2xl" />)}</div>
          ) : history.length ? (
            <div className="overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#141011] text-[14px]">
              <div className="hidden grid-cols-[170px_1fr_150px_110px] border-b border-white/[0.08] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#B4B0C0] sm:grid"><span>Date</span><span>Item</span><span className="text-right">Paid</span><span className="text-right">Coins</span></div>
              {history.map((p) => (
                <div key={p.paymentId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-white/[0.06] px-5 py-4 last:border-b-0 sm:grid-cols-[170px_1fr_150px_110px] sm:px-6">
                  <span className="order-2 text-[13px] text-[#B4B0C0] sm:order-none sm:text-[14px]">{formatDate(p.paidAt, true)}</span>
                  <span className="order-1 min-w-0 sm:order-none"><span className="block font-semibold">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}</span><span className="block truncate text-[12px] text-[#B4B0C0]">Payment ID {p.paymentId}</span></span>
                  <span className="order-3 text-right font-semibold sm:order-none">{formatMoney(p.amount, p.currency)}{p.offerPercent > 0 && <span className="ml-2 text-[11px] font-semibold text-[#FC48E7]">{p.offerPercent}% off</span>}</span>
                  <span className="order-4 flex items-center justify-end gap-1.5 font-semibold text-[#B653F6] sm:order-none"><img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />+{p.coins.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-white/[0.08] bg-[#141011] px-6 py-14 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-white/[0.06]"><img src="/images/features/coin.svg" alt="" className="size-9 object-contain" /></span>
              <p className="mt-5 text-[18px] font-bold">No transactions yet</p>
              <p className="mt-2 text-[14px] text-[#B4B0C0]">Subscriptions and coin purchases will show up here.</p>
              <Link to="/coins" className="btn-grad mt-6 !px-6 !py-2.5 !text-[14px]">Get coins</Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
