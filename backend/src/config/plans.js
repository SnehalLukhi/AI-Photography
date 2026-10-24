/**
 * Coin plans shown on the Pricing page (GET /api/plans). `price` is in US dollars; Visitors in other countries see the price converted to their currency (rupees, euros ...) and rounded up to x99 / x.99 (see services/pricing.service.js); a Razorpay plan for each currency is found (or created once) automatically. To pin a price for a currency add `prices: { INR: 299 }` to a plan.
 * `coins` are added to the buyer's balance once per successful payment.
 * This file is the single source of prices and coin amounts: the frontend only displays what the API returns (its card texts live in src/data/templates.js).
 */
require('./env') // loads backend/.env first (the test plan below depends on it)

module.exports = [
  { id: 'weekly', name: 'Weekly Premium', period: 'weekly', price: 4.99, currency: 'USD', per: '/ week', coins: 1100 },
  { id: 'monthly', name: 'Monthly Premium', period: 'monthly', price: 9.99, currency: 'USD', per: '/ month', coins: 2200 },
  { id: 'yearly', name: 'Yearly Premium', period: 'yearly', price: 39.99, currency: 'USD', per: '/ year', coins: 27000, popular: true },
  // A rupee plan for checking that payments work (UPI, cards, net banking). It only exists while RAZORPAY_PLAN_TEST is set in .env - remove that line to hide it. Its price must match the Razorpay plan.
  ...(process.env.RAZORPAY_PLAN_TEST ? [{ id: 'test', name: 'Test Plan', price: 9.99, currency: 'INR', per: '/ month', coins: 15, test: true }] : []),
]
