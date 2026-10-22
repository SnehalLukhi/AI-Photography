import { useEffect, useState } from 'react'

const CROWN = '/images/features/crown.svg'
const GOLD = 'linear-gradient(90deg, #FFD067 0%, #FFB02E 55%, #F58A1F 100%)'

const Lock = ({ className = '' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 10V8a5 5 0 0110 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1zm2 0h6V8a3 3 0 00-6 0z" /></svg>
)

/** Mobile header icon: golden crown with a small lock. Opens the "Last Man" popup. */
export function LastManButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label="Premium" className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-full border border-[#FFB02E]/45 bg-gradient-to-br from-[#3a2a12] to-[#17110a] shadow-[0_0_12px_rgba(255,176,46,0.25)] transition-transform active:scale-95">
      <img src={CROWN} alt="" className="h-[18px] w-[22px] object-contain" draggable="false" />
    </button>
  )
}

const features = [
  ['Access to exclusive templates', 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4'],
  ['Premium AI effects & tools', 'M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2zM19 3v4M17 5h4'],
  ['Ad-free experience', 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8'],
  ['Priority support', 'M4 14v-2a8 8 0 0116 0v2M4 14h3v5H5a1 1 0 01-1-1zM20 14h-3v5h2a1 1 0 001-1zM17 19c0 1.5-1.8 2-5 2'],
]

/** "Last Man" locked-feature popup: dimmed + blurred backdrop, glowing crown and lock, four perks, "Unlock Now" (opens the existing plans sheet). */
export default function LastManPopup({ onClose, onUnlock }) {
  const [shown, setShown] = useState(false)
  const close = (after) => { setShown(false); setTimeout(() => (after || onClose)(), 250) }
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', key)
    return () => { cancelAnimationFrame(r); document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="fixed inset-0 z-[310] flex items-center justify-center overflow-y-auto p-4 md:hidden" role="dialog" aria-modal="true" aria-label="Last Man">
      <div onClick={() => close()} className={`fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-300 ${shown ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`relative my-auto w-full max-w-[380px] overflow-hidden rounded-[28px] border border-[#FFB02E]/25 bg-[#0F0D0F] px-5 pb-6 pt-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_50px_rgba(255,176,46,0.12)] transition-all duration-300 ease-out ${shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-95 opacity-0'}`}>
        <button type="button" aria-label="Close" onClick={() => close()} className="absolute right-3.5 top-3.5 z-10 grid size-9 cursor-pointer place-items-center rounded-full bg-white/10 text-white">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="pointer-events-none absolute left-1/2 top-4 size-52 -translate-x-1/2 rounded-full bg-[#FFB02E]/25 blur-[60px]" aria-hidden="true" />
        <div className="relative mx-auto grid size-[132px] place-items-center">
          <img src={CROWN} alt="" className="h-[108px] w-[132px] object-contain drop-shadow-[0_0_24px_rgba(255,176,46,0.65)]" draggable="false" />
          <span className="absolute bottom-1 right-1 grid size-10 place-items-center rounded-full border-2 border-[#0F0D0F] text-[#17110a] shadow-[0_0_18px_rgba(255,176,46,0.6)]" style={{ background: GOLD }}><Lock className="size-5" /></span>
        </div>
        <h2 className="relative mt-3 text-[28px] font-bold !text-[#FFC85A]">Last Man</h2>
        <p className="relative mx-auto mt-1.5 max-w-[280px] text-[14px] leading-snug text-[#A0A0A0]">Unlock exclusive features and take your creativity to the next level.</p>
        <ul className="relative mt-5 space-y-2.5 text-left">
          {features.map(([label, d]) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FFB02E]/15 text-[#FFB02E]"><svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg></span>
              <span className="text-[14px] font-medium text-white">{label}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => close(onUnlock)} className="relative mt-6 flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-full text-[16px] font-bold text-[#1a1208] shadow-[0_8px_28px_rgba(255,176,46,0.4)] transition-transform active:scale-[0.98]" style={{ background: GOLD }}>
          <Lock className="size-4" />Unlock Now
        </button>
      </div>
    </div>
  )
}
