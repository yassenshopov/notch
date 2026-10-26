const { execFile } = require("child_process")
const { promisify } = require("util")

const execFileAsync = promisify(execFile)

const DEFAULT_HOST = "mint"
const DEFAULT_SCRIPT = "/home/yassenshopov/bin/notch-mint-stats.sh"
const CACHE_MS = 8_000

let cache = { at: 0, payload: null }

function sshHost() {
  const fromEnv = process.env.NOTCH_MINT_SSH_HOST
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
  return DEFAULT_HOST
}

function statsScript() {
  const fromEnv = process.env.NOTCH_MINT_STATS_SCRIPT
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
  return DEFAULT_SCRIPT
}

async function fetchStats(host) {
  const { stdout } = await execFileAsync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=12", host, statsScript()],
    { timeout: 22_000, windowsHide: true, maxBuffer: 1024 * 1024 },
  )
  const line = stdout.trim().split("\n").pop()
  return JSON.parse(line)
}

function disconnected(host, message) {
  return {
    configured: true,
    connected: false,
    host,
    hostname: null,
    uptimeSec: null,
    load1: null,
    load5: null,
    load15: null,
    memTotalMb: null,
    memUsedMb: null,
    memUsedPct: null,
    diskTotalGb: null,
    diskUsedGb: null,
    diskUsedPct: null,
    tailscaleIp: null,
    mirrorRepoCount: null,
    mirrorLastLog: null,
    error: message,
  }
}

async function status(options = {}) {
  const force = options.force === true
  const host = typeof options.host === "string" && options.host.trim() ? options.host.trim() : sshHost()
  const now = Date.now()
  if (!force && cache.payload && cache.host === host && now - cache.at < CACHE_MS) {
    return cache.payload
  }

  try {
    const stats = await fetchStats(host)
    const payload = {
      configured: true,
      connected: true,
      host,
      error: null,
      ...stats,
    }
    cache = { at: now, host, payload }
    return payload
  } catch (err) {
    const message = err instanceof Error ? err.message : "mint_ssh_error"
    const payload = disconnected(host, message)
    cache = { at: now, host, payload }
    return payload
  }
}

function configured() {
  return true
}

module.exports = { status, configured }
