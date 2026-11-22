const { shell } = require("electron")
const { isHttpUrl } = require("../http-url.cjs")

/** @param {unknown} url */
async function openExternalHttpUrl(url) {
  if (isHttpUrl(url)) {
    await shell.openExternal(url.trim())
  }
}

module.exports = { openExternalHttpUrl }