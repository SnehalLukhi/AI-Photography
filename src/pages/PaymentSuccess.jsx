import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
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
    <div className="px-5 pb-12 pt-8 text-[#FFFFFF] sm:px-8 sm:pt-12 lg:px-12">
      <div className="mx-auto w-full max-w-[560px] text-center">
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-[#102419] text-[#1B7A44]"><svg className="size-9" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <p className="eyebrow mt-6">Payment</p>
        <h1 className="mt-2 font-display text-[36px] font-extrabold leading-none tracking-tight sm:text-[46px]">Payment successful</h1>
        <p className="mt-3 text-[15px] text-[#A1A1AA]">Thank you! Your coins have been added to your account.</p>

        <div className="mt-8 rounded-[28px] bg-[#1B1530] px-5 py-6">
          <p className="eyebrow">New balance</p>
          <p className="mt-2 flex items-baseline justify-center gap-2"><span className="grad-text font-display text-[64px] font-extrabold leading-none tabular-nums">{balance.toLocaleString('en-US')}</span><span className="text-[15px] text-[#A1A1AA]">coins</span></p>
        </div>

        <dl className="mt-4 rounded-[28px] border border-[#272033] bg-[#12101B] text-left text-[14px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-[#272033] px-5 py-3.5 last:border-b-0"><dt className="shrink-0 text-[#A1A1AA]">{label}</dt><dd className="min-w-0 break-all text-right font-plexmono text-[13px] text-[#FFFFFF]">{value}</dd></div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/explore" className="btn-primary flex-1 !py-3">Start creating</Link>
          <Link to="/transactions" className="btn-dark flex-1 !py-3">View my purchases</Link>
        </div>
      </div>
    </div>
  )
}
