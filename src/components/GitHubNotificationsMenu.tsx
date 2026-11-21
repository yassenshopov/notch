import { useCallback, useEffect, useId, useRef, useState } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import type { GitHubNotification } from "../lib/github"
import {
  fetchGitHubNotificationsInbox,
  formatGitHubRepoAge,
  markAllGitHubNotificationsRead,
  markGitHubNotificationRead,
  openGitHubUrl,
} from "../lib/github"
import {
  resolveNotificationActionLabel,
  resolveNotificationSubjectTypeLabel,
  splitRepoPath,
} from "../lib/github-notification-labels"
import { cn } from "../lib/utils"

type Props = {
  seed: GitHubNotification[]
  onInboxChanged?: () => void
  className?: string
}

export function GitHubNotificationsMenu({ seed, onInboxChanged, className }: Props) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<GitHubNotification[]>(seed)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const unread = items.filter((n) => n.unread).length

  const syncFromServer = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const data = await fetchGitHubNotificationsInbox({ force })
      if (data.items.length) {
        setItems(data.items)
        setHasMore(data.hasMore)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void syncFromServer(false)
  }, [open, syncFromServer])

  useEffect(() => {
    setItems((prev) => mergeNotificationLists(prev, seed))
  }, [seed])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const loadMore = async () => {
    const last = items[items.length - 1]
    if (!last?.updatedAt || loadingMore) return
    setLoadingMore(true)
    try {
      const data = await fetchGitHubNotificationsInbox({ before: last.updatedAt })
      setItems(data.items)
      setHasMore(data.hasMore)
    } finally {
      setLoadingMore(false)
    }
  }

  const markRead = async (id: string) => {
    const res = await markGitHubNotificationRead(id)
    if (res.items?.length) {
      setItems(res.items)
    } else {
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
    }
    onInboxChanged?.()
  }

  const markAllRead = async () => {
    if (unread === 0 || markingAll) return
    setMarkingAll(true)
    try {
      const res = await markAllGitHubNotificationsRead()
      if (res.items?.length) {
        setItems(res.items)
      } else {
        setItems((prev) => prev.map((n) => ({ ...n, unread: false })))
      }
      onInboxChanged?.()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : `Notifications, ${items.length} items`
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
      >
        <Bell className="size-4" aria-hidden />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 size-2 rounded-full bg-[#0969da] ring-2 ring-[#f7f7f5] dark:bg-[#4493f8] dark:ring-[#111111]" />
        ) : null}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 flex w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(26rem,65vh)] flex-col overflow-hidden rounded-xl border border-black/10 bg-[#f7f7f5] shadow-lg dark:border-white/12 dark:bg-[#111111]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-black/8 px-3 py-2 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-black/80 dark:text-white/85">Notifications</p>
              <p className="text-[10px] tabular-nums text-black/40 dark:text-white/40">
                {unread > 0 ? `${unread} unread · ` : null}
                {items.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                disabled={unread === 0 || markingAll}
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-black/55 hover:bg-black/4 disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/6"
              >
                {markingAll ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <CheckCheck className="size-3" aria-hidden />
                )}
                Mark all read
              </button>
            </div>
          </div>

          <ul className="notch-scroll relative flex min-h-0 flex-1 flex-col divide-y divide-black/[0.06] overflow-y-auto dark:divide-white/[0.07]">
            {loading && items.length === 0 ? (
              <li className="flex items-center justify-center gap-2 px-3 py-8 text-[12px] text-black/45 dark:text-white/45">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </li>
            ) : items.length === 0 ? (
              <li className="px-3 py-6 text-center text-[12px] text-black/45 dark:text-white/45">Inbox zero.</li>
            ) : (
              items.map((n) => (
                <li key={n.id} role="none">
                  <NotificationRow
                    notification={n}
                    onOpen={async () => {
                      if (n.unread) await markRead(n.id)
                      void openGitHubUrl(n.url)
                      setOpen(false)
                    }}
                    onMarkRead={() => void markRead(n.id)}
                  />
                </li>
              ))
            )}
          </ul>

          {hasMore ? (
            <div className="border-t border-black/8 p-1.5 dark:border-white/10">
              <button
                type="button"
                disabled={loadingMore || items.length === 0}
                onClick={() => void loadMore()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-medium text-black/55 hover:bg-black/4 disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/6"
              >
                {loadingMore ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                Load more
              </button>
            </div>
          ) : null}

          <div className="border-t border-black/8 p-1.5 dark:border-white/10">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void openGitHubUrl("https://github.com/notifications")
                setOpen(false)
              }}
              className="w-full rounded-lg px-2.5 py-2 text-left text-[11px] font-medium text-black/55 hover:bg-black/4 dark:text-white/55 dark:hover:bg-white/6"
            >
              Open all on GitHub
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function mergeNotificationLists(
  prev: GitHubNotification[],
  seed: GitHubNotification[],
): GitHubNotification[] {
  if (!prev.length) return seed
  if (!seed.length) return prev
  const byId = new Map(prev.map((n) => [n.id, n]))
  for (const n of seed) {
    const existing = byId.get(n.id)
    byId.set(n.id, existing ? { ...existing, ...n } : n)
  }
  if (prev.length >= seed.length) {
    const order = prev.map((n) => n.id)
    for (const n of seed) {
      if (!order.includes(n.id)) order.unshift(n.id)
    }
    return order.map((id) => byId.get(id)!).filter(Boolean)
  }
  return seed.map((n) => byId.get(n.id) ?? n)
}

function NotificationRow({
  notification: n,
  onOpen,
  onMarkRead,
}: {
  notification: GitHubNotification
  onOpen: () => void
  onMarkRead: () => void
}) {
  const { owner, name } = splitRepoPath(n.repo)
  const orgOwner = n.ownerType === "organization"
  const ownerLabel = n.ownerLogin || owner
  const action = resolveNotificationActionLabel(n)
  const typeLabel = resolveNotificationSubjectTypeLabel(n)
  const when = n.updatedAt ? formatGitHubRepoAge(n.updatedAt) : null

  return (
    <div className="group relative flex w-full">
      <button
        type="button"
        role="menuitem"
        onClick={onOpen}
        className={cn(
          "flex w-full gap-2.5 px-3 py-3 pr-14 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6",
          n.unread && "bg-black/[0.025] dark:bg-white/[0.03]",
        )}
      >
        <span
          className={cn(
            "mt-1.5 w-1 shrink-0 self-stretch rounded-full",
            n.unread ? "bg-[#0969da] dark:bg-[#4493f8]" : "bg-black/10 dark:bg-white/15",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block text-[12px] font-semibold leading-snug",
              n.unread ? "text-[#0969da] dark:text-[#4493f8]" : "text-black/70 dark:text-white/72",
            )}
          >
            {action}
          </span>
          <span className="mt-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-black/45 dark:text-white/45">
            {n.ownerAvatarUrl ? (
              <img
                src={n.ownerAvatarUrl}
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
            <span>{ownerLabel}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] font-semibold tracking-tight text-black/88 dark:text-white/92">
            {name}
          </span>
          <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-black/58 dark:text-white/60">
            {n.title}
          </span>
          <span className="mt-1.5 block text-[10px] text-black/40 dark:text-white/42">
            {typeLabel}
            {when ? ` · ${when}` : null}
          </span>
        </span>
      </button>
      {n.unread ? (
        <button
          type="button"
          aria-label="Mark as read"
          onClick={(e) => {
            e.stopPropagation()
            onMarkRead()
          }}
          className="absolute right-2 top-2 rounded-md p-1.5 text-[10px] font-medium text-black/40 opacity-0 transition-opacity hover:bg-black/5 group-hover:opacity-100 dark:text-white/45 dark:hover:bg-white/8"
        >
          <CheckCheck className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}