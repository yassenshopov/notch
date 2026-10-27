import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { panelPageEnter, panelPageExit } from "../lib/island-motion"
import { cn } from "../lib/utils"

type Props = {
  panelKey: string
  children: ReactNode
  className?: string
}

const panelVariants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: panelPageEnter,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: panelPageExit,
  },
}

export function PanelPageTransition({ panelKey, children, className }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={panelKey}
        variants={panelVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={cn("min-h-0 w-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
