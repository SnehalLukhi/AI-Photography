const env = require('../config/env')
const apiusage = require('../services/apiusage.service')

/**
 * For the generate endpoints: logs the call to the image provider once the response is sent (see apiusage.service). Needs the user (requireAuth) before it.
 * 200 = succeeded, 202 = still processing (finished later: see trackTask), 4xx/5xx = failed (the coins are refunded by chargeCoins).
 */
exports.trackApiCall = (api) => (req, res, next) => {
  const t0 = Date.now()
  let body
  const json = res.json.bind(res)
  res.json = (b) => { body = b; return json(b) }
  res.on('finish', () => {
    const code = res.statusCode
    apiusage.record({
      userId: req.user.id, api, template: typeof req.body?.template_name === 'string' ? req.body.template_name.trim().slice(0, 120) : null,
      status: code >= 400 ? 'failed' : code === 202 ? 'processing' : 'succeeded', httpStatus: code, errorCode: code >= 400 ? body?.error?.code || `HTTP_${code}` : null,
      durationMs: Date.now() - t0, coins: code >= 400 ? 0 : env.coins.perGeneration, taskId: body?.taskId, requestId: body?.requestId, logId: body?.logId, generationId: body?.generation?.id,
    })
  })
  next()
}

/** For the task-status endpoint: when a job that was still processing is now finished, update its log entry. */
exports.trackTask = (req, res, next) => {
  let body
  const json = res.json.bind(res)
  res.json = (b) => { body = b; return json(b) }
  res.on('finish', () => { if (res.statusCode === 200 && body?.status === 'succeeded') apiusage.finishTask(req.params.taskId, 'succeeded') })
  next()
}
