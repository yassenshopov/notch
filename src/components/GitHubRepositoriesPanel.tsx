import { useMemo, useState } from "react"
import { GitFork, Lock, Palette, Star } from "lucide-react"
import type { GitHubRepoCatalogItem, GitHubRepoWeeklyStack } from "../lib/github"
import { formatGitHubRepoAge } from "../lib/github"
import { buildRepoSparklinesFromWeeks } from "../lib/github-repo-sparkline"
import { useSettings } from "../config/settings-store"
import { resolveRepoColor } from "../lib/github-repo-colors"
import { resolveGitHubLanguageColor } from "../lib/github-language-colors"
import { cn } from "../lib/utils"
import { GitHubRepoColorsModal } from "./GitHubRepoColorsModal"
import { GitHubRepoDetailModal } from "./GitHubRepoDetailModal"
import { RepoCommitSparkline } from "./RepoCommitSparkline"

type Props = {
  repoCatalog: GitHubRepoCatalogItem[]
  weeklyStack?: GitHubRepoWeeklyStack | null
  chartYear?: number
  viewerLogin?: string | null
  viewerAvatarUrl?: string | null
  loading?: boolean
  weeklyLoading?: boolean
  className?: string
}

function splitRepoPath(full: string) {
  const i = full.indexOf("/")
  if (i <= 0) return { owner: full, name: full }
  return { owner: full.slice(0, i), name: full.slice(i + 1) }
}

function resolveRepoAvatar(
  row: GitHubRepoCatalogItem,
  viewerLogin: string | null | undefined,
  viewerAvatarUrl: string | null | undefined,
) {
  const profile = row.profile
  const owner = profile?.ownerLogin ?? splitRepoPath(row.repo).owner
  if (viewerLogin && owner.toLowerCase() === viewerLogin.toLowerCase() && viewerAvatarUrl) {
    return viewerAvatarUrl
  }
  return profile?.ownerAvatarUrl ?? null
}

export function GitHubRepositoriesPanel({
  repoCatalog,
  weeklyStack,
  chartYear,
  viewerLogin,
  viewerAvatarUrl,
  loading,
  weeklyLoading,
  className,
}: Props) {
  const [colorsOpen, setColorsOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<GitHubRepoCatalogItem | null>(null)
  const settings = useSettings()
  const overrides = settings.github.repoColors
  const year = chartYear ?? new Date().getFullYear()

  const sorted = useMemo(
    () => [...repoCatalog].sort((a, b) => b.count - a.count || a.repo.localeCompare(b.repo)),
    [repoCatalog],
  )

  const repoTotals = useMemo(
    () => sorted.map(({ repo, url, count }) => ({ repo, url, count })),
    [sorted],
  )

  const sparklines = useMemo(() => {
    if (!weeklyStack?.weeks?.length) return {} as Record<string, number[]>
    return buildRepoSparklinesFromWeeks(
      weeklyStack.weeks,
      sorted.map((r) => r.repo),
    )
  }, [weeklyStack?.weeks, sorted])

  const detailIndex = detailRow ? sorted.findIndex((r) => r.repo === detailRow.repo) : -1

  return (
    <section className={cn(className)} aria-labelledby="github-repos-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="github-repos-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40"
          >
            Repositories
          </h2>
          <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">
            Ranked by your {year} contribution activity · click a row for details
          </p>
        </div>
        <button
          type="button"
          onClick={() => setColorsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-medium text-black/55 hover:bg-black/[0.04] dark:border-white/12 dark:text-white/60 dark:hover:bg-white/[0.06]"
        >
          <Palette className="size-3.5" aria-hidden />
          Colors
        </button>
      </div>

      {loading ? (
        <p className="text-[12px] text-black/45 dark:text-white/45">Loading repositories…</p>
      ) : sorted.length === 0 ? (
        <p className="text-[12px] text-black/45 dark:text-white/45">No repository activity for this year.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sorted.map((row, index) => (
            <RepoRow
              key={row.repo}
              row={row}
              year={year}
              color={resolveRepoColor(row.repo, index, overrides)}
              sparkline={sparklines[row.repo]}
              sparklineLoading={weeklyLoading && !sparklines[row.repo]?.length}
              avatarUrl={resolveRepoAvatar(row, viewerLogin, viewerAvatarUrl)}
              onOpen={() => setDetailRow(row)}
            />
          ))}
        </ul>
      )}

      <GitHubRepoColorsModal open={colorsOpen} onClose={() => setColorsOpen(false)} repoTotals={repoTotals} />
      <GitHubRepoDetailModal
        row={detailRow}
        open={detailRow != null}
        onClose={() => setDetailRow(null)}
        year={year}
        color={
          detailRow && detailIndex >= 0
            ? resolveRepoColor(detailRow.repo, detailIndex, overrides)
            : "#6e7681"
        }
        avatarUrl={detailRow ? resolveRepoAvatar(detailRow, viewerLogin, viewerAvatarUrl) : null}
      />
    </section>
  )
}

function RepoRow({
  row,
  year,
  color,
  sparkline,
  sparklineLoading,
  avatarUrl,
  onOpen,
}: {
  row: GitHubRepoCatalogItem
  year: number
  color: string
  sparkline?: number[]
  sparklineLoading?: boolean
  avatarUrl: string | null
  onOpen: () => void
}) {
  const { owner, name } = splitRepoPath(row.repo)
  const profile = row.profile
  const pushed = formatGitHubRepoAge(profile?.pushedAt)
  const created = formatGitHubRepoAge(profile?.createdAt)
  const orgOwner = profile?.ownerType === "organization"
  const langColor = profile?.language ? resolveGitHubLanguageColor(profile.language) : null

  return (
    <li>
      <button
        type="button"
        data-notch-hit-target
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        className={cn(
          "group w-full rounded-xl px-4 py-4 text-left transition-colors",
          "cursor-pointer hover:bg-black/[0.035]",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/25",
          "dark:hover:bg-white/[0.045] dark:focus-visible:outline-white/30",
        )}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-black/45 group-hover:underline dark:text-white/45">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className={cn(
                      "size-4 shrink-0 border border-black/10 object-cover dark:border-white/12",
                      orgOwner ? "rounded-[4px]" : "rounded-full",
                    )}
                  />
                ) : (
                  <span
                    className={cn(
                      "size-4 shrink-0 border border-black/10 bg-black/[0.06] dark:border-white/12 dark:bg-white/[0.08]",
                      orgOwner ? "rounded-[4px]" : "rounded-full",
                    )}
                    aria-hidden
                  />
                )}
                <span>{owner}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-black/88 group-hover:underline dark:text-white/92">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                {name}
                {profile?.isPrivate ? (
                  <Lock className="size-3 shrink-0 text-black/40 dark:text-white/42" aria-label="Private repository" />
                ) : null}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-black/40 dark:text-white/42">
                {profile?.language && langColor ? (
                  <span className="inline-flex items-center gap-1 font-medium">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: langColor }}
                      aria-hidden
                    />
                    <span className="text-black/60 dark:text-white/65">{profile.language}</span>
                  </span>
                ) : null}
                {profile?.isFork ? <span>Fork</span> : null}
                {profile?.isArchived ? <span>Archived</span> : null}
              </div>
            </div>
            <p className="shrink-0 text-right text-[12px] font-semibold tabular-nums text-black/60 dark:text-white/60">
              <span className="text-[18px] leading-none">{row.count.toLocaleString()}</span>
              <span className="mt-0.5 block text-[10px] font-medium text-black/40 dark:text-white/40">
                contributions · {year}
              </span>
            </p>
          </div>

          {profile?.description ? (
            <p className="mt-2 text-[12px] leading-snug text-black/55 dark:text-white/58 line-clamp-2">
              {profile.description}
            </p>
          ) : null}

          <div className="mt-2 flex items-end justify-between gap-3">
            <dl className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-black/45 dark:text-white/48">
              {profile != null ? (
                <>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Star className="size-3 shrink-0 opacity-70" aria-hidden />
                    {profile.stars.toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <GitFork className="size-3 shrink-0 opacity-70" aria-hidden />
                    {profile.forks.toLocaleString()}
                  </span>
                  {profile.openIssues > 0 ? (
                    <span className="tabular-nums">{profile.openIssues} open issues</span>
                  ) : null}
                </>
              ) : null}
              {pushed ? <span>Updated {pushed}</span> : null}
              {created ? <span>Created {created}</span> : null}
            </dl>
            {sparklineLoading ? (
              <span className="shrink-0 pb-0.5 text-[9px] text-black/35 dark:text-white/35">Chart…</span>
            ) : sparkline?.length ? (
              <RepoCommitSparkline
                points={sparkline}
                color={color}
                width={120}
                height={26}
                className="shrink-0 pointer-events-none"
              />
            ) : null}
          </div>
        </div>
      </button>
    </li>
  )
}