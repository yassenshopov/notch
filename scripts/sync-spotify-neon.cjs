const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app } = require("electron")
const db = require("../electron/db.cjs")
const spotify = require("../electron/spotify.cjs")
const liveIngest = require("../electron/spotify-live-ingest.cjs")
const library = require("../electron/spotify-library.cjs")

app.whenReady().then(async () => {
  await db.init()

  const out = {
    at: new Date().toISOString(),
    configured: spotify.isConfigured(),
    connected: spotify.isConnected(),
    database: db.isConfigured(),
  }

  if (!out.configured) {
    console.log(JSON.stringify({ ...out, ok: false, error: "spotify_not_configured" }, null, 2))
    app.exit(1)
    return
  }

  if (!out.connected) {
    console.log(JSON.stringify({ ...out, ok: false, error: "spotify_not_connected" }, null, 2))
    app.exit(1)
    return
  }

  if (!out.database) {
    console.log(JSON.stringify({ ...out, ok: false, error: "database_not_configured" }, null, 2))
    app.exit(1)
    return
  }

  out.liveIngest = await liveIngest.ingestRecentlyPlayed(50)
  out.library = await library.libraryStatus()

  console.log(JSON.stringify({ ...out, ok: true }, null, 2))
  app.exit(out.liveIngest?.ok === false ? 1 : 0)
})