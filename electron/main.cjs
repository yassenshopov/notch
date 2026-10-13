const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app, BrowserWindow, screen, ipcMain } = require("electron")
const spotify = require("./spotify.cjs")
const settingsStore = require("./settings-store.cjs")

const isDev = !app.isPackaged

/** Collapsed shell — just big enough for the pill + ears */
const EAR_PAD = 36
const SHELL = {
  width: 400 + EAR_PAD * 2 + 40,
  height: 600 + 24,
}

let mainWindow = null
/** Prevent blur-from-expand-resize from immediately collapsing */
let ignoreBlurUntil = 0

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

function createWindow() {
  const bounds = centerTop(SHELL.width, SHELL.height)

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
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }

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
  // Only used while collapsed — expanded mode owns mouse capture via set-expanded
  mainWindow.setIgnoreMouseEvents(Boolean(pass), { forward: true })
})

ipcMain.handle("notch:reposition", () => {
  if (!mainWindow) return
  mainWindow.setBounds(centerTop(SHELL.width, SHELL.height), false)
})

ipcMain.handle("notch:set-expanded", (_event, payload) => {
  if (!mainWindow) return
  const expanded = typeof payload === "object" ? payload.expanded : payload

  if (expanded) {
    // Full-display overlay so any outside click can dismiss.
    // Pill stays visually centered via flex — no animation snap.
    ignoreBlurUntil = Date.now() + 400
    const display = screen.getPrimaryDisplay()
    mainWindow.setBounds(display.bounds, false)
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    mainWindow.focus()
    return
  }

  mainWindow.setBounds(centerTop(SHELL.width, SHELL.height), false)
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
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

ipcMain.handle("settings:get", () => settingsStore.readSettings())
ipcMain.handle("settings:set", (_event, partial) => settingsStore.writeSettings(partial))
ipcMain.handle("settings:reset", () => settingsStore.resetSettings())

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
