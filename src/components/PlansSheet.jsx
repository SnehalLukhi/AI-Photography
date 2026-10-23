import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { plans as fallbackPlans } from '../data/templates.js'
import { getPlans, buyCoins } from '../lib/aiPhotography.js'
import { useStudio } from '../context/StudioContext.jsx'
import { brandImages } from '../data/images.js'
import { categoryItems } from '../data/templates.js'
import { formatPrice } from '../lib/format.js'

// The three plan perks shown under the title (label, icon path)
const perks = [
  ['Upscale', 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5M9 9l-5-5M15 9l5-5M9 15l-5 5M15 15l5 5'],
  ['No Ads', 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8'],
  ['Tools', 'M14.7 6.3a4 4 0 00-5.4 5.1L3.5 17.2a1.5 1.5 0 002.1 2.1l5.8-5.8a4 4 0 005.1-5.4l-2.5 2.5-2-.5-.5-2z'],
]

// Animated collage behind the title: three columns of real template photos drifting up / down / up, looping seamlessly (each column is shown twice and moved by half).
const COLS = ['80s-and-90s', 'cartoon', 'linkedin-headshot', 'old-money', 'top-carousel', 'beard'].map((id) => categoryItems(id).slice(0, 8).map((t) => t.image))
const columns = [[0, 3, 4], [1, 2, 5]].map((ids, c) => ids.flatMap((i) => COLS[i].slice(c ? 1 : 0, 3 + (c ? 1 : 0)))).filter((l) => l.length)
const reel = [columns[0] || [], columns[1] || [], (columns[0] || []).slice().reverse()]


/** Phone-only bottom sheet with the subscription plans (same plans and purchase call as the Pricing page). Slides up; closes by the X, tapping outside or dragging down. */
export default function PlansSheet({ onClose }) {
  const nav = useNavigate()
  const { signedIn, user, refreshUser, openLogin } = useStudio()
  const [plans, setPlans] = useState(fallbackPlans)
  const [sel, setSel] = useState(() => (fallbackPlans.find((p) => p.popular) || fallbackPlans[0])?.id)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(false) // false on first paint, then true: drives the slide-up
  const [dy, setDy] = useState(0)
  const drag = useRef(null)
  useEffect(() => {
    getPlans().then((r) => setPlans(r.plans.map((p) => {
      const card = fallbackPlans.find((f) => f.id === p.id) || {}
      return { ...card, ...p, price: formatPrice(p.offer ? p.offer.price : p.price, p.currency), coins: `${p.coins.toLocaleString('en-US')} Coins${p.per.includes('year') ? ' / year' : ''}`, details: card.details || [] }
    }))).catch(() => {})
  }, [])
  const close = () => { setShown(false); setTimeout(onClose, 300) }
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', key)
    return () => { cancelAnimationFrame(r); document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const cont = async () => {
    if (!signedIn) { onClose(); openLogin(); return }
    setBusy(true); setNote('')
    try {
      const out = await buyCoins(sel, { name: user?.name, email: user?.email })
      refreshUser()
      nav('/payment-success', { state: out })
      return
    } catch (e) { setNote(e.message) }
    setBusy(false)
  }
  const down = (e) => { drag.current = { y: e.clientY }; e.currentTarget.setPointerCapture?.(e.pointerId) }
  const move = (e) => { if (drag.current) setDy(Math.max(0, e.clientY - drag.current.y)) }
  const up = () => { if (!drag.current) return; const far = dy > 100; drag.current = null; if (far) close(); setDy(0) }
  return (
    <div className="fixed inset-0 z-[300] md:hidden" role="dialog" aria-modal="true" aria-label="Pictrify Pro plans">
      <div onClick={close} className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div className="absolute inset-x-0 bottom-0 mx-auto flex h-dvh max-h-dvh w-full max-w-[560px] flex-col overflow-hidden border-x border-white/10 bg-[#0A0809] shadow-[0_-12px_50px_rgba(0,0,0,0.8)]"
        style={{ transform: shown ? `translateY(${dy}px)` : 'translateY(100%)', transition: drag.current ? 'none' : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
        <style>{`
          @keyframes pc-up { from { transform: translateY(0) } to { transform: translateY(-50%) } }
          @keyframes pc-down { from { transform: translateY(-50%) } to { transform: translateY(0) } }
          @media (prefers-reduced-motion: reduce) { .pc-col { animation: none !important } }
        `}</style>
        {/* animated collage: fills the upper part of the whole panel and fades into the dark background behind the plan cards */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[66%] overflow-hidden" aria-hidden="true">
          <div className="absolute -inset-x-6 -top-6 bottom-0 flex justify-center gap-3 px-3 opacity-80" style={{ transform: 'rotate(-5deg) scale(1.12)' }}>
            {reel.map((col, c) => (
              <div key={c} className="relative w-[38%] overflow-hidden">
                <div className="pc-col flex flex-col gap-3" style={{ animation: `${c === 1 ? 'pc-down' : 'pc-up'} ${28 + c * 7}s linear infinite`, marginTop: c === 1 ? -60 : 0 }}>
                  {[...col, ...col].map((src, k) => <img key={k} src={src} alt="" loading="lazy" draggable="false" className={`w-full shrink-0 rounded-2xl border border-white/10 object-cover ${k % 3 === 1 ? 'aspect-[3/4]' : 'aspect-[3/5]'}`} />)}
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0809]/10 via-[#0A0809]/35 to-[#0A0809]" />
        </div>
        <div className="relative z-10 flex min-h-[290px] flex-1 touch-none flex-col justify-end overflow-hidden px-5 pb-4 pt-3 text-center" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="absolute left-1/2 top-3 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/25" />
          <button type="button" aria-label="Close" onClick={close} onPointerDown={(e) => e.stopPropagation()} className="absolute right-4 top-3 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-white/10 text-white">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="relative z-10 mt-6 flex items-center justify-center gap-2">
            <span className="text-[28px] font-bold text-white">Pictrify</span>
            <span className="rounded-full px-3 py-0.5 text-[13px] font-bold text-white" style={{ background: 'linear-gradient(90deg, #FF88C7, #FF55AA)' }}>PRO</span>
          </div>
          <p className="relative z-10 mt-1 text-[14px] text-[#A0A0A0]">Unlock ultimate creative power</p>
          <div className="relative z-10 mt-4 grid grid-cols-3 gap-2">
            {perks.map(([label, d]) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md"><svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
                <span className="text-[12px] font-medium leading-tight text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 min-h-0 shrink space-y-2.5 overflow-y-auto overscroll-contain px-4 pb-3">
          {plans.map((p) => {
            const on = sel === p.id
            return (
              <button key={p.id} type="button" onClick={() => setSel(p.id)} aria-pressed={on}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left transition-colors ${on ? 'border-white/35 bg-white/[0.08]' : 'border-white/10 bg-black/45 backdrop-blur-md'}`}>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-[15px] font-semibold text-white">{p.name}{p.popular && <span className="rounded-full bg-[#FF55AA] px-2 py-px text-[9px] font-bold uppercase text-white">Popular</span>}</span>
                  <span className="mt-0.5 block text-[20px] font-bold leading-tight text-white">{p.price} <span className="text-[12px] font-normal text-[#A0A0A0]">{p.per}</span></span>
                  <span className="mt-0.5 block text-[12px] leading-tight text-[#A0A0A0]">Premium templates</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5">
                  <img src={brandImages.coin} alt="" width="32" height="32" className="size-8 object-contain" />
                  <span className="text-[13px] font-bold leading-tight text-white">{p.coins.replace(' Coins', '').replace(' / year', '')}<span className="block text-[11px] font-semibold text-[#FF55AA]">Coins</span></span>
                </span>
              </button>
            )
          })}
          {note && <p role="status" className="rounded-xl border border-[#FF55AA]/40 bg-[#FF55AA]/10 px-4 py-3 text-center text-sm text-white">{note}</p>}
        </div>
        <div className="relative z-10 shrink-0 px-4 pt-2 text-center" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <button type="button" disabled={busy || !sel} onClick={cont} className="flex h-14 w-full cursor-pointer items-center justify-center rounded-full text-[17px] font-bold text-white shadow-[0_8px_28px_rgba(255,85,170,0.4)] disabled:opacity-60" style={{ background: 'linear-gradient(90deg, #FF88C7 0%, #FF55AA 100%)' }}>{busy ? 'Please wait…' : 'Continue'}</button>
          <p className="mt-3 text-[11px] text-[#A0A0A0]">Auto-renewable subscription. Cancel anytime.</p>
          <Link to="/privacy-policy" onClick={onClose} className="mt-1 inline-block text-[12px] font-semibold text-white/80">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
