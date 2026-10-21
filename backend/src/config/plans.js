/**
 * Coin plans shown on the Pricing page (GET /api/plans). Prices are in INR; `coins` are added to the buyer's balance once per successful payment.
 * This file is the single source: the frontend only displays what the API returns.
 */
module.exports = [
  { id: 'weekly', name: 'Weekly', priceInr: 499, per: '/week', coins: 800, tier: 'Standard' },
  { id: 'monthly', name: 'Monthly', priceInr: 999, per: '/month', coins: 1500, tier: 'Pro' },
  { id: 'yearly', name: 'Yearly', priceInr: 4999, per: '/year', coins: 11000, tier: 'Ultra', popular: true },
]
