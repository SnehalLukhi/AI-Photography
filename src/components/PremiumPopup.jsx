import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { plans, features, categoryItems } from '../data/templates.js'
import { brandImages } from '../data/images.js'
import { SparkIcon } from './Header.jsx'

// Collage photos: existing template photos (Cartoon, LinkedIn Headshot, Old Money, 80's & 90's, Beard), one from each, no new assets.
const COLLAGE = ['cartoon', 'linkedin-headshot', 'old-money', '80s-and-90s', 'beard', 'cartoon'].map((id, i) => categoryItems(id)[id === 'cartoon' ? i % 5 : 0]).filter(Boolean)
const detail = (p, label) => p.details.find(([l]) => l === label)?.[1]
const images = (p) => (detail(p, 'Images available') || '').replace(/^(\d+)/, '$1 images')

/**
 * Premium subscription popup, shown after the Welcome popup has been closed (see StudioContext `premiumOffer`). Plans, prices and coin amounts come from
 * `plans` in data/templates.js - the same source as the Pricing page. There is no payment integration in this app yet: Continue only closes the popup and
 * goes to the Home page - it never creates a subscription or changes any balance.
 */
export default function PremiumPopup({ onClose }) {
  const [selected, setSelected] = useState((plans.find((p) => p.popular) || plans[0]).id)
  const nav = useNavigate()
  const goHome = () => { onClose(); nav('/') }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Pixora Premium" onClick={(e) => e.stopPropagation()}
        className="animate-fade-in relative flex max-h-[96dvh] w-full max-w-[1040px] flex-col overflow-y-auto overflow-x-hidden rounded-t-[28px] border border-white/10 bg-[#0B0B12] shadow-[0_0_90px_rgba(176,112,250,0.25)] sm:max-h-[94dvh] sm:rounded-[28px]">
        <div className="pointer-events-none absolute -left-24 -top-24 size-[360px] rounded-full bg-[#B070FA]/20 blur-[110px]" />
        <div className="pointer-events-none absolute -right-24 top-1/3 size-[320px] rounded-full bg-[#F066D8]/10 blur-[110px]" />
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 grid size-9 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/[0.06] text-lg leading-none text-white transition hover:bg-white/15 sm:right-4 sm:top-4">×</button>

        <div className="relative grid gap-5 px-4 pb-5 pt-5 sm:px-8 sm:pt-7 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:pb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 pr-10">
              <img src={brandImages.logo} alt="" className="gold-img h-8 w-auto rounded-[10px] object-contain" />
              <span className="font-display text-xl font-bold tracking-tight text-white">Pixora</span>
              <span className="grad-bg rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wider">PRO</span>
            </div>
            <h2 className="mt-4 text-[26px] font-extrabold leading-[1.1] tracking-tight text-white sm:mt-5 sm:text-[36px] lg:text-[40px]">Unlock <span className="grad-text">Premium Creativity</span></h2>
            <p className="mt-2 max-w-md text-sm text-[#C4B5FD] sm:text-base">Turn your photos into stunning AI creations.</p>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3">
              {features.map((f) => (
                <div key={f.title} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 sm:p-3">
                  <img src={f.image} alt="" className="gold-img size-8 shrink-0 object-contain sm:size-10" />
                  <div className="min-w-0"><p className="text-[12px] font-semibold leading-tight text-white sm:text-sm">{f.title}</p><p className="mt-0.5 hidden text-[11px] leading-snug text-[#C4B5FD]/75 sm:block">{f.text}</p></div>
                </div>
              ))}
            </div>
          </div>

          {/* collage: tilted photo columns on desktop, a short strip on small screens */}
          <div className="relative mt-8 hidden h-[300px] overflow-hidden lg:block" aria-hidden="true">
            <div className="absolute inset-[-10%] flex items-center justify-center gap-3" style={{ rotate: '8deg' }}>
              {[COLLAGE.slice(0, 2), COLLAGE.slice(2, 4), COLLAGE.slice(4, 6)].map((col, ci) => (
                <div key={ci} className={`flex w-[32%] flex-col gap-3 ${ci === 1 ? 'translate-y-10' : '-translate-y-6'}`}>
                  {col.map((t, i) => <img key={i} src={t.image} alt="" className="aspect-[9/14] w-full rounded-2xl border border-white/10 object-cover shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />)}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B12] via-transparent to-[#0B0B12]/40" />
          </div>
          <div className="flex gap-2 lg:hidden" aria-hidden="true">
            {COLLAGE.slice(0, 4).map((t, i) => <img key={i} src={t.image} alt="" className="h-16 min-w-0 flex-1 rounded-xl border border-white/10 object-cover" />)}
          </div>
        </div>

        <div className="relative px-4 pb-5 sm:px-8 sm:pb-6">
          <div role="radiogroup" aria-label="Choose a plan" className="grid gap-2.5 pt-2 sm:gap-3 lg:grid-cols-3">
            {plans.map((p) => {
              const on = p.id === selected
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setSelected(p.id)}
                  className={`relative flex min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 lg:flex-col lg:items-start lg:justify-start lg:gap-2 lg:p-4 ${on ? 'border-[#B070FA] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] shadow-[0_0_28px_rgba(176,112,250,0.35)]' : 'border-white/10 bg-white/[0.03] hover:border-[#B070FA]/50'}`}>
                  {p.popular && <span className="grad-bg absolute right-3 top-0 -translate-y-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Most Popular</span>}
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-white sm:text-base">{p.name}</span>
                    <span className="mt-0.5 flex items-baseline gap-1.5"><span className="text-[22px] font-bold leading-none text-white sm:text-[26px]">{p.price}</span><span className="text-xs text-[#C4B5FD]/75">{p.per}</span></span>
                    <span className="mt-1 block text-xs text-[#C4B5FD]">{images(p)}{p.id === 'yearly' ? ` · ${detail(p, 'Monthly allocation')}` : ` · ${detail(p, 'Cost per image')} each`}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-2.5 py-1.5">
                    <img src={brandImages.coin} alt="" width="28" height="28" className="size-7 object-contain drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]" />
                    <span className="whitespace-nowrap text-sm font-bold text-white">{p.coins.replace(' Coins', '').replace(' / year', '')}<span className="block text-[10px] font-semibold uppercase tracking-wide text-[#C4B5FD]">{p.id === 'yearly' ? 'Coins / year' : 'Coins'}</span></span>
                  </span>
                </button>
              )
            })}
          </div>

          <button type="button" onClick={goHome}
            className="grad-bg mt-4 flex h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-base font-bold shadow-[0_0_32px_rgba(176,112,250,0.4)] transition-shadow hover:shadow-[0_0_44px_rgba(240,102,216,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B070FA]">
            <SparkIcon className="size-4 text-white" />Continue
          </button>
          <p className="mt-3 text-center text-[11px] text-[#C4B5FD]/75 sm:text-xs">Auto-renewable subscription. Cancel anytime. · <Link to="/privacy-policy" onClick={onClose} className="underline underline-offset-2 hover:text-white">Privacy Policy</Link></p>
        </div>
      </div>
    </div>
  )
}
