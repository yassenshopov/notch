import { motion } from "motion/react"
import { cn } from "../lib/utils"

type Props = {
  className?: string
}

const STROKE = 2
const EASE = [0.22, 1, 0.36, 1] as const

const faceVariants = {
  idle: {},
  smile: {
    transition: { delayChildren: 0.04, staggerChildren: 0.05 },
  },
}

/**
 * Minimal Grok-style face — two vertical eye lines that ease into brows
 * while a short smile draws in (occasional notch wink).
 */
export function BotSmile({ className }: Props) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className={cn("size-4 text-current", className)}
      aria-hidden
      variants={faceVariants}
      initial="idle"
      animate="smile"
    >
      {/* Left eye — vertical line */}
      <motion.path
        d="M 8 10.5 V 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        variants={{
          idle: { opacity: 1 },
          smile: { opacity: 0 },
        }}
        transition={{ duration: 0.28, ease: EASE }}
      />
      {/* Left brow */}
      <motion.path
        d="M 6 12 Q 8 8.75 10 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        variants={{
          idle: { opacity: 0, pathLength: 0.4 },
          smile: { opacity: 1, pathLength: 1 },
        }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.06 }}
      />

      {/* Right eye — vertical line */}
      <motion.path
        d="M 16 10.5 V 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        variants={{
          idle: { opacity: 1 },
          smile: { opacity: 0 },
        }}
        transition={{ duration: 0.28, ease: EASE }}
      />
      {/* Right brow */}
      <motion.path
        d="M 14 12 Q 16 8.75 18 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        variants={{
          idle: { opacity: 0, pathLength: 0.4 },
          smile: { opacity: 1, pathLength: 1 },
        }}
        transition={{ duration: 0.34, ease: EASE, delay: 0.06 }}
      />

      {/* Smile */}
      <motion.path
        d="M 7.5 16.25 Q 12 19.25 16.5 16.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        variants={{
          idle: { opacity: 0, pathLength: 0 },
          smile: { opacity: 0.92, pathLength: 1 },
        }}
        transition={{ duration: 0.36, ease: EASE, delay: 0.14 }}
      />
    </motion.svg>
  )
}
