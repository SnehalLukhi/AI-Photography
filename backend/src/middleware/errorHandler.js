const multer = require('multer')
const AppError = require('../utils/AppError')

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: [413, 'FILE_TOO_LARGE', 'The uploaded image is larger than the allowed size (10 MB).'],
  LIMIT_UNEXPECTED_FILE: [400, 'UNEXPECTED_FIELD', 'Unexpected file field. Send a single image in the field "image".'],
  LIMIT_FILE_COUNT: [400, 'TOO_MANY_FILES', 'Too many files. Send exactly one image in the field "image".'],
  LIMIT_PART_COUNT: [400, 'TOO_MANY_PARTS', 'Too many form parts in the request.'],
  LIMIT_FIELD_VALUE: [400, 'FIELD_TOO_LONG', 'A form field value is too long.'],
}

function notFound(req, res) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` } })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500
  let code = 'INTERNAL_ERROR'
  let message = 'Something went wrong on the server.'
  let details

  if (err instanceof AppError) {
    ;({ status, code, message, details } = err)
  } else if (err instanceof multer.MulterError) {
    const [s, c, m] = MULTER_MESSAGES[err.code] || [400, 'UPLOAD_ERROR', err.message]
    status = s; code = c; message = m
  } else if (err?.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    status = 400; code = 'BAD_REQUEST'; message = 'Malformed request body.'
  } else if (err?.status && err.status < 500) {
    status = err.status; code = 'BAD_REQUEST'; message = err.message
  }

  if (status >= 500) console.error(`[error] ${req.method} ${req.originalUrl}`, err)
  if (res.headersSent) return
  res.status(status).json({ success: false, error: { code, message, ...(details ? { details } : {}) } })
}

module.exports = { notFound, errorHandler }
