const { shell } = require("electron")

/** @param {unknown} url */
async function openExternalHttpUrl(url) {
  if (typeof url === "string" && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
  }
}

module.exports = { openExternalHttpUrl }