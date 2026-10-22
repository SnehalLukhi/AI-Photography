import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plans as fallbackPlans } from '../data/templates.js'
import { getPlans, buyCoins } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'

export default function Pricing() {
  const nav = useNavigate()
  const { signedIn, user, refreshUser } = useStudio()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  // the plans come from the backend (single source of prices and coins); the built-in list is only shown if the backend cannot be reached
  const [plans, setPlans] = useState(fallbackPlans)
  useEffect(() => {
    getPlans().then((r) => setPlans(r.plans.map((p) => {
      const card = fallbackPlans.find((f) => f.id === p.id) || {}
      return { ...card, ...p, price: new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency }).format(p.price), coins: `${p.coins.toLocaleString('en-US')} Coins${p.per.includes('year') ? ' / year' : ''}`, details: card.details || [] }
    }))).catch(() => {})
  }, [])
  const choose = async (p) => {
    if (!signedIn) { nav('/login'); return }
    setBusy(p.id); setNote('')
    try {
      const out = await buyCoins(p.id, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy('')
  }
  return (
    <div className="mx-auto w-full max-w-[1408px] px-4 pb-24 pt-6 sm:px-6 sm:pb-20 sm:pt-8 md:px-8 lg:px-12">
      <header className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#705CFF]/50 bg-[#705CFF]/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#705CFF]" /><span>Flexible plans</span></div>
        <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]"><span className="text-[#ffffff]">Choose </span> <span className="grad-text">Your Plan</span></h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#A0A0A0] sm:mt-4">Unlock premium templates, faster generation and more creative freedom.</p>
      </header>

      <section className="mt-8 sm:mt-10 lg:mt-12">
        <h2 className="sr-only">Subscription plans</h2>
        <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:grid-cols-3 lg:gap-6">
          {plans.map((p) => (
            <article key={p.id} className={`relative flex flex-col overflow-visible rounded-[24px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 lg:p-6 xl:p-8 ${p.popular ? 'border-[#705CFF]/30 bg-[#0C032A]' : 'border-white/[0.08] bg-[#2B2B2B]'}`}>
              {p.popular && <span className="grad-alt-bg absolute right-5 top-0 z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] uppercase tracking-wide sm:text-[11px]">Most Popular</span>}
              <h3 className={`${p.popular ? 'pr-16 ' : ''}text-[18px] font-bold leading-tight text-white sm:text-[22px]`}>{p.name}</h3>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-[34px] font-bold leading-none text-white sm:text-[40px]">{p.price}</p>
                <span className="text-[13px] text-[#A0A0A0] sm:text-[14px]">{p.per}</span>
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <img src={brandImages.coin} alt="Coins" width="44" height="44" className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
                <p className="text-[14px] font-semibold text-white">{p.coins}</p>
              </div>
              <dl className="mt-7 flex flex-1 flex-col gap-3.5 text-[13px] text-[#A0A0A0] sm:mt-8 sm:gap-4 sm:text-[14px]">
                {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="mt-px text-[#A0A0A0]">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold leading-snug text-white">{value}</dd></div>)}
              </dl>
              <button type="button" disabled={busy === p.id} onClick={() => choose(p)}
                className={`group relative mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[15px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#705CFF] ${p.popular ? 'grad-bg shadow-[0_0_28px_rgba(112,92,255,0.35)] hover:shadow-[0_0_36px_rgba(112,92,255,0.45)]' : 'border border-white/[0.08] bg-[#2B2B2B] hover:border-transparent hover:shadow-[0_0_28px_rgba(112,92,255,0.35)]'}`}>
                {!p.popular && <span className="grad-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                <span className="relative z-10">{busy === p.id ? 'Please wait…' : `Choose ${p.name}`}</span>
              </button>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-[#A0A0A0] sm:hidden">Auto-renewable subscription. Cancel anytime.</p>
        {note && <p role="status" className="mt-4 rounded-xl border border-[#705CFF]/40 bg-gradient-to-br bg-[#2B2B2B] from-[#705CFF]/[0.07] to-[#705CFF]/0 px-4 py-3 text-center text-sm text-[#A0A0A0]">{note}</p>}
      </section>
    </div>
  )
}
