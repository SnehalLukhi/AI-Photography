import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'
import { categoryItems } from '../data/templates.js'
import { login, register, loginWithGoogle, loadGoogle } from '../lib/aiPhotography.js'

/**
 * Login / Sign Up (full screen, no header or footer). Calls the backend (POST /api/auth/login | register), keeps the returned token via
 * `signIn()` from StudioContext and goes to Home (/).
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const Eye = ({ off }) => (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}
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

export function Field({ id, label, error, right, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#C4B5FD]">{label}</label>
      <div className={`flex h-12 items-center rounded-xl border bg-gradient-to-br from-[#2A1B52] to-[#1A284F] transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgba(176,112,250,0.12)] ${error ? 'border-red-500/70' : 'border-[#3A3552] hover:border-[#B070FA]/60 focus-within:border-[#B070FA]/70'}`}>
        <input id={id} aria-invalid={!!error} {...props} className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-[#C4B5FD]/60" />
        {right}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Login() {
  const nav = useNavigate()
  const { signIn, signedIn } = useStudio()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const signup = mode === 'signup'
  useEffect(() => { loadGoogle() }, []) // so the Google window opens instantly on click
  const google = async () => {
    setBusy(true); setErrors({}); setNote('')
    try { signIn(await loginWithGoogle()); nav('/') } catch (err) { setErrors({ form: err.message }); setBusy(false) }
  }

  const switchMode = () => { setMode(signup ? 'login' : 'signup'); setErrors({}); setNote(''); setConfirm('') }
  const validate = () => {
    const e = {}
    if (signup && !name.trim()) e.name = 'Enter your name.'
    if (!email.trim()) e.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.'
    if (!password) e.password = 'Enter your password.'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (signup) {
      if (!confirm) e.confirm = 'Confirm your password.'
      else if (confirm !== password) e.confirm = 'Passwords do not match.'
    }
    return e
  }
  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e); setNote('')
    if (Object.keys(e).length) return
    setBusy(true)
    try {
      const session = signup ? await register({ email: email.trim(), password, name: name.trim() }) : await login({ email: email.trim(), password })
      signIn(session)
      nav('/')
    } catch (err) {
      setErrors({ form: err.message || 'Something went wrong. Please try again.' })
      setBusy(false)
    }
  }
  const clear = (k, set) => (ev) => { set(ev.target.value); if (errors[k]) setErrors({ ...errors, [k]: '' }) }

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
            <h1 className="text-[26px] font-bold tracking-tight">{signup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mb-7 mt-2 text-sm leading-relaxed text-[#C4B5FD]/75">{signup ? 'Sign up to start creating AI photos.' : 'Log in to your AI Photography account.'}</p>

            <button type="button" onClick={google} disabled={busy} className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[#3A3552] bg-[#14141f] text-[15px] font-semibold text-white transition-colors duration-200 hover:border-[#B070FA]/60 hover:bg-[#1b1b2b] disabled:cursor-wait disabled:opacity-70">
              <GoogleLogo /><span>Continue with Google</span>
            </button>
            <div className="my-5 flex items-center gap-3 text-xs text-[#C4B5FD]/75" aria-hidden="true"><span className="h-px flex-1 bg-[#3A3552]" />or<span className="h-px flex-1 bg-[#3A3552]" /></div>

            <form onSubmit={submit} noValidate className="space-y-4">
              {signup && <Field id="auth-name" label="Name" type="text" autoComplete="name" placeholder="Your name" value={name} error={errors.name} onChange={clear('name', setName)} />}
              <Field id="auth-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} error={errors.email} onChange={clear('email', setEmail)} />
              <Field id="auth-password" label="Password" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder="Enter your password" value={password} error={errors.password} onChange={clear('password', setPassword)}
                right={<button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)} className="mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-[#C4B5FD]/75 transition-colors duration-200 hover:bg-white/5 hover:text-white"><Eye off={show} /></button>} />
              {signup && (
                <Field id="auth-confirm" label="Confirm Password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirm} error={errors.confirm} onChange={clear('confirm', setConfirm)}
                  right={<button type="button" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirm} onClick={() => setShowConfirm(!showConfirm)} className="mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-[#C4B5FD]/75 transition-colors duration-200 hover:bg-white/5 hover:text-white"><Eye off={showConfirm} /></button>} />
              )}
              {!signup && (
                <div className="text-right text-sm">
                  <Link to="/forgot-password" className="cursor-pointer text-[#C4B5FD]/75 transition-colors duration-200 hover:text-white">Forgot password?</Link>
                </div>
              )}
              {errors.form && <p role="alert" className="text-sm text-red-400">{errors.form}</p>}
              {note && <p role="status" className="text-xs text-[#C4B5FD]/75">{note}</p>}
              <button type="submit" disabled={busy} className="grad-bg h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(176,112,250,0.35)] hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70">
                {busy ? 'Please wait…' : signup ? 'Sign Up' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#C4B5FD]/75">
              {signup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={switchMode} className="cursor-pointer font-semibold text-white transition-colors duration-200 hover:text-[#B070FA]">{signup ? 'Login' : 'Sign Up'}</button>
            </p>
            <p className="mt-5 border-t border-[#3A3552] pt-5 text-center text-xs leading-relaxed text-[#C4B5FD]/75">
              By continuing, you agree to our <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link> and <Link to="/terms-conditions" className="underline hover:text-white">Terms of Service</Link>.
            </p>
          </div>
          <p className="login-rise-2 mt-4 text-center text-[11px] text-[#C4B5FD]/75"></p>
        </div>
      </main>
    </div>
  )
}

export default Login
