const { createSshServerStats } = require("./ssh-server-stats.cjs")

module.exports = createSshServerStats({
  defaultHost: "mint",
  fallbackHosts: ["mint-home", "mint-ts"],
  defaultScript: "/home/yassenshopov/bin/notch-mint-stats.sh",
  envHostKey: "NOTCH_MINT_SSH_HOST",
  envScriptKey: "NOTCH_MINT_STATS_SCRIPT",
  errorTag: "mint_ssh_error",
})
