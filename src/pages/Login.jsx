import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'
import { categoryItems } from '../data/templates.js'
import { loginWithGoogle, prepareGoogle, loginWithApple, prepareApple } from '../lib/aiPhotography.js'

/**
 * Login (full screen, no header or footer). The only way in is "Continue with Google": the same button logs in a returning user and creates the account of a new one.
 * The backend (POST /api/auth/google) checks the Google token and returns our own login token, which `signIn()` from StudioContext keeps, then goes to Home (/).
 */
// Side-panel photos: Cartoon, LinkedIn Headshot, Beard, Old Money and 80's & 90's templates in a repeating sequence (one from each, then the next one from each, ...), spread over 4 columns.
const PANEL_SOURCES = ['cartoon', 'linkedin-headshot', 'beard', 'old-money', '80s-and-90s'].map((id) => categoryItems(id))
const PER_CATEGORY = Math.min(5, ...PANEL_SOURCES.map((l) => l.length))
const PANEL_IMAGES = Array.from({ length: PER_CATEGORY }, (_, k) => PANEL_SOURCES.map((l) => l[k].image)).flat()
const COLUMNS = [ // [animation, seconds] - alternating directions, like the reference
  ['login-marquee-down', 90], ['login-marquee-up', 90], ['login-marquee-down', 90], ['login-marquee-up', 90], // slow, calm pace (about the reference's real speed)
].map(([anim, secs], i) => {
  const n = PANEL_IMAGES.length
  const list = Array.from({ length: n }, (_, k) => PANEL_IMAGES[(k + i * 2) % n]) // each column starts at a different photo
  return { anim, secs, list: [...list, ...list] }
})
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

export function Login() {
  const nav = useNavigate()
  const { signIn, signedIn } = useStudio()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { prepareGoogle(); prepareApple() }, []) // loads the sign-in scripts now, so the click can open the Google / Apple window immediately

  // both buttons call their sign-in straight from the click (browsers only open the pop-up then) and share the busy / error state
  const social = (login, failed) => async () => {
    setBusy(true); setError('')
    try { signIn(await login()); nav('/') } catch (err) { setError(err.message || failed); setBusy(false) }
  }
  const google = social(loginWithGoogle, 'Google sign-in failed. Please try again.')
  const apple = social(loginWithApple, 'Apple sign-in failed. Please try again.')

  if (signedIn) return <Navigate to="/" replace /> // signed in (a fresh login or a restored session): always land on Home, never the previous page or Profile

  return (
    <div className="login-fade fixed inset-0 z-[200] flex overflow-y-auto bg-[#0F0433] text-white lg:flex-row-reverse">
      {/* photo panel (desktop only): static, muted, no effects */}
      <aside className="relative hidden w-[58%] shrink-0 overflow-hidden lg:block">
        {/* tilted block of scrolling photo columns (16 degrees, bleeds past the panel edges) */}
        <div className="absolute inset-[-18%] flex origin-center items-stretch justify-center gap-3 px-3" style={{ rotate: '16deg' }} aria-hidden="true">
          {COLUMNS.map((col, ci) => (
            <div key={ci} className="relative h-full min-w-0 flex-1 overflow-hidden">
              <div className="login-col flex w-full flex-col will-change-transform" style={{ animation: `${col.anim} ${col.secs}s linear infinite` }}>
                {col.list.map((src, k) => (
                  <div key={k} className="mb-3 aspect-[9/16] w-full shrink-0 overflow-hidden rounded-xl border border-[#3A3552] bg-[#0F0433]">
                    <img src={src} alt="" loading="lazy" className="size-full object-cover object-center" draggable="false" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* fade / blur-out toward the inner (form-facing) edge, as in the reference - confined to this panel */}
        <div className="absolute inset-0 bg-[#0F0433]/15" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0F0433]/35 to-[#0F0433]" />
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[5px] [mask-image:linear-gradient(to_left,transparent_35%,black_100%)] [-webkit-mask-image:linear-gradient(to_left,transparent_35%,black_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0433]/90 via-transparent to-[#0F0433]/25" />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5"><img src={brandImages.logo} alt="" className="size-8 rounded-xl" /><span className="text-lg font-semibold tracking-tight">Pictrify</span></Link>
          <Link to="/" className="text-sm text-[#C4B5FD]/75 transition-colors duration-200 hover:text-white lg:hidden">Home</Link>
        </header>

        <div className="m-auto w-full max-w-[440px] py-8">
          <div className="login-rise rounded-xl border border-[#3A3552] bg-gradient-to-br from-[#2A1B52] to-[#1A284F] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <h1 className="text-[26px] font-bold tracking-tight">Welcome to Pixora</h1>
            <p className="mb-7 mt-2 text-sm leading-relaxed text-[#C4B5FD]/75">Log in or create your account with Google or Apple to start creating AI photos.</p>

            <button type="button" onClick={google} disabled={busy} className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#3A3552] bg-[#14141f] text-[15px] font-semibold text-white transition-colors duration-200 hover:border-[#B070FA]/60 hover:bg-[#1b1b2b] disabled:cursor-wait disabled:opacity-70">
              <GoogleLogo /><span>{busy ? 'Please wait…' : 'Continue with Google'}</span>
            </button>
            <button type="button" onClick={apple} disabled={busy} className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#3A3552] bg-[#14141f] text-[15px] font-semibold text-white transition-colors duration-200 hover:border-[#B070FA]/60 hover:bg-[#1b1b2b] disabled:cursor-wait disabled:opacity-70">
              <AppleLogo /><span>{busy ? 'Please wait…' : 'Continue with Apple'}</span>
            </button>
            {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

            <p className="mt-6 border-t border-[#3A3552] pt-5 text-center text-xs leading-relaxed text-[#C4B5FD]/75">
              By continuing, you agree to our <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link> and <Link to="/terms-conditions" className="underline hover:text-white">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Login
