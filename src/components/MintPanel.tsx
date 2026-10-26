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

export function MintPanel(props: Props) {
  return (
    <ServerStatsPanel
      title="Mint server"
      sshHint="Needs Tailscale and ssh mint from this PC."
      tertiary="mirrors"
      flavor="mint"
      {...props}
    />
  )
}
