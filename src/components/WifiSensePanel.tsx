import { Activity, Radio, RefreshCw, Waves } from "lucide-react"
import { useState } from "react"
import { usePanelLayout } from "../lib/panel-layout"
import type { WifiSenseLiveState } from "../lib/wifi-sense"
import { wifiSensePost } from "../lib/wifi-sense"
import { cn } from "../lib/utils"
import { MetricChart } from "./MetricChart"
import { PanelHeaderActions } from "./PanelHeaderActions"

type Props = {
  agentUrl: string
  token?: string
  state: WifiSenseLiveState
  onRefreshStatus: () => void
}

const STATE_LABELS: Record<string, string> = {
  disconnected: "Disconnected",
  connected_no_data: "Agent up — no samples",
  calibration_required: "Calibration required",
  live: "Live",
  stale: "Stale data",
  demo: "DEMO mode",
}

const CAL_STEPS = ["empty", "enter", "sit", "walk", "breathing"] as const

function ConnectionPill({ state }: { state: WifiSenseLiveState["connectionState"] }) {
  const live = state === "live"
  const demo = state === "demo"
  const bad = state === "disconnected" || state === "stale"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        demo && "bg-amber-500/15 text-amber-800 dark:text-amber-200",
        live && !demo && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
        bad && "bg-red-500/10 text-red-800 dark:text-red-200",
        !live && !demo && !bad && "bg-black/6 text-black/55 dark:bg-white/8 dark:text-white/55",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          live && "bg-emerald-500 animate-pulse",
          demo && "bg-amber-500",
          bad && "bg-red-500",
          !live && !demo && !bad && "bg-black/30 dark:bg-white/40",
        )}
      />
      {STATE_LABELS[state] ?? state}
    </span>
  )
}

export function WifiSensePanel({ agentUrl, token, state, onRefreshStatus }: Props) {
  const layout = usePanelLayout()
  const desktop = layout === "desktop"
  const sample = state.latestSample
  const status = state.status
  const motion = sample?.motion_detected ?? false
  const intensity = sample?.intensity ?? 0
  const resp = sample?.respiration
  const [actionBusy, setActionBusy] = useState(false)
  const [actionNote, setActionNote] = useState<string | null>(null)
  const activeStep = status?.calibration_step

  const runAction = async (label: string, path: string, body?: unknown) => {
    if (!agentUrl || actionBusy) return
    setActionBusy(true)
    setActionNote(null)
    try {
      const res = await wifiSensePost(agentUrl, path, token, body)
      if (!res.ok) {
        const detail =
          typeof res.body === "object" && res.body && "detail" in (res.body as object)
            ? String((res.body as { detail: unknown }).detail)
            : res.error
        setActionNote(`${label} failed: ${detail ?? res.status}`)
        return
      }
      setActionNote(`${label} OK`)
      onRefreshStatus()
    } catch (err) {
      setActionNote(`${label} failed: ${err instanceof Error ? err.message : "error"}`)
    } finally {
      setActionBusy(false)
    }
  }

  const post = (label: string, path: string, body?: unknown) => {
    void runAction(label, path, body)
  }

  return (
    <div className={cn("flex min-h-0 flex-col", desktop ? "gap-6" : "gap-3")}>
      {state.connectionState === "demo" ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-100">
          DEMO — simulated metrics only (WIFI_SENSE_DEMO on agent)
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-black/45 dark:text-white/45" strokeWidth={1.75} />
            <h2 className="text-[15px] font-semibold tracking-tight">Wi‑Fi Sense</h2>
          </div>
          <p className="mt-1 max-w-md text-[12px] leading-relaxed text-black/45 dark:text-white/45">
            Managed RSSI on Mint — coarse motion only. CSI unsupported on Intel 8265. Not a medical
            device.
          </p>
        </div>
        <PanelHeaderActions>
          <ConnectionPill state={state.connectionState} />
          <button
            type="button"
            aria-label="Refresh status"
            className="rounded-lg p-1.5 text-black/45 hover:bg-black/6 dark:text-white/45 dark:hover:bg-white/8"
            onClick={() => onRefreshStatus()}
          >
            <RefreshCw className="size-4" strokeWidth={1.75} />
          </button>
        </PanelHeaderActions>
      </div>

      {state.connectionState === "disconnected" ? (
        <div className="rounded-2xl border border-black/8 bg-black/[0.03] px-4 py-6 text-center dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-[13px] text-black/50 dark:text-white/50">Cannot reach the Wi‑Fi Sense agent.</p>
          {state.lastError ? (
            <p className="mt-2 text-[11px] text-black/35 dark:text-white/35">{state.lastError}</p>
          ) : null}
          <p className="mt-3 text-[11px] text-black/35 dark:text-white/35">
            Set agent URL in Settings (defaults to Mint Tailscale IP :8765).
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Motion" value={motion ? "Detected" : "Still"} sub={`${Math.round(intensity * 100)}% intensity`} />
            <Stat
              label="Signal"
              value={sample ? `${sample.metric_dbm.toFixed(1)} dBm` : "—"}
              sub={sample?.source ?? "waiting"}
            />
            <Stat
              label="Confidence"
              value={sample ? `${Math.round(sample.confidence * 100)}%` : "—"}
              sub="motion estimate"
            />
            <Stat label="Mode" value="RSSI" sub={status?.csi === "unsupported" ? "CSI unsupported" : status?.measurement_mode ?? "—"} />
          </div>

          {resp?.trustworthy && resp.breaths_per_min != null ? (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/8 px-3 py-2 text-[12px] text-violet-900 dark:text-violet-100">
              Experimental respiration: ~{resp.breaths_per_min.toFixed(0)} BPM ({Math.round(resp.confidence * 100)}% confidence)
            </div>
          ) : null}

          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
              <Waves className="size-3.5" strokeWidth={2} />
              Link metric
            </div>
            {state.signalHistory.length > 1 ? (
              <MetricChart
                points={state.signalHistory}
                compact={!desktop}
                accent="#6366f1"
                gradientId="wifi-sense-signal"
                formatValue={(v) => `${v.toFixed(1)} dBm`}
                yAxis="auto"
              />
            ) : (
              <p className="text-[12px] text-black/40 dark:text-white/40">
                {state.connectionState === "connected_no_data"
                  ? "Waiting for first sample…"
                  : "Collecting signal history…"}
              </p>
            )}
          </div>

          {desktop ? (
            <>
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                  <Activity className="size-3.5" strokeWidth={2} />
                  Motion events
                </div>
                <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] tabular-nums text-black/50 dark:text-white/50">
                  {state.motionEvents.length === 0 ? (
                    <li className="text-black/35 dark:text-white/35">No events yet</li>
                  ) : (
                    state.motionEvents
                      .slice()
                      .reverse()
                      .slice(0, 20)
                      .map((ev) => (
                        <li key={`${ev.ts}-${ev.kind}`}>
                          {new Date(ev.ts * 1000).toLocaleTimeString()} · {ev.kind} · {Math.round(ev.intensity * 100)}%
                        </li>
                      ))
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-black/8 p-3 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                  Calibration
                </p>
                <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                  Steps: empty room → enter → sit → walk → breathing (breathing records only).
                </p>
                {activeStep ? (
                  <p className="mt-2 text-[11px] text-indigo-700 dark:text-indigo-200">
                    Active step: <span className="font-medium capitalize">{activeStep}</span>
                    {actionBusy ? " · sending…" : null}
                  </p>
                ) : null}
                {actionNote ? (
                  <p className="mt-2 text-[11px] text-black/50 dark:text-white/50">{actionNote}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    className="rounded-lg bg-black/8 px-3 py-1.5 text-[12px] font-medium disabled:opacity-50 dark:bg-white/10"
                    onClick={() => post("Start", "/api/calibration/start")}
                  >
                    Start
                  </button>
                  {CAL_STEPS.map((step) => (
                    <button
                      key={step}
                      type="button"
                      disabled={actionBusy}
                      className={cn(
                        "rounded-lg px-2.5 py-1.5 text-[11px] capitalize disabled:opacity-50",
                        activeStep === step
                          ? "bg-indigo-500/20 font-medium text-indigo-900 dark:text-indigo-100"
                          : "bg-black/5 dark:bg-white/6",
                      )}
                      onClick={() => post(step, "/api/calibration/step", { step })}
                    >
                      {step}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={actionBusy}
                    className="rounded-lg bg-indigo-500/15 px-3 py-1.5 text-[12px] font-medium text-indigo-900 disabled:opacity-50 dark:text-indigo-100"
                    onClick={() => post("Finish", "/api/calibration/finish")}
                  >
                    Finish
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-black/8 p-3 dark:border-white/10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                  Recording
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={actionBusy}
                    className="rounded-lg bg-black/8 px-3 py-1.5 text-[12px] disabled:opacity-50 dark:bg-white/10"
                    onClick={() => post("Recording start", "/api/recording/start")}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    className="rounded-lg bg-black/8 px-3 py-1.5 text-[12px] disabled:opacity-50 dark:bg-white/10"
                    onClick={() => post("Recording stop", "/api/recording/stop")}
                  >
                    Stop
                  </button>
                </div>
              </div>

              <DiagnosticsCard status={status} agentUrl={agentUrl} pollErrors={status?.poll_errors} />
            </>
          ) : null}
        </>
      )}
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-black/[0.04] px-2.5 py-2 dark:bg-white/[0.06]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">{label}</p>
      <p className="text-[14px] font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-[10px] text-black/35 dark:text-white/35">{sub}</p> : null}
    </div>
  )
}

function DiagnosticsCard({
  status,
  agentUrl,
  pollErrors,
}: {
  status: WifiSenseLiveState["status"]
  agentUrl: string
  pollErrors?: number
}) {
  const hw = status?.hardware as Record<string, string> | undefined
  return (
    <div className="rounded-2xl border border-black/8 p-3 text-[11px] text-black/45 dark:border-white/10 dark:text-white/45">
      <p className="font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">Diagnostics</p>
      <ul className="mt-2 space-y-1 font-mono text-[10px] leading-relaxed">
        <li>Agent: {agentUrl || "—"}</li>
        <li>Poll errors: {pollErrors ?? 0}</li>
        <li>{hw?.chipset_note ?? "Intel AC 8265 — CSI unsupported"}</li>
        {hw?.driver ? <li>Driver: {hw.driver}</li> : null}
      </ul>
    </div>
  )
}
