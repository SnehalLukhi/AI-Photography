const crypto = require('node:crypto')
const fs = require('node:fs')
const multer = require('multer')
const env = require('../config/env')
const AppError = require('../utils/AppError')
const { UPLOAD_DIR } = require('../utils/tempFiles')

// AI Photography accepts JPEG, JPG, PNG and WEBP (<= 10 MB, < 4096x4096 px).
const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

const storage = multer.diskStorage({
  // multer does not create a directory returned by a destination callback, and the dir was only created once at start-up: if the OS (temp cleanup, Storage Sense) or a
  // person removes it while the server runs, every upload failed with "ENOENT ... open ...\ai-photo-generator-uploads\<id>.upload". Re-create it for each upload.
  destination: (_req, _file, cb) => fs.mkdir(UPLOAD_DIR, { recursive: true, mode: 0o700 }, (err) => cb(err, UPLOAD_DIR)),
  // Random name, no user-controlled path or extension.
  filename: (_req, _file, cb) => cb(null, `${crypto.randomUUID()}.upload`),
})

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new AppError(415, 'UNSUPPORTED_FILE_TYPE', `"${file.fieldname}" must be a JPG, JPEG, PNG or WebP image (received ${file.mimetype || 'unknown type'}).`))
  }
  cb(null, true)
}

const upload = multer({
  storage,
  // style_desc is at most 1000 characters (up to ~4 KB in UTF-8); leave headroom for the other text fields.
  limits: { fileSize: env.upload.maxFileSizeBytes, files: 1, fields: 6, parts: 8, fieldSize: 8 * 1024 },
  fileFilter,
})

/** multipart/form-data: one image in the field "image" (same name as the AILabTools parameter). */
const uploadImage = upload.single('image')

/**
 * Template admin forms: the picture in the field "image" plus the template's text fields (prompts are up to 1000 characters).
 * Only parsed when the request is multipart; a JSON request passes straight through.
 */
const templateForm = multer({ storage, limits: { fileSize: env.upload.maxFileSizeBytes, files: 1, fields: 20, parts: 24, fieldSize: 16 * 1024 }, fileFilter }).single('image')
const uploadTemplateImage = (req, res, next) => (req.is('multipart/form-data') ? templateForm(req, res, next) : next())

/** Bulk template add: up to 100 pictures in the field "images" plus the text fields "templates" (a JSON array) and "defaults" (JSON). Only parsed for multipart requests. */
const bulkForm = multer({ storage, limits: { fileSize: env.upload.maxFileSizeBytes, files: 100, fields: 10, parts: 120, fieldSize: 2 * 1024 * 1024 }, fileFilter }).array('images', 100)
const uploadTemplateImages = (req, res, next) => (req.is('multipart/form-data') ? bulkForm(req, res, next) : next())

module.exports = { uploadImage, uploadTemplateImage, uploadTemplateImages }
