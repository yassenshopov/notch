import { emptyServerStats, type ServerStatsStatus } from "./server-stats"

export type PiServerStatus = ServerStatsStatus

export async function fetchPiStatus(options?: {
  force?: boolean
  host?: string
}): Promise<PiServerStatus> {
  const bridge = window.notch?.pi
  if (!bridge) {
    return { ...emptyServerStats(options?.host ?? "pi-home"), error: "notch_bridge_unavailable" }
  }
  return bridge.status(options)
}
