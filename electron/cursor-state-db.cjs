const { spawnSync } = require("child_process")
const path = require("path")
const os = require("os")

const READ_TOKEN_PY = `import sqlite3,sys
db=sys.argv[1]
con=sqlite3.connect(f"file:{db}?mode=ro", uri=True)
row=con.execute("SELECT value FROM ItemTable WHERE key='cursorAuth/accessToken'").fetchone()
con.close()
if row:
    print(row[0], end="")
`

/** @returns {string | null} */
function stateDbPath() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA
    if (!appData) return null
    return path.join(appData, "Cursor", "User", "globalStorage", "state.vscdb")
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Cursor",
      "User",
      "globalStorage",
      "state.vscdb",
    )
  }
  return path.join(os.homedir(), ".config", "Cursor", "User", "globalStorage", "state.vscdb")
}

/** @param {string} dbPath */
function readAccessTokenWithNodeSqlite(dbPath) {
  try {
    const { DatabaseSync } = require("node:sqlite")
    const db = new DatabaseSync(dbPath, { readOnly: true })
    const row = db
      .prepare("SELECT value FROM ItemTable WHERE key = ?")
      .get("cursorAuth/accessToken")
    db.close()
    if (!row || typeof row.value !== "string") return null
    const value = row.value.trim()
    return value || null
  } catch {
    return null
  }
}

/** @param {string} dbPath */
function readAccessTokenWithPython(dbPath) {
  const runners = [
    ["python", ["-c", READ_TOKEN_PY, dbPath]],
    ["py", ["-3", "-c", READ_TOKEN_PY, dbPath]],
    ["python3", ["-c", READ_TOKEN_PY, dbPath]],
  ]

  for (const [cmd, args] of runners) {
    const out = spawnSync(cmd, args, {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    })
    if (out.status === 0 && out.stdout?.trim()) {
      return out.stdout.trim()
    }
  }
  return null
}

/** @returns {string | null} */
function readAccessTokenFromStateDb() {
  const dbPath = stateDbPath()
  if (!dbPath) return null
  return readAccessTokenWithNodeSqlite(dbPath) ?? readAccessTokenWithPython(dbPath)
}

module.exports = { readAccessTokenFromStateDb, stateDbPath }