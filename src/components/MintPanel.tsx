import { RefreshCw, Server } from "lucide-react"
import { formatUptime, type MintServerStatus } from "../lib/mint"
import { cn } from "../lib/utils"

type Props = {
  status: MintServerStatus
  loading?: boolean
  refreshing: boolean
  onRefresh: () => void
}

function Bar({ label, pct, detail }: { label: string; pct: number | null; detail: string }) {
  const p = pct == null ? 0 : Math.min(100, Math.max(0, pct))
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-black/45 dark:text-white/45">{detail}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            p >= 90 ? "bg-red-500/80" : p >= 75 ? "bg-amber-500/80" : "bg-emerald-500/80",
          )}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  )
}

export function MintPanel({ status, loading, refreshing, onRefresh }: Props) {
  if (!status.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <Server className="mb-2 size-8 text-black/30 dark:text-white/30" strokeWidth={1.5} />
        <p className="text-[15px] font-semibold">Mint server</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          SSH to <span className="font-medium">{status.host}</span> failed.
        </p>
        {status.error ? (
          <p className="mt-1 max-w-[280px] break-all text-[11px] text-red-400/90">{status.error}</p>
        ) : null}
        <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">
          Needs Tailscale + <span className="font-medium">ssh mint</span> from this PC.
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 rounded-full px-4 py-2 text-[12px] font-medium bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          Retry
        </button>
      </div>
    )
  }

  const name = status.hostname ?? "mint"

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 flex items-start justify-between gap-2 pr-8">
        <div>
          <p className="text-[15px] font-semibold tracking-tight">{name}</p>
          <p className="text-[12px] text-black/45 dark:text-white/45">
            {status.host}
            {status.tailscaleIp ? ` · ${status.tailscaleIp}` : ""}
          </p>
        </div>
        <button
          type="button"
          aria-label="Refresh server stats"
          disabled={refreshing}
          onClick={onRefresh}
          className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
      </header>

      {loading ? (
        <p className="text-[12px] text-black/40 dark:text-white/40">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Uptime" value={formatUptime(status.uptimeSec)} />
            <Stat
              label="Load"
              value={
                status.load1 != null
                  ? `${status.load1.toFixed(2)}`
                  : "—"
              }
              sub={status.load5 != null ? `5m ${status.load5.toFixed(2)}` : undefined}
            />
            <Stat
              label="Mirrors"
              value={status.mirrorRepoCount != null ? String(status.mirrorRepoCount) : "—"}
              sub="git repos"
            />
          </div>

          <Bar
            label="Memory"
            pct={status.memUsedPct}
            detail={
              status.memUsedMb != null && status.memTotalMb != null
                ? `${status.memUsedMb} / ${status.memTotalMb} MB`
                : "—"
            }
          />
          <Bar
            label="Disk /"
            pct={status.diskUsedPct}
            detail={
              status.diskUsedGb != null && status.diskTotalGb != null
                ? `${status.diskUsedGb} / ${status.diskTotalGb} GB`
                : "—"
            }
          />

          {status.mirrorLastLog ? (
            <p className="text-[11px] text-black/40 dark:text-white/40">
              Last mirror sync log:{" "}
              <span className="font-mono text-[10px]">{status.mirrorLastLog}</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-black/[0.04] px-2.5 py-2 dark:bg-white/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="text-[15px] font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="text-[10px] text-black/35 dark:text-white/35">{sub}</p> : null}
    </div>
  )
}
