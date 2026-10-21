/**
 * Coin plans shown on the Pricing page (GET /api/plans). `price` is in `currency`; `coins` are added to the buyer's balance once per successful payment.
 * This file is the single source of prices and coin amounts: the frontend only displays what the API returns (its card texts live in src/data/templates.js).
 */
module.exports = [
  { id: 'weekly', name: 'Weekly Premium', price: 4.99, currency: 'USD', per: '/ week', coins: 110 },
  { id: 'monthly', name: 'Monthly Premium', price: 9.99, currency: 'USD', per: '/ month', coins: 220 },
  { id: 'yearly', name: 'Yearly Premium', price: 39.99, currency: 'USD', per: '/ year', coins: 2700, popular: true },
]
