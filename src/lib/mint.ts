export type MintServerStatus = {
  configured: boolean
  connected: boolean
  host: string
  hostname: string | null
  uptimeSec: number | null
  load1: number | null
  load5: number | null
  load15: number | null
  memTotalMb: number | null
  memUsedMb: number | null
  memUsedPct: number | null
  diskTotalGb: number | null
  diskUsedGb: number | null
  diskUsedPct: number | null
  tailscaleIp: string | null
  mirrorRepoCount: number | null
  mirrorLastLog: string | null
  error?: string | null
}

export async function fetchMintStatus(options?: {
  force?: boolean
  host?: string
}): Promise<MintServerStatus> {
  const bridge = window.notch?.mint
  if (!bridge) {
    return {
      configured: true,
      connected: false,
      host: options?.host ?? "mint",
      hostname: null,
      uptimeSec: null,
      load1: null,
      load5: null,
      load15: null,
      memTotalMb: null,
      memUsedMb: null,
      memUsedPct: null,
      diskTotalGb: null,
      diskUsedGb: null,
      diskUsedPct: null,
      tailscaleIp: null,
      mirrorRepoCount: null,
      mirrorLastLog: null,
      error: "notch_bridge_unavailable",
    }
  }
  return bridge.status(options)
}

export function formatUptime(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—"
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
