const { powerMonitor } = require("electron")

function localDateKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function msUntilNextLocalMidnight() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1, 0)
  return Math.max(60_000, next.getTime() - now.getTime())
}

/**
 * @param {{
 *   runRegenerate: () => Promise<{ ok?: boolean } | undefined>
 *   readSettings: () => Record<string, unknown>
 *   writeSettings: (partial: Record<string, unknown>) => Record<string, unknown>
 * }} deps
 */
function startWallpaperDailyScheduler(deps) {
  let busy = false
  let midnightTimer = null

  async function tick() {
    if (busy) return
    const saved = deps.readSettings()?.yearWallpaper ?? {}
    if (saved.autoUpdateDaily === false) return

    const today = localDateKey()
    if (saved.lastAutoDate === today) return

    busy = true
    try {
      const result = await deps.runRegenerate()
      if (result?.ok) {
        deps.writeSettings({
          yearWallpaper: { ...saved, lastAutoDate: today },
        })
      }
    } catch (err) {
      console.error("[notch] daily wallpaper update failed:", err)
    } finally {
      busy = false
    }
  }

  function scheduleMidnight() {
    if (midnightTimer) clearTimeout(midnightTimer)
    midnightTimer = setTimeout(() => {
      void tick()
      scheduleMidnight()
    }, msUntilNextLocalMidnight())
  }

  const poll = setInterval(() => void tick(), 30 * 60 * 1000)
  scheduleMidnight()

  const onResume = () => void tick()
  powerMonitor.on("resume", onResume)

  void tick()

  return {
    runNow: () => tick(),
    stop() {
      clearInterval(poll)
      if (midnightTimer) clearTimeout(midnightTimer)
      powerMonitor.removeListener("resume", onResume)
    },
  }
}

module.exports = {
  localDateKey,
  startWallpaperDailyScheduler,
}
