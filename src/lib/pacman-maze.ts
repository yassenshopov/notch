export type CellKind = "wall" | "pellet" | "power" | "empty"

export const MAZE_WIDTH = 19
export const MAZE_HEIGHT = 23

export type PacmanMazeLayout = {
  grid: CellKind[][]
  width: number
  height: number
  pelletsLeft: number
  pacmanStart: { x: number; y: number }
  ghostStarts: { x: number; y: number; color: string }[]
}

const GHOST_COLORS = ["#ef4444", "#22d3ee", "#f472b6"]

function shuffle<T>(items: T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function mirrorX(x: number) {
  return MAZE_WIDTH - 1 - x
}

function setPath(walls: boolean[][], x: number, y: number) {
  if (x <= 0 || x >= MAZE_WIDTH - 1 || y <= 0 || y >= MAZE_HEIGHT - 1) return
  walls[y][x] = false
  const mx = mirrorX(x)
  if (mx !== x) walls[y][mx] = false
}

function setWall(walls: boolean[][], x: number, y: number) {
  if (x <= 0 || x >= MAZE_WIDTH - 1 || y <= 0 || y >= MAZE_HEIGHT - 1) return
  walls[y][x] = true
  const mx = mirrorX(x)
  if (mx !== x) walls[y][mx] = true
}

function carveSymmetricMaze(walls: boolean[][]): void {
  const visited = new Set<string>()
  const key = (x: number, y: number) => `${x},${y}`

  const dfs = (x: number, y: number) => {
    visited.add(key(x, y))
    setPath(walls, x, y)

    for (const { dx, dy } of shuffle([
      { dx: 0, dy: -2 },
      { dx: 2, dy: 0 },
      { dx: 0, dy: 2 },
      { dx: -2, dy: 0 },
    ])) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 1 || nx > 9 || ny < 1 || ny > MAZE_HEIGHT - 2) continue
      if (nx % 2 === 0 || ny % 2 === 0) continue
      if (visited.has(key(nx, ny))) continue
      setPath(walls, x + dx / 2, y + dy / 2)
      dfs(nx, ny)
    }
  }

  for (let y = 1; y < MAZE_HEIGHT - 1; y += 2) {
    for (let x = 1; x <= 9; x += 2) {
      if (!visited.has(key(x, y))) dfs(x, y)
    }
  }
}

function addLoops(walls: boolean[][]): void {
  for (let y = 2; y < MAZE_HEIGHT - 2; y += 1) {
    for (let x = 2; x <= 9; x += 1) {
      if (!walls[y][x]) continue
      const leftRight = !walls[y][x - 1] && !walls[y][x + 1]
      const upDown = !walls[y - 1][x] && !walls[y + 1][x]
      if (!leftRight && !upDown) continue
      if (Math.random() > 0.14) continue
      setPath(walls, x, y)
    }
  }
}

function penInteriorKeys(): Set<string> {
  const keys = new Set<string>()
  for (let y = 11; y <= 13; y += 1) {
    for (let x = 8; x <= 10; x += 1) {
      keys.add(`${x},${y}`)
    }
  }
  return keys
}

function carveGhostHouse(walls: boolean[][]): void {
  for (let y = 11; y <= 13; y += 1) {
    for (let x = 8; x <= 10; x += 1) {
      setPath(walls, x, y)
    }
  }
  setPath(walls, 9, 10)
  setPath(walls, 9, 9)

  for (let x = 7; x <= 11; x += 1) {
    setWall(walls, x, 10)
  }
  setPath(walls, 9, 10)
  setPath(walls, 9, 9)

  for (let y = 11; y <= 13; y += 1) {
    setWall(walls, 7, y)
    setWall(walls, 11, y)
  }
  for (let x = 7; x <= 11; x += 1) {
    setWall(walls, x, 14)
  }
}

function isWalkableCell(grid: CellKind[][], x: number, y: number) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[0].length) return false
  return grid[y][x] !== "wall"
}

function floodReachable(grid: CellKind[][], sx: number, sy: number) {
  const seen = new Set<string>()
  const q: { x: number; y: number }[] = [{ x: sx, y: sy }]
  const key = (x: number, y: number) => `${x},${y}`

  while (q.length > 0) {
    const { x, y } = q.pop()!
    const k = key(x, y)
    if (seen.has(k)) continue
    if (!isWalkableCell(grid, x, y)) continue
    seen.add(k)
    q.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 })
  }
  return seen
}

function wallsToGrid(
  walls: boolean[][],
  penCells: Set<string>,
  power: { x: number; y: number }[],
): CellKind[][] {
  const powerSet = new Set(power.map((p) => `${p.x},${p.y}`))
  return walls.map((row, y) =>
    row.map((wall, x) => {
      if (wall) return "wall"
      if (penCells.has(`${x},${y}`)) return "empty"
      if (powerSet.has(`${x},${y}`)) return "power"
      return "pellet"
    }),
  )
}

function pickPowerPellets(
  walkableKeys: Set<string>,
  pacmanStart: { x: number; y: number },
): { x: number; y: number }[] {
  const candidates: { x: number; y: number; score: number }[] = []
  for (const k of walkableKeys) {
    const [xs, ys] = k.split(",")
    const x = Number(xs)
    const y = Number(ys)
    const dist = Math.abs(x - pacmanStart.x) + Math.abs(y - pacmanStart.y)
    if (dist < 10) continue
    candidates.push({ x, y, score: dist })
  }
  candidates.sort((a, b) => b.score - a.score)

  const picked: { x: number; y: number }[] = []
  for (const c of candidates) {
    if (picked.length >= 4) break
    const tooClose = picked.some((p) => Math.abs(p.x - c.x) + Math.abs(p.y - c.y) < 7)
    if (tooClose) continue
    picked.push({ x: c.x, y: c.y })
  }
  return picked
}

function findPacmanStart(walkableKeys: Set<string>): { x: number; y: number } | null {
  const ranked: { x: number; y: number; yScore: number; xScore: number }[] = []
  for (const k of walkableKeys) {
    const [xs, ys] = k.split(",")
    const x = Number(xs)
    const y = Number(ys)
    if (y < MAZE_HEIGHT - 5) continue
    ranked.push({ x, y, yScore: y, xScore: Math.abs(x - 9) })
  }
  ranked.sort((a, b) => b.yScore - a.yScore || a.xScore - b.xScore)
  const best = ranked[0]
  return best ? { x: best.x, y: best.y } : null
}

function countPellets(grid: CellKind[][]) {
  let n = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell === "pellet" || cell === "power") n += 1
    }
  }
  return n
}

function validateLayout(layout: PacmanMazeLayout): boolean {
  const { grid, pacmanStart } = layout
  const reachable = floodReachable(grid, pacmanStart.x, pacmanStart.y)

  for (let y = 0; y < MAZE_HEIGHT; y += 1) {
    for (let x = 0; x < MAZE_WIDTH; x += 1) {
      const cell = grid[y][x]
      if (cell !== "pellet" && cell !== "power") continue
      if (!reachable.has(`${x},${y}`)) return false
    }
  }

  const doorReach = floodReachable(grid, 9, 9)
  const pen = penInteriorKeys()
  for (const k of pen) {
    if (!doorReach.has(k)) return false
  }

  return layout.pelletsLeft >= 75
}

function tryGenerateOnce(): PacmanMazeLayout | null {
  const walls: boolean[][] = Array.from({ length: MAZE_HEIGHT }, () =>
    Array.from({ length: MAZE_WIDTH }, () => true),
  )

  carveSymmetricMaze(walls)
  addLoops(walls)
  carveGhostHouse(walls)

  const penCells = penInteriorKeys()
  const walkable = new Set<string>()
  for (let y = 1; y < MAZE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < MAZE_WIDTH - 1; x += 1) {
      if (!walls[y][x]) walkable.add(`${x},${y}`)
    }
  }

  const pacmanStart = findPacmanStart(walkable)
  if (!pacmanStart) return null

  const fromStart = floodReachable(
    wallsToGrid(walls, penCells, []),
    pacmanStart.x,
    pacmanStart.y,
  )
  const power = pickPowerPellets(fromStart, pacmanStart)
  const grid = wallsToGrid(walls, penCells, power)
  const pelletsLeft = countPellets(grid)

  const layout: PacmanMazeLayout = {
    grid,
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    pelletsLeft,
    pacmanStart,
    ghostStarts: [
      { x: 9, y: 12, color: GHOST_COLORS[0] },
      { x: 8, y: 13, color: GHOST_COLORS[1] },
      { x: 10, y: 13, color: GHOST_COLORS[2] },
    ],
  }

  return validateLayout(layout) ? layout : null
}

export function generatePacmanMaze(): PacmanMazeLayout {
  for (let i = 0; i < 48; i += 1) {
    const layout = tryGenerateOnce()
    if (layout) return layout
  }

  const walls: boolean[][] = Array.from({ length: MAZE_HEIGHT }, () =>
    Array.from({ length: MAZE_WIDTH }, () => true),
  )
  carveSymmetricMaze(walls)
  carveGhostHouse(walls)
  const penCells = penInteriorKeys()
  const grid = wallsToGrid(walls, penCells, [
    { x: 2, y: 2 },
    { x: 16, y: 2 },
    { x: 2, y: 20 },
    { x: 16, y: 20 },
  ])
  return {
    grid,
    width: MAZE_WIDTH,
    height: MAZE_HEIGHT,
    pelletsLeft: countPellets(grid),
    pacmanStart: { x: 2, y: 20 },
    ghostStarts: [
      { x: 9, y: 12, color: GHOST_COLORS[0] },
      { x: 8, y: 13, color: GHOST_COLORS[1] },
      { x: 10, y: 13, color: GHOST_COLORS[2] },
    ],
  }
}
