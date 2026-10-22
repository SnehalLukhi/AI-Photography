import { useCallback, useEffect, useRef, useState } from 'react'
import { brandImages } from '../data/images.js'
import { WELCOME_COINS } from '../context/StudioContext.jsx'
import Confetti from './Confetti.jsx'

/**
 * One-time welcome popup shown after a first sign-in (see StudioContext `welcomeOffer`). DISPLAY ONLY: the app has no user accounts or coin-balance
 * backend yet, so "50 Free Coins" is a message - nothing is credited and no balance exists or changes here.
 */
export default function WelcomePopup({ onClose: finish }) {
  const [closing, setClosing] = useState(false)
  const timer = useRef()
  // play the short exit animation, then really close (no animation / no delay when the user prefers reduced motion)
  const onClose = useCallback(() => {
    if (timer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return }
    setClosing(true)
    timer.current = setTimeout(finish, 200)
  }, [finish])
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className={`welcome-backdrop ${closing ? 'welcome-closing' : ''} fixed inset-0 z-[300] flex items-center justify-center bg-[#0B071B]/70 p-4`} onClick={onClose}>
      <Confetti />
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}
        className="welcome-card relative w-full max-w-[380px] overflow-hidden rounded-[28px] border border-white/10 bg-[#14141B] px-7 pb-8 pt-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-white/[0.08] text-lg leading-none text-[#C9C9D4] transition hover:bg-white/15 hover:text-white">×</button>
        <div className="welcome-coin relative mx-auto grid size-[72px] place-items-center rounded-full border border-white/10 bg-[#1E1E27]">
          <img src={brandImages.coin} alt="" width="48" height="48" className="size-12 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
        </div>
        <h2 id="welcome-title" className="welcome-rise welcome-rise-1 relative mt-5 text-[22px] font-bold leading-tight text-white">Welcome to Pictrify! 🎉</h2>
        <div className="welcome-rise welcome-rise-2 relative mt-5 rounded-2xl border border-white/10 bg-[#1C1C25] px-4 py-4">
          <p className="text-[28px] font-extrabold leading-none text-[#FBBF24]">{WELCOME_COINS} Free Coins</p>
          <p className="mt-2 text-xs text-[#9A9AA8]">Credited to your balance</p>
        </div>
        <p className="welcome-rise welcome-rise-3 relative mt-5 text-sm leading-relaxed text-[#D4D4DC]">Your starter coins are ready! Dive in and create stunning AI photos now.</p>
      </div>
    </div>
  )
}
