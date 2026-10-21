const AppError = require('../utils/AppError')
const { getDb, tx } = require('../db')

/**
 * Coin balance of a user (users.coins) plus the coin_ledger that explains it.
 * reasons: signup_bonus | generation (-) | refund | purchase | redeem
 */
const now = () => new Date().toISOString()

/** Adds coins. With `ref`, the same (reason, ref) is only ever credited once: returns false when it was already credited. */
function credit(userId, coins, reason, ref = null) {
  return tx(() => {
    const db = getDb()
    if (ref && db.prepare('SELECT 1 FROM coin_ledger WHERE reason = ? AND ref = ?').get(reason, ref)) return false
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(coins, userId)
    db.prepare('INSERT INTO coin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, coins, reason, ref, now())
    return true
  })
}

/** Takes coins; throws 402 INSUFFICIENT_COINS (nothing changes) when the balance is too low. */
function charge(userId, coins, reason = 'generation') {
  tx(() => {
    const db = getDb()
    const res = db.prepare('UPDATE users SET coins = coins - ? WHERE id = ? AND coins >= ?').run(coins, userId, coins)
    if (!res.changes) throw new AppError(402, 'INSUFFICIENT_COINS', `You need ${coins} coins for this. Get more coins on the Pricing page.`, { required: coins })
    db.prepare('INSERT INTO coin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, ?, NULL, ?)').run(userId, -coins, reason, now())
  })
}

const balance = (userId) => getDb().prepare('SELECT coins FROM users WHERE id = ?').get(userId)?.coins ?? 0

/** Latest ledger rows, newest first. */
const history = (userId, limit = 20) =>
  getDb().prepare('SELECT delta, reason, created_at AS createdAt FROM coin_ledger WHERE user_id = ? ORDER BY id DESC LIMIT ?').all(userId, limit)

/** Adds the coins of a one-time code (see scripts/create-redeem-code.js). A used or unknown code gives the same 404. */
function redeem(userId, rawCode) {
  const code = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : ''
  return tx(() => {
    const db = getDb()
    const row = code && db.prepare('SELECT coins FROM redeem_codes WHERE code = ? AND redeemed_by IS NULL').get(code)
    if (!row) throw new AppError(404, 'INVALID_CODE', 'This code is not valid or was already used.')
    db.prepare('UPDATE redeem_codes SET redeemed_by = ?, redeemed_at = ? WHERE code = ?').run(userId, now(), code)
    credit(userId, row.coins, 'redeem', code)
    return { coins: row.coins, balance: balance(userId) }
  })
}

module.exports = { credit, charge, balance, history, redeem }
