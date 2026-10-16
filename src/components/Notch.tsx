import { Icon } from "@iconify/react"
import { CalendarDays, CloudSun, LineChart, Settings, Timer, Volume2, Wind } from "lucide-react"
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
import { updateSettings, useSettings } from "../config/settings-store"
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
import { cn, formatHour, formatTemp } from "../lib/utils"
import type { IslandFace } from "../config/settings"
import { useAlbumPalette } from "../hooks/useAlbumPalette"
import { useBattery } from "../hooks/useBattery"
import { formatIslandTime, useClock } from "../hooks/useClock"
import { useCursor } from "../hooks/useCursor"
import { useIslandRotation } from "../hooks/useIslandRotation"
import { useLiveActivities } from "../hooks/useLiveActivities"
import { useOccasionalSmile } from "../hooks/useOccasionalSmile"
import { BatteryIndicator } from "./BatteryIndicator"
import { BotSmile } from "./BotSmile"
import { ControlsPanel } from "./ControlsPanel"
import { CursorPanel } from "./CursorPanel"
import { EqualizerBars } from "./EqualizerBars"
import { SettingsPanel } from "./SettingsPanel"
import { SpotifyPanel } from "./SpotifyPanel"
import { WeatherIcon } from "./WeatherIcon"
import { snoozeCursorUsageUntilMs, snoozeWeatherPrecipActivity } from "../lib/live-activities"
import { LiveActivityContent } from "./LiveActivityContent"
import { WeatherPanel } from "./WeatherPanel"
import { ClockPanel } from "./ClockPanel"
import { MarketsPanel } from "./MarketsPanel"
import { GitHubPanel } from "./GitHubPanel"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { useTimerEngine } from "../hooks/useTimerEngine"
import { useMarkets } from "../hooks/useMarkets"
import { useGithub } from "../hooks/useGithub"
import { todayContributionCount } from "../lib/github"
import { formatQuoteChange } from "../lib/markets"
import { nextEvent } from "../lib/calendar"
import { panelForCollapsedTap, type NotchPanel } from "../lib/panel-routing"
import { useMediaSession } from "../hooks/useMediaSession"
import { useCalendar } from "../hooks/useCalendar"
import { AirQualityPanel } from "./AirQualityPanel"
import { CalendarPanel } from "./CalendarPanel"
import { BrowserMediaPanel } from "./BrowserMediaPanel"

type Panel = NotchPanel

/** Side rail top → bottom — indicator Y and panel slide direction use this order */
const RAIL_PANELS: Panel[] = [
  "weather",
  "spotify",
  "media",
  "air",
  "calendar",
  "cursor",
  "clock",
  "markets",
  "github",
  "controls",
  "settings",
]

const PANEL_ORDER = Object.fromEntries(
  RAIL_PANELS.map((panel, index) => [panel, index]),
) as Record<Panel, number>

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
  const mediaPoll = !expanded && !playing && settings.media.enabled
  const {
    status: mediaStatus,
    showing: browserMediaShowing,
    playing: browserMediaPlaying,
    action: mediaAction,
  } = useMediaSession(mediaPoll)
  const battery = useBattery()
  const dark = useTheme()
  const timer = useTimerEngine()

  const calendarPoll =
    Boolean(settings.calendar.icsUrl.trim()) &&
    ((!expanded && (settings.island.faces.calendar ?? true)) ||
      (expanded && panelOverride === "calendar"))
  const {
    snapshot: calendarSnapshot,
    ready: calendarReady,
    refreshing: calendarRefreshing,
    refresh: refreshCalendar,
  } = useCalendar(calendarPoll)

  const liveActivitiesEnabled =
    !expanded && !playing && !browserMediaShowing && settings.liveActivities.enabled
  const { current: liveActivity, cursorStatus: liveCursorStatus } = useLiveActivities({
    active: liveActivitiesEnabled,
    weather: data,
  })

  const dismissLiveActivity = () => {
    if (!liveActivity) return
    if (liveActivity.kind === "cursor-usage") {
      void updateSettings({
        liveActivities: {
          ...settings.liveActivities,
          cursor: {
            ...settings.liveActivities.cursor,
            snoozedUntilMs: snoozeCursorUsageUntilMs(liveCursorStatus),
          },
        },
      })
      return
    }
    if (liveActivity.kind === "weather-precip") {
      void updateSettings({
        liveActivities: {
          ...settings.liveActivities,
          weather: snoozeWeatherPrecipActivity(settings, liveActivity.id),
        },
      })
    }
  }
  const smiling = useOccasionalSmile(
    !expanded && !playing && !browserMediaShowing && !liveActivity && !timer.active,
  )

  const batteryAvailable = battery.supported && battery.ready

  const activePanel: Panel = useMemo(() => {
    if (panelOverride) return panelOverride
    if (playing) return "spotify"
    if (browserMediaShowing) return "media"
    return "weather"
  }, [panelOverride, playing, browserMediaShowing])

  const marketsPoll =
    (!expanded && settings.island.faces.markets) || (expanded && activePanel === "markets")
  const githubPoll =
    (!expanded && settings.island.faces.github) || (expanded && activePanel === "github")

  const {
    snapshot: marketsSnapshot,
    loading: marketsLoading,
    refreshing: marketsRefreshing,
    refresh: refreshMarkets,
  } = useMarkets(Boolean(marketsPoll))
  const {
    status: githubStatus,
    loading: githubLoading,
    refreshing: githubRefreshing,
    refresh: refreshGithub,
  } = useGithub(Boolean(githubPoll))

  const islandFaces = useMemo(() => {
    const faces: IslandFace[] = []
    const enabled = settings.island.faces
    if (enabled.weather && data) faces.push("weather")
    if (enabled.battery && batteryAvailable) faces.push("battery")
    if (enabled.clock) faces.push("clock")
    if (enabled.markets && marketsSnapshot.quotes.length > 0) faces.push("markets")
    if (enabled.github && githubStatus.connected) faces.push("github")
    const today = data?.days.find((d) => d.isToday)
    if ((enabled.air ?? true) && today && (today.aqi != null || today.uvIndex > 0))
      faces.push("air")
    if ((enabled.calendar ?? true) && calendarReady) faces.push("calendar")
    return faces
  }, [
    settings.island.faces,
    data,
    batteryAvailable,
    marketsSnapshot.quotes.length,
    githubStatus.connected,
    githubStatus.notifications.length,
    githubStatus.pullRequests.length,
    calendarReady,
  ])

  const timerShowing = !expanded && timer.active
  const rotateEnabled =
    !expanded &&
    !playing &&
    !browserMediaShowing &&
    !smiling &&
    !liveActivity &&
    !timerShowing
  const islandFace = useIslandRotation({
    enabled: rotateEnabled,
    intervalMs: settings.island.rotateIntervalMs,
    available: islandFaces,
  })
  const clockNow = useClock(rotateEnabled && islandFace === "clock")

  const githubHeatmapShowing =
    rotateEnabled &&
    islandFace === "github" &&
    Boolean(githubStatus.contributions?.weeks?.length)

  const calendarNext = useMemo(
    () => nextEvent(calendarSnapshot.events),
    [calendarSnapshot.events],
  )

  const collapsedWidth =
    settings.collapsed.width +
    (playing || (browserMediaShowing && browserMediaPlaying)
      ? settings.collapsed.musicExtraWidth
      : 0) +
    (browserMediaShowing && !browserMediaPlaying ? 36 : 0) +
    (liveActivity ? settings.collapsed.activityExtraWidth : 0) +
    (timerShowing ? settings.collapsed.timerExtraWidth : 0) +
    (githubHeatmapShowing ? settings.collapsed.githubExtraWidth : 0)

  const {
    status: cursorStatus,
    analyticsLoading: cursorAnalyticsLoading,
    refreshing: cursorRefreshing,
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
  const prevBrowserMedia = useRef(browserMediaShowing)
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

  useEffect(() => {
    if (prevBrowserMedia.current === browserMediaShowing) return
    prevBrowserMedia.current = browserMediaShowing
    setPanelOverride((current) => (current === "settings" ? current : null))
  }, [browserMediaShowing])

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
          if (!expanded) {
            const panel = panelForCollapsedTap({
              spotifyPlaying: playing,
              browserMediaActive: browserMediaShowing,
              liveActivity,
              timerShowing,
              islandFace,
            })
            setPanelOverride(panel)
            void expand()
          }
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
              className={cn(
                "relative z-10 flex h-full items-center justify-center",
                liveActivity ? "px-3" : "px-4",
              )}
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
                  style={{ "--battery-bolt": fill } as CSSProperties}
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
                    ) : browserMediaShowing ? (
                      <motion.span
                        key="browser-media"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2"
                      >
                        {mediaStatus.isYoutube ? (
                          <Icon
                            icon="simple-icons:youtube"
                            className="size-3.5 text-[#FF0000]"
                            aria-hidden
                          />
                        ) : null}
                        {browserMediaPlaying ? (
                          <EqualizerBars active />
                        ) : (
                          <span className="max-w-[7rem] truncate text-[11px] font-semibold">
                            {mediaStatus.title || "Paused"}
                          </span>
                        )}
                      </motion.span>
                    ) : liveActivity ? (
                      <LiveActivityContent
                        key={liveActivity.id}
                        activity={liveActivity}
                        onDismiss={dismissLiveActivity}
                      />
                    ) : timerShowing ? (
                      <motion.span
                        key="timer"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-1.5"
                      >
                        <Timer className="size-3.5 opacity-70" strokeWidth={2} />
                        <span className="text-[13px] font-semibold tracking-tight tabular-nums">
                          {timer.display}
                        </span>
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
                    ) : islandFace === "markets" && marketsSnapshot.quotes[0] ? (
                      <motion.span
                        key="markets"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2"
                      >
                        <span className="text-[12px] font-bold tracking-tight">
                          {marketsSnapshot.quotes[0].symbol}
                        </span>
                        <span className="text-[12px] font-semibold tabular-nums opacity-80">
                          {formatQuoteChange(marketsSnapshot.quotes[0].changePercent24h)}
                        </span>
                      </motion.span>
                    ) : islandFace === "github" ? (
                      <motion.span
                        key="github"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2"
                      >
                        {githubStatus.contributions?.weeks?.length ? (
                          <GitHubContributionHeatmap
                            weeks={githubStatus.contributions.weeks ?? []}
                            variant="mini"
                          />
                        ) : (
                          <Icon icon="simple-icons:github" className="size-3.5 opacity-75" aria-hidden />
                        )}
                        <span className="text-[11px] font-semibold tabular-nums opacity-80">
                          {todayContributionCount(githubStatus.contributions?.weeks ?? [])}
                        </span>
                      </motion.span>
                    ) : islandFace === "air" && data ? (
                      <motion.span
                        key="air"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Wind className="size-3.5 opacity-70" strokeWidth={2} />
                        <span className="text-[12px] font-semibold tabular-nums">
                          {data.days.find((d) => d.isToday)?.aqi ?? "—"}
                        </span>
                      </motion.span>
                    ) : islandFace === "calendar" && calendarNext ? (
                      <motion.span
                        key="calendar"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex max-w-[9rem] items-center justify-center gap-1.5"
                      >
                        <CalendarDays className="size-3.5 shrink-0 opacity-70" strokeWidth={2} />
                        <span className="truncate text-[11px] font-semibold">
                          {calendarNext.allDay
                            ? "All day"
                            : formatHour(calendarNext.start, settings.clock.format)}
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
                        analyticsLoading={cursorAnalyticsLoading}
                        refreshing={cursorRefreshing}
                        onRefresh={() => void refreshCursor()}
                      />
                    ) : activePanel === "clock" ? (
                      <ClockPanel />
                    ) : activePanel === "markets" ? (
                      <MarketsPanel
                        snapshot={marketsSnapshot}
                        loading={marketsLoading}
                        refreshing={marketsRefreshing}
                        hasWatchlist={settings.markets.watchlist.length > 0}
                        onRefresh={() => void refreshMarkets()}
                      />
                    ) : activePanel === "github" ? (
                      <GitHubPanel
                        status={githubStatus}
                        loading={githubLoading}
                        refreshing={githubRefreshing}
                        onRefresh={() => void refreshGithub()}
                      />
                    ) : activePanel === "air" && data ? (
                      <AirQualityPanel data={data} />
                    ) : activePanel === "calendar" ? (
                      <CalendarPanel
                        snapshot={calendarSnapshot}
                        refreshing={calendarRefreshing}
                        onRefresh={() => void refreshCalendar(true)}
                      />
                    ) : activePanel === "media" ? (
                      <BrowserMediaPanel
                        status={mediaStatus}
                        onAction={(a) => void mediaAction(a)}
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
        label="YouTube"
        active={active === "media"}
        themed={themed}
        onClick={() => onSelect("media")}
      >
        <Icon icon="simple-icons:youtube" className="size-4" aria-hidden />
      </IconTab>
      <IconTab
        label="Air quality"
        active={active === "air"}
        themed={themed}
        onClick={() => onSelect("air")}
      >
        <Wind className="size-4" strokeWidth={1.75} />
      </IconTab>
      <IconTab
        label="Calendar"
        active={active === "calendar"}
        themed={themed}
        onClick={() => onSelect("calendar")}
      >
        <CalendarDays className="size-4" strokeWidth={1.75} />
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
        label="Clock"
        active={active === "clock"}
        themed={themed}
        onClick={() => onSelect("clock")}
      >
        <Timer className="size-4" strokeWidth={1.75} />
      </IconTab>
      <IconTab
        label="Markets"
        active={active === "markets"}
        themed={themed}
        onClick={() => onSelect("markets")}
      >
        <LineChart className="size-4" strokeWidth={1.75} />
      </IconTab>
      <IconTab
        label="GitHub"
        active={active === "github"}
        themed={themed}
        onClick={() => onSelect("github")}
      >
        <Icon icon="simple-icons:github" className="size-4" aria-hidden />
      </IconTab>
      <IconTab
        label="Controls"
        active={active === "controls"}
        themed={themed}
        onClick={() => onSelect("controls")}
      >
        <Volume2 className="size-4" strokeWidth={1.75} />
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
