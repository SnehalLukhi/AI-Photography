import { useState } from 'react'
import { plans, planPerks } from '../data/templates.js'
import { brandImages } from '../data/images.js'
import { SparkIcon } from '../components/Header.jsx'

export default function Pricing() {
  const [note, setNote] = useState('')
  return (
    <div className="mx-auto w-full max-w-none px-4 pb-24 pt-6 sm:px-6 sm:pb-20 sm:pt-8 md:px-8 lg:px-12 xl:px-16">
      <header className="max-w-3xl">
        <div className="eyebrow"><span>Flexible plans</span></div>
        <h1 className="mt-4 text-[34px] font-extrabold leading-[1] tracking-tight sm:text-[52px] lg:text-[64px]"><span className="text-[#f8f5ff]">Choose </span> <span className="grad-text">Your Plan</span></h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#b8b4c7] sm:mt-4 sm:text-lg lg:text-xl">Unlock premium templates, faster generation and more creative freedom.</p>
      </header>

      <section className="mt-8 sm:mt-10 lg:mt-12">
        <h2 className="sr-only">Subscription plans</h2>
        <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 sm:gap-5 sm:pt-4 lg:gap-6 xl:grid-cols-3">
          {plans.map((p) => (
            <article key={p.id} className={`relative flex min-h-[440px] flex-col overflow-visible rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 sm:min-h-[520px] sm:rounded-xl sm:p-7 lg:p-8 ${p.popular ? 'border-[#8b5cf6]/50 bg-gradient-to-b from-[#14121d] to-[#14121d] shadow-[0_30px_60px_-30px_rgba(139,92,246,0.5)]' : 'border-[#292536] bg-gradient-to-b from-white/[0.05] to-white/[0.02]'}`}>
              {p.popular && <span className="grad-bg absolute right-4 top-0 z-10 -translate-y-1/2 rounded-xl px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#0b0a12] sm:right-5 sm:px-3 sm:text-[11px]">Most Popular</span>}
              <h3 className="pr-16 font-display text-[28px] text-[#f8f5ff] sm:text-[34px]">{p.name}</h3>
              <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1 sm:mt-4">
                <p className="font-display text-[52px] leading-none text-white sm:text-[64px]">{p.price}</p>
                <span className="mb-0.5 text-[13px] text-[#b8b4c7] sm:mb-1 sm:text-[14px]">{p.per}</span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <img src={brandImages.coin} alt="Coins" width="44" height="44" className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)] sm:size-10" />
                <p className="text-[13px] font-semibold text-white sm:text-[14px]">{p.coins}</p>
              </div>
              <ul className="mt-6 flex flex-1 flex-col gap-3 text-[13px] text-[#b8b4c7] sm:mt-8 sm:gap-4 sm:text-[14px]">
                {planPerks.map((x) => <li key={x} className="flex items-start gap-2"><span className="mt-0.5 text-[#b8b4c7]">✓</span><span className="leading-snug">{x}</span></li>)}
              </ul>
              <button type="button" onClick={() => setNote(`Demo only - "${p.name}" is not connected to a payment gateway yet.`)}
                className={`group relative mt-6 flex h-12 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl text-[14px] font-semibold text-white transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6] sm:mt-8 sm:h-[52px] sm:rounded-xl sm:text-[15px] ${p.popular ? 'grad-bg shadow-[0_0_28px_rgb(139,92,246,0.35)] hover:shadow-[0_0_36px_rgb(139,92,246,0.45)]' : 'border border-[#292536] bg-[#14121d] hover:border-transparent hover:shadow-[0_0_28px_rgb(139,92,246,0.35)]'}`}>
                {!p.popular && <span className="grad-bg pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                <span className="relative z-10">Choose {p.name}</span>
              </button>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-[11px] text-[#b8b4c7] sm:hidden">Auto-renewable subscription. Cancel anytime.</p>
        {note && <p role="status" className="mt-4 rounded-xl border border-[#8b5cf6]/40 bg-[#14121d] px-4 py-3 text-center text-sm text-[#b8b4c7]">{note}</p>}
      </section>
    </div>
  )
}
