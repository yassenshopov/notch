const { shell } = require("electron")
const db = require("../db.cjs")
const spotify = require("../spotify.cjs")
const spotifyLibrary = require("../spotify-library.cjs")
const cursor = require("../cursor.cjs")
const cursorInsights = require("../cursor-insights.cjs")
const systemControls = require("../system-controls.cjs")
const keyboardLayout = require("../keyboard-layout.cjs")
const markets = require("../markets.cjs")
const github = require("../github.cjs")
const mint = require("../mint.cjs")
const { agentPost: wifiSenseAgentPost } = require("../wifi-sense.cjs")
const pi = require("../pi.cjs")
const piDisplay = require("../pi-display.cjs")
const strava = require("../strava.cjs")
const mediaSession = require("../media-session.cjs")
const calendar = require("../calendar.cjs")
const neonFunctions = require("../neon-functions.cjs")
const { openExternalHttpUrl } = require("./open-external-url.cjs")

/**
 * @param {import("electron").IpcMain} ipcMain
 * @param {{
 *   settingsStore: import("../settings-store.cjs")
 *   syncLaunchAtLogin: (enabled?: boolean) => void
 *   resolveLaunchAtLogin: (saved: unknown) => boolean
 *   getWallpaperDailyScheduler: () => { runNow?: () => void } | null
 * }} deps
 */
function registerServicesIpc(ipcMain, deps) {
  const { settingsStore, syncLaunchAtLogin, resolveLaunchAtLogin, getWallpaperDailyScheduler } =
    deps

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

  ipcMain.handle("spotify:action", async (_event, action, options) => {
    return spotify.playbackAction(action, options ?? {})
  })

  ipcMain.handle("spotify:listening-history", async (_event, limit) => {
    try {
      return await spotify.getListeningHistory(limit)
    } catch {
      return []
    }
  })

  ipcMain.handle("spotify:recently-played", async (_event, limit, options) => {
    try {
      return await spotify.getRecentlyPlayed(limit, options ?? {})
    } catch {
      return []
    }
  })

  ipcMain.handle("spotify:play-uri", async (_event, uri, options) => {
    return spotify.playUri(uri, options ?? {})
  })

  ipcMain.handle("spotify:library-status", async () => {
    try {
      return await spotifyLibrary.libraryStatus()
    } catch (err) {
      return {
        configured: db.isConfigured(),
        ready: false,
        totalStreams: 0,
        error: err instanceof Error ? err.message : "spotify_library_error",
      }
    }
  })

  ipcMain.handle("spotify:insights", async (_event, options) => {
    try {
      return await spotifyLibrary.activityInsights({
        year: options?.year,
      })
    } catch (err) {
      return {
        configured: db.isConfigured(),
        ready: false,
        connected: true,
        years: [],
        chartYear: new Date().getFullYear(),
        weeks: [],
        days: [],
        totalPlays: 0,
        totalMs: 0,
        totalMinutes: 0,
        profile: null,
        monthly: [],
        topArtists: [],
        topTracks: [],
        error: err instanceof Error ? err.message : "spotify_insights_error",
      }
    }
  })

  ipcMain.handle("spotify:day-detail", async (_event, date) => {
    try {
      return await spotifyLibrary.dayDetail(date)
    } catch (err) {
      return {
        configured: db.isConfigured(),
        ready: false,
        date: typeof date === "string" ? date : "",
        plays: 0,
        ms: 0,
        minutes: 0,
        tracks: [],
        topArtists: [],
        error: err instanceof Error ? err.message : "spotify_day_detail_error",
      }
    }
  })

  ipcMain.handle("spotify:import-extended", async (_event, dir) => {
    try {
      return await spotifyLibrary.importDirectory(dir)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "spotify_import_error" }
    }
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

  ipcMain.handle("cursor:insights", async (_event, options) => {
    try {
      return await cursorInsights.getActivityInsights({
        force: options?.force === true,
        year: options?.year,
      })
    } catch (err) {
      return {
        configured: true,
        connected: false,
        ready: false,
        years: [],
        chartYear: new Date().getFullYear(),
        weeks: [],
        days: [],
        totalEvents: 0,
        totalCents: 0,
        topModels: [],
        monthly: [],
        yearsData: [],
        error: err instanceof Error ? err.message : "cursor_insights_error",
      }
    }
  })

  ipcMain.handle("cursor:open-dashboard", async () => {
    await shell.openExternal("https://cursor.com/dashboard?tab=usage")
  })

  ipcMain.handle("cursor:open-url", async (_event, url) => openExternalHttpUrl(url))

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
        profile: null,
        notifications: [],
        pullRequests: [],
        contributions: null,
        todayBreakdown: null,
        error: err instanceof Error ? err.message : "github_error",
      }
    }
  })

  ipcMain.handle("github:insights", async (_event, options) => {
    try {
      return await github.activityInsights({
        force: options?.force === true,
        year: options?.year,
      })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        years: [],
        chartYear: new Date().getFullYear(),
        repoTotals: [],
        repoCatalog: [],
        repoSeries: [],
        monthLabels: [],
        error: err instanceof Error ? err.message : "github_insights_error",
      }
    }
  })

  ipcMain.handle("github:weekly-repo-stack", async (_event, options) => {
    try {
      if (typeof options?.repoPullRequests === "string") {
        return await github.repoPullRequests(options.repoPullRequests, {
          force: options?.force === true,
        })
      }
      if (options?.pullRequestDetail?.repo && options?.pullRequestDetail?.number != null) {
        return await github.pullRequestDetail(options.pullRequestDetail.repo, options.pullRequestDetail.number, {
          force: options?.force === true,
        })
      }
      if (typeof options?.repoIssues === "string") {
        return await github.repoIssues(options.repoIssues, { force: options?.force === true })
      }
      if (options?.issueDetail?.repo && options?.issueDetail?.number != null) {
        return await github.issueDetail(options.issueDetail.repo, options.issueDetail.number, {
          force: options?.force === true,
        })
      }
      return await github.weeklyRepoStack({ force: options?.force === true })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        topRepos: [],
        repoUrls: {},
        weeks: [],
        days: [],
        error: err instanceof Error ? err.message : "github_weekly_stack_error",
      }
    }
  })

  ipcMain.handle("github:day-breakdown", async (_event, options) => {
    try {
      return await github.dayBreakdown(options ?? {})
    } catch (err) {
      return {
        date: options?.date ?? "",
        repos: [],
        error: err instanceof Error ? err.message : "github_day_error",
      }
    }
  })

  ipcMain.handle("github:notifications-inbox", async (_event, options) => {
    try {
      return await github.notificationsInbox(options ?? {})
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        items: [],
        hasMore: false,
        error: err instanceof Error ? err.message : "github_notifications_error",
      }
    }
  })

  ipcMain.handle("github:notification-read", async (_event, threadId) => {
    try {
      return await github.markNotificationRead(threadId)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "github_notification_read_error" }
    }
  })

  ipcMain.handle("github:notifications-read-all", async () => {
    try {
      return await github.markAllNotificationsRead()
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "github_notifications_read_all_error" }
    }
  })

  ipcMain.handle("github:open-url", async (_event, url) => openExternalHttpUrl(url))

  ipcMain.handle("github:repo-pull-requests", async (_event, options) => {
    try {
      return await github.repoPullRequests(options?.repo, { force: options?.force === true })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        repo: typeof options?.repo === "string" ? options.repo : "",
        items: [],
        error: err instanceof Error ? err.message : "github_repo_prs_error",
      }
    }
  })

  ipcMain.handle("github:pull-request-detail", async (_event, options) => {
    try {
      return await github.pullRequestDetail(options?.repo, options?.number, {
        force: options?.force === true,
      })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        error: err instanceof Error ? err.message : "github_pr_detail_error",
      }
    }
  })

  ipcMain.handle("github:repo-issues", async (_event, options) => {
    try {
      return await github.repoIssues(options?.repo, { force: options?.force === true })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        repo: typeof options?.repo === "string" ? options.repo : "",
        items: [],
        error: err instanceof Error ? err.message : "github_repo_issues_error",
      }
    }
  })

  ipcMain.handle("github:issue-detail", async (_event, options) => {
    try {
      return await github.issueDetail(options?.repo, options?.number, {
        force: options?.force === true,
      })
    } catch (err) {
      return {
        configured: github.configured(),
        connected: false,
        error: err instanceof Error ? err.message : "github_issue_detail_error",
      }
    }
  })

  ipcMain.handle("mint:status", async (_event, options) => {
    try {
      return await mint.status({
        force: options?.force === true,
        host: typeof options?.host === "string" ? options.host : undefined,
      })
    } catch (err) {
      return {
        configured: true,
        connected: false,
        host: "mint",
        hostname: null,
        uptimeSec: null,
        load1: null,
        load5: null,
        load15: null,
        memTotalMb: null,
        memUsedMb: null,
        memUsedPct: null,
        diskTotalGb: null,
        diskUsedGb: null,
        diskUsedPct: null,
        tailscaleIp: null,
        mirrorRepoCount: null,
        mirrorLastLog: null,
        cpuTempC: null,
        error: err instanceof Error ? err.message : "mint_error",
      }
    }
  })

  ipcMain.handle("wifi-sense:post", async (_event, options) => {
    const agentUrl = typeof options?.agentUrl === "string" ? options.agentUrl : ""
    const routePath = typeof options?.path === "string" ? options.path : ""
    const token = typeof options?.token === "string" ? options.token : undefined
    const body = options?.body
    return wifiSenseAgentPost(agentUrl, routePath, token, body)
  })

  ipcMain.handle("pi-display:mode", async (_event, options) => {
    try {
      return await piDisplay.getMode({
        host: typeof options?.host === "string" ? options.host : undefined,
      })
    } catch (err) {
      return {
        connected: false,
        host: "pi",
        error: err instanceof Error ? err.message : "pi_display_error",
        mode: null,
      }
    }
  })

  ipcMain.handle("pi-display:set-mode", async (_event, mode, options) => {
    try {
      return await piDisplay.setMode(mode, {
        host: typeof options?.host === "string" ? options.host : undefined,
      })
    } catch (err) {
      return {
        connected: false,
        host: "pi",
        error: err instanceof Error ? err.message : "pi_display_error",
        mode: null,
        switched: false,
      }
    }
  })

  ipcMain.handle("pi-display:now-playing", async (_event, options) => {
    try {
      return await piDisplay.getNowPlaying({
        host: typeof options?.host === "string" ? options.host : undefined,
      })
    } catch (err) {
      return {
        connected: false,
        host: "pi",
        error: err instanceof Error ? err.message : "pi_display_error",
        playing: false,
        mode: null,
        track: null,
        artist: null,
        album: null,
        artUrl: null,
        progressMs: null,
        durationMs: null,
      }
    }
  })

  ipcMain.handle("pi:status", async (_event, options) => {
    try {
      return await pi.status({
        force: options?.force === true,
        host: typeof options?.host === "string" ? options.host : undefined,
      })
    } catch (err) {
      return {
        configured: true,
        connected: false,
        host: "pi",
        hostname: null,
        uptimeSec: null,
        load1: null,
        load5: null,
        load15: null,
        memTotalMb: null,
        memUsedMb: null,
        memUsedPct: null,
        diskTotalGb: null,
        diskUsedGb: null,
        diskUsedPct: null,
        tailscaleIp: null,
        mirrorRepoCount: null,
        mirrorLastLog: null,
        cpuTempC: null,
        error: err instanceof Error ? err.message : "pi_error",
      }
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
        calendarActivities: [],
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

  ipcMain.handle("strava:activity", async (_event, activityId) => {
    try {
      return await strava.getActivity(activityId)
    } catch (err) {
      throw err instanceof Error ? err : new Error("strava_activity_error")
    }
  })

  ipcMain.handle("strava:activity-streams", async (_event, activityId) => {
    try {
      return await strava.getActivityStreams(activityId)
    } catch (err) {
      throw err instanceof Error ? err : new Error("strava_activity_streams_error")
    }
  })

  ipcMain.handle("strava:open-url", async (_event, url) => openExternalHttpUrl(url))

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
    } catch {
      return {
        configured: calendar.isConfigured(),
        connected: calendar.isConnected(),
        events: [],
        error: "calendar_error",
      }
    }
  })

  ipcMain.handle("calendar:connect", async () => {
    await calendar.startAuth()
    return calendar.snapshot({ force: true })
  })

  ipcMain.handle("calendar:disconnect", async () => calendar.disconnect())

  ipcMain.handle("calendar:redirect-uri", () => calendar.getRedirectUri())

  ipcMain.handle("calendar:open-url", async (_event, url) => openExternalHttpUrl(url))

  ipcMain.handle("settings:get", () => settingsStore.readSettings())

  ipcMain.handle("settings:set", (_event, partial) => {
    const next = settingsStore.writeSettings(partial)
    if (partial && Object.prototype.hasOwnProperty.call(partial, "launchAtLogin")) {
      syncLaunchAtLogin(resolveLaunchAtLogin(next))
    }
    if (
      partial?.yearWallpaper &&
      Object.prototype.hasOwnProperty.call(partial.yearWallpaper, "autoUpdateDaily") &&
      partial.yearWallpaper.autoUpdateDaily
    ) {
      getWallpaperDailyScheduler()?.runNow?.()
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

  ipcMain.handle("notch:carto-api-key", () =>
    String(process.env.CARTO_API_KEY || process.env.VITE_CARTO_API_KEY || "").trim(),
  )

  ipcMain.handle("keyboard-layout:current", () => keyboardLayout.getCurrent())

  ipcMain.handle("db:status", () => db.status())

  ipcMain.handle("neon:functions:status", () => neonFunctions.status())
  ipcMain.handle("neon:hello", () => neonFunctions.fetchHello())
}

module.exports = { registerServicesIpc }