import type { ServerStatsHistory } from "../lib/server-stats-history"
import type { ServerStatsStatus } from "../lib/server-stats"
import { ServerStatsPanel } from "./ServerStatsPanel"

type Props = {
  status: ServerStatsStatus
  history: ServerStatsHistory
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
}

export function PiPanel(props: Props) {
  return (
    <ServerStatsPanel
      title="Raspberry Pi"
      sshHint="Needs ssh pi-home (or a Tailscale SSH host) from this PC."
      tertiary="temp"
      flavor="pi"
      {...props}
    />
  )
}
