const env = require('../config/env')
const AppError = require('../utils/AppError')
const { query } = require('../db')

/** Generations per user per UTC day (DAILY_GENERATION_LIMIT). Each generation costs AILabTools credits, so this caps what one account can spend. */
const today = () => new Date().toISOString().slice(0, 10)

/** Counts one generation for the user; rejects with 429 when the daily limit is used up. */
async function consume(userId) {
  const day = today()
  await query('INSERT INTO usage (user_id, day, count) VALUES ($1, $2, 0) ON CONFLICT DO NOTHING', [userId, day])
  const res = await query('UPDATE usage SET count = count + 1 WHERE user_id = $1 AND day = $2 AND count < $3 RETURNING count', [userId, day, env.auth.dailyLimit])
  if (!res.rows.length) throw new AppError(429, 'DAILY_LIMIT_REACHED', `You have used your ${env.auth.dailyLimit} generations for today. Please try again tomorrow.`)
  return day
}

const refund = (userId, day) => query('UPDATE usage SET count = GREATEST(count - 1, 0) WHERE user_id = $1 AND day = $2', [userId, day])

module.exports = { consume, refund }
