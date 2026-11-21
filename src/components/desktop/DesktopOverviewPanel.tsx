import { Icon } from "@iconify/react"
import { ChevronRight, MoreVertical } from "lucide-react"
import { useMemo, useState, type ReactNode } from "react"
import {
  eventsOnDay,
  filterEventsByHiddenCalendars,
  nextEvent,
  type CalendarSnapshot,
} from "../../lib/calendar"
import type { CursorStatus } from "../../lib/cursor"
import { computeCursorCyclePace } from "../../lib/cursor-cycle"
import type { GitHubStatus } from "../../lib/github"
import {
  localContributionDateKey,
  sumGitHubRepoCounts,
  todayContributionCount,
} from "../../lib/github"
import { maskHost, maskLogin, usePrivacyMode } from "../../lib/privacy"
import type { NotchPanel } from "../../lib/panel-routing"
import type { MintServerStatus } from "../../lib/mint"
import type { PiServerStatus } from "../../lib/pi"
import type { MarketsSnapshot } from "../../lib/markets"
import { formatMarketsError, formatQuoteChange, formatQuotePrice } from "../../lib/markets"
import type { SpotifyStatus } from "../../lib/spotify"
import { formatDistance, type StravaStatus } from "../../lib/strava"
import type { WeatherSnapshot, WeatherCode } from "../../lib/weather"
import { cn, formatTemp } from "../../lib/utils"
import { useSettings } from "../../config/settings-store"
import {
  collectOverviewInsights,
  formatOverviewDate,
  overviewGreeting,
} from "../../lib/overview-insights"
import {
  enabledOverviewCards,
  resolveOverviewCards,
  type OverviewCardId,
} from "../../lib/overview-panels"
import { aqiCategory, formatAqi, formatUv, uvCategory } from "../../lib/air-quality"
import { CountryFlag } from "../CountryFlag"
import { WeatherIcon } from "../WeatherIcon"
import { AnimatedNumber } from "../AnimatedNumber"
import { PanelHeaderActions } from "../PanelHeaderActions"
import { BentoGrid, BentoTile, bentoPad, type BentoCol } from "./DesktopBento"
import { OverviewPanelsSettingsModal } from "./OverviewPanelsSettingsModal"
import { DesktopOverviewPanelSkeleton, SkeletonBlock } from "./DesktopSkeleton"

type Props = {
  onNavigate: (panel: NotchPanel) => void
  weather: WeatherSnapshot | null
  weatherLoading: boolean
  weatherError: string | null
  spotify: SpotifyStatus
  github: GitHubStatus
  githubLoading: boolean
  cursor: CursorStatus
  cursorLoading: boolean
  strava: StravaStatus
  stravaLoading: boolean
  mint: MintServerStatus
  mintLoading: boolean
  pi: PiServerStatus
  piLoading: boolean
  markets: MarketsSnapshot
  marketsLoading: boolean
  calendar: CalendarSnapshot
  calendarLoading: boolean
}

const MEDIA_ROW: OverviewCardId[] = ["github", "cursor", "spotify"]

function weatherCodeLabel(code: WeatherCode): string {
  switch (code) {
    case "clear":
      return "Clear"
    case "partly":
      return "Partly cloudy"
    case "cloudy":
      return "Cloudy"
    case "fog":
      return "Fog"
    case "drizzle":
      return "Drizzle"
    case "rain":
      return "Rain"
    case "snow":
      return "Snow"
    case "thunder":
      return "Thunderstorms"
    default:
      return "—"
  }
}

function rowSpan(count: number): BentoCol {
  if (count <= 1) return 12
  if (count === 2) return 6
  if (count === 3) return 4
  return 3
}

function pairSpan(both: boolean, primary: boolean): BentoCol {
  if (!both) return 6
  return primary ? 8 : 4
}

export function DesktopOverviewPanel(props: Props) {
  const {
    onNavigate,
    weather,
    weatherLoading,
    weatherError,
    spotify,
    github,
    githubLoading,
    cursor,
    cursorLoading,
    strava,
    stravaLoading,
    mint,
    mintLoading,
    pi,
    piLoading,
    markets,
    marketsLoading,
    calendar,
    calendarLoading,
  } = props

  const settings = useSettings()
  const privacy = usePrivacyMode()
  const unit = settings.temperatureUnit
  const cards = resolveOverviewCards(settings)
  const enabled = useMemo(() => new Set(enabledOverviewCards(cards)), [cards])

  const [settingsOpen, setSettingsOpen] = useState(false)

  const todayKey = localContributionDateKey()
  const today = weather?.days.find((d) => d.isToday)
  const visibleEvents = filterEventsByHiddenCalendars(
    calendar.events,
    settings.calendar.hiddenCalendarIds,
  )
  const upcoming = nextEvent(visibleEvents)
  const todayEvents = today ? eventsOnDay(visibleEvents, today.date) : []
  const ghToday = todayContributionCount(github.contributions?.weeks ?? [])
  const pace = computeCursorCyclePace(cursor.usage, cursor.billing)
  const insights = collectOverviewInsights({
    settings,
    weather,
    calendar: visibleEvents,
    github,
    cursor,
  })

  const ghRepos = useMemo(() => {
    const rows = (github.todayBreakdown?.repos ?? []).filter((r) => r.count > 0)
    return rows.slice(0, 3)
  }, [github.todayBreakdown?.repos])
  const ghCommitSum = sumGitHubRepoCounts(ghRepos)
  const ghOther = Math.max(0, ghToday - ghCommitSum)

  const stravaToday = useMemo(() => {
    if (!strava.connected) return []
    return strava.calendarActivities.filter((a) => a.startDate.slice(0, 10) === todayKey)
  }, [strava.calendarActivities, strava.connected, todayKey])

  const marketMovers = useMemo(() => {
    return [...(markets.quotes ?? [])]
      .filter((q) => q.changePercent24h != null)
      .sort((a, b) => Math.abs(b.changePercent24h ?? 0) - Math.abs(a.changePercent24h ?? 0))
      .slice(0, 3)
  }, [markets.quotes])

  const booting =
    (cards.weather && weatherLoading && !weather) ||
    (cards.calendar && calendarLoading && !calendar.connected && calendar.configured) ||
    (cards.github && githubLoading && github.configured && !github.login) ||
    (cards.cursor && cursorLoading && cursor.connected && !cursor.usage) ||
    (cards.strava && stravaLoading && strava.connected && !strava.stats) ||
    (cards.markets && marketsLoading && !markets.quotes?.length && !markets.error)

  const mediaVisible = MEDIA_ROW.filter((id) => cards[id])
  const topRowWeather = cards.weather
  const topRowCalendar = cards.calendar
  const bottomRow =
    (cards.strava ? 1 : 0) + (cards.homelab ? 1 : 0) + (cards.markets ? 1 : 0) + (cards.air ? 1 : 0)

  if (booting) {
    return <DesktopOverviewPanelSkeleton cards={cards} />
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <header className="relative mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 pr-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            {formatOverviewDate()}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold tracking-tight">{overviewGreeting()}</h1>
          <p className="mt-1 text-[13px] text-black/45 dark:text-white/45">
            {enabled.size === 0
              ? "No panels selected — open settings to show cards."
              : insights.length > 0
                ? `${insights.length} thing${insights.length === 1 ? "" : "s"} need attention today.`
                : "Your integrations at a glance — open any card for detail."}
          </p>
        </div>
        <PanelHeaderActions className="absolute right-0 top-0">
          <button
            type="button"
            aria-label="Overview panel settings"
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen(true)}
            className="rounded-full p-2 text-black/40 hover:bg-black/5 dark:text-white/40 dark:hover:bg-white/10"
          >
            <MoreVertical className="size-4" />
          </button>
        </PanelHeaderActions>
      </header>

      {insights.length > 0 ? (
        <BentoGrid className="mb-4">
          <BentoTile col={12} className={bentoPad()}>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
              Heads up
            </p>
            <ul className="flex flex-col gap-1">
              {insights.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(item.panel)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.05]"
                  >
                    <span className="truncate text-[13px] font-medium">{item.label}</span>
                    <ChevronRight className="size-4 shrink-0 text-black/25 transition-transform group-hover:translate-x-0.5 dark:text-white/25" />
                  </button>
                </li>
              ))}
            </ul>
          </BentoTile>
        </BentoGrid>
      ) : null}

      <BentoGrid>
        {topRowWeather ? (
          <OverviewCard
            col={pairSpan(topRowWeather && topRowCalendar, true)}
            title="Weather"
            icon={<Icon icon="lucide:cloud-sun" className="size-3.5 opacity-70" aria-hidden />}
            onOpen={() => onNavigate("weather")}
            loading={weatherLoading && !today}
          >
            {today && weather ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-medium">
                      <CountryFlag code={weather.countryCode} className="h-3 w-[1.125rem]" />
                      <span className="truncate">{weather.locationLabel}</span>
                    </p>
                    <p className="mt-2 flex items-baseline gap-2">
                      <AnimatedNumber
                        value={today.temperature}
                        format={(n) => formatTemp(n, unit)}
                        className="text-[36px] font-bold tabular-nums leading-none tracking-tight"
                      />
                    </p>
                    <p className="mt-1 text-[12px] text-black/50 dark:text-white/50">
                      {weatherCodeLabel(today.code)} · H {Math.round(today.high)}° · L{" "}
                      {Math.round(today.low)}°
                    </p>
                  </div>
                  <WeatherIcon code={today.code} isDay={today.isDay} className="size-11 shrink-0" />
                </div>
                {today.aqi != null ? (
                  <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">
                    Air {formatAqi(today.aqi, today.aqiScale)} ({aqiCategory(today.aqi, today.aqiScale)}
                    ){today.uvIndex != null ? ` · UV ${formatUv(today.uvIndex)}` : ""}
                  </p>
                ) : null}
              </>
            ) : (
              <Muted>{weatherError ?? "Weather unavailable"}</Muted>
            )}
          </OverviewCard>
        ) : null}

        {topRowCalendar ? (
          <OverviewCard
            col={pairSpan(topRowWeather && topRowCalendar, false)}
            title="Calendar"
            icon={<Icon icon="lucide:calendar" className="size-3.5 opacity-70" aria-hidden />}
            onOpen={() => onNavigate("calendar")}
            loading={calendarLoading && calendar.configured && !calendar.connected}
          >
            {upcoming ? (
              <>
                <p className="truncate text-[16px] font-semibold tracking-tight">{upcoming.summary}</p>
                <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                  {formatEventWhen(upcoming.start, upcoming.end)}
                </p>
                {todayEvents.length > 1 ? (
                  <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                    +{todayEvents.length - 1} more today
                  </p>
                ) : todayEvents.length === 0 && !calendar.connected ? (
                  <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                    Connect Google Calendar in Settings
                  </p>
                ) : null}
              </>
            ) : (
              <Muted>
                {!calendar.connected && calendar.configured
                  ? "Connect Google Calendar"
                  : todayEvents.length === 0
                    ? "Clear schedule ahead"
                    : "Nothing left today"}
              </Muted>
            )}
          </OverviewCard>
        ) : null}

        {mediaVisible.map((id) => {
          const col = rowSpan(mediaVisible.length)
          if (id === "github") {
            return (
              <OverviewCard
                key={id}
                col={col}
                title="GitHub"
                icon={<Icon icon="simple-icons:github" className="size-3.5 opacity-70" aria-hidden />}
                onOpen={() => onNavigate("github")}
                loading={githubLoading && github.configured && !github.connected && !github.error}
              >
                {github.connected ? (
                  <>
                    <p className="text-[32px] font-bold tabular-nums leading-none">
                      <AnimatedNumber value={ghToday} />
                    </p>
                    <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                      contributions today
                      {github.login ? ` · @${maskLogin(github.login, privacy)}` : ""}
                    </p>
                    {ghRepos.length > 0 ? (
                      <ul className="mt-2.5 space-y-0.5">
                        {ghRepos.map((row) => (
                          <li
                            key={row.repo}
                            className="flex items-baseline justify-between gap-2 text-[11px]"
                          >
                            <span className="truncate text-black/55 dark:text-white/55">{row.repo}</span>
                            <span className="shrink-0 tabular-nums font-semibold">{row.count}</span>
                          </li>
                        ))}
                        {ghOther > 0 ? (
                          <li className="text-[10px] text-black/38 dark:text-white/38">
                            Other activity · {ghOther}
                          </li>
                        ) : null}
                      </ul>
                    ) : github.pullRequests.length > 0 ? (
                      <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
                        {github.pullRequests.length} open PR
                        {github.pullRequests.length === 1 ? "" : "s"} on your radar
                      </p>
                    ) : null}
                  </>
                ) : (
                  <Muted>{github.error ?? github.message ?? "Not connected"}</Muted>
                )}
              </OverviewCard>
            )
          }
          if (id === "cursor") {
            const pct = cursor.usage ? Math.round(cursor.usage.totalPercentUsed) : null
            return (
              <OverviewCard
                key={id}
                col={col}
                title="Cursor"
                icon={<Icon icon="lucide:mouse-pointer-2" className="size-3.5 opacity-70" aria-hidden />}
                onOpen={() => onNavigate("cursor")}
                loading={cursorLoading && !cursor.connected && !cursor.error}
              >
                {cursor.connected && cursor.usage && pct != null ? (
                  <>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-[32px] font-bold tabular-nums leading-none">
                        <AnimatedNumber value={pct} suffix="%" />
                      </p>
                      {cursor.billing?.daysLeft != null ? (
                        <span className="text-[11px] text-black/40 dark:text-white/40">
                          {cursor.billing.daysLeft}d left
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          pct >= 90 ? "bg-amber-500" : "bg-black/70 dark:bg-white/80",
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
                      {pace
                        ? pace.onTrack
                          ? "On track for this cycle"
                          : `Hot pace · ~${Math.round(pace.projectedEndPercent)}% projected`
                        : "Included quota"}
                    </p>
                  </>
                ) : (
                  <Muted>Usage unavailable</Muted>
                )}
              </OverviewCard>
            )
          }
          return (
            <OverviewCard
              key={id}
              col={col}
              title="Now playing"
              icon={<Icon icon="simple-icons:spotify" className="size-3.5 text-[#1db954]" aria-hidden />}
              onOpen={() => onNavigate("spotify")}
            >
              {spotify.track ? (
                <div className="flex gap-3">
                  <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-black/5 dark:bg-white/10">
                    {spotify.track.artUrl ? (
                      <img src={spotify.track.artUrl} alt="" className="size-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold tracking-tight">
                      {spotify.track.name}
                    </p>
                    <p className="truncate text-[12px] text-black/45 dark:text-white/45">
                      {spotify.track.artists}
                    </p>
                    {spotify.durationMs && spotify.progressMs != null ? (
                      <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                        <div
                          className="h-full rounded-full bg-[#1db954]"
                          style={{
                            width: `${Math.min(100, (spotify.progressMs / spotify.durationMs) * 100)}%`,
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <Muted>{spotify.connected ? "Spotify idle" : "Connect Spotify in Settings"}</Muted>
              )}
            </OverviewCard>
          )
        })}

        {cards.strava ? (
          <OverviewCard
            col={bottomRow >= 3 ? 4 : 6}
            title="Strava"
            icon={<Icon icon="simple-icons:strava" className="size-3.5 text-[#fc4c02]" aria-hidden />}
            onOpen={() => onNavigate("strava")}
            loading={stravaLoading && strava.connected && !strava.stats}
          >
            {strava.connected ? (
              <>
                {stravaToday.length > 0 ? (
                  <>
                    <p className="text-[15px] font-semibold">
                      {stravaToday.length} activit{stravaToday.length === 1 ? "y" : "ies"} today
                    </p>
                    <p className="mt-1 text-[12px] capitalize text-black/45 dark:text-white/45">
                      {stravaToday.map((a) => a.type.toLowerCase()).join(" · ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[28px] font-bold tabular-nums leading-none">
                      {formatDistance(strava.monthDistance)}
                    </p>
                    <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
                      this month
                      {strava.streak?.weeks ? ` · ${strava.streak.weeks}w streak` : ""}
                    </p>
                  </>
                )}
              </>
            ) : (
              <Muted>Connect Strava</Muted>
            )}
          </OverviewCard>
        ) : null}

        {cards.homelab ? (
          <OverviewCard
            col={bottomRow >= 3 ? 4 : 6}
            title="Homelab"
            icon={<Icon icon="lucide:server" className="size-3.5 opacity-70" aria-hidden />}
            onOpen={() => onNavigate(mint.connected ? "mint" : "pi")}
            loading={(mintLoading && !mint.error) || (piLoading && !pi.error)}
          >
            <div className="grid gap-2">
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
        ) : null}

        {cards.markets ? (
          <OverviewCard
            col={bottomRow >= 3 ? 4 : 6}
            title="Markets"
            icon={<Icon icon="lucide:chart-line" className="size-3.5 opacity-70" aria-hidden />}
            onOpen={() => onNavigate("markets")}
            loading={marketsLoading && !markets.quotes?.length}
          >
            {marketMovers.length > 0 ? (
              <ul className="space-y-2">
                {marketMovers.map((q) => {
                  const change = q.changePercent24h ?? 0
                  const up = change >= 0
                  return (
                    <li key={q.id} className="flex items-baseline justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{q.symbol}</p>
                        <p className="text-[11px] text-black/40 dark:text-white/40">
                          {formatQuotePrice(q.price)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-[12px] font-semibold tabular-nums",
                          up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400",
                        )}
                      >
                        {formatQuoteChange(q.changePercent24h)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <Muted>{markets.error ? formatMarketsError(markets.error) : "No quotes"}</Muted>
            )}
          </OverviewCard>
        ) : null}

        {cards.air ? (
          <OverviewCard
            col={bottomRow >= 3 ? 4 : 6}
            title="Air quality"
            icon={<Icon icon="lucide:wind" className="size-3.5 opacity-70" aria-hidden />}
            onOpen={() => onNavigate("air")}
            loading={weatherLoading && !today}
          >
            {today ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-[28px] font-bold tabular-nums">
                    {today.aqi != null ? formatAqi(today.aqi, today.aqiScale) : "—"}
                  </span>
                  {today.aqi != null ? (
                    <span className="text-[12px] text-black/45 dark:text-white/45">
                      {aqiCategory(today.aqi, today.aqiScale)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-[12px] text-black/45 dark:text-white/45">
                  {today.uvIndex != null
                    ? `UV ${formatUv(today.uvIndex)} (${uvCategory(today.uvIndex)})`
                    : "UV —"}
                  {today.pollen != null && today.pollen > 0
                    ? ` · Pollen ${Math.round(today.pollen)}`
                    : ""}
                </p>
              </>
            ) : (
              <Muted>Load weather for air data</Muted>
            )}
          </OverviewCard>
        ) : null}
      </BentoGrid>

      <OverviewPanelsSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}

function Muted({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-black/45 dark:text-white/45">{children}</p>
}

function OverviewCard({
  col,
  title,
  icon,
  onOpen,
  loading,
  children,
}: {
  col: BentoCol
  title: string
  icon?: ReactNode
  onOpen: () => void
  loading?: boolean
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
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
              {title}
            </p>
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-black/25 transition-transform group-hover:translate-x-0.5 dark:text-white/25"
            aria-hidden
          />
        </div>
        <div className="min-h-0 flex-1">
          {loading ? (
            <div className="space-y-2" aria-hidden>
              <SkeletonBlock className="h-8 w-24" />
              <SkeletonBlock className="h-3 w-full max-w-[12rem]" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          ) : (
            children
          )}
        </div>
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
          className={cn("size-2 shrink-0 rounded-full", ok ? "bg-emerald-500" : "bg-red-500")}
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
  const today = new Date()
  const isToday = start.toDateString() === today.toDateString()
  return isToday ? `Today ${time}` : `${start.toLocaleDateString(undefined, { weekday: "short" })} ${time}`
}