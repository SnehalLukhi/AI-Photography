const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const env = require('../config/env')

/** DigitalOcean Spaces client (S3 API). Objects are private; the frontend gets short-lived signed URLs. */
const isConfigured = () => !!(env.spaces.key && env.spaces.secret && env.spaces.bucket)

let client
function s3() {
  client ||= new S3Client({
    region: env.spaces.region,
    endpoint: env.spaces.endpoint,
    credentials: { accessKeyId: env.spaces.key, secretAccessKey: env.spaces.secret },
  })
  return client
}

const fullKey = (key) => (env.spaces.prefix ? `${env.spaces.prefix}/${key}` : key)

async function putObject(key, body, contentType) {
  await s3().send(new PutObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key), Body: body, ContentType: contentType, ACL: 'private' }))
}

/** @returns {Promise<Buffer|null>} null when the object does not exist */
async function getObject(key) {
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key) }))
    return Buffer.from(await out.Body.transformToByteArray())
  } catch (e) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null
    throw e
  }
}

async function deleteObject(key) {
  await s3().send(new DeleteObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key) }))
}

/** One page of keys under `prefix` (ascending key order), without the configured SPACES_PREFIX. */
async function listKeys(prefix, { limit = 50, token } = {}) {
  const out = await s3().send(new ListObjectsV2Command({ Bucket: env.spaces.bucket, Prefix: fullKey(prefix), MaxKeys: limit, ContinuationToken: token }))
  const strip = env.spaces.prefix ? env.spaces.prefix.length + 1 : 0
  return { keys: (out.Contents || []).map((o) => o.Key.slice(strip)), nextToken: out.IsTruncated ? out.NextContinuationToken : undefined }
}

/** Time-limited download URL for a private object. */
function signedUrl(key) {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key) }), { expiresIn: env.spaces.signedUrlTtlSeconds })
}

module.exports = { isConfigured, putObject, getObject, deleteObject, listKeys, signedUrl }
