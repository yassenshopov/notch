const { createSshServerStats } = require("./ssh-server-stats.cjs")

module.exports = createSshServerStats({
  defaultHost: "pi",
  fallbackHosts: ["pi-ts", "pi-home"],
  defaultScript: "/home/pi/bin/notch-pi-stats.sh",
  envHostKey: "NOTCH_PI_SSH_HOST",
  envScriptKey: "NOTCH_PI_STATS_SCRIPT",
  errorTag: "pi_ssh_error",
})
