const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app } = require("electron")
const db = require("../electron/db.cjs")
const github = require("../electron/github.cjs")
const strava = require("../electron/strava.cjs")
const calendar = require("../electron/calendar.cjs")
const markets = require("../electron/markets.cjs")
const spotify = require("../electron/spotify.cjs")
const liveIngest = require("../electron/spotify-live-ingest.cjs")
const mint = require("../electron/mint.cjs")
const pi = require("../electron/pi.cjs")
const settingsStore = require("../electron/settings-store.cjs")
const settingsPersistence = require("../electron/settings-persistence.cjs")
app.whenReady().then(async () => {
  await db.init()
  const results = {}

  await settingsPersistence.pushToNeon(settingsStore.readSettings())
  results.settings = "pushed"

  if (process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim()) {
    results.github = await github.status({ force: true })
  }

  if (strava.isConnected()) {
    results.strava = await strava.status({ force: true })
  }

  if (calendar.isConnected()) {
    results.calendar = await calendar.snapshot({ force: true })
  }

  results.markets = await markets.snapshot()

  if (spotify.isConnected()) {
    results.spotify = {
      now: await spotify.getCurrentlyPlaying(),
      recent: await spotify.getRecentlyPlayed(20, { force: true }),
      history: (await spotify.getListeningHistory(20)).length,
      liveIngest: await liveIngest.ingestRecentlyPlayed(50),
    }
  }

  results.mint = await mint.status({ force: true }).catch((err) => ({
    error: err?.message || String(err),
  }))
  results.pi = await pi.status({ force: true }).catch((err) => ({
    error: err?.message || String(err),
  }))

  if (db.isConfigured() && db.getSql()) {
    const rows = await db.getSql()`SELECT namespace, kind FROM app_kv_snapshots ORDER BY namespace, kind`
    results.kvRows = (rows || []).map((r) => `${r.namespace}/${r.kind}`)
  }

  console.log(JSON.stringify(results, null, 2))
  app.exit(0)
})