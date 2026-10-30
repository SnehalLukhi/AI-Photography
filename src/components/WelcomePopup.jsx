import { useCallback, useEffect, useRef, useState } from 'react'
import { brandImages } from '../data/images.js'
import { WELCOME_COINS } from '../context/StudioContext.jsx'
import Confetti from './Confetti.jsx'

/**
 * One-time welcome popup shown after a first sign-in (see StudioContext `welcomeOffer`). DISPLAY ONLY: the app has no user accounts or coin-balance
 * backend yet, so "100 Free Coins" is a message - nothing is credited and no balance exists or changes here.
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
    <div className={`welcome-backdrop ${closing ? 'welcome-closing' : ''} fixed inset-0 z-[300] flex items-center justify-center bg-[#000000]/45 p-4`} onClick={onClose}>
      <Confetti />
      <div role="dialog" aria-modal="true" aria-labelledby="welcome-title" onClick={(e) => e.stopPropagation()}
        className="welcome-card relative w-full max-w-[400px] overflow-hidden rounded-[32px] bg-[#191919] px-7 pb-8 pt-9 text-center shadow-[0_18px_40px_rgba(0,0,0,0.14)]">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid size-8 cursor-pointer place-items-center rounded-full bg-[#1C1C1E] text-lg leading-none text-[#A1A1AA] transition hover:bg-[#2C2C2F] hover:text-[#FFFFFF]">×</button>
        <div className="welcome-coin relative mx-auto grid size-[72px] place-items-center rounded-full bg-[#262310]">
          <img src={brandImages.coin} alt="" width="48" height="48" className="size-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)]" />
        </div>
        <h2 id="welcome-title" className="welcome-rise welcome-rise-1 relative mt-5 font-display text-[34px] font-extrabold leading-none tracking-tight text-[#FFFFFF]">Welcome to Pictrify</h2>
        <div className="welcome-rise welcome-rise-2 relative mt-5 rounded-[24px] bg-[#191919] px-4 py-4">
          <p className="grad-text font-display text-[30px] font-extrabold leading-none">{WELCOME_COINS} free coins</p>
          <p className="mt-2 text-xs text-[#A1A1AA]">Credited to your balance</p>
        </div>
        <p className="welcome-rise welcome-rise-3 relative mt-5 text-[14px] leading-relaxed text-[#A1A1AA]">Your starter coins are ready! Dive in and create stunning AI photos now.</p>
      </div>
    </div>
  )
}
