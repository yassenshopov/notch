import { Icon } from "@iconify/react"
import {
  CalendarDays,
  CloudSun,
  Gamepad2,
  Leaf,
  LineChart,
  Settings,
  Timer,
  Volume2,
} from "lucide-react"
import { AnimatePresence, motion, useSpring } from "motion/react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react"
import { getSettings, updateSettings, useSettings } from "../config/settings-store"
import { useSpotify } from "../hooks/useSpotify"
import { useTheme } from "../hooks/useTheme"
import { useWeather } from "../hooks/useWeather"
import {
  ISLAND_MORPH_MS,
  islandContentOut,
  islandMorph,
  notchUi,
} from "../lib/island-motion"
import { notchShellRadii } from "../lib/notch-shell-radii"
import {
  islandLayoutSize,
  isSidePlacement,
  transformOriginForPlacement,
} from "../lib/notch-anchor"
import { collapsedContentDimensions } from "../lib/notch-collapsed-size"
import {
  EXPANDED_BOTTOM_BLEED,
  EXPANDED_RAIL_GUTTER,
  EXPANDED_SIDE_INSET,
} from "../lib/notch-expanded-chrome"
import { withPlacementForm } from "../lib/notch-placement-grid"
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
import { EqualizerBars } from "./EqualizerBars"
import { WeatherIcon } from "./WeatherIcon"
import { snoozeCursorUsageUntilMs, snoozeWeatherPrecipActivity } from "../lib/live-activities"
import { LiveActivityContent } from "./LiveActivityContent"
import { GitHubContributionHeatmap } from "./GitHubContributionHeatmap"
import { StravaActivityCalendar } from "./StravaActivityCalendar"
import { useTimerEngine } from "../hooks/useTimerEngine"
import { useMarkets } from "../hooks/useMarkets"
import { useGithub } from "../hooks/useGithub"
import { useStrava } from "../hooks/useStrava"
import { useMint } from "../hooks/useMint"
import { usePi } from "../hooks/usePi"
import { todayContributionCount } from "../lib/github"
import { formatQuoteChange } from "../lib/markets"
import { nextEvent } from "../lib/calendar"
import { panelForCollapsedTap, type NotchPanel } from "../lib/panel-routing"
import { useMediaSession } from "../hooks/useMediaSession"
import { useCalendar } from "../hooks/useCalendar"
import { useNotchPlacement } from "../hooks/useNotchPlacement"
import { useShellSize } from "../hooks/useShellSize"
import { NotchActivePanel } from "./NotchActivePanel"

type Panel = NotchPanel

const RAIL_PANELS_LEFT: Panel[] = [
  "weather",
  "spotify",
  "media",
  "air",
  "calendar",
  "cursor",
  "clock",
  "pacman",
]

const RAIL_PANELS_RIGHT: Panel[] = [
  "markets",
  "github",
  "strava",
  "mint",
  "pi",
  "controls",
  "settings",
]

const DRAG_THRESHOLD_PX = 8

export function Notch() {
  const [expanded, setExpanded] = useState(false)
  const [panelOverride, setPanelOverride] = useState<Panel | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [stravaConnecting, setStravaConnecting] = useState(false)
  const settings = useSettings()
  const placementRaw = useNotchPlacement()
  const placement = useMemo(() => withPlacementForm(placementRaw), [placementRaw])
  const { data, loading, error, refresh } = useWeather()
  const { status, playing, connect, action, playUri, disconnect } = useSpotify()
  const mediaPoll = settings.media.enabled && !playing
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

  const dismissLiveActivity = useCallback(() => {
    const activity = liveActivity
    if (!activity) return
    const latest = getSettings()
    if (activity.kind === "cursor-usage") {
      void updateSettings({
        liveActivities: {
          ...latest.liveActivities,
          cursor: {
            ...latest.liveActivities.cursor,
            snoozedUntilMs: snoozeCursorUsageUntilMs(liveCursorStatus),
          },
        },
      })
      return
    }
    if (activity.kind === "weather-precip") {
      void updateSettings({
        liveActivities: {
          ...latest.liveActivities,
          weather: snoozeWeatherPrecipActivity(latest, activity.id),
        },
      })
    }
  }, [liveActivity, liveCursorStatus])
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
  const stravaPoll =
    (!expanded && (settings.island.faces.strava ?? true)) ||
    (expanded && activePanel === "strava")
  const mintPoll =
    (!expanded && (settings.island.faces.mint ?? true)) || (expanded && activePanel === "mint")
  const piPoll =
    (!expanded && (settings.island.faces.pi ?? true)) || (expanded && activePanel === "pi")

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
  const {
    status: stravaStatus,
    loading: stravaLoading,
    refreshing: stravaRefreshing,
    refresh: refreshStrava,
    connect: connectStrava,
    disconnect: disconnectStrava,
  } = useStrava(Boolean(stravaPoll))
  const {
    status: mintStatus,
    history: mintHistory,
    loading: mintLoading,
    refreshing: mintRefreshing,
    refresh: refreshMint,
  } = useMint(Boolean(mintPoll))
  const {
    status: piStatus,
    history: piHistory,
    loading: piLoading,
    refreshing: piRefreshing,
    refresh: refreshPi,
  } = usePi(Boolean(piPoll))

  const islandFaces = useMemo(() => {
    const faces: IslandFace[] = []
    const enabled = settings.island.faces
    if (enabled.weather && data) faces.push("weather")
    if (enabled.battery && batteryAvailable) faces.push("battery")
    if (enabled.clock) faces.push("clock")
    if (enabled.markets && marketsSnapshot.quotes.length > 0) faces.push("markets")
    if (enabled.github && githubStatus.connected) faces.push("github")
    if ((enabled.strava ?? true) && stravaStatus.connected) faces.push("strava")
    if ((enabled.mint ?? true) && mintStatus.connected) faces.push("mint")
    if ((enabled.pi ?? true) && piStatus.connected) faces.push("pi")
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
    stravaStatus.connected,
    mintStatus.connected,
    mintStatus.memUsedPct,
    piStatus.connected,
    piStatus.cpuTempC,
    piStatus.memUsedPct,
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

  const stravaCalendarShowing =
    rotateEnabled &&
    islandFace === "strava" &&
    Boolean(stravaStatus.calendarActivities.length || stravaStatus.calendar?.cells.length)

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
    (githubHeatmapShowing ? settings.collapsed.githubExtraWidth : 0) +
    (stravaCalendarShowing ? settings.collapsed.stravaExtraWidth : 0)

  const collapsedH = settings.collapsed.height
  const collapsedBody = useMemo(
    () => collapsedContentDimensions(placement.form, collapsedWidth, collapsedH),
    [placement.form, collapsedWidth, collapsedH],
  )

  const {
    status: cursorStatus,
    analyticsLoading: cursorAnalyticsLoading,
    refreshing: cursorRefreshing,
    refresh: refreshCursor,
  } = useCursor(expanded && activePanel === "cursor")

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
  /** Prevents the collapsed-shell effect from shrinking the window mid-expand */
  const expandInFlightRef = useRef(false)
  /** Skip blur/backdrop dismiss while the shell/pill are morphing */
  const ignoreDismissUntil = useRef(0)
  const pillDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    dragging: boolean
  } | null>(null)

  const collapse = useCallback(() => {
    morphGen.current += 1
    ignoreDismissUntil.current = Date.now() + ISLAND_MORPH_MS + 120
    setPanelOverride(null)
    setExpanded(false)
    void window.notch?.setExpanded({
      expanded: false,
      width: collapsedBody.width,
      height: collapsedBody.height,
    })
  }, [collapsedBody.width, collapsedBody.height])

  const expand = async () => {
    const gen = ++morphGen.current
    const ew = Math.max(380, settings.expanded.width)
    const eh = Math.max(580, settings.expanded.height)
    ignoreDismissUntil.current = Date.now() + 600
    expandInFlightRef.current = true
    try {
      await window.notch?.setExpanded({
        expanded: true,
        width: collapsedBody.width,
        height: collapsedBody.height,
        expandedWidth: ew,
        expandedHeight: eh,
      })
      if (morphGen.current !== gen) {
        void window.notch?.setExpanded({
          expanded: false,
          width: collapsedBody.width,
          height: collapsedBody.height,
        })
        return
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      if (morphGen.current !== gen) return
      setExpanded(true)
    } finally {
      expandInFlightRef.current = false
    }
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

  useEffect(() => {
    if (expanded || expandInFlightRef.current) return
    void window.notch?.setExpanded({
      expanded: false,
      width: collapsedBody.width,
      height: collapsedBody.height,
    })
  }, [expanded, collapsedBody.width, collapsedBody.height])

  // Clicking another app / the desktop blurs us — treat as outside dismiss.
  useEffect(() => {
    return window.notch?.onBlur?.(() => {
      if (Date.now() < ignoreDismissUntil.current) return
      collapse()
    })
  }, [collapse])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      e.preventDefault()
      e.stopPropagation()
      collapse()
    }
    window.addEventListener("keydown", onKey, true)
    const offEscape = window.notch?.onEscape?.(() => collapse())
    return () => {
      window.removeEventListener("keydown", onKey, true)
      offEscape?.()
    }
  }, [expanded, collapse])

  const unit = settings.temperatureUnit
  const fill = albumThemed && albumPalette ? albumPalette.bg : dark ? "#111111" : "#f7f7f5"
  const themedFg = albumThemed && albumPalette ? albumPalette.fg : null
  const shellRadii = useMemo(
    () =>
      notchShellRadii(
        placement.form,
        expanded,
        collapsedBody.height,
        collapsedBody.width,
        placement.edge,
      ),
    [placement.form, placement.edge, expanded, collapsedBody.height, collapsedBody.width],
  )
  const earSize = expanded ? 12 : placement.form === "pill" ? 10 : 14
  const fillTransition = {
    ...islandMorph,
    duration: 0.45,
  }

  const railThemed = Boolean(albumPalette && spotifyPanelThemed)

  const morphOrigin = transformOriginForPlacement(placement.edge, placement.form)
  const isSide = isSidePlacement(placement.edge)
  const islandSize = islandLayoutSize(
    placement.edge,
    expanded,
    collapsedBody.width,
    collapsedBody.height,
    settings.expanded.width,
    settings.expanded.height,
  )

  const expandedW = Math.max(380, settings.expanded.width)
  const expandedH = Math.max(580, settings.expanded.height)

  const activePanelEl = (
    <NotchActivePanel
      activePanel={activePanel}
      data={data}
      error={error}
      expanded={expanded}
      settings={settings}
      status={status}
      connecting={connecting}
      connect={async () => {
        setConnecting(true)
        try {
          return await connect()
        } finally {
          setConnecting(false)
        }
      }}
      disconnect={disconnect}
      stravaStatus={stravaStatus}
      stravaConnecting={stravaConnecting}
      connectStrava={async () => {
        setStravaConnecting(true)
        try {
          return await connectStrava()
        } finally {
          setStravaConnecting(false)
        }
      }}
      disconnectStrava={disconnectStrava}
      cursorStatus={cursorStatus}
      cursorAnalyticsLoading={cursorAnalyticsLoading}
      cursorRefreshing={cursorRefreshing}
      refreshCursor={refreshCursor}
      marketsSnapshot={marketsSnapshot}
      marketsLoading={marketsLoading}
      marketsRefreshing={marketsRefreshing}
      refreshMarkets={refreshMarkets}
      githubStatus={githubStatus}
      githubLoading={githubLoading}
      githubRefreshing={githubRefreshing}
      refreshGithub={refreshGithub}
      stravaLoading={stravaLoading}
      stravaRefreshing={stravaRefreshing}
      refreshStrava={refreshStrava}
      mintStatus={mintStatus}
      mintHistory={mintHistory}
      mintLoading={mintLoading}
      mintRefreshing={mintRefreshing}
      refreshMint={refreshMint}
      piStatus={piStatus}
      piHistory={piHistory}
      piLoading={piLoading}
      piRefreshing={piRefreshing}
      refreshPi={refreshPi}
      calendarSnapshot={calendarSnapshot}
      calendarRefreshing={calendarRefreshing}
      refreshCalendar={refreshCalendar}
      mediaStatus={mediaStatus}
      mediaAction={mediaAction}
      albumPalette={albumPalette}
      spotifyPanelThemed={spotifyPanelThemed}
      action={action}
      playUri={playUri}
    />
  )

  const shell = useShellSize(expanded)
  const islandH = Math.max(
    expandedH,
    shell.h - EXPANDED_BOTTOM_BLEED,
  )

  useEffect(() => {
    const w = window as Window & { __NOTCH_EXPAND__?: () => Promise<void> }
    w.__NOTCH_EXPAND__ = () => expand()
    return window.notch?.onTestExpand?.(() => {
      void expand()
    })
  }, [expand])

  return (
    <div
      className="h-full w-full min-h-0 overflow-hidden select-none"
      data-notch-layout={expanded ? "expanded-tight" : "collapsed"}
    >
      {expanded ? (
        <div
          className="box-border flex items-center overflow-hidden"
          style={{
            width: shell.w,
            height: shell.h,
            minWidth: shell.w,
            minHeight: shell.h,
            paddingLeft: EXPANDED_SIDE_INSET,
            paddingRight: EXPANDED_SIDE_INSET,
            paddingBottom: EXPANDED_BOTTOM_BLEED,
            gap: 0,
          }}
        >
          <div
            className="relative z-20 flex shrink-0 items-center justify-center"
            style={{ width: EXPANDED_RAIL_GUTTER }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <PanelRail
              panels={RAIL_PANELS_LEFT}
              active={activePanel}
              themed={railThemed}
              onSelect={setPanelOverride}
            />
          </div>
          <div
            data-notch-island
            className={cn(
              "notch-fold relative z-10 mx-auto flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden",
              `notch-edge-${placement.edge}`,
              `notch-form-${placement.form}`,
              !themedFg && (dark ? "text-white" : "text-[#111111]"),
              isSide && "notch-side-upright",
              isSide && placement.edge === "left" && "notch-side-upright--left",
              isSide && placement.edge === "right" && "notch-side-upright--right",
            )}
            style={
              {
                height: islandH,
                maxWidth: Math.min(expandedW, shell.w - EXPANDED_SIDE_INSET * 2 - EXPANDED_RAIL_GUTTER * 2),
                backgroundColor: fill,
                ...shellRadii,
                "--notch-fill": fill,
                "--ear": `${earSize}px`,
                color: themedFg ?? undefined,
              } as CSSProperties
            }
          >
            {placement.edge === "top" ? (
              <span className="notch-fold-cap" aria-hidden />
            ) : null}
            <span className="notch-ear notch-ear--left" aria-hidden />
            <span className="notch-ear notch-ear--right" aria-hidden />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col px-8 pb-6 pt-8">
              <div className="min-h-0 flex-1 overflow-y-auto notch-scroll">
                {activePanelEl}
              </div>
            </div>
          </div>
          <div
            className="relative z-20 flex shrink-0 items-center justify-center"
            style={{ width: EXPANDED_RAIL_GUTTER }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <PanelRail
              panels={RAIL_PANELS_RIGHT}
              active={activePanel}
              themed={railThemed}
              onSelect={setPanelOverride}
            />
          </div>
        </div>
      ) : (
      <div
        className={cn(
          "relative box-border h-full w-full min-h-0",
          isSide && "notch-side-mount",
          placement.edge === "left" && "notch-side-mount--left",
          placement.edge === "right" && "notch-side-mount--right",
        )}
      >
        <div className={cn(isSide && "notch-side-rotate")}>
      <motion.div
        initial={false}
        animate={{
          width: islandSize.width,
          height: islandSize.height,
          backgroundColor: fill,
          ...shellRadii,
        }}
        transition={islandMorph}
        onPointerDown={(e) => {
          e.stopPropagation()
          if (
            e.target instanceof Element &&
            e.target.closest("[data-live-activity-dismiss]")
          ) {
            return
          }
          pillDragRef.current = {
            pointerId: e.pointerId,
            startX: e.screenX,
            startY: e.screenY,
            dragging: false,
          }
          try {
            e.currentTarget.setPointerCapture(e.pointerId)
          } catch {
            // ignore
          }
        }}
        onPointerMove={(e) => {
          const drag = pillDragRef.current
          if (!drag || drag.pointerId !== e.pointerId || expanded) return
          const dist = Math.hypot(e.screenX - drag.startX, e.screenY - drag.startY)
          if (!drag.dragging && dist < DRAG_THRESHOLD_PX) return
          if (!drag.dragging) {
            drag.dragging = true
            void window.notch?.dragStart({
              screenX: e.screenX,
              screenY: e.screenY,
              width: collapsedBody.width,
              height: collapsedBody.height,
            })
          }
          window.notch?.dragMove({ screenX: e.screenX, screenY: e.screenY })
        }}
        onPointerUp={(e) => {
          const drag = pillDragRef.current
          if (!drag || drag.pointerId !== e.pointerId) return
          pillDragRef.current = null
          try {
            e.currentTarget.releasePointerCapture(e.pointerId)
          } catch {
            // capture may already be released
          }
          const hit = document.elementFromPoint(e.clientX, e.clientY)
          if (hit?.closest("[data-live-activity-dismiss]")) {
            dismissLiveActivity()
            return
          }
          if (drag.dragging) {
            void window.notch?.dragEnd().then((next) => {
              if (next) void updateSettings({ placement: next })
            })
            return
          }
          const panel = panelForCollapsedTap({
            spotifyPlaying: playing,
            browserMediaActive: browserMediaShowing,
            liveActivity,
            timerShowing,
            islandFace,
          })
          setPanelOverride(panel)
          void expand()
        }}
        onPointerCancel={(e) => {
          const drag = pillDragRef.current
          if (!drag || drag.pointerId !== e.pointerId) return
          pillDragRef.current = null
          if (drag.dragging) void window.notch?.dragCancel()
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
            transformOrigin: morphOrigin,
            willChange: "width, height, border-radius",
          } as CSSProperties
        }
        className={cn(
          "notch-fold relative overflow-visible",
          `notch-edge-${placement.edge}`,
          `notch-form-${placement.form}`,
          !themedFg && (dark ? "text-white" : "text-[#111111]"),
          "cursor-grab active:cursor-grabbing",
        )}
      >
        {placement.edge === "top" ? (
          <span className="notch-fold-cap" aria-hidden />
        ) : null}
        {/* Concave ears — Apple-style blend into the top screen edge */}
        <span className="notch-ear notch-ear--left" aria-hidden />
        <span className="notch-ear notch-ear--right" aria-hidden />

        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{
            backgroundColor: fill,
            ...shellRadii,
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
              transition={notchUi}
              className="pointer-events-none absolute inset-0 z-[4]"
              aria-hidden
            >
              {/* Pill body — clipped to the rounded bottom edge */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={shellRadii}
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
                    ) : islandFace === "strava" ? (
                      <motion.span
                        key="strava"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-1.5 leading-none"
                      >
                        {stravaStatus.calendarActivities.length > 0 || stravaStatus.calendar ? (
                          <StravaActivityCalendar
                            activities={stravaStatus.calendarActivities}
                            calendar={stravaStatus.calendar}
                            variant="mini"
                          />
                        ) : (
                          <Icon icon="simple-icons:strava" className="size-3.5 opacity-75" aria-hidden />
                        )}
                        <span className="text-[11px] font-semibold tabular-nums leading-none opacity-80">
                          {stravaStatus.streak?.weeks ?? 0}
                        </span>
                      </motion.span>
                    ) : islandFace === "github" ? (
                      <motion.span
                        key="github"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-2 leading-none"
                      >
                        {githubStatus.contributions?.weeks?.length ? (
                          <GitHubContributionHeatmap
                            weeks={githubStatus.contributions.weeks ?? []}
                            variant="mini"
                          />
                        ) : (
                          <Icon icon="simple-icons:github" className="size-3.5 opacity-75" aria-hidden />
                        )}
                        <span className="text-[11px] font-semibold tabular-nums leading-none opacity-80">
                          {todayContributionCount(githubStatus.contributions?.weeks ?? [])}
                        </span>
                      </motion.span>
                    ) : islandFace === "mint" ? (
                      <motion.span
                        key="mint"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-1.5 leading-none"
                      >
                        <Icon icon="simple-icons:linuxmint" className="size-3.5 opacity-75" aria-hidden />
                        <span className="text-[11px] font-semibold tabular-nums opacity-80">
                          {mintStatus.memUsedPct ?? "—"}%
                        </span>
                        <span className="text-[10px] opacity-50">·</span>
                        <span className="text-[11px] font-semibold tabular-nums opacity-80">
                          {mintStatus.diskUsedPct ?? "—"}%
                        </span>
                      </motion.span>
                    ) : islandFace === "pi" ? (
                      <motion.span
                        key="pi"
                        initial={{ opacity: 0, scale: 0.7, y: 3 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: -3 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center justify-center gap-1.5 leading-none"
                      >
                        <Icon icon="simple-icons:raspberrypi" className="size-3.5 opacity-75" aria-hidden />
                        <span className="text-[11px] font-semibold tabular-nums opacity-80">
                          {piStatus.cpuTempC != null
                            ? `${piStatus.cpuTempC.toFixed(0)}°`
                            : `${piStatus.memUsedPct ?? "—"}%`}
                        </span>
                        <span className="text-[10px] opacity-50">·</span>
                        <span className="text-[11px] font-semibold tabular-nums opacity-80">
                          {piStatus.load1 != null ? piStatus.load1.toFixed(1) : "—"}
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
                        <Leaf className="size-3.5 opacity-70" strokeWidth={2} />
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
        </AnimatePresence>
      </motion.div>
        </div>
      </div>
      )}
    </div>
  )
}

function railTabIcon(panel: Panel) {
  switch (panel) {
    case "weather":
      return <CloudSun className="size-4" strokeWidth={1.75} />
    case "spotify":
      return <Icon icon="simple-icons:spotify" className="size-4" aria-hidden />
    case "media":
      return <Icon icon="simple-icons:youtube" className="size-4" aria-hidden />
    case "air":
      return <Leaf className="size-4" strokeWidth={1.75} />
    case "calendar":
      return <CalendarDays className="size-4" strokeWidth={1.75} />
    case "cursor":
      return <Icon icon="simple-icons:cursor" className="size-4" aria-hidden />
    case "clock":
      return <Timer className="size-4" strokeWidth={1.75} />
    case "pacman":
      return <Gamepad2 className="size-4" strokeWidth={1.75} />
    case "markets":
      return <LineChart className="size-4" strokeWidth={1.75} />
    case "github":
      return <Icon icon="simple-icons:github" className="size-4" aria-hidden />
    case "strava":
      return <Icon icon="simple-icons:strava" className="size-4" aria-hidden />
    case "mint":
      return <Icon icon="simple-icons:linuxmint" className="size-4" aria-hidden />
    case "pi":
      return <Icon icon="simple-icons:raspberrypi" className="size-4" aria-hidden />
    case "controls":
      return <Volume2 className="size-4" strokeWidth={1.75} />
    case "settings":
      return <Settings className="size-4" strokeWidth={1.75} />
  }
}

const RAIL_TAB_LABELS: Record<Panel, string> = {
  overview: "Today",
  weather: "Weather",
  spotify: "Spotify",
  media: "YouTube",
  air: "Air quality",
  calendar: "Calendar",
  cursor: "Cursor",
  clock: "Clock",
  pacman: "Pac-Man",
  markets: "Markets",
  github: "GitHub",
  strava: "Strava",
  mint: "Mint server",
  pi: "Raspberry Pi",
  controls: "Controls",
  settings: "Settings",
}

function PanelRail({
  panels,
  active,
  themed,
  onSelect,
}: {
  panels: Panel[]
  active: Panel
  themed: boolean
  onSelect: (panel: Panel) => void
}) {
  const { motion: feel } = useSettings()
  const navRef = useRef<HTMLElement>(null)
  const tabRefs = useRef<Partial<Record<Panel, HTMLButtonElement>>>({})
  const [indicatorY, setIndicatorY] = useState(0)

  const indicatorVisible = panels.includes(active)

  const measureIndicator = useCallback(() => {
    if (!panels.includes(active)) return
    const tab = tabRefs.current[active]
    const nav = navRef.current
    if (!tab || !nav) return
    setIndicatorY(tab.offsetTop)
  }, [active, panels])

  useLayoutEffect(() => {
    measureIndicator()
  }, [measureIndicator])

  useLayoutEffect(() => {
    const nav = navRef.current
    if (!nav || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => measureIndicator())
    ro.observe(nav)
    return () => ro.disconnect()
  }, [measureIndicator])

  const y = useSpring(indicatorY, {
    stiffness: Math.round(feel.stiffness * 0.75),
    damping: Math.round(feel.damping * 0.85),
    mass: feel.mass * 1.05,
  })

  useEffect(() => {
    y.set(indicatorY)
  }, [indicatorY, y])

  return (
    <nav
      ref={navRef}
      className="relative flex flex-col items-center gap-1.5"
      aria-label="Panels"
    >
      {indicatorVisible ? (
        <motion.span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 top-0 z-0 size-9 rounded-full shadow-sm",
            themed ? "bg-white" : "bg-[#111111] dark:bg-white",
          )}
          style={{ y }}
        />
      ) : null}

      {panels.map((panel) => (
        <IconTab
          key={panel}
          ref={(el) => {
            if (el) tabRefs.current[panel] = el
            else delete tabRefs.current[panel]
          }}
          label={RAIL_TAB_LABELS[panel]}
          active={active === panel}
          themed={themed}
          onClick={() => onSelect(panel)}
        >
          {railTabIcon(panel)}
        </IconTab>
      ))}
    </nav>
  )
}

function IconTab({
  ref,
  label,
  active,
  onClick,
  themed,
  children,
}: {
  ref?: Ref<HTMLButtonElement>
  label: string
  active: boolean
  onClick: () => void
  themed?: boolean
  children: ReactNode
}) {
  return (
    <motion.button
      ref={ref}
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
            ? "bg-neutral-700 text-neutral-200 hover:bg-neutral-600 hover:text-white"
            : "bg-[#f7f7f5] text-neutral-400 shadow-sm hover:bg-[#efefed] hover:text-neutral-600 dark:bg-[#111111] dark:text-neutral-500 dark:hover:bg-[#1a1a1a] dark:hover:text-neutral-300",
      )}
    >
      {children}
    </motion.button>
  )
}
