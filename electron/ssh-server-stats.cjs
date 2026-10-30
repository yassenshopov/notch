const { execFile } = require("child_process")
const fs = require("fs")
const path = require("path")
const { promisify } = require("util")

const execFileAsync = promisify(execFile)

function resolveSshExecutable() {
  const fromEnv = process.env.NOTCH_SSH_PATH
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    const p = fromEnv.trim()
    if (fs.existsSync(p)) return p
  }
  const candidates = []
  if (process.platform === "win32") {
    const windir = process.env.WINDIR || "C:\\Windows"
    candidates.push(
      path.join(windir, "System32", "OpenSSH", "ssh.exe"),
      path.join(process.env["ProgramFiles"] || "C:\\Program Files", "Git", "usr", "bin", "ssh.exe"),
    )
  }
  candidates.push("ssh")
  for (const candidate of candidates) {
    if (candidate === "ssh") return candidate
    if (fs.existsSync(candidate)) return candidate
  }
  return "ssh"
}

const SSH_BIN = resolveSshExecutable()

function createSshServerStats({
  defaultHost,
  fallbackHosts = [],
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
      SSH_BIN,
      ["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", host, statsScript()],
      {
        timeout: 45_000,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        env: process.env,
      },
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
      swapTotalMb: null,
      swapUsedMb: null,
      swapUsedPct: null,
      cpuCount: null,
      processCount: null,
      error: message,
    }
  }

  function resolveHosts(options) {
    const primary =
      typeof options.host === "string" && options.host.trim() ? options.host.trim() : sshHost()
    const seen = new Set()
    const hosts = []
    // LAN fallbacks first (faster at home); Tailscale primary still tried when away.
    for (const h of [...fallbackHosts, primary]) {
      if (!h || seen.has(h)) continue
      seen.add(h)
      hosts.push(h)
    }
    return hosts
  }

  async function status(options = {}) {
    const force = options.force === true
    const hosts = resolveHosts(options)
    const hostKey = hosts.join(",")
    const now = Date.now()
    if (!force && cache.payload && cache.host === hostKey && now - cache.at < CACHE_MS) {
      return cache.payload
    }

    let lastErr = errorTag
    for (const host of hosts) {
      try {
        const stats = await fetchStats(host)
        const payload = {
          configured: true,
          connected: true,
          host,
          error: null,
          ...stats,
        }
        cache = { at: now, host: hostKey, payload }
        return payload
      } catch (err) {
        lastErr = err instanceof Error ? err.message : errorTag
      }
    }

    const payload = disconnected(hosts[0] ?? defaultHost, lastErr)
    cache = { at: now, host: hostKey, payload }
    return payload
  }

  return { status, configured: () => true }
}

async function execSshRemote(host, command, execOptions = {}) {
  const { stdout } = await execFileAsync(
    SSH_BIN,
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=6", host, command],
    {
      timeout: execOptions.timeout ?? 45_000,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    },
  )
  return stdout
}

module.exports = { createSshServerStats, execSshRemote }
