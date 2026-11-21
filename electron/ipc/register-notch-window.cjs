const notchPlacement = require("../notch-placement.cjs")
const windowMotion = require("../notch-window-motion.cjs")

const ISLAND_MORPH_MS = 600

/**
 * @param {import("electron").IpcMain} ipcMain
 * @param {{
 *   getMainWindow: () => import("electron").BrowserWindow | null
 *   getShellExpanded: () => boolean
 *   setShellExpanded: (value: boolean) => void
 *   getIgnoreBlurUntil: () => number
 *   setIgnoreBlurUntil: (value: number) => void
 *   lastContentSize: { width: number; height: number }
 *   collapsedShellBounds: (contentW?: number, contentH?: number) => object
 *   setWindowBounds: (bounds: object) => void
 *   sendPlacementToRenderer: () => void
 *   desktopWindows: { openDesktopPanel: (panel: unknown) => unknown }
 * }} deps
 */
function registerNotchWindowIpc(ipcMain, deps) {
  const {
    getMainWindow,
    setShellExpanded,
    setIgnoreBlurUntil,
    lastContentSize,
    collapsedShellBounds,
    setWindowBounds,
    sendPlacementToRenderer,
    desktopWindows,
  } = deps

  function applyExpandedShell(mainWindow) {
    mainWindow.setResizable(true)
    mainWindow.setMinimumSize(40, 24)
    mainWindow.setMaximumSize(0, 0)
    mainWindow.setIgnoreMouseEvents(false)
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    mainWindow.focus()
  }

  function applyCollapsedShell(mainWindow, collapsed) {
    mainWindow.setMinimumSize(collapsed.width, collapsed.height)
    mainWindow.setMaximumSize(collapsed.width, collapsed.height)
    mainWindow.setResizable(false)
    mainWindow.setIgnoreMouseEvents(false)
  }

  ipcMain.handle("notch:set-passthrough", (_event, pass) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return
    if (pass) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    } else {
      mainWindow.setIgnoreMouseEvents(false)
    }
  })

  ipcMain.handle("notch:reposition", () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return
    setWindowBounds(collapsedShellBounds())
    mainWindow.setIgnoreMouseEvents(false)
    sendPlacementToRenderer()
  })

  ipcMain.handle("notch:placement-get", () => notchPlacement.readPlacement())

  ipcMain.handle("notch:drag-start", (_event, payload) => {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return
    const contentW = Number(payload?.width) || lastContentSize.width
    const contentH = Number(payload?.height) || lastContentSize.height
    const screenX = Number(payload?.screenX)
    const screenY = Number(payload?.screenY)
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return
    notchPlacement.beginDrag(screenX, screenY, contentW, contentH, mainWindow.getBounds())
  })

  ipcMain.on("notch:drag-move", (_event, payload) => {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return
    const screenX = Number(payload?.screenX)
    const screenY = Number(payload?.screenY)
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return
    notchPlacement.moveDrag(screenX, screenY, setWindowBounds)
  })

  ipcMain.handle("notch:drag-end", () => {
    const mainWindow = getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) return notchPlacement.readPlacement()
    return notchPlacement.endDrag(mainWindow.getBounds(), setWindowBounds, sendPlacementToRenderer)
  })

  ipcMain.handle("notch:drag-cancel", () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return notchPlacement.readPlacement()
    const from = mainWindow.getBounds()
    notchPlacement.cancelDrag()
    const target = collapsedShellBounds()
    windowMotion.animateBounds(from, target, setWindowBounds, { durationMs: 420 })
    return notchPlacement.readPlacement()
  })

  ipcMain.handle("desktop:open", (_event, panel) => desktopWindows.openDesktopPanel(panel))

  ipcMain.handle("notch:set-expanded", (_event, payload) => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return Promise.resolve({ anchorLeft: 0, anchorTop: 0 })
    const expanded = typeof payload === "object" ? payload.expanded : payload
    const contentW = typeof payload === "object" ? payload.width : undefined
    const contentH = typeof payload === "object" ? payload.height : undefined
    const animate = typeof payload === "object" ? payload.animate !== false : true

    if (expanded) {
      setIgnoreBlurUntil(Date.now() + ISLAND_MORPH_MS + 80)
      setShellExpanded(true)
      const placement = notchPlacement.readPlacement()
      const cw = Math.max(40, Number(contentW) || lastContentSize.width)
      const ch = Math.max(24, Number(contentH) || lastContentSize.height)
      const expandedW = Number(payload?.expandedWidth) || 380
      const expandedH = Number(payload?.expandedHeight) || 580
      const target = notchPlacement.expandedWindowBounds(
        placement,
        cw,
        ch,
        expandedW,
        expandedH,
      )
      applyExpandedShell(mainWindow)
      const from = mainWindow.getBounds()
      const result = { anchorLeft: 0, anchorTop: 0, ...target }
      const anchorTop = placement.edge === "top"
      if (!animate) {
        mainWindow.setBounds(target, false)
        return Promise.resolve(result)
      }
      return new Promise((resolve) => {
        windowMotion.animateBounds(from, target, setWindowBounds, {
          durationMs: ISLAND_MORPH_MS,
          anchorTop,
          onComplete: () => resolve(result),
        })
      })
    }

    setShellExpanded(false)
    const collapsed = collapsedShellBounds(contentW, contentH)
    const placement = notchPlacement.readPlacement()
    const from = mainWindow.getBounds()
    const result = { anchorLeft: 0, anchorTop: 0, ...collapsed }
    const anchorTop = placement.edge === "top"
    const settle = () => {
      applyCollapsedShell(mainWindow, collapsed)
      return result
    }
    if (!animate) {
      mainWindow.setBounds(collapsed, false)
      return Promise.resolve(settle())
    }
    return new Promise((resolve) => {
      windowMotion.animateBounds(from, collapsed, setWindowBounds, {
        durationMs: ISLAND_MORPH_MS,
        anchorTop,
        onComplete: () => {
          mainWindow.setBounds(collapsed, false)
          resolve(settle())
        },
      })
    })
  })
}

module.exports = { registerNotchWindowIpc, ISLAND_MORPH_MS }