import { useEffect, useState } from 'react'
import { getPlans, buyCoins } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import usePopupExit from './usePopupExit.js'
import StarBurst from './StarBurst.jsx'

const OFFER_WINDOW_MS = 24 * 60 * 60 * 1000 // the offer runs for 24 hours from the first time it is shown (kept per user in this browser)
const money = (amount, currency) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
const pad = (n) => String(n).padStart(2, '0')

/** When this user's offer ends (ms since epoch): set the first time the popup is shown, then remembered. */
function expiryFor(userId) {
  const key = `pictrify-offer-expires-${userId || 'guest'}`
  try {
    const saved = Number(localStorage.getItem(key))
    if (saved) return saved
    const end = Date.now() + OFFER_WINDOW_MS
    localStorage.setItem(key, String(end))
    return end
  } catch { return Date.now() + OFFER_WINDOW_MS } // storage blocked: the countdown restarts each visit
}

/**
 * "Wait! Create More for Less" special-offer popup: the third popup after login. Opens after the Premium popup has been dismissed without buying (see StudioContext
 * `closePremiumOffer`). The offer (price, regular price, discount, coins) comes from the backend (GET /api/plans -> `offer`); "Claim" starts the same Razorpay
 * checkout as the Pricing page for that offer, and the amount charged is set by the server. If the offer cannot be loaded or has expired the popup simply doesn't open.
 */
export default function OfferPopup({ onClose: finish }) {
  const { user, refreshUser } = useStudio()
  const [closing, onClose] = usePopupExit(finish)
  const [offer, setOffer] = useState(null)
  const [end, setEnd] = useState(0)
  const [left, setLeft] = useState(0)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let live = true
    getPlans().then((r) => {
      if (!live) return
      const e = r.offer?.endsAt ?? expiryFor(user?.id) // the server says when this user's offer ends
      if (!r.offer || e <= Date.now()) { finish(); return }
      setOffer(r.offer); setEnd(e); setLeft(e - Date.now())
    }).catch(() => live && finish())
    return () => { live = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!end) return
    const t = setInterval(() => setLeft(Math.max(0, end - Date.now())), 1000)
    return () => clearInterval(t)
  }, [end])

  const claim = async () => {
    setBusy(true); setNote('')
    try {
      await buyCoins(offer.id, { name: user?.name, email: user?.email })
      refreshUser()
      finish()
    } catch (e) { setNote(e.message) }
    setBusy(false)
  }

  if (!offer) return null
  const s = Math.floor(left / 1000)
  const clock = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
  const name = offer.name.replace(/ Premium$/, '')

  return (
    <div className={`welcome-backdrop ${closing ? 'welcome-closing' : ''} fixed inset-0 z-[300] flex items-center justify-center bg-[#0A0809]/80 p-4`} onClick={() => onClose()}>
      <StarBurst />
      <div role="dialog" aria-modal="true" aria-labelledby="offer-title" onClick={(e) => e.stopPropagation()}
        className="offer-card relative max-h-[96dvh] w-full max-w-[500px] overflow-y-auto overflow-x-hidden rounded-[28px] border border-white/10 bg-[#2B2B2B] px-5 pb-7 pt-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:px-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,85,170,0.07),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(255,85,170,0.07),transparent_55%)]" />
        <button type="button" onClick={() => onClose()} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full border border-white/10 bg-white/[0.07] text-lg leading-none text-[#A0A0A0] transition hover:bg-white/15 hover:text-white">×</button>

        <span className="welcome-rise welcome-rise-1 relative inline-block rounded-full border border-[#FF55AA]/40 bg-[#FF55AA]/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider"><span className="grad-alt-text">Special Offer</span></span>
        <h2 id="offer-title" className="welcome-rise welcome-rise-1 relative mt-4 text-[26px] font-extrabold leading-tight text-white sm:text-[30px]">Wait! Create <span className="grad-alt-text">More</span> for Less</h2>
        <p className="welcome-rise welcome-rise-2 relative mt-2 text-sm text-[#A0A0A0]">Limited-time premium trial reserved for you.</p>

        <div className="welcome-rise welcome-rise-2 relative mt-6 flex items-center gap-5 rounded-2xl border-2 border-dashed border-[#FF55AA] bg-[#2B2B2B] px-5 py-5 text-left">
          <div className="shrink-0 text-center">
            <p className="text-[34px] font-extrabold leading-none sm:text-[40px] grad-alt-text">{offer.discountPercent}%</p>
            <p className="mt-1 text-xs font-extrabold tracking-wide grad-alt-text">OFF</p>
          </div>
          <div className="min-w-0 border-l border-dashed border-white/20 pl-5">
            <p className="text-base font-bold text-white">{name}</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs text-[#A0A0A0] line-through">{money(offer.original, offer.currency)}</span>
              <span className="text-[26px] font-extrabold leading-none text-white sm:text-[30px]">{money(offer.price, offer.currency)}</span>
              <span className="text-xs text-[#A0A0A0]">{offer.per.replace(/^\/\s*/, '/')}</span>
            </p>
          </div>
        </div>

        <div className="welcome-rise welcome-rise-3 relative mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-white" role="timer" aria-label="Offer expires in">
          <svg className="size-4 text-[#FF55AA]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span className="text-[13px]">Offer expires in:</span>
          {clock.map((n, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-[#A0A0A0]">:</span>}
              <span className="grid h-7 min-w-[34px] place-items-center rounded-md border border-white/10 bg-[#2B2B2B] px-1.5 text-[13px] tabular-nums">{pad(n)}</span>
            </span>
          ))}
        </div>

        <button type="button" onClick={claim} disabled={busy}
          className="welcome-rise welcome-rise-3 relative mt-5 flex h-[50px] w-full cursor-pointer items-center justify-center rounded-2xl bg-[linear-gradient(90deg,#FF88C7_0%,#FF55AA_100%)] text-base font-bold text-white shadow-[0_8px_30px_rgba(255,85,170,0.3)] transition-shadow hover:shadow-[0_8px_40px_rgba(255,85,170,0.5)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF55AA] disabled:cursor-wait disabled:opacity-70">
          {busy ? 'Please wait…' : `Claim ${name} Offer`}
        </button>
        {note && <p role="status" className="relative mt-3 rounded-xl border border-[#FF55AA]/40 bg-[#2B2B2B] px-4 py-2.5 text-sm text-[#FFFFFF]">{note}</p>}
        <button type="button" onClick={() => onClose()} className="welcome-rise welcome-rise-3 relative mt-4 cursor-pointer text-xs text-[#A0A0A0] underline underline-offset-2 hover:text-white">No Thanks, I'll Decide Later</button>
      </div>
    </div>
  )
}
