const { execFile } = require("child_process")
const fs = require("fs")
const path = require("path")
const { promisify } = require("util")
const kv = require("./snapshot-kv.cjs")

const execFileAsync = promisify(execFile)

const SERVER_STATS_DB_STALE_MS = 5 * 60 * 1000

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

const SSH_PER_HOST_TIMEOUT_MS = 12_000

function getTailscaleHealthHint() {
  if (process.platform !== "win32") return null
  const ts = path.join(process.env.ProgramFiles || "C:\\Program Files", "Tailscale", "tailscale.exe")
  if (!fs.existsSync(ts)) return null
  const { execFileSync } = require("child_process")
  let raw = ""
  try {
    raw = execFileSync(ts, ["status"], {
      encoding: "utf8",
      timeout: 12_000,
      windowsHide: true,
    })
  } catch (err) {
    raw = [err.message, err.stderr, err.stdout].filter(Boolean).join("\n")
  }
  if (/unexpected state:\s*NoState/i.test(raw)) {
    return (
      "Tailscale on this PC is stuck in NoState (common when Mint AdGuard DNS clashes with Tailscale MagicDNS). " +
      "Run scripts\\fix-windows-tailscale.ps1 as Administrator, then Retry."
    )
  }
  if (/Unable to connect to the Tailscale coordination server/i.test(raw)) {
    return (
      "Tailscale cannot sync with its coordination server, so mint-ts / pi-ts will fail until it is healthy. " +
      "Run scripts\\fix-windows-tailscale.ps1 as Administrator."
    )
  }
  if (/Logged out/i.test(raw)) {
    return (
      "Tailscale is logged out on this PC — open Tailscale from the tray and click Connect. " +
      "Wallpaper sync to Mint needs mint-ts (or home LAN ssh)."
    )
  }
  return null
}

function sshBaseArgs(host, remoteCommand) {
  return [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=6",
    "-o",
    "PreferredAuthentications=publickey",
    "-o",
    "GSSAPIAuthentication=no",
    host,
    remoteCommand,
  ]
}

function extractTailscaleSshCheckUrl(text) {
  if (typeof text !== "string") return null
  const match = text.match(/https:\/\/login\.tailscale\.com\/[^\s\r\n'"]+/i)
  return match ? match[0] : null
}

function formatSshAttemptError(err, host) {
  const raw =
    err instanceof Error
      ? [err.message, err.stderr, err.stdout].filter(Boolean).join("\n")
      : String(err)
  const tailscaleUrl = extractTailscaleSshCheckUrl(raw)

  if (/Tailscale SSH requires an additional check/i.test(raw)) {
    return {
      message: `Tailscale SSH needs a one-time check-in on this PC (host ${host}). Open the link below, then Retry.`,
      helpUrl: tailscaleUrl,
    }
  }

  if (/Could not resolve hostname.*\.local/i.test(raw) || /No such host is known.*\.local/i.test(raw)) {
    return {
      message: `Windows cannot resolve ${host} (.local). In ~/.ssh/config set pi-home / pi HostName to the Pi's LAN IP (not raspberrypi.local), or use pi-ts with Tailscale.`,
      helpUrl: tailscaleUrl,
    }
  }

  if (/Connection timed out|Destination host unreachable/i.test(raw)) {
    return {
      message: `${host}: no SSH on the network (device off, wrong IP, or not on home Wi‑Fi). ${raw.split("\n")[0] ?? raw}`,
      helpUrl: tailscaleUrl,
    }
  }

  const line = raw.split("\n").find((l) => l.trim()) ?? raw
  return { message: `${host}: ${line}`.slice(0, 480), helpUrl: tailscaleUrl }
}

function createSshServerStats({
  defaultHost,
  fallbackHosts = [],
  defaultScript,
  envHostKey,
  envScriptKey,
  errorTag,
  kvNamespace,
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
      sshBaseArgs(host, statsScript()),
      {
        timeout: SSH_PER_HOST_TIMEOUT_MS,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        env: process.env,
      },
    )
    const line = stdout.trim().split("\n").pop()
    return JSON.parse(line)
  }

  function disconnected(host, message, helpUrl = null) {
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
      sshHelpUrl: helpUrl,
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

  async function readKvPayload(hostKey) {
    if (!kvNamespace) return null
    const row = await kv.readWithMeta(kvNamespace, hostKey)
    if (!row?.payload) return null
    const age = row.syncedAt ? Date.now() - row.syncedAt : Number.POSITIVE_INFINITY
    if (age >= SERVER_STATS_DB_STALE_MS) return null
    return { ...row.payload, fromCache: true, cachedAt: row.syncedAt }
  }

  async function status(options = {}) {
    const force = options.force === true
    const hosts = resolveHosts(options)
    const hostKey = hosts.join(",")
    const now = Date.now()
    if (!force && cache.payload && cache.host === hostKey && now - cache.at < CACHE_MS) {
      return cache.payload
    }

    if (!force) {
      const cached = await readKvPayload(hostKey)
      if (cached) {
        cache = { at: now, host: hostKey, payload: cached }
        return cached
      }
    }

    let lastErr = errorTag
    let helpUrl = null
    const attemptNotes = []
    for (const host of hosts) {
      try {
        const stats = await fetchStats(host)
        const payload = {
          configured: true,
          connected: true,
          host,
          error: null,
          sshHelpUrl: null,
          ...stats,
        }
        cache = { at: now, host: hostKey, payload }
        if (kvNamespace) {
          await kv.write(kvNamespace, hostKey, payload).catch(() => {})
        }
        return payload
      } catch (err) {
        const formatted = formatSshAttemptError(err, host)
        attemptNotes.push(formatted.message)
        lastErr = formatted.message
        if (!helpUrl && formatted.helpUrl) helpUrl = formatted.helpUrl
      }
    }

    let summary =
      attemptNotes.length > 1
        ? `Tried ${hosts.join(" → ")}. ${lastErr}`
        : lastErr
    const tailscaleHint = getTailscaleHealthHint()
    if (tailscaleHint) {
      summary = `${tailscaleHint} ${summary}`
    }
    const displayHost = hosts.includes(sshHost()) ? sshHost() : (hosts[0] ?? defaultHost)
    const cached = await readKvPayload(hostKey).catch(() => null)
    if (cached?.connected) {
      return { ...cached, error: summary, sshHelpUrl: helpUrl }
    }
    const payload = disconnected(displayHost, summary, helpUrl)
    cache = { at: now, host: hostKey, payload }
    return payload
  }

  return { status, configured: () => true }
}

async function execSshRemote(host, command, execOptions = {}) {
  const { stdout } = await execFileAsync(
    SSH_BIN,
    sshBaseArgs(host, command),
    {
      timeout: execOptions.timeout ?? SSH_PER_HOST_TIMEOUT_MS,
      windowsHide: true,
      maxBuffer: 4 * 1024 * 1024,
      env: process.env,
    },
  )
  return stdout
}

module.exports = {
  createSshServerStats,
  execSshRemote,
  SSH_BIN,
  sshBaseArgs,
  formatSshAttemptError,
  getTailscaleHealthHint,
}
