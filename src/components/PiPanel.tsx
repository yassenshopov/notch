import { useState } from "react"
import type { ServerStatsHistory } from "../lib/server-stats-history"
import type { ServerStatsStatus } from "../lib/server-stats"
import type { SpotifyStatus } from "../lib/spotify"
import type { SpotifyAction } from "../lib/spotify"
import { PI_PANEL_RED } from "../lib/pi-theme"
import { SegmentedControl } from "./SegmentedControl"
import { ServerStatsPanel } from "./ServerStatsPanel"
import { PiTvPanel } from "./PiTvPanel"

type Tab = "server" | "tv"

type Props = {
  status: ServerStatsStatus
  history: ServerStatsHistory
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
  spotify: SpotifyStatus
  onTvAction: (action: SpotifyAction) => void
}

export function PiPanel({ spotify, onTvAction, ...statsProps }: Props) {
  const [tab, setTab] = useState<Tab>("server")

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <SegmentedControl
        variant="pi"
        role="tablist"
        aria-label="Raspberry Pi sections"
        value={tab}
        equalWidth
        className="w-full"
        options={[
          { value: "server", label: "Server" },
          { value: "tv", label: "TV" },
        ]}
        getIndicatorStyle={(id) =>
          id === "tv" ? { boxShadow: `0 0 0 1px ${PI_PANEL_RED}33` } : undefined
        }
        onChange={setTab}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "server" ? (
          <ServerStatsPanel
            title="Raspberry Pi"
            sshHint="Tries pi-home (LAN), then pi-ts (Tailscale). On Windows use a LAN IP in ~/.ssh/config—not raspberrypi.local. Complete Tailscale SSH check-in if prompted."
            tertiary="temp"
            flavor="pi"
            {...statsProps}
          />
        ) : (
          <PiTvPanel spotify={spotify} onTvAction={onTvAction} />
        )}
      </div>
    </div>
  )
}
