const { shell } = require("electron")

/** @param {unknown} url */
async function openExternalHttpUrl(url) {
  if (typeof url !== "string" || !url.trim()) {
    return { ok: false, reason: "missing_url" }
  }
  const trimmed = url.trim()
  if (!/^https?:\/\//i.test(trimmed)) {
    return { ok: false, reason: "invalid_scheme" }
  }
  await shell.openExternal(trimmed)
  return { ok: true }
}

module.exports = { openExternalHttpUrl }