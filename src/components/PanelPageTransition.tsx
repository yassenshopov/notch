import { AnimatePresence, motion } from "motion/react"
import type { ReactNode } from "react"
import { useIslandMotion } from "../hooks/useIslandMotion"
import { cn } from "../lib/utils"

type Props = {
  panelKey: string
  children: ReactNode
  className?: string
}

export function PanelPageTransition({ panelKey, children, className }: Props) {
  const { panelEnter, panelExit } = useIslandMotion()
  const panelVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: panelEnter,
    },
    exit: {
      opacity: 0,
      y: -6,
      transition: panelExit,
    },
  }

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
