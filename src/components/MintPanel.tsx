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
      sshHint="Tries mint-home, mint-via-pi (Pi relay), then mint-ts (Tailscale). If the error mentions NoState, run scripts/fix-windows-tailscale.ps1 as Administrator."
      tertiary="mirrors"
      flavor="mint"
      {...props}
    />
  )
}
