/** Test helpers: a local stand-in for the AILabTools server (used ONLY by tests) and image builders. */
const http = require('node:http')
const fs = require('node:fs')
const sharp = require('sharp')
const { UPLOAD_DIR } = require('../src/utils/tempFiles')

const solid = (w, h, rgb, format = 'png') => sharp({ create: { width: w, height: h, channels: 3, background: rgb } })[format]().toBuffer()
const resultJpeg = () => solid(64, 64, { r: 10, g: 200, b: 90 }, 'jpeg')

/** Split a multipart/form-data body into parts. */
function parseMultipart(body, contentType) {
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1]
  if (!boundary) return null
  const parts = []
  const sep = Buffer.from(`--${boundary}`)
  let idx = body.indexOf(sep)
  while (idx !== -1) {
    const next = body.indexOf(sep, idx + sep.length)
    if (next === -1) break
    const chunk = body.subarray(idx + sep.length + 2, next - 2) // strip CRLF around the part
    const headEnd = chunk.indexOf('\r\n\r\n')
    const head = chunk.subarray(0, headEnd).toString()
    parts.push({
      name: /name="([^"]+)"/.exec(head)?.[1],
      filename: /filename="([^"]*)"/.exec(head)?.[1],
      type: /Content-Type:\s*(.+)/i.exec(head)?.[1]?.trim(),
      data: chunk.subarray(headEnd + 4),
    })
    idx = next
  }
  return parts
}

/** Mock AILabTools. `handlers` decides every response; every request is recorded in `calls`. */
async function startMockAilab(handlers) {
  const calls = []
  const server = http.createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', async () => {
      const body = Buffer.concat(chunks)
      const call = { method: req.method, url: req.url, headers: req.headers, body, parts: parseMultipart(body, req.headers['content-type'] || '') }
      calls.push(call)
      const out = await handlers(call, calls.length)
      res.writeHead(out.status || 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(out.json ?? {}))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  return { url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((r) => server.close(r)) }
}

async function startApp(app) {
  const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)) })
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) }
}

function form(files, fields = {}) {
  const f = new FormData()
  for (const [name, { buffer, type, filename }] of Object.entries(files)) f.append(name, new Blob([buffer], { type }), filename)
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

const tempFiles = () => fs.readdirSync(UPLOAD_DIR)
/** Files that appeared in the upload dir since `before` (ignores leftovers from older runs). */
const newTempFiles = (before) => tempFiles().filter((f) => !before.includes(f))

module.exports = { solid, resultJpeg, parseMultipart, startMockAilab, startApp, form, tempFiles, newTempFiles }
