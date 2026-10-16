import { useMemo } from "react"
import { useSettings } from "../config/settings-store"
import {
  aqiCategory,
  formatAqi,
  formatUv,
  POLLEN_TYPE_LABEL,
  pollenCategory,
  type PollenType,
  uvCategory,
} from "../lib/air-quality"
import type { DayForecast, WeatherSnapshot } from "../lib/weather"
import { cn, formatHour } from "../lib/utils"
import { MetricChart } from "./MetricChart"

type Props = {
  data: WeatherSnapshot
}

const POLLEN_TYPES: PollenType[] = [
  "grass",
  "birch",
  "alder",
  "olive",
  "ragweed",
  "mugwort",
]

export function AirQualityPanel({ data }: Props) {
  const settings = useSettings()
  const today = data.days.find((d) => d.isToday) ?? data.days[0]
  if (!today) return null

  const series = today.series.length > 0 ? today.series : today.hourly
  const aqiPoints = useMemo(
    () =>
      series
        .filter((p) => p.aqi != null)
        .map((p) => ({ time: p.time, value: p.aqi as number })),
    [series],
  )
  const uvPoints = useMemo(
    () => series.map((p) => ({ time: p.time, value: p.uvIndex })),
    [series],
  )

  const pollenNow = useMemo(() => pollenBreakdownForDay(today), [today])

  const clockFormat = settings.clock.format
  const chartStyle = settings.charts?.style ?? "line"

  return (
    <div
      className="notch-scroll flex h-full flex-col pr-1"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="mb-4 pr-10">
        <p className="text-[15px] font-semibold tracking-tight">Air quality</p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          {data.locationLabel} · hourly AQI, UV & pollen
        </p>
      </header>

      <section className="mb-5 rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Now
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat
            label="AQI"
            value={today.aqi != null ? String(today.aqi) : "—"}
            hint={
              today.aqi != null
                ? `${today.aqiScale === "us" ? "US" : "EU"} · ${aqiCategory(today.aqi, today.aqiScale)}`
                : "No data"
            }
          />
          <Stat
            label="UV"
            value={String(today.uvIndex)}
            hint={uvCategory(today.uvIndex)}
          />
          <Stat
            label="PM2.5"
            value={today.pm25 != null ? `${today.pm25}` : "—"}
            hint="µg/m³"
          />
        </div>
      </section>

      {aqiPoints.length > 1 ? (
        <ChartBlock
          title="AQI today"
          subtitle={today.aqi != null ? formatAqi(today.aqi, today.aqiScale) : undefined}
          points={aqiPoints}
          chartStyle={chartStyle}
          clockFormat={clockFormat}
          formatValue={(v) => String(Math.round(v))}
        />
      ) : null}

      {uvPoints.length > 1 ? (
        <ChartBlock
          title="UV index"
          subtitle={formatUv(today.uvIndex)}
          points={uvPoints}
          chartStyle={chartStyle}
          clockFormat={clockFormat}
          formatValue={(v) => String(Math.round(v * 10) / 10)}
        />
      ) : null}

      <section className="mt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          Pollen by type
        </p>
        <p className="mt-1 text-[12px] text-black/45 dark:text-white/45">
          Peak grains/m³ today (when available for your region)
        </p>
        <ul className="mt-3 space-y-2">
          {pollenNow.length === 0 ? (
            <li className="text-[13px] text-black/40 dark:text-white/40">No pollen data</li>
          ) : (
            pollenNow.map((row) => (
              <li
                key={row.type}
                className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] px-3 py-2 dark:border-white/10"
              >
                <span className="text-[13px] font-medium">{POLLEN_TYPE_LABEL[row.type]}</span>
                <span className="text-[12px] tabular-nums text-black/55 dark:text-white/55">
                  {row.grains} · {pollenCategory(row.grains)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  )
}

function pollenBreakdownForDay(day: DayForecast) {
  const maxByType = new Map<PollenType, number>()
  for (const point of day.series.length > 0 ? day.series : day.hourly) {
    const grains = point.pollenGrains
    if (!grains) continue
    for (const type of POLLEN_TYPES) {
      const v = grains[type]
      if (v == null) continue
      maxByType.set(type, Math.max(maxByType.get(type) ?? 0, v))
    }
  }
  return POLLEN_TYPES
    .map((type) => ({ type, grains: maxByType.get(type) ?? 0 }))
    .filter((row) => row.grains > 0)
    .sort((a, b) => b.grains - a.grains)
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
        {label}
      </p>
      <p className="mt-0.5 text-[22px] font-bold leading-none tabular-nums tracking-tight">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] text-black/45 dark:text-white/45">{hint}</p>
    </div>
  )
}

function ChartBlock({
  title,
  subtitle,
  points,
  chartStyle,
  clockFormat,
  formatValue,
}: {
  title: string
  subtitle?: string
  points: { time: string; value: number }[]
  chartStyle: "line" | "bar"
  clockFormat: import("../config/settings").ClockFormat
  formatValue: (v: number) => string
}) {
  return (
    <section className={cn("mb-5")}>
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] text-black/45 dark:text-white/45">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <MetricChart
        points={points}
        variant={chartStyle}
        formatTime={(t) => formatHour(t, clockFormat)}
        formatValue={formatValue}
      />
    </section>
  )
}
