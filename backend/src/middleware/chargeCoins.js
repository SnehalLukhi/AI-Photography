const env = require('../config/env')
const wallet = require('../services/wallet.service')

/**
 * For the generate endpoints: takes the coins for one generation before any work is done (so concurrent requests cannot overspend; 402 if the
 * balance is too low) and gives them back when the request fails (AILabTools does not bill failed requests). A 202 (still processing) stays charged.
 */
module.exports = function chargeCoins(req, res, next) {
  const cost = env.coins.perGeneration
  wallet.charge(req.user.id, cost)
  res.on('finish', () => { if (res.statusCode >= 400) wallet.credit(req.user.id, cost, 'refund') })
  next()
}
