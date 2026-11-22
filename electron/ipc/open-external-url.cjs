const { shell } = require("electron")
const { isHttpUrl } = require("../http-url.cjs")

/** @param {unknown} url */
async function openExternalHttpUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, reason: "missing_url" }
  }
  const trimmed = url.trim()
  if (!isHttpUrl(trimmed)) {
    return { ok: false, reason: "invalid_scheme" }
  }
  await shell.openExternal(trimmed)
  return { ok: true }
}

module.exports = { openExternalHttpUrl }