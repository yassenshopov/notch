import type { ServerStatsStatus } from "../lib/server-stats"
import { ServerStatsPanel } from "./ServerStatsPanel"

type Props = {
  status: ServerStatsStatus
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
      {...props}
    />
  )
}
