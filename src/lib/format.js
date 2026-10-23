/** A price in the visitor's currency: dollars as $9.99, rupees as ₹799 (Indian digit grouping, no .00 on whole rupees). `amount` is in dollars / rupees. */
export const formatPrice = (amount, currency = 'USD') => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, minimumFractionDigits: currency === 'INR' && Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount)

/** `amount` is in cents / paise (as the backend stores it). */
export const formatMoney = (amount, currency = 'USD') => formatPrice(amount / 100, currency)

export const formatDate = (iso, withTime = false) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
