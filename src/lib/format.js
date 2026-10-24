/** A price in the visitor's currency: $9.99, €9.99, £7.99, rupees as ₹799 (Indian digit grouping, no .00 on whole rupees). `amount` is in the currency's main unit. */
export const formatPrice = (amount, currency = 'USD') => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : currency === 'EUR' ? 'en-IE' : currency === 'GBP' ? 'en-GB' : 'en-US', { style: 'currency', currency, currencyDisplay: 'symbol', minimumFractionDigits: currency === 'INR' && Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount)

/** `amount` is in cents / paise (as the backend stores it). */
export const formatMoney = (amount, currency = 'USD') => formatPrice(amount / 100, currency)

export const formatDate = (iso, withTime = false) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
