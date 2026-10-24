import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons.jsx'

/** The shared building blocks every page uses, so all apps look and behave the same. */

export const cx = (...c) => c.filter(Boolean).join(' ')

export function Spinner({ className = 'size-5' }) {
  return <svg className={cx('animate-spin', className)} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
}

export const Skeleton = ({ className = 'h-4 w-24' }) => <span className={cx('block rounded-md bg-gradient-to-r from-white/[0.05] via-white/[0.12] to-white/[0.05] bg-[length:200%_100%] animate-shimmer', className)} />

const TONES = {
  green: 'bg-emerald-500/12 text-emerald-300 ring-emerald-400/25',
  amber: 'bg-amber-500/12 text-amber-300 ring-amber-400/25',
  red: 'bg-red-500/12 text-red-300 ring-red-400/25',
  violet: 'bg-brand/15 text-violet-200 ring-brand/30',
  pink: 'bg-pink/12 text-pink-200 ring-pink/30',
  blue: 'bg-sky-500/12 text-sky-300 ring-sky-400/25',
  gray: 'bg-white/[0.06] text-white/60 ring-white/10',
}
export const Badge = ({ tone = 'gray', children, className = '' }) => <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset', TONES[tone], className)}>{children}</span>

export function Avatar({ name = '', email = '', size = 36 }) {
  const label = (name || email || '?').trim()[0]?.toUpperCase() || '?'
  const hue = [...(email || name)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 0)
  return <span className="grid shrink-0 place-items-center rounded-full font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.4, background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 45%))` }}>{label}</span>
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx('relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition disabled:opacity-50', checked ? 'bg-gradient-to-r from-brand to-pink' : 'bg-white/15')}>
      <span className={cx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
    </button>
  )
}

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1 block text-xs text-red-300">{error}</span> : hint ? <span className="mt-1 block text-xs text-white/35">{hint}</span> : null}
    </label>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…', className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const on = (e) => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName)) { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on)
  }, [])
  return (
    <div className={cx('relative', className)}>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
      <input ref={ref} className="input pl-9 pr-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {value ? <button type="button" aria-label="Clear" onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-white/40 hover:text-white"><Icon name="x" className="size-4" /></button>
        : <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line px-1.5 text-[10px] text-white/30">/</kbd>}
    </div>
  )
}

/** Debounced copy of a value (for search boxes that call the server). */
export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-ink/50 p-1">
      {tabs.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} className={cx('cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition', value === t.id ? 'bg-white/[0.12] text-white shadow-inner' : 'text-white/50 hover:text-white')}>
          {t.label}{t.count != null && <span className="ml-1.5 text-xs text-white/40">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 animate-rise">
      <div><h1 className="text-[26px] font-bold text-white sm:text-[30px]">{title}</h1>{subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function Empty({ icon = 'grid', title, text, children }) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-white/[0.05] text-white/40"><Icon name={icon} className="size-7" /></span>
      <p className="font-display text-lg font-semibold text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-white/45">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      <span>{error}</span>{onRetry && <button type="button" onClick={onRetry} className="cursor-pointer font-semibold underline">Try again</button>}
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-white/50">
      <span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString()}</span>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-ghost !px-3 !py-1.5" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</button>
        <span className="tabular-nums">{page} / {pages}</span>
        <button type="button" className="btn-ghost !px-3 !py-1.5" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
      </div>
    </div>
  )
}

/** A centered dialog (or a side sheet with `side`). Closes on Escape and on a click outside. */
export function Modal({ open, onClose, title, subtitle, children, footer, wide, side }) {
  useEffect(() => {
    if (!open) return
    const on = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', on); document.body.style.overflow = prev }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className={cx('fixed inset-0 z-[100] flex bg-black/70 backdrop-blur-sm animate-pop', side ? 'justify-end' : 'items-center justify-center p-4')} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-full flex-col border border-line bg-panel shadow-2xl', side ? 'h-full w-full max-w-xl animate-slide rounded-l-3xl' : cx('w-full rounded-3xl animate-pop', wide ? 'max-w-3xl' : 'max-w-lg'))}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div><h2 className="text-xl font-bold text-white">{title}</h2>{subtitle && <p className="mt-0.5 text-sm text-white/45">{subtitle}</p>}</div>
          <button type="button" aria-label="Close" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-white/45 hover:bg-white/10 hover:text-white"><Icon name="x" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

/** "Are you sure?" for deletes. `busy` shows a spinner on the confirm button. */
export function Confirm({ open, title, text, confirmLabel = 'Delete', busy, onConfirm, onClose, children }) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title}
      footer={<><button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>Cancel</button><button type="button" className="btn-danger" onClick={onConfirm} disabled={busy}>{busy && <Spinner className="size-4" />}{confirmLabel}</button></>}>
      <p className="text-sm leading-relaxed text-white/65">{text}</p>
      {children}
    </Modal>
  )
}

export function Toasts({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={cx('pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur animate-slide', t.kind === 'error' ? 'border-red-500/30 bg-red-950/80 text-red-100' : 'border-emerald-400/25 bg-emerald-950/80 text-emerald-100')}>
          <Icon name={t.kind === 'error' ? 'x' : 'check'} className="mt-0.5 size-4 shrink-0" />
          <span className="flex-1">{t.message}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(t.id)} className="cursor-pointer opacity-60 hover:opacity-100"><Icon name="x" className="size-4" /></button>
        </div>
      ))}
    </div>
  )
}

/** Count-up number (re-runs when `value` changes). */
export function Count({ value, format = (n) => Math.round(n).toLocaleString() }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const from = 0, to = Number(value) || 0, t0 = performance.now(), dur = 700
    let raf
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); setN(from + (to - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{format(n)}</>
}

export function Stat({ label, value, format, hint, icon = 'grid', tone = 'violet', loading }) {
  const tones = { violet: 'from-brand/25 text-violet-200', pink: 'from-pink/25 text-pink-200', green: 'from-emerald-500/25 text-emerald-200', amber: 'from-amber-500/25 text-amber-200', blue: 'from-sky-500/25 text-sky-200' }
  return (
    <div className="card group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-white/15 animate-rise">
      <div className={cx('pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-xl transition group-hover:opacity-100', tones[tone])} />
      <div className="relative flex items-start justify-between">
        <p className="text-sm text-white/50">{label}</p>
        <span className={cx('grid size-9 place-items-center rounded-xl bg-gradient-to-br to-white/5', tones[tone])}><Icon name={icon} className="size-[18px]" /></span>
      </div>
      <p className="relative mt-3 font-display text-[32px] font-bold leading-none text-white">{loading ? <Skeleton className="h-8 w-24" /> : <Count value={value} format={format} />}</p>
      {hint && <p className="relative mt-2 text-xs text-white/40">{loading ? <Skeleton className="h-3 w-32" /> : hint}</p>}
    </div>
  )
}
