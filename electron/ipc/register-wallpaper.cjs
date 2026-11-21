const path = require("path")
const { app, dialog, ipcMain, screen } = require("electron")
const { syncWallpaperToMint } = require("../wallpaper-mint-sync.cjs")

let yearWallpaperModule = null

function getYearWallpaper() {
  if (!yearWallpaperModule) {
    yearWallpaperModule = require("../year-wallpaper.cjs")
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

/**
 * @param {import("../settings-store.cjs")} settingsStore
 */
function createWallpaperRegenerate(settingsStore) {
  return async function runWallpaperRegenerate(payload = {}) {
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

      let mintSync = undefined
      if (style.syncToMint !== false) {
        const mintSettings = settingsStore.readSettings()?.mint ?? {}
        mintSync = await syncWallpaperToMint({
          localPath: result.path,
          year: result.year,
          sshHost: mintSettings.sshHost,
        })
      }

      return { ok: true, ...result, mintSync }
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
  }
}

/**
 * @param {import("../settings-store.cjs")} settingsStore
 * @param {(dateKey: string) => string} wallpaperLocalDateKey
 */
function registerWallpaperIpc(settingsStore, wallpaperLocalDateKey) {
  const runWallpaperRegenerate = createWallpaperRegenerate(settingsStore)

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
    const result = await runWallpaperRegenerate(payload ?? {})
    if (result.ok) {
      const saved = settingsStore.readSettings()?.yearWallpaper ?? {}
      settingsStore.writeSettings({
        yearWallpaper: { ...saved, lastAutoDate: wallpaperLocalDateKey() },
      })
    }
    return result
  })

  ipcMain.handle("wallpaper:sync-mint", async () => {
    try {
      const saved = settingsStore.readSettings()?.yearWallpaper ?? {}
      const style = saved
      const year = new Date().getFullYear()
      const outputPath = resolveWallpaperOutputPath(year, style)
      if (saved.syncToMint === false) {
        return { ok: false, error: "sync_disabled" }
      }
      const mintSettings = settingsStore.readSettings()?.mint ?? {}
      const mintSync = await syncWallpaperToMint({
        localPath: outputPath,
        year,
        sshHost: mintSettings.sshHost,
      })
      return { ok: Boolean(mintSync.synced), mintSync }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "mint_sync_error" }
    }
  })

  return { runWallpaperRegenerate }
}

module.exports = { registerWallpaperIpc, createWallpaperRegenerate }