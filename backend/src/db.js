const env = require('./config/env')

/**
 * PostgreSQL (Supabase). All data except the images (which are in DigitalOcean Spaces) lives here.
 *   query(sql, params)  -> { rows, rowCount }      ($1, $2 ... placeholders)
 *   tx(async (db) => {})  runs db.query(...) calls in one transaction (all-or-nothing); throw to roll back
 * DATABASE_URL = the Supabase connection string. 'pglite://memory' uses an in-memory Postgres (PGlite) - for tests only.
 */
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '', -- unused: sign-in is Google only (older accounts may still have a value)
    coins INTEGER NOT NULL DEFAULT 0,
    google_sub TEXT,
    apple_sub TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_sub TEXT; -- databases created before Apple sign-in
  CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users (google_sub) WHERE google_sub IS NOT NULL;
  CREATE UNIQUE INDEX IF NOT EXISTS users_apple_sub ON users (apple_sub) WHERE apple_sub IS NOT NULL;
  CREATE TABLE IF NOT EXISTS usage (
    user_id TEXT NOT NULL,
    day TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, day)
  );
  -- every change of a balance; (reason, ref) is unique when ref is set, so a payment or code can only be credited once
  CREATE TABLE IF NOT EXISTS coin_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    delta INTEGER NOT NULL,
    reason TEXT NOT NULL,
    ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS coin_ledger_user ON coin_ledger (user_id, id);
  CREATE UNIQUE INDEX IF NOT EXISTS coin_ledger_ref ON coin_ledger (reason, ref) WHERE ref IS NOT NULL;
  CREATE TABLE IF NOT EXISTS redeem_codes (
    code TEXT PRIMARY KEY,
    coins INTEGER NOT NULL,
    redeemed_by TEXT,
    redeemed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  -- one row per Razorpay order (created when a user starts to pay; marked paid once the payment is verified)
  CREATE TABLE IF NOT EXISTS payments (
    order_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- in the smallest unit (cents)
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    payment_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS payments_user ON payments (user_id, created_at DESC);
  -- one row per generation: the user's original photo + the AI result (both are public images in the Space; only their keys are kept here)
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api TEXT,
    template TEXT,
    task_id TEXT,
    original_key TEXT NOT NULL,
    original_mime TEXT NOT NULL,
    result_key TEXT,
    result_mime TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS generations_user ON generations (user_id, created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS generations_task ON generations (task_id);
  -- Supabase exposes every table through its public REST API. Row Level Security with NO policies shuts that door: only this backend
  -- (which connects directly as the database owner, and bypasses RLS) can read or write these tables.
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
  ALTER TABLE coin_ledger ENABLE ROW LEVEL SECURITY;
  ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
`

let impl
let starting

async function connect() {
  const url = env.databaseUrl
  if (!url) throw new Error('DATABASE_URL is not set. Put the Supabase connection string in backend/.env (Supabase dashboard > Project Settings > Database > Connection string).')
  if (url.startsWith('pglite:')) {
    const { PGlite } = require('@electric-sql/pglite') // in-memory Postgres, tests only
    const pg = new PGlite()
    const wrap = (c) => async (sql, params) => { const r = await c.query(sql, params); return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length } }
    await pg.exec(SCHEMA)
    return { query: wrap(pg), transaction: (fn) => pg.transaction((t) => fn({ query: wrap(t) })), close: () => pg.close() }
  }
  const { Pool } = require('pg')
  const u = new URL(url)
  const noSsl = u.searchParams.get('sslmode') === 'disable' || ['localhost', '127.0.0.1'].includes(u.hostname)
  u.searchParams.delete('sslmode')
  const pool = new Pool({ connectionString: u.toString(), ssl: noSsl ? false : { rejectUnauthorized: false }, max: 10, connectionTimeoutMillis: 15_000 }) // Supabase: TLS, certificate not pinned
  pool.on('error', (e) => console.error('[db] idle connection error:', e.message))
  await pool.query(SCHEMA)
  return {
    query: (sql, params) => pool.query(sql, params),
    transaction: async (fn) => {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const out = await fn({ query: (sql, params) => client.query(sql, params) })
        await client.query('COMMIT')
        return out
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {})
        throw e
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}

/** Connects and creates the tables (once). Called at server start so a wrong DATABASE_URL shows up immediately. */
const ready = () => (starting ||= connect().then((i) => { impl = i }, (e) => { starting = undefined; throw e }))

const query = async (sql, params) => { await ready(); return impl.query(sql, params) }
const tx = async (fn) => { await ready(); return impl.transaction(fn) }
const close = async () => { if (impl) await impl.close(); impl = undefined; starting = undefined }

module.exports = { ready, query, tx, close }
