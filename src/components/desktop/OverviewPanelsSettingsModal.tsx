import { useEffect } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion } from "motion/react"
import { X } from "lucide-react"
import { updateSettings, useSettings } from "../../config/settings-store"
import {
  countEnabledOverviewCards,
  defaultOverviewCards,
  OVERVIEW_CARD_HINTS,
  OVERVIEW_CARD_IDS,
  OVERVIEW_CARD_LABELS,
  type OverviewCardId,
  resolveOverviewCards,
} from "../../lib/overview-panels"
import { notchUi } from "../../lib/island-motion"
import { cn } from "../../lib/utils"

type Props = {
  open: boolean
  onClose: () => void
}

export function OverviewPanelsSettingsModal({ open, onClose }: Props) {
  const settings = useSettings()
  const cards = resolveOverviewCards(settings)
  const visible = countEnabledOverviewCards(cards)

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

  const setCard = (id: OverviewCardId, on: boolean) => {
    void updateSettings({
      overview: {
        cards: { ...cards, [id]: on },
      },
    })
  }

  const showAll = () => {
    void updateSettings({ overview: { cards: defaultOverviewCards() } })
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
            className="flex max-h-[min(90vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-black/10 bg-[#f7f7f5] shadow-2xl dark:border-white/10 dark:bg-[#161616]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={notchUi}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="overview-panels-title"
          >
            <div className="border-b border-black/8 px-4 py-3.5 dark:border-white/10">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2
                    id="overview-panels-title"
                    className="text-[15px] font-semibold tracking-tight text-black/90 dark:text-white/92"
                  >
                    Overview panels
                  </h2>
                  <p className="mt-0.5 text-[11px] leading-snug text-black/45 dark:text-white/45">
                    Choose what appears on Today. Saved to your settings (synced when Neon is
                    configured).
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
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <ul className="flex flex-col gap-0.5">
                {OVERVIEW_CARD_IDS.map((id) => {
                  const on = cards[id]
                  return (
                    <li key={id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-xl px-2.5 py-2.5 transition-colors",
                          on
                            ? "bg-black/[0.03] dark:bg-white/[0.04]"
                            : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => setCard(id, e.target.checked)}
                          className="mt-0.5 size-4 shrink-0 rounded border-black/20 accent-black dark:border-white/25 dark:accent-white"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-black/85 dark:text-white/88">
                            {OVERVIEW_CARD_LABELS[id]}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-snug text-black/45 dark:text-white/45">
                            {OVERVIEW_CARD_HINTS[id]}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-black/8 px-4 py-3 dark:border-white/10">
              <p className="text-[11px] text-black/40 dark:text-white/40">
                {visible} of {OVERVIEW_CARD_IDS.length} visible
              </p>
              <button
                type="button"
                onClick={showAll}
                className="rounded-full px-3 py-1.5 text-[12px] font-medium text-black/55 hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
              >
                Show all
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}