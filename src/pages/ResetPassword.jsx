import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from '../components/AuthShell.jsx'
import { Field, Eye } from './Login.jsx'
import { resetPassword } from '../lib/aiPhotography.js'

const submitClass = 'grad-bg h-12 w-full cursor-pointer rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(176,112,250,0.35)] hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70'
const eyeButton = (shown, toggle, label) => (
  <button type="button" aria-label={shown ? `Hide ${label}` : `Show ${label}`} aria-pressed={shown} onClick={toggle} className="mr-2 grid size-9 cursor-pointer place-items-center rounded-xl text-[#C4B5FD]/75 transition-colors duration-200 hover:bg-white/5 hover:text-white"><Eye off={shown} /></button>
)

/** Step 2 of a password reset: the page the e-mailed link opens (/reset-password?token=...). */
export default function ResetPassword() {
  const nav = useNavigate()
  const token = useSearchParams()[0].get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const clear = (k, set) => (ev) => { set(ev.target.value); if (errors[k]) setErrors({ ...errors, [k]: '' }) }

  const submit = async (ev) => {
    ev.preventDefault()
    const e = {}
    if (!password) e.password = 'Enter a new password.'
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (!confirm) e.confirm = 'Confirm your new password.'
    else if (confirm !== password) e.confirm = 'Passwords do not match.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    try { await resetPassword(token, password); setDone(true) } catch (err) { setErrors({ form: err.message || 'Something went wrong. Please try again.' }) }
    setBusy(false)
  }

  if (!token) {
    return (
      <AuthShell title="Reset link not valid" subtitle="This page needs the link from your reset email. Open the link again from the email, or request a new one.">
        <Link to="/forgot-password" className="grad-bg flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110">Request a new link</Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="mx-auto mb-5 mt-5 grid size-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
          <svg className="size-8 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <p role="status" className="text-center text-sm leading-relaxed text-[#C4B5FD]">Your password has been changed. You can now log in with your new password.</p>
        <button type="button" onClick={() => nav('/login', { replace: true })} className={`${submitClass} mt-6`}>Go to login</button>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Choose a new password" subtitle="Enter a new password for your account (at least 8 characters).">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="reset-password" label="New password" type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter a new password" value={password} error={errors.password}
          onChange={clear('password', setPassword)} right={eyeButton(show, () => setShow(!show), 'password')} />
        <Field id="reset-confirm" label="Confirm new password" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="Re-enter the new password" value={confirm} error={errors.confirm}
          onChange={clear('confirm', setConfirm)} right={eyeButton(showConfirm, () => setShowConfirm(!showConfirm), 'confirm password')} />
        {errors.form && (
          <p role="alert" className="text-sm text-red-400">{errors.form} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></p>
        )}
        <button type="submit" disabled={busy} className={submitClass}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthShell>
  )
}
