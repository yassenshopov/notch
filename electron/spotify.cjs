const fs = require("fs")
const path = require("path")
const { app } = require("electron")
const { runLoopbackOAuth } = require("./oauth-loopback.cjs")
const kv = require("./snapshot-kv.cjs")

const SPOTIFY_NOW_STALE_MS = 3 * 60 * 1000
const SPOTIFY_NOW_REFRESH_MS = 15_000
const SPOTIFY_RECENT_STALE_MS = 15 * 60 * 1000
const SPOTIFY_KV_NS = "spotify"
const LISTENING_HISTORY_MAX = 200

let spotifyNowBackgroundRefresh = null

function notifyPlaybackIngest(status) {
  if (!status) return
  try {
    require("./spotify-live-ingest.cjs").onPlaybackStatus(status)
  } catch {
    // live ingest optional when DB unset
  }
}

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
].join(" ")

const CALLBACK_PORT = 43110
let spotifyAuthInFlight = false

function tokenPath() {
  return path.join(app.getPath("userData"), "spotify-tokens.json")
}

function readTokens() {
  try {
    return JSON.parse(fs.readFileSync(tokenPath(), "utf8"))
  } catch {
    return null
  }
}

function writeTokens(tokens) {
  fs.writeFileSync(tokenPath(), JSON.stringify(tokens, null, 2), "utf8")
}

function clearTokens() {
  try {
    fs.unlinkSync(tokenPath())
  } catch {
    // ignore
  }
}

function getConfig() {
  return {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${CALLBACK_PORT}/callback`,
  }
}

function isConfigured() {
  const { clientId, clientSecret } = getConfig()
  return Boolean(clientId && clientSecret)
}

function isConnected() {
  const tokens = readTokens()
  return Boolean(tokens?.refresh_token || tokens?.access_token)
}

async function exchangeToken(body) {
  const { clientId, clientSecret } = getConfig()
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token request failed: ${err}`)
  }
  return res.json()
}

async function getAccessToken() {
  const tokens = readTokens()
  if (!tokens?.access_token && !tokens?.refresh_token) return null

  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 30_000) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) return tokens.access_token || null

  return refreshAccessToken()
}

/** @type {Promise<string | null> | null} */
let refreshInFlight = null

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const tokens = readTokens()
    if (!tokens?.refresh_token) return tokens?.access_token ?? null

    const refreshed = await exchangeToken({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    })

    const next = {
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token || tokens.refresh_token,
      expires_in: refreshed.expires_in,
      expires_at: Date.now() + refreshed.expires_in * 1000,
    }
    writeTokens(next)
    return next.access_token
  })().finally(() => {
    refreshInFlight = null
  })

  return refreshInFlight
}

async function spotifyFetch(endpoint, options = {}, allow401Retry = true) {
  const accessToken = await getAccessToken()
  if (!accessToken) {
    const err = new Error("not_connected")
    err.code = "not_connected"
    throw err
  }

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })

  if (res.status === 401 && allow401Retry) {
    const tokens = readTokens()
    if (tokens) {
      writeTokens({ ...tokens, expires_at: 0 })
    }
    await refreshAccessToken()
    return spotifyFetch(endpoint, options, false)
  }

  return res
}

function mapTrack(item) {
  if (!item) return null
  const artists =
    item.type === "episode"
      ? item.show?.name || "Podcast"
      : (item.artists || []).map((a) => a.name).join(", ")
  const images = item.album?.images || []
  const art =
    images.find((i) => i.width >= 200 && i.width <= 400)?.url ||
    images[0]?.url ||
    null

  return {
    id: item.id,
    name: item.name,
    artists,
    album: item.type === "episode" ? item.show?.name ?? "" : item.album?.name ?? "",
    artUrl: art,
    uri: item.uri,
  }
}

function mapSmtcTrack(native) {
  const title = native.title?.trim()
  if (!title) return null
  const artists = native.artist?.trim() || "Unknown artist"
  const slug = `${title}\0${artists}`.toLowerCase()
  return {
    id: `smtc:${slug.slice(0, 120)}`,
    name: title,
    artists,
    album: native.album?.trim() || "",
    artUrl: null,
    uri: "",
  }
}

async function smtcSpotifyFallback() {
  if (process.platform !== "win32") return null
  try {
    const { getSpotifyNativePlayback } = require("./media-session.cjs")
    const native = await getSpotifyNativePlayback()
    if (!native) return null
    const track = mapSmtcTrack(native)
    if (!track) return null
    return {
      connected: true,
      configured: true,
      isPlaying: native.isPlaying,
      progressMs: 0,
      durationMs: 0,
      track,
    }
  } catch {
    return null
  }
}

async function fetchPlaybackFromApi() {
  let res = await spotifyFetch("/me/player")
  if (res.status === 204) {
    res = await spotifyFetch("/me/player/currently-playing")
  }
  if (res.status === 204) {
    return { connected: true, configured: true, isPlaying: false, track: null }
  }
  if (res.status === 401) {
    clearTokens()
    return { connected: false, configured: true, isPlaying: false, track: null }
  }
  if (!res.ok) {
    if (res.status === 404) {
      return { connected: true, configured: true, isPlaying: false, track: null }
    }
    const text = await res.text()
    throw new Error(text || `Spotify ${res.status}`)
  }
  const data = await res.json()
  return { ...mapPlayback(data), configured: true }
}

/** @type {Promise<unknown> | null} */
let statusInflight = null

function scheduleSpotifyNowRefresh() {
  if (spotifyNowBackgroundRefresh) return
  spotifyNowBackgroundRefresh = refreshSpotifyNowPlaying()
    .catch(() => {})
    .finally(() => {
      spotifyNowBackgroundRefresh = null
    })
}

async function refreshSpotifyNowPlaying() {
  if (!isConfigured() || !isConnected()) return null
  try {
    const api = await fetchPlaybackFromApi()
    let result = api
    if (!api.track) {
      const smtc = await smtcSpotifyFallback()
      if (smtc) result = smtc
    }
    await kv.write(SPOTIFY_KV_NS, "now_playing", result)
    notifyPlaybackIngest(result)
    return result
  } catch {
    return null
  }
}

async function readCachedNowPlaying() {
  const row = await kv.readWithMeta(SPOTIFY_KV_NS, "now_playing")
  if (!row?.payload) return null
  const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
  if (age >= SPOTIFY_NOW_STALE_MS) return null
  return {
    ...row.payload,
    fromCache: true,
    cachedAt: row.syncedAt,
  }
}

async function getCurrentlyPlayingInner() {
  if (!isConfigured()) {
    return { connected: false, configured: false, isPlaying: false, track: null }
  }
  if (!isConnected()) {
    const cached = await readCachedNowPlaying()
    if (cached) return cached
    return { connected: false, configured: true, isPlaying: false, track: null }
  }

  const cached = await readCachedNowPlaying()
  if (cached) {
    const age = cached.cachedAt ? Date.now() - cached.cachedAt : 0
    if (age >= SPOTIFY_NOW_REFRESH_MS) scheduleSpotifyNowRefresh()
    return cached
  }

  try {
    const api = await fetchPlaybackFromApi()
    let result = api
    if (!api.track) {
      const smtc = await smtcSpotifyFallback()
      if (smtc) result = smtc
    }
    await kv.write(SPOTIFY_KV_NS, "now_playing", result)
    notifyPlaybackIngest(result)
    return result
  } catch (err) {
    const stale = await readCachedNowPlaying()
    if (stale) return stale
    if (err.code === "not_connected") {
      return { connected: false, configured: true, isPlaying: false, track: null }
    }
    throw err
  }
}

async function getCurrentlyPlaying() {
  if (statusInflight) return statusInflight
  statusInflight = getCurrentlyPlayingInner().finally(() => {
    statusInflight = null
  })
  return statusInflight
}

async function waitForPlaybackUpdate() {
  const attempts = 4
  for (let i = 0; i < attempts; i++) {
    const status = await getCurrentlyPlayingInner()
    if (status.track) return status
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350))
    }
  }
  return getCurrentlyPlayingInner()
}

function mapPlayback(data) {
  if (!data || !data.item) {
    return { connected: true, isPlaying: false, track: null }
  }

  const track = mapTrack(data.item)
  if (!track) {
    return { connected: true, isPlaying: false, track: null }
  }

  return {
    connected: true,
    isPlaying: Boolean(data.is_playing),
    progressMs: data.progress_ms ?? 0,
    durationMs: data.item.duration_ms ?? 0,
    track,
  }
}

function mergeListeningHistory(prev, incoming) {
  const map = new Map()
  for (const row of [...(prev || []), ...(incoming || [])]) {
    if (!row?.track?.id) continue
    const key = `${row.track.id}:${row.playedAt ?? ""}`
    map.set(key, row)
  }
  return [...map.values()]
    .sort((a, b) => new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime())
    .slice(0, LISTENING_HISTORY_MAX)
}

async function getRecentlyPlayed(limit = 6, options = {}) {
  const force = options?.force === true
  const capped = Math.min(Math.max(1, limit), 20)
  const cacheKind = `recently_played_${capped}`

  if (!force) {
    const row = await kv.readWithMeta(SPOTIFY_KV_NS, cacheKind)
    if (row?.payload?.items?.length) {
      const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
      if (age < SPOTIFY_RECENT_STALE_MS) {
        return row.payload.items
      }
    }
  }

  if (!isConfigured() || !isConnected()) {
    const row = await kv.readWithMeta(SPOTIFY_KV_NS, cacheKind)
    return row?.payload?.items ?? []
  }

  try {
    const res = await spotifyFetch(`/me/player/recently-played?limit=${capped}`)
    if (res.status === 401) {
      clearTokens()
      return []
    }
    if (!res.ok) {
      const row = await kv.readWithMeta(SPOTIFY_KV_NS, cacheKind)
      return row?.payload?.items ?? []
    }
    const data = await res.json()
    const items = data.items || []
    const seen = new Set()
    const out = []
    for (const row of items) {
      const track = mapTrack(row.track)
      if (!track || seen.has(track.id)) continue
      seen.add(track.id)
      out.push({ track, playedAt: row.played_at ?? null })
    }
    await kv.write(SPOTIFY_KV_NS, cacheKind, { items: out, limit: capped })
    const historyRow = await kv.read(SPOTIFY_KV_NS, "listening_history")
    const merged = mergeListeningHistory(historyRow?.items, out)
    await kv.write(SPOTIFY_KV_NS, "listening_history", { items: merged })
    void require("./spotify-live-ingest.cjs")
      .ingestRecentItems(out)
      .catch(() => {})
    return out
  } catch (err) {
    if (err.code === "not_connected") {
      const row = await kv.readWithMeta(SPOTIFY_KV_NS, cacheKind)
      return row?.payload?.items ?? []
    }
    throw err
  }
}

async function getListeningHistory(limit = 50) {
  const capped = Math.min(Math.max(1, limit), LISTENING_HISTORY_MAX)
  try {
    const { recentListenHistory } = require("./spotify-library.cjs")
    const fromDb = await recentListenHistory(capped)
    if (fromDb.length) return fromDb
  } catch {
    // fall back to KV
  }
  const history = await kv.read(SPOTIFY_KV_NS, "listening_history")
  const items = history?.items ?? []
  return items.slice(0, capped)
}

function piDeviceHints() {
  const raw = process.env.NOTCH_PI_SPOTIFY_DEVICE || "raspotify,raspberry"
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

function deviceMatchesPi(name) {
  const n = String(name || "").toLowerCase()
  return piDeviceHints().some((hint) => n.includes(hint))
}

async function listDevices() {
  const res = await spotifyFetch("/me/player/devices")
  if (res.status === 401) {
    clearTokens()
    return []
  }
  if (!res.ok) return []
  const data = await res.json()
  return data.devices || []
}

async function findPiDeviceId() {
  const devices = await listDevices()
  for (const hint of piDeviceHints()) {
    const match = devices.find((d) => String(d.name || "").toLowerCase().includes(hint))
    if (match?.id) return match.id
  }
  return null
}

async function transferToPiDevice(play = false) {
  const deviceId = await findPiDeviceId()
  if (!deviceId) return false
  const res = await spotifyFetch("/me/player", {
    method: "PUT",
    body: JSON.stringify({ device_ids: [deviceId], play }),
  })
  return res.ok || res.status === 204
}

async function ensurePiPlaybackDevice(action) {
  const hints = piDeviceHints()
  if (!hints.length) return

  try {
    const res = await spotifyFetch("/me/player")
    if (res.status === 204) {
      await transferToPiDevice(action === "play")
      return
    }
    if (res.ok) {
      const data = await res.json()
      if (!deviceMatchesPi(data.device?.name)) {
        await transferToPiDevice(action === "play")
      }
      return
    }
  } catch {
    // fall through to transfer attempt
  }
  await transferToPiDevice(action === "play")
}

async function playUri(uri, options = {}) {
  if (!uri) throw new Error("missing_uri")
  const deviceId = options.targetPi ? await findPiDeviceId() : null
  const path = deviceId ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}` : "/me/player/play"
  const res = await spotifyFetch(path, {
    method: "PUT",
    body: JSON.stringify({ uris: [uri] }),
  })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text()
    throw new Error(text || `Spotify ${res.status}`)
  }
  return waitForPlaybackUpdate()
}

async function playbackAction(action, options = {}) {
  if (options.targetPi) {
    await ensurePiPlaybackDevice(action)
  }
  const endpoints = {
    play: { path: "/me/player/play", method: "PUT" },
    pause: { path: "/me/player/pause", method: "PUT" },
    next: { path: "/me/player/next", method: "POST" },
    previous: { path: "/me/player/previous", method: "POST" },
  }
  const spec = endpoints[action]
  if (!spec) throw new Error(`Unknown action: ${action}`)
  const res = await spotifyFetch(spec.path, { method: spec.method })
  // 204 success, 404 no device — both fine for UI
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text()
    throw new Error(text || `Spotify ${res.status}`)
  }
  return waitForPlaybackUpdate()
}

function startAuth() {
  const { clientId, redirectUri } = getConfig()
  if (!isConfigured()) {
    return Promise.reject(new Error("Spotify credentials missing in .env"))
  }

  return runLoopbackOAuth({
    port: CALLBACK_PORT,
    getInFlight: () => spotifyAuthInFlight,
    setInFlight: (value) => {
      spotifyAuthInFlight = value
    },
    successHtml:
      "<h1>Connected to Spotify</h1><p>You can close this window and return to notch.</p>",
    failHtml: "<h1>Spotify auth failed</h1><p>You can close this window.</p>",
    buildAuthorizeUrl: (state) => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: SCOPES,
        redirect_uri: redirectUri,
        show_dialog: "true",
        state,
      })
      return `https://accounts.spotify.com/authorize?${params}`
    },
    onCallback: async (code) => {
      const tokens = await exchangeToken({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      })
      writeTokens({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        expires_at: Date.now() + tokens.expires_in * 1000,
      })
    },
  })
}

function disconnect() {
  clearTokens()
  void kv.remove(SPOTIFY_KV_NS, "now_playing")
  return { connected: false, configured: isConfigured(), isPlaying: false, track: null }
}

const LRC_USER_AGENT = "notch/0.1 (https://github.com/yassenshopov/notch)"

async function fetchLyrics({ trackName, artistName, albumName, durationMs }) {
  if (!trackName || !artistName) {
    return { found: false, instrumental: false, plainLyrics: null, syncedLyrics: null }
  }

  const durationSec = Math.round((durationMs || 0) / 1000)
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
  })
  if (albumName) params.set("album_name", albumName)
  if (durationSec > 0) params.set("duration", String(durationSec))

  const res = await fetch(`https://lrclib.net/api/get?${params}`, {
    headers: { "User-Agent": LRC_USER_AGENT },
  })

  if (res.status === 404) {
    return { found: false, instrumental: false, plainLyrics: null, syncedLyrics: null }
  }
  if (!res.ok) {
    throw new Error(`Lyrics request failed (${res.status})`)
  }

  const data = await res.json()
  return {
    found: true,
    instrumental: Boolean(data.instrumental),
    plainLyrics: data.plainLyrics ?? null,
    syncedLyrics: data.syncedLyrics ?? null,
  }
}

async function fetchCurrentUserProfile() {
  if (!isConfigured() || !isConnected()) return null
  try {
    const res = await spotifyFetch("/me")
    if (!res.ok) return null
    const data = await res.json()
    const images = data.images || []
    const imageUrl =
      images.find((i) => i.width >= 80 && i.width <= 320)?.url || images[0]?.url || null
    return {
      displayName: data.display_name || null,
      imageUrl,
      id: data.id || null,
      product: data.product || null,
    }
  } catch {
    return null
  }
}

/** @param {string[]} artistNames */
async function fetchArtistsImages(artistNames) {
  if (!isConfigured() || !isConnected() || !artistNames?.length) return {}
  const unique = [...new Set(artistNames.map((n) => String(n || "").trim()).filter(Boolean))].slice(
    0,
    24,
  )
  const out = {}
  await Promise.all(
    unique.map(async (name) => {
      try {
        const res = await spotifyFetch(
          `/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
        )
        if (!res.ok) return
        const data = await res.json()
        const artist = data.artists?.items?.[0]
        if (!artist) return
        const images = artist.images || []
        const artUrl =
          images.find((img) => img.width >= 64 && img.width <= 320)?.url ||
          images[0]?.url ||
          null
        if (artUrl) out[name] = artUrl
      } catch {
        // skip
      }
    }),
  )
  return out
}

/** @param {string[]} trackIds */
async function fetchTracksAlbumArt(trackIds) {
  if (!isConfigured() || !isConnected() || !trackIds?.length) return {}
  const unique = [...new Set(trackIds.filter((id) => typeof id === "string" && id.trim()))].slice(
    0,
    400,
  )
  const out = {}
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50)
    try {
      const res = await spotifyFetch(`/tracks?ids=${encodeURIComponent(chunk.join(","))}`)
      if (!res.ok) continue
      const data = await res.json()
      for (const track of data.tracks || []) {
        if (!track?.id) continue
        const images = track.album?.images || []
        const artUrl =
          images.find((img) => img.width >= 64 && img.width <= 300)?.url ||
          images[0]?.url ||
          null
        out[track.id] = artUrl
      }
    } catch {
      // skip failed batch
    }
  }
  return out
}

module.exports = {
  isConfigured,
  isConnected,
  getCurrentlyPlaying,
  getRecentlyPlayed,
  getListeningHistory,
  playUri,
  playbackAction,
  startAuth,
  disconnect,
  fetchLyrics,
  fetchCurrentUserProfile,
  fetchTracksAlbumArt,
  fetchArtistsImages,
}
