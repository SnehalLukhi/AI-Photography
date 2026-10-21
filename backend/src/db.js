const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite') // built into Node >= 22.13 (no native module to install)
const env = require('./config/env')

/** Users, coin balances and daily usage live in one SQLite file (DATABASE_PATH; ':memory:' in tests). Keep the file on a persistent disk / volume. */
let db
let inTx = false

function getDb() {
  if (db) return db
  if (env.databasePath !== ':memory:') fs.mkdirSync(path.dirname(env.databasePath), { recursive: true })
  db = new DatabaseSync(env.databasePath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL, -- '' for accounts that only use Google
      coins INTEGER NOT NULL DEFAULT 0,
      google_sub TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS usage (
      user_id TEXT NOT NULL,
      day TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, day)
    );
    -- every change of a balance, newest last; (reason, ref) is unique when ref is set, so a payment or code can only be credited once
    CREATE TABLE IF NOT EXISTS coin_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      delta INTEGER NOT NULL,
      reason TEXT NOT NULL,
      ref TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS coin_ledger_user ON coin_ledger (user_id, id);
    CREATE UNIQUE INDEX IF NOT EXISTS coin_ledger_ref ON coin_ledger (reason, ref) WHERE ref IS NOT NULL;
    -- only the SHA-256 of a reset token is stored, never the token itself (the e-mailed link is the only copy)
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at INTEGER,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS password_resets_user ON password_resets (user_id, created_at);
    CREATE TABLE IF NOT EXISTS redeem_codes (
      code TEXT PRIMARY KEY,
      coins INTEGER NOT NULL,
      redeemed_by TEXT,
      redeemed_at TEXT,
      created_at TEXT NOT NULL
    );
  `)
  // database created before coins existed: add the column and give those accounts the signup bonus once
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'coins')) db.exec('ALTER TABLE users ADD COLUMN coins INTEGER NOT NULL DEFAULT 0')
  if (!db.prepare('PRAGMA table_info(users)').all().some((c) => c.name === 'google_sub')) db.exec('ALTER TABLE users ADD COLUMN google_sub TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL')
  const missing = db.prepare("SELECT id FROM users WHERE id NOT IN (SELECT user_id FROM coin_ledger WHERE reason = 'signup_bonus')").all()
  for (const { id } of missing) {
    db.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').run(env.coins.signupBonus, id)
    db.prepare("INSERT INTO coin_ledger (user_id, delta, reason, ref, created_at) VALUES (?, ?, 'signup_bonus', ?, ?)").run(id, env.coins.signupBonus, id, new Date().toISOString())
  }
  return db
}

/** Runs fn in one SQLite transaction (all-or-nothing). Everything inside is synchronous, so requests cannot interleave. Nested calls join the outer one. */
function tx(fn) {
  if (inTx) return fn()
  const d = getDb()
  d.exec('BEGIN IMMEDIATE')
  inTx = true
  try {
    const out = fn()
    d.exec('COMMIT')
    return out
  } catch (e) {
    d.exec('ROLLBACK')
    throw e
  } finally {
    inTx = false
  }
}

module.exports = { getDb, tx }
