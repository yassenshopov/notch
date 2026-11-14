import { Suspense, lazy, type ReactNode } from "react"
import { Car, Fuel, Gauge, MapPin } from "lucide-react"
import { CAR_MOCK_SNAPSHOT, EMPTY, type CarSnapshot, type CarTrip } from "../lib/car-mock"
import { usePanelLayout } from "../lib/panel-layout"
import { cn, formatShortDate } from "../lib/utils"

const CarModelViewer = lazy(() =>
  import("./CarModelViewer").then((m) => ({ default: m.CarModelViewer })),
)

const CarTripsMap = lazy(() => import("./CarTripsMap").then((m) => ({ default: m.CarTripsMap })))

const card =
  "rounded-2xl border border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]"
const sectionTitle =
  "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40"

function CarModel3D({
  bodyColor,
  status,
  plate,
  className,
  label,
}: {
  bodyColor: string
  status: CarSnapshot["vehicle"]["status"]
  plate: string
  className?: string
  label: string
}) {
  return (
    <Suspense
      fallback={
        <div
          className={cn(
            "flex items-center justify-center text-[12px] text-black/40 dark:text-white/40",
            card,
            className,
          )}
        >
          Loading 3D model…
        </div>
      }
    >
      <CarModelViewer
        bodyColor={bodyColor}
        status={status}
        plate={plate}
        className={className}
        label={label}
      />
    </Suspense>
  )
}

function formatDuration(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return `${h} hr ${m} min`
}

function displayText(value: string | null | undefined) {
  if (value == null || value.trim() === "") return EMPTY
  return value
}

function displayKm(value: number | null | undefined) {
  if (value == null) return EMPTY
  return `${value.toLocaleString()} km`
}

function displayPercent(value: number | null | undefined, hintKm?: number | null) {
  if (value == null) return EMPTY
  if (hintKm == null) return `${value}%`
  return `${value}%`
}

function statusPill(status: CarSnapshot["vehicle"]["status"]) {
  switch (status) {
    case "driving":
      return "border-black/15 bg-black text-white dark:border-white/20 dark:bg-white dark:text-black"
    case "parked":
      return "border-black/10 bg-black/[0.04] text-black/65 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/70"
    default:
      return "border-black/10 bg-black/[0.06] text-black/55 dark:border-white/12 dark:bg-white/[0.08] dark:text-white/60"
  }
}

function TripRow({ trip, compact }: { trip: CarTrip; compact?: boolean }) {
  const active = trip.status === "active"
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        active
          ? "border-black/20 bg-black/[0.05] dark:border-white/25 dark:bg-white/[0.08]"
          : "border-black/[0.06] bg-black/[0.02] dark:border-white/8 dark:bg-white/[0.02]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{trip.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-black/45 dark:text-white/45">
            {trip.from} → {trip.to}
          </p>
        </div>
        {active ? (
          <span className="shrink-0 rounded-full border border-black/15 bg-black px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:border-white/20 dark:bg-white dark:text-black">
            Live
          </span>
        ) : (
          <span className="shrink-0 text-[11px] tabular-nums text-black/40 dark:text-white/40">
            {formatShortDate(trip.startedAt)}
          </span>
        )}
      </div>
      {!compact ? (
        <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-black/50 dark:text-white/50">
          <span className="tabular-nums">{trip.distanceKm.toFixed(1)} km</span>
          <span className="tabular-nums">{formatDuration(trip.durationMin)}</span>
        </div>
      ) : null}
    </div>
  )
}

function CarTripsMapBlock({
  trips,
  activeTripId,
  height,
}: {
  trips: CarTrip[]
  activeTripId?: string | null
  height: number
}) {
  return (
    <Suspense
      fallback={
        <div
          className="flex items-center justify-center rounded-xl border border-black/[0.06] bg-black/[0.03] text-[12px] text-black/40 dark:border-white/8 dark:bg-white/[0.04] dark:text-white/40"
          style={{ height }}
        >
          Loading map…
        </div>
      }
    >
      <CarTripsMap trips={trips} activeTripId={activeTripId} height={height} />
    </Suspense>
  )
}

function DrivingBreakdown({ snapshot }: { snapshot: CarSnapshot }) {
  const segments = snapshot.drivingSegments
  if (segments.length === 0) {
    return (
      <CarSectionCard title="This week">
        <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
      </CarSectionCard>
    )
  }
  const total = segments.reduce((s, x) => s + x.minutes, 0)
  return (
    <CarSectionCard title="This week">
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
        {segments.map((seg) => (
          <div
            key={seg.id}
            style={{ width: `${seg.percent}%`, backgroundColor: seg.color }}
            title={`${seg.label} ${seg.percent}%`}
          />
        ))}
      </div>
      <ul className="space-y-2">
        {segments.map((seg) => (
          <li key={seg.id} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-black/70 dark:text-white/75">{seg.label}</span>
            </span>
            <span className="tabular-nums text-black/45 dark:text-white/45">
              {formatDuration(seg.minutes)}
              <span className="ml-1.5 text-[10px]">({seg.percent}%)</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-black/40 dark:text-white/40">{formatDuration(total)} driving time</p>
    </CarSectionCard>
  )
}

function CarSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={cn(card, "p-3.5")}>
      <h2 className={sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

type Props = {
  snapshot?: CarSnapshot
}

export function CarPanel({ snapshot = CAR_MOCK_SNAPSHOT }: Props) {
  const desktop = usePanelLayout() === "desktop"
  const { vehicle, specs, activeTrip, tripHistory, maintenance } = snapshot
  const mapTrips = activeTrip ? [activeTrip, ...tripHistory] : tripHistory
  const title = `${vehicle.make} ${vehicle.model}`
  const subtitle = `${vehicle.year} ${vehicle.generation} · ${vehicle.bodyStyle} · ${vehicle.trim}`

  if (desktop) {
    return (
      <div className="pb-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-black/40 dark:text-white/40">
              {vehicle.displayName}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight">{title}</h1>
            <p className="mt-1 text-[13px] text-black/45 dark:text-white/45">{subtitle}</p>
            <p className="mt-1 font-mono text-[12px] tracking-wide text-black/50 dark:text-white/50">
              {vehicle.plate}
            </p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[12px] font-medium", statusPill(vehicle.status))}>
            {displayText(vehicle.statusLabel)}
          </span>
        </header>

        <div className="grid gap-4 xl:grid-cols-12">
          <section className="xl:col-span-7 space-y-4">
            <p className={cn(card, "px-4 py-3")}>
              <span className="flex items-center gap-2 text-[13px] text-black/55 dark:text-white/55">
                <MapPin className="size-4 shrink-0 opacity-60" strokeWidth={1.75} />
                {displayText(vehicle.locationLabel)}
              </span>
            </p>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specs.map((s) => (
                <div key={s.label} className={cn(card, "px-4 py-3")}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
                    {s.label}
                  </p>
                  <p className="mt-1 text-[15px] font-semibold tabular-nums tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetricTile
                icon={<Gauge className="size-4" strokeWidth={1.75} />}
                label="Odometer"
                value={displayKm(vehicle.odometerKm)}
              />
              <MetricTile
                icon={<Fuel className="size-4" strokeWidth={1.75} />}
                label="Fuel"
                value={displayPercent(vehicle.fuelPercent)}
                hint={
                  vehicle.rangeKm != null
                    ? `~${vehicle.rangeKm.toLocaleString()} km range`
                    : vehicle.fuelPercent == null
                      ? undefined
                      : EMPTY
                }
              />
              <MetricTile
                icon={<Car className="size-4" strokeWidth={1.75} />}
                label="Body"
                value={`${vehicle.generation} wagon`}
              />
            </div>

            <CarModel3D
              bodyColor={vehicle.bodyColor}
              status={vehicle.status}
              plate={vehicle.plate}
              className="min-h-[min(52vh,460px)] w-full"
              label={`${vehicle.make} ${vehicle.model} 3D model`}
            />
          </section>

          <div className="xl:col-span-5 space-y-4">
            <CarSectionCard title="Sofia · trip map">
              <CarTripsMapBlock trips={mapTrips} activeTripId={activeTrip?.id} height={300} />
            </CarSectionCard>

            {activeTrip ? (
              <CarSectionCard title="Active route">
                <TripRow trip={activeTrip} />
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
                  <StatChip label="Distance" value={`${activeTrip.distanceKm} km`} />
                  <StatChip label="Duration" value={formatDuration(activeTrip.durationMin)} />
                  <StatChip label="Fuel left" value={displayPercent(vehicle.fuelPercent)} />
                </div>
              </CarSectionCard>
            ) : null}

            <DrivingBreakdown snapshot={snapshot} />

            <CarSectionCard title="Recent trips">
              {tripHistory.length === 0 ? (
                <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
              ) : (
                <ul className="space-y-2">
                  {tripHistory.map((t) => (
                    <li key={t.id}>
                      <TripRow trip={t} />
                    </li>
                  ))}
                </ul>
              )}
            </CarSectionCard>

            <CarSectionCard title="Maintenance">
              <ul className="space-y-2">
                {maintenance.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-black/45 dark:text-white/45">{m.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 font-mono text-[10px] text-black/35 dark:text-white/35">
                VIN {vehicle.vin}
                {vehicle.engineNumber ? ` · ${vehicle.engineNumber}` : ""}
                {vehicle.firstRegistration ? ` · reg. ${formatShortDate(vehicle.firstRegistration)}` : ""}
              </p>
            </CarSectionCard>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">Car</p>
        <p className="text-[17px] font-semibold tracking-tight">{title}</p>
        <p className="font-mono text-[12px] text-black/50 dark:text-white/50">{vehicle.plate}</p>
        <p className="text-[12px] text-black/45 dark:text-white/45">{displayText(vehicle.statusLabel)}</p>
      </header>

      <CarModel3D
        bodyColor={vehicle.bodyColor}
        status={vehicle.status}
        plate={vehicle.plate}
        className="h-[220px] shrink-0"
        label={`${vehicle.make} ${vehicle.model} 3D model`}
      />

      <div className="grid grid-cols-2 gap-2">
        <MetricTile compact label="Fuel" value={displayPercent(vehicle.fuelPercent)} />
        <MetricTile compact label="Range" value={displayKm(vehicle.rangeKm)} />
      </div>

      {activeTrip ? (
        <CarSectionCard title="On the way">
          <TripRow trip={activeTrip} compact />
        </CarSectionCard>
      ) : null}

      <CarSectionCard title="Sofia map">
        <CarTripsMapBlock trips={mapTrips} activeTripId={activeTrip?.id} height={150} />
      </CarSectionCard>

      <CarSectionCard title="Trips">
        {tripHistory.length === 0 ? (
          <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
        ) : (
          <ul className="space-y-2">
            {tripHistory.slice(0, 2).map((t) => (
              <li key={t.id}>
                <TripRow trip={t} compact />
              </li>
            ))}
          </ul>
        )}
      </CarSectionCard>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] px-2 py-2 dark:border-white/8 dark:bg-white/[0.04]">
      <p className="font-semibold tabular-nums text-[14px]">{value}</p>
      <p className="text-black/45 dark:text-white/45">{label}</p>
    </div>
  )
}

function MetricTile({
  label,
  value,
  hint,
  icon,
  mono,
  compact,
}: {
  label: string
  value: string
  hint?: string
  icon?: ReactNode
  mono?: boolean
  compact?: boolean
}) {
  return (
    <div className={cn(card, compact ? "px-3 py-2.5" : "px-4 py-3")}>
      <div className="flex items-center gap-2">
        {icon ? <span className="text-black/40 dark:text-white/40">{icon}</span> : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40 dark:text-white/40">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 font-semibold tabular-nums tracking-tight",
          compact ? "text-[16px]" : "text-[18px]",
          mono && "font-mono text-[15px]",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-black/45 dark:text-white/45">{hint}</p> : null}
    </div>
  )
}