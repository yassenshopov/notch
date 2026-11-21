import type { ReactNode } from "react"
import { Icon } from "@iconify/react"
import { openCursorDashboard } from "../lib/cursor"
import { cn } from "../lib/utils"

type Props = {
  displayName: string
  emailLabel: string
  planLabel?: string | null
  actions?: ReactNode
  className?: string
}

export function CursorProfileHeader({
  displayName,
  emailLabel,
  planLabel,
  actions,
  className,
}: Props) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 gap-3">
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:border-white/15 dark:bg-white/[0.06] dark:focus-visible:ring-white/25"
          aria-label="Open Cursor dashboard"
          onClick={() => void openCursorDashboard()}
        >
          <Icon icon="simple-icons:cursor" className="size-5 text-black/70 dark:text-white/75" />
        </button>
        <div className="min-w-0 space-y-1">
          <button
            type="button"
            onClick={() => void openCursorDashboard()}
            className="text-left text-[22px] font-semibold tracking-tight hover:underline"
          >
            {displayName}
          </button>
          <p className="text-[13px] text-black/45 dark:text-white/45">{emailLabel}</p>
          {planLabel ? (
            <p className="text-[12px] text-black/40 dark:text-white/40">{planLabel}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  )
}