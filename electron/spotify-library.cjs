const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const { Pool } = require("@neondatabase/serverless")
const db = require("./db.cjs")

const EXPORT_GLOB_PREFIXES = ["Streaming_History_Audio", "Streaming_History_Video"]
const INSERT_BATCH = 400

function directConnectionString() {
  const direct = String(process.env.DATABASE_URL_UNPOOLED || "").trim()
  return direct || String(process.env.DATABASE_URL || "").trim()
}

function trackIdFromUri(uri) {
  if (!uri || typeof uri !== "string") return null
  const parts = uri.split(":")
  return parts[parts.length - 1] || null
}

function contentKindFromFile(fileName) {
  if (fileName.includes("Streaming_History_Video")) return "video"
  return "audio"
}

function rowHash(entry) {
  const payload = [
    entry.ts || "",
    entry.spotify_track_uri || entry.spotify_episode_uri || entry.audiobook_chapter_uri || "",
    String(entry.ms_played ?? ""),
    entry.master_metadata_track_name || entry.episode_name || entry.audiobook_chapter_title || "",
  ].join("|")
  return crypto.createHash("sha256").update(payload).digest("hex")
}

function mapExportRow(entry, sourceFile, contentKind) {
  const playedAt = entry.ts ? new Date(entry.ts) : null
  if (!playedAt || Number.isNaN(playedAt.getTime())) return null

  const trackUri = entry.spotify_track_uri || null
  const episodeUri = entry.spotify_episode_uri || null
  const chapterUri = entry.audiobook_chapter_uri || null
  const primaryUri = trackUri || episodeUri || chapterUri || null

  let kind = contentKind
  if (episodeUri) kind = "podcast"
  else if (chapterUri || entry.audiobook_uri) kind = "audiobook"

  const trackName =
    entry.master_metadata_track_name ||
    entry.episode_name ||
    entry.audiobook_chapter_title ||
    null
  const artistName =
    entry.master_metadata_album_artist_name || entry.episode_show_name || entry.audiobook_title || null
  const albumName = entry.master_metadata_album_album_name || null

  return {
    played_at: playedAt.toISOString(),
    ms_played: Number(entry.ms_played) || 0,
    platform: entry.platform || null,
    conn_country: entry.conn_country || null,
    track_uri: primaryUri,
    track_id: trackIdFromUri(trackUri) || trackIdFromUri(episodeUri) || trackIdFromUri(chapterUri),
    track_name: trackName,
    artist_name: artistName,
    album_name: albumName,
    content_kind: kind,
    episode_uri: episodeUri,
    episode_name: entry.episode_name || null,
    show_name: entry.episode_show_name || null,
    skipped: entry.skipped === true,
    shuffle: entry.shuffle === true,
    reason_start: entry.reason_start || null,
    reason_end: entry.reason_end || null,
    source_file: sourceFile,
    row_hash: rowHash(entry),
  }
}

function listExportFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => e.name)
    .filter((name) => EXPORT_GLOB_PREFIXES.some((prefix) => name.startsWith(prefix)))
    .sort()
    .map((name) => path.join(dir, name))
}

function utcDateKey(d) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function buildWeekColumns(dayRows) {
  if (!dayRows?.length) return { weeks: [], days: [] }
  const days = dayRows.map((row) => ({
    date: row.date,
    count: Number(row.plays) || 0,
    msPlayed: Number(row.ms_played) || 0,
  }))

  const byDate = new Map(days.map((d) => [d.date, d]))
  const sortedDates = [...byDate.keys()].sort()
  const start = new Date(`${sortedDates[0]}T12:00:00Z`)
  const end = new Date(`${sortedDates[sortedDates.length - 1]}T12:00:00Z`)

  const weeks = []
  const cursor = new Date(start)
  const startDow = cursor.getUTCDay()
  cursor.setUTCDate(cursor.getUTCDate() - startDow)

  while (cursor <= end) {
    const column = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setUTCDate(cursor.getUTCDate() + i)
      const key = utcDateKey(d)
      const hit = byDate.get(key)
      column.push(hit ? { date: hit.date, count: hit.count } : { date: key, count: 0 })
    }
    weeks.push(column)
    cursor.setUTCDate(cursor.getUTCDate() + 7)
  }

  return { weeks, days: days.map(({ date, count }) => ({ date, count })) }
}

async function insertBatch(client, rows) {
  if (!rows.length) return 0
  const values = []
  const params = []
  let i = 1
  for (const row of rows) {
    values.push(
      `($${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++},$${i++})`,
    )
    params.push(
      row.played_at,
      row.ms_played,
      row.platform,
      row.conn_country,
      row.track_uri,
      row.track_id,
      row.track_name,
      row.artist_name,
      row.album_name,
      row.content_kind,
      row.episode_uri,
      row.episode_name,
      row.show_name,
      row.skipped,
      row.shuffle,
      row.reason_start,
      row.reason_end,
      row.source_file,
      row.row_hash,
    )
  }
  const sql = `
    INSERT INTO spotify_streams (
      played_at, ms_played, platform, conn_country, track_uri, track_id,
      track_name, artist_name, album_name, content_kind, episode_uri,
      episode_name, show_name, skipped, shuffle, reason_start, reason_end,
      source_file, row_hash
    )
    VALUES ${values.join(",")}
    ON CONFLICT (row_hash) DO NOTHING
  `
  const res = await client.query(sql, params)
  return res.rowCount ?? 0
}

async function importDirectory(dir, options = {}) {
  const sourcePath = path.resolve(String(dir || "").trim())
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return { ok: false, error: "directory_not_found", path: sourcePath }
  }
  if (!db.isConfigured() || !(await db.ensureReady())) {
    return { ok: false, error: "database_not_configured" }
  }

  const files = listExportFiles(sourcePath)
  if (!files.length) {
    return { ok: false, error: "no_export_files", path: sourcePath }
  }

  const pool = new Pool({ connectionString: directConnectionString() })
  const client = await pool.connect()
  let runId = null
  let filesProcessed = 0
  let rowsRead = 0
  let rowsInserted = 0

  try {
    const runRes = await client.query(
      `INSERT INTO spotify_import_runs (source_path) VALUES ($1) RETURNING id`,
      [sourcePath],
    )
    runId = runRes.rows?.[0]?.id ?? null

    for (const filePath of files) {
      const fileName = path.basename(filePath)
      const contentKind = contentKindFromFile(fileName)
      let parsed
      try {
        parsed = JSON.parse(fs.readFileSync(filePath, "utf8"))
      } catch (err) {
        if (options.stopOnFileError) throw err
        continue
      }
      if (!Array.isArray(parsed)) continue
      filesProcessed += 1

      let batch = []
      for (const entry of parsed) {
        rowsRead += 1
        const mapped = mapExportRow(entry, fileName, contentKind)
        if (!mapped) continue
        batch.push(mapped)
        if (batch.length >= INSERT_BATCH) {
          rowsInserted += await insertBatch(client, batch)
          batch = []
        }
      }
      if (batch.length) {
        rowsInserted += await insertBatch(client, batch)
      }
    }

    const rowsSkipped = Math.max(0, rowsRead - rowsInserted)
    await client.query(
      `UPDATE spotify_import_runs
       SET finished_at = now(),
           files_processed = $2,
           rows_read = $3,
           rows_inserted = $4,
           rows_skipped = $5
       WHERE id = $1`,
      [runId, filesProcessed, rowsRead, rowsInserted, rowsSkipped],
    )

    return {
      ok: true,
      runId,
      path: sourcePath,
      filesProcessed,
      rowsRead,
      rowsInserted,
      rowsSkipped,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (runId != null) {
      await client.query(`UPDATE spotify_import_runs SET finished_at = now(), error = $2 WHERE id = $1`, [
        runId,
        message,
      ])
    }
    return { ok: false, error: message, runId, path: sourcePath, filesProcessed, rowsRead, rowsInserted }
  } finally {
    client.release()
    await pool.end()
  }
}

async function libraryStatus() {
  if (!db.isConfigured() || !(await db.ensureReady())) {
    return { configured: false, ready: false, totalStreams: 0 }
  }
  const sql = db.getSql()
  if (!sql) return { configured: true, ready: false, totalStreams: 0 }

  const [countRow] = await sql`
    SELECT
      COUNT(*)::bigint AS total,
      MIN(played_at) AS first_played,
      MAX(played_at) AS last_played
    FROM spotify_streams
  `
  const [importRow] = await sql`
    SELECT id, source_path, finished_at, rows_inserted, rows_read, files_processed
    FROM spotify_import_runs
  ORDER BY finished_at DESC NULLS LAST, id DESC
    LIMIT 1
  `
  return {
    configured: true,
    ready: true,
    totalStreams: Number(countRow?.total || 0),
    firstPlayed: countRow?.first_played ?? null,
    lastPlayed: countRow?.last_played ?? null,
    lastImport: importRow
      ? {
          id: importRow.id,
          sourcePath: importRow.source_path,
          finishedAt: importRow.finished_at,
          rowsInserted: Number(importRow.rows_inserted || 0),
          rowsRead: Number(importRow.rows_read || 0),
          filesProcessed: Number(importRow.files_processed || 0),
        }
      : null,
  }
}

function yearBounds(year) {
  const y = Number(year)
  if (!Number.isFinite(y)) return null
  return {
    from: new Date(Date.UTC(y, 0, 1, 0, 0, 0)).toISOString(),
    to: new Date(Date.UTC(y + 1, 0, 1, 0, 0, 0)).toISOString(),
  }
}

async function activityInsights(options = {}) {
  const status = await libraryStatus()
  if (!status.ready || status.totalStreams === 0) {
    return {
      ...status,
      connected: true,
      years: [],
      chartYear: new Date().getFullYear(),
      weeks: [],
      days: [],
      totalPlays: 0,
      totalMs: 0,
      topArtists: [],
      topTracks: [],
    }
  }

  const sql = db.getSql()
  const chartYear = Number(options.year) || new Date().getFullYear()
  const bounds = yearBounds(chartYear)

  const yearRows = await sql`
    SELECT DISTINCT EXTRACT(YEAR FROM played_at AT TIME ZONE 'UTC')::int AS y
    FROM spotify_streams
    ORDER BY y
  `
  const years = (yearRows || []).map((r) => Number(r.y)).filter(Number.isFinite)

  const dayRows = bounds
    ? await sql`
        SELECT
          to_char(played_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS plays,
          COALESCE(SUM(ms_played), 0)::bigint AS ms_played
        FROM spotify_streams
        WHERE played_at >= ${bounds.from}::timestamptz
          AND played_at < ${bounds.to}::timestamptz
        GROUP BY 1
        ORDER BY 1
      `
    : []

  const totals = bounds
    ? await sql`
        SELECT
          COUNT(*)::int AS plays,
          COALESCE(SUM(ms_played), 0)::bigint AS ms
        FROM spotify_streams
        WHERE played_at >= ${bounds.from}::timestamptz
          AND played_at < ${bounds.to}::timestamptz
      `
    : []

  const topArtists = bounds
    ? await sql`
        SELECT
          artist_name AS name,
          COUNT(*)::int AS plays,
          COALESCE(SUM(ms_played), 0)::bigint AS ms
        FROM spotify_streams
        WHERE played_at >= ${bounds.from}::timestamptz
          AND played_at < ${bounds.to}::timestamptz
          AND artist_name IS NOT NULL
          AND artist_name <> ''
        GROUP BY artist_name
        ORDER BY plays DESC
        LIMIT 12
      `
    : []

  const topTracks = bounds
    ? await sql`
        SELECT
          track_id,
          track_name AS name,
          artist_name AS artist,
          track_uri AS uri,
          COUNT(*)::int AS plays,
          COALESCE(SUM(ms_played), 0)::bigint AS ms
        FROM spotify_streams
        WHERE played_at >= ${bounds.from}::timestamptz
          AND played_at < ${bounds.to}::timestamptz
          AND track_name IS NOT NULL
        GROUP BY track_id, track_name, artist_name, track_uri
        ORDER BY plays DESC
        LIMIT 12
      `
    : []

  const { weeks, days } = buildWeekColumns(dayRows || [])

  return {
    ...status,
    connected: true,
    years,
    chartYear,
    weeks,
    days,
    totalPlays: Number(totals?.[0]?.plays || 0),
    totalMs: Number(totals?.[0]?.ms || 0),
    topArtists: (topArtists || []).map((r) => ({
      name: r.name,
      plays: Number(r.plays || 0),
      ms: Number(r.ms || 0),
    })),
    topTracks: (topTracks || []).map((r) => ({
      id: r.track_id,
      name: r.name,
      artist: r.artist,
      uri: r.uri,
      plays: Number(r.plays || 0),
      ms: Number(r.ms || 0),
    })),
  }
}

module.exports = {
  listExportFiles,
  importDirectory,
  libraryStatus,
  activityInsights,
}