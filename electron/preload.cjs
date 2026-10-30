const { contextBridge, ipcRenderer } = require("electron")

// Sandboxed preload cannot require dotenv; key is resolved in main (see notch:carto-api-key).
const cartoApiKey =
  process.env.CARTO_API_KEY || process.env.VITE_CARTO_API_KEY || ""

contextBridge.exposeInMainWorld("notch", {
  desktop: {
    open: (panel) => ipcRenderer.invoke("desktop:open", panel),
    onNavigate: (cb) => {
      const handler = (_event, panel) => cb(panel)
      ipcRenderer.on("desktop:navigate", handler)
      return () => ipcRenderer.removeListener("desktop:navigate", handler)
    },
  },
  setExpanded: (payload) => ipcRenderer.invoke("notch:set-expanded", payload),
  setPassthrough: (pass) => ipcRenderer.invoke("notch:set-passthrough", pass),
  reposition: () => ipcRenderer.invoke("notch:reposition"),
  getPlacement: () => ipcRenderer.invoke("notch:placement-get"),
  dragStart: (payload) => ipcRenderer.invoke("notch:drag-start", payload),
  dragMove: (payload) => ipcRenderer.send("notch:drag-move", payload),
  dragEnd: () => ipcRenderer.invoke("notch:drag-end"),
  dragCancel: () => ipcRenderer.invoke("notch:drag-cancel"),
  onPlacement: (cb) => {
    const handler = (_event, placement) => cb(placement)
    ipcRenderer.on("notch:placement", handler)
    return () => ipcRenderer.removeListener("notch:placement", handler)
  },
  onBlur: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("notch:window-blur", handler)
    return () => ipcRenderer.removeListener("notch:window-blur", handler)
  },
  onEscape: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("notch:escape", handler)
    return () => ipcRenderer.removeListener("notch:escape", handler)
  },
  onTestExpand: (cb) => {
    const handler = () => cb()
    ipcRenderer.on("notch:test-expand", handler)
    return () => ipcRenderer.removeListener("notch:test-expand", handler)
  },
  platform: process.platform,
  spotify: {
    status: () => ipcRenderer.invoke("spotify:status"),
    connect: () => ipcRenderer.invoke("spotify:connect"),
    disconnect: () => ipcRenderer.invoke("spotify:disconnect"),
    action: (action, options) => ipcRenderer.invoke("spotify:action", action, options),
    recentlyPlayed: (limit) => ipcRenderer.invoke("spotify:recently-played", limit),
    playUri: (uri, options) => ipcRenderer.invoke("spotify:play-uri", uri, options),
    lyrics: (query) => ipcRenderer.invoke("spotify:lyrics", query),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partial) => ipcRenderer.invoke("settings:set", partial),
    reset: () => ipcRenderer.invoke("settings:reset"),
  },
  cursor: {
    status: (options) => ipcRenderer.invoke("cursor:status", options),
    analytics: (options) => ipcRenderer.invoke("cursor:analytics", options),
    openDashboard: () => ipcRenderer.invoke("cursor:open-dashboard"),
    openUrl: (url) => ipcRenderer.invoke("cursor:open-url", url),
  },
  markets: {
    snapshot: (watchlist) => ipcRenderer.invoke("markets:snapshot", watchlist),
    chart: (quote, range) => ipcRenderer.invoke("markets:chart", quote, range),
  },
  github: {
    status: (options) => ipcRenderer.invoke("github:status", options),
    insights: (options) => ipcRenderer.invoke("github:insights", options),
    openUrl: (url) => ipcRenderer.invoke("github:open-url", url),
  },
  mint: {
    status: (options) => ipcRenderer.invoke("mint:status", options),
  },
  pi: {
    status: (options) => ipcRenderer.invoke("pi:status", options),
    displayMode: (options) => ipcRenderer.invoke("pi-display:mode", options),
    displaySetMode: (mode, options) => ipcRenderer.invoke("pi-display:set-mode", mode, options),
    displayNowPlaying: (options) => ipcRenderer.invoke("pi-display:now-playing", options),
  },
  piDisplay: {
    mode: (options) => ipcRenderer.invoke("pi-display:mode", options),
    setMode: (mode, options) => ipcRenderer.invoke("pi-display:set-mode", mode, options),
    nowPlaying: (options) => ipcRenderer.invoke("pi-display:now-playing", options),
  },
  strava: {
    status: (options) => ipcRenderer.invoke("strava:status", options),
    activity: (activityId) => ipcRenderer.invoke("strava:activity", activityId),
    activityStreams: (activityId) => ipcRenderer.invoke("strava:activity-streams", activityId),
    connect: () => ipcRenderer.invoke("strava:connect"),
    disconnect: () => ipcRenderer.invoke("strava:disconnect"),
    openUrl: (url) => ipcRenderer.invoke("strava:open-url", url),
  },
  media: {
    status: () => ipcRenderer.invoke("media:status"),
    action: (action) => ipcRenderer.invoke("media:action", action),
  },
  calendar: {
    snapshot: (options) => ipcRenderer.invoke("calendar:snapshot", options),
    openUrl: (url) => ipcRenderer.invoke("calendar:open-url", url),
  },
  wallpaper: {
    regenerate: (options) => ipcRenderer.invoke("wallpaper:regenerate", options),
    pickOutputFolder: () => ipcRenderer.invoke("wallpaper:pick-output-folder"),
  },
  controls: {
    status: () => ipcRenderer.invoke("controls:status"),
    setVolume: (level) => ipcRenderer.invoke("controls:set-volume", level),
    setMuted: (muted) => ipcRenderer.invoke("controls:set-muted", muted),
    setMicMuted: (muted) => ipcRenderer.invoke("controls:set-mic-muted", muted),
    setBrightness: (level) => ipcRenderer.invoke("controls:set-brightness", level),
    setPlayback: (id) => ipcRenderer.invoke("controls:set-playback", id),
    setBluetooth: (id, connected) =>
      ipcRenderer.invoke("controls:set-bluetooth", { id, connected }),
  },
  mapTiles: {
    cartoApiKey,
    fetchCartoApiKey: () => ipcRenderer.invoke("notch:carto-api-key"),
  },
})
