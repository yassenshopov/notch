const { execSshRemote } = require("./ssh-server-stats.cjs")

const DISPLAY_PORT = 8
const DEFAULT_HOST = "pi"
const FALLBACK_HOSTS = ["pi-ts", "pi-home"]
const ENV_HOST_KEY = "NOTCH_PI_SSH_HOST"

function sshHost() {
  const fromEnv = process.env[ENV_HOST_KEY]
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
  return DEFAULT_HOST
}

function resolveHosts(options = {}) {
  const primary =
    typeof options.host === "string" && options.host.trim() ? options.host.trim() : sshHost()
  const seen = new Set()
  const hosts = []
  for (const h of [...FALLBACK_HOSTS, primary]) {
    if (!h || seen.has(h)) continue
    seen.add(h)
    hosts.push(h)
  }
  return hosts
}

function curlCmd(path, method = "GET") {
  const url = `http://127.0.0.1:${DISPLAY_PORT}${path}`
  if (method === "POST") {
    return `curl -sfS -m 10 -X POST '${url}'`
  }
  return `curl -sfS -m 10 '${url}'`
}

async function fetchJson(host, path, method = "GET") {
  const stdout = await execSshRemote(host, curlCmd(path, method), { timeout: 25_000 })
  const text = stdout.trim()
  if (!text) throw new Error("pi_display_empty")
  return JSON.parse(text)
}

async function withHost(options, fn) {
  const hosts = resolveHosts(options)
  let lastErr = "pi_display_error"
  for (const host of hosts) {
    try {
      const data = await fn(host)
      return { connected: true, host, error: null, ...data }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "pi_display_error"
    }
  }
  return { connected: false, host: hosts[0] ?? DEFAULT_HOST, error: lastErr }
}

async function getMode(options = {}) {
  const result = await withHost(options, (host) => fetchJson(host, "/api/mode"))
  if (!result.connected) {
    return { ...result, mode: null }
  }
  return { ...result, mode: typeof result.mode === "number" ? result.mode : null }
}

async function setMode(mode, options = {}) {
  const m = Number(mode)
  if (!Number.isInteger(m) || m < 1 || m > 9) {
    return { connected: false, host: sshHost(), error: "invalid_mode", mode: null }
  }
  const result = await withHost(options, (host) =>
    fetchJson(host, `/api/mode?set=${m}`, "POST"),
  )
  if (!result.connected) {
    return { ...result, mode: null, switched: false }
  }
  return {
    connected: true,
    host: result.host,
    error: null,
    mode: typeof result.mode === "number" ? result.mode : m,
    switched: Boolean(result.switched),
  }
}

async function getNowPlaying(options = {}) {
  const result = await withHost(options, (host) => fetchJson(host, "/api/now-playing"))
  if (!result.connected) {
    return {
      connected: false,
      host: result.host,
      error: result.error,
      playing: false,
      mode: null,
      track: null,
      artist: null,
      album: null,
      artUrl: null,
      progressMs: null,
      durationMs: null,
    }
  }

  return {
    connected: true,
    host: result.host,
    error: null,
    playing: Boolean(result.playing),
    mode: typeof result.mode === "number" ? result.mode : null,
    track: typeof result.track === "string" ? result.track : null,
    artist: typeof result.artist === "string" ? result.artist : null,
    album: typeof result.album === "string" ? result.album : null,
    artUrl: typeof result.art === "string" ? result.art : null,
    progressMs: typeof result.progress_ms === "number" ? result.progress_ms : null,
    durationMs: typeof result.duration_ms === "number" ? result.duration_ms : null,
  }
}

module.exports = {
  getMode,
  setMode,
  getNowPlaying,
}
