/**
 * One-time copy of the old SQLite file (accounts, coin history, redeem codes, generations) into the Postgres database from DATABASE_URL.
 *   node scripts/migrate-sqlite-to-postgres.js [path/to/app.db]      (default: backend/data/app.db)
 * Safe to run twice: rows that already exist are skipped.
 */
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite') // only this script needs it (Node >= 22.13)
const db = require('../src/db')

const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'data', 'app.db'))
const sqlite = new DatabaseSync(file, { readOnly: true })
const has = (t) => !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t)

;(async () => {
  let n = 0
  await db.tx(async (d) => {
    for (const u of sqlite.prepare('SELECT * FROM users').all()) {
      await d.query('INSERT INTO users (id, email, name, password_hash, coins, google_sub, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING', [u.id, u.email, u.name, u.password_hash, u.coins ?? 0, u.google_sub ?? null, u.created_at])
      n++
    }
    if (has('coin_ledger')) for (const l of sqlite.prepare('SELECT * FROM coin_ledger ORDER BY id').all()) {
      await d.query('INSERT INTO coin_ledger (user_id, delta, reason, ref, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', [l.user_id, l.delta, l.reason, l.ref, l.created_at])
    }
    if (has('redeem_codes')) for (const c of sqlite.prepare('SELECT * FROM redeem_codes').all()) {
      await d.query('INSERT INTO redeem_codes (code, coins, redeemed_by, redeemed_at, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING', [c.code, c.coins, c.redeemed_by, c.redeemed_at, c.created_at])
    }
    if (has('generations')) for (const g of sqlite.prepare('SELECT * FROM generations').all()) {
      await d.query('INSERT INTO generations (id, user_id, api, template, task_id, original_key, original_mime, result_key, result_mime, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING', [g.id, g.user_id, g.api, g.template, g.task_id, g.original_key, g.original_mime, g.result_key, g.result_mime, g.created_at])
    }
  })
  console.log(`Done: ${n} accounts read from ${file} and copied (existing ones were skipped).`)
  await db.close()
})().catch((e) => { console.error('Migration failed:', e.message); process.exit(1) })
