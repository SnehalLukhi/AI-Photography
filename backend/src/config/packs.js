/**
 * One-time coin packs for the "Get Coins" page (GET /api/coin-packs): top up the balance without a subscription.
 * `price` is in US dollars. How many photos a pack buys is coins / COIN_COST_PER_GENERATION (computed by the frontend).
 */
module.exports = [
  { id: 'starter', name: 'Starter', coins: 45, price: 2.99, currency: 'USD' },
  { id: 'small', name: 'Small', coins: 90, price: 4.99, currency: 'USD' },
  { id: 'popular', name: 'Popular', coins: 195, price: 9.99, currency: 'USD', popular: true },
  { id: 'value', name: 'Value', coins: 420, price: 19.99, currency: 'USD' },
  { id: 'mega', name: 'Mega', coins: 1080, price: 49.99, currency: 'USD' },
]
