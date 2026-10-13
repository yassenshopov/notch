import { motion } from "motion/react"
import { cn } from "../lib/utils"

type Props = {
  className?: string
}

/** Tiny Grok-ish bot smile — cute rounded face for occasional notch winks. */
export function BotSmile({ className }: Props) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={cn("size-[15px]", className)}
      aria-hidden
      initial={false}
      animate={{ rotate: [0, -6, 6, -3, 0] }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
    >
      {/* soft head */}
      <rect x="4" y="5" width="24" height="22" rx="11" fill="currentColor" opacity="0.92" />
      {/* antenna */}
      <circle cx="16" cy="3.5" r="1.6" fill="currentColor" opacity="0.7" />
      <path
        d="M16 5 V8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* eyes — blink-friendly ellipses */}
      <motion.ellipse
        cx="11.2"
        cy="14.2"
        rx="1.7"
        ry="2.1"
        fill="var(--bot-eye, #f7f7f5)"
        animate={{ scaleY: [1, 1, 0.15, 1, 1] }}
        transition={{ duration: 0.7, times: [0, 0.35, 0.45, 0.55, 1] }}
      />
      <motion.ellipse
        cx="20.8"
        cy="14.2"
        rx="1.7"
        ry="2.1"
        fill="var(--bot-eye, #f7f7f5)"
        animate={{ scaleY: [1, 1, 0.15, 1, 1] }}
        transition={{ duration: 0.7, times: [0, 0.35, 0.45, 0.55, 1] }}
      />
      {/* cheek dots */}
      <circle cx="8.2" cy="17.8" r="1.2" fill="#ff8fab" opacity="0.85" />
      <circle cx="23.8" cy="17.8" r="1.2" fill="#ff8fab" opacity="0.85" />
      {/* smile */}
      <path
        d="M11.5 19.5 C13.2 22.2, 18.8 22.2, 20.5 19.5"
        fill="none"
        stroke="var(--bot-eye, #f7f7f5)"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </motion.svg>
  )
}
