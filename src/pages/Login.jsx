import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { brandImages } from '../data/images.js'
import { useStudio } from '../context/StudioContext.jsx'
import { categoryItems } from '../data/templates.js'

/**
 * Minimal Login / Sign Up (full screen, no header or footer). Frontend demo only: a valid form calls the existing
 * `signIn()` flag from StudioContext and goes to /creations - no real authentication yet.
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

const Eye = ({ off }) => (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M4 4l16 16" />}
  </svg>
)

function Field({ id, label, error, right, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-[#b8b4c7]">{label}</label>
      <div className={`flex h-12 items-center rounded-xl border bg-[#14121d] transition-all duration-200 focus-within:shadow-[0_0_0_3px_rgb(139,92,246,0.12)] ${error ? 'border-red-500/70' : 'border-[#292536] hover:border-[#8b5cf6]/60 focus-within:border-[#8b5cf6]/70'}`}>
        <input id={id} aria-invalid={!!error} {...props} className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] text-white outline-none placeholder:text-[#858094]" />
        {right}
      </div>
      {error && <p role="alert" className="mt-1.5 text-xs text-red-400">{error}</p>}
    </div>
  )
}

export function Login() {
  const nav = useNavigate()
  const { signIn } = useStudio()
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
  const timer = useRef()
  useEffect(() => () => clearTimeout(timer.current), [])
  const signup = mode === 'signup'

  const switchMode = () => { setMode(signup ? 'login' : 'signup'); setErrors({}); setNote(''); setConfirm('') }
  const validate = () => {
    const e = {}
    if (signup && !name.trim()) e.name = 'Enter your name.'
    if (!email.trim()) e.email = 'Enter your email address.'
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Enter a valid email address.'
    if (!password) e.password = 'Enter your password.'
    else if (password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (signup) {
      if (!confirm) e.confirm = 'Confirm your password.'
      else if (confirm !== password) e.confirm = 'Passwords do not match.'
    }
    return e
  }
  const submit = (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e); setNote('')
    if (Object.keys(e).length) return
    setBusy(true)
    timer.current = setTimeout(() => { signIn(); nav('/creations') }, 600) // demo: no real authentication
  }
  const clear = (k, set) => (ev) => { set(ev.target.value); if (errors[k]) setErrors({ ...errors, [k]: '' }) }

  return (
    <div className="login-fade fixed inset-0 z-[200] flex overflow-y-auto bg-[#0b0a12] text-white lg:flex-row-reverse">
      {/* photo panel (desktop only): static, muted, no effects */}
      <aside className="relative hidden w-[58%] shrink-0 overflow-hidden lg:block">
        {/* tilted block of scrolling photo columns (16 degrees, bleeds past the panel edges) */}
        <div className="absolute inset-[-18%] flex origin-center items-stretch justify-center gap-3 px-3" style={{ rotate: '16deg' }} aria-hidden="true">
          {COLUMNS.map((col, ci) => (
            <div key={ci} className="relative h-full min-w-0 flex-1 overflow-hidden">
              <div className="login-col flex w-full flex-col will-change-transform" style={{ animation: `${col.anim} ${col.secs}s linear infinite` }}>
                {col.list.map((src, k) => (
                  <div key={k} className="mb-3 aspect-[9/16] w-full shrink-0 overflow-hidden rounded-xl border border-[#292536] bg-[#0b0a12]">
                    <img src={src} alt="" loading="lazy" className="size-full object-cover object-center" draggable="false" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {/* fade / blur-out toward the inner (form-facing) edge, as in the reference - confined to this panel */}
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-[#0b0a12]/35 to-[#0b0a12]" />
        <div className="pointer-events-none absolute inset-0 backdrop-blur-[5px] [mask-image:linear-gradient(to_left,transparent_35%,black_100%)] [-webkit-mask-image:linear-gradient(to_left,transparent_35%,black_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0a12]/90 via-transparent to-black/25" />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col px-5 sm:px-8">
        <header className="flex items-center justify-between py-6 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5"><img src={brandImages.logo} alt="" className="size-8 rounded-xl" /><span className="text-lg font-semibold tracking-tight">Pixora</span></Link>
          <Link to="/" className="text-sm text-[#858094] transition-colors duration-200 hover:text-white lg:hidden">Home</Link>
        </header>

        <div className="m-auto w-full max-w-[440px] py-8">
          <div className="login-rise rounded-xl border border-[#292536] bg-[#14121d] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] sm:p-8">
            <h1 className="text-[26px] font-bold tracking-tight">{signup ? 'Create your account' : 'Welcome back'}</h1>
            <p className="mb-7 mt-2 text-sm leading-relaxed text-[#858094]">{signup ? 'Sign up to start creating AI photos.' : 'Log in to your AI Photography account.'}</p>

            <form onSubmit={submit} noValidate className="space-y-4">
              {signup && <Field id="auth-name" label="Name" type="text" autoComplete="name" placeholder="Your name" value={name} error={errors.name} onChange={clear('name', setName)} />}
              <Field id="auth-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} error={errors.email} onChange={clear('email', setEmail)} />
              <Field id="auth-password" label="Password" type={show ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder="Enter your password" value={password} error={errors.password} onChange={clear('password', setPassword)}
                right={<button type="button" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow(!show)} className="mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-[#858094] transition-colors duration-200 hover:bg-white/5 hover:text-white"><Eye off={show} /></button>} />
              {signup && (
                <Field id="auth-confirm" label="Confirm Password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter your password" value={confirm} error={errors.confirm} onChange={clear('confirm', setConfirm)}
                  right={<button type="button" aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={showConfirm} onClick={() => setShowConfirm(!showConfirm)} className="mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-[#858094] transition-colors duration-200 hover:bg-white/5 hover:text-white"><Eye off={showConfirm} /></button>} />
              )}
              {!signup && (
                <div className="text-right text-sm">
                  <button type="button" onClick={() => setNote('Password reset is not connected yet (demo).')} className="cursor-pointer text-[#858094] transition-colors duration-200 hover:text-white">Forgot password?</button>
                </div>
              )}
              {note && <p role="status" className="text-xs text-[#858094]">{note}</p>}
              <button type="submit" disabled={busy} className="grad-bg h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold text-[#0b0a12] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgb(139,92,246,0.35)] hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70">
                {busy ? 'Please wait…' : signup ? 'Sign Up' : 'Login'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#858094]">
              {signup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={switchMode} className="cursor-pointer font-semibold text-white transition-colors duration-200 hover:text-[#8b5cf6]">{signup ? 'Login' : 'Sign Up'}</button>
            </p>
            <p className="mt-5 border-t border-[#292536] pt-5 text-center text-xs leading-relaxed text-[#858094]">
              By continuing, you agree to our <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link> and <Link to="/terms-conditions" className="underline hover:text-white">Terms of Service</Link>.
            </p>
          </div>
          <p className="login-rise-2 mt-4 text-center text-[11px] text-[#858094]"></p>
        </div>
      </main>
    </div>
  )
}

export default Login
