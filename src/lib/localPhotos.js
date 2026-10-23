/**
 * The user's ORIGINAL photos live only in their browser (IndexedDB), keyed by the generation id: the server stores just the AI image.
 * Every function is safe to call when IndexedDB is unavailable (private window, blocked storage): saving does nothing, reading gives null.
 */
const DB_NAME = 'pictrify-originals'
const STORE = 'photos'
const MAX_SIDE = 1280 // a saved original is scaled down to this (long side) and kept as a JPEG, so a lot of them fit

let dbPromise
const open = () => (dbPromise ??= new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'))
  const req = indexedDB.open(DB_NAME, 1)
  req.onupgradeneeded = () => req.result.createObjectStore(STORE)
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
}).catch((e) => { dbPromise = undefined; throw e }))

const run = async (mode, fn) => {
  const db = await open()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req?.result ?? null)
    tx.onerror = tx.onabort = () => reject(tx.error)
  })
}

/** The photo scaled down (long side MAX_SIDE) as a JPEG blob; the file itself when it cannot be decoded here. */
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file)
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) })
    canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close?.()
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b || file), 'image/jpeg', 0.9))
  } catch { return file }
}

/** Remembers the original photo of a generation. Never throws. */
export async function saveOriginal(id, file) {
  if (!id || !file) return
  try { const blob = await shrink(file); await run('readwrite', (s) => s.put(blob, id)) } catch { /* storage unavailable: My Creations just shows the AI image */ }
}

/** The saved original as a Blob, or null (other browser / device, cleared site data, nothing saved). */
export async function getOriginal(id) {
  try { return (await run('readonly', (s) => s.get(id))) || null } catch { return null }
}

/** Forgets the original of a deleted creation. Never throws. */
export async function deleteOriginal(id) {
  try { await run('readwrite', (s) => s.delete(id)) } catch { /* nothing to do */ }
}
