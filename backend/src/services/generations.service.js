const crypto = require('node:crypto')
const AppError = require('../utils/AppError')
const { query } = require('../db')
const storage = require('./storage.service')
const ailab = require('./ailab.service')
const { sniffMime } = require('./image.service')

/**
 * One "generation" = the user's original photo + the AI result.
 *   DigitalOcean Spaces: ONLY the two images, public:  generations/<id>/original.<ext>  and  generations/<id>/result.<ext>
 *   PostgreSQL (table `generations`): who owns it, the template, the AILabTools task id and the two image keys.
 */
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const enabled = () => storage.isConfigured()

function requireStorage() {
  if (!enabled()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Image storage is not configured (set SPACES_KEY, SPACES_SECRET and SPACES_BUCKET).')
}

/** A generation row. With `owner`, someone else's generation looks the same as a missing one (404). */
async function load(id, owner) {
  if (!ID_RE.test(id)) throw new AppError(400, 'INVALID_GENERATION_ID', 'Invalid generation id.')
  const row = (await query('SELECT * FROM generations WHERE id = $1', [id])).rows[0]
  if (!row || (owner !== undefined && row.user_id !== owner)) throw new AppError(404, 'GENERATION_NOT_FOUND', 'No generation found for this id.')
  return row
}

/** Shape returned to the frontend: both images as permanent public URLs. */
function toView(row) {
  const image = (key, mimeType) => (key ? { url: storage.publicUrl(key), mimeType } : null)
  return {
    id: row.id, status: row.result_key ? 'completed' : 'pending', createdAt: new Date(row.created_at).toISOString(), api: row.api, template: row.template || null,
    original: image(row.original_key, row.original_mime), result: image(row.result_key, row.result_mime),
  }
}

const keyFor = (id, kind, mimeType) => `generations/${id}/${kind}.${EXT[mimeType] || 'bin'}`

/** Save the original photo and start a generation record. Never throws: returns null when storage is off or fails (generation still works). */
async function begin(image, { api, template, owner } = {}) {
  if (!enabled() || !owner) return null
  const id = crypto.randomUUID()
  const key = keyFor(id, 'original', image.mimeType)
  try {
    await storage.putImage(key, image.buffer, image.mimeType)
    await query('INSERT INTO generations (id, user_id, api, template, original_key, original_mime) VALUES ($1, $2, $3, $4, $5, $6)', [id, owner, api ?? null, template ?? null, key, image.mimeType])
    return id
  } catch (e) {
    console.error('[storage] could not save the original image', e.message)
    storage.deleteObject(key).catch(() => {}) // do not leave an image without a record
    return null
  }
}

/** Remember which AILabTools task belongs to a generation (so polling can find it later). Never throws. */
async function linkTask(id, taskId) {
  if (!id || !taskId) return
  try { await query('UPDATE generations SET task_id = $1 WHERE id = $2', [taskId, id]) } catch (e) { console.error('[storage] could not link task', e.message) }
}

/** The result URLs are not documented, so try them in order and keep the first one that really downloads as a JPEG / PNG / WebP image. */
async function downloadFirstImage(urls) {
  for (const url of urls.slice(0, 5)) {
    try {
      const { buffer } = await ailab.downloadImage(url)
      const mimeType = sniffMime(buffer)
      if (EXT[mimeType]) return { buffer, mimeType }
    } catch (e) { console.warn('[storage] result URL skipped:', e.message) }
  }
  return null
}

async function storeResult(id, image) {
  const key = keyFor(id, 'result', image.mimeType)
  await storage.putImage(key, image.buffer, image.mimeType)
  await query('UPDATE generations SET result_key = $1, result_mime = $2 WHERE id = $3', [key, image.mimeType, id])
}

/**
 * Called with every AILabTools task state. When the task has succeeded, downloads the first result image and stores it next to the original
 * (once; repeated calls just return the stored view). Never throws: a storage problem is reported as { id, stored: false }, the AI result URLs stay in the response.
 */
async function complete(id, result) {
  if (!id) return null
  try {
    let row = await load(id)
    if (!row.result_key && result.status === 'succeeded') {
      const image = result.images?.length ? await downloadFirstImage(result.images) : null
      if (!image) return { id, stored: false }
      row = await load(id) // a concurrent poll may have stored it already
      if (!row.result_key) await storeResult(id, image)
      row = await load(id)
    }
    return { stored: true, ...toView(row) }
  } catch (e) {
    console.error('[storage] could not save the generated image', e.message)
    return { id, stored: false }
  }
}

/** For GET /api/photos/tasks/:taskId: finish storing once the task is done (only for the user who started it). */
async function completeByTask(taskId, result, owner) {
  if (!enabled()) return null
  const row = (await query('SELECT id, user_id FROM generations WHERE task_id = $1', [taskId])).rows[0]
  if (!row) return null
  if (row.user_id !== owner) throw new AppError(404, 'TASK_NOT_FOUND', 'No task found for this id.')
  return complete(row.id, result)
}

/** Strict reads/writes for the /api/generations endpoints (these do throw AppErrors). */
async function create(image, info) {
  requireStorage()
  const id = await begin(image, info)
  if (!id) throw new AppError(502, 'STORAGE_FAILED', 'Could not save the image to storage.')
  return toView(await load(id))
}

async function get(id, owner) {
  requireStorage()
  return toView(await load(id, owner))
}

/** The AI result image of one of the user's generations as bytes + a file name, for a browser download (never the original photo). */
async function download(id, owner) {
  requireStorage()
  const row = await load(id, owner)
  if (!row.result_key) throw new AppError(404, 'RESULT_NOT_READY', 'This generation has no result image yet.')
  const { buffer, mimeType } = await storage.getImage(row.result_key)
  const mime = row.result_mime || mimeType || 'application/octet-stream'
  const base = String(row.template || 'pictrify').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'pictrify'
  return { buffer, mimeType: mime, filename: `${base}-${id.slice(0, 8)}.${EXT[mime] || 'jpg'}` }
}

async function saveResult(id, owner, image) {
  requireStorage()
  const row = await load(id, owner)
  if (row.result_key) throw new AppError(409, 'RESULT_ALREADY_SAVED', 'This generation already has a result image.')
  await storeResult(id, image)
  return toView(await load(id))
}

/** GET /api/generations - one user's generations, newest first. `nextToken` continues the list. */
async function list(owner, { limit = 20, token } = {}) {
  if (!enabled()) return { generations: [] } // storage off: nothing is saved, so there is nothing to list (not an error)
  let after = ''
  const params = [owner, limit + 1]
  if (token) {
    const [at, id] = Buffer.from(token, 'base64url').toString('utf8').split('|')
    if (!at || Number.isNaN(Date.parse(at)) || !ID_RE.test(id || '')) throw new AppError(400, 'INVALID_TOKEN', 'Invalid nextToken.')
    params.push(at, id)
    after = 'AND (created_at < $3::timestamptz OR (created_at = $3::timestamptz AND id < $4))'
  }
  const rows = (await query(`SELECT * FROM generations WHERE user_id = $1 ${after} ORDER BY created_at DESC, id DESC LIMIT $2`, params)).rows
  const page = rows.slice(0, limit)
  const last = page.at(-1)
  return { generations: page.map(toView), nextToken: rows.length > limit ? Buffer.from(`${new Date(last.created_at).toISOString()}|${last.id}`).toString('base64url') : undefined }
}

/** DELETE /api/generations/:id - only the user who created it. Removes both images and the record. */
async function remove(id, owner) {
  requireStorage()
  const row = await load(id, owner)
  await Promise.all([row.original_key, row.result_key].filter(Boolean).map((k) => storage.deleteObject(k))) // if this fails the record stays, so the delete can be retried
  await query('DELETE FROM generations WHERE id = $1', [id])
}

/** Removes a generation that will never have a result (its job failed): the stored original and the record. Never throws. */
async function discard(id) {
  if (!id) return
  try {
    const row = await load(id)
    await Promise.all([row.original_key, row.result_key].filter(Boolean).map((k) => storage.deleteObject(k)))
    await query('DELETE FROM generations WHERE id = $1', [id])
  } catch (e) { console.error('[storage] could not remove an unfinished generation', e.message) }
}

/** Display name of the template: the optional form field `template_name` (what the user sees in the app), else the API's own template id. */
const label = (req, fallback) => (typeof req.body?.template_name === 'string' && req.body.template_name.trim() ? req.body.template_name.trim().slice(0, 120) : fallback)

/** Add a `generation` field to a response payload when storage produced one. */
const attach = (payload, generation) => (generation ? { ...payload, generation } : payload)

module.exports = { enabled, begin, linkTask, complete, completeByTask, create, get, download, saveResult, list, remove, discard, label, attach }
