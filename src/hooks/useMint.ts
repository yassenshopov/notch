import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchMintStatus, type MintServerStatus } from "../lib/mint"

const idle: MintServerStatus = {
  configured: true,
  connected: false,
  host: "mint",
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
}

export function useMint(active = true) {
  const settings = useSettings()
  const [status, setStatus] = useState<MintServerStatus>(idle)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(
    async (force = false) => {
      if (force) setRefreshing(true)
      try {
        const data = await fetchMintStatus({
          force,
          host: settings.mint.sshHost,
        })
        setStatus(data)
      } catch {
        setStatus({ ...idle, host: settings.mint.sshHost, error: "mint_error" })
      } finally {
        setLoading(false)
        if (force) setRefreshing(false)
      }
    },
    [settings.mint.sshHost],
  )

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.mint.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.mint.pollIntervalMs])

  return { status, loading, refreshing, refresh: () => void refresh(true) }
}
