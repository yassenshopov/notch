import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchMintStatus } from "../lib/mint"
import {
  agentUrlFromMintHosts,
  fetchWifiSenseHealth,
  fetchWifiSenseStatus,
  type WifiSenseConnectionState,
  type WifiSenseLiveState,
  type WifiSenseMotionEvent,
  type WifiSenseSample,
  type WifiSenseStatus,
  wsUrlFromHttpBase,
} from "../lib/wifi-sense"

const HISTORY_MAX = 120
const STALE_MS = 5000

function isoFromTs(ts: number) {
  return new Date(ts * 1000).toISOString()
}

function emptyLiveState(): WifiSenseLiveState {
  return {
    connectionState: "disconnected",
    status: null,
    latestSample: null,
    signalHistory: [],
    motionEvents: [],
    lastError: null,
  }
}

export function useWifiSense(
  active: boolean,
  mintHosts?: { tailscaleIp?: string | null; lanIp?: string | null },
) {
  const settings = useSettings()
  const cfg = settings.wifiSense
  const tailscaleIp = mintHosts?.tailscaleIp
  const lanIpProp = mintHosts?.lanIp
  const [discoveredHosts, setDiscoveredHosts] = useState<{ lanIp: string | null; tailscaleIp: string | null }>({
    lanIp: null,
    tailscaleIp: null,
  })

  useEffect(() => {
    if (!active || !(cfg?.enabled ?? true)) return
    if (cfg?.agentUrl?.trim()) return
    if (tailscaleIp?.trim() || lanIpProp?.trim()) return
    let cancelled = false
    void fetchMintStatus({ force: true }).then((status) => {
      if (cancelled) return
      const lan = status.lanIp?.trim() || null
      const ts = status.tailscaleIp?.trim() || null
      if (lan || ts) {
        setDiscoveredHosts({ lanIp: lan, tailscaleIp: ts })
        return
      }
      setState((s) => ({
        ...s,
        lastError: status.connected
          ? "Mint reachable but no LAN/Tailscale IP in stats — set agent URL in Settings."
          : "Could not reach Mint over SSH to resolve agent URL.",
      }))
    })
    return () => {
      cancelled = true
    }
  }, [active, cfg?.agentUrl, cfg?.enabled, tailscaleIp, lanIpProp])

  const agentUrl = useMemo(() => {
    return agentUrlFromMintHosts({
      manualUrl: cfg?.agentUrl,
      port: cfg?.port ?? 8765,
      tailscaleIp: tailscaleIp?.trim() || discoveredHosts.tailscaleIp,
      lanIp: lanIpProp?.trim() || discoveredHosts.lanIp,
    })
  }, [cfg?.agentUrl, cfg?.port, tailscaleIp, lanIpProp, discoveredHosts])

  const token = cfg?.token?.trim() || undefined
  const [state, setState] = useState<WifiSenseLiveState>(() => emptyLiveState())
  const wsRef = useRef<WebSocket | null>(null)
  const backoffRef = useRef(1000)
  const reconnectTimer = useRef<number | null>(null)

  const pushSample = useCallback((sample: WifiSenseSample) => {
    setState((prev) => {
      const point = { time: isoFromTs(sample.ts), value: sample.metric_dbm }
      const signalHistory = [...prev.signalHistory, point].slice(-HISTORY_MAX)
      let connectionState: WifiSenseConnectionState = prev.status?.demo_mode
        ? "demo"
        : prev.status?.calibration_required
          ? "calibration_required"
          : "live"
      return {
        ...prev,
        connectionState,
        latestSample: sample,
        signalHistory,
        lastError: null,
      }
    })
  }, [])

  const refreshStatus = useCallback(async () => {
    if (!agentUrl) {
      setState((s) => ({
        ...s,
        connectionState: "disconnected",
        lastError: tailscaleIp?.trim() || discoveredHosts.lanIp || discoveredHosts.tailscaleIp
          ? "No agent URL configured"
          : "Looking up Mint agent address…",
      }))
      return
    }
    try {
      const status = await fetchWifiSenseStatus(agentUrl, token)
      setState((prev) => {
        let connectionState = status.connection_state
        const lastTs = prev.latestSample?.ts ?? status.last_sample_ts
        if (
          connectionState === "live" &&
          lastTs != null &&
          Date.now() / 1000 - lastTs > STALE_MS / 1000
        ) {
          connectionState = "stale"
        }
        return { ...prev, status, connectionState, lastError: null }
      })
    } catch (err) {
      const ok = await fetchWifiSenseHealth(agentUrl)
      setState((prev) => ({
        ...prev,
        connectionState: ok ? "connected_no_data" : "disconnected",
        lastError: err instanceof Error ? err.message : "wifi_sense_error",
      }))
    }
  }, [agentUrl, token, tailscaleIp, discoveredHosts])

  useEffect(() => {
    if (!active || !cfg?.enabled) {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    void refreshStatus()
    const statusId = window.setInterval(() => void refreshStatus(), cfg.statusPollMs ?? 15_000)

    const connect = () => {
      if (!agentUrl) return
      let wsUrl = wsUrlFromHttpBase(agentUrl)
      if (token) {
        wsUrl += `${wsUrl.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`
      }
      const socket = new WebSocket(wsUrl)
      wsRef.current = socket
      socket.onopen = () => {
        backoffRef.current = 1000
        void refreshStatus()
      }
      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as { type?: string } & WifiSenseSample &
            WifiSenseMotionEvent
          if (msg.type === "sample") {
            pushSample(msg as WifiSenseSample)
          } else if (msg.type === "motion") {
            setState((prev) => ({
              ...prev,
              motionEvents: [
                ...prev.motionEvents,
                {
                  ts: msg.ts,
                  kind: msg.kind,
                  intensity: msg.intensity,
                  confidence: msg.confidence,
                },
              ].slice(-80),
            }))
          }
        } catch {
          /* ignore malformed */
        }
      }
      socket.onclose = () => {
        wsRef.current = null
        setState((prev) =>
          prev.latestSample ? { ...prev, connectionState: "stale" } : { ...prev, connectionState: "disconnected" },
        )
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 1.6, 30_000)
        reconnectTimer.current = window.setTimeout(connect, delay)
      }
      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      window.clearInterval(statusId)
      if (reconnectTimer.current != null) window.clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [active, agentUrl, cfg?.enabled, cfg?.statusPollMs, pushSample, refreshStatus, token])

  return {
    agentUrl,
    state,
    refreshStatus,
    enabled: cfg?.enabled ?? false,
  }
}

export type { WifiSenseStatus }
