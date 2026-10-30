import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudio, WELCOME_COINS } from '../context/StudioContext.jsx'
import { exploreEverything } from '../data/templates.js'
import { useTrendingPicks } from './homeParts.jsx'
import { loginWithGoogle, prepareGoogle, loginWithApple, prepareApple } from '../lib/aiPhotography.js'

/**
 * The sign-in popup ("Create Your Account"), opened from anywhere with `openLogin()` from StudioContext - there is no login page any more.
 * Left: the tilted, slowly scrolling template photos. Right: Continue with Google / Apple. The same buttons log in a returning user and create the account of a new one.
 * The backend (POST /api/auth/google | apple) checks the token and returns our own login token; `signIn()` from StudioContext keeps it and closes the popup, so the user
 * stays on the page they were on. Closes with the X, the Escape key, or a click outside.
 */
// Side-panel photos: ONLY the Trending templates (the admin's Trending list; the built-in trending picks until some are set), spread over 4 slowly scrolling columns.
// The list is repeated when it is short, so the panel is never empty or sparse; with no trending templates at all the first templates of the site are used.
const COLUMN_ANIMS = [['login-marquee-down', 90], ['login-marquee-up', 90], ['login-marquee-down', 90], ['login-marquee-up', 90]] // [animation, seconds] - alternating directions, slow and calm
const buildColumns = (images) => {
  const base = images.length ? images : exploreEverything.slice(0, 12).map((t) => t.image)
  const pool = Array.from({ length: Math.max(base.length, 8) }, (_, k) => base[k % base.length]) // at least 8, so every column has enough different photos
  const n = pool.length
  return COLUMN_ANIMS.map(([anim, secs], i) => {
    const list = Array.from({ length: n }, (_, k) => pool[(k + i * 2) % n]) // each column starts at a different photo
    return { anim, secs, list: [...list, ...list] }
  })
}
const AppleLogo = () => (
  <svg className="size-5" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
)

const GoogleLogo = () => (
  <svg className="size-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

export default function LoginModal() {
  const nav = useNavigate()
  const { signIn, closeLogin } = useStudio()
  const [error, setError] = useState('')
  const { trendingPicks } = useTrendingPicks()
  const imageKey = trendingPicks.map((t) => t.image).join('|')
  const COLUMNS = useMemo(() => buildColumns(imageKey ? imageKey.split('|').filter(Boolean) : []), [imageKey])
  const [busy, setBusy] = useState('') // '' | 'google' | 'apple': which sign-in is running (the other button is only disabled)
  useEffect(() => { prepareGoogle(); prepareApple() }, []) // loads the sign-in scripts now, so the click can open the Google / Apple window immediately
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeLogin() }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind does not scroll
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [closeLogin])

  // both buttons call their sign-in straight from the click (browsers only open the pop-up then) and share the busy / error state
  const social = (provider, login, failed) => async () => {
    setBusy(provider); setError('')
    try { signIn(await login()); nav('/') } catch (err) { setError(err.message || failed); setBusy('') } // signIn also closes this popup
  }
  const google = social('google', loginWithGoogle, 'Google sign-in failed. Please try again.')
  const apple = social('apple', loginWithApple, 'Apple sign-in failed. Please try again.')

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className="login-fade absolute inset-0 bg-[#000000]/55 backdrop-blur-sm" onClick={closeLogin} />
      <div className="login-rise relative flex max-h-[94dvh] min-h-[560px] w-full max-w-[1030px] overflow-hidden rounded-[32px] bg-[#191919] shadow-[0_30px_80px_rgba(0,0,0,0.35)] max-sm:min-h-0">
        {/* left: the template photos (desktop only) */}
        <aside className="relative m-3.5 hidden w-[48%] shrink-0 overflow-hidden rounded-3xl bg-[#000000] ring-1 ring-white/15 lg:block" aria-hidden="true">
          <div className="absolute inset-[-18%] flex origin-center items-stretch justify-center gap-3 px-3" style={{ rotate: '16deg' }} aria-hidden="true">
            {COLUMNS.map((col, ci) => (
              <div key={ci} className="relative h-full min-w-0 flex-1 overflow-hidden">
                <div className="login-col flex w-full flex-col will-change-transform" style={{ animation: `${col.anim} ${col.secs}s linear infinite` }}>
                  {col.list.map((src, k) => (
                    <div key={k} className="mb-3 aspect-[9/16] w-full shrink-0 overflow-hidden rounded-2xl bg-[#191919] ring-1 ring-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.45)]">
                      <img src={src} alt="" loading="lazy" className="size-full object-cover object-center" draggable="false" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* premium finish: soft black fades top and bottom, a small studio tag, and the headline, perks and a thin edge over the photos */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black via-black/80 to-transparent" />
          <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border-[1.5px] border-white/20 bg-[#191919]/80 px-3.5 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
            <svg className="size-3.5 text-[#FF3DF2]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" /></svg>
            AI photo studio
          </span>
          <div className="absolute inset-x-6 bottom-6">
            <p className="font-display text-[30px] font-extrabold leading-[1.08] tracking-tight text-white">Turn any photo into a masterpiece</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#B4B4B8]">Hundreds of AI looks, one tap away.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[`${WELCOME_COINS} free coins`, 'Refunded if it fails'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-white/20 bg-[#191919]/80 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md">
                  <svg className="size-3.5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>{t}
                </span>
              ))}
            </div>
          </div>
        </aside>

        {/* right: the form */}
        <div className="relative flex min-w-0 flex-1 flex-col justify-center overflow-y-auto px-5 py-12 sm:px-10">
          <button type="button" onClick={closeLogin} aria-label="Close" className="absolute right-4 top-4 grid size-10 cursor-pointer place-items-center rounded-full bg-[#1C1C1E] text-[#FFFFFF] transition-colors hover:bg-[#2C2C2F]">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          </button>
          <div className="mx-auto w-full max-w-[400px] text-left">
            <p className="badge">Sign in</p>
            <h1 id="login-title" className="mt-4 text-[34px] font-extrabold leading-[1.05] tracking-tight sm:text-[44px]">Create your account</h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[#A1A1AA]"><span className="font-plexmono text-[#FFFFFF]">{WELCOME_COINS}</span> free coins are waiting for you. Sign up and make your first photo.</p>

            <div className="mt-6 grid grid-cols-3 divide-x divide-[#3A3A3E] rounded-2xl bg-[#191919] py-4">
              {['Browse all templates', 'Create Trending Images', 'Save your creation history'].map((text) => (
                <div key={text} className="flex flex-col items-center gap-2 px-2">
                  <svg className="size-5 text-[#FF3DF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                  <p className="text-[11px] font-medium leading-tight text-[#FFFFFF]">{text}</p>
                </div>
              ))}
            </div>

            <button type="button" onClick={google} disabled={!!busy} className="mt-8 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#4A4A4F] bg-[#1C1C1E] text-[16px] font-semibold text-[#FFFFFF] transition-colors duration-200 hover:bg-[#1C1C1E] disabled:cursor-wait disabled:opacity-70">
              <GoogleLogo /><span>{busy === 'google' ? 'Please wait…' : 'Continue with Google'}</span>
            </button>
            <button type="button" onClick={apple} disabled={!!busy} className="mt-3 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-[#4A4A4F] bg-[#1C1C1E] text-[16px] font-semibold text-[#FFFFFF] transition-colors duration-200 hover:bg-[#1C1C1E] disabled:cursor-wait disabled:opacity-70">
              <AppleLogo /><span>{busy === 'apple' ? 'Please wait…' : 'Continue with Apple'}</span>
            </button>
            {error && <p role="alert" className="mt-4 text-sm text-[#C0392B]">{error}</p>}

            <p className="mt-7 text-xs leading-relaxed text-[#A1A1AA]">
              By continuing, you agree to our <Link to="/privacy-policy" className="text-[#FF3DF2] underline underline-offset-2">Privacy Policy</Link> and <Link to="/terms-conditions" className="text-[#FF3DF2] underline underline-offset-2">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
