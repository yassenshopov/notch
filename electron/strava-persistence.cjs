const fs = require("fs")
const path = require("path")
const { app } = require("electron")
const db = require("./db.cjs")

const UPSERT_CHUNK = 40

function activitiesIndexPath() {
  return path.join(app.getPath("userData"), "strava-activities-index.json")
}

function heatmapCachePath() {
  return path.join(app.getPath("userData"), "strava-heatmap-cache.json")
}

function statusSnapshotPath() {
  return path.join(app.getPath("userData"), "strava-status-snapshot.json")
}

function readActivityIndexFile() {
  try {
    return JSON.parse(fs.readFileSync(activitiesIndexPath(), "utf8"))
  } catch {
    return null
  }
}

function writeActivityIndexFile(payload) {
  fs.writeFileSync(activitiesIndexPath(), JSON.stringify(payload), "utf8")
}

function writeHeatmapCacheFile(heatmap) {
  fs.writeFileSync(heatmapCachePath(), JSON.stringify(heatmap), "utf8")
}

function activityStartDate(activity) {
  if (!activity?.startDate) return null
  const t = new Date(activity.startDate)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

async function importFileIndexToDb(filePayload) {
  if (!filePayload?.activities?.length) return
  const athleteId =
    filePayload.athleteId == null ? null : String(filePayload.athleteId)
  if (!athleteId) return
  await writeActivityIndex({
    athleteId,
    syncedAt: filePayload.syncedAt ?? Date.now(),
    activities: filePayload.activities,
  })
}

async function readAthleteSyncMeta(athleteId) {
  if (!db.isConfigured() || !(await db.ensureReady())) return null
  const sql = db.getSql()
  if (!sql) return null
  try {
    if (athleteId != null) {
      const rows = await sql`
        SELECT athlete_id, synced_at
        FROM strava_athlete_sync
        WHERE athlete_id = ${String(athleteId)}
        LIMIT 1
      `
      return rows?.[0] ?? null
    }
    const rows = await sql`
      SELECT athlete_id, synced_at
      FROM strava_athlete_sync
      ORDER BY updated_at DESC
      LIMIT 1
    `
    return rows?.[0] ?? null
  } catch {
    return null
  }
}

async function readActivityIndexFromNeon(fileFallback) {
  if (!db.isConfigured()) return fileFallback

  try {
    const ready = await db.ensureReady()
    if (!ready) return fileFallback

    const sql = db.getSql()
    if (!sql) return fileFallback

    const meta = await readAthleteSyncMeta(fileFallback?.athleteId)
    if (!meta?.athlete_id) {
      if (fileFallback) {
        await importFileIndexToDb(fileFallback).catch((err) => {
          console.warn("[notch] strava json→neon import failed:", err?.message || err)
        })
        return fileFallback
      }
      return null
    }

    const rows = await sql`
      SELECT payload
      FROM strava_activities
      WHERE athlete_id = ${meta.athlete_id}
      ORDER BY start_date DESC NULLS LAST
    `

    const activities = (rows || [])
      .map((row) => row.payload)
      .filter((row) => row && typeof row === "object")

    const next = {
      athleteId: meta.athlete_id,
      syncedAt: Number(meta.synced_at) || null,
      activities,
    }
    writeActivityIndexFile(next)
    return next
  } catch (err) {
    console.warn("[notch] strava readActivityIndex (neon) failed:", err?.message || err)
    return fileFallback
  }
}

/**
 * @param {{ forceRemote?: boolean }} [options]
 */
async function readActivityIndex(options = {}) {
  const fileFallback = readActivityIndexFile()
  const forceRemote = options.forceRemote === true

  if (!forceRemote && fileFallback?.activities?.length) {
    const fileAt = Number(fileFallback.syncedAt) || 0
    const remoteMeta = await readAthleteSyncMeta(fileFallback.athleteId)
    const remoteAt = remoteMeta?.synced_at != null ? Number(remoteMeta.synced_at) || 0 : 0
    if (!remoteMeta?.athlete_id || remoteAt <= fileAt) {
      return fileFallback
    }
  }

  return readActivityIndexFromNeon(fileFallback)
}

async function upsertActivityChunk(sql, athleteId, chunk) {
  await Promise.all(
    chunk.map((activity) => {
      const activityId = activity?.id == null ? null : String(activity.id)
      if (!activityId) return Promise.resolve()
      const startDate = activityStartDate(activity)
      return sql`
        INSERT INTO strava_activities (athlete_id, activity_id, payload, start_date)
        VALUES (
          ${athleteId},
          ${activityId},
          ${JSON.stringify(activity)}::jsonb,
          ${startDate}
        )
        ON CONFLICT (athlete_id, activity_id) DO UPDATE SET
          payload = EXCLUDED.payload,
          start_date = EXCLUDED.start_date,
          updated_at = now()
      `
    }),
  )
}

async function writeActivityIndex(payload) {
  writeActivityIndexFile(payload)

  if (!db.isConfigured()) return

  try {
    const ready = await db.ensureReady()
    if (!ready) return

    const sql = db.getSql()
    if (!sql) return

    const athleteId = payload?.athleteId == null ? null : String(payload.athleteId)
    if (!athleteId || !Array.isArray(payload.activities)) return

    const syncedAt = Number(payload.syncedAt) || Date.now()
    const activities = payload.activities

    await sql`
      INSERT INTO strava_athlete_sync (athlete_id, synced_at)
      VALUES (${athleteId}, ${syncedAt})
      ON CONFLICT (athlete_id) DO UPDATE SET
        synced_at = EXCLUDED.synced_at,
        updated_at = now()
    `

    for (let i = 0; i < activities.length; i += UPSERT_CHUNK) {
      const chunk = activities.slice(i, i + UPSERT_CHUNK)
      await upsertActivityChunk(sql, athleteId, chunk)
    }
  } catch (err) {
    console.warn("[notch] strava writeActivityIndex (neon) failed:", err?.message || err)
  }
}

async function writeHeatmapCache(athleteId, heatmap) {
  writeHeatmapCacheFile(heatmap)

  if (!db.isConfigured()) return

  try {
    const ready = await db.ensureReady()
    if (!ready) return

    const sql = db.getSql()
    if (!sql || athleteId == null) return

    const key = String(athleteId)
    await sql`
      INSERT INTO strava_heatmap_cache (athlete_id, payload)
      VALUES (${key}, ${JSON.stringify(heatmap)}::jsonb)
      ON CONFLICT (athlete_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = now()
    `
  } catch (err) {
    console.warn("[notch] strava writeHeatmapCache (neon) failed:", err?.message || err)
  }
}

async function readRemoteStatusSyncedAt() {
  if (!db.isConfigured() || !(await db.ensureReady())) return null
  const sql = db.getSql()
  if (!sql) return null
  try {
    const rows = await sql`
      SELECT synced_at
      FROM strava_status_snapshot
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const row = rows?.[0]
    if (row?.synced_at == null) return null
    return Number(row.synced_at) || null
  } catch {
    return null
  }
}

async function readStatusSnapshot() {
  let fileSyncedAt = null
  let fileAthleteId = null
  let payload = null
  try {
    const file = JSON.parse(fs.readFileSync(statusSnapshotPath(), "utf8"))
    payload = file?.payload ?? null
    fileSyncedAt = file?.syncedAt ?? null
    fileAthleteId = file?.athleteId ?? null
  } catch {
    // ignore
  }

  if (payload) {
    const remoteAt = await readRemoteStatusSyncedAt()
    const fileAt = Number(fileSyncedAt) || 0
    if (remoteAt == null || remoteAt <= fileAt) {
      return { payload, syncedAt: fileSyncedAt, athleteId: fileAthleteId }
    }
  }

  if (!db.isConfigured() || !(await db.ensureReady())) {
    if (!payload) return null
    return { payload, syncedAt: fileSyncedAt, athleteId: fileAthleteId }
  }

  const sql = db.getSql()
  if (!sql) {
    if (!payload) return null
    return { payload, syncedAt: fileSyncedAt, athleteId: fileAthleteId }
  }

  try {
    const rows = await sql`
      SELECT athlete_id, payload, synced_at
      FROM strava_status_snapshot
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const row = rows?.[0]
    if (row?.payload) {
      const syncedAt = Number(row.synced_at) || fileSyncedAt
      const key = row.athlete_id
      fs.writeFileSync(
        statusSnapshotPath(),
        JSON.stringify({ athleteId: key, syncedAt, payload: row.payload }),
        "utf8",
      )
      return { payload: row.payload, syncedAt, athleteId: key }
    }
  } catch (err) {
    console.warn("[notch] strava readStatusSnapshot (neon) failed:", err?.message || err)
  }

  if (!payload) return null
  return { payload, syncedAt: fileSyncedAt, athleteId: fileAthleteId }
}

async function writeStatusSnapshot(athleteId, payload) {
  if (athleteId == null || !payload) return
  const key = String(athleteId)
  const syncedAt = Date.now()
  const fileBody = { athleteId: key, syncedAt, payload }
  fs.writeFileSync(statusSnapshotPath(), JSON.stringify(fileBody), "utf8")

  if (!db.isConfigured() || !(await db.ensureReady())) return

  const sql = db.getSql()
  if (!sql) return

  try {
    await sql`
      INSERT INTO strava_status_snapshot (athlete_id, payload, synced_at)
      VALUES (${key}, ${JSON.stringify(payload)}::jsonb, ${syncedAt})
      ON CONFLICT (athlete_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        synced_at = EXCLUDED.synced_at,
        updated_at = now()
    `
  } catch (err) {
    console.warn("[notch] strava writeStatusSnapshot (neon) failed:", err?.message || err)
  }
}

async function clearStravaCache() {
  try {
    fs.unlinkSync(activitiesIndexPath())
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(heatmapCachePath())
  } catch {
    // ignore
  }
  try {
    fs.unlinkSync(statusSnapshotPath())
  } catch {
    // ignore
  }

  if (!db.isConfigured()) return

  try {
    const ready = await db.ensureReady()
    if (!ready) return

    const sql = db.getSql()
    if (!sql) return

    await sql`DELETE FROM strava_activities`
    await sql`DELETE FROM strava_athlete_sync`
    await sql`DELETE FROM strava_heatmap_cache`
    await sql`DELETE FROM strava_status_snapshot`
    await sql`DELETE FROM app_kv_snapshots WHERE namespace = 'strava_activity'`
  } catch (err) {
    console.warn("[notch] strava clearStravaCache (neon) failed:", err?.message || err)
  }
}

async function readLatestAthleteId() {
  const fromIndex = await readActivityIndex()
  if (fromIndex?.athleteId) return String(fromIndex.athleteId)
  const snap = await readStatusSnapshot()
  const id = snap?.payload?.athleteId ?? snap?.athleteId
  return id == null ? null : String(id)
}

module.exports = {
  readActivityIndex,
  writeActivityIndex,
  writeHeatmapCache,
  readStatusSnapshot,
  writeStatusSnapshot,
  readLatestAthleteId,
  clearStravaCache,
  activitiesIndexPath,
  heatmapCachePath,
  statusSnapshotPath,
}