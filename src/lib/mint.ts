import { emptyServerStats, type ServerStatsStatus } from "./server-stats"

export type MintServerStatus = ServerStatsStatus

export { formatUptime } from "./server-stats"

export async function fetchMintStatus(options?: {
  force?: boolean
  host?: string
}): Promise<MintServerStatus> {
  const bridge = window.notch?.mint
  if (!bridge) {
    return { ...emptyServerStats(options?.host ?? "mint"), error: "notch_bridge_unavailable" }
  }
  return bridge.status(options)
}
