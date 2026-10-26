const { execFile } = require("child_process")
const { promisify } = require("util")

const execFileAsync = promisify(execFile)

function createSshServerStats({
  defaultHost,
  defaultScript,
  envHostKey,
  envScriptKey,
  errorTag,
}) {
  const CACHE_MS = 8_000
  let cache = { at: 0, host: null, payload: null }

  function sshHost() {
    const fromEnv = process.env[envHostKey]
    if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
    return defaultHost
  }

  function statsScript() {
    const fromEnv = process.env[envScriptKey]
    if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.trim()
    return defaultScript
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
      cpuTempC: null,
      error: message,
    }
  }

  async function status(options = {}) {
    const force = options.force === true
    const host =
      typeof options.host === "string" && options.host.trim() ? options.host.trim() : sshHost()
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
      const message = err instanceof Error ? err.message : errorTag
      const payload = disconnected(host, message)
      cache = { at: now, host, payload }
      return payload
    }
  }

  return { status, configured: () => true }
}

module.exports = { createSshServerStats }
