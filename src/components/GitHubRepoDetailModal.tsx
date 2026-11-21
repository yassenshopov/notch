import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  CircleDot,
  GitPullRequest,
  Loader2,
  MinusCircle,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react"
import type {
  GitHubCheckRun,
  GitHubChecksAggregateState,
  GitHubCommitStatus,
  GitHubIssueDetail,
  GitHubPullRequestDetail,
  GitHubRepoCatalogItem,
  GitHubRepoIssue,
  GitHubRepoPullRequest,
  GitHubRepoProfile,
} from "../lib/github"
import {
  fetchGitHubIssueDetail,
  fetchGitHubPullRequestDetail,
  fetchGitHubRepoIssues,
  fetchGitHubRepoPullRequests,
  formatGitHubRepoAge,
  openGitHubUrl,
} from "../lib/github"
import { resolveGitHubLanguageColor } from "../lib/github-language-colors"
import { notchUi } from "../lib/island-motion"
import { cn } from "../lib/utils"

type TabId = "overview" | "pulls" | "issues"

type Props = {
  row: GitHubRepoCatalogItem | null
  open: boolean
  onClose: () => void
  year: number
  color: string
  avatarUrl: string | null
}

function splitRepoPath(full: string) {
  const i = full.indexOf("/")
  if (i <= 0) return { owner: full, name: full }
  return { owner: full.slice(0, i), name: full.slice(i + 1) }
}

function PrChecksCount({
  passed,
  total,
  state,
}: {
  passed: number
  total: number
  state?: GitHubChecksAggregateState | null
}) {
  return (
    <span
      className={cn(
        "shrink-0 tabular-nums text-[11px] font-semibold",
        state === "success" && passed >= total && "text-emerald-600 dark:text-emerald-400",
        state === "failure" && "text-red-600 dark:text-red-400",
        state === "pending" && "text-amber-600 dark:text-amber-400",
        state !== "success" && state !== "failure" && state !== "pending" && "text-black/45 dark:text-white/48",
      )}
      title="Checks passed / total"
    >
      {passed}/{total}
    </span>
  )
}

function UserAvatar({
  url,
  login,
  size = 4,
}: {
  url: string | null | undefined
  login?: string | null
  size?: 3 | 4 | 5 | 6
}) {
  const sizeClass = { 3: "size-3", 4: "size-4", 5: "size-5", 6: "size-6" }[size]
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={cn(
          "shrink-0 rounded-full border border-black/10 object-cover dark:border-white/12",
          sizeClass,
        )}
      />
    )
  }
  if (login) {
    return (
      <span
        className={cn(
          "shrink-0 rounded-full border border-black/10 bg-black/[0.06] dark:border-white/12 dark:bg-white/[0.08]",
          sizeClass,
        )}
        aria-hidden
      />
    )
  }
  return null
}

function OpenedByMeta({
  userLogin,
  userAvatarUrl,
  createdAt,
  suffix,
}: {
  userLogin: string
  userAvatarUrl: string | null
  createdAt?: string
  suffix?: ReactNode
}) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-black/45 dark:text-white/48">
      <UserAvatar url={userAvatarUrl} login={userLogin} size={4} />
      <span className="min-w-0">
        {userLogin ? (
          <>
            opened by{" "}
            <span className="font-medium text-black/55 dark:text-white/58">{userLogin}</span>
          </>
        ) : (
          "opened"
        )}{" "}
        {createdAt ? (formatGitHubRepoAge(createdAt) ?? "") : null}
        {suffix}
      </span>
    </p>
  )
}

function LabelDot({ name, color }: { name: string; color: string }) {
  const hex = color.startsWith("#") ? color : `#${color}`
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-black/60 dark:text-white/65">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: hex }} aria-hidden />
      <span>{name}</span>
    </span>
  )
}

function checkRunIcon(run: GitHubCheckRun) {
  if (run.status !== "completed") {
    return <Loader2 className="size-4 shrink-0 animate-spin text-amber-500" aria-hidden />
  }
  if (run.conclusion === "success" || run.conclusion === "skipped") {
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
  }
  if (run.conclusion === "neutral") {
    return <MinusCircle className="size-4 shrink-0 text-black/40 dark:text-white/45" aria-hidden />
  }
  return <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
}

function statusIcon(row: GitHubCommitStatus) {
  if (row.state === "pending") return <Circle className="size-4 shrink-0 text-amber-500" aria-hidden />
  if (row.state === "success") {
    return <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
  }
  return <XCircle className="size-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
}

function checksBannerLabel(state: GitHubChecksAggregateState | null | undefined) {
  if (!state) return null
  switch (state) {
    case "success":
      return {
        text: "All checks have passed",
        className: "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
      }
    case "failure":
      return {
        text: "Some checks were not successful",
        className: "border-red-500/35 bg-red-500/10 text-red-800 dark:text-red-200",
      }
    case "pending":
      return {
        text: "Checks are in progress",
        className: "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-100",
      }
    default:
      return {
        text: "Checks completed with warnings",
        className: "border-black/15 bg-black/[0.04] text-black/70 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/75",
      }
  }
}

export function GitHubRepoDetailModal({ row, open, onClose, year, color, avatarUrl }: Props) {
  const [tab, setTab] = useState<TabId>("overview")
  const [displayRow, setDisplayRow] = useState<GitHubRepoCatalogItem | null>(null)
  const [prs, setPrs] = useState<GitHubRepoPullRequest[]>([])
  const [prsLoading, setPrsLoading] = useState(false)
  const [prsError, setPrsError] = useState<string | null>(null)
  const [prsHint, setPrsHint] = useState<string | null>(null)
  const [selectedPr, setSelectedPr] = useState<number | null>(null)
  const [prDetail, setPrDetail] = useState<GitHubPullRequestDetail | null>(null)
  const [prLoading, setPrLoading] = useState(false)
  const [issues, setIssues] = useState<GitHubRepoIssue[]>([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [issuesError, setIssuesError] = useState<string | null>(null)
  const [issuesHint, setIssuesHint] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null)
  const [issueDetail, setIssueDetail] = useState<GitHubIssueDetail | null>(null)
  const [issueLoading, setIssueLoading] = useState(false)

  const inItemDetail = selectedPr != null || selectedIssue != null

  useEffect(() => {
    if (row) setDisplayRow(row)
  }, [row])

  useEffect(() => {
    if (!open) {
      setTab("overview")
      setSelectedPr(null)
      setPrDetail(null)
      setPrs([])
      setPrsError(null)
      setPrsHint(null)
      setIssues([])
      setIssuesError(null)
      setIssuesHint(null)
      setSelectedIssue(null)
      setIssueDetail(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || !displayRow?.repo) return
    let cancelled = false
    setPrsLoading(true)
    setPrsError(null)
    setPrsHint(null)
    void fetchGitHubRepoPullRequests(displayRow.repo, { force: true }).then((data) => {
      if (cancelled) return
      setPrs(data.items)
      setPrsError(data.items.length ? null : (data.error ?? null))
      setPrsHint(data.message ?? null)
      setPrsLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, displayRow?.repo])

  useEffect(() => {
    if (!open || !displayRow?.repo) return
    let cancelled = false
    setIssuesLoading(true)
    setIssuesError(null)
    setIssuesHint(null)
    void fetchGitHubRepoIssues(displayRow.repo, { force: true }).then((data) => {
      if (cancelled) return
      setIssues(data.items)
      setIssuesError(data.items.length ? null : (data.error ?? null))
      setIssuesHint(data.message ?? null)
      setIssuesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, displayRow?.repo])

  useEffect(() => {
    if (!open || !displayRow?.repo || selectedPr == null) {
      setPrDetail(null)
      setPrLoading(false)
      return
    }
    let cancelled = false
    setPrLoading(true)
    void fetchGitHubPullRequestDetail(displayRow.repo, selectedPr, { force: true }).then((data) => {
      if (cancelled) return
      setPrDetail(data)
      setPrLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, displayRow?.repo, selectedPr])

  useEffect(() => {
    if (!open || !displayRow?.repo || selectedIssue == null) {
      setIssueDetail(null)
      setIssueLoading(false)
      return
    }
    let cancelled = false
    setIssueLoading(true)
    void fetchGitHubIssueDetail(displayRow.repo, selectedIssue, { force: true }).then((data) => {
      if (cancelled) return
      setIssueDetail(data)
      setIssueLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [open, displayRow?.repo, selectedIssue])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        if (selectedPr != null) setSelectedPr(null)
        else if (selectedIssue != null) setSelectedIssue(null)
        else onClose()
      }
    }
    window.addEventListener("keydown", onKey, true)
    return () => window.removeEventListener("keydown", onKey, true)
  }, [open, onClose, selectedPr, selectedIssue])

  const profile = displayRow?.profile
  const { owner, name } = useMemo(() => splitRepoPath(displayRow?.repo ?? ""), [displayRow?.repo])
  const banner = checksBannerLabel(prDetail?.checksState)
  const orgOwner = profile?.ownerType === "organization"

  if (typeof document === "undefined") return null

  return createPortal(
    <AnimatePresence onExitComplete={() => { if (!open) setDisplayRow(null) }}>
      {open && displayRow ? (
        <motion.div
          className="fixed inset-0 z-[215] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={notchUi}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className="flex max-h-[min(42rem,90vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="github-repo-detail-title"
          >
            <div className="h-1.5 shrink-0" style={{ backgroundColor: color }} aria-hidden />
            <header className="shrink-0 border-b border-black/8 px-4 py-3 dark:border-white/10">
              <motion.div className="flex items-start gap-3" layout={false}>
                {inItemDetail ? (
                  <button
                    type="button"
                    aria-label="Back to repository"
                    onClick={() => {
                      setSelectedPr(null)
                      setSelectedIssue(null)
                    }}
                    className="mt-0.5 shrink-0 rounded-full p-2 text-black/50 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                ) : null}
                <div className="min-w-0 flex-1">
                  {selectedPr != null ? (
                    <>
                      <p className="text-[11px] font-medium text-black/45 dark:text-white/48">
                        {owner}/{name}
                      </p>
                      <h2
                        id="github-repo-detail-title"
                        className="mt-0.5 text-[17px] font-semibold leading-snug tracking-tight text-black/90 dark:text-white/93"
                      >
                        <span className="font-normal text-black/50 dark:text-white/55">#{selectedPr}</span>{" "}
                        {prDetail?.title ?? "Pull request"}
                      </h2>
                    </>
                  ) : selectedIssue != null ? (
                    <>
                      <p className="text-[11px] font-medium text-black/45 dark:text-white/48">
                        {owner}/{name}
                      </p>
                      <h2
                        id="github-repo-detail-title"
                        className="mt-0.5 text-[17px] font-semibold leading-snug tracking-tight text-black/90 dark:text-white/93"
                      >
                        <span className="font-normal text-black/50 dark:text-white/55">#{selectedIssue}</span>{" "}
                        {issueDetail?.title ?? "Issue"}
                      </h2>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt=""
                            className={cn(
                              "size-7 shrink-0 border border-black/10 object-cover dark:border-white/12",
                              orgOwner ? "rounded-[5px]" : "rounded-full",
                            )}
                          />
                        ) : null}
                        <p className="text-[11px] font-medium text-black/45 dark:text-white/48">{owner}</p>
                      </div>
                      <h2
                        id="github-repo-detail-title"
                        className="mt-0.5 text-[20px] font-semibold tracking-tight text-black/90 dark:text-white/93"
                      >
                        {name}
                      </h2>
                    </>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Open on GitHub"
                    onClick={() => {
                      if (selectedPr != null && prDetail?.url) openGitHubUrl(prDetail.url)
                      else if (selectedIssue != null && issueDetail?.url) openGitHubUrl(issueDetail.url)
                      else if (displayRow?.url) openGitHubUrl(displayRow.url)
                    }}
                    className="rounded-full p-2 text-black/45 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                  >
                    <ExternalLink className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="rounded-full p-2 text-black/45 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </motion.div>
              {!inItemDetail ? (
                <nav className="mt-3 flex flex-wrap gap-1" aria-label="Repository sections">
                  <TabButton active={tab === "overview"} onClick={() => setTab("overview")}>
                    Overview
                  </TabButton>
                  <TabButton active={tab === "pulls"} onClick={() => setTab("pulls")}>
                    Pull requests
                    {!prsLoading && prs.length > 0 ? (
                      <span className="tabular-nums text-black/40 dark:text-white/42">· {prs.length}</span>
                    ) : null}
                  </TabButton>
                  <TabButton active={tab === "issues"} onClick={() => setTab("issues")}>
                    Issues
                    {!issuesLoading && issues.length > 0 ? (
                      <span className="tabular-nums text-black/40 dark:text-white/42">· {issues.length}</span>
                    ) : null}
                  </TabButton>
                </nav>
              ) : null}
            </header>
            <div className="notch-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {selectedPr != null ? (
                <PrDetailView loading={prLoading} detail={prDetail} banner={banner} />
              ) : selectedIssue != null ? (
                <IssueDetailView loading={issueLoading} detail={issueDetail} />
              ) : tab === "overview" ? (
                <OverviewTab row={displayRow} year={year} profile={profile ?? null} />
              ) : tab === "pulls" ? (
                <PullsTab
                  loading={prsLoading}
                  error={prsError}
                  hint={prsHint}
                  items={prs}
                  onSelect={(n) => {
                    setSelectedIssue(null)
                    setSelectedPr(n)
                  }}
                  onRefresh={() => {
                    if (!displayRow?.repo) return
                    setPrsLoading(true)
                    void fetchGitHubRepoPullRequests(displayRow.repo, { force: true }).then((data) => {
                      setPrs(data.items)
                      setPrsError(data.items.length ? null : (data.error ?? null))
                      setPrsHint(data.message ?? null)
                      setPrsLoading(false)
                    })
                  }}
                />
              ) : (
                <IssuesTab
                  loading={issuesLoading}
                  error={issuesError}
                  hint={issuesHint}
                  items={issues}
                  onSelect={(n) => {
                    setSelectedPr(null)
                    setSelectedIssue(n)
                  }}
                  onRefresh={() => {
                    if (!displayRow?.repo) return
                    setIssuesLoading(true)
                    void fetchGitHubRepoIssues(displayRow.repo, { force: true }).then((data) => {
                      setIssues(data.items)
                      setIssuesError(data.items.length ? null : (data.error ?? null))
                      setIssuesHint(data.message ?? null)
                      setIssuesLoading(false)
                    })
                  }}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors",
        active
          ? "bg-black/[0.07] text-black/85 dark:bg-white/12 dark:text-white/90"
          : "text-black/50 hover:bg-black/[0.04] dark:text-white/55 dark:hover:bg-white/[0.06]",
      )}
    >
      {children}
    </button>
  )
}

function OverviewTab({
  row,
  year,
  profile,
}: {
  row: GitHubRepoCatalogItem
  year: number
  profile: GitHubRepoProfile | null
}) {
  const langColor = profile?.language ? resolveGitHubLanguageColor(profile.language) : null
  const pushed = formatGitHubRepoAge(profile?.pushedAt)
  const created = formatGitHubRepoAge(profile?.createdAt)

  return (
    <div className="space-y-4">
      {profile?.description ? (
        <p className="text-[14px] leading-relaxed text-black/70 dark:text-white/78">{profile.description}</p>
      ) : (
        <p className="text-[13px] text-black/45 dark:text-white/48">No description provided.</p>
      )}
      <motion.div
        layout={false}
        className="rounded-xl border border-black/[0.07] bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.04]"
      >
        <dl className="grid gap-3 text-[12px] sm:grid-cols-2">
          <div>
            <dt className="text-black/45 dark:text-white/48">Your contributions</dt>
            <dd className="mt-0.5 text-[22px] font-semibold tabular-nums text-black/85 dark:text-white/90">
              {row.count.toLocaleString()}
              <span className="ml-1 text-[12px] font-medium text-black/40 dark:text-white/42">· {year}</span>
            </dd>
          </div>
          {profile != null ? (
            <>
              <div>
                <dt className="text-black/45 dark:text-white/48">Stars · Forks</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-black/75 dark:text-white/80">
                  {profile.stars.toLocaleString()} · {profile.forks.toLocaleString()}
                </dd>
              </div>
              {profile.language && langColor ? (
                <div>
                  <dt className="text-black/45 dark:text-white/48">Primary language</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-black/75 dark:text-white/80">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: langColor }} aria-hidden />
                    {profile.language}
                  </dd>
                </div>
              ) : null}
            </>
          ) : null}
          {pushed ? (
            <div>
              <dt className="text-black/45 dark:text-white/48">Last push</dt>
              <dd className="mt-0.5 text-black/70 dark:text-white/75">{pushed}</dd>
            </div>
          ) : null}
          {created ? (
            <div>
              <dt className="text-black/45 dark:text-white/48">Created</dt>
              <dd className="mt-0.5 text-black/70 dark:text-white/75">{created}</dd>
            </div>
          ) : null}
        </dl>
      </motion.div>
    </div>
  )
}

function PullsTab({
  loading,
  error,
  hint,
  items,
  onSelect,
  onRefresh,
}: {
  loading: boolean
  error: string | null
  hint?: string | null
  items: GitHubRepoPullRequest[]
  onSelect: (n: number) => void
  onRefresh: () => void
}) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.number - a.number), [items])
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/42">
          Open pull requests
        </p>
        <button
          type="button"
          aria-label="Refresh pull requests"
          disabled={loading}
          onClick={onRefresh}
          className="rounded-full p-1.5 text-black/40 hover:bg-black/5 disabled:opacity-50 dark:text-white/45 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>
      {loading && items.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-black/50 dark:text-white/55">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading pull requests…
        </p>
      ) : error ? (
        <div className="space-y-1.5">
          <p className="text-[13px] text-red-600/90 dark:text-red-400/90">Could not load PRs ({error}).</p>
          {hint ? (
            <p className="text-[12px] leading-snug text-black/55 dark:text-white/60">{hint}</p>
          ) : null}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-[13px] text-black/50 dark:text-white/55">No open pull requests in this repository.</p>
      ) : (
        <ul className="divide-y divide-black/[0.07] rounded-xl border border-black/[0.07] dark:divide-white/[0.08] dark:border-white/10">
          {sorted.map((pr) => (
            <li key={pr.number}>
              <button
                type="button"
                onClick={() => onSelect(pr.number)}
                className="flex w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <GitPullRequest
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    pr.draft ? "text-black/35 dark:text-white/38" : "text-emerald-600 dark:text-emerald-400",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 text-[14px] font-semibold leading-snug text-black/88 dark:text-white/92">
                      <span className="mr-1.5 font-normal text-black/45 dark:text-white/48">#{pr.number}</span>
                      {pr.title}
                    </p>
                    {pr.checksTotal != null && pr.checksTotal > 0 ? (
                      <PrChecksCount
                        passed={pr.checksPassed ?? 0}
                        total={pr.checksTotal}
                        state={pr.checksState}
                      />
                    ) : null}
                  </div>
                  <OpenedByMeta
                    userLogin={pr.userLogin}
                    userAvatarUrl={pr.userAvatarUrl}
                    createdAt={pr.createdAt}
                    suffix={
                      pr.draft ? (
                        <>
                          {" · "}
                          <span className="inline-flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-black/35 dark:bg-white/38" aria-hidden />
                            Draft
                          </span>
                        </>
                      ) : null
                    }
                  />
                  {pr.labels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {pr.labels.map((l) => (
                        <LabelDot key={l.name} name={l.name} color={l.color} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PrDetailView({
  loading,
  detail,
  banner,
}: {
  loading: boolean
  detail: GitHubPullRequestDetail | null
  banner: ReturnType<typeof checksBannerLabel>
}) {
  if (loading || !detail?.number) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-black/50 dark:text-white/55">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading pull request…
      </p>
    )
  }
  if (detail.error) {
    return <p className="text-[13px] text-red-600/90 dark:text-red-400/90">Could not load PR ({detail.error}).</p>
  }

  const checkRuns = detail.checkRuns ?? []
  const statuses = detail.statuses ?? []

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center gap-2 text-[12px] text-black/55 dark:text-white/58">
        <UserAvatar url={detail.userAvatarUrl} login={detail.userLogin} size={5} />
        <span>
          <span className="font-semibold text-black/75 dark:text-white/80">{detail.userLogin}</span> wants to merge{" "}
          <code className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] dark:bg-white/10">{detail.headRef}</code>{" "}
          into{" "}
          <code className="rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] dark:bg-white/10">{detail.baseRef}</code>
        </span>
      </p>
      {detail.labels && detail.labels.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {detail.labels.map((l) => (
            <LabelDot key={l.name} name={l.name} color={l.color} />
          ))}
        </div>
      ) : null}
      {detail.draft ? (
        <p className="inline-flex items-center gap-1.5 text-[11px] text-black/50 dark:text-white/52">
          <span className="size-1.5 rounded-full bg-black/35 dark:bg-white/38" aria-hidden />
          Draft pull request
        </p>
      ) : null}
      {banner ? (
        <div className={cn("rounded-lg border px-3 py-2.5 text-[13px] font-medium", banner.className)}>
          {banner.text}
        </div>
      ) : null}
      {(checkRuns.length > 0 || statuses.length > 0) && (
        <ul className="divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.07] dark:divide-white/[0.08] dark:border-white/10">
          {checkRuns.map((run) => (
            <li key={run.id}>
              <CheckRow
                icon={checkRunIcon(run)}
                title={run.name}
                subtitle={run.status !== "completed" ? "In progress" : (run.conclusion ?? "").replace(/_/g, " ")}
                href={run.detailsUrl}
              />
            </li>
          ))}
          {statuses.map((row) => (
            <li key={`status-${row.context}`}>
              <CheckRow
                icon={statusIcon(row)}
                title={row.context}
                subtitle={row.description ?? row.state}
                href={row.targetUrl}
              />
            </li>
          ))}
        </ul>
      )}
      {detail.body ? (
        <div className="whitespace-pre-wrap rounded-xl border border-black/[0.07] bg-white/50 p-3 text-[13px] leading-relaxed text-black/75 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/78">
          {detail.body.length > 4000 ? `${detail.body.slice(0, 4000)}…` : detail.body}
        </div>
      ) : null}
    </div>
  )
}

function CheckRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  href: string | null
}) {
  const inner = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-black/85 dark:text-white/88">{title}</p>
        {subtitle ? <p className="truncate text-[11px] text-black/45 dark:text-white/48">{subtitle}</p> : null}
      </div>
      {href ? <ExternalLink className="size-3.5 shrink-0 text-black/35 dark:text-white/38" aria-hidden /> : null}
    </>
  )
  if (href) {
    return (
      <button
        type="button"
        onClick={() => openGitHubUrl(href)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        {inner}
      </button>
    )
  }
  return <div className="flex items-center gap-3 px-3 py-2.5">{inner}</div>
}

function IssuesTab({
  loading,
  error,
  hint,
  items,
  onSelect,
  onRefresh,
}: {
  loading: boolean
  error: string | null
  hint?: string | null
  items: GitHubRepoIssue[]
  onSelect: (n: number) => void
  onRefresh: () => void
}) {
  const sorted = useMemo(() => [...items].sort((a, b) => b.number - a.number), [items])
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/42">
          Open issues
        </p>
        <button
          type="button"
          aria-label="Refresh issues"
          disabled={loading}
          onClick={onRefresh}
          className="rounded-full p-1.5 text-black/40 hover:bg-black/5 disabled:opacity-50 dark:text-white/45 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>
      {loading && items.length === 0 ? (
        <p className="flex items-center gap-2 text-[13px] text-black/50 dark:text-white/55">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading issues…
        </p>
      ) : error ? (
        <div className="space-y-1.5">
          <p className="text-[13px] text-red-600/90 dark:text-red-400/90">Could not load issues ({error}).</p>
          {hint ? (
            <p className="text-[12px] leading-snug text-black/55 dark:text-white/60">{hint}</p>
          ) : null}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-[13px] text-black/50 dark:text-white/55">No open issues in this repository.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((issue) => (
            <li key={issue.number}>
              <button
                type="button"
                onClick={() => onSelect(issue.number)}
                className="flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <CircleDot className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold leading-snug text-black/88 dark:text-white/92">
                    <span className="mr-1.5 font-normal text-black/45 dark:text-white/48">#{issue.number}</span>
                    {issue.title}
                  </p>
                  <OpenedByMeta
                    userLogin={issue.userLogin}
                    userAvatarUrl={issue.userAvatarUrl}
                    createdAt={issue.createdAt}
                    suffix={issue.comments > 0 ? ` · ${issue.comments} comments` : null}
                  />
                  {issue.labels.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {issue.labels.map((l) => (
                        <LabelDot key={l.name} name={l.name} color={l.color} />
                      ))}
                    </div>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IssueDetailView({
  loading,
  detail,
}: {
  loading: boolean
  detail: GitHubIssueDetail | null
}) {
  if (loading || !detail?.number) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-black/50 dark:text-white/55">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading issue…
      </p>
    )
  }
  if (detail.error) {
    return <p className="text-[13px] text-red-600/90 dark:text-red-400/90">Could not load issue ({detail.error}).</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-black/55 dark:text-white/58">
        <UserAvatar url={detail.userAvatarUrl} login={detail.userLogin} size={6} />
        <span>
          Opened by{" "}
          <span className="font-semibold text-black/75 dark:text-white/80">{detail.userLogin}</span>{" "}
          {formatGitHubRepoAge(detail.createdAt) ?? ""}
        </span>
        {detail.comments != null && detail.comments > 0 ? (
          <span className="text-black/45 dark:text-white/48">{detail.comments} comments</span>
        ) : null}
      </div>
      {detail.assignees && detail.assignees.length > 0 ? (
        <p className="text-[12px] text-black/55 dark:text-white/58">
          Assigned to <span className="font-medium">{detail.assignees.join(", ")}</span>
        </p>
      ) : null}
      {detail.labels && detail.labels.length > 0 ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {detail.labels.map((l) => (
            <LabelDot key={l.name} name={l.name} color={l.color} />
          ))}
        </div>
      ) : null}
      {detail.body ? (
        <div className="whitespace-pre-wrap rounded-xl border border-black/[0.07] bg-white/50 p-3 text-[13px] leading-relaxed text-black/75 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/78">
          {detail.body.length > 4000 ? `${detail.body.slice(0, 4000)}…` : detail.body}
        </div>
      ) : (
        <p className="text-[13px] text-black/45 dark:text-white/48">No description provided.</p>
      )}
      <button
        type="button"
        onClick={() => detail.url && openGitHubUrl(detail.url)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/12 bg-white px-3 py-1.5 text-[12px] font-medium text-black/75 hover:bg-black/[0.03] dark:border-white/15 dark:bg-white/[0.06] dark:text-white/80 dark:hover:bg-white/10"
      >
        View on GitHub
        <ExternalLink className="size-3.5" aria-hidden />
      </button>
    </div>
  )
}