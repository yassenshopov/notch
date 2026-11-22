const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app } = require("electron")
const { alignNotchUserData } = require("../electron/notch-user-data.cjs")
alignNotchUserData()

const db = require("../electron/db.cjs")
const strava = require("../electron/strava.cjs")

app
  .whenReady()
  .then(async () => {
    const dbInit = await db.init()
    console.info("[sync-strava-neon] database", dbInit)

    const status = await strava.status({ force: true })
    const summary = {
      configured: status.configured,
      connected: status.connected,
      athleteId: status.athleteId ?? null,
      activityCount: Array.isArray(status.activities) ? status.activities.length : 0,
      activitiesSyncedAt: status.activitiesSyncedAt ?? null,
      message: status.message ?? null,
    }
    console.log(JSON.stringify(summary, null, 2))

    if (status.connected && db.isConfigured()) {
      const sql = db.getSql()
      if (sql) {
        const rows = await sql`SELECT COUNT(*)::int AS n FROM strava_activities`
        console.info("[sync-strava-neon] neon rows", rows?.[0]?.n ?? 0)
      }
    }

    app.exit(summary.connected && dbInit.ok !== false ? 0 : 1)
  })
  .catch((err) => {
    console.error(err)
    app.exit(1)
  })