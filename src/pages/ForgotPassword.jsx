import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { Field } from './Login.jsx'
import { forgotPassword } from '../lib/aiPhotography.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const submitClass = 'grad-bg h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(176,112,250,0.35)] hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70'

/** Step 1 of a password reset: ask for the account's e-mail; the backend e-mails a reset link. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('') // set once the request went through

  const submit = async (ev) => {
    ev.preventDefault()
    const value = email.trim()
    if (!value) { setError('Enter your email address.'); return }
    if (!EMAIL_RE.test(value)) { setError('Enter a valid email address.'); return }
    setError(''); setBusy(true)
    try { await forgotPassword(value); setSentTo(value) } catch (e) { setError(e.message || 'Something went wrong. Please try again.') }
    setBusy(false)
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your email">
        <div className="mx-auto mb-5 mt-5 grid size-16 place-items-center rounded-full border border-[#B070FA]/30 bg-[#B070FA]/10">
          <svg className="size-8 text-[#C4B5FD]" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p role="status" className="text-center text-sm leading-relaxed text-[#C4B5FD]">If an account exists for <strong className="break-all text-white">{sentTo}</strong>, we have sent a link to reset the password. It works for a short time only, so please use it soon.</p>
        <p className="mt-3 text-center text-xs text-[#C4B5FD]/75">Nothing arrived? Check your spam folder, or try again in a minute.</p>
        <Link to="/login" className="grad-bg mt-6 flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110">Back to login</Link>
        <button type="button" onClick={() => setSentTo('')} className="mx-auto mt-4 block cursor-pointer text-sm text-[#C4B5FD]/75 transition-colors duration-200 hover:text-white">Use a different email</button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email of your account and we will send you a link to choose a new password.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="forgot-email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" value={email} error={error}
          onChange={(e) => { setEmail(e.target.value); if (error) setError('') }} />
        <button type="submit" disabled={busy} className={submitClass}>{busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-[#C4B5FD]/75">Remembered it? <Link to="/login" className="font-semibold text-white transition-colors duration-200 hover:text-[#B070FA]">Login</Link></p>
    </AuthShell>
  )
}
