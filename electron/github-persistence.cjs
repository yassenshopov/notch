const fs = require("fs")
const path = require("path")
const { app } = require("electron")
const db = require("./db.cjs")

function cachePath() {
  return path.join(app.getPath("userData"), "github-neon-cache.json")
}

function readFileStore() {
  try {
    return JSON.parse(fs.readFileSync(cachePath(), "utf8"))
  } catch {
    return null
  }
}

function writeFileStore(payload) {
  fs.writeFileSync(cachePath(), JSON.stringify(payload), "utf8")
}

async function readLatestLogin() {
  if (!db.isConfigured() || !(await db.ensureReady())) return null
  const sql = db.getSql()
  if (!sql) return null
  const rows = await sql`
    SELECT login FROM github_account_sync
    ORDER BY updated_at DESC
    LIMIT 1
  `
  return rows?.[0]?.login ?? null
}

function syncedAtFromPayload(payload, rowSyncedAt) {
  if (typeof rowSyncedAt === "number" && Number.isFinite(rowSyncedAt)) {
    return rowSyncedAt
  }
  if (typeof rowSyncedAt === "string" && /^\d+$/.test(rowSyncedAt)) {
    return Number(rowSyncedAt)
  }
  if (payload?.savedAt != null) return Number(payload.savedAt) || null
  return null
}

async function readSnapshotWithMeta(login, kind) {
  const key = login || (await readLatestLogin())

  if (db.isConfigured() && (await db.ensureReady())) {
    const sql = db.getSql()
    if (sql && key && kind) {
      const rows = await sql`
        SELECT payload, synced_at
        FROM github_snapshots
        WHERE login = ${key} AND kind = ${kind}
        LIMIT 1
      `
      const row = rows?.[0]
      if (row?.payload) {
        return {
          payload: row.payload,
          syncedAt: syncedAtFromPayload(row.payload, row.synced_at),
        }
      }
    }
  }

  const file = readFileStore()
  if (
    file?.login === key &&
    file?.snapshots &&
    typeof file.snapshots[kind] === "object"
  ) {
    const payload = file.snapshots[kind]
    return {
      payload,
      syncedAt: syncedAtFromPayload(payload, file.syncedAt),
    }
  }

  return null
}

async function readSnapshot(login, kind) {
  const meta = await readSnapshotWithMeta(login, kind)
  return meta?.payload ?? null
}

async function writeSnapshot(login, kind, payload) {
  if (!login || !kind || payload == null) return

  const file = readFileStore()
  const next = {
    login,
    syncedAt: Date.now(),
    snapshots: { ...(file?.login === login ? file.snapshots : {}), [kind]: payload },
  }
  writeFileStore(next)

  if (!db.isConfigured() || !(await db.ensureReady())) return
  const sql = db.getSql()
  if (!sql) return

  const syncedAt = Date.now()
  await sql`
    INSERT INTO github_account_sync (login, synced_at)
    VALUES (${login}, ${syncedAt})
    ON CONFLICT (login) DO UPDATE SET
      synced_at = EXCLUDED.synced_at,
      updated_at = now()
  `
  await sql`
    INSERT INTO github_snapshots (login, kind, payload, synced_at)
    VALUES (
      ${login},
      ${kind},
      ${JSON.stringify(payload)}::jsonb,
      ${syncedAt}
    )
    ON CONFLICT (login, kind) DO UPDATE SET
      payload = EXCLUDED.payload,
      synced_at = EXCLUDED.synced_at,
      updated_at = now()
  `
}

/**
 * @param {{
 *   login: string
 *   avatarUrl?: string | null
 *   profile?: unknown
 *   notifications?: unknown[]
 *   pullRequests?: unknown[]
 *   contributions?: unknown
 *   todayBreakdown?: unknown
 *   insights?: unknown
 * }} bundle
 */
async function writeStatusBundle(bundle) {
  const login = bundle?.login
  if (!login) return
  await writeSnapshot(login, "status", {
    login: bundle.login,
    avatarUrl: bundle.avatarUrl ?? null,
    profile: bundle.profile ?? null,
    notifications: bundle.notifications ?? [],
    pullRequests: bundle.pullRequests ?? [],
    contributions: bundle.contributions ?? null,
    todayBreakdown: bundle.todayBreakdown ?? null,
    insights: bundle.insights ?? undefined,
    savedAt: Date.now(),
  })
}

function statusPayloadFromBundle(bundle, meta = {}) {
  if (!bundle?.login) return null
  return {
    configured: true,
    connected: true,
    login: bundle.login,
    avatarUrl: bundle.avatarUrl ?? null,
    profile: bundle.profile ?? null,
    notifications: bundle.notifications ?? [],
    pullRequests: bundle.pullRequests ?? [],
    contributions: bundle.contributions ?? null,
    todayBreakdown: bundle.todayBreakdown ?? null,
    insights: bundle.insights,
    fromCache: meta.fromCache !== false,
    cachedAt: meta.cachedAt ?? bundle.savedAt ?? null,
    refreshing: Boolean(meta.refreshing),
  }
}

async function readCachedStatus() {
  const row = await readSnapshotWithMeta(null, "status")
  if (!row?.payload) return null
  return statusPayloadFromBundle(row.payload, {
    fromCache: true,
    cachedAt: row.syncedAt,
  })
}

async function readStatusWithMeta(login) {
  return readSnapshotWithMeta(login, "status")
}

async function clearGithubCache() {
  try {
    fs.unlinkSync(cachePath())
  } catch {
    // ignore
  }
  if (!db.isConfigured() || !(await db.ensureReady())) return
  const sql = db.getSql()
  if (!sql) return
  await sql`DELETE FROM github_snapshots`
  await sql`DELETE FROM github_account_sync`
}

module.exports = {
  readSnapshot,
  readSnapshotWithMeta,
  writeSnapshot,
  writeStatusBundle,
  readCachedStatus,
  readStatusWithMeta,
  readLatestLogin,
  clearGithubCache,
  statusPayloadFromBundle,
}