import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudio, WELCOME_COINS } from '../context/StudioContext.jsx'
import { getPlans, cachedPlans } from '../lib/aiPhotography.js'
import { formatPrice } from '../lib/format.js'
import GlowBorder from './GlowBorder.jsx'

const Ico = ({ d, className = 'size-4' }) => <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
const SPARK = 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z'
const CROWN = 'M3.5 18.5l-1-9 5 3.5L12 5l4.5 8 5-3.5-1 9zM3.8 21h16.4'

// One card: an icon badge with a label and a value beside it (no empty space). Hover: the card rises a little, the icon zooms and the light streak runs round its border.
function InfoCard({ to, onClick, icon, label, value }) {
  const body = (
    <>
      <GlowBorder tail={24} />
      <span className="info-card__badge">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-[#A1A1AA]">{label}</span>
        <span className="block whitespace-nowrap font-display text-[14px] font-bold leading-tight text-white">{value}</span>
      </span>
    </>
  )
  const orbit = { '--streak-r': '16px', '--streak-lap': '6s' } // the hero bar's light, scaled to a card: same ~80px/s and ~120px tail
  return to ? <Link to={to} className="info-card glow-border" style={orbit}>{body}</Link> : <button type="button" onClick={onClick} className="info-card glow-border" style={orbit}>{body}</button>
}

/**
 * The three cards under the hero search bar: free coins (or the coin balance once signed in), the cost of one image, and premium plans.
 * Every number comes from the app's own data: the backend plans (GET /api/plans) and the account's coin balance.
 */
export default function HeroInfoCards() {
  const { signedIn, coins, openLogin } = useStudio()
  const [plans, setPlans] = useState(cachedPlans) // { plans, costPerGeneration } - the last answer (kept between visits), refreshed below
  useEffect(() => { getPlans().then(setPlans).catch(() => {}) }, [])
  const cost = plans?.costPerGeneration
  const cheapest = (plans?.plans || []).filter((p) => p.price != null).reduce((a, p) => { const price = p.offer?.price ?? p.price; return !a || price < a.price ? { price, plan: p } : a }, null)

  return (
    <div className="mx-auto mt-7 flex w-full flex-wrap items-center justify-center gap-2.5 text-left">
      {signedIn
        ? <InfoCard to="/coins" icon={<img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />} label="Your coins" value={`${coins.toLocaleString('en-US')} coins`} />
        : <InfoCard onClick={openLogin} icon={<img src="/images/features/coin.svg" alt="" className="size-4 object-contain" />} label="Free coins" value={`${WELCOME_COINS} coins`} />}
      <InfoCard to="/coins" icon={<Ico d={SPARK} />} label="Cost per image" value={cost ? `${cost} coins` : '…'} />
      <InfoCard to="/pricing" icon={<Ico d={CROWN} />} label="Premium plans" value={cheapest ? `From ${formatPrice(cheapest.price, cheapest.plan.currency)}` : 'See plans'} />
    </div>
  )
}
