import { useMemo } from "react"
import type { GitHubTodayRepoContribution } from "../lib/github"
import { shortRepoName, sumGitHubRepoCounts } from "../lib/github"
import { useSettings } from "../config/settings-store"
import {
  GITHUB_REPO_OTHER_COLOR,
  resolveRepoColor,
} from "../lib/github-repo-colors"
import { cn } from "../lib/utils"

type Props = {
  total: number
  repos: GitHubTodayRepoContribution[]
  className?: string
  size?: number
}

type Slice = { repo: string; label: string; count: number; color: string }

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  }
}

/** Full ring — a single 360° arc collapses to zero length in SVG. */
function describeFullDonutRing(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
) {
  const outerTop = polarToCartesian(cx, cy, outerRadius, 0)
  const outerBottom = polarToCartesian(cx, cy, outerRadius, 180)
  const innerTop = polarToCartesian(cx, cy, innerRadius, 0)
  const innerBottom = polarToCartesian(cx, cy, innerRadius, 180)
  return [
    `M ${outerTop.x} ${outerTop.y}`,
    `A ${outerRadius} ${outerRadius} 0 1 1 ${outerBottom.x} ${outerBottom.y}`,
    `A ${outerRadius} ${outerRadius} 0 1 1 ${outerTop.x} ${outerTop.y}`,
    `L ${innerTop.x} ${innerTop.y}`,
    `A ${innerRadius} ${innerRadius} 0 1 0 ${innerBottom.x} ${innerBottom.y}`,
    `A ${innerRadius} ${innerRadius} 0 1 0 ${innerTop.x} ${innerTop.y}`,
    "Z",
  ].join(" ")
}

/** Filled donut wedge (no stroke overlap). */
function describeDonutWedge(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(cx, cy, outerRadius, startAngle)
  const outerEnd = polarToCartesian(cx, cy, outerRadius, endAngle)
  const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle)
  const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle)
  const largeArc = endAngle - startAngle > 180 ? "1" : "0"
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ")
}

function buildDonutWedges(slices: Slice[], total: number, size: number) {
  const cx = size / 2
  const cy = size / 2
  const outerRadius = size / 2 - 2
  const innerRadius = outerRadius * 0.68
  const gapDeg = slices.length > 1 ? 2.25 : 0
  const totalGap = gapDeg * slices.length
  const usable = 360 - totalGap
  let angle = 0

  const wedges: Array<{ key: string; d: string; color: string }> = []

  for (let index = 0; index < slices.length; index++) {
    const slice = slices[index]!
    const sweep = total > 0 ? (slice.count / total) * usable : 0
    if (sweep <= 0.08) continue

    const pad = gapDeg > 0 ? gapDeg / 2 : 0
    const start = angle + pad
    const end = angle + sweep - pad
    angle += sweep + gapDeg

    if (end <= start) continue

    const span = end - start
    const d =
      slices.length === 1 || span >= 359.5
        ? describeFullDonutRing(cx, cy, innerRadius, outerRadius)
        : describeDonutWedge(cx, cy, innerRadius, outerRadius, start, end)

    wedges.push({
      key: `${slice.repo}-${index}`,
      d,
      color: slice.color,
    })
  }

  return wedges
}

export function GitHubDayRepoPieChart({ total, repos, className, size = 64 }: Props) {
  const settings = useSettings()
  const repoColors = settings.github.repoColors

  const { wedges, legend } = useMemo(() => {
    const positive = repos.filter((r) => r.count > 0)
    const topRepos = positive.filter((r) => r.repo !== "__other__")
    const otherRow = positive.find((r) => r.repo === "__other__")
    const top = topRepos.slice(0, 4)
    const foldedRepoOther =
      (otherRow?.count ?? 0) +
      topRepos.slice(4).reduce((sum, row) => sum + row.count, 0)
    const commitTotal = sumGitHubRepoCounts(positive)
    const nonCommit = total > commitTotal && commitTotal > 0 ? total - commitTotal : 0
    const slices: Slice[] = top.map((row, i) => ({
      repo: row.repo,
      label: shortRepoName(row.repo),
      count: row.count,
      color: resolveRepoColor(row.repo, i, repoColors),
    }))
    if (foldedRepoOther > 0) {
      slices.push({
        repo: "__other__",
        label: "Other repos",
        count: foldedRepoOther,
        color: GITHUB_REPO_OTHER_COLOR,
      })
    }
    if (nonCommit > 0) {
      slices.push({
        repo: "__activity__",
        label: "PRs & reviews",
        count: nonCommit,
        color: GITHUB_REPO_OTHER_COLOR,
      })
    }
    const wedgeTotal = slices.reduce((sum, s) => sum + s.count, 0)
    if (slices.length === 0 || wedgeTotal <= 0) {
      return { wedges: [] as ReturnType<typeof buildDonutWedges>, legend: [] as Slice[] }
    }
    return {
      wedges: buildDonutWedges(slices, wedgeTotal, size),
      legend: slices,
    }
  }, [repos, total, size, repoColors])

  if (wedges.length === 0 || legend.length === 0) return null

  return (
    <span className={cn("flex items-start gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="mt-0.5 shrink-0"
        aria-hidden
      >
        {wedges.map((seg) => (
          <path key={seg.key} d={seg.d} fill={seg.color} />
        ))}
      </svg>
      <dl className="min-w-0 flex-1 space-y-0.5">
        {legend.map((row) => (
          <div key={row.label} className="flex items-center gap-1.5 text-[10px] leading-tight">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden
            />
            <span className="min-w-0 truncate text-black/65 dark:text-white/70">{row.label}</span>
            <span className="ml-auto shrink-0 tabular-nums font-semibold text-black/45 dark:text-white/45">
              {row.count}
            </span>
          </div>
        ))}
      </dl>
    </span>
  )
}