import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { formatDate, formatMoney } from '../lib/format.js'

/** Shown right after a successful Razorpay payment (the Coins / Pricing page sends `{ purchase, balance }` along). Opened without a payment it goes back to Get Coins. */
// Local development only: /payment-success?preview=1 shows the page with sample data (this code is removed from production builds).
const PREVIEW = { balance: 245, purchase: { kind: 'pack', name: 'Popular', coins: 195, amount: 999, currency: 'USD', paidAt: new Date().toISOString(), paymentId: 'pay_PREVIEW123456' } }

export default function PaymentSuccess() {
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state?.purchase ? location.state : import.meta.env.DEV && params.get('preview') ? PREVIEW : null
  if (!state) return <Navigate to="/coins" replace />
  const { purchase: p, balance } = state
  const rows = [
    [p.kind === 'plan' ? 'Plan' : 'Coin pack', p.name],
    ['Coins added', `+${p.coins.toLocaleString('en-US')}`],
    ['Amount paid', formatMoney(p.amount, p.currency)],
    ...(p.offerPercent ? [['Offer', `${p.offerPercent}% off (regular price ${formatMoney(p.listAmount, p.currency)})`]] : []),
    ['Date', formatDate(p.paidAt, true)],
    ['Payment ID', p.paymentId],
  ]
  return (
    <div className="px-4 pb-24 pt-10 md:pb-16 md:pt-16">
      <div className="mx-auto w-full max-w-[520px] rounded-[24px] border border-white/[0.08] bg-[#2B2B2B] p-6 text-center sm:p-9">
        <div className="mx-auto grid size-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
          <svg className="size-10 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight text-white sm:text-[32px]">Payment successful</h1>
        <p className="mt-2 text-sm text-[#A0A0A0]">Thank you! Your coins have been added to your account.</p>

        <div className="mt-6 flex items-center justify-center gap-2.5 rounded-2xl border border-[#FF55AA]/30 bg-[#2B2B2B] px-4 py-4">
          <img src={brandImages.coin} alt="" width="44" height="44" className="size-9 shrink-0 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.4)]" />
          <p className="text-[15px] text-[#A0A0A0]">New balance <strong className="ml-1 text-[22px] font-bold text-white">{balance.toLocaleString('en-US')}</strong> <span className="text-sm">coins</span></p>
        </div>

        <dl className="mt-6 divide-y divide-white/[0.06] rounded-2xl border border-white/[0.06] bg-[#2B2B2B] text-left text-[13px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 px-4 py-3"><dt className="shrink-0 text-[#A0A0A0]">{label}</dt><dd className="min-w-0 break-all text-right font-semibold text-white">{value}</dd></div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-3">
          <Link to="/explore" className="btn-grad w-full">Start creating</Link>
          <Link to="/transactions" className="btn-dark w-full">View my purchases</Link>
        </div>
      </div>
    </div>
  )
}
