import { Suspense, lazy, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  Bluetooth,
  ClipboardList,
  Fuel,
  Gauge,
  MapPin,
  Radio,
  ScrollText,
  Wrench,
} from "lucide-react"
import {
  CAR_CATALOG,
  DEFAULT_CAR_ID,
  getCarSnapshot,
  EMPTY,
  type CarDtc,
  type CarId,
  type CarSnapshot,
  type CarTrip,
  type ObdAdapterStatus,
} from "../lib/car-mock"
import { CAR_MINI_VIEWER_REVISION } from "../lib/car-glb-model"
import type { CarViewerModelId } from "../lib/car-model-loader"
import { usePanelLayout } from "../lib/panel-layout"
import { cn, formatShortDate } from "../lib/utils"
import { SegmentedControl } from "./SegmentedControl"

const CarModelViewer = lazy(() =>
  import("./CarModelViewer").then((m) => ({ default: m.CarModelViewer })),
)

const CarTripsMap = lazy(() => import("./CarTripsMap").then((m) => ({ default: m.CarTripsMap })))

type CarTab = "overview" | "specs" | "travel" | "dtc"

const CAR_TABS: { value: CarTab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "specs", label: "Technical" },
  { value: "travel", label: "Travel" },
  { value: "dtc", label: "Diagnostics" },
]

const card =
  "rounded-2xl border border-black/[0.07] bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.03]"
const sectionTitle =
  "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40"

function CarModel3D({
  bodyColor,
  status,
  plate,
  modelId,
  className,
  label,
}: {
  bodyColor: string
  status: CarSnapshot["vehicle"]["status"]
  plate: string
  modelId: CarViewerModelId
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
        modelId={modelId}
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

function displayPercent(value: number | null | undefined) {
  if (value == null) return EMPTY
  return `${value}%`
}

function displayBool(value: boolean | null | undefined) {
  if (value == null) return EMPTY
  return value ? "On" : "Off"
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

function obdAdapterPill(status: ObdAdapterStatus) {
  switch (status) {
    case "connected":
      return "border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
    case "disconnected":
      return "border-amber-500/25 bg-amber-500/10 text-amber-900 dark:text-amber-100"
    default:
      return "border-black/10 bg-black/[0.04] text-black/55 dark:border-white/12 dark:bg-white/[0.06] dark:text-white/60"
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

function carPickerLabel(snapshot: CarSnapshot) {
  const { vehicle } = snapshot
  return `${vehicle.year} ${vehicle.make} ${vehicle.model} · ${vehicle.displayName}`
}

function CarVehiclePicker({
  carId,
  onChange,
  compact,
}: {
  carId: CarId
  onChange: (id: CarId) => void
  compact?: boolean
}) {
  return (
    <select
      value={carId}
      onChange={(e) => onChange(e.target.value as CarId)}
      className={cn(
        "max-w-full truncate rounded-lg border border-black/10 bg-black/[0.03] py-1 font-medium text-black/75 dark:border-white/15 dark:bg-white/[0.06] dark:text-white/85",
        compact ? "px-2 text-[11px]" : "px-2.5 text-[12px]",
      )}
      aria-label="Choose vehicle"
    >
      {CAR_CATALOG.map((entry) => (
        <option key={entry.id} value={entry.id}>
          {carPickerLabel(entry.snapshot)}
        </option>
      ))}
    </select>
  )
}

function CarPanelChrome({
  snapshot,
  carId,
  onCarChange,
  desktop,
  tab,
  onTabChange,
}: {
  snapshot: CarSnapshot
  carId: CarId
  onCarChange: (id: CarId) => void
  desktop: boolean
  tab: CarTab
  onTabChange: (t: CarTab) => void
}) {
  const { vehicle } = snapshot
  const status = displayText(vehicle.statusLabel)

  return (
    <div className={cn("shrink-0", desktop ? "space-y-3" : "space-y-2")}>
      <div className="flex min-h-[1.75rem] items-center justify-between gap-3">
        <CarVehiclePicker carId={carId} onChange={onCarChange} compact={!desktop} />
        <span
          className={cn(
            "max-w-[40%] shrink-0 truncate rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
            statusPill(vehicle.status),
          )}
        >
          {status}
        </span>
      </div>
      <CarTabBar tab={tab} onChange={onTabChange} compact={!desktop} />
    </div>
  )
}

function CarTabBar({ tab, onChange, compact }: { tab: CarTab; onChange: (t: CarTab) => void; compact?: boolean }) {
  return (
    <SegmentedControl
      variant="pi"
      role="tablist"
      aria-label="Car sections"
      value={tab}
      equalWidth
      className={cn("w-full shrink-0", compact && "text-[11px]")}
      options={CAR_TABS.map((t) => ({
        value: t.value,
        label: compact && t.value === "dtc" ? "DTC" : t.label,
      }))}
      onChange={onChange}
    />
  )
}

const overviewDock =
  "flex min-h-[112px] flex-col rounded-2xl border border-black/[0.07] bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.03]"

function OverviewDockCard({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn(overviewDock, className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">
          {title}
        </p>
        <span className="text-black/35 dark:text-white/35">{icon}</span>
      </div>
      {children}
    </section>
  )
}

function DtcRow({ dtc }: { dtc: CarDtc }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.02]">
      <div className="flex items-start justify-between gap-2">
        <p className="font-mono text-[13px] font-semibold">{dtc.code}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
          {dtc.status}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-black/55 dark:text-white/55">
        {dtc.description ?? "— pending description from OBD scan —"}
      </p>
      {dtc.ecu ? (
        <p className="mt-1 text-[10px] text-black/40 dark:text-white/40">ECU · {dtc.ecu}</p>
      ) : null}
    </div>
  )
}

function CarOverviewTab({ snapshot, desktop }: { snapshot: CarSnapshot; desktop: boolean }) {
  const { vehicle, specs, maintenance } = snapshot
  const modelLabel = `${vehicle.make} ${vehicle.model} 3D model`
  const title = `${vehicle.make} ${vehicle.model}`
  const subtitle = `${vehicle.year} ${vehicle.generation} · ${vehicle.bodyStyle}`
  const trimLine = vehicle.trim
  const powerSpec = specs.find((s) => s.label === "Power")
  const engineSpec = specs.find((s) => s.label === "Engine")
  const nextMaint = maintenance[0]

  if (desktop) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 text-[14px] text-black/50 dark:text-white/50">{subtitle}</p>
            <p className="text-[13px] text-black/40 dark:text-white/40">{trimLine}</p>
            <p className="mt-3 font-mono text-[12px] tracking-wide text-black/45 dark:text-white/45">{vehicle.plate}</p>
          </div>
          <span className={cn("rounded-full border px-3 py-1 text-[12px] font-medium", statusPill(vehicle.status))}>
            {displayText(vehicle.statusLabel)}
          </span>
        </div>

        <div className="relative min-h-[min(58vh,520px)]">
          <CarModel3D
            key={`${vehicle.id}-r${CAR_MINI_VIEWER_REVISION}`}
            bodyColor={vehicle.bodyColor}
            status={vehicle.status}
            plate={vehicle.plate}
            modelId={vehicle.viewerModel}
            className="h-full min-h-[inherit] w-full border-0 bg-gradient-to-b from-black/[0.03] via-black/[0.01] to-black/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:from-white/[0.06] dark:via-transparent dark:to-white/[0.04]"
            label={modelLabel}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <OverviewDockCard title="Location" icon={<MapPin className="size-4" strokeWidth={1.75} />}>
            <p className="text-[15px] font-semibold leading-snug">{displayText(vehicle.locationLabel)}</p>
            <p className="mt-1 text-[11px] text-black/40 dark:text-white/40">
              Live GPS on the Travel tab when linked.
            </p>
          </OverviewDockCard>

          <OverviewDockCard title="Telemetry" icon={<Gauge className="size-4" strokeWidth={1.75} />}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[12px]">
              <OverviewTelemetryStat label="Odometer" value={displayKm(vehicle.odometerKm)} />
              <OverviewTelemetryStat label="Fuel" value={displayPercent(vehicle.fuelPercent)} />
              <OverviewTelemetryStat label="Range" value={displayKm(vehicle.rangeKm)} />
              <OverviewTelemetryStat label="Power" value={powerSpec?.value ?? EMPTY} />
            </div>
            {engineSpec ? (
              <p className="mt-2 text-[10px] text-black/40 dark:text-white/40">{engineSpec.value}</p>
            ) : null}
          </OverviewDockCard>

          <OverviewDockCard title="Compliance" icon={<ClipboardList className="size-4" strokeWidth={1.75} />}>
            {nextMaint ? (
              <>
                <p className="text-[15px] font-semibold">{nextMaint.label}</p>
                <p className="mt-1 text-[12px] text-black/50 dark:text-white/50">{nextMaint.detail}</p>
              </>
            ) : (
              <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
            )}
            <p className="mt-auto pt-3 font-mono text-[10px] text-black/35 dark:text-white/35">VIN {vehicle.vin}</p>
          </OverviewDockCard>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[16px] font-semibold tracking-tight">{title}</p>
        <p className="text-[11px] text-black/45 dark:text-white/45">{subtitle}</p>
        <p className="mt-1 font-mono text-[11px] text-black/45 dark:text-white/45">{vehicle.plate}</p>
      </div>

      <div className="relative shrink-0">
        <CarModel3D
          key={vehicle.id}
          bodyColor={vehicle.bodyColor}
          status={vehicle.status}
          plate={vehicle.plate}
          modelId={vehicle.viewerModel}
          className="h-[min(42vw,220px)] w-full border-0 bg-gradient-to-b from-black/[0.03] to-black/[0.06] dark:from-white/[0.05] dark:to-white/[0.03]"
          label={modelLabel}
        />
      </div>

      <div className="-mx-0.5 flex gap-2 overflow-x-auto pb-1">
        <OverviewDockCard
          title="Location"
          icon={<MapPin className="size-3.5" strokeWidth={1.75} />}
          className="min-w-[148px] shrink-0"
        >
          <p className="text-[13px] font-semibold">{displayText(vehicle.locationLabel)}</p>
        </OverviewDockCard>
        <OverviewDockCard
          title="Fuel"
          icon={<Fuel className="size-3.5" strokeWidth={1.75} />}
          className="min-w-[120px] shrink-0"
        >
          <p className="text-[16px] font-semibold tabular-nums">{displayPercent(vehicle.fuelPercent)}</p>
          <p className="text-[10px] text-black/40 dark:text-white/40">Range {displayKm(vehicle.rangeKm)}</p>
        </OverviewDockCard>
        <OverviewDockCard
          title="Next"
          icon={<Wrench className="size-3.5" strokeWidth={1.75} />}
          className="min-w-[140px] shrink-0"
        >
          <p className="text-[12px] font-medium leading-snug">{nextMaint?.label ?? EMPTY}</p>
        </OverviewDockCard>
      </div>
    </div>
  )
}

function OverviewTelemetryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-black/40 dark:text-white/40">{label}</p>
      <p className="font-semibold tabular-nums text-black/85 dark:text-white/90">{value}</p>
    </div>
  )
}

function CarTabTitle({ snapshot, desktop }: { snapshot: CarSnapshot; desktop: boolean }) {
  const { vehicle } = snapshot
  const title = `${vehicle.make} ${vehicle.model}`
  const subtitle = `${vehicle.year} ${vehicle.generation} · ${vehicle.bodyStyle} · ${vehicle.trim}`
  if (!desktop) return null
  return (
    <header className="mb-4">
      <h1 className="text-[24px] font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-black/45 dark:text-white/45">{subtitle}</p>
      <p className="mt-1 font-mono text-[12px] text-black/50 dark:text-white/50">{vehicle.plate}</p>
    </header>
  )
}

function CarSpecsTab({ snapshot, desktop }: { snapshot: CarSnapshot; desktop: boolean }) {
  const { technicalSheet, vehicle } = snapshot

  return (
    <div className={cn("space-y-4", desktop && "max-w-4xl")}>
      <CarTabTitle snapshot={snapshot} desktop={desktop} />
      <p className={cn(card, "flex items-start gap-3 px-4 py-3")}>
        <ScrollText className="mt-0.5 size-4 shrink-0 text-black/40 dark:text-white/40" strokeWidth={1.75} />
        <span className="text-[13px] leading-relaxed text-black/55 dark:text-white/55">
          Registration and homologation data for {vehicle.make} {vehicle.model} ({vehicle.plate}). Live OBD readings
          appear under Diagnostics.
        </span>
      </p>
      <div className={cn("grid gap-4", desktop && "sm:grid-cols-2")}>
        {technicalSheet.map((section) => (
          <CarSectionCard key={section.id} title={section.title}>
            <dl className="space-y-2.5">
              {section.rows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3 text-[12px]">
                  <dt className="text-black/45 dark:text-white/45">{row.label}</dt>
                  <dd className="max-w-[58%] text-right font-medium text-black/80 dark:text-white/85">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CarSectionCard>
        ))}
      </div>
    </div>
  )
}

function CarTravelTab({ snapshot, desktop }: { snapshot: CarSnapshot; desktop: boolean }) {
  const { activeTrip, tripHistory, vehicle } = snapshot
  const mapTrips = activeTrip ? [activeTrip, ...tripHistory] : tripHistory
  const mapHeight = desktop ? 320 : 160

  return (
    <div className="space-y-4">
      <CarTabTitle snapshot={snapshot} desktop={desktop} />
      <div className={cn("space-y-4", desktop && "grid gap-4 xl:grid-cols-12")}>
      <div className={cn(desktop && "xl:col-span-7 space-y-4")}>
        <CarSectionCard title="Sofia · GPS / journey map">
          <CarTripsMapBlock trips={mapTrips} activeTripId={activeTrip?.id} height={mapHeight} />
          <p className="mt-2 text-[11px] text-black/40 dark:text-white/40">
            Trip traces and live position will show here when GPS or head-unit data is linked.
          </p>
        </CarSectionCard>
      </div>
      <div className={cn("space-y-4", desktop && "xl:col-span-5")}>
        {activeTrip ? (
          <CarSectionCard title="Active route">
            <TripRow trip={activeTrip} />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
              <StatChip label="Distance" value={`${activeTrip.distanceKm} km`} />
              <StatChip label="Duration" value={formatDuration(activeTrip.durationMin)} />
              <StatChip label="Fuel left" value={displayPercent(vehicle.fuelPercent)} />
            </div>
          </CarSectionCard>
        ) : (
          <CarSectionCard title="Active route">
            <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
          </CarSectionCard>
        )}

        <DrivingBreakdown snapshot={snapshot} />

        <CarSectionCard title="Journey history">
          {tripHistory.length === 0 ? (
            <p className="text-[13px] text-black/45 dark:text-white/45">{EMPTY}</p>
          ) : (
            <ul className="space-y-2">
              {tripHistory.map((t) => (
                <li key={t.id}>
                  <TripRow trip={t} compact={!desktop} />
                </li>
              ))}
            </ul>
          )}
        </CarSectionCard>
      </div>
      </div>
    </div>
  )
}

function CarDtcTab({ snapshot, desktop }: { snapshot: CarSnapshot; desktop: boolean }) {
  const { obd } = snapshot
  const { adapter, dtcs, livePids } = obd

  return (
    <div className="space-y-4">
      <CarTabTitle snapshot={snapshot} desktop={desktop} />
      <div className={cn("space-y-4", desktop && "grid gap-4 xl:grid-cols-12")}>
      <div className={cn("space-y-4", desktop && "xl:col-span-5")}>
        <section className={cn(card, "p-3.5")}>
          <h2 className={sectionTitle}>OBD-II adapter</h2>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[15px] font-semibold">
                {adapter.name} {adapter.model}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-black/50 dark:text-white/50">
                <Bluetooth className="size-3.5" strokeWidth={1.75} />
                {adapter.link.toUpperCase()} · {adapter.interface}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", obdAdapterPill(adapter.status))}>
              {adapter.statusLabel}
            </span>
          </div>
          {adapter.notes ? (
            <p className="mt-3 text-[11px] leading-relaxed text-black/45 dark:text-white/45">{adapter.notes}</p>
          ) : null}
        </section>

        <div className="grid grid-cols-2 gap-2">
          <MetricTile
            icon={<AlertTriangle className="size-4" strokeWidth={1.75} />}
            label="Check engine (MIL)"
            value={displayBool(obd.milOn)}
            compact
          />
          <MetricTile
            icon={<Radio className="size-4" strokeWidth={1.75} />}
            label="Last scan"
            value={obd.lastScanAt ? formatShortDate(obd.lastScanAt) : EMPTY}
            compact
          />
        </div>
      </div>

      <div className={cn("space-y-4", desktop && "xl:col-span-7")}>
        <CarSectionCard title="Stored fault codes (DTC)">
          {dtcs.length === 0 ? (
            <p className="text-[13px] text-black/45 dark:text-white/45">
              No codes yet. After pairing the iCar Pro, scans will list stored, pending, and permanent DTCs with
              descriptions.
            </p>
          ) : (
            <ul className="space-y-2">
              {dtcs.map((dtc) => (
                <li key={`${dtc.code}-${dtc.status}`}>
                  <DtcRow dtc={dtc} />
                </li>
              ))}
            </ul>
          )}
        </CarSectionCard>

        <CarSectionCard title="Live parameters">
          <div className={cn("grid gap-2", desktop ? "sm:grid-cols-2" : "grid-cols-2")}>
            {livePids.map((pid) => (
              <div
                key={pid.pid}
                className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2 dark:border-white/8 dark:bg-white/[0.02]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-black/40 dark:text-white/40">
                  {pid.label}
                </p>
                <p className="mt-0.5 text-[15px] font-semibold tabular-nums">
                  {pid.value != null ? (
                    <>
                      {pid.value}
                      {pid.unit ? <span className="ml-1 text-[12px] font-normal text-black/45 dark:text-white/45">{pid.unit}</span> : null}
                    </>
                  ) : (
                    EMPTY
                  )}
                </p>
                <p className="mt-0.5 font-mono text-[9px] text-black/30 dark:text-white/30">PID {pid.pid}</p>
              </div>
            ))}
          </div>
        </CarSectionCard>
      </div>
      </div>
    </div>
  )
}

type Props = {
  initialCarId?: CarId
}

export function CarPanel({ initialCarId = DEFAULT_CAR_ID }: Props) {
  const desktop = usePanelLayout() === "desktop"
  const [tab, setTab] = useState<CarTab>("overview")
  const [carId, setCarId] = useState<CarId>(initialCarId)
  const snapshot = getCarSnapshot(carId)

  return (
    <div className={cn(desktop ? "pb-8" : "flex h-full min-h-0 flex-col gap-3")}>
      <CarPanelChrome
        snapshot={snapshot}
        carId={carId}
        onCarChange={setCarId}
        desktop={desktop}
        tab={tab}
        onTabChange={setTab}
      />

      <div className={cn(desktop ? "mt-5" : "min-h-0 flex-1 overflow-y-auto pr-1", "min-h-0")}>
        {tab === "overview" ? (
          <CarOverviewTab snapshot={snapshot} desktop={desktop} />
        ) : tab === "specs" ? (
          <CarSpecsTab snapshot={snapshot} desktop={desktop} />
        ) : tab === "travel" ? (
          <CarTravelTab snapshot={snapshot} desktop={desktop} />
        ) : (
          <CarDtcTab snapshot={snapshot} desktop={desktop} />
        )}
      </div>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-black/[0.03] px-2 py-2 dark:border-white/8 dark:bg-white/[0.04]">
      <p className="text-[14px] font-semibold tabular-nums">{value}</p>
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