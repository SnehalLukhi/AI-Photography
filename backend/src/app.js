const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const env = require('./config/env')
const routes = require('./routes')
const { notFound, errorHandler } = require('./middleware/errorHandler')

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1) // correct client IPs for rate limiting behind a reverse proxy

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })) // allow the frontend to load returned images
app.use(cors({ origin: env.corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE'], maxAge: 600 }))
app.use('/api/admin', express.json({ limit: '2mb' })) // bulk template uploads carry long prompts; the parser below skips a body that is already read
app.use(express.json({ limit: '100kb', verify: (req, _res, buf) => { if (req.originalUrl.startsWith('/api/webhooks/')) req.rawBody = buf } })) // webhooks are signed over the exact bytes received

app.use('/api', routes)
app.use(notFound)
app.use(errorHandler)

module.exports = app
