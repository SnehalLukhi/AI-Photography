const express = require('express')
const rateLimit = require('express-rate-limit')
const env = require('../config/env')
const { health } = require('../controllers/health.controller')
const photos = require('../controllers/photos.controller')
const cartoon = require('../controllers/cartoon.controller')
const beard = require('../controllers/beard.controller')
const hairstyle = require('../controllers/hairstyle.controller')
const requireApiKey = require('../middleware/requireApiKey')
const { uploadImage } = require('../middleware/upload')

const router = express.Router()

const generateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } }),
})

router.get('/health', health)

// requireApiKey runs first so uploads are not even read when the server is not configured.
router.post('/photos/generate', generateLimiter, requireApiKey, uploadImage, photos.generate)
router.post('/cartoon/generate', generateLimiter, requireApiKey, uploadImage, cartoon.generate) // Cartoon Yourself (separate from AI Photography)
router.post('/beard/generate', generateLimiter, requireApiKey, uploadImage, beard.generate) // AI Beard Styling (separate from AI Photography)
router.post('/hairstyle/generate', generateLimiter, requireApiKey, uploadImage, hairstyle.generate) // Hairstyle Changer Premium (Fun: Baby / Men / Woman)
router.get('/photos/tasks/:taskId', requireApiKey, photos.taskStatus)

module.exports = router
