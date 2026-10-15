import type { AppSettings } from "../config/settings"

export type TimerPhase = "work" | "shortBreak" | "longBreak" | "countdown" | "stopwatch"

export type TimerSessionKind = "idle" | "running" | "paused"

export type TimerSession = {
  kind: TimerSessionKind
  phase: TimerPhase
  label: string
  endsAt: number | null
  startedAt: number | null
  elapsedMs: number
  pomodoroRound: number
  segmentMs: number
}

export const defaultTimerSession: TimerSession = {
  kind: "idle",
  phase: "countdown",
  label: "",
  endsAt: null,
  startedAt: null,
  elapsedMs: 0,
  pomodoroRound: 1,
  segmentMs: 0,
}

export const QUICK_TIMER_MS = [
  { label: "5 min", ms: 5 * 60_000 },
  { label: "10 min", ms: 10 * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "25 min", ms: 25 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
  { label: "1 hr", ms: 60 * 60_000 },
] as const

export function formatTimerMs(ms: number, showHours = false): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0 || showHours) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }
  return `${m}:${String(s).padStart(2, "0")}`
}

export function sessionRemainingMs(session: TimerSession, now = Date.now()): number {
  if (session.phase === "stopwatch") {
    if (session.kind === "running" && session.startedAt) {
      return session.elapsedMs + (now - session.startedAt)
    }
    return session.elapsedMs
  }
  if (session.kind === "running" && session.endsAt) {
    return Math.max(0, session.endsAt - now)
  }
  if (session.kind === "paused") {
    return session.segmentMs
  }
  return 0
}

export function isTimerActive(session: TimerSession): boolean {
  return session.kind === "running" || session.kind === "paused"
}

export function pomodoroSegmentLabel(phase: TimerPhase, round: number): string {
  switch (phase) {
    case "work":
      return `Focus · ${round}`
    case "shortBreak":
      return "Short break"
    case "longBreak":
      return "Long break"
    default:
      return "Timer"
  }
}

export function nextPomodoroPhase(
  settings: AppSettings,
  current: TimerPhase,
  round: number,
): { phase: TimerPhase; round: number; ms: number; label: string } {
  const p = settings.timers.pomodoro
  if (current === "work") {
    const nextRound = round
    if (round >= p.longEvery) {
      return {
        phase: "longBreak",
        round: 1,
        ms: p.longBreakMs,
        label: pomodoroSegmentLabel("longBreak", 1),
      }
    }
    return {
      phase: "shortBreak",
      round: nextRound,
      ms: p.shortBreakMs,
      label: pomodoroSegmentLabel("shortBreak", nextRound),
    }
  }
  const nextRound = current === "longBreak" ? 1 : round + 1
  return {
    phase: "work",
    round: nextRound,
    ms: p.workMs,
    label: pomodoroSegmentLabel("work", nextRound),
  }
}

export function runningCountdownSession(
  phase: TimerPhase,
  label: string,
  durationMs: number,
  now = Date.now(),
  extra: Partial<TimerSession> = {},
): TimerSession {
  return {
    ...defaultTimerSession,
    kind: "running",
    phase,
    label,
    endsAt: now + durationMs,
    segmentMs: durationMs,
    ...extra,
  }
}
