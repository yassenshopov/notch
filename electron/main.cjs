const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })
const lifeAppEnv = path.resolve(__dirname, "../../life-app/.env")
if (fs.existsSync(lifeAppEnv)) {
  require("dotenv").config({ path: lifeAppEnv, override: false })
}

const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  screen,
  shell,
  ipcMain,
  dialog,
} = require("electron")
const settingsStore = require("./settings-store.cjs")

let yearWallpaperModule = null
function getYearWallpaper() {
  if (!yearWallpaperModule) {
    yearWallpaperModule = require("./year-wallpaper.cjs")
  }
  return yearWallpaperModule
}

function defaultWallpaperDir() {
  return path.join(app.getPath("pictures"), "Notch")
}

function resolveWallpaperOutputPath(year, saved = {}) {
  const fileName = `year-${year}-wallpaper.png`
  const dir = String(saved.outputDir ?? "").trim() || defaultWallpaperDir()
  return path.join(dir, fileName)
}

ipcMain.handle("wallpaper:pick-output-folder", async () => {
  const saved = settingsStore.readSettings()?.yearWallpaper ?? {}
  const defaultPath =
    String(saved.outputDir ?? "").trim() || defaultWallpaperDir()
  const result = await dialog.showOpenDialog({
    title: "Wallpaper save folder",
    defaultPath,
    properties: ["openDirectory", "createDirectory"],
  })
  if (result.canceled || !result.filePaths?.[0]) {
    return { ok: false, canceled: true }
  }
  return { ok: true, path: result.filePaths[0] }
})

ipcMain.handle("wallpaper:regenerate", async (_event, payload) => {
  try {
    const yearWallpaper = getYearWallpaper()
    const display = screen.getPrimaryDisplay()
    const width = Math.round(display.bounds.width || display.size.width)
    const height = Math.round(display.bounds.height || display.size.height)
    const year = payload?.year ?? new Date().getFullYear()
    const saved = settingsStore.readSettings()?.yearWallpaper ?? {}
    const apply =
      payload?.apply !== undefined
        ? Boolean(payload.apply)
        : Boolean(saved.applyAfterRegenerate ?? true)
    const style = { ...saved, ...(payload?.style ?? {}) }
    const outputPath =
      payload?.outputPath ?? resolveWallpaperOutputPath(year, { ...saved, ...style })
    const result = await yearWallpaper.regenerateYearWallpaper({
      year,
      width,
      height,
      outputPath,
      applyPath: outputPath,
      apply,
      style,
    })
    return { ok: true, ...result }
  } catch (err) {
    const message = err instanceof Error ? err.message : "wallpaper_error"
    if (/cannot find module ['"]pngjs['"]/i.test(message)) {
      return {
        ok: false,
        error: "Missing pngjs — run npm install in the notch folder and restart.",
      }
    }
    return { ok: false, error: message }
  }
})

const spotify = require("./spotify.cjs")
const cursor = require("./cursor.cjs")
const systemControls = require("./system-controls.cjs")
const markets = require("./markets.cjs")
const github = require("./github.cjs")
const strava = require("./strava.cjs")
const mediaSession = require("./media-session.cjs")
const calendar = require("./calendar.cjs")

// Hide native Chromium scrollbars; wheel / trackpad scrolling still works
app.commandLine.appendSwitch("hide-scrollbars")
app.setAppUserModelId("com.yassenshopov.notch")

// Only use the Vite server when `npm run dev` sets ELECTRON_DEV.
// Login / `npm start` launch Electron unpackaged but must load dist — otherwise
// ready-to-show never paints (localhost:5173 is down) and the notch looks "missing".
const isDev =
  !app.isPackaged &&
  (process.env.ELECTRON_DEV === "1" || process.env.ELECTRON_DEV === "true")

const APP_ICON = path.join(__dirname, "assets", "icon.ico")
const TRAY_ICON = path.join(__dirname, "assets", "tray.png")

/** Horizontal room for concave ears beyond the pill */
const EAR_PAD = 36
/** Default collapsed content size (renderer overrides via set-expanded) */
const COLLAPSED = { width: 152, height: 34 }

let mainWindow = null
let tray = null
let cursorTrayWarned = false
let cursorTrayTimer = null
/** Prevent blur-from-expand-resize from immediately collapsing */
let ignoreBlurUntil = 0
let lastContentSize = { ...COLLAPSED }

function showNotch() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.setAlwaysOnTop(true, "screen-saver")
  mainWindow.focus()
}

function restartApp() {
  tray?.destroy()
  tray = null
  app.relaunch()
  app.exit(0)
}

// Avoid a second instance on login / double-click / taskbar pin
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    showNotch()
  })
}

function centerTop(width, height) {
  const display = screen.getPrimaryDisplay()
  const { x, y, width: screenWidth } = display.bounds
  return {
    x: Math.round(x + (screenWidth - width) / 2),
    y,
    width,
    height,
  }
}

/** Tight shell around the pill — avoids a huge transparent hit-target */
function collapsedShellBounds(contentW = lastContentSize.width, contentH = lastContentSize.height) {
  lastContentSize = {
    width: Math.max(40, Number(contentW) || COLLAPSED.width),
    height: Math.max(24, Number(contentH) || COLLAPSED.height),
  }
  return centerTop(lastContentSize.width + EAR_PAD * 2, lastContentSize.height + 16)
}

function createWindow() {
  const bounds = collapsedShellBounds()

  mainWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    thickFrame: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, "screen-saver")
  // Collapsed shell is pill-sized — keep it fully clickable (no passthrough)
  mainWindow.setIgnoreMouseEvents(false)

  const distIndex = path.join(__dirname, "../dist/index.html")

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173").catch((err) => {
      console.error("[notch] Vite load failed, falling back to dist:", err)
      mainWindow?.loadFile(distIndex)
    })
  } else {
    mainWindow.loadFile(distIndex).catch((err) => {
      console.error("[notch] Failed to load UI. Run `npm run build` first.", err)
    })
  }

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 = aborted
    console.error("[notch] did-fail-load", { code, desc, url })
    if (isDev && url.startsWith("http://localhost:5173")) {
      mainWindow?.loadFile(distIndex)
      return
    }
    // Still show the shell so a blank transparent window isn't left hanging invisible
    mainWindow?.show()
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.on("blur", () => {
    if (Date.now() < ignoreBlurUntil) return
    mainWindow?.webContents.send("notch:window-blur")
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function createTray() {
  if (tray) return

  let image = nativeImage.createFromPath(TRAY_ICON)
  if (image.isEmpty()) image = nativeImage.createFromPath(APP_ICON)
  if (process.platform === "win32") {
    image = image.resize({ width: 16, height: 16 })
  }

  tray = new Tray(image)
  tray.setToolTip("Notch")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Notch", click: () => showNotch() },
      { label: "Restart Notch", click: () => restartApp() },
      { type: "separator" },
      {
        label: "Quit",
        click: () => {
          tray?.destroy()
          tray = null
          app.quit()
        },
      },
    ]),
  )
  tray.on("click", () => showNotch())
  tray.on("double-click", () => showNotch())
}

const DEFAULT_CURSOR_TRAY = {
  usageWarningPercent: 85,
  trayPollIntervalMs: 10 * 60 * 1000,
}

function readCursorTraySettings() {
  const saved = settingsStore.readSettings()?.cursor ?? {}
  return {
    usageWarningPercent:
      typeof saved.usageWarningPercent === "number"
        ? saved.usageWarningPercent
        : DEFAULT_CURSOR_TRAY.usageWarningPercent,
    trayPollIntervalMs:
      typeof saved.trayPollIntervalMs === "number"
        ? saved.trayPollIntervalMs
        : DEFAULT_CURSOR_TRAY.trayPollIntervalMs,
  }
}

async function syncCursorTray() {
  if (!tray) return
  const { usageWarningPercent } = readCursorTraySettings()
  const status = await cursor.getUsageSummary({ detailed: false })
  if (!status.connected || !status.usage) {
    tray.setToolTip("Notch")
    return
  }

  const pct = Math.round(status.usage.totalPercentUsed)
  tray.setToolTip(`Notch · Cursor ${pct}% used`)

  const snoozedUntil = settingsStore.readSettings()?.liveActivities?.cursor?.snoozedUntilMs ?? 0
  const usageSnoozed = snoozedUntil > Date.now()

  if (pct >= usageWarningPercent) {
    if (!usageSnoozed && !cursorTrayWarned && process.platform === "win32") {
      const icon = nativeImage.createFromPath(APP_ICON)
      tray.displayBalloon?.({
        title: "Cursor usage",
        content: `${pct}% of your included usage this billing cycle.`,
        icon: icon.isEmpty() ? undefined : icon,
      })
    }
    cursorTrayWarned = true
  } else if (pct < usageWarningPercent - 5) {
    cursorTrayWarned = false
  }
}

function startCursorTrayPoll() {
  if (cursorTrayTimer) return
  const { trayPollIntervalMs } = readCursorTraySettings()
  void syncCursorTray()
  cursorTrayTimer = setInterval(() => void syncCursorTray(), trayPollIntervalMs)
}

/** Start Menu entry so Notch can be pinned to the taskbar and launched when down */
function ensureStartMenuShortcut() {
  if (process.platform !== "win32") return
  try {
    const fs = require("fs")
    const shortcutPath = path.join(
      app.getPath("appData"),
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
      "Notch.lnk",
    )
    const appPath = app.getAppPath()
    const details = {
      target: process.execPath,
      cwd: app.isPackaged ? path.dirname(process.execPath) : appPath,
      description: "Notch desktop overlay",
      appUserModelId: "com.yassenshopov.notch",
      icon: APP_ICON,
      iconIndex: 0,
    }
    if (!app.isPackaged) {
      details.args = appPath
    }
    // `replace` fails when the .lnk is missing; create or update instead
    const op = fs.existsSync(shortcutPath) ? "update" : "create"
    const ok = shell.writeShortcutLink(shortcutPath, op, details)
    if (!ok) console.error("[notch] writeShortcutLink returned false:", op, shortcutPath)
  } catch (err) {
    console.error("[notch] Failed to write Start Menu shortcut:", err)
  }
}

ipcMain.handle("notch:set-passthrough", (_event, pass) => {
  if (!mainWindow) return
  // Expanded overlay must stay interactive; ignore passthrough requests then
  if (!pass) {
    mainWindow.setIgnoreMouseEvents(false)
    return
  }
  // Only allow click-through while we still use a large shell (legacy); collapsed
  // pill window should never ignore mouse or clicks never reach the UI.
})

ipcMain.handle("notch:reposition", () => {
  if (!mainWindow) return
  mainWindow.setBounds(collapsedShellBounds(), false)
  mainWindow.setIgnoreMouseEvents(false)
})

ipcMain.handle("notch:set-expanded", (_event, payload) => {
  if (!mainWindow) return
  const expanded = typeof payload === "object" ? payload.expanded : payload
  const contentW = typeof payload === "object" ? payload.width : undefined
  const contentH = typeof payload === "object" ? payload.height : undefined

  if (expanded) {
    // Full-display overlay so any outside click can dismiss.
    // Grow the shell *before* the renderer morphs the pill — never animate
    // inside a shrinking/jumping window (that’s what felt snappy).
    ignoreBlurUntil = Date.now() + 900
    const display = screen.getPrimaryDisplay()
    mainWindow.setBounds(display.bounds, false)
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    mainWindow.focus()
    return
  }

  // Collapsed shell — renderer only calls this AFTER the morph finishes
  mainWindow.setBounds(collapsedShellBounds(contentW, contentH), false)
  mainWindow.setIgnoreMouseEvents(false)
})

ipcMain.handle("spotify:status", async () => {
  try {
    return await spotify.getCurrentlyPlaying()
  } catch (err) {
    return {
      connected: spotify.isConnected(),
      configured: spotify.isConfigured(),
      isPlaying: false,
      track: null,
      error: err instanceof Error ? err.message : "spotify_error",
    }
  }
})

ipcMain.handle("spotify:connect", async () => {
  await spotify.startAuth()
  return spotify.getCurrentlyPlaying()
})

ipcMain.handle("spotify:disconnect", () => spotify.disconnect())

ipcMain.handle("spotify:action", async (_event, action) => {
  return spotify.playbackAction(action)
})

ipcMain.handle("spotify:lyrics", async (_event, query) => {
  try {
    return await spotify.fetchLyrics(query ?? {})
  } catch (err) {
    return {
      found: false,
      instrumental: false,
      plainLyrics: null,
      syncedLyrics: null,
      error: err instanceof Error ? err.message : "lyrics_error",
    }
  }
})

ipcMain.handle("cursor:status", async (_event, options) => {
  try {
    return await cursor.getUsageSummary({ detailed: false, force: options?.force === true })
  } catch (err) {
    return {
      connected: false,
      error: "cursor_error",
      message: err instanceof Error ? err.message : "cursor_error",
    }
  }
})

ipcMain.handle("cursor:analytics", async (_event, options) => {
  try {
    return await cursor.getUsageAnalytics({ force: options?.force === true })
  } catch {
    return null
  }
})

ipcMain.handle("cursor:open-dashboard", async () => {
  await shell.openExternal("https://cursor.com/dashboard?tab=usage")
})

ipcMain.handle("cursor:open-url", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
})

ipcMain.handle("markets:snapshot", async (_event, watchlist) => {
  try {
    return await markets.snapshot(watchlist)
  } catch (err) {
    return {
      quotes: [],
      configured: true,
      error: err instanceof Error ? err.message : "markets_error",
    }
  }
})

ipcMain.handle("markets:chart", async (_event, quote, range) => {
  try {
    return await markets.chart(quote, range)
  } catch (err) {
    return {
      points: [],
      changePercent: null,
      high: null,
      low: null,
      error: err instanceof Error ? err.message : "markets_error",
    }
  }
})

ipcMain.handle("github:status", async (_event, options) => {
  try {
    return await github.status({ force: options?.force === true })
  } catch (err) {
    return {
      configured: github.configured(),
      connected: false,
      login: null,
      avatarUrl: null,
      notifications: [],
      pullRequests: [],
      contributions: null,
      todayBreakdown: null,
      error: err instanceof Error ? err.message : "github_error",
    }
  }
})

ipcMain.handle("github:open-url", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
})

ipcMain.handle("strava:status", async (_event, options) => {
  try {
    return await strava.status({ force: options?.force === true })
  } catch (err) {
    return {
      configured: strava.configured(),
      connected: false,
      login: null,
      avatarUrl: null,
      athleteId: null,
      stats: null,
      streak: null,
      calendar: null,
      heatmap: null,
      featuredActivity: null,
      activities: [],
      monthDistance: 0,
      error: err instanceof Error ? err.message : "strava_error",
    }
  }
})

ipcMain.handle("strava:connect", async () => {
  await strava.startAuth()
  return strava.status({ force: true })
})

ipcMain.handle("strava:disconnect", async () => strava.disconnect())

ipcMain.handle("strava:open-url", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
})

ipcMain.handle("media:status", async () => {
  try {
    return await mediaSession.getStatus()
  } catch (err) {
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
      error: err instanceof Error ? err.message : "media_error",
    }
  }
})

ipcMain.handle("media:action", async (_event, action) => {
  try {
    await mediaSession.action(action)
    return await mediaSession.getStatus()
  } catch (err) {
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
      error: err instanceof Error ? err.message : "media_error",
    }
  }
})

ipcMain.handle("calendar:snapshot", async (_event, options) => {
  try {
    return await calendar.snapshot(options)
  } catch (err) {
    return { configured: false, events: [], error: "calendar_error" }
  }
})

ipcMain.handle("calendar:open-url", async (_event, url) => {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
})

function resolveLaunchAtLogin(saved) {
  return saved?.launchAtLogin !== undefined ? Boolean(saved.launchAtLogin) : true
}

function syncLaunchAtLogin(enabled = resolveLaunchAtLogin(settingsStore.readSettings())) {
  const openAtLogin = Boolean(enabled)
  // Packaged: register the built app. Unpackaged: register Electron pointing at the
  // project root (loads dist via main.cjs — do not pass ELECTRON_DEV here).
  if (app.isPackaged) {
    app.setLoginItemSettings({ openAtLogin })
  } else {
    const appPath = app.getAppPath()
    app.setLoginItemSettings({
      openAtLogin,
      path: process.execPath,
      args: [appPath],
    })
  }
}

ipcMain.handle("settings:get", () => settingsStore.readSettings())
ipcMain.handle("settings:set", (_event, partial) => {
  const next = settingsStore.writeSettings(partial)
  if (partial && Object.prototype.hasOwnProperty.call(partial, "launchAtLogin")) {
    syncLaunchAtLogin(resolveLaunchAtLogin(next))
  }
  return next
})
ipcMain.handle("settings:reset", () => {
  const next = settingsStore.resetSettings()
  syncLaunchAtLogin(true)
  return next
})

ipcMain.handle("controls:status", async () => {
  try {
    return await systemControls.getStatus()
  } catch (err) {
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
      error: err instanceof Error ? err.message : "controls_error",
    }
  }
})

ipcMain.handle("controls:set-volume", async (_event, level) => systemControls.setVolume(level))
ipcMain.handle("controls:set-muted", async (_event, muted) => systemControls.setMuted(muted))
ipcMain.handle("controls:set-mic-muted", async (_event, muted) =>
  systemControls.setMicMuted(muted),
)
ipcMain.handle("controls:set-brightness", async (_event, level) =>
  systemControls.setBrightness(level),
)
ipcMain.handle("controls:set-playback", async (_event, id) =>
  systemControls.setDefaultPlayback(id),
)
ipcMain.handle("controls:set-bluetooth", async (_event, payload) =>
  systemControls.setBluetoothConnected(payload?.id, payload?.connected),
)

if (gotLock) {
  app.whenReady().then(() => {
    syncLaunchAtLogin()
    ensureStartMenuShortcut()
    createTray()
    startCursorTrayPoll()
    createWindow()

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Stay alive in the tray if the overlay window is closed
  app.on("window-all-closed", () => {
    if (process.platform === "darwin") return
    if (!tray) app.quit()
  })
}
