/** Currency conversion with charm rounding: 1 dollar = 94 rupees shows 99, 3 dollars shows 299. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
require('./helpers')
const pricing = require('../src/services/pricing.service')

test('rupees end in 99: $1 -> 99, $3 -> 299, never below the converted price', () => {
  const inr = (usd) => pricing.convert(usd, 'INR')
  assert.deepEqual([1, 2.99, 3, 4.99, 9.99, 39.99, 49.99].map(inr), [99, 299, 299, 499, 999, 3799, 4799])
  for (const usd of [0.5, 1, 2.5, 7, 12.34, 99.99]) assert.ok(inr(usd) >= usd * pricing.rateOf('INR'), `${usd}`)
})

test('other currencies end in .99; dollars and unknown currencies are unchanged; countries map to their currency', () => {
  assert.deepEqual([2.99, 9.99, 39.99].map((u) => pricing.convert(u, 'EUR')), [2.99, 9.99, 36.99])
  assert.equal(pricing.convert(9.99, 'GBP'), 7.99)
  assert.equal(pricing.convert(9.99, 'USD'), 9.99)
  assert.equal(pricing.convert(9.99, 'XYZ'), 9.99)
  assert.deepEqual(['IN', 'de', 'GB', 'US', 'BR', ''].map(pricing.currencyFor), ['INR', 'EUR', 'GBP', 'USD', 'USD', 'USD'])
})
