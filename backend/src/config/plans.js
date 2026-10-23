/**
 * Coin plans shown on the Pricing page (GET /api/plans). `price` is in US dollars; `inr` is the price for visitors in India, in rupees. Its Razorpay plan is found (or created once) automatically; RAZORPAY_PLAN_*_INR is only an optional override.
 * `coins` are added to the buyer's balance once per successful payment.
 * This file is the single source of prices and coin amounts: the frontend only displays what the API returns (its card texts live in src/data/templates.js).
 */
require('./env') // loads backend/.env first (the test plan below depends on it)

module.exports = [
  { id: 'weekly', name: 'Weekly Premium', period: 'weekly', price: 4.99, inr: 399, currency: 'USD', per: '/ week', coins: 1100 },
  { id: 'monthly', name: 'Monthly Premium', period: 'monthly', price: 9.99, inr: 799, currency: 'USD', per: '/ month', coins: 2200 },
  { id: 'yearly', name: 'Yearly Premium', period: 'yearly', price: 39.99, inr: 3999, currency: 'USD', per: '/ year', coins: 27000, popular: true },
  // A rupee plan for checking that payments work (UPI, cards, net banking). It only exists while RAZORPAY_PLAN_TEST is set in .env - remove that line to hide it. Its price must match the Razorpay plan.
  ...(process.env.RAZORPAY_PLAN_TEST ? [{ id: 'test', name: 'Test Plan', price: 9.99, currency: 'INR', per: '/ month', coins: 15, test: true }] : []),
]
