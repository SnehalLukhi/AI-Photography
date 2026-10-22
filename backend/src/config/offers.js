/**
 * Special offers shown by the "Wait! Create More for Less" popup (GET /api/plans -> `offer`). An offer is bought like a plan (POST /api/wallet/checkout with its id)
 * but is NOT listed on the Pricing page. `original` is the regular price it is discounted from; `price` is what is charged.
 */
module.exports = [
  { id: 'yearly-offer', name: 'Yearly Premium', price: 19.99, original: 39.99, discountPercent: 50, currency: 'USD', per: '/ year', coins: 2700 },
]
