const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

/** Private temp directory for in-flight uploads. Files only live here while a request is being processed. */
const UPLOAD_DIR = path.join(os.tmpdir(), 'ai-photo-generator-uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o700 })

/** Delete one file, retrying briefly when the OS still holds it open (EBUSY/EPERM on Windows). Never throws. */
async function removeOne(p) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try { await fsp.unlink(p); return } catch (e) {
      if (e.code === 'ENOENT') return
      if (!['EBUSY', 'EPERM', 'EACCES'].includes(e.code) || attempt === 5) { console.warn('[tmp] could not delete', path.basename(p), e.code); return }
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
    }
  }
}

/** Delete files, ignoring ones that are already gone. Never throws. */
async function removeFiles(paths) {
  await Promise.all(paths.filter(Boolean).map(removeOne))
}

/** Safety net: remove anything older than maxAgeMs (crash leftovers). */
async function sweepOldFiles(maxAgeMs = 60 * 60 * 1000) {
  try {
    const now = Date.now()
    for (const name of await fsp.readdir(UPLOAD_DIR)) {
      const p = path.join(UPLOAD_DIR, name)
      const st = await fsp.stat(p).catch(() => null)
      if (st && st.isFile() && now - st.mtimeMs > maxAgeMs) await fsp.unlink(p).catch(() => {})
    }
  } catch { /* directory missing is fine */ }
}

module.exports = { UPLOAD_DIR, removeFiles, sweepOldFiles }
