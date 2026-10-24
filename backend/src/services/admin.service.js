const { query } = require('../db')
const plans = require('../config/plans')

/** Numbers for the admin dashboard: who joined, who pays for what. Read-only. */
const planName = (id) => plans.find((p) => p.id === id)?.name ?? id ?? null
const intIn = (v, fallback, min, max) => Math.min(Math.max(Number.parseInt(v, 10) || fallback, min), max)
const page = (q) => { const limit = intIn(q.limit, 25, 1, 100); return { limit, offset: (intIn(q.page, 1, 1, 1e6) - 1) * limit } }
const like = (s) => `%${String(s).trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`
// a plan the user has now: running, or cancelled but still inside the period they paid for
const LIVE_SUB = "(s.status IN ('active', 'authenticated', 'pending') OR (s.status = 'cancelled' AND s.current_end > now()))"

async function stats() {
  const one = async (sql, params) => (await query(sql, params)).rows[0]
  const users = await one(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS week,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS month FROM users`)
  const signups = (await query("SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS count FROM users WHERE created_at >= date_trunc('day', now()) - interval '29 days' GROUP BY 1 ORDER BY 1")).rows
  const byPlan = (await query(`SELECT s.item_id, count(*)::int AS count FROM subscriptions s WHERE ${LIVE_SUB} GROUP BY 1 ORDER BY 2 DESC`)).rows
  const revenue = (await query("SELECT currency, sum(amount)::bigint AS total, count(*)::int AS payments FROM payments WHERE status = 'paid' AND paid_at >= now() - interval '30 days' GROUP BY 1")).rows
  const catalogue = await one('SELECT (SELECT count(*) FROM templates)::int AS templates, (SELECT count(*) FROM templates WHERE trending)::int AS trending, (SELECT count(*) FROM template_categories)::int AS categories')
  const generations = await one("SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today FROM generations")
  const days = new Map(signups.map((r) => [r.day, r.count]))
  const series = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10); return { day: d, count: days.get(d) || 0 } })
  return {
    users, signups: series, subscribers: { total: byPlan.reduce((n, r) => n + r.count, 0), byPlan: byPlan.map((r) => ({ id: r.item_id, name: planName(r.item_id), count: r.count })) },
    revenue: revenue.map((r) => ({ currency: r.currency, total: Number(r.total), payments: r.payments })), catalogue, generations,
  }
}

/** Users with the plan each has now (null = none), newest first. */
async function listUsers(q = {}) {
  const { limit, offset } = page(q)
  const params = []
  let where = ''
  if (q.q) { params.push(like(q.q)); where = 'WHERE (u.email ILIKE $1 OR u.name ILIKE $1)' }
  const total = (await query(`SELECT count(*)::int AS n FROM users u ${where}`, params)).rows[0].n
  const rows = (await query(
    `SELECT u.id, u.email, u.name, u.coins, u.created_at, (u.google_sub IS NOT NULL) AS google, (u.apple_sub IS NOT NULL) AS apple, s.item_id AS plan, s.status AS plan_status, s.current_end AS plan_ends,
       (SELECT count(*)::int FROM generations g WHERE g.user_id = u.id) AS generations
     FROM users u LEFT JOIN LATERAL (SELECT * FROM subscriptions s WHERE s.user_id = u.id AND ${LIVE_SUB} ORDER BY s.created_at DESC LIMIT 1) s ON true
     ${where} ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params)).rows
  return { total, users: rows.map((r) => ({ id: r.id, email: r.email, name: r.name, coins: r.coins, joined_at: r.created_at, sign_in: r.apple ? 'apple' : r.google ? 'google' : 'email', plan: r.plan ? planName(r.plan) : null, plan_status: r.plan_status || null, plan_ends: r.plan_ends || null, generations: r.generations })) }
}

/** Every subscription with who bought it: name, email, plan, status, dates, how many payments and how much was paid. */
async function listSubscriptions(q = {}) {
  const { limit, offset } = page(q)
  const params = []
  const where = []
  if (q.status === 'current') where.push(LIVE_SUB)
  else if (q.status) { params.push(String(q.status)); where.push(`s.status = $${params.length}`) }
  if (q.q) { params.push(like(q.q)); where.push(`(u.email ILIKE $${params.length} OR u.name ILIKE $${params.length})`) }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const total = (await query(`SELECT count(*)::int AS n FROM subscriptions s JOIN users u ON u.id = s.user_id ${w}`, params)).rows[0].n
  const rows = (await query(
    `SELECT s.subscription_id, s.item_id, s.status, s.cancel_requested, s.paid_count, s.current_end, s.created_at, u.id AS user_id, u.name, u.email,
       (SELECT sum(p.amount)::bigint FROM payments p WHERE p.subscription_id = s.subscription_id AND p.status = 'paid') AS paid_total,
       (SELECT p.currency FROM payments p WHERE p.subscription_id = s.subscription_id AND p.status = 'paid' ORDER BY p.paid_at DESC LIMIT 1) AS currency
     FROM subscriptions s JOIN users u ON u.id = s.user_id ${w} ORDER BY s.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params)).rows
  const live = (r) => ['active', 'authenticated', 'pending'].includes(r.status) || (r.status === 'cancelled' && r.current_end && new Date(r.current_end) > new Date())
  return {
    total, subscriptions: rows.map((r) => ({
      id: r.subscription_id, user_id: r.user_id, name: r.name, email: r.email, plan_id: r.item_id, plan: planName(r.item_id), status: r.status, current: !!live(r),
      cancel_requested: r.cancel_requested, payments: r.paid_count, paid_total: r.paid_total == null ? 0 : Number(r.paid_total), currency: r.currency || null,
      renews_at: r.current_end && !r.cancel_requested && r.status !== 'cancelled' ? r.current_end : null, ends_at: r.current_end && (r.cancel_requested || r.status === 'cancelled') ? r.current_end : null, started_at: r.created_at,
    })),
  }
}

module.exports = { stats, listUsers, listSubscriptions }
