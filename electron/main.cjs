const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })
const lifeAppEnv = path.resolve(__dirname, "../../life-app/.env")
if (process.env.NOTCH_LOAD_LIFE_APP_ENV === "1" && fs.existsSync(lifeAppEnv)) {
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
} = require("electron")
const settingsStore = require("./settings-store.cjs")
const db = require("./db.cjs")
const settingsPersistence = require("./settings-persistence.cjs")
const { createDesktopWindowManager } = require("./desktop-window.cjs")
const uiBundle = require("./ui-bundle.cjs")
const PRELOAD_PATH = path.join(__dirname, "preload.cjs")
const notchPlacement = require("./notch-placement.cjs")
const {
  localDateKey: wallpaperLocalDateKey,
  startWallpaperDailyScheduler,
} = require("./wallpaper-daily.cjs")
const { registerWallpaperIpc } = require("./ipc/register-wallpaper.cjs")
const { registerNotchWindowIpc } = require("./ipc/register-notch-window.cjs")
const { registerServicesIpc } = require("./ipc/register-services.cjs")

const { runWallpaperRegenerate } = registerWallpaperIpc(settingsStore, wallpaperLocalDateKey)

const {
  computeCursorCyclePace,
  cursorUsageNeedsAttention,
  formatCursorUsageTrayMessage,
} = require("./cursor-cycle.cjs")
const keyboardLayout = require("./keyboard-layout.cjs")
const cursor = require("./cursor.cjs")

// Hide native Chromium scrollbars; wheel / trackpad scrolling still works
app.commandLine.appendSwitch("hide-scrollbars")
app.setAppUserModelId("com.yassenshopov.notch")

/** Resolved in app.whenReady — see ui-bundle.cjs */
let rendererUsesVite = false

const APP_ICON = path.join(__dirname, "assets", "icon.ico")
const TRAY_ICON = path.join(__dirname, "assets", "tray.png")

/** Default collapsed content size (renderer overrides via set-expanded) */
const COLLAPSED = { width: 152, height: 34 }

let mainWindow = null
let tray = null
let cursorTrayWarned = false
let cursorTrayTimer = null
/** Prevent blur-from-expand-resize from immediately collapsing */
let ignoreBlurUntil = 0
let lastContentSize = { ...COLLAPSED }
/** Main-process expanded shell — display-metrics must not snap back to pill size */
let shellExpanded = false
let wallpaperDailyScheduler = null
/** @type {(() => void) | null} */
let stopKeyboardLayoutWatch = null
const desktopWindows = createDesktopWindowManager({
  isDev: () => rendererUsesVite,
  preloadPath: PRELOAD_PATH,
  readSettings: () => settingsStore.readSettings(),
  distLoadOptions: () => uiBundle.distLoadOptions(),
  allowDistFallback: () => uiBundle.allowDistFallbackInDev(),
})

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

function attachKeyboardLayoutWatcher() {
  stopKeyboardLayoutWatch?.()
  stopKeyboardLayoutWatch = keyboardLayout.startWatcher((layout) => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    mainWindow.webContents.send("keyboard-layout:changed", layout)
  })
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

function sendPlacementToRenderer() {
  if (!mainWindow?.webContents) return
  mainWindow.webContents.send("notch:placement", notchPlacement.readPlacement())
}

function setWindowBounds(bounds) {
  if (!mainWindow) return
  mainWindow.setBounds(
    {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    false,
  )
}

/** Tight shell around the pill — avoids a huge transparent hit-target */
function collapsedShellBounds(contentW = lastContentSize.width, contentH = lastContentSize.height) {
  lastContentSize = {
    width: Math.max(40, Number(contentW) || COLLAPSED.width),
    height: Math.max(24, Number(contentH) || COLLAPSED.height),
  }
  const placement = notchPlacement.readPlacement()
  const bounds = notchPlacement.boundsForPlacement(
    placement,
    lastContentSize.width,
    lastContentSize.height,
  )
  if (bounds.placement) {
    notchPlacement.writePlacement(bounds.placement)
  }
  return bounds
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
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setAlwaysOnTop(true, "screen-saver")
  // Collapsed shell is pill-sized — keep it fully clickable (no passthrough)
  mainWindow.setIgnoreMouseEvents(false)

  const distIndex = uiBundle.DIST_INDEX
  const distOpts = uiBundle.distLoadOptions()

  if (rendererUsesVite) {
    mainWindow.loadURL("http://127.0.0.1:5173/").catch((err) => {
      console.error("[notch] Vite load failed:", err)
      if (uiBundle.allowDistFallbackInDev()) {
        mainWindow?.loadFile(distIndex, distOpts)
      }
    })
  } else {
    mainWindow.loadFile(distIndex, distOpts).catch((err) => {
      console.error("[notch] Failed to load UI. Run `npm run build` first.", err)
    })
  }

  mainWindow.webContents.on("did-fail-load", (_event, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 = aborted
    console.error("[notch] did-fail-load", { code, desc, url })
    if (rendererUsesVite && String(url).includes("127.0.0.1:5173")) {
      if (uiBundle.allowDistFallbackInDev()) {
        mainWindow?.loadFile(distIndex, distOpts)
      } else {
        console.error("[notch] Vite unavailable — not loading stale dist (set NOTCH_ALLOW_DIST_FALLBACK=1 to override).")
      }
      return
    }
    // Still show the shell so a blank transparent window isn't left hanging invisible
    mainWindow?.show()
  })

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show()
    sendPlacementToRenderer()
  })

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.setZoomFactor(1)
    sendPlacementToRenderer()
  })

  mainWindow.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error("[notch] preload-error", preloadPath, error)
  })

  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (input.type !== "keyDown" || input.key !== "Escape") return
    mainWindow?.webContents.send("notch:escape")
  })

  mainWindow.on("blur", () => {
    if (Date.now() < ignoreBlurUntil) return
    mainWindow?.webContents.send("notch:window-blur")
  })

  mainWindow.on("closed", () => {
    stopKeyboardLayoutWatch?.()
    stopKeyboardLayoutWatch = null
    mainWindow = null
  })

  attachKeyboardLayoutWatcher()
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

  const pace =
    status.billing?.isUnlimited ? null : computeCursorCyclePace(status.usage, status.billing)
  const needsAttention = cursorUsageNeedsAttention(status.usage, pace, usageWarningPercent)

  if (needsAttention) {
    if (!usageSnoozed && !cursorTrayWarned && process.platform === "win32") {
      const icon = nativeImage.createFromPath(APP_ICON)
      const content =
        formatCursorUsageTrayMessage(status.usage, pace, usageWarningPercent) ??
        `${pct}% of your included usage this billing cycle.`
      tray.displayBalloon?.({
        title: "Cursor usage",
        content,
        icon: icon.isEmpty() ? undefined : icon,
      })
    }
    cursorTrayWarned = true
  } else if (pct < usageWarningPercent - 5 && (pace == null || pace.onTrack)) {
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

registerNotchWindowIpc(ipcMain, {
  getMainWindow: () => mainWindow,
  getShellExpanded: () => shellExpanded,
  setShellExpanded: (value) => {
    shellExpanded = value
  },
  getIgnoreBlurUntil: () => ignoreBlurUntil,
  setIgnoreBlurUntil: (value) => {
    ignoreBlurUntil = value
  },
  lastContentSize,
  collapsedShellBounds,
  setWindowBounds,
  sendPlacementToRenderer,
  desktopWindows,
})

function resolveLaunchAtLogin(saved) {
  return saved?.launchAtLogin !== undefined ? Boolean(saved.launchAtLogin) : true
}

function syncLaunchAtLogin(enabled = resolveLaunchAtLogin(settingsStore.readSettings())) {
  const openAtLogin = Boolean(enabled)
  if (!app.isPackaged) {
    if (openAtLogin) {
      console.warn(
        "[notch] Launch at login requires a packaged install (npm run dist). Ignoring while running from source.",
      )
    }
    app.setLoginItemSettings({ openAtLogin: false })
    return
  }
  app.setLoginItemSettings({ openAtLogin })
}

registerServicesIpc(ipcMain, {
  settingsStore,
  syncLaunchAtLogin,
  resolveLaunchAtLogin,
  getWallpaperDailyScheduler: () => wallpaperDailyScheduler,
})

if (gotLock) {
  app.whenReady().then(async () => {
    const dbInit = await db.init()
    if (db.isConfigured()) {
      console.info(
        `[notch] database=${dbInit.ok ? "ready" : "error"}${dbInit.error ? ` (${dbInit.error})` : ""}`,
      )
    }
    if (dbInit.ok) {
      const settingsBoot = await settingsPersistence.bootstrap().catch(() => null)
      if (settingsBoot?.source === "neon") {
        console.info("[notch] settings loaded from Neon")
      }
    }
    syncLaunchAtLogin()
    ensureStartMenuShortcut()
    createTray()
    startCursorTrayPoll()
    const bundle = await uiBundle.resolveUiBundle(app)
    rendererUsesVite = bundle.useVite
    console.info(
      `[notch] renderer=${bundle.source}${bundle.staleDist ? " (dist stale — rebuild or use npm run dev)" : ""}`,
    )
    createWindow()

    if (process.env.NOTCH_VERIFY_EXPAND === "1") {
      require("fs").writeFileSync(
        path.join(__dirname, "../verify-expand-started.txt"),
        String(process.env.NOTCH_VERIFY_EXPAND),
      )
      setTimeout(async () => {
        if (!mainWindow?.webContents) {
          app.exit(1)
          return
        }
        const expandDone = mainWindow.webContents
          .executeJavaScript(
            `(() => {
              if (typeof window.__NOTCH_EXPAND__ === "function") {
                return window.__NOTCH_EXPAND__()
              }
              return Promise.resolve()
            })()`,
          )
          .catch(() => undefined)
        await expandDone
        for (let i = 0; i < 40; i++) {
          const b = mainWindow.getBounds()
          if (b.height >= 560 && b.width >= 480) break
          await new Promise((r) => setTimeout(r, 100))
        }
        setTimeout(async () => {
          try {
            const rect = await mainWindow.webContents.executeJavaScript(`(() => {
              const el = document.querySelector("[data-notch-island]")
              if (!el) return null
              const r = el.getBoundingClientRect()
              return {
                width: Math.round(r.width),
                height: Math.round(r.height),
                top: Math.round(r.top),
              }
            })()`)
            const layout = await mainWindow.webContents.executeJavaScript(
              `document.querySelector("[data-notch-layout]")?.getAttribute("data-notch-layout")`,
            )
            const bounds = mainWindow.getBounds()
            const png = await mainWindow.webContents.capturePage()
            require("fs").writeFileSync(
              path.join(__dirname, "../verify-expand.png"),
              png.toPNG(),
            )
            const hasBridge = await mainWindow.webContents.executeJavaScript(
              `typeof window.notch !== "undefined" && typeof window.notch.setExpanded === "function"`,
            )
            const ok =
              hasBridge &&
              layout === "expanded-tight" &&
              rect &&
              rect.height >= 480 &&
              rect.width >= 340 &&
              bounds.height >= 560
            console.log("[verify-expand]", { ok, rect, bounds, layout, hasBridge })
            app.exit(ok ? 0 : 1)
          } catch (err) {
            console.error("[verify-expand] failed", err)
            app.exit(1)
          }
        }, 4000)
      }, 5000)
    }

    wallpaperDailyScheduler = startWallpaperDailyScheduler({
      runRegenerate: () => runWallpaperRegenerate(),
      readSettings: settingsStore.readSettings,
      writeSettings: settingsStore.writeSettings,
    })

    screen.on("display-metrics-changed", () => {
      if (!mainWindow || mainWindow.isDestroyed()) return
      if (shellExpanded) return
      setWindowBounds(collapsedShellBounds())
      sendPlacementToRenderer()
    })

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
