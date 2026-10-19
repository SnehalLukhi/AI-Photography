const sharp = require('sharp')
const AppError = require('../utils/AppError')

// libvips keeps decoded files in a cache and can hold OS file handles, which blocks deleting temp uploads on Windows.
sharp.cache(false)

/**
 * AILabTools AI Photography image requirements (official docs):
 *   formats JPEG / JPG / PNG / WEBP, size <= 10 MB, resolution < 4096 x 4096 px.
 */
const MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 4095
const FORMATS = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const EXT = { jpeg: 'jpg', png: 'png', webp: 'webp' }

/**
 * Verify the upload really is a JPEG/PNG/WebP image (by decoding its header, not by trusting the client's
 * MIME type). Valid images are forwarded UNCHANGED; only an image of 4096 px or more on a side is
 * downscaled (same format) because the API rejects those.
 * @returns {{ buffer: Buffer, mimeType: string, filename: string, width: number, height: number, resized: boolean }}
 */
async function prepareImage(filePath, label = 'image') {
  let meta
  try {
    meta = await sharp(filePath, { failOn: 'error' }).metadata()
  } catch {
    throw new AppError(422, 'INVALID_IMAGE', `"${label}" is not a valid image file.`)
  }
  const format = meta.format
  if (!FORMATS[format]) {
    throw new AppError(415, 'UNSUPPORTED_FILE_TYPE', `"${label}" must be a JPG, PNG or WebP image (detected: ${format || 'unknown'}).`)
  }
  if (!meta.width || !meta.height) throw new AppError(422, 'INVALID_IMAGE', `"${label}" has no readable dimensions.`)

  const fs = require('node:fs/promises')
  let buffer
  let { width, height } = meta
  let resized = false

  if (Math.max(width, height) > MAX_SIDE) {
    const out = await sharp(filePath, { failOn: 'error' })
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .toFormat(format, format === 'jpeg' ? { quality: 92 } : undefined)
      .toBuffer({ resolveWithObject: true })
    buffer = out.data; width = out.info.width; height = out.info.height; resized = true
  } else {
    buffer = await fs.readFile(filePath)
  }
  if (buffer.length > MAX_BYTES) {
    throw new AppError(413, 'FILE_SIZE_EXCEEDS_LIMIT', `"${label}" is larger than the 10 MB limit.`)
  }
  return { buffer, mimeType: FORMATS[format], filename: `image.${EXT[format]}`, width, height, resized }
}

/** Detect the MIME type of an image buffer (used when streaming a downloaded result). */
function sniffMime(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp'
  return 'application/octet-stream'
}

module.exports = { prepareImage, sniffMime }
