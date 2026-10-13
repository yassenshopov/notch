import { Settings } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react"
import { useSettings } from "../config/settings-store"
import { useSpotify } from "../hooks/useSpotify"
import { useTheme } from "../hooks/useTheme"
import { useWeather } from "../hooks/useWeather"
import { cn, formatTemp } from "../lib/utils"
import { useAlbumPalette } from "../hooks/useAlbumPalette"
import { useOccasionalSmile } from "../hooks/useOccasionalSmile"
import { BotSmile } from "./BotSmile"
import { EqualizerBars } from "./EqualizerBars"
import { SettingsPanel } from "./SettingsPanel"
import { SpotifyPanel } from "./SpotifyPanel"
import { WeatherIcon } from "./WeatherIcon"
import { WeatherPanel } from "./WeatherPanel"

type Panel = "weather" | "spotify" | "settings"

export function Notch() {
  const [expanded, setExpanded] = useState(false)
  const [panelOverride, setPanelOverride] = useState<Panel | null>(null)
  const [connecting, setConnecting] = useState(false)
  const settings = useSettings()
  const { data, loading, error, refresh } = useWeather()
  const { status, playing, connect, action, disconnect } = useSpotify()
  const dark = useTheme()
  const hoveringPill = useRef(false)
  const smiling = useOccasionalSmile(!expanded && !playing)

  const collapsedWidth = settings.collapsed.width

  const activePanel: Panel = useMemo(() => {
    if (panelOverride) return panelOverride
    return playing ? "spotify" : "weather"
  }, [panelOverride, playing])

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
  useEffect(() => {
    if (prevPlaying.current === playing) return
    prevPlaying.current = playing
    setPanelOverride((current) => (current === "settings" ? current : null))
  }, [playing])

  // Grow/shrink the OS shell + mouse capture with expand state.
  useEffect(() => {
    void window.notch?.setExpanded({ expanded, music: playing })
    if (!expanded && hoveringPill.current) {
      void window.notch?.setPassthrough(false)
    }
  }, [expanded, playing])

  useEffect(() => {
    void window.notch?.reposition?.()
  }, [])

  // Clicking another app / the desktop blurs us — treat as outside dismiss.
  useEffect(() => {
    return window.notch?.onBlur?.(() => {
      setExpanded(false)
    })
  }, [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (panelOverride === "settings") setPanelOverride(null)
        else setExpanded(false)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [expanded, panelOverride])

  const collapse = () => setExpanded(false)
  const expand = () => setExpanded(true)

  const unit = settings.temperatureUnit
  // Slightly softer than the settings spring so size changes don’t feel snappy/harsh
  const sizeTransition = {
    type: "spring" as const,
    stiffness: Math.min(settings.motion.stiffness, 320),
    damping: Math.max(settings.motion.damping, 36),
    mass: settings.motion.mass,
  }
  const fill = albumThemed && albumPalette ? albumPalette.bg : dark ? "#111111" : "#f7f7f5"
  const themedFg = albumThemed && albumPalette ? albumPalette.fg : null
  const bottomRadius = expanded ? 32 : 18
  const fillTransition = {
    ...sizeTransition,
    // Color morph should feel a touch quicker than the size spring
    stiffness: 280,
    damping: 34,
  }

  const openSettings = (e: MouseEvent) => {
    e.stopPropagation()
    expand()
    setPanelOverride("settings")
  }

  const setPillHover = (over: boolean) => {
    hoveringPill.current = over
    if (expanded) return
    void window.notch?.setPassthrough(!over)
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-start justify-center select-none",
        // Windows ignores clicks on fully transparent pixels — keep a whisper of fill
        expanded && "bg-black/[0.02]",
      )}
      onPointerDown={(e) => {
        // Only dismiss when the press is on the backdrop itself, not the notch
        if (expanded && e.target === e.currentTarget) collapse()
      }}
    >
      <motion.div
        initial={false}
        animate={{
          width: expanded ? settings.expanded.width : collapsedWidth,
          height: expanded ? settings.expanded.height : settings.collapsed.height,
          borderBottomLeftRadius: bottomRadius,
          borderBottomRightRadius: bottomRadius,
        }}
        transition={sizeTransition}
        onMouseEnter={() => setPillHover(true)}
        onMouseLeave={() => setPillHover(false)}
        onPointerDown={(e) => {
          // Keep presses on the panel from hitting the backdrop
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (!expanded) expand()
        }}
        onContextMenu={(e) => {
          e.preventDefault()
          e.stopPropagation()
          refresh()
        }}
        style={
          {
            "--notch-fill": fill,
            color: themedFg ?? undefined,
            transformOrigin: "top center",
            willChange: "width, height",
          } as CSSProperties
        }
        className={cn(
          "notch-fold relative overflow-visible",
          !themedFg && (dark ? "text-white" : "text-[#111111]"),
          expanded ? "cursor-default" : "cursor-pointer",
        )}
      >
        {/* Smooth inverted scoops where the notch meets the top edge */}
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
          transition={albumThemed ? fillTransition : sizeTransition}
          style={
            !dark && !albumThemed
              ? {
                  boxShadow:
                    "inset 0 -1px 0 rgba(0,0,0,0.06), inset 1px 0 0 rgba(0,0,0,0.04), inset -1px 0 0 rgba(0,0,0,0.04)",
                }
              : undefined
          }
        />

        <AnimatePresence mode="sync" initial={false}>
          {!expanded ? (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="relative z-10 flex h-full items-center justify-center gap-2.5 px-5"
            >
              {loading && !data ? (
                <span
                  className={cn(
                    "text-[13px] font-medium tracking-wide",
                    dark ? "text-white/40" : "text-black/35",
                  )}
                >
                  …
                </span>
              ) : error && !data ? (
                <span className="text-[12px] font-medium text-red-400">offline</span>
              ) : (
                <span
                  className="relative flex h-full min-w-[4.5rem] items-center justify-center"
                  style={
                    {
                      // Face uses notch fill as “skin”; eyes cut out in the opposite tone
                      "--bot-eye": themedFg ? fill : dark ? "#111111" : "#f7f7f5",
                    } as CSSProperties
                  }
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {playing ? (
                      <motion.span
                        key="eq"
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
                    ) : data ? (
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
              transition={{ duration: 0.18, ease: "easeOut", delay: 0.06 }}
              className="relative z-10 flex h-full flex-col px-8 pb-10 pt-8"
            >
              {activePanel !== "settings" ? (
                <button
                  type="button"
                  aria-label="Settings"
                  onClick={openSettings}
                  className={cn(
                    "absolute right-6 top-6 z-20 rounded-full p-1.5 transition-colors",
                    albumPalette && spotifyPanelThemed
                      ? "text-current/40 hover:bg-black/10 hover:text-current/80"
                      : "text-black/35 hover:bg-black/5 hover:text-black/70 dark:text-white/35 dark:hover:bg-white/10 dark:hover:text-white/80",
                  )}
                >
                  <Settings className="size-4" strokeWidth={1.75} />
                </button>
              ) : null}

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

              <div
                className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <TabChip
                  label="Weather"
                  active={activePanel === "weather"}
                  themed={Boolean(albumPalette && spotifyPanelThemed)}
                  onClick={() => setPanelOverride("weather")}
                />
                <TabChip
                  label="Spotify"
                  active={activePanel === "spotify"}
                  themed={Boolean(albumPalette && spotifyPanelThemed)}
                  onClick={() => setPanelOverride("spotify")}
                />
                <TabChip
                  label="Settings"
                  active={activePanel === "settings"}
                  themed={Boolean(albumPalette && spotifyPanelThemed)}
                  onClick={() => setPanelOverride("settings")}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function TabChip({
  label,
  active,
  onClick,
  themed,
}: {
  label: string
  active: boolean
  onClick: () => void
  themed?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[10px] font-semibold tracking-wide uppercase",
        themed
          ? active
            ? "bg-white/90 text-black"
            : "bg-white/10 text-current/55"
          : active
            ? "bg-black/90 text-white dark:bg-white dark:text-black"
            : "bg-black/5 text-black/45 dark:bg-white/10 dark:text-white/45",
      )}
    >
      {label}
    </button>
  )
}
