// Creates (or resets) a dashboard admin straight in the database:  node scripts/create-admin.js <username> [password]
// Without a password a random one is made and printed once. Uses DATABASE_URL from backend/.env.
const crypto = require('node:crypto')
const adminAuth = require('../src/services/adminAuth.service')
const db = require('../src/db')

;(async () => {
  const username = String(process.argv[2] || '').trim().toLowerCase()
  if (!username) { console.error('Usage: node scripts/create-admin.js <username> [password]'); process.exit(1) }
  const password = process.argv[3] || crypto.randomBytes(12).toString('base64url')
  await db.ready()
  const existing = (await adminAuth.list()).find((a) => a.username === username)
  if (existing) await adminAuth.update(existing.id, { password, active: true }, null)
  else await adminAuth.create(username, password)
  console.log(`${existing ? 'Password reset' : 'Admin created'}\nuser name: ${username}\npassword:  ${password}`)
  await db.close()
})().catch((e) => { console.error('Failed:', e.message); process.exit(1) })
