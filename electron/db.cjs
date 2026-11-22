const { neon, neonConfig, Pool } = require("@neondatabase/serverless")
const ws = require("ws")

neonConfig.webSocketConstructor = ws

const MIGRATIONS = [
  {
    version: 1,
    statements: [
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS strava_athlete_sync (
        athlete_id TEXT PRIMARY KEY,
        synced_at BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS strava_activities (
        athlete_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        start_date TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (athlete_id, activity_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_strava_activities_athlete_start
        ON strava_activities (athlete_id, start_date DESC)`,
      `CREATE TABLE IF NOT EXISTS strava_heatmap_cache (
        athlete_id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS github_account_sync (
        login TEXT PRIMARY KEY,
        synced_at BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS github_snapshots (
        login TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload JSONB NOT NULL,
        synced_at BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (login, kind)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_github_snapshots_login_kind
        ON github_snapshots (login, kind)`,
    ],
  },
  {
    version: 3,
    statements: [
      `CREATE TABLE IF NOT EXISTS strava_status_snapshot (
        athlete_id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        synced_at BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    version: 4,
    statements: [
      `CREATE TABLE IF NOT EXISTS app_kv_snapshots (
        namespace TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'default',
        payload JSONB NOT NULL,
        synced_at BIGINT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (namespace, kind)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_app_kv_snapshots_namespace
        ON app_kv_snapshots (namespace)`,
    ],
  },
  {
    version: 5,
    statements: [
      `CREATE TABLE IF NOT EXISTS spotify_import_runs (
        id SERIAL PRIMARY KEY,
        source_path TEXT NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        finished_at TIMESTAMPTZ,
        files_processed INTEGER NOT NULL DEFAULT 0,
        rows_read INTEGER NOT NULL DEFAULT 0,
        rows_inserted INTEGER NOT NULL DEFAULT 0,
        rows_skipped INTEGER NOT NULL DEFAULT 0,
        error TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS spotify_streams (
        id BIGSERIAL PRIMARY KEY,
        played_at TIMESTAMPTZ NOT NULL,
        ms_played INTEGER NOT NULL DEFAULT 0,
        platform TEXT,
        conn_country TEXT,
        track_uri TEXT,
        track_id TEXT,
        track_name TEXT,
        artist_name TEXT,
        album_name TEXT,
        content_kind TEXT NOT NULL DEFAULT 'audio',
        episode_uri TEXT,
        episode_name TEXT,
        show_name TEXT,
        skipped BOOLEAN,
        shuffle BOOLEAN,
        reason_start TEXT,
        reason_end TEXT,
        source_file TEXT NOT NULL,
        row_hash TEXT NOT NULL UNIQUE
      )`,
      `CREATE INDEX IF NOT EXISTS idx_spotify_streams_played_at
        ON spotify_streams (played_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_spotify_streams_track_id
        ON spotify_streams (track_id)`,
      `CREATE INDEX IF NOT EXISTS idx_spotify_streams_artist
        ON spotify_streams (artist_name)`,
    ],
  },
  {
    version: 6,
    statements: [
      `ALTER TABLE spotify_streams
        ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'export'`,
      `CREATE INDEX IF NOT EXISTS idx_spotify_streams_source_type
        ON spotify_streams (source_type)`,
    ],
  },
]

let sql = null
let initPromise = null
let lastInitError = null
let lastInitAt = null

function pooledConnectionString() {
  return String(process.env.DATABASE_URL || "").trim()
}

function directConnectionString() {
  const direct = String(process.env.DATABASE_URL_UNPOOLED || "").trim()
  return direct || pooledConnectionString()
}

function isConfigured() {
  return Boolean(pooledConnectionString())
}

function getSql() {
  if (!isConfigured()) return null
  if (!sql) {
    sql = neon(pooledConnectionString())
  }
  return sql
}

async function migrateWithPool() {
  const pool = new Pool({ connectionString: directConnectionString() })
  const client = await pool.connect()
  try {
    let applied = []
    try {
      const res = await client.query(
        "SELECT version FROM schema_migrations ORDER BY version",
      )
      applied = res.rows || []
    } catch {
      applied = []
    }
  const appliedSet = new Set(applied.map((row) => Number(row.version)))

  for (const migration of MIGRATIONS) {
    if (appliedSet.has(migration.version)) continue
    for (const statement of migration.statements) {
      await client.query(statement)
    }
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [
      migration.version,
    ])
  }
  } finally {
    client.release()
    await pool.end()
  }
}

async function migrate() {
  if (!isConfigured()) {
    return { configured: false, ok: true, migrated: false }
  }

  await migrateWithPool()

  lastInitAt = Date.now()
  lastInitError = null
  return { configured: true, ok: true, migrated: true }
}

function init() {
  if (!isConfigured()) {
    return Promise.resolve({ configured: false, ok: true })
  }
  if (!initPromise) {
    initPromise = migrate().catch((err) => {
      initPromise = null
      lastInitError = err instanceof Error ? err.message : String(err)
      console.error("[notch] database init failed:", lastInitError)
      return { configured: true, ok: false, error: lastInitError }
    })
  }
  return initPromise
}

async function ensureReady() {
  if (!isConfigured()) return false
  const result = await init()
  return Boolean(result?.ok)
}

function status() {
  return {
    configured: isConfigured(),
    ready: Boolean(isConfigured() && initPromise && !lastInitError),
    lastError: lastInitError,
    lastInitAt,
  }
}

module.exports = {
  isConfigured,
  init,
  ensureReady,
  status,
  getSql,
}