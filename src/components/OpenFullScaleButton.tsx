import { Maximize2 } from "lucide-react"
import type { NotchPanel } from "../lib/panel-routing"
import { panelLabel } from "../lib/panel-routing"
import { cn } from "../lib/utils"

type Props = {
  panel: NotchPanel
  className?: string
}

export function OpenFullScaleButton({ panel, className }: Props) {
  return (
    <button
      type="button"
      title={`Open ${panelLabel(panel)} in full window`}
      aria-label={`Open ${panelLabel(panel)} in full window`}
      onClick={(e) => {
        e.stopPropagation()
        void window.notch?.desktop?.open(panel)
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10",
        className,
      )}
    >
      <Maximize2 className="size-4" strokeWidth={2} />
    </button>
  )
}
