import { useCallback, useEffect, useState } from "react"
import { fetchGitHubWeeklyRepoStack, type GitHubRepoWeeklyStack } from "../lib/github"

const idle: GitHubRepoWeeklyStack = {
  configured: false,
  connected: false,
  topRepos: [],
  repoUrls: {},
  weeks: [],
  days: [],
}

export function useGitHubWeeklyRepoStack(active: boolean) {
  const [data, setData] = useState<GitHubRepoWeeklyStack>(idle)
  const [loading, setLoading] = useState(() => active)

  const refresh = useCallback(
    async (force = false) => {
      if (!active) return
      setLoading(true)
      try {
        setData(await fetchGitHubWeeklyRepoStack({ force }))
      } catch {
        setData({ ...idle, error: "github_weekly_stack_error" })
      } finally {
        setLoading(false)
      }
    },
    [active],
  )

  useEffect(() => {
    if (!active) return
    void refresh()
  }, [active, refresh])

  return { weeklyStack: data, loading, refresh: () => void refresh(true) }
}