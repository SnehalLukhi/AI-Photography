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
    offer_id TEXT, -- the offer applied to this order, if any
    subscription_id TEXT, -- set when this is one charge (the first or a renewal) of a subscription; order_id is then the payment id
    list_amount INTEGER, -- the regular price in cents (amount is what was charged)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    paid_at TIMESTAMPTZ
  );
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS offer_id TEXT; -- databases created before offers
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS list_amount INTEGER;
  ALTER TABLE payments ADD COLUMN IF NOT EXISTS subscription_id TEXT;
  -- auto-renewing plans (Razorpay Subscriptions): one row per subscription; the coins of every charge are added by subscriptions.service
  CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    offer_id TEXT,
    cancel_requested BOOLEAN NOT NULL DEFAULT false,
    paid_count INTEGER NOT NULL DEFAULT 0,
    current_end TIMESTAMPTZ,
    charge_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions (user_id, created_at DESC);
  -- coins that came from a plan and are still unspent: they are taken away when the plan ends (coins from packs / codes / signup stay)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_coins INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS coins_expired BOOLEAN NOT NULL DEFAULT false;
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
  ALTER TABLE generations ALTER COLUMN original_key DROP NOT NULL; -- the original photo is no longer stored on the server (it stays in the user's browser)
  ALTER TABLE generations ALTER COLUMN original_mime DROP NOT NULL;
  CREATE INDEX IF NOT EXISTS generations_user ON generations (user_id, created_at DESC, id DESC);
  CREATE INDEX IF NOT EXISTS generations_task ON generations (task_id);
  -- templates a user has liked: the primary key makes a second like of the same template impossible
  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, template_id)
  );
  -- template catalogue, managed through /api/admin/templates. A category runs on one generation flow (photography | cartoon | beard | hairstyle).
  CREATE TABLE IF NOT EXISTS template_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    flow TEXT NOT NULL,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    hide_from_all BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  -- prompts are only needed by the photography flow; api_value = the provider's own value when it differs from id (hairstyle: hair_style)
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    preview_url TEXT NOT NULL,
    style_title_prompt TEXT,
    style_desc_prompt TEXT,
    api_value TEXT,
    aspect_ratio TEXT NOT NULL DEFAULT '9:16',
    cost_coins INTEGER,
    gender TEXT,
    extra JSONB NOT NULL DEFAULT '{}',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS templates_category ON templates (category_id, sort_order, created_at);
  -- Trending: a template marked here shows in Trending AND stays in its own category (see trending.service)
  ALTER TABLE templates ADD COLUMN IF NOT EXISTS trending BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE templates ADD COLUMN IF NOT EXISTS trending_position INTEGER NOT NULL DEFAULT 0;
  -- Supabase exposes every table through its public REST API. Row Level Security with NO policies shuts that door: only this backend
  -- (which connects directly as the database owner, and bypasses RLS) can read or write these tables.
  -- templates marked as Trending in the admin (ids of the frontend's templates, in display order)
  CREATE TABLE IF NOT EXISTS trending_templates (
    template_id TEXT PRIMARY KEY,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE trending_templates ENABLE ROW LEVEL SECURITY;
  -- one row per call to the image provider (AILabTools): outcome, time, ids and coins; shown in the admin dashboard
  CREATE TABLE IF NOT EXISTS api_calls (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    api TEXT NOT NULL,
    template TEXT,
    status TEXT NOT NULL,
    error_code TEXT,
    http_status INTEGER,
    duration_ms INTEGER,
    coins INTEGER NOT NULL DEFAULT 0,
    task_id TEXT,
    request_id TEXT,
    log_id TEXT,
    generation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS api_calls_created ON api_calls (created_at DESC);
  CREATE INDEX IF NOT EXISTS api_calls_task ON api_calls (task_id);
  ALTER TABLE api_calls ENABLE ROW LEVEL SECURITY;
  -- admins of the dashboard (created with POST /api/admin/admins); only a scrypt hash of the password is kept
  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
  );
  ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
  -- exchange rates (per 1 US dollar), refreshed at most once a day and shared by every server instance (see pricing.service)
  CREATE TABLE IF NOT EXISTS fx_rates (
    id INTEGER PRIMARY KEY,
    rates JSONB NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
  ALTER TABLE coin_ledger ENABLE ROW LEVEL SECURITY;
  ALTER TABLE redeem_codes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
  ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
  ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
  ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
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
