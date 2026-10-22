const offers = require('../config/offers')
const plans = require('../config/plans')
const packs = require('../config/packs')

/** Offers (config/offers.js): who gets which discount, and what the discounted price is. All prices here are US dollars; "cents" are integers. */
const itemOf = (id) => [...plans, ...packs].find((i) => i.id === id)
const HOUR = 3600 * 1000

/** Is this offer valid right now for this user (user may be undefined = not logged in)? */
function isActive(offer, user, now = Date.now()) {
  if (!itemOf(offer.itemId)) return false
  if (offer.startsAt && now < Date.parse(offer.startsAt)) return false
  if (offer.endsAt && now > Date.parse(offer.endsAt)) return false
  if (offer.audience === 'new') return !!user && now < user.createdAt + (offer.windowHours || 24) * HOUR
  return true
}

/** When the offer ends for this user (ms since epoch), or null when it has no end. */
function endsAtOf(offer, user) {
  const ends = []
  if (offer.endsAt) ends.push(Date.parse(offer.endsAt))
  if (offer.audience === 'new' && user) ends.push(user.createdAt + (offer.windowHours || 24) * HOUR)
  return ends.length ? Math.min(...ends) : null
}

/** The discounted price in cents: percentOff of the list price, rounded down to the cent. */
const discountedCents = (item, percentOff) => Math.floor((Math.round(item.price * 100) * (100 - percentOff)) / 100)

/** The best (biggest) active offer for one plan / pack, or undefined. */
function bestFor(itemId, user, now) {
  return offers.filter((o) => o.itemId === itemId && isActive(o, user, now)).sort((a, b) => b.percentOff - a.percentOff)[0]
}

/** What the Pricing / Get Coins pages show next to an item that has an offer. */
function badge(offer, user) {
  const item = itemOf(offer.itemId)
  return { id: offer.id, discountPercent: offer.percentOff, original: item.price, price: discountedCents(item, offer.percentOff) / 100, endsAt: endsAtOf(offer, user) }
}

/** The special offer of the "Wait! Create More for Less" popup for this user, or null. */
function popupOffer(user) {
  const offer = offers.find((o) => o.popup === true && isActive(o, user))
  if (!offer) return null
  const item = itemOf(offer.itemId)
  return { ...badge(offer, user), itemId: item.id, name: item.name, per: item.per ?? null, coins: item.coins, currency: 'USD' }
}

module.exports = { offers, itemOf, isActive, endsAtOf, discountedCents, bestFor, badge, popupOffer }
