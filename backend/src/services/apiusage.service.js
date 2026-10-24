const crypto = require('node:crypto')
const env = require('../config/env')
const { query } = require('../db')
const storage = require('./storage.service')

/**
 * A log of every call made to the image-generation provider (AILabTools): which API, who, which template, how it ended, how long it took, the provider's
 * task / request ids and the coins charged. The provider does not report tokens or credits per call, so "usage" here is calls, outcomes, time and coins;
 * an estimated provider cost is shown when a price per call is set (AILAB_COST_PER_CALL, optionally per API in AILAB_API_COSTS).
 */
const API_NAMES = { 'ai-photography': 'AI Photography', 'cartoon-yourself': 'Cartoon Yourself', 'ai-beard-styling': 'AI Beard Styling', 'hairstyle-changer-premium': 'Hairstyle Changer' }

/** Saves one call. Never throws: a logging problem must not break a generation. */
async function record(call) {
  try {
    await query(
      `INSERT INTO api_calls (id, user_id, api, template, status, error_code, http_status, duration_ms, coins, task_id, request_id, log_id, generation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [crypto.randomUUID(), call.userId, call.api, call.template || null, call.status, call.errorCode || null, call.httpStatus || null, call.durationMs ?? null, call.coins || 0, call.taskId || null, call.requestId || null, call.logId || null, call.generationId || null])
  } catch (e) { console.error('[usage] could not log an API call:', e.message) }
}

/** A job that was still processing has finished (seen when the browser polls its task). */
async function finishTask(taskId, status) {
  if (!taskId) return
  try { await query("UPDATE api_calls SET status = $2 WHERE task_id = $1 AND status = 'processing'", [taskId, status]) } catch (e) { console.error('[usage] could not update an API call:', e.message) }
}

const costOf = (api) => { const own = env.apiCosts?.[api]; return Number.isFinite(own) ? own : env.apiCostPerCall || 0 }

async function usage({ days = 30, api, status, page = 1, limit = 20 } = {}) {
  const d = Math.min(Math.max(Number.parseInt(days, 10) || 30, 1), 365)
  const lim = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100)
  const off = (Math.max(Number.parseInt(page, 10) || 1, 1) - 1) * lim
  const since = `created_at >= now() - interval '${d} days'`
  const byApi = (await query(
    `SELECT api, count(*)::int AS calls, count(*) FILTER (WHERE status = 'succeeded')::int AS succeeded, count(*) FILTER (WHERE status = 'failed')::int AS failed,
       count(*) FILTER (WHERE status = 'processing')::int AS processing, COALESCE(sum(coins), 0)::int AS coins, COALESCE(avg(duration_ms) FILTER (WHERE status = 'succeeded'), 0)::int AS avg_ms
     FROM api_calls WHERE ${since} GROUP BY api ORDER BY calls DESC`)).rows
  const daily = (await query(`SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS calls, count(*) FILTER (WHERE status = 'failed')::int AS failed FROM api_calls WHERE ${since} GROUP BY 1 ORDER BY 1`)).rows
  const map = new Map(daily.map((r) => [r.day, r]))
  const series = Array.from({ length: d }, (_, i) => { const day = new Date(Date.now() - (d - 1 - i) * 86400000).toISOString().slice(0, 10); return { day, calls: map.get(day)?.calls || 0, failed: map.get(day)?.failed || 0 } })
  const errors = (await query(`SELECT error_code, count(*)::int AS count FROM api_calls WHERE ${since} AND status = 'failed' GROUP BY 1 ORDER BY 2 DESC LIMIT 6`)).rows
  const sum = byApi.reduce((t, r) => ({ calls: t.calls + r.calls, succeeded: t.succeeded + r.succeeded, failed: t.failed + r.failed, processing: t.processing + r.processing, coins: t.coins + r.coins, cost: t.cost + r.succeeded * costOf(r.api) }), { calls: 0, succeeded: 0, failed: 0, processing: 0, coins: 0, cost: 0 })
  const avgMs = byApi.length ? Math.round(byApi.reduce((n, r) => n + r.avg_ms * r.succeeded, 0) / Math.max(1, sum.succeeded)) : 0

  const where = [since]
  const params = []
  if (api) { params.push(api); where.push(`c.api = $${params.length}`) }
  if (status) { params.push(status); where.push(`c.status = $${params.length}`) }
  const w = where.join(' AND ').replace(/created_at/g, 'c.created_at')
  const total = (await query(`SELECT count(*)::int AS n FROM api_calls c WHERE ${w}`, params)).rows[0].n
  const rows = (await query(
    `SELECT c.*, u.name, u.email, g.result_key FROM api_calls c LEFT JOIN users u ON u.id = c.user_id LEFT JOIN generations g ON g.id = c.generation_id
     WHERE ${w} ORDER BY c.created_at DESC LIMIT ${lim} OFFSET ${off}`, params)).rows
  return {
    days: d, apis: Object.entries(API_NAMES).map(([id, name]) => ({ id, name })),
    summary: { ...sum, avg_ms: avgMs, success_rate: sum.calls - sum.processing ? Math.round((sum.succeeded / (sum.calls - sum.processing)) * 100) : null, estimated_cost_usd: sum.cost, cost_per_call_set: Boolean(env.apiCostPerCall || Object.keys(env.apiCosts || {}).length) },
    by_api: byApi.map((r) => ({ ...r, name: API_NAMES[r.api] || r.api, estimated_cost_usd: r.succeeded * costOf(r.api) })), daily: series, errors,
    calls: { total, items: rows.map((r) => ({ id: r.id, at: r.created_at, api: r.api, api_name: API_NAMES[r.api] || r.api, user: r.name || null, email: r.email || null, template: r.template, status: r.status, error_code: r.error_code, http_status: r.http_status, duration_ms: r.duration_ms, coins: r.coins, task_id: r.task_id, request_id: r.request_id, log_id: r.log_id, result_url: r.result_key && storage.isConfigured() ? storage.publicUrl(r.result_key) : null })) },
  }
}

module.exports = { record, finishTask, usage, API_NAMES }
