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

const Skel = ({ className = '' }) => <div aria-hidden="true" className={`animate-pulse rounded-md border border-[#3A3A3E] bg-[#272629] ${className}`} />

const Tick = ({ dark }) => <span aria-hidden="true" className={`mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${dark ? 'bg-[#1C1C1E]/15 text-white' : 'bg-[#2A2A2D] text-[#FF3DF2]'}`}>✓</span>

const TINTS = ['#2A2A2D', '#271425', '#2A2A2D', '#102419', '#2A1C10']

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
    ? <>Buy a coin pack once - no subscription. Coins never expire{signedIn ? <>, and you have <strong className="text-[#FFFFFF]">{coins.toLocaleString()}</strong> now.</> : '.'}</>
    : HEAD[3]
  const card = (popular) => `relative flex flex-col rounded-[32px] border p-6 transition-transform duration-200 sm:p-8 lg:p-6 xl:p-8 ${popular ? 'border-[#FFFFFF] bg-[#101011] ring-1 ring-[#FF3DF2]/30 text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)]' : 'border-[#3A3A3E] bg-[#272629]'}`
  const badge = <span className="badge absolute right-6 top-0 z-10 -translate-y-1/2 !px-3.5 !py-1 !text-[11px] uppercase tracking-wide shadow-[0_6px_18px_rgba(255,61,242,0.35)]">Most Popular</span>
  const btn = (popular) => `${popular ? 'btn-grad' : 'btn-dark'} mt-8 !h-[52px] w-full disabled:cursor-wait`
  const ink = (popular) => (popular ? 'text-white' : 'text-[#FFFFFF]')
  const muted = (popular) => (popular ? 'text-white/65' : 'text-[#A1A1AA]')
  const offTag = (popular, pct) => <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${popular ? 'bg-[#FF3DF2] text-white' : 'bg-[#271425] text-[#FF3DF2]'}`}>{pct}% OFF</span>
  const coinTile = (popular, tint, alt, text) => (
    <div className={`mt-5 flex items-center gap-3 rounded-2xl px-3 py-2.5 ${popular ? 'bg-[#1C1C1E]/10' : ''}`} style={popular ? undefined : { background: tint }}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1C1C1E]"><img src="/images/features/coin.svg" alt={alt} width="44" height="44" className="size-7 object-contain" /></span>
      <p className={`text-[15px] font-semibold ${ink(popular)}`}>{text}</p>
    </div>
  )
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-12 pt-6 text-[#FFFFFF] max-md:pb-32 sm:px-6 sm:pt-10 md:px-8 lg:px-10">
      <header className={`mx-auto max-w-3xl text-center ${tab === 'plans' ? 'max-md:hidden' : ''}`}>
        <span className="pill-tag"><SparkIcon className="size-3.5 text-[#FF3DF2]" /><span>{HEAD[0]}</span></span>
        <h1 className="mt-5 font-display text-[36px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[52px] lg:text-[60px]">{HEAD[1]}<span className="grad-text">{HEAD[2]}</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg">{sub}</p>
      </header>

      <nav aria-label="Wallet sections" className="mt-7 flex justify-center max-md:hidden sm:mt-9">
        <div className="inline-flex gap-1 rounded-full bg-[#1C1C1E] p-1.5">
          {[['plans', '/pricing', 'Plans'], ['packs', '/coins', 'Coin packs'], ['history', '/transactions', 'Transactions']].map(([k, to, label]) => (
            <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={`rounded-full px-6 py-2.5 text-[15px] font-semibold transition-colors ${tab === k ? 'bg-white text-[#000000]' : 'text-[#FFFFFF] hover:bg-[#2C2C2F]'}`}>{label}</Link>
          ))}
        </div>
      </nav>

      {note && <p role="status" className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#F3B6C8] bg-[#FFF0F4] px-4 py-3 text-center text-sm text-[#B4234F]">{note}</p>}

      {tab === 'plans' && (
        <>
        {/* ---------- phone: pick a plan from radio rows, then Continue ---------- */}
        <section aria-label="Choose your plan" className="md:hidden">
          <div className="relative flex items-center justify-center pb-3 pt-1">
            <button type="button" aria-label="Back" onClick={() => nav(-1)} className="absolute left-0 grid size-10 cursor-pointer place-items-center rounded-full bg-[#1C1C1E] text-[#FFFFFF]"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
            <h1 className="font-display text-[20px] font-bold text-[#FFFFFF]">Choose Your Plan</h1>
          </div>
          <nav aria-label="Wallet sections" className="mb-4 flex justify-center gap-2">
            {[['plans', '/pricing', 'Plans'], ['packs', '/coins', 'Coin packs'], ['history', '/transactions', 'History']].map(([k, to, label]) => (
              <Link key={k} to={to} aria-current={tab === k ? 'page' : undefined} className={`chip ${tab === k ? 'chip-on' : ''}`}>{label}</Link>
            ))}
          </nav>
          <p className="mb-5 text-center text-[14px] text-[#A1A1AA]">Unlock premium templates, faster generation and more creative freedom.</p>
          <div className="space-y-3" role="radiogroup" aria-label="Subscription plans">
            {!plans && [0, 1, 2].map((i) => <Skel key={i} className="h-[76px] !rounded-[24px]" />)}
            {plans?.map((p) => {
              const on = p.id === selId
              return (
                <div key={p.id} role="radio" aria-checked={on} tabIndex={0} onClick={() => setSel(p.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(p.id)}
                  className={`relative cursor-pointer overflow-hidden rounded-[24px] border-2 p-4 transition-colors ${on ? 'border-[#FFFFFF] bg-[#272629]' : 'border-[#3A3A3E] bg-[#272629]'}`}>
                  {p.popular && <span className="badge absolute right-0 top-0 !rounded-none !rounded-bl-2xl !px-3 !py-1 !text-[10px] uppercase tracking-wide">Most Popular</span>}
                  <div className="flex items-center gap-3">
                    <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-[#FFFFFF]' : 'border-[#4A4A4F]'}`}>{on && <span className="size-2.5 rounded-full bg-[#101011] ring-1 ring-[#FF3DF2]/30" />}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-bold text-[#FFFFFF]">{p.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#A1A1AA]"><img src="/images/features/coin.svg" alt="" width="16" height="16" className="size-4 object-contain" />{p.coinsText} Coins{p.per?.includes('year') ? ' / year' : ''}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-[22px] font-bold leading-none text-[#FFFFFF]">{p.priceText} <span className="font-sans text-[11px] font-normal text-[#A1A1AA]">{p.per}</span></p>
                      {p.originalPrice && <p className="mt-1 text-[11px] text-[#A1A1AA]"><span className="line-through">{p.originalPrice}</span> <span className="font-bold text-[#FF3DF2]">{p.discount}% OFF</span></p>}
                    </div>
                  </div>
                  {on && p.details?.length > 0 && (
                    <dl className="mt-3.5 space-y-2 border-t border-[#3A3A3E] pt-3 text-[12px] text-[#A1A1AA]">
                      {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="text-[#FF3DF2]">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold text-[#FFFFFF]">{value}</dd></div>)}
                    </dl>
                  )}
                </div>
              )
            })}
          </div>
          <button type="button" disabled={!chosen?.priceText || busy === selId} onClick={() => chosen && buy(chosen.id)} className="btn-primary mt-5 !h-[54px] !w-full !text-[16px] !font-bold disabled:cursor-wait">{busy === selId ? 'Please wait…' : chosen?.priceText ? `Continue · ${chosen.priceText}` : 'Continue'}</button>
          <p className="mt-3 text-center text-[11px] text-[#A1A1AA]">Auto-renewable subscription. Cancel anytime.</p>
        </section>
        <section aria-label="Plans" className="mt-10 hidden md:block lg:mt-14">
          <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 sm:pt-4 lg:grid-cols-3 lg:gap-6">
            {!plans && [0, 1, 2].map((i) => <Skel key={i} className="h-[420px] !rounded-[32px]" />)}
            {plans?.map((p, idx) => (
              <article key={p.id} className={card(p.popular)}>
                {p.popular && badge}
                <h3 className={`font-display ${p.popular ? 'pr-24 ' : ''}text-[22px] font-bold leading-tight sm:text-[26px] ${ink(p.popular)}`}>{p.name}</h3>
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <p className={`font-display text-[40px] font-extrabold leading-none sm:text-[48px] ${ink(p.popular)}`}>{p.priceText}</p>
                  {p.originalPrice && <span className={`text-[15px] line-through ${muted(p.popular)}`}>{p.originalPrice}</span>}
                  <span className={`text-[13px] sm:text-[14px] ${muted(p.popular)}`}>{p.per}</span>
                  {p.discount > 0 && offTag(p.popular, p.discount)}
                </div>
                {coinTile(p.popular, TINTS[idx % TINTS.length], 'Coins', `${p.coinsText} Coins`)}
                <dl className={`mt-7 flex flex-1 flex-col gap-3.5 text-[13px] sm:mt-8 sm:gap-4 sm:text-[14px] ${muted(p.popular)}`}>
                  {[p.photos > 0 && ['Photos you can create', p.photos], p.each && ['Cost per photo', p.each]].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex items-start gap-2.5"><Tick dark={p.popular} /><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className={`shrink-0 text-right font-semibold leading-snug ${ink(p.popular)}`}>{value}</dd></div>
                  ))}
                </dl>
                <button type="button" disabled={busy === p.id || !p.priceText} onClick={() => buy(p.id)} className={btn(p.popular)}>
                  {busy === p.id ? 'Please wait…' : `Choose ${p.name}`}
                </button>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-[12px] text-[#A1A1AA]">Auto-renewable subscription. Cancel anytime. Prices are shown in your currency and paid securely through Razorpay.</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm text-[#A1A1AA]"><span>Just need a few more coins?</span><Link to="/coins" className="btn-dark !px-5 !py-2.5 !text-[14px]">Buy a coin pack<span aria-hidden="true">→</span></Link></div>
        </section>
        </>
      )}

      {tab === 'packs' && (
        <section aria-label="Coin packs" className="mt-10 lg:mt-14">
          {packsFailed && <p role="alert" className="rounded-2xl border border-[#F3B6C8] bg-[#FFF0F4] px-4 py-3 text-sm text-[#B4234F]">Could not load the coin packs. Please check your connection and refresh.</p>}
          <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 sm:pt-4 lg:grid-cols-3 lg:gap-6 xl:grid-cols-5">
            {!packData && !packsFailed && [0, 1, 2, 3, 4].map((k) => <Skel key={k} className="h-[300px] !rounded-[32px]" />)}
            {packs.map((p, idx) => {
              const list = typeof p.price === 'object' ? p.price.USD : p.price // regular price; with an offer the discounted price is what is charged
              const per = packData.costPerGeneration ? Math.floor(p.coins / packData.costPerGeneration) : null
              return (
                <article key={p.id} className={card(p.popular)}>
                  {p.popular && badge}
                  <h3 className={`font-display ${p.popular ? 'pr-20 ' : ''}text-[20px] font-bold leading-tight sm:text-[24px] ${ink(p.popular)}`}>{p.name}</h3>
                  <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className={`font-display text-[36px] font-extrabold leading-none sm:text-[42px] ${ink(p.popular)}`}>{formatPrice(p.offer ? p.offer.price : list, p.currency)}</p>
                    {p.offer && <><span className={`text-[15px] line-through ${muted(p.popular)}`}>{formatPrice(list, p.currency)}</span>{offTag(p.popular, p.offer.discountPercent)}</>}
                  </div>
                  {coinTile(p.popular, TINTS[idx % TINTS.length], '', `${p.coins.toLocaleString('en-US')} Coins`)}
                  {per != null && <p className={`mt-7 flex flex-1 items-start gap-2.5 text-[13px] sm:text-[14px] ${muted(p.popular)}`}><Tick dark={p.popular} /><span>About <strong className={ink(p.popular)}>{per}</strong> {per === 1 ? 'photo' : 'photos'}</span></p>}
                  <button type="button" disabled={busy === p.id} onClick={() => buy(p.id)} className={btn(p.popular)}>
                    {busy === p.id ? 'Please wait…' : `Buy ${p.name}`}
                  </button>
                </article>
              )
            })}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-[#A1A1AA]"><span>Prefer a subscription?</span><Link to="/pricing" className="btn-dark !px-5 !py-2.5 !text-[14px]">See the plans<span aria-hidden="true">→</span></Link></div>
        </section>
      )}

      {tab === 'history' && (
        <section aria-label="History" className="mx-auto mt-10 max-w-4xl lg:mt-14">
          {!signedIn ? (
            <div className="rounded-[32px] bg-[#272629] px-6 py-14 text-center"><p className="font-display text-[22px] font-bold">Sign in to see your transactions</p><button type="button" onClick={openLogin} className="btn-primary mt-5 !px-6 !py-2.5 !text-[14px]">Sign in</button></div>
          ) : history === null ? (
            <div className="flex flex-col gap-3">{[0, 1, 2].map((k) => <Skel key={k} className="h-16 !rounded-2xl" />)}</div>
          ) : history.length ? (
            <div className="overflow-hidden rounded-[32px] border border-[#3A3A3E] bg-[#272629] text-[14px]">
              <div className="hidden grid-cols-[170px_1fr_150px_110px] bg-[#1C1C1E] px-6 py-3.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#A1A1AA] sm:grid"><span>Date</span><span>Item</span><span className="text-right">Paid</span><span className="text-right">Coins</span></div>
              {history.map((p) => (
                <div key={p.paymentId} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-[#3A3A3E] px-5 py-4 last:border-b-0 sm:grid-cols-[170px_1fr_150px_110px] sm:px-6">
                  <span className="order-2 text-[13px] text-[#A1A1AA] sm:order-none sm:text-[14px]">{formatDate(p.paidAt, true)}</span>
                  <span className="order-1 min-w-0 sm:order-none"><span className="flex flex-wrap items-center gap-2 font-semibold text-[#FFFFFF]">{p.name} {p.kind === 'plan' ? 'plan' : 'coin pack'}<span className="rounded-full bg-[#102419] px-2 py-0.5 text-[11px] font-semibold text-[#1B7A44]">Paid</span></span><span className="block truncate text-[12px] text-[#A1A1AA]">Payment ID {p.paymentId}</span></span>
                  <span className="order-3 text-right font-semibold text-[#FFFFFF] sm:order-none">{formatMoney(p.amount, p.currency)}{p.offerPercent > 0 && <span className="ml-2 text-[11px] font-semibold text-[#FF3DF2]">{p.offerPercent}% off</span>}</span>
                  <span className="order-4 flex items-center justify-end gap-1.5 font-semibold text-[#FF3DF2] sm:order-none"><img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />+{p.coins.toLocaleString('en-US')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[32px] bg-[#272629] px-6 py-14 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-[#262310]"><img src="/images/features/coin.svg" alt="" className="size-9 object-contain" /></span>
              <p className="mt-5 font-display text-[22px] font-bold text-[#FFFFFF]">No transactions yet</p>
              <p className="mt-2 text-[14px] text-[#A1A1AA]">Subscriptions and coin purchases will show up here.</p>
              <Link to="/coins" className="btn-primary mt-6 !px-6 !py-2.5 !text-[14px]">Get coins</Link>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
