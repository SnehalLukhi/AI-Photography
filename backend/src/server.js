const env = require('./config/env')
const app = require('./app')
const { sweepOldFiles } = require('./utils/tempFiles')

const server = app.listen(env.port, () => {
  console.log(`AI Photo Generator backend listening on http://localhost:${env.port}`)
  console.log(`  provider: ${env.ailab.provider} | AILAB_API_KEY: ${env.ailab.apiKey ? 'configured' : 'NOT SET (generate endpoint will answer 503)'}`)
})

// Remove any leftover temp uploads (crash leftovers) now and hourly.
sweepOldFiles()
const sweeper = setInterval(sweepOldFiles, 60 * 60 * 1000)
sweeper.unref()

function shutdown(signal) {
  console.log(`${signal} received, shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
