import type { YearWallpaperSettings } from "./year-wallpaper"

function daysInYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function parseHexColor(input: string | undefined, fallback: string) {
  if (typeof input !== "string") return fallback
  const raw = input.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return fallback
  return `#${raw.toLowerCase()}`
}

function resolveDrawStyle(partial: YearWallpaperSettings) {
  return {
    backgroundColor: parseHexColor(partial.backgroundColor, "#ffffff"),
    passedColor: parseHexColor(partial.passedColor, "#373737"),
    futureColor: parseHexColor(partial.futureColor, "#d2d2d2"),
    todayColor: parseHexColor(partial.todayColor, "#ff5f00"),
    cellSize: clamp(Number(partial.cellSize) || 13, 6, 28),
    gap: clamp(Number(partial.gap) || 6, 2, 20),
    cornerRadius: clamp(Number(partial.cornerRadius) ?? 2, 0, 12),
    shape: partial.shape === "circle" ? "circle" : "square",
  }
}

/** Monday = 0 … Sunday = 6 */
function weekdayMondayFirst(date: Date) {
  return (date.getDay() + 6) % 7
}

function dateAtLocalMidnight(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dayIndex(from: Date, to: Date) {
  const ms =
    dateAtLocalMidnight(to.getFullYear(), to.getMonth(), to.getDate()).getTime() -
    dateAtLocalMidnight(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  return Math.round(ms / 86_400_000)
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  style: ReturnType<typeof resolveDrawStyle>,
  color: string,
) {
  const size = style.cellSize
  ctx.fillStyle = color
  if (style.shape === "circle") {
    ctx.beginPath()
    ctx.arc(x0 + size / 2, y0 + size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const radius = Math.min(style.cornerRadius, Math.floor(size / 2))
  ctx.beginPath()
  ctx.roundRect(x0, y0, size, size, radius)
  ctx.fill()
}

export function drawYearWallpaper(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  year: number,
  settings: YearWallpaperSettings,
) {
  const style = resolveDrawStyle(settings)

  const yearStart = dateAtLocalMidnight(year, 0, 1)
  const yearEnd = dateAtLocalMidnight(year, 11, 31)
  const today = dateAtLocalMidnight(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )

  let passedThrough: Date
  if (today.getFullYear() < year) {
    passedThrough = addDays(yearStart, -1)
  } else if (today.getFullYear() > year) {
    passedThrough = yearEnd
  } else {
    passedThrough = today
  }

  const gridStart = addDays(yearStart, -weekdayMondayFirst(yearStart))
  const gridEnd = addDays(yearEnd, 6 - weekdayMondayFirst(yearEnd))
  const numWeeks = Math.floor((dayIndex(gridStart, gridEnd) + 1) / 7)

  const step = style.cellSize + style.gap
  const gridW = (numWeeks - 1) * step + style.cellSize
  const gridH = (7 - 1) * step + style.cellSize
  const originX = Math.round((width - gridW) / 2)
  const originY = Math.round((height - gridH) / 2)

  ctx.fillStyle = style.backgroundColor
  ctx.fillRect(0, 0, width, height)

  let day = yearStart
  while (day <= yearEnd) {
    const col = Math.floor(dayIndex(gridStart, day) / 7)
    const row = weekdayMondayFirst(day)
    const x0 = originX + col * step
    const y0 = originY + row * step

    let color: string
    if (today.getFullYear() === year && sameLocalDay(day, today)) {
      color = style.todayColor
    } else if (dayIndex(yearStart, day) <= dayIndex(yearStart, passedThrough)) {
      color = style.passedColor
    } else {
      color = style.futureColor
    }

    drawCell(ctx, x0, y0, style, color)
    day = addDays(day, 1)
  }

  return {
    passed:
      passedThrough < yearStart
        ? 0
        : Math.min(dayIndex(yearStart, passedThrough) + 1, daysInYear(year)),
    total: daysInYear(year),
  }
}

export function paintYearWallpaperPreview(
  canvas: HTMLCanvasElement,
  year: number,
  settings: YearWallpaperSettings,
) {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(320, Math.round(rect.width * dpr))
  const height = Math.max(180, Math.round(rect.height * dpr))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  return drawYearWallpaper(ctx, width, height, year, settings)
}
