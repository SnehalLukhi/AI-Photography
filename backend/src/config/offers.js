/**
 * Offers: a percentage off one plan or coin pack. The server works out the discounted price and charges THAT in Razorpay (the browser never sets a price).
 * To post a new offer, add an entry here and redeploy:
 *
 *   id           unique name; buying "by offer id" is also allowed (the popup does this)
 *   itemId       the plan or coin pack it discounts: weekly | monthly | yearly | starter | small | popular | value | mega
 *   percentOff   10 = 10% off the list price (see config/plans.js and config/packs.js); the charged price is rounded DOWN to the cent
 *   audience     'all' (everyone) | 'new' (only users whose account is younger than windowHours)
 *   windowHours  for audience 'new': how long after signing up the offer lasts (default 24)
 *   startsAt     optional ISO date-time: the offer is not valid before it
 *   endsAt       optional ISO date-time: the offer is not valid after it
 *   popup        true = this is the offer shown by the "Wait! Create More for Less" popup (the first matching entry is used)
 *
 * If several offers match the same item, the biggest percentOff wins (they are never added together).
 * Examples:
 *   { id: 'monthly-20', itemId: 'monthly', percentOff: 20, audience: 'all', endsAt: '2026-12-31T23:59:59Z' },
 *   { id: 'popular-15', itemId: 'popular', percentOff: 15, audience: 'all' },
 */
module.exports = [
  { id: 'yearly-offer', itemId: 'yearly', percentOff: 50, audience: 'new', windowHours: 24, popup: true }, // the first-login popup: 50% off Yearly for 24 hours after signing up
]
