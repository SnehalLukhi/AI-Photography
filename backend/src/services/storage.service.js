const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const env = require('../config/env')

/**
 * DigitalOcean Spaces (S3 API). ONLY images are stored here, and every image is public-read: anyone with its URL can view it.
 * (Which images belong to which user and generation lives in the SQLite database, see generations.service.js.)
 */
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

async function putImage(key, body, contentType) {
  await s3().send(new PutObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key), Body: body, ContentType: contentType, ACL: 'public-read', CacheControl: 'public, max-age=31536000, immutable' }))
}

async function deleteObject(key) {
  await s3().send(new DeleteObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key) }))
}

/** The stored bytes of an image (used to hand the browser a real file download). */
async function getImage(key) {
  const out = await s3().send(new GetObjectCommand({ Bucket: env.spaces.bucket, Key: fullKey(key) }))
  return { buffer: Buffer.from(await out.Body.transformToByteArray()), mimeType: out.ContentType }
}

/** Permanent public URL of a stored image (SPACES_PUBLIC_URL, e.g. the Space's CDN address, else the Space's own address). */
const publicUrl = (key) => `${env.spaces.publicUrl}/${fullKey(key)}`

module.exports = { isConfigured, putImage, getImage, deleteObject, publicUrl }
