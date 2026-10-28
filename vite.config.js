import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Single source for the template gallery: every image in /public/images/template/ is listed in the virtual module
 * `virtual:template-images` (an array of filenames, natural-sorted). Home's "Trending Templates" and the Explore page
 * both import it, so dropping a new image into that folder shows it in both places - no list to edit.
 * Dev server: the folder is watched and the page reloads when a file is added / removed. Build: the folder is scanned at build time.
 */
function templateFolder() {
  const VIRTUAL = 'virtual:template-images'
  const RESOLVED = `\0${VIRTUAL}`
  const dir = path.resolve(process.cwd(), 'public/images/template')
  const IMAGE = /\.(png|jpe?g|webp|avif)$/i
  const scan = () => {
    try {
      return fs.readdirSync(dir)
        .filter((f) => IMAGE.test(f) && !f.startsWith('.'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
    } catch { return [] } // folder missing -> empty gallery
  }
  return {
    name: 'template-folder',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(scan())}` : null),
    configureServer(server) {
      server.watcher.add(dir)
      const inFolder = (file) => path.resolve(file).startsWith(dir + path.sep) && IMAGE.test(file)
      const refresh = (file) => {
        if (!inFolder(file)) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh).on('unlink', refresh)
    },
  }
}

/**
 * Explore category folders. `virtual:explore-folders` = { "<folder path relative to /public/images>": ["file.jpg", ...] } (natural-sorted),
 * built from every sub-folder of /public/images/explore/ plus the extra folders listed in EXTRA below.
 * Only real photos (png/jpg/jpeg/webp/avif) are listed. Add a photo to one of these folders and it appears on /explore automatically.
 */
const EXPLORE_EXTRA_FOLDERS = ['Linkedin Headshot', 'Top Carousel'] // category folders that live directly in /public/images
function exploreFolders() {
  const VIRTUAL = 'virtual:explore-folders'
  const RESOLVED = `\0${VIRTUAL}`
  const images = path.resolve(process.cwd(), 'public/images')
  const IMAGE = /\.(png|jpe?g|webp|avif)$/i // photos only (the old generated .svg placeholders are ignored)
  const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  const list = (rel) => {
    try { return fs.readdirSync(path.join(images, rel)).filter((f) => IMAGE.test(f) && !f.startsWith('.')).sort(natural) } catch { return [] }
  }
  // Image width/height from the file header (JPEG SOFn / PNG IHDR); null for other formats. Used to pick portrait vs landscape cards.
  const dims = (file) => {
    try {
      const fd = fs.openSync(file, 'r'); const buf = Buffer.alloc(262144); const n = fs.readSync(fd, buf, 0, buf.length, 0); fs.closeSync(fd)
      if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
      if (buf[0] === 0xff && buf[1] === 0xd8) {
        let i = 2
        while (i + 9 < n) {
          if (buf[i] !== 0xff) { i++; continue }
          const m = buf[i + 1]
          if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]
          i += 2 + buf.readUInt16BE(i + 2)
        }
      }
    } catch { /* unreadable -> unknown */ }
    return null
  }
  const scan = () => {
    const out = {}
    try {
      for (const d of fs.readdirSync(path.join(images, 'explore'), { withFileTypes: true })) {
        if (!d.isDirectory()) continue
        out[`explore/${d.name}`] = list(`explore/${d.name}`)
        // one level of sub-folders too (e.g. explore/Hairstyle/baby)
        for (const sd of fs.readdirSync(path.join(images, 'explore', d.name), { withFileTypes: true })) if (sd.isDirectory()) out[`explore/${d.name}/${sd.name}`] = list(`explore/${d.name}/${sd.name}`)
      }
    } catch { /* no explore folder yet */ }
    for (const name of EXPLORE_EXTRA_FOLDERS) out[name] = list(name)
    return out
  }
  const watched = [path.join(images, 'explore'), ...EXPLORE_EXTRA_FOLDERS.map((n) => path.join(images, n))]
  return {
    name: 'explore-folders',
    resolveId: (id) => (id === VIRTUAL ? RESOLVED : null),
    load: (id) => {
      if (id !== RESOLVED) return null
      const out = scan(); const sizes = {}
      for (const [dir, files] of Object.entries(out)) for (const f of files) { const d = dims(path.join(images, dir, f)); if (d) sizes[`${dir}/${f}`] = d }
      return `export default ${JSON.stringify(out)}
export const sizes = ${JSON.stringify(sizes)}`
    },
    configureServer(server) {
      watched.forEach((w) => server.watcher.add(w))
      const refresh = (file) => {
        const f = path.resolve(file)
        if (!watched.some((w) => f.startsWith(w + path.sep))) return
        const mod = server.moduleGraph.getModuleById(RESOLVED)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh).on('unlink', refresh)
    },
  }
}

// The dev server always runs on http://localhost:5173 (and fails loudly if that port is taken, instead of quietly moving to 5174, 5175...): Google sign-in only works from
// origins listed under "Authorized JavaScript origins" of the OAuth client, so the origin must never change by surprise. The backend CORS_ORIGIN already allows it.
export default defineConfig({ plugins: [react(), templateFolder(), exploreFolders()], server: { port: 5173, strictPort: true } })
