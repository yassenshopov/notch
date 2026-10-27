import {
  generatePacmanMaze,
  type CellKind,
  type PacmanMazeLayout,
} from "./pacman-maze"

export type { CellKind }

export type Direction = "up" | "down" | "left" | "right"

export type GhostMode = "chase" | "scatter" | "frightened" | "eaten"

export type Ghost = {
  id: number
  x: number
  y: number
  dir: Direction
  mode: GhostMode
  color: string
}

export type PacmanGameStatus = "ready" | "playing" | "won" | "lost" | "paused"

export type PacmanGameState = {
  grid: CellKind[][]
  pacman: { x: number; y: number; dir: Direction; nextDir: Direction }
  ghosts: Ghost[]
  score: number
  lives: number
  pelletsLeft: number
  status: PacmanGameStatus
  frightenedSteps: number
  step: number
  ghostStep: number
  width: number
  height: number
  pacmanStart: { x: number; y: number }
  ghostStarts: { x: number; y: number; color: string }[]
}

const POWER_STEPS = 40
const FRIGHTENED_GHOST_POINTS = [200, 400, 800, 1600]
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
}

function isWalkable(grid: CellKind[][], x: number, y: number) {
  if (y < 0 || y >= grid.length) return false
  if (x < 0 || x >= grid[0].length) return false
  return grid[y][x] !== "wall"
}

function wrapX(width: number, x: number) {
  if (x < 0) return width - 1
  if (x >= width) return 0
  return x
}

function manhattan(ax: number, ay: number, bx: number, by: number) {
  return Math.abs(ax - bx) + Math.abs(ay - by)
}

const DIR_TIE_BREAK: Direction[] = ["up", "left", "down", "right"]

function distAfterMove(ghost: Ghost, dir: Direction, targetX: number, targetY: number) {
  const { dx, dy } = DELTA[dir]
  return manhattan(ghost.x + dx, ghost.y + dy, targetX, targetY)
}

function canStep(grid: CellKind[][], width: number, x: number, y: number, dir: Direction) {
  const { dx, dy } = DELTA[dir]
  const nx = dir === "left" || dir === "right" ? wrapX(width, x + dx) : x + dx
  const ny = y + dy
  return isWalkable(grid, nx, ny)
}

function pickGhostDir(
  grid: CellKind[][],
  width: number,
  ghost: Ghost,
  targetX: number,
  targetY: number,
  flee: boolean,
): Direction {
  const options: Direction[] = ["up", "down", "left", "right"].filter(
    (d) => d !== OPPOSITE[ghost.dir],
  ) as Direction[]

  let valid = options.filter((dir) => canStep(grid, width, ghost.x, ghost.y, dir))

  if (valid.length === 0) {
    const reverse = OPPOSITE[ghost.dir]
    if (canStep(grid, width, ghost.x, ghost.y, reverse)) return reverse
    return ghost.dir
  }

  let bestDist = flee ? -Infinity : Infinity
  let best: Direction[] = []

  for (const dir of valid) {
    const dist = distAfterMove(ghost, dir, targetX, targetY)
    const better = flee ? dist > bestDist : dist < bestDist
    if (better) {
      bestDist = dist
      best = [dir]
    } else if (dist === bestDist) {
      best.push(dir)
    }
  }

  if (best.includes(ghost.dir)) return ghost.dir
  for (const dir of DIR_TIE_BREAK) {
    if (best.includes(dir)) return dir
  }
  return best[0] ?? ghost.dir
}

function initialGhosts(ghostStarts: PacmanMazeLayout["ghostStarts"]): Ghost[] {
  return ghostStarts.map((g, id) => ({
    id,
    x: g.x,
    y: g.y,
    dir: "left",
    mode: "scatter",
    color: g.color,
  }))
}

function stateFromLayout(layout: PacmanMazeLayout): PacmanGameState {
  return {
    grid: layout.grid.map((row) => [...row]),
    pacman: {
      x: layout.pacmanStart.x,
      y: layout.pacmanStart.y,
      dir: "left",
      nextDir: "left",
    },
    ghosts: initialGhosts(layout.ghostStarts),
    score: 0,
    lives: 3,
    pelletsLeft: layout.pelletsLeft,
    status: "ready",
    frightenedSteps: 0,
    step: 0,
    ghostStep: 0,
    width: layout.width,
    height: layout.height,
    pacmanStart: layout.pacmanStart,
    ghostStarts: layout.ghostStarts,
  }
}

export function createPacmanGame(): PacmanGameState {
  return stateFromLayout(generatePacmanMaze())
}

export function setPacmanDirection(state: PacmanGameState, dir: Direction): PacmanGameState {
  if (state.status !== "playing" && state.status !== "ready") return state
  return {
    ...state,
    pacman: { ...state.pacman, nextDir: dir },
    status: state.status === "ready" ? "playing" : state.status,
  }
}

function movePacman(state: PacmanGameState): PacmanGameState {
  const { grid, pacman } = state
  const tryDir = (d: Direction) => {
    const { dx, dy } = DELTA[d]
    const nx = wrapX(state.width, pacman.x + dx)
    const ny = pacman.y + dy
    if (isWalkable(grid, nx, ny)) return { x: nx, y: ny, dir: d }
    return null
  }

  const preferred = tryDir(pacman.nextDir)
  if (preferred) {
    return { ...state, pacman: { ...pacman, ...preferred } }
  }

  const fallback = tryDir(pacman.dir)
  if (fallback) {
    return { ...state, pacman: { ...pacman, ...fallback } }
  }

  return state
}

function eatAt(state: PacmanGameState): PacmanGameState {
  const { x, y } = state.pacman
  const cell = state.grid[y][x]
  if (cell !== "pellet" && cell !== "power") return state

  const grid = state.grid.map((row, ri) =>
    ri === y ? row.map((c, ci) => (ci === x ? "empty" : c)) : [...row],
  )
  const pelletsLeft = state.pelletsLeft - 1
  let frightenedSteps = state.frightenedSteps
  let score = state.score + (cell === "power" ? 50 : 10)

  if (cell === "power") {
    frightenedSteps = POWER_STEPS
  }

  const ghosts = state.ghosts.map((g) =>
    g.mode === "eaten"
      ? g
      : { ...g, mode: frightenedSteps > 0 ? "frightened" : g.mode },
  )

  return {
    ...state,
    grid,
    pelletsLeft,
    score,
    frightenedSteps,
    ghosts,
    status: pelletsLeft <= 0 ? "won" : state.status,
  }
}

function posKey(x: number, y: number) {
  return `${x},${y}`
}

function applyGhostStep(
  grid: CellKind[][],
  width: number,
  ghost: Ghost,
  frightened: boolean,
  scatter: boolean,
  pacman: { x: number; y: number },
  home: { x: number; y: number },
  blocked: Set<string>,
): Ghost {
  let mode = ghost.mode
  if (mode === "eaten") {
    if (ghost.x === home.x && ghost.y === home.y) {
      mode = frightened ? "frightened" : scatter ? "scatter" : "chase"
    }
  } else if (frightened) {
    mode = "frightened"
  } else {
    mode = scatter ? "scatter" : "chase"
  }

  const target =
    mode === "scatter"
      ? { x: ghost.id === 0 ? 1 : ghost.id === 1 ? 17 : 1, y: ghost.id === 2 ? 1 : 1 }
      : mode === "frightened"
        ? {
            x: pacman.x + (ghost.x - pacman.x),
            y: pacman.y + (ghost.y - pacman.y),
          }
        : { x: pacman.x, y: pacman.y }

  const preferred = pickGhostDir(
    grid,
    width,
    { ...ghost, mode },
    target.x,
    target.y,
    mode === "frightened",
  )
  const tryDirs: Direction[] = []
  for (const dir of [preferred, ...DIR_TIE_BREAK, OPPOSITE[ghost.dir]]) {
    if (!tryDirs.includes(dir)) tryDirs.push(dir)
  }

  for (const dir of tryDirs) {
    const { dx, dy } = DELTA[dir]
    let nx = ghost.x + dx
    let ny = ghost.y + dy
    if (dir === "left" || dir === "right") nx = wrapX(width, nx)
    if (!isWalkable(grid, nx, ny)) continue
    if (blocked.has(posKey(nx, ny))) continue
    return { ...ghost, x: nx, y: ny, dir, mode }
  }

  return { ...ghost, mode }
}

function moveGhosts(state: PacmanGameState): PacmanGameState {
  const frightened = state.frightenedSteps > 0
  const scatter = !frightened && state.ghostStep % 200 < 60
  const blocked = new Set<string>()
  const ghosts: Ghost[] = []

  for (const ghost of state.ghosts) {
    const home = state.ghostStarts[ghost.id]
    const next = applyGhostStep(
      state.grid,
      state.width,
      ghost,
      frightened,
      scatter,
      state.pacman,
      home,
      blocked,
    )
    ghosts.push(next)
    blocked.add(posKey(next.x, next.y))
  }

  return { ...state, ghosts }
}

function resolveCollisions(state: PacmanGameState): PacmanGameState {
  let score = state.score
  let lives = state.lives
  let status = state.status
  let frightenedEaten = 0
  let lethalHit = false

  const ghosts = state.ghosts.map((g) => {
    if (g.x !== state.pacman.x || g.y !== state.pacman.y) return g
    if (g.mode === "frightened") {
      frightenedEaten += 1
      const points = FRIGHTENED_GHOST_POINTS[Math.min(frightenedEaten - 1, 3)]
      score += points
      return { ...g, mode: "eaten" as GhostMode }
    }
    if (g.mode !== "eaten") {
      lethalHit = true
    }
    return g
  })

  if (lethalHit) {
    lives -= 1
    status = lives <= 0 ? "lost" : "ready"
  }

  if (lives < state.lives && status !== "lost") {
    return {
      ...state,
      score,
      lives,
      status,
      frightenedSteps: 0,
      pacman: {
        x: state.pacmanStart.x,
        y: state.pacmanStart.y,
        dir: "left",
        nextDir: "left",
      },
      ghosts: initialGhosts(state.ghostStarts),
    }
  }

  return { ...state, score, lives, status, ghosts }
}

/** Advance Pac-Man one tile (player input). */
export function stepPacmanGame(state: PacmanGameState): PacmanGameState {
  if (state.status !== "playing" && state.status !== "ready") return state

  let next = state.status === "ready" ? { ...state, status: "playing" as const } : state

  next = movePacman(next)
  next = eatAt(next)
  if (next.status === "won") return next

  next = { ...next, step: next.step + 1 }
  return resolveCollisions(next)
}

/** Advance each ghost one tile on the ghost clock. */
export function stepGhostsGame(state: PacmanGameState): PacmanGameState {
  if (state.status !== "playing") return state

  let next = moveGhosts(state)
  next = {
    ...next,
    ghostStep: next.ghostStep + 1,
    frightenedSteps: Math.max(0, next.frightenedSteps - 1),
  }

  if (next.frightenedSteps === 0) {
    next = {
      ...next,
      ghosts: next.ghosts.map((g) =>
        g.mode === "frightened" ? { ...g, mode: "chase" } : g,
      ),
    }
  }

  return resolveCollisions(next)
}

export function pacmanMouthRotation(dir: Direction): number {
  switch (dir) {
    case "right":
      return 0
    case "down":
      return 90
    case "left":
      return 180
    case "up":
      return 270
  }
}
