/** Money from the smallest unit (cents / paise): 999 USD -> "$9.99", 79900 INR -> "₹799". */
export const money = (minor, currency = 'USD') => {
  const n = (Number(minor) || 0) / 100
  try { return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 }).format(n) } catch { return `${n} ${currency}` }
}

export const date = (v) => (v ? new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—')

/** "3 days ago" / "in 2 days". */
export function relative(v) {
  if (!v) return '—'
  const s = (new Date(v).getTime() - Date.now()) / 1000
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [u, sec] of units) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), u)
  return 'just now'
}

export const slug = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
