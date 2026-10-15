import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { getSettings, updateSettings, useSettings } from "../config/settings-store"
import type { AppSettings } from "../config/settings"
import {
  defaultTimerSession,
  formatTimerMs,
  isTimerActive,
  nextPomodoroPhase,
  pomodoroSegmentLabel,
  runningCountdownSession,
  sessionRemainingMs,
  type TimerSession,
} from "../lib/timers"

function playTimerDone() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    void ctx.close()
  } catch {
    // ignore
  }
}

export type TimerEngine = ReturnType<typeof useTimerEngineCore>

const TimerEngineContext = createContext<TimerEngine | null>(null)

export function TimerEngineProvider({ children }: { children: ReactNode }) {
  const value = useTimerEngineCore()
  return createElement(TimerEngineContext.Provider, { value }, children)
}

export function useTimerEngine(): TimerEngine {
  const ctx = useContext(TimerEngineContext)
  if (!ctx) {
    throw new Error("useTimerEngine must be used within TimerEngineProvider")
  }
  return ctx
}

function useTimerEngineCore() {
  const settings = useSettings()
  const session = settings.timers.session
  const [now, setNow] = useState(() => Date.now())
  const lastHandledEndsAt = useRef<number | null>(null)

  const active = isTimerActive(session)
  const remainingMs = useMemo(
    () => sessionRemainingMs(session, now),
    [session, now],
  )

  useEffect(() => {
    if (!active || session.kind !== "running") return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [active, session.kind])

  const persist = useCallback((next: TimerSession) => {
    const timers = getSettings().timers
    void updateSettings({
      timers: { ...timers, session: next },
    })
  }, [])

  const completeSegment = useCallback(
    (current: TimerSession, appSettings: AppSettings) => {
      if (appSettings.timers.soundEnabled) playTimerDone()

      if (
        current.phase === "work" ||
        current.phase === "shortBreak" ||
        current.phase === "longBreak"
      ) {
        const next = nextPomodoroPhase(
          appSettings,
          current.phase,
          current.pomodoroRound,
        )
        persist(
          runningCountdownSession(next.phase, next.label, next.ms, Date.now(), {
            pomodoroRound: next.round,
          }),
        )
        return
      }

      persist({ ...defaultTimerSession })
    },
    [persist],
  )

  useEffect(() => {
    if (session.kind !== "running" || session.phase === "stopwatch") return
    if (!session.endsAt) return
    if (Date.now() < session.endsAt) return
    if (lastHandledEndsAt.current === session.endsAt) return
    lastHandledEndsAt.current = session.endsAt
    completeSegment(session, getSettings())
  }, [session, now, completeSegment])

  const startPomodoro = useCallback(() => {
    lastHandledEndsAt.current = null
    const p = getSettings().timers.pomodoro
    persist(
      runningCountdownSession(
        "work",
        pomodoroSegmentLabel("work", 1),
        p.workMs,
        Date.now(),
        { pomodoroRound: 1 },
      ),
    )
  }, [persist])

  const startCountdown = useCallback(
    (ms: number, label: string) => {
      lastHandledEndsAt.current = null
      persist(runningCountdownSession("countdown", label, ms, Date.now()))
    },
    [persist],
  )

  const startStopwatch = useCallback(() => {
    lastHandledEndsAt.current = null
    persist({
      ...defaultTimerSession,
      kind: "running",
      phase: "stopwatch",
      label: "Stopwatch",
      startedAt: Date.now(),
      elapsedMs: 0,
    })
  }, [persist])

  const pause = useCallback(() => {
    if (session.kind !== "running") return
    if (session.phase === "stopwatch" && session.startedAt) {
      persist({
        ...session,
        kind: "paused",
        elapsedMs: session.elapsedMs + (Date.now() - session.startedAt),
        startedAt: null,
      })
      return
    }
    if (session.endsAt) {
      persist({
        ...session,
        kind: "paused",
        segmentMs: Math.max(0, session.endsAt - Date.now()),
        endsAt: null,
      })
    }
  }, [persist, session])

  const resume = useCallback(() => {
    if (session.kind !== "paused") return
    lastHandledEndsAt.current = null
    if (session.phase === "stopwatch") {
      persist({
        ...session,
        kind: "running",
        startedAt: Date.now(),
      })
      return
    }
    persist(
      runningCountdownSession(session.phase, session.label, session.segmentMs, Date.now(), {
        pomodoroRound: session.pomodoroRound,
      }),
    )
  }, [persist, session])

  const reset = useCallback(() => {
    lastHandledEndsAt.current = null
    persist({ ...defaultTimerSession })
  }, [persist])

  const skipBreak = useCallback(() => {
    if (session.phase !== "shortBreak" && session.phase !== "longBreak") return
    lastHandledEndsAt.current = null
    const p = getSettings().timers.pomodoro
    const round = session.phase === "longBreak" ? 1 : session.pomodoroRound + 1
    persist(
      runningCountdownSession(
        "work",
        pomodoroSegmentLabel("work", round),
        p.workMs,
        Date.now(),
        { pomodoroRound: round },
      ),
    )
  }, [persist, session.phase, session.pomodoroRound])

  const display = formatTimerMs(
    remainingMs,
    session.phase === "stopwatch" && remainingMs >= 3600_000,
  )

  const islandLabel =
    session.phase === "stopwatch"
      ? display
      : session.label
        ? `${display}`
        : display

  return {
    session,
    active,
    remainingMs,
    display,
    islandLabel,
    startPomodoro,
    startCountdown,
    startStopwatch,
    pause,
    resume,
    reset,
    skipBreak,
  }
}
