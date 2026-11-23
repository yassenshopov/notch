const crypto = require("crypto")
const { Pool } = require("@neondatabase/serverless")
const db = require("./db.cjs")
const { insertStreamRows } = require("./spotify-library.cjs")

const SOURCE_API_RECENT = "api_recent"
const SOURCE_PLAYBACK = "playback_watch"

const MIN_PLAYBACK_MS = 15_000

/** @type {import("@neondatabase/serverless").Pool | null} */
let pool = null

/** @type {{ trackId: string, track: object, startedAt: number, durationMs: number } | null} */
let playbackSession = null

/** @type {Promise<unknown> | null} */
let ingestInflight = null

function directConnectionString() {
  const direct = String(process.env.DATABASE_URL_UNPOOLED || "").trim()
  return direct || String(process.env.DATABASE_URL || "").trim()
}

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: directConnectionString() })
  }
  return pool
}

function liveRowHash({ sourceType, playedAt, trackUri, trackId, msPlayed = 0 }) {
  const payload = [
    sourceType,
    playedAt,
    trackUri || trackId || "",
    String(msPlayed),
  ].join("|")
  return crypto.createHash("sha256").update(payload).digest("hex")
}

function contentKindFromUri(uri) {
  if (!uri || typeof uri !== "string") return "audio"
  if (uri.includes(":episode:")) return "podcast"
  return "audio"
}

function mapApiRecentItem({ track, playedAt }) {
  if (!track?.id) return null
  const played = playedAt ? new Date(playedAt) : null
  if (!played || Number.isNaN(played.getTime())) return null

  const trackUri = track.uri || (track.id.startsWith("smtc:") ? "" : `spotify:track:${track.id}`)
  const playedIso = played.toISOString()
  const msPlayed = 0

  return {
    played_at: playedIso,
    ms_played: msPlayed,
    platform: "notch",
    conn_country: null,
    track_uri: trackUri || null,
    track_id: track.id,
    track_name: track.name || null,
    artist_name: track.artists || null,
    album_name: track.album || null,
    content_kind: contentKindFromUri(trackUri),
    episode_uri: null,
    episode_name: null,
    show_name: null,
    skipped: null,
    shuffle: null,
    reason_start: null,
    reason_end: null,
    source_file: "live:api-recent",
    source_type: SOURCE_API_RECENT,
    row_hash: liveRowHash({
      sourceType: SOURCE_API_RECENT,
      playedAt: playedIso,
      trackUri,
      trackId: track.id,
      msPlayed,
    }),
  }
}

function mapPlaybackSession(session, progressMs) {
  if (!session?.trackId) return null
  const track = session.track || {}
  const started = new Date(session.startedAt)
  if (Number.isNaN(started.getTime())) return null

  const progress = Number(progressMs)
  const elapsed =
    Number.isFinite(progress) && progress > 0
      ? progress
      : Math.max(0, Date.now() - session.startedAt)
  const duration = Number(session.durationMs) || 0
  const msPlayed = duration > 0 ? Math.min(elapsed, duration) : elapsed
  if (msPlayed < MIN_PLAYBACK_MS) return null

  const trackUri = track.uri || (track.id.startsWith("smtc:") ? "" : `spotify:track:${track.id}`)
  const playedIso = started.toISOString()

  return {
    played_at: playedIso,
    ms_played: Math.round(msPlayed),
    platform: process.platform || "notch",
    conn_country: null,
    track_uri: trackUri || null,
    track_id: track.id,
    track_name: track.name || null,
    artist_name: track.artists || null,
    album_name: track.album || null,
    content_kind: contentKindFromUri(trackUri),
    episode_uri: null,
    episode_name: null,
    show_name: null,
    skipped: null,
    shuffle: null,
    reason_start: "notch_playback_watch",
    reason_end: "notch_playback_watch",
    source_file: "live:playback-watch",
    source_type: SOURCE_PLAYBACK,
    row_hash: liveRowHash({
      sourceType: SOURCE_PLAYBACK,
      playedAt: playedIso,
      trackUri,
      trackId: track.id,
      msPlayed: Math.round(msPlayed),
    }),
  }
}

async function insertRows(rows) {
  if (!rows.length) return { inserted: 0 }
  if (!db.isConfigured() || !(await db.ensureReady())) {
    return { inserted: 0, skipped: true, error: "database_not_configured" }
  }

  const client = await getPool().connect()
  try {
    const inserted = await insertStreamRows(client, rows)
    return { inserted }
  } finally {
    client.release()
  }
}

async function ingestRecentItems(items) {
  const rows = []
  for (const item of items || []) {
    const row = mapApiRecentItem(item)
    if (row) rows.push(row)
  }
  return insertRows(rows)
}

async function ingestRecentlyPlayed(limit = 50) {
  const spotify = require("./spotify.cjs")
  if (!spotify.isConnected()) {
    return { ok: false, skipped: true, reason: "not_connected" }
  }
  const capped = Math.min(Math.max(1, limit), 50)
  const items = await spotify.getRecentlyPlayed(capped, { force: true })
  const result = await ingestRecentItems(items)
  return { ok: true, items: items.length, ...result }
}

function flushPlaybackSession(progressMs) {
  if (!playbackSession) return null
  const session = playbackSession
  playbackSession = null
  return mapPlaybackSession(session, progressMs)
}

function onPlaybackStatus(status) {
  if (!status?.connected) return

  const track = status.track
  const trackId = track?.id ? String(track.id) : null
  const isPlaying = Boolean(status.isPlaying)
  const progressMs = Number(status.progressMs) || 0

  if (playbackSession && trackId && playbackSession.trackId !== trackId) {
    const row = flushPlaybackSession(progressMs)
    if (row) void insertRows([row])
  }

  if (trackId && isPlaying) {
    if (!playbackSession || playbackSession.trackId !== trackId) {
      playbackSession = {
        trackId,
        track,
        startedAt: Date.now(),
        durationMs: Number(status.durationMs) || 0,
      }
    } else if (status.durationMs) {
      playbackSession.durationMs = Number(status.durationMs) || playbackSession.durationMs
    }
    return
  }

  if (playbackSession && !isPlaying) {
    const row = flushPlaybackSession(progressMs)
    if (row) void insertRows([row])
  }
}

async function runBackfillTick() {
  if (ingestInflight) return ingestInflight
  ingestInflight = ingestRecentlyPlayed(50)
    .catch((err) => ({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }))
    .finally(() => {
      ingestInflight = null
    })
  return ingestInflight
}

module.exports = {
  SOURCE_API_RECENT,
  SOURCE_PLAYBACK,
  ingestRecentItems,
  ingestRecentlyPlayed,
  insertRows,
  onPlaybackStatus,
  runBackfillTick,
}