const AppError = require('../utils/AppError')
const { query, tx } = require('../db')

/**
 * Coin balance of a user (users.coins) plus the coin_ledger that explains it.
 * reasons: signup_bonus | generation (-) | refund | purchase | redeem
 * `db` (optional, last argument) = the transaction a caller is already in; without it the function opens its own.
 */
const inTx = (db, fn) => (db ? fn(db) : tx(fn))

/** Adds coins. With `ref`, the same (reason, ref) is only ever credited once: resolves false when it was already credited. */
const credit = (userId, coins, reason, ref = null, db) => inTx(db, async (d) => {
  const ins = await d.query('INSERT INTO coin_ledger (user_id, delta, reason, ref) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING id', [userId, coins, reason, ref])
  if (!ins.rows.length) return false
  await d.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coins, userId])
  return true
})

/** Takes coins; rejects with 402 INSUFFICIENT_COINS (nothing changes) when the balance is too low. */
const charge = (userId, coins, reason = 'generation') => tx(async (d) => {
  const res = await d.query('UPDATE users SET coins = coins - $1 WHERE id = $2 AND coins >= $1 RETURNING coins', [coins, userId])
  if (!res.rows.length) throw new AppError(402, 'INSUFFICIENT_COINS', `You need ${coins} coins for this. Get more coins on the Get Coins page.`, { required: coins })
  await d.query('INSERT INTO coin_ledger (user_id, delta, reason) VALUES ($1, $2, $3)', [userId, -coins, reason])
})

const balance = async (userId) => (await query('SELECT coins FROM users WHERE id = $1', [userId])).rows[0]?.coins ?? 0

/** Latest ledger rows, newest first. */
const history = async (userId, limit = 20) =>
  (await query('SELECT delta, reason, created_at AS "createdAt" FROM coin_ledger WHERE user_id = $1 ORDER BY id DESC LIMIT $2', [userId, limit])).rows

/** Adds the coins of a one-time code (see scripts/create-redeem-code.js). A used or unknown code gives the same 404. */
function redeem(userId, rawCode) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : ''
  return tx(async (d) => {
    const res = code ? await d.query('UPDATE redeem_codes SET redeemed_by = $1, redeemed_at = now() WHERE code = $2 AND redeemed_by IS NULL RETURNING coins', [userId, code]) : { rows: [] }
    if (!res.rows.length) throw new AppError(404, 'INVALID_CODE', 'This code is not valid or was already used.')
    await credit(userId, res.rows[0].coins, 'redeem', code, d)
    return { coins: res.rows[0].coins, balance: (await d.query('SELECT coins FROM users WHERE id = $1', [userId])).rows[0].coins }
  })
}

module.exports = { credit, charge, balance, history, redeem }
