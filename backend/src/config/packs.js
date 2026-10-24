/**
 * One-time coin packs for the "Get Coins" page (GET /api/coin-packs): top up the balance without a subscription.
 * `price` is in US dollars; Visitors in other countries see the price converted to their currency (rounded up to x99 / x.99, see services/pricing.service.js); add `prices: { INR: 299 }` to pin one. How many photos a pack buys is coins / COIN_COST_PER_GENERATION (computed by the frontend).
 */
module.exports = [
  { id: 'starter', name: 'Starter', coins: 450, price: 2.99, currency: 'USD' },
  { id: 'small', name: 'Small', coins: 900, price: 4.99, currency: 'USD' },
  { id: 'popular', name: 'Popular', coins: 1950, price: 9.99, currency: 'USD', popular: true },
  { id: 'value', name: 'Value', coins: 4200, price: 19.99, currency: 'USD' },
  { id: 'mega', name: 'Mega', coins: 10800, price: 49.99, currency: 'USD' },
]
