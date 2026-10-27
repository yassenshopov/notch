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
      sshHint="Uses ssh pi-ts (Tailscale), then pi-home on LAN, then pi. Install Tailscale on this PC if pi-ts fails."
      tertiary="temp"
      flavor="pi"
      {...props}
    />
  )
}
