const fs = require("fs")
const path = require("path")
const { execFile } = require("child_process")
const { promisify } = require("util")
const { PNG } = require("pngjs")

const execFileAsync = promisify(execFile)

const DEFAULT_STYLE = {
  backgroundColor: "#ffffff",
  passedColor: "#373737",
  futureColor: "#d2d2d2",
  todayColor: "#ff5f00",
  cellSize: 13,
  gap: 6,
  cornerRadius: 2,
  shape: "square",
}

function psEncode(script) {
  return Buffer.from(script, "utf16le").toString("base64")
}

function daysInYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function parseHexColor(input, fallback) {
  if (typeof input !== "string") return { ...fallback }
  const raw = input.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return { ...fallback }
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  }
}

function resolveStyle(partial) {
  const base = partial && typeof partial === "object" ? partial : {}
  const bg = parseHexColor(base.backgroundColor ?? DEFAULT_STYLE.backgroundColor, { r: 255, g: 255, b: 255 })
  const passed = parseHexColor(base.passedColor ?? DEFAULT_STYLE.passedColor, { r: 55, g: 55, b: 55 })
  const future = parseHexColor(base.futureColor ?? DEFAULT_STYLE.futureColor, { r: 210, g: 210, b: 210 })
  const today = parseHexColor(base.todayColor ?? DEFAULT_STYLE.todayColor, { r: 255, g: 95, b: 0 })
  const cellSize = clamp(Number(base.cellSize) || DEFAULT_STYLE.cellSize, 6, 28)
  const gap = clamp(Number(base.gap) || DEFAULT_STYLE.gap, 2, 20)
  const cornerRadius = clamp(Number(base.cornerRadius) ?? DEFAULT_STYLE.cornerRadius, 0, 12)
  const shape = base.shape === "circle" ? "circle" : "square"
  return { bg, passed, future, today, cellSize, gap, cornerRadius, shape }
}

/** Monday = 0 … Sunday = 6 */
function weekdayMondayFirst(date) {
  return (date.getDay() + 6) % 7
}

function dateAtLocalMidnight(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function dayIndex(from, to) {
  const ms =
    dateAtLocalMidnight(to.getFullYear(), to.getMonth(), to.getDate()) -
    dateAtLocalMidnight(from.getFullYear(), from.getMonth(), from.getDate())
  return Math.round(ms / 86_400_000)
}

function setPixel(data, width, x, y, color) {
  if (x < 0 || y < 0) return
  const i = (width * y + x) << 2
  data[i] = color.r
  data[i + 1] = color.g
  data[i + 2] = color.b
  data[i + 3] = 255
}

function fillBackground(data, color) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = color.r
    data[i + 1] = color.g
    data[i + 2] = color.b
    data[i + 3] = 255
  }
}

function fillRoundedRect(data, width, height, x0, y0, size, radius, color) {
  const x1 = x0 + size - 1
  const y1 = y0 + size - 1
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      if (radius <= 0) {
        setPixel(data, width, x, y, color)
        continue
      }
      const inCorner =
        (x < x0 + radius && y < y0 + radius) ||
        (x > x1 - radius && y < y0 + radius) ||
        (x < x0 + radius && y > y1 - radius) ||
        (x > x1 - radius && y > y1 - radius)
      if (!inCorner) {
        setPixel(data, width, x, y, color)
        continue
      }
      let cx = x0 + radius
      let cy = y0 + radius
      if (x > x1 - radius) cx = x1 - radius
      if (y > y1 - radius) cy = y1 - radius
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= radius * radius + radius * 0.25) {
        setPixel(data, width, x, y, color)
      }
    }
  }
}

function fillCircle(data, width, height, cx, cy, radius, color) {
  const r = Math.max(1, radius)
  const y0 = Math.floor(cy - r)
  const y1 = Math.ceil(cy + r)
  const x0 = Math.floor(cx - r)
  const x1 = Math.ceil(cx + r)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r * r + 0.25) {
        setPixel(data, width, x, y, color)
      }
    }
  }
}

function drawCell(data, width, height, x0, y0, style, color) {
  const size = style.cellSize
  if (style.shape === "circle") {
    fillCircle(data, width, height, x0 + size / 2, y0 + size / 2, size / 2, color)
    return
  }
  const radius = Math.min(style.cornerRadius, Math.floor(size / 2))
  fillRoundedRect(data, width, height, x0, y0, size, radius, color)
}

/**
 * @param {{ year?: number, width: number, height: number, outputPath: string, style?: Record<string, unknown> }} options
 */
async function generateYearWallpaper(options) {
  const year = options.year ?? new Date().getFullYear()
  const width = Math.max(800, Math.round(options.width))
  const height = Math.max(600, Math.round(options.height))
  const style = resolveStyle(options.style)

  const yearStart = dateAtLocalMidnight(year, 0, 1)
  const yearEnd = dateAtLocalMidnight(year, 11, 31)
  const today = dateAtLocalMidnight(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  )

  let passedThrough
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

  const png = new PNG({ width, height, colorType: 6 })
  fillBackground(png.data, style.bg)

  let day = yearStart
  while (day <= yearEnd) {
    const col = Math.floor(dayIndex(gridStart, day) / 7)
    const row = weekdayMondayFirst(day)
    const x0 = originX + col * step
    const y0 = originY + row * step

    let color
    if (today.getFullYear() === year && sameLocalDay(day, today)) {
      color = style.today
    } else if (dayIndex(yearStart, day) <= dayIndex(yearStart, passedThrough)) {
      color = style.passed
    } else {
      color = style.future
    }

    drawCell(png.data, width, height, x0, y0, style, color)
    day = addDays(day, 1)
  }

  const outDir = path.dirname(options.outputPath)
  await fs.promises.mkdir(outDir, { recursive: true })
  await new Promise((resolve, reject) => {
    png
      .pack()
      .pipe(fs.createWriteStream(options.outputPath))
      .on("finish", resolve)
      .on("error", reject)
  })

  const passed =
    passedThrough < yearStart
      ? 0
      : Math.min(dayIndex(yearStart, passedThrough) + 1, daysInYear(year))

  return {
    ok: true,
    path: options.outputPath,
    year,
    passed,
    total: daysInYear(year),
    weeks: numWeeks,
  }
}

async function setWindowsWallpaper(imagePath) {
  const normalized = path.resolve(imagePath).replace(/'/g, "''")
  const script = `
$path = '${normalized}'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class NotchWallpaper {
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);
}
"@
if (-not (Test-Path -LiteralPath $path)) { throw "Wallpaper file not found: $path" }
$ok = [NotchWallpaper]::SystemParametersInfo(20, 0, $path, 3)
if (-not $ok) {
  $err = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
  throw "SystemParametersInfo failed (win32 $err)"
}
Write-Output "ok"
`
  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      psEncode(script),
    ],
    { windowsHide: true, timeout: 20_000, encoding: "utf8" },
  )
}

/**
 * @param {{ width: number, height: number, outputPath: string, apply?: boolean, year?: number, style?: Record<string, unknown>, applyPath?: string }} options
 */
async function regenerateYearWallpaper(options) {
  const result = await generateYearWallpaper(options)
  result.applied = false
  result.applyError = undefined

  if (!options.apply || process.platform !== "win32") {
    return result
  }

  const applyTarget = options.applyPath ?? result.path
  try {
    if (applyTarget !== result.path) {
      await fs.promises.mkdir(path.dirname(applyTarget), { recursive: true })
      await fs.promises.copyFile(result.path, applyTarget)
    }
    await setWindowsWallpaper(applyTarget)
    result.applied = true
  } catch (err) {
    result.applyError = err instanceof Error ? err.message : "apply_failed"
  }

  return result
}

module.exports = {
  DEFAULT_STYLE,
  resolveStyle,
  generateYearWallpaper,
  regenerateYearWallpaper,
  setWindowsWallpaper,
}
