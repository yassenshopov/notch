const fs = require("fs")
const path = require("path")
const { app } = require("electron")
const kv = require("./snapshot-kv.cjs")
const { sanitizeSettingsForNeon } = require("./settings-neon-sanitize.cjs")

const NS = "settings"
const KIND = "default"

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json")
}

function fileMtime() {
  try {
    return fs.statSync(settingsPath()).mtimeMs
  } catch {
    return 0
  }
}

async function pullFromNeonIfNewer() {
  const fileAt = fileMtime()
  const dbAt = (await kv.readRemoteSyncedAt(NS, KIND)) ?? 0
  if (!dbAt || dbAt <= fileAt) return false
  const row = await kv.readWithMeta(NS, KIND, { preferRemote: true })
  if (!row?.payload || typeof row.payload !== "object") return false
  fs.writeFileSync(settingsPath(), JSON.stringify(row.payload, null, 2), "utf8")
  return true
}

async function pushToNeon(settings) {
  if (!settings || typeof settings !== "object") return
  await kv.write(NS, KIND, sanitizeSettingsForNeon(settings))
}

async function bootstrap() {
  let row = null
  let fileExists = false
  try {
    fileExists = fs.statSync(settingsPath()).isFile()
  } catch {
    fileExists = false
  }

  if (!fileExists) {
    row = await kv.readWithMeta(NS, KIND)
    if (row?.payload) {
      fs.writeFileSync(settingsPath(), JSON.stringify(row.payload, null, 2), "utf8")
      return { source: "neon" }
    }
  }

  if (fileExists) {
    const pulled = await pullFromNeonIfNewer()
    if (pulled) return { source: "neon" }
  }

  if (fileExists) {
    row = await kv.readWithMeta(NS, KIND)
    if (!row?.payload) {
      try {
        const file = JSON.parse(fs.readFileSync(settingsPath(), "utf8"))
        await pushToNeon(file)
        return { source: "imported_file" }
      } catch {
        // ignore
      }
    }
  }

  return { source: "file" }
}

async function clearNeon() {
  await kv.remove(NS, KIND)
}

module.exports = {
  bootstrap,
  pushToNeon,
  pullFromNeonIfNewer,
  clearNeon,
}