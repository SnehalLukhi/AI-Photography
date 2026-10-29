import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plans as fallbackPlans } from '../data/templates.js'
import { getPlans, cachedPlans, buyCoins } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'
import { formatPrice } from '../lib/format.js'

const pending = <span aria-hidden="true" className="invisible">₹000</span> // the price is not known until the server says which currency this visitor pays in

const TINTS = ['#1B1530', '#271425', '#101D2C', '#102419', '#2A1C10']

const bar = (cls) => <span className={`block animate-pulse rounded-md bg-[#1A1626] ${cls}`} />
/** Placeholder cards for the very first visit (no saved prices yet) until the server says which currency applies. */
const SkeletonCard = () => (
  <article aria-hidden="true" className="flex flex-col rounded-[32px] border border-[#272033] bg-[#12101B] p-6 sm:p-8 lg:p-6 xl:p-8">
    {bar('h-6 w-40')}
    <div className="mt-5">{bar('h-10 w-32')}</div>
    <div className="mt-4 flex items-center gap-2.5"><span className="size-9 animate-pulse rounded-full bg-[#1A1626]" />{bar('h-4 w-28')}</div>
    <div className="mt-7 flex flex-col gap-4 sm:mt-8">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="flex justify-between gap-6">{bar('h-3.5 w-36')}{bar('h-3.5 w-12')}</div>)}</div>
    <span className="mt-8 block h-[52px] w-full animate-pulse rounded-full bg-[#12101B]" />
  </article>
)
const SkeletonRow = () => (
  <div aria-hidden="true" className="flex items-center gap-3 rounded-[24px] border border-[#272033] bg-[#12101B] p-4">
    <span className="size-5 shrink-0 rounded-full border-2 border-[#3A2F52]" />
    <div className="flex-1 space-y-2">{bar('h-4 w-32')}{bar('h-3 w-24')}</div>
    {bar('h-6 w-20')}
  </div>
)

function build(r) {
  return r.plans.map((p) => {
    const card = fallbackPlans.find((f) => f.id === p.id) || {}
    const money = (n) => formatPrice(n, p.currency)
    // with an offer the discounted price is the price (the server charges exactly this); the regular price is shown struck through
    return { ...card, ...p, price: money(p.offer ? p.offer.price : p.price), originalPrice: p.offer ? money(p.price) : '', discount: p.offer?.discountPercent || 0, coins: `${p.coins.toLocaleString('en-US')} Coins${p.per.includes('year') ? ' / year' : ''}`, details: card.details || [] }
  })
}

export default function Pricing() {
  const nav = useNavigate()
  const { signedIn, user, refreshUser, openLogin } = useStudio()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  // the plans come from the backend (single source of prices and coins); the built-in list is only shown if the backend cannot be reached
  const [plans, setPlans] = useState(() => (cachedPlans() ? build(cachedPlans()) : fallbackPlans.map((p) => ({ ...p, price: '' })))) // no price shown until it is known (rupees or dollars depending on the visitor)
  useEffect(() => { getPlans().then((r) => setPlans(build(r))).catch(() => setPlans((cur) => (cur.some((p) => p.price) ? cur : fallbackPlans))) }, [])
  const [sel, setSel] = useState(null)
  const selId = sel || (plans.find((p) => p.popular) || plans[0])?.id
  const choose = async (p) => {
    if (!signedIn) { openLogin(); return }
    setBusy(p.id); setNote('')
    try {
      const out = await buyCoins(p.id, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy('')
  }
  const loading = !plans.some((p) => p.price) // the very first visit: nothing known yet
  const chosen = plans.find((p) => p.id === selId)
  const mobile = (
    <div className="px-4 pb-32 pt-4 sm:hidden">
      <div className="relative flex items-center justify-center pb-3">
        <button type="button" aria-label="Back" onClick={() => nav(-1)} className="absolute left-0 grid size-10 cursor-pointer place-items-center rounded-full bg-[#12101B] text-[#FFFFFF]"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg></button>
        <h1 className="font-display text-[20px] font-bold text-[#FFFFFF]">Choose Your Plan</h1>
      </div>
      <p className="mb-5 text-center text-[14px] text-[#A1A1AA]">Unlock premium templates, faster generation and more creative freedom.</p>
      <div className="space-y-3" role="radiogroup" aria-label="Subscription plans">
        {loading && [0, 1, 2].map((i) => <SkeletonRow key={i} />)}
        {!loading && plans.map((p) => {
          const on = p.id === selId
          return (
            <div key={p.id} role="radio" aria-checked={on} tabIndex={0} onClick={() => setSel(p.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSel(p.id)}
              className={`relative cursor-pointer overflow-hidden rounded-[24px] border-2 p-4 transition-colors ${on ? 'border-[#FFFFFF] bg-[#12101B]' : 'border-[#272033] bg-[#12101B]'}`}>
              {p.popular && <span className="badge absolute right-0 top-0 !rounded-none !rounded-bl-2xl !px-3 !py-1 !text-[10px] uppercase tracking-wide">Most Popular</span>}
              <div className="flex items-center gap-3">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-[#FFFFFF]' : 'border-[#3A2F52]'}`}>{on && <span className="size-2.5 rounded-full bg-[#0D0B14] ring-1 ring-[#FF3DF2]/30" />}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[16px] font-bold text-[#FFFFFF]">{p.name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#A1A1AA]"><img src={brandImages.coin} alt="" width="16" height="16" className="size-4 object-contain" />{p.coins}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-[22px] font-bold leading-none text-[#FFFFFF]">{p.price || pending} <span className="font-sans text-[11px] font-normal text-[#A1A1AA]">{p.per}</span></p>
                  {p.originalPrice && <p className="mt-1 text-[11px] text-[#A1A1AA]"><span className="line-through">{p.originalPrice}</span> <span className="font-bold text-[#FF3DF2]">{p.discount}% OFF</span></p>}
                </div>
              </div>
              {on && p.details?.length > 0 && (
                <dl className="mt-3.5 space-y-2 border-t border-[#272033] pt-3 text-[12px] text-[#A1A1AA]">
                  {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="text-[#FF3DF2]">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold text-[#FFFFFF]">{value}</dd></div>)}
                </dl>
              )}
            </div>
          )
        })}
      </div>
      {note && <p role="status" className="mt-4 rounded-2xl border border-[#272033] bg-[#12101B] px-4 py-3 text-center text-sm text-[#A1A1AA]">{note}</p>}
      <button type="button" disabled={!chosen?.price || busy === selId} onClick={() => chosen && choose(chosen)} className="btn-primary mt-5 !h-[54px] !w-full !text-[16px] !font-bold disabled:cursor-wait">{busy === selId ? 'Please wait…' : chosen ? chosen.price ? `Continue · ${chosen.price}` : 'Continue' : 'Continue'}</button>
      <p className="mt-3 text-center text-[11px] text-[#A1A1AA]">Auto-renewable subscription. Cancel anytime.</p>
    </div>
  )
  return (
    <>
    {mobile}
    <div className="mx-auto w-full max-w-[1280px] max-sm:hidden px-4 pb-24 pt-6 text-[#FFFFFF] sm:px-6 sm:pb-20 sm:pt-10 md:px-8 lg:px-12">
      <header className="mx-auto max-w-3xl text-center">
        <span className="pill-tag"><SparkIcon className="size-3.5 text-[#FF3DF2]" /><span>Flexible plans</span></span>
        <h1 className="mt-5 font-display text-[36px] font-extrabold leading-[1.05] tracking-tight text-[#FFFFFF] sm:text-[52px] lg:text-[60px]">Choose <span className="grad-text">Your Plan</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#A1A1AA] sm:text-lg">Unlock premium templates, faster generation and more creative freedom.</p>
      </header>

      <section className="mt-10 lg:mt-14">
        <h2 className="sr-only">Subscription plans</h2>
        <div className="grid grid-cols-1 gap-5 pt-3 sm:grid-cols-2 sm:pt-4 lg:grid-cols-3 lg:gap-6">
          {loading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}
          {!loading && plans.map((p, idx) => (
            <article key={p.id} className={`relative flex flex-col overflow-visible rounded-[32px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 lg:p-6 xl:p-8 ${p.popular ? 'border-[#FFFFFF] bg-[#0D0B14] ring-1 ring-[#FF3DF2]/30 text-white shadow-[0_18px_40px_rgba(0,0,0,0.14)]' : 'border-[#272033] bg-[#12101B]'}`}>
              {p.popular && <span className="badge absolute right-6 top-0 z-10 -translate-y-1/2 !px-3.5 !py-1 !text-[11px] uppercase tracking-wide shadow-[0_6px_18px_rgba(255,61,242,0.35)]">Most Popular</span>}
              <h3 className={`font-display ${p.popular ? 'pr-24 ' : ''}text-[22px] font-bold leading-tight sm:text-[26px] ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{p.name}</h3>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className={`font-display text-[40px] font-extrabold leading-none sm:text-[48px] ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{p.price || pending}</p>
                {p.originalPrice && <span className={`text-[15px] line-through ${p.popular ? 'text-white/65' : 'text-[#A1A1AA]'}`}>{p.originalPrice}</span>}
                <span className={`text-[13px] sm:text-[14px] ${p.popular ? 'text-white/65' : 'text-[#A1A1AA]'}`}>{p.per}</span>
                {p.discount > 0 && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${p.popular ? 'bg-[#FF3DF2] text-white' : 'bg-[#271425] text-[#FF3DF2]'}`}>{p.discount}% OFF</span>}
              </div>
              <div className={`mt-5 flex items-center gap-3 rounded-2xl px-3 py-2.5 ${p.popular ? 'bg-[#12101B]/10' : ''}`} style={p.popular ? undefined : { background: TINTS[idx % TINTS.length] }}>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#12101B]"><img src={brandImages.coin} alt="Coins" width="44" height="44" className="size-7 object-contain" /></span>
                <p className={`text-[15px] font-semibold ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{p.coins}</p>
              </div>
              <dl className={`mt-7 flex flex-1 flex-col gap-3.5 text-[13px] sm:mt-8 sm:gap-4 sm:text-[14px] ${p.popular ? 'text-white/65' : 'text-[#A1A1AA]'}`}>
                {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2.5"><span aria-hidden="true" className={`mt-px grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${p.popular ? 'bg-[#12101B]/15 text-white' : 'bg-[#1B1530] text-[#FF3DF2]'}`}>✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className={`shrink-0 text-right font-semibold leading-snug ${p.popular ? 'text-white' : 'text-[#FFFFFF]'}`}>{value}</dd></div>)}
              </dl>
              <button type="button" disabled={busy === p.id} onClick={() => choose(p)}
                className={`${p.popular ? 'btn-grad' : 'btn-dark'} mt-8 !h-[52px] w-full disabled:cursor-wait`}>
                {busy === p.id ? 'Please wait…' : `Choose ${p.name}`}
              </button>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-[11px] text-[#A1A1AA] sm:hidden">Auto-renewable subscription. Cancel anytime.</p>
        {note && <p role="status" className="mt-4 rounded-2xl border border-[#272033] bg-[#12101B] px-4 py-3 text-center text-sm text-[#A1A1AA]">{note}</p>}
      </section>
    </div>
    </>
  )
}
