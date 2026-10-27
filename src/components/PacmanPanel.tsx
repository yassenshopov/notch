import { Pause, Play, RotateCcw } from "lucide-react"
import { useEffect, useReducer, useRef, type ReactNode } from "react"
import {
  createPacmanGame,
  setPacmanDirection,
  stepGhostsGame,
  stepPacmanGame,
  type Direction,
  type PacmanGameState,
} from "../lib/pacman"
import { usePanelLayout } from "../lib/panel-layout"
import { cn } from "../lib/utils"
import { PacmanSprite } from "./PacmanSprite"

/** Delay between Pac-Man steps while a direction key is held. */
const STEP_MS = 175
/** Ghost step interval — runs on its own clock while playing. */
const GHOST_STEP_MS = 220

type Action =
  | { type: "dir"; dir: Direction }
  | { type: "step" }
  | { type: "ghostStep" }
  | { type: "reset" }
  | { type: "pause" }

function reducer(state: PacmanGameState, action: Action): PacmanGameState {
  switch (action.type) {
    case "dir":
      return setPacmanDirection(state, action.dir)
    case "step":
      return stepPacmanGame(state)
    case "ghostStep":
      return stepGhostsGame(state)
    case "reset":
      return createPacmanGame()
    case "pause":
      if (state.status === "playing") return { ...state, status: "paused" }
      if (state.status === "paused") return { ...state, status: "playing" }
      return state
    default:
      return state
  }
}

function dirFromKey(key: string): Direction | null {
  switch (key) {
    case "ArrowUp":
    case "w":
    case "W":
      return "up"
    case "ArrowDown":
    case "s":
    case "S":
      return "down"
    case "ArrowLeft":
    case "a":
    case "A":
      return "left"
    case "ArrowRight":
    case "d":
    case "D":
      return "right"
    default:
      return null
  }
}

export function PacmanPanel() {
  const desktop = usePanelLayout() === "desktop"
  const [state, dispatch] = useReducer(reducer, undefined, createPacmanGame)
  const boardRef = useRef<HTMLDivElement>(null)
  const heldDir = useRef<Direction | null>(null)
  const holdTimer = useRef<number | null>(null)

  useEffect(() => {
    boardRef.current?.focus()
  }, [])

  useEffect(() => {
    if (state.status !== "playing") return
    const id = window.setInterval(() => dispatch({ type: "ghostStep" }), GHOST_STEP_MS)
    return () => window.clearInterval(id)
  }, [state.status])

  const queueDirAndStep = (dir: Direction) => {
    dispatch({ type: "dir", dir })
    dispatch({ type: "step" })
  }

  const clearHoldTimer = () => {
    if (holdTimer.current !== null) {
      window.clearInterval(holdTimer.current)
      holdTimer.current = null
    }
  }

  const startHold = (dir: Direction) => {
    heldDir.current = dir
    clearHoldTimer()
    holdTimer.current = window.setInterval(() => {
      if (heldDir.current) queueDirAndStep(heldDir.current)
    }, STEP_MS)
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = dirFromKey(e.key)
      if (dir) {
        e.preventDefault()
        e.stopPropagation()
        if (e.repeat) return
        queueDirAndStep(dir)
        startHold(dir)
        return
      }
      if (e.key === " ") {
        e.preventDefault()
        e.stopPropagation()
        dispatch({ type: "pause" })
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = dirFromKey(e.key)
      if (!dir) return
      if (heldDir.current === dir) {
        heldDir.current = null
        clearHoldTimer()
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("keyup", onKeyUp, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("keyup", onKeyUp, true)
      clearHoldTimer()
    }
  }, [])

  const sendDir = (dir: Direction) => queueDirAndStep(dir)

  const releaseHold = (dir: Direction) => {
    if (heldDir.current === dir) {
      heldDir.current = null
      clearHoldTimer()
    }
  }

  const statusLine =
    state.status === "won"
      ? "You cleared the maze!"
      : state.status === "lost"
        ? "Game over"
        : state.status === "paused"
          ? "Paused"
          : state.status === "ready"
            ? "Press or hold a direction to move one tile at a time"
            : null

  const chompActive = state.status === "playing"

  const game = (
    <div
      className={cn("flex h-full flex-col pr-1 outline-none", !desktop && "notch-scroll")}
      onClick={(e) => {
        e.stopPropagation()
        boardRef.current?.focus()
      }}
      tabIndex={0}
      ref={boardRef}
    >
      <header className="mb-3 pr-10">
        <p className="text-[15px] font-semibold tracking-tight">Pac-Man</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Arrow keys or WASD · Space to pause · Power pellets turn ghosts blue.
        </p>
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px] tabular-nums">
        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 font-medium dark:bg-white/[0.06]">
          Score {state.score}
        </span>
        <span className="rounded-full bg-black/[0.04] px-2.5 py-1 font-medium dark:bg-white/[0.06]">
          Lives {state.lives}
        </span>
        <div className="ml-auto flex gap-1.5">
          <IconButton
            title={state.status === "paused" ? "Resume" : "Pause"}
            onClick={() => dispatch({ type: "pause" })}
            disabled={state.status !== "playing" && state.status !== "paused"}
          >
            {state.status === "paused" ? (
              <Play className="size-3.5" />
            ) : (
              <Pause className="size-3.5" />
            )}
          </IconButton>
          <IconButton title="New game" onClick={() => dispatch({ type: "reset" })}>
            <RotateCcw className="size-3.5" />
          </IconButton>
        </div>
      </div>

      {statusLine ? (
        <p className="mb-2 text-center text-[11px] font-medium text-amber-600 dark:text-amber-400">
          {statusLine}
        </p>
      ) : null}

      <div
        className="mx-auto w-full max-w-[min(100%,340px)] overflow-hidden rounded-xl border border-black/[0.08] bg-[#f7f7f5] dark:border-white/10 dark:bg-[#111111]"
        style={{
          aspectRatio: `${state.width} / ${state.height}`,
        }}
      >
        <div
          className="relative grid h-full w-full gap-0"
          style={{
            gridTemplateColumns: `repeat(${state.width}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${state.height}, minmax(0, 1fr))`,
          }}
        >
          {state.grid.map((row, y) =>
            row.map((cell, x) => {
              const isPacman = state.pacman.x === x && state.pacman.y === y
              const ghostsHere = state.ghosts.filter((g) => g.x === x && g.y === y && g.mode !== "eaten")
              const ghostHere = ghostsHere[0]
              const isWall = cell === "wall"
              return (
                <div
                  key={`${x}-${y}`}
                  className={cn(
                    "relative flex items-center justify-center",
                    isWall ? "bg-black dark:bg-white" : "bg-[#f7f7f5] dark:bg-[#111111]",
                  )}
                >
                  {cell === "pellet" ? (
                    <span className="size-[20%] rounded-full bg-black/30 dark:bg-white/55" />
                  ) : null}
                  {cell === "power" ? (
                    <span className="size-[34%] rounded-full bg-black/45 dark:bg-white/70" />
                  ) : null}
                  {isPacman ? (
                    <PacmanSprite dir={state.pacman.dir} active={chompActive} />
                  ) : null}
                  {ghostHere && !isPacman ? (
                    <span
                      className={cn(
                        "absolute inset-[10%] rounded-full rounded-b-none",
                        ghostHere.mode === "frightened"
                          ? "bg-blue-500 dark:bg-blue-400"
                          : "shadow-sm dark:shadow-[0_0_4px_rgba(0,0,0,0.35)]",
                      )}
                      style={
                        ghostHere.mode === "frightened"
                          ? undefined
                          : { backgroundColor: ghostHere.color }
                      }
                    />
                  ) : null}
                </div>
              )
            }),
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 self-center">
        <span />
        <DirButton
          label="↑"
          onStep={() => sendDir("up")}
          onHold={(h) => (h ? startHold("up") : releaseHold("up"))}
        />
        <span />
        <DirButton
          label="←"
          onStep={() => sendDir("left")}
          onHold={(h) => (h ? startHold("left") : releaseHold("left"))}
        />
        <DirButton
          label="↓"
          onStep={() => sendDir("down")}
          onHold={(h) => (h ? startHold("down") : releaseHold("down"))}
        />
        <DirButton
          label="→"
          onStep={() => sendDir("right")}
          onHold={(h) => (h ? startHold("right") : releaseHold("right"))}
        />
      </div>
    </div>
  )

  if (desktop) {
    return <div className="min-h-0">{game}</div>
  }

  return game
}


function DirButton({
  label,
  onStep,
  onHold,
}: {
  label: string
  onStep: () => void
  onHold: (held: boolean) => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault()
        onStep()
        onHold(true)
      }}
      onPointerUp={() => onHold(false)}
      onPointerLeave={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
      className="flex h-10 items-center justify-center rounded-xl border border-black/[0.08] bg-black/[0.03] text-lg font-medium text-black/70 hover:bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/80 dark:hover:bg-white/[0.08] touch-none select-none"
    >
      {label}
    </button>
  )
}

function IconButton({
  children,
  onClick,
  title,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  title: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-full p-2 text-black/50 hover:bg-black/5 disabled:opacity-30 dark:text-white/50 dark:hover:bg-white/10"
    >
      {children}
    </button>
  )
}
