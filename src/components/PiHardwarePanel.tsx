import { Cpu, HardDrive, MemoryStick, Thermometer } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"
import { createPiHardwareScene, type PiHardwareSceneHandle } from "../lib/pi-hardware-scene"
import { PI_PANEL_RED } from "../lib/pi-theme"
import { formatUptime, type ServerStatsStatus } from "../lib/server-stats"
import { cn } from "../lib/utils"
import { usePanelLayout } from "../lib/panel-layout"
import { useTheme } from "../hooks/useTheme"

const PI_MODEL = "Raspberry Pi 4 Model B"

type Props = {
  status: ServerStatsStatus
}

function fmtPct(p: number | null | undefined, suffix = "%") {
  if (p == null || Number.isNaN(p)) return "—"
  return `${p.toFixed(p >= 10 ? 0 : 1)}${suffix}`
}

export function PiHardwarePanel({ status }: Props) {
  const desktop = usePanelLayout() === "desktop"
  const dark = useTheme()
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<PiHardwareSceneHandle | null>(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const handle = createPiHardwareScene(el, status, dark)
    sceneRef.current = handle
    return () => {
      handle.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setStats(status)
  }, [status])

  useEffect(() => {
    sceneRef.current?.setDark(dark)
  }, [dark])

  const hostLabel = status.hostname ?? status.host ?? "pi"
  const temp =
    status.cpuTempC != null ? `${status.cpuTempC.toFixed(1)}°C` : status.connected ? "—" : "offline"

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div>
        <p className="text-[15px] font-semibold tracking-tight">{PI_MODEL}</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          {hostLabel}
          {status.lanIp ? ` · LAN ${status.lanIp}` : null}
          {status.tailscaleIp ? ` · Tailscale ${status.tailscaleIp}` : null}
        </p>
      </div>

      <div
        className={cn(
          "relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl border border-black/8 bg-[#f2f2f4] dark:border-white/12 dark:bg-[#3a3a40]",
          desktop ? "flex-1 min-h-[320px]" : "h-[240px]",
        )}
      >
        <div ref={mountRef} className="absolute inset-0 size-full" aria-label="3D Raspberry Pi board" />
        {!status.connected && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-black/45 dark:text-white/60">
            Connect via SSH to light up the board from live stats.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric
          icon={<Thermometer className="size-3.5" aria-hidden />}
          label="SoC"
          value={temp}
          sub="thermal zone"
          accent={PI_PANEL_RED}
        />
        <Metric
          icon={<MemoryStick className="size-3.5" aria-hidden />}
          label="RAM"
          value={fmtPct(status.memUsedPct)}
          sub={
            status.memUsedMb != null && status.memTotalMb != null
              ? `${status.memUsedMb} / ${status.memTotalMb} MB`
              : undefined
          }
        />
        <Metric
          icon={<HardDrive className="size-3.5" aria-hidden />}
          label="SD"
          value={fmtPct(status.diskUsedPct)}
          sub={
            status.diskUsedGb != null && status.diskTotalGb != null
              ? `${status.diskUsedGb} / ${status.diskTotalGb} GB`
              : undefined
          }
        />
        <Metric
          icon={<Cpu className="size-3.5" aria-hidden />}
          label="Load"
          value={
            status.load1 != null
              ? status.load1.toFixed(2)
              : status.connected
                ? "—"
                : "—"
          }
          sub={`${formatUptime(status.uptimeSec)} · ${status.cpuCount ?? "?"} cores`}
        />
      </div>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div
      className="rounded-xl bg-black/[0.04] px-2.5 py-2 dark:bg-white/[0.06]"
      style={accent ? { boxShadow: `inset 0 0 0 1px ${accent}22` } : undefined}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
        {icon}
        {label}
      </p>
      <p className="text-[15px] font-semibold tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="text-[10px] text-black/35 dark:text-white/35">{sub}</p> : null}
    </div>
  )
}
