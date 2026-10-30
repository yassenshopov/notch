const { execFile } = require("child_process")
const fs = require("fs")
const path = require("path")
const { promisify } = require("util")

const execFileAsync = promisify(execFile)

const MINT_FALLBACK_HOSTS = ["mint-home", "mint-ts"]
const REMOTE_REL_DIR = "Pictures/Notch"

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

function resolveScpExecutable() {
  const ssh = resolveSshExecutable()
  if (ssh.endsWith("ssh.exe")) {
    const scp = ssh.replace(/ssh\.exe$/i, "scp.exe")
    if (fs.existsSync(scp)) return scp
  }
  return "scp"
}

const SSH_BIN = resolveSshExecutable()
const SCP_BIN = resolveScpExecutable()

function resolveHosts(sshHost) {
  const primary =
    typeof sshHost === "string" && sshHost.trim()
      ? sshHost.trim()
      : process.env.NOTCH_MINT_SSH_HOST?.trim() || "mint"
  const seen = new Set()
  const hosts = []
  for (const h of [...MINT_FALLBACK_HOSTS, primary]) {
    if (!h || seen.has(h)) continue
    seen.add(h)
    hosts.push(h)
  }
  return hosts
}

function remoteFileName(year) {
  return `year-${year}-wallpaper.png`
}

async function sshRun(host, remoteCommand) {
  await execFileAsync(
    SSH_BIN,
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, remoteCommand],
    { timeout: 45_000, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  )
}

async function scpUpload(host, localPath, remoteRelPath) {
  const remote = `${host}:${remoteRelPath}`
  await execFileAsync(SCP_BIN, ["-o", "BatchMode=yes", "-o", "ConnectTimeout=8", localPath, remote], {
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
  })
}

/**
 * @param {{ localPath: string, year: number, sshHost?: string }} options
 */
async function syncWallpaperToMint(options) {
  if (process.platform !== "win32") {
    return { synced: false, skipped: true, reason: "not_windows" }
  }

  const localPath = path.resolve(options.localPath)
  if (!fs.existsSync(localPath)) {
    return { synced: false, error: "local_file_missing" }
  }

  const year = options.year ?? new Date().getFullYear()
  const fileName = remoteFileName(year)
  const remoteRel = `${REMOTE_REL_DIR}/${fileName}`
  const hosts = resolveHosts(options.sshHost)

  let lastErr = "mint_sync_failed"
  for (const host of hosts) {
    try {
      await sshRun(host, `mkdir -p ${REMOTE_REL_DIR}`)
      await scpUpload(host, localPath, remoteRel)
      const applyScript = [
        `DIR="$HOME/${REMOTE_REL_DIR}"`,
        `FILE="$DIR/${fileName}"`,
        `URI="file://$FILE"`,
        `gsettings set org.cinnamon.desktop.background picture-uri "$URI"`,
        `gsettings set org.cinnamon.desktop.background picture-options zoom`,
      ].join("; ")
      await sshRun(host, applyScript)
      return { synced: true, host, remotePath: `~/${remoteRel}` }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "mint_sync_failed"
    }
  }

  return { synced: false, error: lastErr, hostsTried: hosts }
}

module.exports = {
  syncWallpaperToMint,
  remoteFileName,
  REMOTE_REL_DIR,
}
