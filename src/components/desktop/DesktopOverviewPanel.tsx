import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"
import { nextEvent } from "../../lib/calendar"
import type { CalendarSnapshot } from "../../lib/calendar"
import type { CursorStatus } from "../../lib/cursor"
import { computeCursorCyclePace } from "../../lib/cursor-cycle"
import type { GitHubStatus } from "../../lib/github"
import { todayContributionCount } from "../../lib/github"
import { maskHost, maskLogin, usePrivacyMode } from "../../lib/privacy"
import type { NotchPanel } from "../../lib/panel-routing"
import type { MintServerStatus } from "../../lib/mint"
import type { PiServerStatus } from "../../lib/pi"
import type { SpotifyStatus } from "../../lib/spotify"
import { formatDistance, type StravaStatus } from "../../lib/strava"
import type { WeatherSnapshot } from "../../lib/weather"
import { cn, formatTemp } from "../../lib/utils"
import { useSettings } from "../../config/settings-store"
import { CountryFlag } from "../CountryFlag"
import { WeatherIcon } from "../WeatherIcon"
import { BentoGrid, BentoTile, bentoPad, type BentoCol } from "./DesktopBento"

type Props = {
  onNavigate: (panel: NotchPanel) => void
  weather: WeatherSnapshot | null
  weatherError: string | null
  spotify: SpotifyStatus
  github: GitHubStatus
  cursor: CursorStatus
  strava: StravaStatus
  mint: MintServerStatus
  pi: PiServerStatus
  calendar: CalendarSnapshot
}

export function DesktopOverviewPanel({
  onNavigate,
  weather,
  weatherError,
  spotify,
  github,
  cursor,
  strava,
  mint,
  pi,
  calendar,
}: Props) {
  const settings = useSettings()
  const privacy = usePrivacyMode()
  const unit = settings.temperatureUnit
  const today = weather?.days.find((d) => d.isToday)
  const upcoming = nextEvent(calendar.events)
  const pace = computeCursorCyclePace(cursor.usage, cursor.billing)
  const ghToday = todayContributionCount(github.contributions?.weeks ?? [])

  return (
    <div className="space-y-2">
      <header className="mb-6">
        <h1 className="text-[26px] font-semibold tracking-tight">Today</h1>
        <p className="mt-1 text-[13px] text-black/45 dark:text-white/45">
          Essentials from your integrations — open any card for detail.
        </p>
      </header>

      <BentoGrid>
        <OverviewCard col={6} title="Weather" onOpen={() => onNavigate("weather")}>
          {today && weather ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-medium">
                  <CountryFlag code={weather.countryCode} className="h-3 w-[1.125rem]" />
                  <span className="truncate">{weather.locationLabel}</span>
                </p>
                <p className="mt-2 text-[32px] font-bold tabular-nums leading-none tracking-tight">
                  {formatTemp(today.temperature, unit)}
                </p>
                <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                  H {Math.round(today.high)}° · L {Math.round(today.low)}°
                </p>
              </div>
              <WeatherIcon code={today.code} isDay={today.isDay} className="size-10" />
            </div>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">
              {weatherError ?? "Loading weather…"}
            </p>
          )}
        </OverviewCard>

        <OverviewCard col={6} title="Calendar" onOpen={() => onNavigate("calendar")}>
          {upcoming ? (
            <div>
              <p className="truncate text-[15px] font-semibold">{upcoming.summary}</p>
              <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                {formatEventWhen(upcoming.start, upcoming.end)}
              </p>
            </div>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">
              {calendar.events.length === 0 ? "No upcoming events" : "Nothing left today"}
            </p>
          )}
        </OverviewCard>

        <OverviewCard col={4} title="Now playing" onOpen={() => onNavigate("spotify")}>
          {spotify.track ? (
            <div className="flex gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                {spotify.track.artUrl ? (
                  <img src={spotify.track.artUrl} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold">{spotify.track.name}</p>
                <p className="truncate text-[12px] text-black/45 dark:text-white/45">
                  {spotify.track.artists}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">Spotify idle</p>
          )}
        </OverviewCard>

        <OverviewCard col={4} title="GitHub" onOpen={() => onNavigate("github")}>
          {github.connected ? (
            <>
              <p className="text-[28px] font-bold tabular-nums">{ghToday}</p>
              <p className="text-[12px] text-black/45 dark:text-white/45">
                contributions today
                {github.login ? ` · @${maskLogin(github.login, privacy)}` : ""}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">Not connected</p>
          )}
        </OverviewCard>

        <OverviewCard col={4} title="Cursor" onOpen={() => onNavigate("cursor")}>
          {cursor.connected && cursor.usage ? (
            <>
              <p className="text-[28px] font-bold tabular-nums">
                {Math.round(cursor.usage.totalPercentUsed)}%
              </p>
              <p className="text-[12px] text-black/45 dark:text-white/45">
                {pace
                  ? pace.onTrack
                    ? `On track · ${cursor.billing?.daysLeft ?? "—"}d to renewal`
                    : `Hot pace · ~${Math.round(pace.projectedEndPercent)}% projected`
                  : "Included quota"}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">Usage unavailable</p>
          )}
        </OverviewCard>

        <OverviewCard col={6} title="Strava" onOpen={() => onNavigate("strava")}>
          {strava.connected ? (
            <>
              <p className="text-[22px] font-bold tabular-nums">
                {formatDistance(strava.monthDistance)}
              </p>
              <p className="text-[12px] text-black/45 dark:text-white/45">
                this month · {strava.streak?.weeks ?? 0}w streak
              </p>
            </>
          ) : (
            <p className="text-[13px] text-black/45 dark:text-white/45">Connect Strava</p>
          )}
        </OverviewCard>

        <OverviewCard col={6} title="Homelab" onOpen={() => onNavigate(mint.connected ? "mint" : "pi")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <ServerGlance
              name="Mint"
              host={maskHost(settings.mint.sshHost, privacy)}
              ok={mint.connected && !mint.error}
              detail={
                mint.connected
                  ? `Load ${mint.load1 != null ? mint.load1.toFixed(2) : "—"}`
                  : mint.error ?? "Offline"
              }
              onClick={() => onNavigate("mint")}
            />
            <ServerGlance
              name="Pi"
              host={maskHost(settings.pi.sshHost, privacy)}
              ok={pi.connected && !pi.error}
              detail={
                pi.connected
                  ? `CPU ${pi.cpuTempC != null ? `${pi.cpuTempC.toFixed(1)}°C` : "—"}`
                  : pi.error ?? "Offline"
              }
              onClick={() => onNavigate("pi")}
            />
          </div>
        </OverviewCard>
      </BentoGrid>
    </div>
  )
}

function OverviewCard({
  col,
  title,
  onOpen,
  children,
}: {
  col: BentoCol
  title: string
  onOpen: () => void
  children: ReactNode
}) {
  return (
    <BentoTile col={col} className={bentoPad()}>
      <button
        type="button"
        onClick={onOpen}
        className="group flex h-full w-full flex-col text-left"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            {title}
          </p>
          <ChevronRight
            className="size-4 text-black/25 transition-transform group-hover:translate-x-0.5 dark:text-white/25"
            aria-hidden
          />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </button>
    </BentoTile>
  )
}

function ServerGlance({
  name,
  host,
  ok,
  detail,
  onClick,
}: {
  name: string
  host: string
  ok: boolean
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="rounded-xl bg-black/[0.03] px-2.5 py-2 text-left transition-colors hover:bg-black/[0.06] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn("size-2 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")}
          aria-hidden
        />
        <span className="text-[13px] font-semibold">{name}</span>
        <span className="truncate text-[11px] text-black/35 dark:text-white/35">{host}</span>
      </div>
      <p className="mt-1 text-[11px] text-black/45 dark:text-white/45">{detail}</p>
    </button>
  )
}

function formatEventWhen(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const sameDay = start.toDateString() === end.toDateString()
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  if (!sameDay) {
    return `${start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${time}`
  }
  return `Today ${time}`
}
