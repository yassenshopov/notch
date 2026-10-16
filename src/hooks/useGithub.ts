import { useCallback, useEffect, useState } from "react"
import { useSettings } from "../config/settings-store"
import { fetchGitHubStatus, type GitHubStatus } from "../lib/github"

const idle: GitHubStatus = {
  configured: false,
  connected: false,
  login: null,
  avatarUrl: null,
  notifications: [],
  pullRequests: [],
  contributions: null,
  todayBreakdown: null,
}

export function useGithub(active = true) {
  const settings = useSettings()
  const [status, setStatus] = useState<GitHubStatus>(idle)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const data = await fetchGitHubStatus({ force })
      setStatus(data)
    } catch {
      setStatus({ ...idle, error: "github_error" })
    } finally {
      setLoading(false)
      if (force) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (!active) return
    setLoading(true)
    void refresh()
    const id = window.setInterval(() => void refresh(), settings.github.pollIntervalMs)
    return () => window.clearInterval(id)
  }, [active, refresh, settings.github.pollIntervalMs])

  return { status, loading, refreshing, refresh: () => void refresh(true) }
}
