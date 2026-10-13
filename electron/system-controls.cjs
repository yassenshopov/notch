/**
 * Windows quick controls:
 * - Volume / mute / mic / playback via bundled NirSoft SoundVolumeCommandLine (svcl)
 * - Brightness via WMI
 * - Bluetooth devices via PnP
 */
const { execFile } = require("child_process")
const { promisify } = require("util")
const fs = require("fs")
const path = require("path")
const os = require("os")

const execFileAsync = promisify(execFile)

const SVCL = path.join(__dirname, "native", "svcl", "svcl.exe")

/** Bumped on every mutation so in-flight status polls are discarded. */
let mutationEpoch = 0

/** Device lists are slow — cache and refresh on a longer cadence. */
let deviceCache = {
  playback: [],
  bluetooth: [],
  at: 0,
}
const DEVICE_CACHE_MS = 12_000

/**
 * svcl.exe is not multi-instance safe.
 * Writes jump ahead of queued reads so sliders actually apply.
 */
let svclTail = Promise.resolve()
let svclReadGate = Promise.resolve()

function bumpMutation() {
  mutationEpoch += 1
  deviceCache.at = 0
}

function psEncode(script) {
  return Buffer.from(script, "utf16le").toString("base64")
}

async function runPs(script, { timeout = 12000 } = {}) {
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      psEncode(script),
    ],
    {
      windowsHide: true,
      timeout,
      maxBuffer: 2 * 1024 * 1024,
      encoding: "utf8",
    },
  )
  return (stdout || "").trim()
}

function enqueueSvcl(args, { timeout = 8000, priority = "read" } = {}) {
  const run = async () => {
    if (!fs.existsSync(SVCL)) {
      throw new Error("svcl_missing")
    }
    try {
      const result = await execFileAsync(SVCL, args, {
        windowsHide: true,
        timeout,
        encoding: "utf8",
      })
      return { code: 0, stdout: (result.stdout || "").trim() }
    } catch (err) {
      // svcl returns data via exit code for Get* commands (without /Stdout)
      if (typeof err.code === "number") {
        return { code: err.code, stdout: (err.stdout || "").trim() }
      }
      throw err
    }
  }

  if (priority === "write") {
    // Run after the current in-flight call, but before queued reads.
    const next = svclTail.then(run, run)
    svclTail = next.then(
      () => undefined,
      () => undefined,
    )
    // Reads that already chained onto the old gate will still wait on svclTail
    // via their own chain; new reads wait on this write first.
    svclReadGate = svclTail
    return next
  }

  const next = svclReadGate.then(() => svclTail.then(run, run), () => svclTail.then(run, run))
  svclReadGate = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function runSvcl(args, opts) {
  return enqueueSvcl(args, { ...opts, priority: "read" })
}

function runSvclWrite(args, opts) {
  return enqueueSvcl(args, { ...opts, priority: "write" })
}

function parsePercent(result) {
  if (result.stdout) {
    const n = Number.parseFloat(String(result.stdout).replace(",", "."))
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)))
  }
  // GetPercent exit code is percent * 10 (one decimal place)
  const fromCode = Number(result.code)
  if (Number.isFinite(fromCode)) {
    return Math.max(0, Math.min(100, Math.round(fromCode / 10)))
  }
  return 50
}

function parseMute(result) {
  if (result.stdout) {
    const s = String(result.stdout).trim().toLowerCase()
    if (s === "1" || s === "true" || s === "yes") return true
    if (s === "0" || s === "false" || s === "no") return false
  }
  return Number(result.code) === 1
}

async function getAudio() {
  const vol = await runSvcl(["/Stdout", "/GetPercent", "DefaultRenderDevice"])
  const mute = await runSvcl(["/Stdout", "/GetMute", "DefaultRenderDevice"])
  const micMute = await runSvcl(["/Stdout", "/GetMute", "DefaultCaptureDevice"])
  return {
    volume: parsePercent(vol),
    muted: parseMute(mute),
    micMuted: parseMute(micMute),
  }
}

async function listPlaybackDevices() {
  const tmp = path.join(
    os.tmpdir(),
    `notch-svcl-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.csv`,
  )
  try {
    await runSvcl(["/scomma", tmp], { timeout: 10000 })
    const text = fs.readFileSync(tmp, "utf8")
    const lines = text.split(/\r?\n/).filter(Boolean)
    if (lines.length < 2) return []
    const headers = parseCsvLine(lines[0])
    const idx = (name) => headers.indexOf(name)
    const devices = []
    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i])
      if (cols[idx("Type")] !== "Device") continue
      if (cols[idx("Direction")] !== "Render") continue
      const name = cols[idx("Device Name")] || cols[idx("Name")] || "Device"
      const friendly = cols[idx("Command-Line Friendly ID")] || name
      const id = cols[idx("Item ID")] || friendly
      const def = String(cols[idx("Default")] || "")
      devices.push({
        id,
        name: friendly.includes("\\Device\\")
          ? friendly.split("\\Device\\")[1]?.split("\\")[0] || name
          : name,
        friendlyId: friendly,
        isDefault: /render/i.test(def) || def === "Render",
      })
    }
    return devices
  } catch {
    return []
  } finally {
    try {
      fs.unlinkSync(tmp)
    } catch {
      // ignore
    }
  }
}

function parseCsvLine(line) {
  const out = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (ch === "," && !inQuotes) {
      out.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  out.push(cur)
  return out
}

async function getBrightness() {
  try {
    const raw = await runPs(`
$ErrorActionPreference = 'SilentlyContinue'
$b = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness)
if (-not $b.Count) { Write-Output '{"supported":false,"level":null}'; exit 0 }
$level = [int]($b | Measure-Object -Property CurrentBrightness -Average).Average
Write-Output (@{ supported = $true; level = $level } | ConvertTo-Json -Compress)
`)
    return JSON.parse(raw)
  } catch {
    return { supported: false, level: null }
  }
}

async function listBluetooth() {
  try {
    const raw = await runPs(
      `
$ErrorActionPreference = 'SilentlyContinue'
$skip = 'Radio|Adapter|Enumerator|Transport|Avrcp|Rfcomm|Generic|Attribute|Profile|Service|Information|Microsoft Bluetooth|LE Device'
@(Get-PnpDevice -Class Bluetooth |
  Where-Object {
    $_.FriendlyName -and
    ($_.FriendlyName -notmatch $skip) -and
    ($_.InstanceId -like 'BTHENUM\\DEV_*' -or $_.InstanceId -like 'BTHLE\\DEV_*')
  } |
  ForEach-Object {
    [pscustomobject]@{
      id = $_.InstanceId
      name = $_.FriendlyName
      connected = ($_.Status -eq 'OK')
      status = $_.Status
    }
  }) | ConvertTo-Json -Compress -Depth 3
`,
      { timeout: 15000 },
    )
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

async function refreshDevices(force = false) {
  const now = Date.now()
  if (!force && now - deviceCache.at < DEVICE_CACHE_MS) {
    return deviceCache
  }
  const [playback, bluetooth] = await Promise.all([
    listPlaybackDevices(),
    listBluetooth(),
  ])
  deviceCache = {
    playback: playback ?? [],
    bluetooth: bluetooth ?? [],
    at: Date.now(),
  }
  return deviceCache
}

let statusInFlight = null
let statusInFlightEpoch = -1

async function getStatus() {
  if (process.platform !== "win32") {
    return {
      platform: process.platform,
      supported: false,
      volume: 50,
      muted: false,
      micMuted: false,
      brightness: null,
      brightnessSupported: false,
      playback: [],
      bluetooth: [],
    }
  }

  const epochAtStart = mutationEpoch
  if (statusInFlight && statusInFlightEpoch === epochAtStart) {
    return statusInFlight
  }

  statusInFlightEpoch = epochAtStart
  statusInFlight = (async () => {
    // Audio + brightness first (needed for sliders). Devices from cache / background.
    const devicesPromise = refreshDevices(false)
    const [audio, brightness] = await Promise.all([
      getAudio().catch(() => ({ volume: 50, muted: false, micMuted: false })),
      getBrightness(),
    ])

    // If a write landed while we were reading, don't publish stale slider values.
    if (mutationEpoch !== epochAtStart) {
      const fresh = await getAudio().catch(() => audio)
      const bright = await getBrightness().catch(() => brightness)
      const devices = await devicesPromise.catch(() => deviceCache)
      return {
        platform: "win32",
        supported: true,
        volume: fresh.volume,
        muted: fresh.muted,
        micMuted: fresh.micMuted,
        brightness: bright?.level ?? null,
        brightnessSupported: Boolean(bright?.supported),
        playback: devices.playback ?? [],
        bluetooth: devices.bluetooth ?? [],
      }
    }

    const devices = await devicesPromise.catch(() => deviceCache)
    return {
      platform: "win32",
      supported: true,
      volume: audio.volume,
      muted: audio.muted,
      micMuted: audio.micMuted,
      brightness: brightness?.level ?? null,
      brightnessSupported: Boolean(brightness?.supported),
      playback: devices.playback ?? [],
      bluetooth: devices.bluetooth ?? [],
    }
  })()

  try {
    return await statusInFlight
  } finally {
    if (statusInFlightEpoch === epochAtStart) {
      statusInFlight = null
    }
  }
}

async function setVolume(level) {
  bumpMutation()
  const n = Math.max(0, Math.min(100, Math.round(Number(level))))
  await runSvclWrite(["/SetVolume", "DefaultRenderDevice", String(n)])
  if (n > 0) {
    await runSvclWrite(["/Unmute", "DefaultRenderDevice"]).catch(() => undefined)
  }
  return { volume: n }
}

async function setMuted(muted) {
  bumpMutation()
  await runSvclWrite([muted ? "/Mute" : "/Unmute", "DefaultRenderDevice"])
  return { muted: Boolean(muted) }
}

async function setMicMuted(muted) {
  bumpMutation()
  await runSvclWrite([muted ? "/Mute" : "/Unmute", "DefaultCaptureDevice"])
  return { micMuted: Boolean(muted) }
}

async function setBrightness(level) {
  bumpMutation()
  const n = Math.max(0, Math.min(100, Math.round(Number(level))))
  // Apply to every WMI-capable display; First-only fails when the primary
  // entry is a non-controllable external panel.
  const raw = await runPs(
    `
$ErrorActionPreference = 'Stop'
$n = ${n}
$methods = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop)
if (-not $methods.Count) { throw 'brightness_unsupported' }
$ok = 0
foreach ($m in $methods) {
  try { $m.WmiSetBrightness(1, $n) | Out-Null; $ok++ } catch {}
}
if ($ok -lt 1) { throw 'brightness_failed' }
$b = @(Get-CimInstance -Namespace root/WMI -ClassName WmiMonitorBrightness -ErrorAction SilentlyContinue)
$level = if ($b.Count) { [int]($b | Measure-Object -Property CurrentBrightness -Average).Average } else { $n }
Write-Output (@{ supported = $true; level = $level } | ConvertTo-Json -Compress)
`,
    { timeout: 15000 },
  )
  try {
    return JSON.parse(raw)
  } catch {
    return { supported: true, level: n }
  }
}

async function setDefaultPlayback(idOrFriendly) {
  if (!idOrFriendly || typeof idOrFriendly !== "string") {
    throw new Error("invalid_device")
  }
  bumpMutation()
  await runSvclWrite(["/SetDefault", idOrFriendly, "all"], { timeout: 10000 })
  deviceCache.at = 0
  return { id: idOrFriendly }
}

async function setBluetoothConnected(id, connected) {
  if (!id || typeof id !== "string") throw new Error("invalid_device")
  bumpMutation()
  const safe = id.replace(/'/g, "''")
  if (connected) {
    await runPs(`Enable-PnpDevice -InstanceId '${safe}' -Confirm:$false`, {
      timeout: 20000,
    })
  } else {
    await runPs(`Disable-PnpDevice -InstanceId '${safe}' -Confirm:$false`, {
      timeout: 20000,
    })
  }
  deviceCache.at = 0
  return { id, connected: Boolean(connected) }
}

module.exports = {
  getStatus,
  setVolume,
  setMuted,
  setMicMuted,
  setBrightness,
  setDefaultPlayback,
  setBluetoothConnected,
}
