const env = require('../config/env')
const AppError = require('../utils/AppError')
const { getDb } = require('../db')

/** Generations per user per UTC day (DAILY_GENERATION_LIMIT). Each generation costs AILabTools credits, so this caps what one account can spend. */
const today = () => new Date().toISOString().slice(0, 10)

/** Counts one generation for the user; throws 429 when the daily limit is used up. */
function consume(userId) {
  const db = getDb()
  const day = today()
  db.prepare('INSERT OR IGNORE INTO usage (user_id, day, count) VALUES (?, ?, 0)').run(userId, day)
  const res = db.prepare('UPDATE usage SET count = count + 1 WHERE user_id = ? AND day = ? AND count < ?').run(userId, day, env.auth.dailyLimit)
  if (!res.changes) throw new AppError(429, 'DAILY_LIMIT_REACHED', `You have used your ${env.auth.dailyLimit} generations for today. Please try again tomorrow.`)
  return day
}

function refund(userId, day) {
  getDb().prepare('UPDATE usage SET count = MAX(count - 1, 0) WHERE user_id = ? AND day = ?').run(userId, day)
}

module.exports = { consume, refund }
