import { Icon } from "@iconify/react"
import { CloudSun, Settings, SlidersHorizontal } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { useSettings } from "../config/settings-store"
import { useSpotify } from "../hooks/useSpotify"
import { useTheme } from "../hooks/useTheme"
import { useWeather } from "../hooks/useWeather"
import {
  ISLAND_EASE,
  ISLAND_MORPH_MS,
  islandContentIn,
  islandContentOut,
  islandMorph,
} from "../lib/island-motion"
import { cn, formatTemp } from "../lib/utils"
import type { IslandFace } from "../config/settings"
import { useAlbumPalette } from "../hooks/useAlbumPalette"
import { useBattery } from "../hooks/useBattery"
import { formatIslandTime, useClock } from "../hooks/useClock"
import { useCursor } from "../hooks/useCursor"
import { useIslandRotation } from "../hooks/useIslandRotation"
import { useOccasionalSmile } from "../hooks/useOccasionalSmile"
import { BatteryIndicator } from "./BatteryIndicator"
import { BotSmile } from "./BotSmile"
import { ControlsPanel } from "./ControlsPanel"
import { CursorPanel } from "./CursorPanel"
import { EqualizerBars } from "./EqualizerBars"
import { SettingsPanel } from "./SettingsPanel"
import { SpotifyPanel } from "./SpotifyPanel"
import { WeatherIcon } from "./WeatherIcon"
import { WeatherPanel } from "./WeatherPanel"

type Panel = "weather" | "spotify" | "cursor" | "controls" | "settings"

const PANEL_ORDER: Record<Panel, number> = {
  weather: 0,
  spotify: 1,
  cursor: 2,
  controls: 3,
  settings: 4,
}

/** Icon button size (size-9) + gap-1.5 — keeps the drop aligned to each slot */
const RAIL_TAB = 36
const RAIL_GAP = 6
const RAIL_STRIDE = RAIL_TAB + RAIL_GAP

const panelTransition = {
  duration: 0.28,
  ease: ISLAND_EASE,
}

export function Notch() {
  const [expanded, setExpanded] = useState(false)
  /** OS shell stays fullscreen until the pill morph finishes collapsing */
  const [shellExpanded, setShellExpanded] = useState(false)
  const [panelOverride, setPanelOverride] = useState<Panel | null>(null)
  const [connecting, setConnecting] = useState(false)
  const settings = useSettings()
  const { data, loading, error, refresh } = useWeather()
  const { status, playing, connect, action, disconnect } = useSpotify()
  const battery = useBattery()
  const dark = useTheme()
  const smiling = useOccasionalSmile(!expanded && !playing)

  const batteryAvailable = battery.supported && battery.ready
  const islandFaces = useMemo(() => {
    const faces: IslandFace[] = []
    const enabled = settings.island.faces
    if (enabled.weather && data) faces.push("weather")
    if (enabled.battery && batteryAvailable) faces.push("battery")
    if (enabled.clock) faces.push("clock")
    return faces
  }, [settings.island.faces, data, batteryAvailable])

  const rotateEnabled = !expanded && !playing && !smiling
  const islandFace = useIslandRotation({
    enabled: rotateEnabled,
    intervalMs: settings.island.rotateIntervalMs,
    available: islandFaces,
  })
  const clockNow = useClock(rotateEnabled && islandFace === "clock")

  const collapsedWidth =
    settings.collapsed.width + (playing ? settings.collapsed.musicExtraWidth : 0)

  const activePanel: Panel = useMemo(() => {
    if (panelOverride) return panelOverride
    return playing ? "spotify" : "weather"
  }, [panelOverride, playing])

  const {
    status: cursorStatus,
    loading: cursorLoading,
    analyticsLoading: cursorAnalyticsLoading,
    refresh: refreshCursor,
  } = useCursor(expanded && activePanel === "cursor")

  const prevActivePanel = useRef(activePanel)
  const panelDirRef = useRef(0)
  if (prevActivePanel.current !== activePanel) {
    panelDirRef.current =
      PANEL_ORDER[activePanel] - PANEL_ORDER[prevActivePanel.current]
    prevActivePanel.current = activePanel
  }
  const panelDir = panelDirRef.current

  const spotifyPanelThemed = expanded && activePanel === "spotify"
  // Prefetch while playing so collapsed + Spotify panel can tint immediately
  const albumPalette = useAlbumPalette(
    playing || spotifyPanelThemed ? status.track?.artUrl : null,
  )
  // Collapsed pill while playing, or expanded Spotify panel — not weather/settings
  const albumThemed = Boolean(
    albumPalette && ((!expanded && playing) || spotifyPanelThemed),
  )

  const prevPlaying = useRef(playing)
  const expandedRef = useRef(expanded)
  expandedRef.current = expanded
  /** Bumps on each expand/collapse so late async expand can’t reopen */
  const morphGen = useRef(0)
  /** Skip blur/backdrop dismiss while the shell/pill are morphing */
  const ignoreDismissUntil = useRef(0)

  const collapse = () => {
    morphGen.current += 1
    ignoreDismissUntil.current = Date.now() + ISLAND_MORPH_MS + 120
    setExpanded(false)
    // shellExpanded stays true until onMorphComplete
  }

  const expand = async () => {
    const gen = ++morphGen.current
    ignoreDismissUntil.current = Date.now() + ISLAND_MORPH_MS + 200
    setShellExpanded(true)
    // Wait for fullscreen shell before morphing so the pill isn’t clipped
    await window.notch?.setExpanded({
      expanded: true,
      width: settings.expanded.width,
      height: settings.expanded.height,
    })
    if (morphGen.current !== gen) return
    setExpanded(true)
  }

  const onMorphComplete = () => {
    if (expandedRef.current) return
    setShellExpanded(false)
  }

  useEffect(() => {
    if (prevPlaying.current === playing) return
    prevPlaying.current = playing
    setPanelOverride((current) => (current === "settings" ? current : null))
  }, [playing])

  // Drive the Electron shell from shellExpanded — never shrink it mid-morph.
  useEffect(() => {
    void window.notch?.setExpanded({
      expanded: shellExpanded,
      width: shellExpanded ? settings.expanded.width : collapsedWidth,
      height: shellExpanded ? settings.expanded.height : settings.collapsed.height,
    })
  }, [
    shellExpanded,
    collapsedWidth,
    settings.expanded.width,
    settings.expanded.height,
    settings.collapsed.height,
  ])

  // Clicking another app / the desktop blurs us — treat as outside dismiss.
  useEffect(() => {
    return window.notch?.onBlur?.(() => {
      if (Date.now() < ignoreDismissUntil.current) return
      morphGen.current += 1
      ignoreDismissUntil.current = Date.now() + ISLAND_MORPH_MS + 120
      setExpanded(false)
    })
  }, [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panelOverride === "settings") setPanelOverride(null)
        else collapse()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded, panelOverride])

  const unit = settings.temperatureUnit
  const fill = albumThemed && albumPalette ? albumPalette.bg : dark ? "#111111" : "#f7f7f5"
  const themedFg = albumThemed && albumPalette ? albumPalette.fg : null
  // Apple compact island = true capsule (r = h/2). Expanded uses a tighter
  // continuous corner (~22) — the old 32 looked ballooned.
  const collapsedH = settings.collapsed.height
  const bottomRadius = expanded ? 22 : collapsedH / 2
  const earSize = expanded ? 12 : 10
  const fillTransition = {
    ...islandMorph,
    duration: 0.45,
  }

  const railThemed = Boolean(albumPalette && spotifyPanelThemed)

  return (
    <div
      className={cn(
        "flex h-full w-full items-start justify-center select-none",
        // Windows ignores clicks on fully transparent pixels — keep a whisper of fill
        expanded && "bg-black/[0.02]",
      )}
      onPointerDown={(e) => {
        // Only dismiss when the press is on the backdrop itself, not the notch
        if (!expanded || e.target !== e.currentTarget) return
        if (Date.now() < ignoreDismissUntil.current) return
        collapse()
      }}
    >
      <div className="relative">
      <motion.div
        initial={false}
        animate={{
          width: expanded ? settings.expanded.width : collapsedWidth,
          height: expanded ? settings.expanded.height : settings.collapsed.height,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        }}
        transition={islandMorph}
        onAnimationComplete={onMorphComplete}
        onPointerDown={(e) => {
          // Keep presses on the panel from hitting the backdrop
          e.stopPropagation()
          if (!expanded) void expand()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          refresh()
        }}
        style={
          {
            "--notch-fill": fill,
            "--ear": `${earSize}px`,
            "--battery-bolt": fill,
            color: themedFg ?? undefined,
            transformOrigin: "top center",
            willChange: "width, height, border-radius",
          } as CSSProperties
        }
        className={cn(
          "notch-fold relative overflow-visible",
          !themedFg && (dark ? "text-white" : "text-[#111111]"),
          expanded ? "cursor-default" : "cursor-pointer",
        )}
      >
        {/* Concave ears — Apple-style blend into the top screen edge */}
        <span className="notch-ear notch-ear--left" aria-hidden />
        <span className="notch-ear notch-ear--right" aria-hidden />

        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{
            backgroundColor: fill,
            borderBottomLeftRadius: bottomRadius,
            borderBottomRightRadius: bottomRadius,
          }}
          transition={albumThemed ? fillTransition : islandMorph}
          style={
            !dark && !albumThemed
              ? {
                  boxShadow:
                    "inset 0 -1px 0 rgba(0,0,0,0.05), inset 1px 0 0 rgba(0,0,0,0.03), inset -1px 0 0 rgba(0,0,0,0.03)",
                }
              : undefined
          }
        />

        {/* Cover art flush left (bleeds into the ear) — fades into the album fill */}
        <AnimatePresence initial={false}>
          {!expanded && playing && status.track?.artUrl ? (
            <motion.div
              key={status.track.artUrl}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-0 z-[4]"
              aria-hidden
            >
              {/* Pill body — clipped to the rounded bottom edge */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  borderBottomLeftRadius: bottomRadius,
                  borderBottomRightRadius: bottomRadius,
                }}
              >
                <img
                  src={status.track.artUrl}
                  alt=""
                  draggable={false}
                  className="absolute top-0 h-full object-cover"
                  style={{
                    left: -earSize,
                    width: 62 + earSize,
                    WebkitMaskImage:
                      "linear-gradient(to right, #000 0%, #000 68%, transparent 100%)",
                    maskImage:
                      "linear-gradient(to right, #000 0%, #000 68%, transparent 100%)",
                  }}
                />
              </div>
              {/* Left ear — same framing, scooped to match the island edge */}
              <div
                className="absolute top-0 overflow-hidden"
                style={{
                  left: -earSize,
                  width: earSize,
                  height: earSize,
                  WebkitMaskImage: `radial-gradient(circle at 0 100%, transparent ${earSize - 0.4}px, #000 ${earSize - 0.15}px)`,
                  maskImage: `radial-gradient(circle at 0 100%, transparent ${earSize - 0.4}px, #000 ${earSize - 0.15}px)`,
                }}
              >
                <img
                  src={status.track.artUrl}
                  alt=""
                  draggable={false}
                  className="absolute left-0 top-0 object-cover"
                  style={{
                    width: 62 + earSize,
                    height: settings.collapsed.height,
                  }}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="sync" initial={false}>
          {!expanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={islandContentOut}
              className="relative z-10 flex h-full items-center justify-center px-4"
            >
              {loading && !data && islandFaces.length === 0 ? (
                <span
                  className={cn(
                    "text-[13px] font-medium tracking-wide",
                    dark ? "text-white/40" : "text-black/35",
                  )}
                >
                  …
                </span>
              ) : error && !data && !batteryAvailable && !settings.island.faces.clock ? (
                <span className="text-[12px] font-medium text-red-400">offline</span>
              ) : (
                <span
                  className="relative flex h-full min-w-[4.5rem] items-center justify-center"
                  style={
                    {
                      // Face uses notch fill as “skin”; eyes cut out in the opposite tone
                      "--bot-eye": themedFg ? fill : dark ? "#111111" : "#f7f7f5",
                      "--battery-bolt": fill,
                    } as CSSProperties
                  }
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {playing ? (
                      <motion.span
                        key="now-playing"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center"
                      >
                        <EqualizerBars active />
                      </motion.span>
                    ) : smiling ? (
                      <motion.span
                        key="smile"
                        initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.6, rotate: 8 }}
                        transition={{ type: "spring", stiffness: 460, damping: 22, mass: 0.6 }}
                        className="flex items-center justify-center"
                      >
                        <BotSmile className="size-4" />
                      </motion.span>
                    ) : islandFace === "battery" ? (
                      <motion.span
                        key="battery"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center"
                      >
                        <BatteryIndicator
                          level={battery.level}
                          charging={battery.charging}
                        />
                      </motion.span>
                    ) : islandFace === "clock" ? (
                      <motion.span
                        key="clock"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center"
                      >
                        <span className="text-[13px] font-semibold tracking-tight tabular-nums">
                          {formatIslandTime(clockNow, settings.clock.format)}
                        </span>
                      </motion.span>
                    ) : islandFace === "weather" && data ? (
                      <motion.span
                        key="weather"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2.5"
                      >
                        <WeatherIcon
                          code={data.code}
                          isDay={data.isDay}
                          className="size-[15px]"
                        />
                        <span className="text-[13px] font-semibold tracking-tight tabular-nums">
                          {formatTemp(data.temperature, unit)}
                        </span>
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </span>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={islandContentIn}
              className="relative z-10 flex h-full flex-col px-8 pb-6 pt-8"
            >
              <div className="relative min-h-0 flex-1">
                <AnimatePresence mode="wait" custom={panelDir} initial={false}>
                  <motion.div
                    key={activePanel}
                    custom={panelDir}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    variants={{
                      enter: (dir: number) => ({
                        opacity: 0,
                        y: dir >= 0 ? 14 : -14,
                      }),
                      center: { opacity: 1, y: 0 },
                      exit: (dir: number) => ({
                        opacity: 0,
                        y: dir >= 0 ? -10 : 10,
                      }),
                    }}
                    transition={panelTransition}
                    className="absolute inset-0 flex min-h-0 flex-col"
                  >
                    {activePanel === "settings" ? (
                      <SettingsPanel
                        spotifyConnected={status.connected}
                        spotifyConfigured={Boolean(status.configured)}
                        connecting={connecting}
                        onConnectSpotify={() => {
                          setConnecting(true)
                          void connect()
                            .catch(() => undefined)
                            .finally(() => setConnecting(false))
                        }}
                        onDisconnectSpotify={() => void disconnect()}
                      />
                    ) : activePanel === "cursor" ? (
                      <CursorPanel
                        status={cursorStatus}
                        loading={cursorLoading}
                        analyticsLoading={cursorAnalyticsLoading}
                        onRefresh={() => void refreshCursor()}
                      />
                    ) : activePanel === "controls" ? (
                      <ControlsPanel active={expanded && activePanel === "controls"} />
                    ) : activePanel === "spotify" ? (
                      <SpotifyPanel
                        status={status}
                        connecting={connecting}
                        palette={spotifyPanelThemed ? albumPalette : null}
                        onAction={(a) => void action(a)}
                        onConnect={() => {
                          setConnecting(true)
                          void connect()
                            .catch(() => undefined)
                            .finally(() => setConnecting(false))
                        }}
                      />
                    ) : data ? (
                      <WeatherPanel data={data} />
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-sm text-black/40 dark:text-white/40">
                        {error ?? "Loading…"}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            key="panel-rail"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.22, ease: ISLAND_EASE }}
            className="absolute top-1/2 left-full ml-2.5 -translate-y-1/2"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <PanelRail
              active={activePanel}
              themed={railThemed}
              onSelect={setPanelOverride}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </div>
  )
}

function PanelRail({
  active,
  themed,
  onSelect,
}: {
  active: Panel
  themed: boolean
  onSelect: (panel: Panel) => void
}) {
  const { motion: feel } = useSettings()
  const index = PANEL_ORDER[active]

  const y = useSpring(index * RAIL_STRIDE, {
    stiffness: Math.round(feel.stiffness * 0.75),
    damping: Math.round(feel.damping * 0.85),
    mass: feel.mass * 1.05,
  })

  useEffect(() => {
    y.set(index * RAIL_STRIDE)
  }, [index, y])

  const velocity = useVelocity(y)
  // Stretch into a capsule while moving; squash sideways so it reads like a drop
  const scaleY = useTransform(velocity, [-1100, 0, 1100], [1.72, 1, 1.72])
  const scaleX = useTransform(scaleY, (sy) => Math.max(0.68, 1.12 / sy))
  // Lead with the tip in the travel direction (mass trails behind)
  const transformOrigin = useTransform(velocity, (v) => {
    if (v > 40) return "50% 0%"
    if (v < -40) return "50% 100%"
    return "50% 50%"
  })
  const borderRadius = useTransform(scaleY, [1, 1.72], [999, 22])

  return (
    <nav className="relative flex flex-col items-center gap-1.5" aria-label="Panels">
      <motion.span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-0 top-0 z-0 size-9 shadow-sm",
          themed ? "bg-white/95" : "bg-[#111111] dark:bg-white",
        )}
        style={{ y, scaleX, scaleY, transformOrigin, borderRadius }}
      />

      <IconTab
        label="Weather"
        active={active === "weather"}
        themed={themed}
        onClick={() => onSelect("weather")}
      >
        <CloudSun className="size-4" strokeWidth={1.75} />
      </IconTab>
      <IconTab
        label="Spotify"
        active={active === "spotify"}
        themed={themed}
        onClick={() => onSelect("spotify")}
      >
        <Icon icon="simple-icons:spotify" className="size-4" aria-hidden />
      </IconTab>
      <IconTab
        label="Cursor"
        active={active === "cursor"}
        themed={themed}
        onClick={() => onSelect("cursor")}
      >
        <Icon icon="simple-icons:cursor" className="size-4" aria-hidden />
      </IconTab>
      <IconTab
        label="Controls"
        active={active === "controls"}
        themed={themed}
        onClick={() => onSelect("controls")}
      >
        <SlidersHorizontal className="size-4" strokeWidth={1.75} />
      </IconTab>
      <IconTab
        label="Settings"
        active={active === "settings"}
        themed={themed}
        onClick={() => onSelect("settings")}
      >
        <Settings className="size-4" strokeWidth={1.75} />
      </IconTab>
    </nav>
  )
}

function IconTab({
  label,
  active,
  onClick,
  themed,
  children,
}: {
  label: string
  active: boolean
  onClick: () => void
  themed?: boolean
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 520, damping: 28, mass: 0.55 }}
      className={cn(
        "relative z-10 flex size-9 items-center justify-center rounded-full transition-colors duration-200",
        active
          ? themed
            ? "bg-transparent text-black"
            : "bg-transparent text-white dark:text-[#111111]"
          : themed
            ? "bg-black/25 text-white/70 backdrop-blur-md hover:bg-black/40 hover:text-white"
            : "bg-[#f7f7f5]/90 text-black/40 shadow-sm backdrop-blur-md hover:bg-[#f7f7f5] hover:text-black/70 dark:bg-[#111111]/90 dark:text-white/40 dark:hover:bg-[#111111] dark:hover:text-white/80",
      )}
    >
      {children}
    </motion.button>
  )
}
