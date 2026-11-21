import { GenericDesktopPanelSkeleton } from "./desktop/DesktopSkeleton"

export function PanelLazyFallback() {
  const desktop =
    typeof document !== "undefined" && document.documentElement.classList.contains("notch-desktop")
  if (desktop) {
    return <GenericDesktopPanelSkeleton />
  }
  return (
    <div className="flex flex-1 items-center justify-center py-8 text-sm text-black/40 dark:text-white/40">
      Loading…
    </div>
  )
}