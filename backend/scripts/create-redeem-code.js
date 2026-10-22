/**
 * Creates one-time redeem codes (users enter them on the "Transfer code" page).
 *   node scripts/create-redeem-code.js <coins> [how-many]
 * Uses the same DATABASE_URL as the server (backend/.env).
 */
const crypto = require('node:crypto')
const db = require('../src/db')

const coins = Number.parseInt(process.argv[2], 10)
const count = Number.parseInt(process.argv[3] || '1', 10)
if (!(coins > 0) || !(count > 0) || count > 1000) {
  console.error('Usage: node scripts/create-redeem-code.js <coins> [how-many up to 1000]')
  process.exit(1)
}
const part = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)

;(async () => {
  for (let i = 0; i < count; i++) {
    const code = `GLY-${part()}-${part()}`
    await db.query('INSERT INTO redeem_codes (code, coins) VALUES ($1, $2)', [code, coins])
    console.log(`${code}  (${coins} coins)`)
  }
  await db.close()
})().catch((e) => { console.error(e.message); process.exit(1) })
