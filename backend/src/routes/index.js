const express = require('express')
const rateLimit = require('express-rate-limit')
const env = require('../config/env')
const { health } = require('../controllers/health.controller')
const photos = require('../controllers/photos.controller')
const cartoon = require('../controllers/cartoon.controller')
const beard = require('../controllers/beard.controller')
const hairstyle = require('../controllers/hairstyle.controller')
const generationsCtl = require('../controllers/generations.controller')
const requireApiKey = require('../middleware/requireApiKey')
const { uploadImage } = require('../middleware/upload')
const { requireAuth, dailyQuota } = require('../middleware/requireAuth')
const authCtl = require('../controllers/auth.controller')
const chargeCoins = require('../middleware/chargeCoins')
const walletCtl = require('../controllers/wallet.controller')

const router = express.Router()

const generateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please wait a moment and try again.' } }),
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.auth.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait a few minutes and try again.' } }),
})

router.get('/health', health)

// Accounts
router.post('/auth/google', authLimiter, authCtl.google)
router.post('/auth/apple', authLimiter, authCtl.apple)
router.get('/auth/me', requireAuth, authCtl.me)

// Coins
router.get('/plans', walletCtl.listPlans)
router.get('/coin-packs', walletCtl.listPacks)
router.get('/wallet', requireAuth, walletCtl.getWallet)
router.post('/wallet/redeem', authLimiter, requireAuth, walletCtl.redeem) // limited like login: codes must not be guessable by trying
router.post('/wallet/checkout', requireAuth, walletCtl.checkout)
router.post('/wallet/verify-payment', requireAuth, walletCtl.verifyPayment)
router.post('/webhooks/razorpay', walletCtl.razorpayWebhook) // public: Razorpay calls it, the signature header is the proof

// requireApiKey runs first so uploads are not even read when the server is not configured.
router.post('/photos/generate', generateLimiter, requireAuth, requireApiKey, dailyQuota, chargeCoins, uploadImage, photos.generate)
router.post('/cartoon/generate', generateLimiter, requireAuth, requireApiKey, dailyQuota, chargeCoins, uploadImage, cartoon.generate) // Cartoon Yourself (separate from AI Photography)
router.post('/beard/generate', generateLimiter, requireAuth, requireApiKey, dailyQuota, chargeCoins, uploadImage, beard.generate) // AI Beard Styling (separate from AI Photography)
router.post('/hairstyle/generate', generateLimiter, requireAuth, requireApiKey, dailyQuota, chargeCoins, uploadImage, hairstyle.generate) // Hairstyle Changer Premium (Fun: Baby / Men / Woman)

// Stored images (DigitalOcean Spaces): original photo + AI result of one generation. Only the user who created a generation can read or change it.
router.post('/generations', generateLimiter, requireAuth, uploadImage, generationsCtl.create)
router.post('/generations/:id/result', generateLimiter, requireAuth, uploadImage, generationsCtl.saveResult)
router.get('/generations', requireAuth, generationsCtl.list) // the logged-in user's generations
router.get('/generations/:id', requireAuth, generationsCtl.get)
router.delete('/generations/:id', requireAuth, generationsCtl.remove)
router.get('/photos/tasks/:taskId', requireAuth, requireApiKey, photos.taskStatus)

module.exports = router
