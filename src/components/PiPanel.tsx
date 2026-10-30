import { useState } from "react"
import type { ServerStatsHistory } from "../lib/server-stats-history"
import type { ServerStatsStatus } from "../lib/server-stats"
import type { SpotifyStatus } from "../lib/spotify"
import type { SpotifyAction } from "../lib/spotify"
import { cn } from "../lib/utils"
import { PI_PANEL_RED } from "../lib/pi-theme"
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
      <div
        className="flex shrink-0 gap-1 rounded-full bg-black/6 p-1 dark:bg-white/10"
        role="tablist"
        aria-label="Raspberry Pi sections"
      >
        {(
          [
            ["server", "Server"],
            ["tv", "TV"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition",
              tab === id
                ? "bg-white text-[#111] shadow-sm dark:bg-[#222] dark:text-white"
                : "text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/75",
            )}
            style={tab === id && id === "tv" ? { boxShadow: `0 0 0 1px ${PI_PANEL_RED}33` } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "server" ? (
          <ServerStatsPanel
            title="Raspberry Pi"
            sshHint="Uses ssh pi-ts (Tailscale), then pi-home on LAN, then pi. Install Tailscale on this PC if pi-ts fails."
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
