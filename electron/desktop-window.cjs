const path = require("path")

/** @typedef {import('electron').BrowserWindow} BrowserWindow */

/**
 * @param {object} deps
 * @param {() => boolean} deps.isDev
 * @param {string} deps.preloadPath
 * @param {() => { window?: { width?: number; height?: number } }} deps.readSettings
 */
function createDesktopWindowManager(deps) {
  const { isDev, preloadPath, readSettings } = deps
  /** @type {BrowserWindow | null} */
  let desktopWindow = null

  function desktopLoadUrl(panel) {
    const id = encodeURIComponent(String(panel || "weather"))
    if (isDev()) {
      return `http://localhost:5173/#/desktop/${id}`
    }
    const distIndex = path.join(path.dirname(preloadPath), "../dist/index.html")
    return `file://${distIndex.replace(/\\/g, "/")}#/desktop/${id}`
  }

  function openDesktopPanel(panel) {
    const panelId = String(panel || "weather")

    if (desktopWindow && !desktopWindow.isDestroyed()) {
      desktopWindow.webContents.send("desktop:navigate", panelId)
      if (desktopWindow.isMinimized()) desktopWindow.restore()
      desktopWindow.show()
      desktopWindow.focus()
      return { ok: true, reused: true }
    }

    const saved = readSettings()?.window ?? {}
    const width = Math.max(720, Number(saved.width) || 1100)
    const height = Math.max(480, Number(saved.height) || 720)

    const { BrowserWindow, screen } = require("electron")
    const display = screen.getPrimaryDisplay()
    const { width: sw, height: sh } = display.workAreaSize
    const x = Math.round(display.workArea.x + (sw - width) / 2)
    const y = Math.round(display.workArea.y + (sh - height) / 2)

    desktopWindow = new BrowserWindow({
      x,
      y,
      width,
      height,
      minWidth: 720,
      minHeight: 480,
      show: false,
      frame: true,
      autoHideMenuBar: true,
      backgroundColor: "#f7f7f5",
      title: "Notch",
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    })

    desktopWindow.on("closed", () => {
      desktopWindow = null
    })

    desktopWindow.once("ready-to-show", () => {
      desktopWindow?.show()
    })

    const url = desktopLoadUrl(panelId)
    if (isDev()) {
      desktopWindow.loadURL(url).catch((err) => {
        console.error("[notch] desktop window load failed", err)
        const distIndex = path.join(path.dirname(preloadPath), "../dist/index.html")
        desktopWindow?.loadFile(distIndex, { hash: `/desktop/${panelId}` })
      })
    } else {
      const distIndex = path.join(path.dirname(preloadPath), "../dist/index.html")
      desktopWindow.loadFile(distIndex, { hash: `/desktop/${panelId}` })
    }

    return { ok: true, reused: false }
  }

  return { openDesktopPanel }
}

module.exports = { createDesktopWindowManager }
