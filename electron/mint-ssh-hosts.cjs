/** Shared Mint SSH host order — keep in sync with electron/mint.cjs fallbackHosts */
const MINT_SSH_FALLBACK_HOSTS = ["mint-ts", "mint-home", "mint-via-pi"]
const REMOTE_REL_DIR = "Pictures/Notch"

/**
 * @param {string | undefined} sshHost from settings or env
 * @returns {string[]}
 */
function resolveMintSshHosts(sshHost) {
  const primary =
    typeof sshHost === "string" && sshHost.trim()
      ? sshHost.trim()
      : process.env.NOTCH_MINT_SSH_HOST?.trim() || "mint-ts"

  const hosts = [...MINT_SSH_FALLBACK_HOSTS]
  // "mint" is LAN-only in ~/.ssh/config (same as mint-home); fallbacks already cover it.
  if (primary && primary !== "mint" && !hosts.includes(primary)) {
    hosts.push(primary)
  }
  return hosts
}

module.exports = { MINT_SSH_FALLBACK_HOSTS, resolveMintSshHosts, REMOTE_REL_DIR }