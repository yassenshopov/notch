const { execFile } = require("child_process")
const fs = require("fs")
const path = require("path")
const { promisify } = require("util")
const {
  SSH_BIN,
  sshBaseArgs,
  formatSshAttemptError,
  getTailscaleHealthHint,
} = require("./ssh-server-stats.cjs")
const { resolveMintSshHosts, REMOTE_REL_DIR } = require("./mint-ssh-hosts.cjs")

const execFileAsync = promisify(execFile)

function resolveScpExecutable() {
  const fromEnv = process.env.NOTCH_SCP_PATH
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    const p = fromEnv.trim()
    if (fs.existsSync(p)) return p
  }
  if (SSH_BIN.endsWith("ssh.exe")) {
    const scp = SSH_BIN.replace(/ssh\.exe$/i, "scp.exe")
    if (fs.existsSync(scp)) return scp
  }
  return "scp"
}

const SCP_BIN = resolveScpExecutable()

function scpTransferArgs(localPath, remoteDest) {
  return [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=8",
    "-o",
    "PreferredAuthentications=publickey",
    "-o",
    "GSSAPIAuthentication=no",
    localPath,
    remoteDest,
  ]
}

function remoteFileName(year) {
  return `year-${year}-wallpaper.png`
}

function buildApplyWallpaperCommand(fileName) {
  const file = `"$HOME/${REMOTE_REL_DIR}/${fileName}"`
  return [
    `FILE=${file}`,
    `test -f "$FILE"`,
    `if [ -x "$HOME/bin/notch-apply-wallpaper.sh" ]; then exec "$HOME/bin/notch-apply-wallpaper.sh" "$FILE"; fi`,
    `URI="file://$FILE"`,
    `UID_N=$(id -u)`,
    `export XDG_RUNTIME_DIR="/run/user/$UID_N"`,
    `if [ -S "$XDG_RUNTIME_DIR/bus" ]; then export DBUS_SESSION_BUS_ADDRESS="unix:path=$XDG_RUNTIME_DIR/bus"; fi`,
    'export DISPLAY="${DISPLAY:-:0}"',
    `gsettings set org.cinnamon.desktop.background picture-uri "$URI"`,
    `gsettings set org.cinnamon.desktop.background picture-uri-dark "$URI"`,
    `gsettings set org.cinnamon.desktop.background picture-options zoom`,
    `gsettings set org.gnome.desktop.background picture-uri "$URI" 2>/dev/null || true`,
  ].join("; ")
}

async function sshRun(host, remoteCommand) {
  await execFileAsync(SSH_BIN, sshBaseArgs(host, remoteCommand), {
    timeout: 45_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  })
}

async function scpUpload(host, localPath, remoteRelPath) {
  const remoteDest = `${host}:~/${remoteRelPath}`
  await execFileAsync(SCP_BIN, scpTransferArgs(localPath, remoteDest), {
    timeout: 120_000,
    windowsHide: true,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  })
}

/**
 * @param {{ localPath: string, year: number, sshHost?: string }} options
 */
async function syncWallpaperToMint(options) {
  if (process.platform !== "win32") {
    return { synced: false, skipped: true, reason: "not_windows" }
  }

  const tailscaleHint = getTailscaleHealthHint()
  const localPath = path.resolve(options.localPath)
  if (!fs.existsSync(localPath)) {
    return { synced: false, error: "local_file_missing", tailscaleHint: tailscaleHint ?? undefined }
  }

  const year = options.year ?? new Date().getFullYear()
  const fileName = remoteFileName(year)
  const remoteRel = `${REMOTE_REL_DIR}/${fileName}`
  const hosts = resolveMintSshHosts(options.sshHost)

  let lastErr = "mint_sync_failed"
  const attemptNotes = []
  for (const host of hosts) {
    let uploaded = false
    try {
      await sshRun(host, `mkdir -p ${REMOTE_REL_DIR}`)
      await scpUpload(host, localPath, remoteRel)
      uploaded = true
      await sshRun(host, buildApplyWallpaperCommand(fileName))
      return { synced: true, host, remotePath: `~/${remoteRel}`, uploaded: true, applied: true }
    } catch (err) {
      const formatted = formatSshAttemptError(err, host)
      attemptNotes.push(formatted.message)
      lastErr = formatted.message
      if (uploaded) {
        return {
          synced: false,
          uploaded: true,
          applied: false,
          host,
          remotePath: `~/${remoteRel}`,
          error: `Uploaded but could not set Cinnamon wallpaper: ${formatted.message}`,
          tailscaleHint: tailscaleHint ?? undefined,
        }
      }
    }
  }

  let error =
    attemptNotes.length > 1 ? `Tried ${hosts.join(" → ")}. ${lastErr}` : lastErr
  if (tailscaleHint) {
    error = `${tailscaleHint} ${error}`
  }

  console.error("[notch] wallpaper mint sync failed:", error)

  return { synced: false, error, hostsTried: hosts, tailscaleHint: tailscaleHint ?? undefined }
}

module.exports = {
  syncWallpaperToMint,
  remoteFileName,
  REMOTE_REL_DIR,
}