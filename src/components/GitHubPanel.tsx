import { ExternalLink, RefreshCw } from "lucide-react"
import { openGitHubUrl, type GitHubStatus } from "../lib/github"
import { cn } from "../lib/utils"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"

type Props = {
  status: GitHubStatus
  refreshing: boolean
  onRefresh: () => void
}

export function GitHubPanel({ status, refreshing, onRefresh }: Props) {
  if (!status.configured) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-[15px] font-semibold">GitHub</p>
        <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
          Add <span className="font-medium">GITHUB_TOKEN</span> to{" "}
          <span className="font-medium">.env</span> and restart Notch.
        </p>
      </div>
    )
  }

  if (!status.connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-4 text-center">
        <p className="text-[15px] font-semibold">GitHub</p>
        <p className="mt-2 text-[12px] text-red-400">
          {status.error ?? status.message ?? "Could not connect"}
        </p>
      </div>
    )
  }

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 flex items-start justify-between gap-2 pr-8">
        <div className="flex items-center gap-2.5">
          {status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt=""
              className="size-9 rounded-full border border-black/10 dark:border-white/15"
            />
          ) : null}
          <div>
            <p className="text-[15px] font-semibold tracking-tight">GitHub</p>
            <p className="text-[12px] text-black/45 dark:text-white/45">@{status.login}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Refresh GitHub"
          disabled={refreshing}
          onClick={onRefresh}
          className="rounded-full p-2 text-black/40 hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50 dark:text-white/40 dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
      </header>

      {status.contributions?.weeks?.length ? (
        <section className="mb-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
              Contributions
            </p>
            <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">
              {status.contributions.total}
            </span>
          </div>
          <GitHubContributionHeatmap weeks={status.contributions.weeks ?? []} variant="panel" />
        </section>
      ) : null}

      <Section title="Pull requests" count={status.pullRequests.length}>
        {status.pullRequests.length === 0 ? (
          <EmptyRow text="No open PRs on your radar." />
        ) : (
          status.pullRequests.map((pr) => (
            <RowButton
              key={`${pr.repo}-${pr.number}`}
              title={`#${pr.number} ${pr.title}`}
              subtitle={pr.repo}
              onOpen={() => openGitHubUrl(pr.url)}
            />
          ))
        )}
      </Section>

      <Section title="Notifications" count={status.notifications.length} className="mt-4">
        {status.notifications.length === 0 ? (
          <EmptyRow text="Inbox zero." />
        ) : (
          status.notifications.map((n) => (
            <RowButton
              key={n.id}
              title={n.title}
              subtitle={n.repo}
              unread={n.unread}
              onOpen={() => openGitHubUrl(n.url)}
            />
          ))
        )}
      </Section>
    </div>
  )
}

function Section({
  title,
  count,
  children,
  className,
}: {
  title: string
  count: number
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {title}
        </p>
        <span className="text-[11px] tabular-nums text-black/35 dark:text-white/35">{count}</span>
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  )
}

function RowButton({
  title,
  subtitle,
  unread,
  onOpen,
}: {
  title: string
  subtitle: string
  unread?: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6",
        unread && "bg-black/[0.03] dark:bg-white/[0.04]",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium">{title}</p>
        <p className="truncate text-[11px] text-black/40 dark:text-white/40">{subtitle}</p>
      </div>
      <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-black/30 dark:text-white/30" />
    </button>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="px-2 py-1 text-[12px] text-black/40 dark:text-white/40">{text}</p>
}
