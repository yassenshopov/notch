import { useCallback, useEffect, useState } from "react"
import { fetchGitHubInsights, type GitHubActivityInsights } from "../lib/github"

const year = new Date().getFullYear()
const idle: GitHubActivityInsights = {
  configured: false,
  connected: false,
  years: [],
  chartYear: year,
  repoTotals: [],
  repoCatalog: [],
  repoSeries: [],
  monthLabels: [],
  reposCreated: {
    year,
    count: null,
    priorYear: year - 1,
    priorCount: null,
    delta: null,
  },
}

export function useGitHubInsights(active: boolean, chartYear?: number) {
  const [insights, setInsights] = useState<GitHubActivityInsights>(idle)
  const [loading, setLoading] = useState(() => active)

  const refresh = useCallback(
    async (force = false) => {
      if (!active) return
      setLoading(true)
      try {
        const data = await fetchGitHubInsights({
          force,
          year: chartYear,
        })
        setInsights(data)
      } catch {
        setInsights({ ...idle, error: "github_insights_error" })
      } finally {
        setLoading(false)
      }
    },
    [active, chartYear],
  )

  useEffect(() => {
    if (!active) return
    void refresh()
  }, [active, refresh])

  return { insights, loading, refresh: () => void refresh(true) }
}
