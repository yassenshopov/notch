const path = require("path")
const { app } = require("electron")

/** Same Roaming\\notch folder as `electron .` / packaged Notch. */
function alignNotchUserData() {
  const dir = path.join(app.getPath("appData"), "notch")
  app.setName("notch")
  app.setPath("userData", dir)
  return dir
}

module.exports = { alignNotchUserData }