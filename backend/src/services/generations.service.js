const crypto = require('node:crypto')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const storage = require('./storage.service')
const ailab = require('./ailab.service')
const { sniffMime } = require('./image.service')

/**
 * One "generation" = the user's original photo + the AI result, kept together in DigitalOcean Spaces:
 *   generations/<id>/original.<ext>   generations/<id>/result.<ext>   generations/<id>/meta.json
 *   tasks/<taskId>.json               -> { id }   (lets a later poll of /api/photos/tasks/:taskId find its generation)
 * The id is a random UUID (the only "key" to a generation - there is no user account yet).
 */
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const metaKey = (id) => `generations/${id}/meta.json`
const taskKey = (taskId) => `tasks/${encodeURIComponent(taskId)}.json`

const enabled = () => storage.isConfigured()
const putJson = (key, obj) => storage.putObject(key, JSON.stringify(obj), 'application/json')
async function getJson(key) {
  const buf = await storage.getObject(key)
  return buf ? JSON.parse(buf.toString('utf8')) : null
}

function requireStorage() {
  if (!enabled()) throw new AppError(503, 'STORAGE_NOT_CONFIGURED', 'Image storage is not configured (set SPACES_KEY, SPACES_SECRET and SPACES_BUCKET).')
}

async function loadMeta(id, owner) {
  if (!ID_RE.test(id)) throw new AppError(400, 'INVALID_GENERATION_ID', 'Invalid generation id.')
  const meta = await getJson(metaKey(id))
  if (!meta || (owner !== undefined && meta.owner !== owner)) throw new AppError(404, 'GENERATION_NOT_FOUND', 'No generation found for this id.') // someone else's generation looks the same as a missing one
  return meta
}

/** Public shape returned to the frontend: both images as signed URLs (valid for env.spaces.signedUrlTtlSeconds). */
async function toView(meta) {
  const sign = async (o) => (o ? { url: await storage.signedUrl(o.key), mimeType: o.mimeType } : null)
  return {
    id: meta.id, status: meta.result ? 'completed' : 'pending', createdAt: meta.createdAt, api: meta.api, template: meta.template || null,
    original: await sign(meta.original), result: await sign(meta.result), urlExpiresInSeconds: env.spaces.signedUrlTtlSeconds,
  }
}

async function storeImage(meta, kind, buffer, mimeType) {
  const key = `generations/${meta.id}/${kind}.${EXT[mimeType] || 'bin'}`
  await storage.putObject(key, buffer, mimeType)
  meta[kind] = { key, mimeType }
  await putJson(metaKey(meta.id), meta)
}

/**
 * Save the original photo and start a generation record. Never throws: returns null when storage is off or fails (generation still works).
 * `owner` (the user id) puts the generation in that user's list: owners/<owner>/<reversed time>_<id>, so a listing returns the newest first.
 */
async function begin(image, { api, template, owner } = {}) {
  if (!enabled()) return null
  try {
    const meta = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), api, template, original: null, result: null }
    if (owner) {
      meta.owner = owner
      meta.ownerKey = `owners/${owner}/${String(9999999999999 - Date.now()).padStart(13, '0')}_${meta.id}`
      await putJson(meta.ownerKey, { id: meta.id })
    }
    await storeImage(meta, 'original', image.buffer, image.mimeType)
    return meta.id
  } catch (e) {
    console.error('[storage] could not save the original image', e.message)
    return null
  }
}

/** Remember which AILabTools task belongs to a generation (so polling can find it later). Never throws. */
async function linkTask(id, taskId) {
  if (!id || !taskId) return
  try {
    const meta = await loadMeta(id)
    meta.taskId = taskId
    await Promise.all([putJson(metaKey(id), meta), putJson(taskKey(taskId), { id })])
  } catch (e) { console.error('[storage] could not link task', e.message) }
}

async function idForTask(taskId) {
  if (!enabled()) return null
  try { return (await getJson(taskKey(taskId)))?.id || null } catch (e) { console.error('[storage] task lookup failed', e.message); return null }
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

/**
 * Called with every AILabTools task state. When the task has succeeded, downloads the first result image and stores it next to the original
 * (once; repeated calls just return the stored view). Never throws: a storage problem is reported as { id, stored: false }, the AI result URLs stay in the response.
 */
async function complete(id, result) {
  if (!id) return null
  try {
    let meta = await loadMeta(id)
    if (!meta.result && result.status === 'succeeded') {
      if (!result.images?.length) return { id, stored: false }
      const image = await downloadFirstImage(result.images)
      if (!image) return { id, stored: false }
      meta = await loadMeta(id) // re-read: a concurrent poll may have stored it already
      if (!meta.result) await storeImage(meta, 'result', image.buffer, image.mimeType)
    }
    return { stored: true, ...(await toView(meta)) }
  } catch (e) {
    console.error('[storage] could not save the generated image', e.message)
    return { id, stored: false }
  }
}

/** For GET /api/photos/tasks/:taskId: finish storing once the task is done. */
async function completeByTask(taskId, result, owner) {
  const id = await idForTask(taskId)
  if (id && (await getJson(metaKey(id)).catch(() => null))?.owner !== owner) throw new AppError(404, 'TASK_NOT_FOUND', 'No task found for this id.')
  return complete(id, result)
}

/** Strict reads/writes for the /api/generations endpoints (these do throw AppErrors). */
async function create(image, info) {
  requireStorage()
  const id = await begin(image, info)
  if (!id) throw new AppError(502, 'STORAGE_FAILED', 'Could not save the image to storage.')
  return toView(await loadMeta(id))
}

async function get(id, owner) {
  requireStorage()
  return toView(await loadMeta(id, owner))
}

async function saveResult(id, owner, image) {
  requireStorage()
  const meta = await loadMeta(id, owner)
  if (meta.result) throw new AppError(409, 'RESULT_ALREADY_SAVED', 'This generation already has a result image.')
  await storeImage(meta, 'result', image.buffer, image.mimeType)
  return toView(meta)
}

/** GET /api/generations - one user's generations, newest first. `nextToken` continues the list. */
async function list(owner, { limit = 20, token } = {}) {
  if (!enabled()) return { generations: [] } // storage off: nothing is saved, so there is nothing to list (not an error)
  const page = await storage.listKeys(`owners/${owner}/`, { limit, token })
  const metas = await Promise.all(page.keys.map((k) => getJson(metaKey(k.split('_').pop())).catch(() => null)))
  const generations = await Promise.all(metas.filter(Boolean).map(toView))
  return { generations, nextToken: page.nextToken }
}

/** DELETE /api/generations/:id - only the user who created it. Removes both images, the record and its index entries. */
async function remove(id, owner) {
  requireStorage()
  const meta = await loadMeta(id, owner)
  const keys = [meta.original?.key, meta.result?.key, metaKey(id), meta.ownerKey, meta.taskId && taskKey(meta.taskId)].filter(Boolean)
  await Promise.all(keys.map((k) => storage.deleteObject(k)))
}

/** Display name of the template: the optional form field `template_name` (what the user sees in the app), else the API's own template id. */
const label = (req, fallback) => (typeof req.body?.template_name === 'string' && req.body.template_name.trim() ? req.body.template_name.trim().slice(0, 120) : fallback)

/** Add a `generation` field to a response payload when storage produced one. */
const attach = (payload, generation) => (generation ? { ...payload, generation } : payload)

module.exports = { enabled, begin, linkTask, complete, completeByTask, create, get, saveResult, list, remove, label, attach }
