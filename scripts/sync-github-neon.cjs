const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "../.env") })

const { app } = require("electron")
const { alignNotchUserData } = require("../electron/notch-user-data.cjs")
alignNotchUserData()

const db = require("../electron/db.cjs")
const github = require("../electron/github.cjs")

app
  .whenReady()
  .then(async () => {
    await db.init()

    if (!process.env.GITHUB_TOKEN?.trim() && !process.env.GH_TOKEN?.trim()) {
      console.error("[sync-github-neon] missing GITHUB_TOKEN in .env")
      app.exit(1)
      return
    }

    const [status, insights, weekly, inbox] = await Promise.all([
      github.status({ force: true }),
      github.activityInsights({ force: true }),
      github.weeklyRepoStack({ force: true }),
      github.notificationsInbox({ force: true }),
    ])

    let snapshotCount = 0
    if (db.isConfigured() && status.login) {
      const sql = db.getSql()
      if (sql) {
        const rows = await sql`
          SELECT COUNT(*)::int AS n
          FROM github_snapshots
          WHERE login = ${status.login}
        `
        snapshotCount = rows?.[0]?.n ?? 0
      }
    }

    console.log(
      JSON.stringify(
        {
          login: status.login,
          connected: status.connected,
          contributionsTotal: status.contributions?.total ?? null,
          insightYears: insights.years?.length ?? 0,
          weeklyWeeks: weekly.weeks?.length ?? 0,
          notifications: inbox.items?.length ?? 0,
          neonSnapshots: snapshotCount,
        },
        null,
        2,
      ),
    )

    app.exit(status.connected ? 0 : 1)
  })
  .catch((err) => {
    console.error(err)
    app.exit(1)
  })