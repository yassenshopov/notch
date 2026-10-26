import type { ServerStatsStatus } from "../lib/server-stats"
import { ServerStatsPanel } from "./ServerStatsPanel"

type Props = {
  status: ServerStatsStatus
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
}

export function MintPanel(props: Props) {
  return (
    <ServerStatsPanel
      title="Mint server"
      sshHint="Needs Tailscale and ssh mint from this PC."
      tertiary="mirrors"
      {...props}
    />
  )
}
