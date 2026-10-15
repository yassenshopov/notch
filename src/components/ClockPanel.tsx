import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react"
import type { ReactNode } from "react"
import { updateSettings, useSettings } from "../config/settings-store"
import { useTimerEngine } from "../hooks/useTimerEngine"
import { QUICK_TIMER_MS } from "../lib/timers"
import { cn } from "../lib/utils"

export function ClockPanel() {
  const settings = useSettings()
  const {
    session,
    active: timerActive,
    display,
    startPomodoro,
    startCountdown,
    startStopwatch,
    pause,
    resume,
    reset,
    skipBreak,
  } = useTimerEngine()

  const p = settings.timers.pomodoro

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 pr-10">
        <p className="text-[15px] font-semibold tracking-tight">Clock & timers</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Pomodoro, countdowns, stopwatch & local time.
        </p>
      </header>

      <div className="mb-5 rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
              {timerActive ? session.label || "Timer" : "Timer"}
            </p>
            <p className="mt-1 text-[36px] font-semibold tabular-nums leading-none tracking-tight">
              {timerActive ? display : "—"}
            </p>
          </div>
          <Timer className="size-5 shrink-0 text-black/30 dark:text-white/30" strokeWidth={1.75} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {timerActive ? (
            <>
              {session.kind === "running" ? (
                <ActionButton onClick={pause} icon={<Pause className="size-3.5" />}>
                  Pause
                </ActionButton>
              ) : (
                <ActionButton onClick={resume} icon={<Play className="size-3.5" />}>
                  Resume
                </ActionButton>
              )}
              <ActionButton onClick={reset} icon={<RotateCcw className="size-3.5" />} subtle>
                Reset
              </ActionButton>
              {session.phase === "shortBreak" || session.phase === "longBreak" ? (
                <ActionButton onClick={skipBreak} icon={<SkipForward className="size-3.5" />} subtle>
                  Skip break
                </ActionButton>
              ) : null}
            </>
          ) : (
            <>
              <ActionButton onClick={startPomodoro} icon={<Play className="size-3.5" />}>
                Pomodoro
              </ActionButton>
              <ActionButton onClick={startStopwatch} subtle>
                Stopwatch
              </ActionButton>
            </>
          )}
        </div>
      </div>

      <section className="mb-5">
        <SectionLabel title="Quick timers" />
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_TIMER_MS.map((t) => (
            <button
              key={t.ms}
              type="button"
              onClick={() => startCountdown(t.ms, t.label)}
              className="rounded-full bg-black/5 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-2">
        <SectionLabel title="Pomodoro lengths" />
        <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
          <DurationField
            label="Focus"
            minutes={Math.round(p.workMs / 60_000)}
            onCommit={(min) =>
              void updateSettings({
                timers: {
                  ...settings.timers,
                  pomodoro: { ...p, workMs: min * 60_000 },
                },
              })
            }
          />
          <DurationField
            label="Short break"
            minutes={Math.round(p.shortBreakMs / 60_000)}
            onCommit={(min) =>
              void updateSettings({
                timers: {
                  ...settings.timers,
                  pomodoro: { ...p, shortBreakMs: min * 60_000 },
                },
              })
            }
          />
          <DurationField
            label="Long break"
            minutes={Math.round(p.longBreakMs / 60_000)}
            onCommit={(min) =>
              void updateSettings({
                timers: {
                  ...settings.timers,
                  pomodoro: { ...p, longBreakMs: min * 60_000 },
                },
              })
            }
          />
          <DurationField
            label="Rounds"
            minutes={p.longEvery}
            onCommit={(n) =>
              void updateSettings({
                timers: {
                  ...settings.timers,
                  pomodoro: { ...p, longEvery: Math.max(2, Math.min(8, n)) },
                },
              })
            }
            suffix=""
          />
        </div>
      </section>
    </div>
  )
}

function SectionLabel({ title }: { title: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
      {title}
    </p>
  )
}

function ActionButton({
  children,
  onClick,
  icon,
  subtle,
}: {
  children: ReactNode
  onClick: () => void
  icon?: ReactNode
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
        subtle
          ? "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/80"
          : "bg-[#111] text-white dark:bg-white dark:text-[#111]",
      )}
    >
      {icon}
      {children}
    </button>
  )
}

function DurationField({
  label,
  minutes,
  onCommit,
  suffix = " min",
}: {
  label: string
  minutes: number
  onCommit: (value: number) => void
  suffix?: string
}) {
  return (
    <label className="flex flex-col gap-1 rounded-xl border border-black/[0.06] px-2.5 py-2 dark:border-white/10">
      <span className="text-[10px] text-black/40 dark:text-white/40">{label}</span>
      <input
        type="number"
        min={1}
        max={180}
        value={minutes}
        onChange={(e) => onCommit(Number(e.target.value) || 1)}
        className="w-full bg-transparent text-[13px] font-semibold tabular-nums outline-none"
      />
      {suffix ? (
        <span className="text-[10px] text-black/35 dark:text-white/35">{suffix.trim()}</span>
      ) : null}
    </label>
  )
}
