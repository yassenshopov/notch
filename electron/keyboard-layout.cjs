/**
 * Windows: poll foreground keyboard layout from the main process (no PowerShell).
 */
const koffi = require("koffi")

const user32 = koffi.load("user32.dll")
const kernel32 = koffi.load("kernel32.dll")

const GetForegroundWindow = user32.func("void * __stdcall GetForegroundWindow()")
const GetWindowThreadProcessId = user32.func(
  "uint32 __stdcall GetWindowThreadProcessId(void *hWnd, void *processId)",
)
const GetKeyboardLayout = user32.func("void * __stdcall GetKeyboardLayout(uint32 idThread)")
const AttachThreadInput = user32.func(
  "bool __stdcall AttachThreadInput(uint32 attach, uint32 attachTo, bool attachFlag)",
)
const GetCurrentThreadId = kernel32.func("uint32 __stdcall GetCurrentThreadId()")

/** Primary language id (LANGID & 0x3ff) → ISO 639-1 */
const PRIMARY_LANG = {
  0x01: "ar",
  0x02: "bg",
  0x04: "zh",
  0x07: "de",
  0x09: "en",
  0x0a: "es",
  0x0c: "fr",
  0x10: "it",
  0x11: "ja",
  0x12: "ko",
  0x13: "nl",
  0x19: "ru",
  0x1f: "tr",
  0x22: "uk",
}

/** @type {ReturnType<typeof setInterval> | null} */
let pollTimer = null
/** @type {((layout: { layoutId: string; lang: string; label: string }) => void) | null} */
let onChange = null
let lastKey = ""
let lastLayout = null
let primed = false

function layoutLabel(lang) {
  const code = String(lang || "")
    .trim()
    .toLowerCase()
  if (!code) return "?"
  if (code.length <= 3) return code.toUpperCase()
  return code.slice(0, 3).toUpperCase()
}

function langFromId(langId) {
  const primary = langId & 0x3ff
  return PRIMARY_LANG[primary] ?? `x${primary.toString(16)}`
}

function readForegroundLayout() {
  const hwnd = GetForegroundWindow()
  if (!hwnd) return null

  const tid = GetWindowThreadProcessId(hwnd, null)
  if (!tid) return null

  const self = GetCurrentThreadId()
  AttachThreadInput(self, tid, true)
  const hkl = GetKeyboardLayout(tid)
  AttachThreadInput(self, tid, false)

  const hklBits = Number(koffi.address(hkl) & 0xffffffffn)
  if (!hklBits) return null

  const langId = hklBits & 0xffff
  const lang = langFromId(langId)

  return {
    layoutId: (hklBits >>> 0).toString(16).padStart(8, "0"),
    lang,
    label: layoutLabel(lang),
  }
}

function emitIfChanged(layout) {
  const key = layout.layoutId || layout.lang
  if (!key) return
  if (!primed) {
    primed = true
    lastKey = key
    lastLayout = layout
    return
  }
  if (key === lastKey) return
  lastKey = key
  lastLayout = layout
  onChange?.(layout)
}

function tick() {
  try {
    const layout = readForegroundLayout()
    if (layout) emitIfChanged(layout)
  } catch (err) {
    console.warn("[keyboard-layout]", err instanceof Error ? err.message : err)
  }
}

function startWatcher(changeCb) {
  onChange = changeCb
  if (process.platform !== "win32") {
    return () => {
      onChange = null
    }
  }

  if (pollTimer) clearInterval(pollTimer)
  primed = false
  lastKey = ""
  lastLayout = null

  tick()
  pollTimer = setInterval(tick, 150)

  return () => {
    onChange = null
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    lastKey = ""
    lastLayout = null
    primed = false
  }
}

function getCurrent() {
  if (process.platform !== "win32") {
    return { supported: false, layout: null }
  }
  const live = readForegroundLayout()
  return { supported: true, layout: live ?? lastLayout }
}

module.exports = { startWatcher, getCurrent }
