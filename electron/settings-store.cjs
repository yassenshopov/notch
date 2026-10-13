const fs = require("fs")
const path = require("path")
const { app } = require("electron")

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json")
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), "utf8"))
  } catch {
    return {}
  }
}

function deepMerge(base, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return patch
  const out = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base?.[key] &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      out[key] = deepMerge(base[key], value)
    } else {
      out[key] = value
    }
  }
  return out
}

function writeSettings(partial) {
  const prev = readSettings()
  const next = deepMerge(prev, partial)
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), "utf8")
  return next
}

function resetSettings() {
  try {
    fs.unlinkSync(settingsPath())
  } catch {
    // ignore
  }
  return {}
}

module.exports = {
  readSettings,
  writeSettings,
  resetSettings,
}
