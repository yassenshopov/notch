const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app, BrowserWindow, screen, ipcMain } = require("electron")
const spotify = require("./spotify.cjs")
const settingsStore = require("./settings-store.cjs")
const systemControls = require("./system-controls.cjs")

// Hide native Chromium scrollbars; wheel / trackpad scrolling still works
app.commandLine.appendSwitch("hide-scrollbars")

// Only use the Vite server when `npm run dev` sets ELECTRON_DEV.
// Login / `npm start` launch Electron unpackaged but must load dist — otherwise
// ready-to-show never paints (localhost:5173 is down) and the notch looks "missing".
const isDev =
  !app.isPackaged &&
  (process.env.ELECTRON_DEV === "1" || process.env.ELECTRON_DEV === "true")

// Avoid a second instance on login / double-click
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
}

/** Horizontal room for concave ears beyond the pill */
const EAR_PAD = 36
/** Default collapsed content size (renderer overrides via set-expanded) */
const COLLAPSED = { width: 152, height: 34 }

let mainWindow = null
/** Prevent blur-from-expand-resize from immediately collapsing */
let ignoreBlurUntil = 0
let lastContentSize = { ...COLLAPSED }

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
    createWindow()

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit()
  })
}
