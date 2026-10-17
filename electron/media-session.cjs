/**
 * Windows system media (browser YouTube, etc.) via GlobalSystemMediaTransportControls.
 */
const { execFile } = require("child_process")
const { promisify } = require("util")

const execFileAsync = promisify(execFile)

/** @type {Map<string, string | null>} */
const youtubeThumbCache = new Map()
/** @type {{ key: string, promise: Promise<string | null> } | null} */
let youtubeThumbInflight = null

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

const SPOTIFY_APP_MARKERS = ["spotify", "SpotifyAB.SpotifyMusic"]

function isSpotifyApp(appId) {
  const id = String(appId || "").toLowerCase()
  return SPOTIFY_APP_MARKERS.some((m) => id.includes(m.toLowerCase()))
}

function isBrowserApp(appId) {
  const id = String(appId || "").toLowerCase()
  return (
    id.includes("chrome") ||
    id.includes("msedge") ||
    id.includes("firefox") ||
    id.includes("brave") ||
    id.includes("opera") ||
    id.includes("vivaldi")
  )
}

function youtubeThumbKey(title, artist) {
  return `${title || ""}\0${artist || ""}`.trim()
}

function collectYoutubeVideoIds(node, out, limit = 8) {
  if (!node || typeof node !== "object" || out.length >= limit) return
  if (typeof node.videoId === "string" && node.videoId.length >= 6) {
    if (!out.includes(node.videoId)) out.push(node.videoId)
  }
  if (Array.isArray(node)) {
    for (const item of node) collectYoutubeVideoIds(item, out, limit)
    return
  }
  for (const value of Object.values(node)) {
    collectYoutubeVideoIds(value, out, limit)
    if (out.length >= limit) return
  }
}

async function resolveYoutubeThumbnail(title, artist) {
  const query = [title, artist].filter(Boolean).join(" ").trim()
  if (!query) return null

  const key = youtubeThumbKey(title, artist)
  if (youtubeThumbCache.has(key)) return youtubeThumbCache.get(key) ?? null
  if (youtubeThumbInflight?.key === key) return youtubeThumbInflight.promise

  const promise = (async () => {
    try {
      const res = await fetch("https://www.youtube.com/youtubei/v1/search?prettyPrint=false", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "WEB", clientVersion: "2.20240214" } },
          query,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) return null
      const data = await res.json()
      const ids = []
      collectYoutubeVideoIds(data, ids)
      const id = ids[0]
      return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
    } catch {
      return null
    }
  })()

  youtubeThumbInflight = { key, promise }
  const url = await promise
  youtubeThumbInflight = null
  youtubeThumbCache.set(key, url)
  return url
}

async function attachThumbnail(snap) {
  if (!snap.isYoutube || (!snap.title && !snap.artist)) {
    return { ...snap, thumbnailUrl: null }
  }
  const thumbnailUrl = await resolveYoutubeThumbnail(snap.title, snap.artist)
  return { ...snap, thumbnailUrl }
}

function normalizeSnapshot(raw) {
  if (!raw || raw.supported === false) {
    return {
      supported: process.platform === "win32",
      playing: false,
      paused: false,
      appId: null,
      title: null,
      artist: null,
      album: null,
      isBrowser: false,
      isYoutube: false,
      thumbnailUrl: null,
    }
  }

  const status = String(raw.status || "")
  const playing = status === "Playing"
  const paused = status === "Paused"
  const appId = raw.appId || null
  const title = raw.title || null
  const artist = raw.artist || null
  const isBrowser = isBrowserApp(appId)
  const titleHint = `${title || ""} ${artist || ""}`.toLowerCase()
  const isYoutube =
    isBrowser ||
    titleHint.includes("youtube") ||
    String(raw.album || "").toLowerCase().includes("youtube")

  return {
    supported: true,
    playing,
    paused,
    appId,
    title,
    artist,
    album: raw.album || null,
    isBrowser,
    isYoutube,
    thumbnailUrl: null,
  }
}

async function readSession() {
  if (process.platform !== "win32") {
    return normalizeSnapshot({ supported: false })
  }

  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await($WinRtTask, $ResultType) {
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $netTask = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $manager.GetCurrentSession()
if ($null -eq $session) {
  @{ supported = $true; playing = $false } | ConvertTo-Json -Compress
  exit 0
}
$props = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
$info = $session.GetPlaybackInfo()
@{ supported = $true; appId = $session.SourceAppUserModelId; status = $info.PlaybackStatus.ToString(); title = $props.Title; artist = $props.Artist; album = $props.AlbumTitle } | ConvertTo-Json -Compress
`

  try {
    const out = await runPs(script, { timeout: 10000 })
    if (!out) return normalizeSnapshot({ supported: true, playing: false })
    const raw = JSON.parse(out)
    const snap = normalizeSnapshot(raw)
    if (isSpotifyApp(snap.appId)) {
      return {
        ...snap,
        playing: false,
        paused: false,
        title: null,
        artist: null,
        thumbnailUrl: null,
      }
    }
    return attachThumbnail(snap)
  } catch {
    return normalizeSnapshot({ supported: true, playing: false })
  }
}

async function runAction(action) {
  if (process.platform !== "win32") return { ok: false }
  const map = {
    play: "TryPlayAsync",
    pause: "TryPauseAsync",
    toggle: "TryTogglePlayPauseAsync",
    next: "TrySkipNextAsync",
    previous: "TrySkipPreviousAsync",
  }
  const method = map[action]
  if (!method) return { ok: false }

  const script = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
function Await($WinRtTask, $ResultType) {
  $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
  $netTask = $asTask.MakeGenericMethod($ResultType).Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media,ContentType=WindowsRuntime] | Out-Null
$manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
$session = $manager.GetCurrentSession()
if ($null -eq $session) { 'false'; exit 0 }
$result = Await ($session.${method}()) ([bool])
$result.ToString().ToLower()
`
  try {
    const out = (await runPs(script, { timeout: 8000 })).trim().toLowerCase()
    return { ok: out === "true" }
  } catch {
    return { ok: false }
  }
}

module.exports = {
  getStatus: readSession,
  action: runAction,
}
