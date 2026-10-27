const http = require("http")
const fs = require("fs")
const path = require("path")
const { shell, app } = require("electron")

const SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-recently-played",
].join(" ")

const CALLBACK_PORT = 43110

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
  if (!tokens?.access_token) return null

  if (tokens.expires_at && tokens.expires_at > Date.now() + 30_000) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) return null

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
}

async function spotifyFetch(endpoint, options = {}) {
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
  return res
}

function mapTrack(item) {
  if (!item) return null
  const artists = (item.artists || []).map((a) => a.name).join(", ")
  const images = item.album?.images || []
  const art =
    images.find((i) => i.width >= 200 && i.width <= 400)?.url ||
    images[0]?.url ||
    null

  return {
    id: item.id,
    name: item.name,
    artists,
    album: item.album?.name ?? "",
    artUrl: art,
    uri: item.uri,
  }
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

async function getCurrentlyPlaying() {
  if (!isConfigured()) {
    return { connected: false, configured: false, isPlaying: false, track: null }
  }
  if (!isConnected()) {
    return { connected: false, configured: true, isPlaying: false, track: null }
  }

  try {
    const res = await spotifyFetch("/me/player")
    if (res.status === 204) {
      return { connected: true, configured: true, isPlaying: false, track: null }
    }
    if (res.status === 401) {
      clearTokens()
      return { connected: false, configured: true, isPlaying: false, track: null }
    }
    if (!res.ok) {
      // No active device / premium issues — treat as idle
      if (res.status === 204 || res.status === 404) {
        return { connected: true, configured: true, isPlaying: false, track: null }
      }
      const text = await res.text()
      throw new Error(text || `Spotify ${res.status}`)
    }
    const data = await res.json()
    return { ...mapPlayback(data), configured: true }
  } catch (err) {
    if (err.code === "not_connected") {
      return { connected: false, configured: true, isPlaying: false, track: null }
    }
    throw err
  }
}

async function getRecentlyPlayed(limit = 6) {
  if (!isConfigured() || !isConnected()) {
    return []
  }

  try {
    const capped = Math.min(Math.max(1, limit), 20)
    const res = await spotifyFetch(`/me/player/recently-played?limit=${capped}`)
    if (res.status === 401) {
      clearTokens()
      return []
    }
    if (!res.ok) {
      return []
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
    return out
  } catch (err) {
    if (err.code === "not_connected") return []
    throw err
  }
}

async function playUri(uri) {
  if (!uri) throw new Error("missing_uri")
  const res = await spotifyFetch("/me/player/play", {
    method: "PUT",
    body: JSON.stringify({ uris: [uri] }),
  })
  if (!res.ok && res.status !== 204 && res.status !== 404) {
    const text = await res.text()
    throw new Error(text || `Spotify ${res.status}`)
  }
  return getCurrentlyPlaying()
}

async function playbackAction(action) {
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
  return getCurrentlyPlaying()
}

function startAuth() {
  return new Promise((resolve, reject) => {
    const { clientId, redirectUri } = getConfig()
    if (!isConfigured()) {
      reject(new Error("Spotify credentials missing in .env"))
      return
    }

    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://127.0.0.1:${CALLBACK_PORT}`)
        if (url.pathname !== "/callback") {
          res.writeHead(404)
          res.end()
          return
        }

        const error = url.searchParams.get("error")
        const code = url.searchParams.get("code")

        if (error || !code) {
          res.writeHead(400, { "Content-Type": "text/html" })
          res.end("<h1>Spotify auth failed</h1><p>You can close this window.</p>")
          server.close()
          reject(new Error(error || "missing_code"))
          return
        }

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

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(
          "<h1>Connected to Spotify</h1><p>You can close this window and return to notch.</p>",
        )
        server.close()
        resolve(true)
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" })
        res.end("<h1>Auth error</h1><p>You can close this window.</p>")
        server.close()
        reject(err)
      }
    })

    server.listen(CALLBACK_PORT, "127.0.0.1", () => {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: clientId,
        scope: SCOPES,
        redirect_uri: redirectUri,
        show_dialog: "true",
      })
      void shell.openExternal(`https://accounts.spotify.com/authorize?${params}`)
    })

    server.on("error", (err) => {
      reject(err)
    })

    // Safety timeout
    setTimeout(() => {
      try {
        server.close()
      } catch {
        // ignore
      }
      reject(new Error("Auth timed out"))
    }, 5 * 60 * 1000)
  })
}

function disconnect() {
  clearTokens()
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

module.exports = {
  isConfigured,
  isConnected,
  getCurrentlyPlaying,
  getRecentlyPlayed,
  playUri,
  playbackAction,
  startAuth,
  disconnect,
  fetchLyrics,
}
