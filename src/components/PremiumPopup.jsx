import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { plans as fallbackPlans, categoryItems } from '../data/templates.js'
import { brandImages } from '../data/images.js'
import { getPlans, cachedPlans, buyCoins } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import { formatPrice } from '../lib/format.js'
import { SparkIcon } from './Header.jsx'
import usePopupExit from './usePopupExit.js'

// Collage photos: existing template photos (Cartoon, LinkedIn Headshot, Old Money, 80's & 90's, Beard), one from each, no new assets.
const COLLAGE = ['cartoon', 'linkedin-headshot', 'old-money', '80s-and-90s', 'beard', 'cartoon'].map((id, i) => categoryItems(id)[id === 'cartoon' ? i % 5 : 0]).filter(Boolean)

const BRAND_GRADIENT = 'bg-[#FF3DF2]'

const icon = (d) => <svg className="size-7 text-[#FF3DF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const PERKS = [
  { label: '50% Cost', icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M9 15l6-6" /><circle cx="9.5" cy="9.5" r=".8" fill="currentColor" /><circle cx="14.5" cy="14.5" r=".8" fill="currentColor" /></>) },
  { label: '4k Upscale', icon: icon(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M8 10v3h3M11 10v5M14 15v-5l3 3.5M17 10v5" /></>) },
  { label: 'No Ads', icon: icon(<><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></>) },
  { label: 'Pro Tools', icon: icon(<><path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-2.5 2.5-2-2z" /><path d="M14 14l5 5M18 3l-4 4" /></>) },
]

// None of these four perks exists in the app yet (no plan-based discount, upscaling, ad-free mode or pro tools): they are shown as "Coming soon", not as active benefits.
// the plans come from the backend (single source of prices and coins); the built-in list is only shown if it cannot be reached
const pending = <span aria-hidden="true" className="invisible">₹000</span> // the price is not known until the server says which currency this visitor pays in
const fromFallback = (p, price = p.price) => ({ id: p.id, name: p.name, price, per: p.per, coins: Number(String(p.coins).replace(/[^\d]/g, '')), popular: !!p.popular })
const fromApi = (p) => ({ id: p.id, name: p.name, price: formatPrice(p.offer ? p.offer.price : p.price, p.currency), was: p.offer ? formatPrice(p.price, p.currency) : '', per: p.per, coins: p.coins, popular: !!p.popular })

/**
 * Premium subscription popup, shown after the Welcome popup has been closed (see StudioContext `premiumOffer`). Plans, prices and coin amounts come from the
 * backend (GET /api/plans, the same source as the Pricing page). "Continue" starts the same Razorpay checkout as the Pricing page for the selected plan; when
 * the popup is dismissed without buying, the special-offer popup follows (see StudioContext `closePremiumOffer`).
 */
export default function PremiumPopup({ onClose: finish }) {
  const nav = useNavigate()
  const { user, refreshUser } = useStudio()
  const [closing, onClose] = usePopupExit(finish)
  const [plans, setPlans] = useState(() => (cachedPlans() ? cachedPlans().plans.map(fromApi) : fallbackPlans.map((p) => fromFallback(p, ''))))
  const [selected, setSelected] = useState((fallbackPlans.find((p) => p.popular) || fallbackPlans[0]).id)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  useEffect(() => { getPlans().then((r) => setPlans(r.plans.map(fromApi))).catch(() => setPlans((cur) => (cur.some((p) => p.price) ? cur : fallbackPlans.map((p) => fromFallback(p))))) }, [])

  const pay = async () => {
    setBusy(true); setNote('')
    try {
      await buyCoins(selected, { name: user?.name, email: user?.email })
      refreshUser()
      finish(true) // bought: no special-offer popup
      nav('/')
    } catch (e) { setNote(e.message) }
    setBusy(false)
  }

  return (
    <div className={`welcome-backdrop ${closing ? 'welcome-closing' : ''} fixed inset-0 z-[300] flex items-end justify-center bg-[#08080D]/45 p-0 sm:items-center sm:p-4`} onClick={() => onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Pictrify Premium" onClick={(e) => e.stopPropagation()}
        className="welcome-card relative flex max-h-[96dvh] w-full max-w-[980px] flex-col overflow-y-auto overflow-x-hidden rounded-t-[32px] bg-[#12101B] shadow-[0_18px_40px_rgba(0,0,0,0.14)] sm:max-h-[94dvh] sm:rounded-[36px]">
        <button type="button" onClick={() => onClose()} aria-label="Close" className="absolute right-3 top-3 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-[#12101B] text-lg leading-none text-[#FFFFFF] transition hover:bg-[#1A1626] sm:right-4 sm:top-4">×</button>

        <div className="relative grid gap-5 px-4 pb-4 pt-6 sm:px-10 sm:pt-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-8">
          <div className="min-w-0 sm:pt-2">
            <div className="welcome-rise welcome-rise-1 flex items-center gap-2.5 pr-10">
              <span className="font-display text-[28px] font-extrabold tracking-tight text-[#FFFFFF]">Pictrify</span>
              <span className={`${BRAND_GRADIENT} rounded-full px-2.5 py-0.5 font-plexmono text-[11px] font-medium tracking-wider text-white`}>PRO</span>
            </div>
            <h2 className={`welcome-rise welcome-rise-2 mt-4 text-[26px] font-display font-extrabold leading-[1.1] tracking-tight text-[#FF3DF2] sm:text-[36px]`}>Unlock ultimate creative power</h2>
            <p className="welcome-rise welcome-rise-3 mt-3 max-w-lg text-sm leading-relaxed text-[#A1A1AA] sm:text-base">Supercharge your creativity with premium tools, ultra HD quality, and unlimited inspiration.</p>
            <div className="welcome-rise welcome-rise-3 mt-5 grid grid-cols-4 gap-2 sm:mt-7 sm:gap-3">
              {PERKS.map((f) => (
                <div key={f.label} className="flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-[22px] bg-[#12101B] px-1 py-3 sm:h-[92px]" title="Coming soon - not available yet">
                  <span className="text-[#FF3DF2] opacity-60">{f.icon}</span>
                  <p className="text-center text-[11px] font-semibold leading-tight text-[#FFFFFF]">{f.label}</p>
                  <span className="rounded-full bg-[#1B1530] px-2 py-px text-[9px] font-medium uppercase tracking-wide text-[#A1A1AA]">Coming soon</span>
                </div>
              ))}
            </div>
          </div>

          {/* collage: tilted photo columns on desktop */}
          <div className="relative hidden h-[290px] overflow-hidden lg:block" aria-hidden="true">
            <div className="absolute inset-[-10%] flex items-center justify-center gap-3" style={{ rotate: '8deg' }}>
              {[COLLAGE.slice(0, 2), COLLAGE.slice(2, 4), COLLAGE.slice(4, 6)].map((col, ci) => (
                <div key={ci} className={`flex w-[32%] flex-col gap-3 ${ci === 1 ? 'translate-y-10' : '-translate-y-6'}`}>
                  {col.map((t, i) => <img key={i} src={t.image} alt="" className="aspect-[9/14] w-full rounded-2xl object-cover" />)}
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0D0B14] via-transparent to-transparent" />
          </div>
        </div>

        <div className="relative px-4 pb-6 sm:px-10 sm:pb-8">
          <div role="radiogroup" aria-label="Choose a plan" className="welcome-rise welcome-rise-3 grid gap-3 pt-3 sm:pt-4 lg:grid-cols-3">
            {plans.map((p) => {
              const on = p.id === selected
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setSelected(p.id)}
                  className={`relative flex min-w-0 cursor-pointer flex-col rounded-[26px] border-2 p-4 text-left transition-all duration-200 sm:p-5 ${on ? 'border-[#FFFFFF] bg-[#12101B]' : 'border-[#272033] bg-[#12101B] hover:border-[#3A2F52]'}`}>
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      {p.popular && <span className="badge mb-1.5 !text-[10px]">Popular</span>}
                      <span className="block font-display text-[19px] font-bold leading-tight text-[#FFFFFF]">{p.name.replace(/ Premium$/, '')}</span>
                      <span className="mt-2 flex items-baseline gap-1.5"><span className="font-display text-[26px] font-extrabold leading-none text-[#FFFFFF]">{p.price || pending}</span>{p.was && <span className="text-[13px] text-[#A1A1AA] line-through">{p.was}</span>}<span className="text-[13px] text-[#A1A1AA]">{p.per.replace(/^\/\s*/, '/')}</span></span>
                    </span>
                    <span className="flex h-[88px] w-[88px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[20px] bg-[#1B1530]">
                      <img src={brandImages.coin} alt="" width="28" height="28" className="size-7 object-contain" />
                      <span className="text-[14px] font-bold leading-none text-[#FFFFFF]">{p.coins.toLocaleString('en-US')}</span>
                      <span className="text-[11px] font-semibold leading-none text-[#FF3DF2]">Coins</span>
                    </span>
                  </span>
                  <span className="mt-4 block border-t border-[#272033] pt-3 text-[12px] text-[#A1A1AA]">Premium templates</span>
                </button>
              )
            })}
          </div>

          <button type="button" onClick={pay} disabled={busy}
            className={`${BRAND_GRADIENT} mx-auto mt-5 flex h-[46px] w-full max-w-[460px] cursor-pointer items-center justify-center gap-2 rounded-full text-base font-bold text-white transition-shadow hover:shadow-[0_12px_32px_rgba(255,61,242,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-wait disabled:opacity-70`}>
            <SparkIcon className="size-4 text-white" />{busy ? 'Please wait…' : 'Continue'}
          </button>
          {note && <p role="status" className="mx-auto mt-3 max-w-[460px] rounded-2xl bg-[#12101B] px-4 py-2.5 text-center text-sm text-[#FFFFFF]">{note}</p>}
          <p className="mt-4 text-center text-[11px] text-[#A1A1AA] sm:text-xs">Auto-renewable Subscription. Cancel anytime.</p>
          <p className="mt-3 text-center"><Link to="/privacy-policy" onClick={() => finish(true)} className="text-xs font-semibold text-[#A1A1AA] hover:text-[#FFFFFF]">Privacy Policy</Link></p>
        </div>
      </div>
    </div>
  )
}
