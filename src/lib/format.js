/** `amount` is in cents (as the backend stores it). */
export const formatMoney = (amount, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100)

export const formatDate = (iso, withTime = false) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}) })
