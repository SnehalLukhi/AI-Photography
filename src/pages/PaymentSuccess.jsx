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
    <div className="px-5 pb-8 pt-8 sm:px-8 sm:pt-10 lg:px-12">
      <div className="mx-auto w-full max-w-[560px] rounded-md border border-[#2C2529] bg-[#141011] p-6 sm:p-9">
        <p className="eyebrow">Payment</p>
        <div className="mt-3 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-[#B653F6]/40 bg-[#B653F6]/10 text-[#B653F6]"><svg className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
          <h1 className="text-[40px] leading-none sm:text-[48px]">Payment successful</h1>
        </div>
        <p className="mt-3 text-[15px] text-[#B4B0C0]">Thank you! Your coins have been added to your account.</p>

        <div className="mt-6 rounded-md border border-[#2C2529] px-5 py-4">
          <p className="eyebrow">New balance</p>
          <p className="mt-2 flex items-baseline gap-2"><span className="font-serif text-[56px] leading-none tabular-nums">{balance.toLocaleString('en-US')}</span><span className="text-[15px] text-[#B4B0C0]">coins</span></p>
        </div>

        <dl className="mt-4 rounded-md border border-[#2C2529] text-[14px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 border-b border-[#2C2529] px-4 py-3 last:border-b-0"><dt className="shrink-0 text-[#B4B0C0]">{label}</dt><dd className="min-w-0 break-all text-right font-plexmono text-[13px]">{value}</dd></div>
          ))}
        </dl>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/explore" className="btn-grad flex-1 !py-3">Start creating</Link>
          <Link to="/transactions" className="btn-dark flex-1 !py-3">View my purchases</Link>
        </div>
      </div>
    </div>
  )
}
