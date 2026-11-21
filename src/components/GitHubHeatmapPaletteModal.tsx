import { useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { updateSettings, useSettings } from "../config/settings-store"
import type { GitHubHeatmapPaletteId } from "../lib/github-heatmap-palettes"
import { resolveGitHubHeatmapPalette } from "../lib/github-heatmap-palettes"
import { notchUi } from "../lib/island-motion"
import { GitHubHeatmapPalettePicker } from "./GitHubHeatmapPalettePicker"

type Props = {
  open: boolean
  onClose: () => void
}

export function GitHubHeatmapPaletteModal({ open, onClose }: Props) {
  const settings = useSettings()
  const paletteId = resolveGitHubHeatmapPalette(settings.github.heatmapPalette)

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

  const onChange = (id: GitHubHeatmapPaletteId) => {
    void updateSettings({ github: { ...settings.github, heatmapPalette: id } })
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
            className="flex max-h-[min(90vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] p-4 shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="github-heatmap-colors-title"
          >
            <div className="mb-3 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h2
                  id="github-heatmap-colors-title"
                  className="text-[15px] font-semibold tracking-tight text-black/90 dark:text-white/92"
                >
                  Heatmap colors
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-black/45 dark:text-white/45">
                  Applies to this graph, the legend, and the island mini heatmap.
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
            <GitHubHeatmapPalettePicker
              value={paletteId}
              onChange={onChange}
              className="min-h-0 flex-1"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}