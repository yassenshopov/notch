import { useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { RotateCcw, X } from "lucide-react"
import { updateSettings, useSettings } from "../config/settings-store"
import type { GitHubRepoTotal } from "../lib/github"
import { shortRepoName } from "../lib/github"
import {
  GITHUB_REPO_DEFAULT_PALETTE,
  isValidRepoColor,
  resolveRepoColor,
} from "../lib/github-repo-colors"
import { notchUi } from "../lib/island-motion"
import { cn } from "../lib/utils"

type Props = {
  open: boolean
  onClose: () => void
  repoTotals: GitHubRepoTotal[]
}

export function GitHubRepoColorsModal({ open, onClose, repoTotals }: Props) {
  const settings = useSettings()
  const overrides = settings.github.repoColors ?? {}

  const rows = useMemo(() => {
    const map = new Map<string, GitHubRepoTotal>()
    for (const row of repoTotals) map.set(row.repo, row)
    for (const repo of Object.keys(overrides)) {
      if (!map.has(repo)) {
        map.set(repo, { repo, url: `https://github.com/${repo}`, count: 0 })
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo))
  }, [repoTotals, overrides])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, onClose])

  const setColor = (repo: string, color: string | null) => {
    const next = { ...overrides }
    if (!color || !isValidRepoColor(color)) {
      delete next[repo]
    } else {
      next[repo] = color
    }
    void updateSettings({ github: { ...settings.github, repoColors: next } })
  }

  const resetAll = () => {
    void updateSettings({ github: { ...settings.github, repoColors: {} } })
  }

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[210] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm dark:bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={notchUi}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="flex max-h-[min(28rem,85vh)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="github-repo-colors-title"
          >
            <div className="shrink-0 border-b border-black/8 px-4 py-3 dark:border-white/10">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2
                    id="github-repo-colors-title"
                    className="text-[15px] font-semibold tracking-tight text-black/90 dark:text-white/92"
                  >
                    Repository colors
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-black/45 dark:text-white/45">
                    Used in day breakdown donuts and repo activity charts.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="shrink-0 rounded-full p-1.5 text-black/45 hover:bg-black/5 dark:text-white/45 dark:hover:bg-white/10"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {GITHUB_REPO_DEFAULT_PALETTE.map((c) => (
                  <span key={c} className="size-3 rounded-full" style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <ul className="notch-scroll min-h-0 flex-1 divide-y divide-black/6 overflow-y-auto px-2 py-1 dark:divide-white/8">
              {rows.length === 0 ? (
                <li className="px-2 py-6 text-center text-[12px] text-black/45 dark:text-white/45">
                  No repositories loaded yet.
                </li>
              ) : (
                rows.map((row, index) => {
                  const color = resolveRepoColor(row.repo, index, overrides)
                  const customized = Boolean(overrides[row.repo])
                  return (
                    <li key={row.repo} className="flex items-center gap-2 px-2 py-2">
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium">{shortRepoName(row.repo)}</p>
                        <p className="truncate text-[10px] text-black/40 dark:text-white/40">{row.repo}</p>
                      </div>
                      <input
                        type="color"
                        value={customized ? overrides[row.repo]! : color}
                        onChange={(e) => setColor(row.repo, e.target.value)}
                        className="size-8 shrink-0 cursor-pointer rounded-lg border border-black/10 bg-transparent p-0.5 dark:border-white/15"
                        aria-label={`Color for ${row.repo}`}
                      />
                      <button
                        type="button"
                        disabled={!customized}
                        onClick={() => setColor(row.repo, null)}
                        className={cn(
                          "shrink-0 rounded-full p-1.5 text-black/40 hover:bg-black/5 disabled:opacity-30 dark:text-white/40 dark:hover:bg-white/10",
                        )}
                        aria-label={`Reset color for ${row.repo}`}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
            <div className="shrink-0 border-t border-black/8 px-4 py-3 dark:border-white/10">
              <button
                type="button"
                onClick={resetAll}
                disabled={Object.keys(overrides).length === 0}
                className="text-[11px] font-medium text-black/50 hover:text-black/75 disabled:opacity-40 dark:text-white/50 dark:hover:text-white/80"
              >
                Reset all custom colors
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}