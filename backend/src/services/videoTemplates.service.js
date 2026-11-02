const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { query } = require('../db')
const storage = require('./storage.service')

/**
 * Video templates: an admin saves a reference video (the motion to copy) with a prompt and the settings of a Picsart motion-transfer model
 * (default kling-motion-control: `imageUrls` = the person's photo, `videoUrl` = the reference video). A user picks a template and adds only a photo.
 * The reference video and its preview are copied into Spaces, because the link a finished Picsart job gives is temporary.
 */
const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/
const KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/
const MAX_COPY_BYTES = 200 * 1024 * 1024
const EXT = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

const costOf = (t) => t.cost_coins ?? env.coins.perVideo
const shape = (r) => ({
  id: r.id, title: r.title, description: r.description || '', videoUrl: r.video_url, previewUrl: r.preview_url || r.video_url, model: r.model, videoKey: r.video_key,
  prompt: r.prompt || '', params: r.params || {}, costCoins: r.cost_coins, cost: costOf(r), active: r.active, sortOrder: r.sort_order, createdAt: r.created_at,
})
/** What the app shows to everyone (no prompt or model details). */
const publicShape = (r) => ({ id: r.id, title: r.title, description: r.description || '', previewUrl: r.preview_url || r.video_url, cost: costOf(r) })

const isOwn = (url) => !!url && url.startsWith(`${env.spaces.publicUrl}/`)
const http = (url, label) => {
  let u
  try { u = new URL(url) } catch { throw new AppError(400, 'INVALID_URL', `${label} must be a full https:// address.`) }
  if (!['http:', 'https:'].includes(u.protocol)) throw new AppError(400, 'INVALID_URL', `${label} must be a full https:// address.`)
  return u.toString()
}

/** Downloads `url` into Spaces under `folder/` and returns the permanent address; keeps the original address when Spaces is not set up or the download fails. */
async function keep(url, folder) {
  if (!storage.isConfigured() || isOwn(url)) return url
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    if (Number(res.headers.get('content-length')) > MAX_COPY_BYTES) throw new Error('file too large')
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const body = Buffer.from(await res.arrayBuffer())
    if (body.length > MAX_COPY_BYTES) throw new Error('file too large')
    const ext = EXT[type] || (/\.(mp4|webm|mov|jpe?g|png|webp)(\?|$)/i.exec(url)?.[1] || 'mp4').toLowerCase()
    const key = `${folder}/${crypto.randomBytes(8).toString('hex')}.${ext}`
    await storage.putImage(key, body, type || 'video/mp4')
    return storage.publicUrl(key)
  } catch (e) {
    console.error(`[video] could not copy ${url} into storage:`, e.message)
    return url
  }
}

function clean(input, existing) {
  const b = input || {}
  const out = {}
  const has = (k) => b[k] !== undefined
  if (has('title') || !existing) { const t = String(b.title || '').trim(); if (!t) throw new AppError(400, 'MISSING_FIELDS', 'title is required.'); out.title = t.slice(0, 120) }
  if (has('description')) out.description = String(b.description || '').trim().slice(0, 500)
  if (has('videoUrl') || !existing) out.videoUrl = http(String(b.videoUrl || ''), 'videoUrl')
  if (has('previewUrl')) out.previewUrl = b.previewUrl ? http(String(b.previewUrl), 'previewUrl') : null
  if (has('model')) { const m = String(b.model || '').trim(); if (!MODEL_RE.test(m)) throw new AppError(400, 'INVALID_MODEL', 'model must be a Picsart model id such as "kling-motion-control".'); out.model = m }
  if (has('videoKey')) { const k = String(b.videoKey || '').trim(); if (!KEY_RE.test(k)) throw new AppError(400, 'INVALID_FIELD', 'videoKey must be the model\'s input name for the video, e.g. "videoUrl".'); out.videoKey = k }
  if (has('prompt')) out.prompt = String(b.prompt || '').trim().slice(0, 2500)
  if (has('params')) {
    if (!b.params || typeof b.params !== 'object' || Array.isArray(b.params)) throw new AppError(400, 'INVALID_PARAMS', 'params must be an object (extra inputs such as {"resolution": "720p"}).')
    for (const k of ['prompt', 'imageUrls']) if (k in b.params) throw new AppError(400, 'INVALID_PARAMS', `params must not contain "${k}": the prompt has its own field and the user's photo is added for you.`)
    out.params = b.params
  }
  if (has('costCoins')) { const n = b.costCoins === null || b.costCoins === '' ? null : Number(b.costCoins); if (n !== null && (!Number.isInteger(n) || n < 0)) throw new AppError(400, 'INVALID_FIELD', 'costCoins must be a whole number (or empty for the default price).'); out.costCoins = n }
  if (has('active')) out.active = b.active === true || b.active === 'true'
  if (has('sortOrder')) { const n = Number.parseInt(b.sortOrder, 10); out.sortOrder = Number.isFinite(n) ? n : 0 }
  return out
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)

async function create(input) {
  const v = clean(input)
  const id = `${slug(v.title) || 'video'}-${crypto.randomBytes(3).toString('hex')}`
  const videoUrl = await keep(v.videoUrl, 'video-templates')
  const previewUrl = v.previewUrl ? await keep(v.previewUrl, 'video-templates') : null
  const row = (await query(
    `INSERT INTO video_templates (id, title, description, video_url, preview_url, model, video_key, prompt, params, cost_coins, active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [id, v.title, v.description || '', videoUrl, previewUrl, v.model || 'kling-motion-control', v.videoKey || 'videoUrl', v.prompt || '', JSON.stringify(v.params || {}), v.costCoins ?? null, v.active ?? true, v.sortOrder ?? 0])).rows[0]
  return shape(row)
}

async function update(id, input) {
  const cur = (await query('SELECT * FROM video_templates WHERE id = $1', [id])).rows[0]
  if (!cur) throw new AppError(404, 'NOT_FOUND', 'No video template with this id.')
  const v = clean(input, cur)
  if (v.videoUrl && v.videoUrl !== cur.video_url) v.videoUrl = await keep(v.videoUrl, 'video-templates')
  else delete v.videoUrl
  if (v.previewUrl && v.previewUrl !== cur.preview_url) v.previewUrl = await keep(v.previewUrl, 'video-templates')
  const cols = { title: 'title', description: 'description', videoUrl: 'video_url', previewUrl: 'preview_url', model: 'model', videoKey: 'video_key', prompt: 'prompt', costCoins: 'cost_coins', active: 'active', sortOrder: 'sort_order' }
  const sets = []; const vals = [id]
  for (const [k, col] of Object.entries(cols)) if (k in v) { vals.push(v[k]); sets.push(`${col} = $${vals.length}`) }
  if ('params' in v) { vals.push(JSON.stringify(v.params)); sets.push(`params = $${vals.length}`) }
  if (!sets.length) return shape(cur)
  return shape((await query(`UPDATE video_templates SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, vals)).rows[0])
}

async function remove(id) {
  if (!(await query('DELETE FROM video_templates WHERE id = $1', [id])).rowCount) throw new AppError(404, 'NOT_FOUND', 'No video template with this id.')
}

const listAll = async () => (await query('SELECT * FROM video_templates ORDER BY sort_order, created_at DESC')).rows.map(shape)
const listActive = async () => (await query('SELECT * FROM video_templates WHERE active ORDER BY sort_order, created_at DESC')).rows.map(publicShape)
const get = async (id) => (await query('SELECT * FROM video_templates WHERE id = $1', [id])).rows[0] || null

module.exports = { create, update, remove, listAll, listActive, get, keep, costOf }
