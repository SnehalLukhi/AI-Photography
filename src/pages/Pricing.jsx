<<<<<<< HEAD
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { plans as fallbackPlans, planPerks } from '../data/templates.js'
import { getPlans, startCheckout } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
=======
import { useState } from 'react'
import { plans } from '../data/templates.js'
>>>>>>> cc72fa45a8496ff7bc337414c4fbb34f7d355ace
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'

export default function Pricing() {
  const nav = useNavigate()
  const { signedIn } = useStudio()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState('')
  // the plans come from the backend (single source of prices and coins); the built-in list is only shown if the backend cannot be reached
  const [plans, setPlans] = useState(() => fallbackPlans.map((p) => ({ ...p, priceInr: Number(p.price.replace(/\D/g, '')), coinCount: Number(p.coins.split(' ')[0].replace(/,/g, '')) })))
  useEffect(() => {
    getPlans().then((r) => setPlans(r.plans.map((p) => ({ ...p, price: `₹${p.priceInr.toLocaleString('en-IN')}`, coinCount: p.coins, coins: `${p.coins.toLocaleString('en-US')} Coins · ${p.tier}` })))).catch(() => {})
  }, [])
  const choose = async (p) => {
    if (!signedIn) { nav('/login'); return }
    setBusy(p.id); setNote('')
    try {
      const out = await startCheckout(p.id)
      if (out.url) window.location.assign(out.url) // hosted payment page of the gateway
    } catch (e) { setNote(e.message) }
    setBusy('')
  }
  return (
    <div className="mx-auto w-full max-w-none px-4 pb-24 pt-6 sm:px-6 sm:pb-20 sm:pt-8 md:px-8 lg:px-12 xl:px-16">
      <header className="max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#B070FA]/50 bg-[#B070FA]/[0.06] px-4 py-1.5 text-[13px] font-semibold text-white"><SparkIcon className="size-3.5 text-[#B070FA]" /><span>Flexible plans</span></div>
        <h1 className="mt-6 text-[32px] font-bold leading-[1.05] tracking-tight sm:text-[44px] lg:text-[48px]"><span className="text-[#ffffff]">Choose </span> <span className="grad-text">Your Plan</span></h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#C4B5FD]/85 sm:mt-4">Unlock premium templates, faster generation and more creative freedom.</p>
      </header>

      <section className="mt-8 sm:mt-10 lg:mt-12">
        <h2 className="sr-only">Subscription plans</h2>
        <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:gap-6 xl:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className={`relative flex flex-col overflow-visible rounded-[24px] border p-6 transition-transform duration-200 hover:-translate-y-1 sm:p-8 ${p.popular ? 'border-[#B070FA]/30 bg-[#170E21]' : 'border-white/[0.08] bg-[#12121A]'}`}>
              {p.popular && <span className="grad-bg absolute right-5 top-0 z-10 -translate-y-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white sm:text-[11px]">Most Popular</span>}
              <h3 className={`${p.popular ? 'pr-16 ' : ''}text-[18px] font-bold leading-tight text-white sm:text-[22px]`}>{p.name}</h3>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <p className="text-[34px] font-bold leading-none text-white sm:text-[40px]">{p.price}</p>
                <span className="text-[13px] text-[#C4B5FD]/75 sm:text-[14px]">{p.per}</span>
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <img src={brandImages.coin} alt="Coins" width="44" height="44" className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
                <p className="text-[14px] font-semibold text-white">{p.coins}</p>
              </div>
<<<<<<< HEAD
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-[13px] text-[#C4B5FD] sm:mt-8 sm:gap-4 sm:text-[14px]">
                {planPerks.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-0.5 text-[#C4B5FD]">✓</span><span className="leading-snug">{x}</span></li>)}
              </ul>
              <button type="button" disabled={busy === p.id} onClick={() => choose(p)}
                className={`group relative mt-6 flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[14px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA] sm:mt-8 sm:h-[52px] sm:rounded-xl sm:text-[15px] ${p.popular ? 'grad-bg shadow-[0_0_28px_rgba(176,112,250,0.35)] hover:shadow-[0_0_36px_rgba(176,112,250,0.45)]' : 'border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] hover:border-transparent hover:shadow-[0_0_28px_rgba(176,112,250,0.35)]'}`}>
=======
              <dl className="mt-7 flex flex-1 flex-col gap-3.5 text-[13px] text-[#C4B5FD] sm:mt-8 sm:gap-4 sm:text-[14px]">
                {p.details.map(([label, value]) => <div key={label} className="flex items-start gap-2"><span aria-hidden="true" className="mt-px text-[#C4B5FD]/80">✓</span><dt className="min-w-0 flex-1 leading-snug">{label}</dt><dd className="shrink-0 text-right font-semibold leading-snug text-white">{value}</dd></div>)}
              </dl>
              <button type="button" onClick={() => setNote(`Demo only - "${p.name}" is not connected to a payment gateway yet.`)}
                className={`group relative mt-8 flex h-[52px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[15px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA] ${p.popular ? 'grad-bg shadow-[0_0_28px_rgba(176,112,250,0.35)] hover:shadow-[0_0_36px_rgba(176,112,250,0.45)]' : 'border border-white/[0.08] bg-[#1A1A24] hover:border-transparent hover:shadow-[0_0_28px_rgba(176,112,250,0.35)]'}`}>
>>>>>>> cc72fa45a8496ff7bc337414c4fbb34f7d355ace
                {!p.popular && <span className="grad-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                <span className="relative z-10">{busy === p.id ? 'Please wait…' : `Choose ${p.name}`}</span>
              </button>
            </article>
          ))}
        </div>
        {note && <p role="status" className="mt-4 rounded-xl border border-[#B070FA]/40 bg-gradient-to-br from-[#2A1B52] to-[#1A284F] px-4 py-3 text-center text-sm text-[#C4B5FD]">{note}</p>}
      </section>
    </div>
  )
}
