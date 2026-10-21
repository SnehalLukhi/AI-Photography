/** The result `data` of AI Photography is undocumented: whatever shape it has, the result image must be found and ranked first. */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { collectUrls } = require('../src/services/ailab.service')

test('finds URLs in any nesting and keeps simple lists in order', () => {
  assert.deepEqual(collectUrls({ a: { b: ['https://x.invalid/1.png', 'https://x.invalid/2.png'] }, note: 'text' }), ['https://x.invalid/1.png', 'https://x.invalid/2.png'])
  assert.deepEqual(collectUrls({ image_url: 'https://x.invalid/r' }), ['https://x.invalid/r'])
  assert.deepEqual(collectUrls({ result_urls: ['https://x.invalid/a'] }), ['https://x.invalid/a'])
  assert.deepEqual(collectUrls(undefined), [])
})

test('the result image is ranked ahead of echoed inputs and other links', () => {
  const urls = collectUrls({ docs: 'https://docs.invalid/help', input: 'https://x.invalid/in', output: { images: ['https://x.invalid/out.jpg?sig=1'] } })
  assert.equal(urls[0], 'https://x.invalid/out.jpg?sig=1')
  assert.equal(urls.length, 3)
})
