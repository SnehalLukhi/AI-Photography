const crypto = require('node:crypto')
const multer = require('multer')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { UPLOAD_DIR } = require('../utils/tempFiles')

// AI Photography accepts JPEG, JPG, PNG and WEBP (<= 10 MB, < 4096x4096 px).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  // Random name, no user-controlled path or extension.
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
})

const upload = multer({
  storage,
  // style_desc is at most 1000 characters (up to ~4 KB in UTF-8); leave headroom for the other text fields.
  limits: { fileSize: env.upload.maxFileSizeBytes, files: 1, fields: 6, parts: 8, fieldSize: 8 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new AppError(415, 'UNSUPPORTED_FILE_TYPE', `"${file.fieldname}" must be a JPG, JPEG, PNG or WebP image (received ${file.mimetype || 'unknown type'}).`))
    }
    cb(null, true)
  },
})

/** multipart/form-data: one image in the field "image" (same name as the AILabTools parameter). */
const uploadImage = upload.single('image')

module.exports = { uploadImage }
