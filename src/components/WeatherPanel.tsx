import { AnimatePresence, motion } from "motion/react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useSettings } from "../config/settings-store"
import {
  aqiCategory,
  formatAqi,
  formatPollen,
  formatUv,
  POLLEN_TYPE_LABEL,
  pollenCategory,
  uvCategory,
} from "../lib/air-quality"
import type { DayForecast, WeatherMetric, WeatherSnapshot } from "../lib/weather"
import {
  cn,
  formatClock,
  formatDateLong,
  formatHour,
  formatShortDate,
  formatTemp,
} from "../lib/utils"
import { MetricChart } from "./MetricChart"
import { SunPath } from "./SunPath"
import { WeatherIcon } from "./WeatherIcon"
import { WindArrow } from "./WindArrow"

type Props = {
  data: WeatherSnapshot
}

const METRICS: { id: WeatherMetric; label: string }[] = [
  { id: "sunrise", label: "Sunrise" },
  { id: "sunset", label: "Sunset" },
  { id: "feelsLike", label: "Feels like" },
  { id: "wind", label: "Wind" },
  { id: "humidity", label: "Humidity" },
  { id: "pressure", label: "Pressure" },
  { id: "visibility", label: "Visibility" },
  { id: "uv", label: "UV index" },
  { id: "aqi", label: "Air quality" },
  { id: "pollen", label: "Pollen" },
]

export function WeatherPanel({ data }: Props) {
  const settings = useSettings()
  const unit = settings.temperatureUnit
  const todayIndex = Math.max(0, data.days.findIndex((d) => d.isToday))
  const [selectedIndex, setSelectedIndex] = useState(todayIndex)
  const [direction, setDirection] = useState(0)
  const [metric, setMetric] = useState<WeatherMetric | null>(null)

  useEffect(() => {
    setSelectedIndex(todayIndex)
    setMetric(null)
  }, [data.fetchedAt, todayIndex])

  const day = data.days[selectedIndex] ?? data.days[0]
  if (!day) return null

  const selectDay = (index: number) => {
    if (index === selectedIndex) return
    setDirection(index > selectedIndex ? 1 : -1)
    setSelectedIndex(index)
    setMetric(null)
  }

  const toggleMetric = (id: WeatherMetric) => {
    setMetric((current) => (current === id ? null : id))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={day.date}
            custom={direction}
            initial={{ opacity: 0, x: direction >= 0 ? 28 : -28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction >= 0 ? -28 : 28 }}
            transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.8 }}
            className="notch-scroll h-full"
          >
            <DayBody
              day={day}
              locationLabel={data.locationLabel}
              unit={unit}
              windUnit={settings.windSpeedUnit}
              metric={metric}
              onToggleMetric={toggleMetric}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-auto flex justify-between gap-0.5 border-t border-black/8 pt-2 pb-0.5 dark:border-white/10">
        {data.days.slice(0, 6).map((d, index) => {
          const active = index === selectedIndex
          return (
            <button
              key={d.date}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                selectDay(index)
              }}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-0.5 py-1 transition-colors",
                active
                  ? "bg-black/8 dark:bg-white/12"
                  : "hover:bg-black/4 dark:hover:bg-white/6",
              )}
            >
              <span
                className={cn(
                  "text-[10px]",
                  active ? "font-semibold text-current" : "text-black/40 dark:text-white/40",
                )}
              >
                {d.isToday ? "Today" : formatShortDate(d.date)}
              </span>
              <span className="text-[11px] font-semibold tabular-nums">
                {Math.round(d.low)}°/{Math.round(d.high)}°
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayBody({
  day,
  locationLabel,
  unit,
  windUnit,
  metric,
  onToggleMetric,
}: {
  day: DayForecast
  locationLabel: string
  unit: "celsius" | "fahrenheit"
  windUnit: "kmh" | "mph" | "ms"
  metric: WeatherMetric | null
  onToggleMetric: (id: WeatherMetric) => void
}) {
  const dateLabel = day.isToday
    ? formatDateLong(new Date())
    : formatDateLong(new Date(day.date + "T12:00:00"))

  const windLabel = windUnit === "mph" ? "mph" : windUnit === "ms" ? "m/s" : "km/h"

  const metricValue = (id: WeatherMetric): ReactNode => {
    switch (id) {
      case "sunrise":
        return formatClock(day.sunrise)
      case "sunset":
        return formatClock(day.sunset)
      case "feelsLike":
        return formatTemp(day.feelsLike, unit)
      case "wind":
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className="tabular-nums">
              {Math.round(day.windSpeed)} {windLabel}
            </span>
            <WindArrow degrees={day.windDegrees} className="size-3.5 opacity-80" />
          </span>
        )
      case "humidity":
        return `${day.humidity}%`
      case "pressure":
        return `${day.pressure} hPa`
      case "visibility":
        return `${day.visibilityKm} km`
      case "uv":
        return formatUv(day.uvIndex)
      case "aqi":
        return formatAqi(day.aqi, day.aqiScale)
      case "pollen":
        return formatPollen(day.pollen, day.pollenType)
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="mb-1 flex shrink-0 items-start justify-between gap-3 pr-10">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-tight">{locationLabel}</p>
          <p className="mt-0.5 text-[12px] text-black/45 dark:text-white/45">{dateLabel}</p>
        </div>
        <WeatherIcon code={day.code} isDay={day.isDay} className="mt-0.5 size-7" />
      </header>

      {/* Main hero — grows so category graphs / overview get room */}
      <div className="relative min-h-[240px] flex-1">
        <AnimatePresence mode="wait" initial={false}>
          {metric ? (
            <motion.div
              key={`metric-${metric}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col"
            >
              <MetricHero
                day={day}
                metric={metric}
                value={metricValue(metric)}
                unit={unit}
                windLabel={windLabel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 flex flex-col"
            >
              <div className="mt-2 flex items-end gap-3">
                <p className="text-[76px] font-bold leading-none tracking-tighter tabular-nums">
                  {formatTemp(day.temperature, unit)}
                </p>
                {!day.isToday ? (
                  <p className="mb-2 text-[13px] font-medium text-black/40 dark:text-white/40">
                    H {Math.round(day.high)}° · L {Math.round(day.low)}°
                  </p>
                ) : null}
              </div>

              <AirGlance
                day={day}
                onSelect={(id) => onToggleMetric(id)}
              />

              <div className="mt-auto flex justify-between gap-1 pb-1 pt-4">
                {day.hourly.map((h) => (
                  <div key={h.time} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] text-black/40 dark:text-white/40">
                      {formatHour(h.time)}
                    </span>
                    <WeatherIcon code={h.code} isDay={h.isDay} className="size-5" />
                    <span className="text-[12px] font-semibold tabular-nums">
                      {formatTemp(h.temp, unit)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-x-5 gap-y-0 border-t border-black/8 pt-2 dark:border-white/10">
        {METRICS.map(({ id, label }) => (
          <DetailButton
            key={id}
            label={label}
            value={metricValue(id)}
            active={metric === id}
            onClick={() => onToggleMetric(id)}
          />
        ))}
      </div>
    </div>
  )
}

function MetricHero({
  day,
  metric,
  value,
  unit,
  windLabel,
}: {
  day: DayForecast
  metric: WeatherMetric
  value: ReactNode
  unit: "celsius" | "fahrenheit"
  windLabel: string
}) {
  const title = METRICS.find((m) => m.id === metric)?.label ?? metric

  const chartPoints = useMemo(() => {
    const series = day.series.length > 0 ? day.series : day.hourly
    switch (metric) {
      case "feelsLike":
        return series.map((p) => ({ time: p.time, value: p.feelsLike }))
      case "wind":
        return series.map((p) => ({ time: p.time, value: p.windSpeed }))
      case "humidity":
        return series.map((p) => ({ time: p.time, value: p.humidity }))
      case "pressure":
        return series.map((p) => ({ time: p.time, value: p.pressure }))
      case "visibility":
        return series.map((p) => ({ time: p.time, value: p.visibilityKm }))
      case "uv":
        return series.map((p) => ({ time: p.time, value: p.uvIndex }))
      case "aqi":
        return series
          .filter((p) => p.aqi != null)
          .map((p) => ({ time: p.time, value: p.aqi as number }))
      case "pollen":
        return series
          .filter((p) => p.pollen != null)
          .map((p) => ({ time: p.time, value: p.pollen as number }))
      default:
        return []
    }
  }, [day, metric])

  const formatValue = (v: number) => {
    switch (metric) {
      case "feelsLike":
        return formatTemp(v, unit)
      case "wind":
        return `${Math.round(v)} ${windLabel}`
      case "humidity":
        return `${Math.round(v)}%`
      case "pressure":
        return `${Math.round(v)}`
      case "visibility":
        return `${Math.round(v * 10) / 10} km`
      case "uv":
        return String(Math.round(v * 10) / 10)
      case "aqi":
        return String(Math.round(v))
      case "pollen":
        return String(Math.round(v * 10) / 10)
      default:
        return String(Math.round(v))
    }
  }

  const subtitle =
    metric === "uv"
      ? uvCategory(day.uvIndex)
      : metric === "aqi" && day.aqi != null
        ? aqiCategory(day.aqi, day.aqiScale)
        : metric === "pollen" && day.pollen != null
          ? pollenCategory(day.pollen)
          : null

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
            {title}
          </p>
          {metric === "wind" ? (
            <p className="mt-1 flex items-center gap-2.5 text-[34px] font-bold leading-none tracking-tight tabular-nums">
              <span>
                {Math.round(day.windSpeed)} {windLabel}
              </span>
              <WindArrow degrees={day.windDegrees} className="size-7" />
            </p>
          ) : metric === "aqi" ? (
            <p className="mt-1 truncate text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {day.aqi != null ? day.aqi : "—"}
            </p>
          ) : metric === "pollen" ? (
            <p className="mt-1 truncate text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {day.pollen != null ? Math.round(day.pollen) : "—"}
            </p>
          ) : metric === "uv" ? (
            <p className="mt-1 truncate text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {day.uvIndex}
            </p>
          ) : (
            <p className="mt-1 truncate text-[34px] font-bold leading-none tracking-tight tabular-nums">
              {value}
            </p>
          )}
          {subtitle ? (
            <p className="mt-1.5 text-[12px] font-medium text-black/45 dark:text-white/45">
              {subtitle}
              {metric === "aqi" ? (
                <span className="text-black/30 dark:text-white/30">
                  {" "}
                  · {day.aqiScale === "us" ? "US AQI" : "EAQI"}
                  {day.pm25 != null ? ` · PM2.5 ${day.pm25}` : ""}
                </span>
              ) : null}
              {metric === "pollen" && day.pollenType ? (
                <span className="text-black/30 dark:text-white/30">
                  {" "}
                  · {POLLEN_TYPE_LABEL[day.pollenType]}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        {metric === "sunrise" || metric === "sunset" ? (
          <SunPath sunrise={day.sunrise} sunset={day.sunset} mode={metric} />
        ) : chartPoints.length > 0 ? (
          <MetricChart points={chartPoints} formatValue={formatValue} className="h-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] text-black/35 dark:text-white/35">
            {metric === "pollen"
              ? "Pollen data is Europe-only (seasonal)"
              : "No series for this day"}
          </div>
        )}
      </div>
    </div>
  )
}

function AirGlance({
  day,
  onSelect,
}: {
  day: DayForecast
  onSelect: (id: WeatherMetric) => void
}) {
  const chips: { id: WeatherMetric; label: string; value: string }[] = [
    {
      id: "aqi",
      label: "AQI",
      value:
        day.aqi != null ? `${day.aqi} ${aqiCategory(day.aqi, day.aqiScale)}` : "—",
    },
    {
      id: "uv",
      label: "UV",
      value: `${day.uvIndex} ${uvCategory(day.uvIndex)}`,
    },
    {
      id: "pollen",
      label: "Pollen",
      value:
        day.pollen == null
          ? "—"
          : day.pollen <= 0
            ? "None"
            : pollenCategory(day.pollen),
    },
  ]

  return (
    <div className="mt-3 flex gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onSelect(chip.id)
          }}
          className="min-w-0 flex-1 rounded-xl bg-black/[0.04] px-2 py-1.5 text-left transition-colors hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
            {chip.label}
          </p>
          <p className="truncate text-[11px] font-semibold tracking-tight">{chip.value}</p>
        </button>
      ))}
    </div>
  )
}

function DetailButton({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "min-w-0 rounded-xl px-1.5 py-1.5 text-left transition-colors",
        active ? "bg-black/8 dark:bg-white/12" : "hover:bg-black/4 dark:hover:bg-white/6",
      )}
    >
      <p className="text-[10px] text-black/40 dark:text-white/40">{label}</p>
      <div className="truncate text-[13px] font-semibold tracking-tight">{value}</div>
    </button>
  )
}
