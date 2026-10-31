export type WifiSenseConnectionState =
  | "disconnected"
  | "connected_no_data"
  | "calibration_required"
  | "live"
  | "stale"
  | "demo"

export type WifiSenseRespiration = {
  supported: boolean
  trustworthy: boolean
  breaths_per_min: number | null
  confidence: number
  reason: string
  waveform: number[]
}

export type WifiSenseSample = {
  ts: number
  metric_dbm: number
  signal_dbm: number | null
  beacon_signal_avg_dbm: number | null
  baseline_dbm: number | null
  motion_detected: boolean
  intensity: number
  confidence: number
  variance: number
  delta_dbm: number
  source: string
  bssid: string | null
  respiration: WifiSenseRespiration
}

export type WifiSenseMotionEvent = {
  ts: number
  kind: string
  intensity: number
  confidence: number
}

export type WifiSenseStatus = {
  uptime_sec: number
  connection_state: WifiSenseConnectionState
  calibration_required: boolean
  calibration: Record<string, unknown>
  calibration_step: string | null
  recording: boolean
  poll_hz: number
  poll_errors: number
  last_sample_ts: number | null
  demo_mode: boolean
  hardware: Record<string, unknown>
  measurement_mode: string
  csi: string
}

export type WifiSenseLiveState = {
  connectionState: WifiSenseConnectionState
  status: WifiSenseStatus | null
  latestSample: WifiSenseSample | null
  signalHistory: { time: string; value: number }[]
  motionEvents: WifiSenseMotionEvent[]
  lastError: string | null
}

export function defaultAgentUrlFromTailscale(tailscaleIp: string | null | undefined, port = 8765): string {
  if (!tailscaleIp?.trim()) return ""
  return `http://${tailscaleIp.trim()}:${port}`
}

export function agentUrlFromMintHosts(args: {
  manualUrl?: string
  port?: number
  tailscaleIp?: string | null
  lanIp?: string | null
}): string {
  const manual = args.manualUrl?.trim()
  if (manual) return manual
  const port = args.port ?? 8765
  const lan = args.lanIp?.trim()
  if (lan) return `http://${lan}:${port}`
  return defaultAgentUrlFromTailscale(args.tailscaleIp, port)
}

export function wsUrlFromHttpBase(httpBase: string): string {
  const trimmed = httpBase.replace(/\/$/, "")
  if (trimmed.startsWith("https://")) {
    return `wss://${trimmed.slice("https://".length)}/ws/live`
  }
  if (trimmed.startsWith("http://")) {
    return `ws://${trimmed.slice("http://".length)}/ws/live`
  }
  return `ws://${trimmed}/ws/live`
}

export function authHeaders(token: string | undefined): HeadersInit {
  if (!token?.trim()) return {}
  return { Authorization: `Bearer ${token.trim()}` }
}

export async function fetchWifiSenseStatus(baseUrl: string, token?: string): Promise<WifiSenseStatus> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/status`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`status ${res.status}`)
  return (await res.json()) as WifiSenseStatus
}

export async function fetchWifiSenseHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return false
    const body = (await res.json()) as { ok?: boolean }
    return body.ok === true
  } catch {
    return false
  }
}

export type WifiSensePostResult = {
  ok: boolean
  status: number
  body?: unknown
  error?: string | null
}

export async function wifiSensePost(
  baseUrl: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<WifiSensePostResult> {
  const bridge = window.notch?.wifiSense?.post
  if (bridge) {
    return bridge({ agentUrl: baseUrl, path, token, body })
  }
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders(token) },
      body: JSON.stringify(body ?? {}),
    })
    let parsed: unknown = null
    const text = await res.text()
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = { raw: text }
      }
    }
    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
      error: res.ok ? null : String((parsed as { detail?: string })?.detail ?? text),
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "wifi_sense_post_failed",
    }
  }
}
