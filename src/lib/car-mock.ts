import type { CarViewerModelId } from "./car-model-loader"

export type CarStatus = "parked" | "driving" | "idle"

export type CarId = "mazda6" | "mini-clubman"

export type CarVehicle = {
  id: CarId
  /** Which 3D asset to load in the studio viewer */
  viewerModel: CarViewerModelId
  displayName: string
  make: string
  model: string
  year: number
  /** Platform / generation label */
  generation: string
  bodyStyle: string
  trim: string
  plate: string
  vin: string
  status: CarStatus
  statusLabel: string
  odometerKm: number | null
  fuelPercent: number | null
  rangeKm: number | null
  locationLabel: string | null
  /** CSS / Three.js body paint */
  bodyColor: string
  paintName?: string
  engineNumber?: string
  firstRegistration?: string
}

export type CarSpec = {
  label: string
  value: string
}

export type CarTrip = {
  id: string
  title: string
  status: "active" | "completed"
  startedAt: string
  endedAt?: string
  distanceKm: number
  durationMin: number
  from: string
  to: string
}

export type DrivingSegment = {
  id: string
  label: string
  percent: number
  minutes: number
  color: string
}

export type MaintenanceItem = {
  id: string
  label: string
  detail: string
}

export type CarTechnicalRow = {
  label: string
  value: string
}

export type CarTechnicalSection = {
  id: string
  title: string
  rows: CarTechnicalRow[]
}

export type ObdAdapterStatus = "pending" | "connected" | "disconnected"

export type CarObdAdapter = {
  name: string
  model: string
  interface: "OBD-II"
  link: "bluetooth"
  status: ObdAdapterStatus
  statusLabel: string
  /** Shown in Diagnostics tab until live data lands */
  notes?: string
}

export type CarDtcStatus = "stored" | "pending" | "permanent"

export type CarDtc = {
  code: string
  status: CarDtcStatus
  description: string | null
  ecu?: string | null
  firstSeenAt?: string | null
}

/** Live OBD-II parameters (ELM327 / iCar Pro); null = no reading yet */
export type CarObdLivePid = {
  pid: string
  label: string
  value: string | null
  unit?: string
}

export type CarObdSnapshot = {
  adapter: CarObdAdapter
  milOn: boolean | null
  lastScanAt: string | null
  dtcs: CarDtc[]
  livePids: CarObdLivePid[]
}

export type CarSnapshot = {
  vehicle: CarVehicle
  /** Summary tiles on Overview */
  specs: CarSpec[]
  technicalSheet: CarTechnicalSection[]
  activeTrip: CarTrip | null
  tripHistory: CarTrip[]
  drivingSegments: DrivingSegment[]
  maintenance: MaintenanceItem[]
  obd: CarObdSnapshot
}

export const EMPTY = "—"

const DEFAULT_LIVE_PIDS: CarObdLivePid[] = [
  { pid: "010C", label: "Engine RPM", value: null, unit: "rpm" },
  { pid: "010D", label: "Vehicle speed", value: null, unit: "km/h" },
  { pid: "0105", label: "Coolant temp", value: null, unit: "°C" },
  { pid: "0104", label: "Engine load", value: null, unit: "%" },
  { pid: "0111", label: "Throttle", value: null, unit: "%" },
  { pid: "012F", label: "Fuel level", value: null, unit: "%" },
  { pid: "0142", label: "ECU voltage", value: null, unit: "V" },
]

/** Registration-backed snapshot; telemetry/trips filled when integrated */
export const MAZDA6_CAR_SNAPSHOT: CarSnapshot = {
  vehicle: {
    id: "mazda6",
    viewerModel: "mazda-6-wagon",
    displayName: "Daily driver",
    make: "Mazda",
    model: "6",
    year: 2009,
    generation: "GH",
    bodyStyle: "Station wagon (Combi)",
    trim: "2.0 MZR · Automatic",
    plate: "CB7275XT",
    vin: "JMZGH19F701192872",
    engineNumber: "LF10643133",
    firstRegistration: "2009-01-03",
    paintName: "Black metallic",
    status: "idle",
    statusLabel: EMPTY,
    odometerKm: null,
    fuelPercent: null,
    rangeKm: null,
    locationLabel: null,
    bodyColor: "#0a0a0c",
  },
  specs: [
    { label: "Engine", value: "2.0 L petrol · LF" },
    { label: "Power", value: "147 hp · 108 kW" },
    { label: "Transmission", value: "Automatic · FWD" },
    { label: "Emissions", value: "Euro 4" },
    { label: "Seats", value: "5 (4+1)" },
    { label: "First reg.", value: "3 Jan 2009" },
    { label: "Color", value: "Black metallic" },
    { label: "Tank", value: "64 L" },
  ],
  activeTrip: null,
  tripHistory: [],
  drivingSegments: [],
  maintenance: [
    { id: "gtp", label: "GTP (technical inspection)", detail: "Due 27 Apr 2027" },
    { id: "vignette", label: "Vignette", detail: "Due 2 Feb 2027 · check 20 Jun 2027" },
    { id: "go", label: "Civil liability (GO)", detail: "Due 24 Mar 2027" },
    { id: "oil", label: "Oil change", detail: "Last · 29 Oct 2025" },
  ],
  technicalSheet: [
    {
      id: "registration",
      title: "Registration",
      rows: [
        { label: "Plate", value: "CB 7275 XT" },
        { label: "VIN", value: "JMZGH19F701192872" },
        { label: "Engine no.", value: "LF10643133" },
        { label: "First registration", value: "3 Jan 2009" },
        { label: "Category", value: "M1 · passenger car" },
      ],
    },
    {
      id: "vehicle",
      title: "Vehicle",
      rows: [
        { label: "Make / model", value: "Mazda 6" },
        { label: "Generation", value: "GH (2008–2012)" },
        { label: "Body", value: "Station wagon (Combi)" },
        { label: "Trim", value: "2.0 MZR · Automatic" },
        { label: "Color", value: "Black metallic" },
        { label: "Seats", value: "5 (4+1)" },
      ],
    },
    {
      id: "powertrain",
      title: "Powertrain",
      rows: [
        { label: "Engine", value: "2.0 L petrol · LF (MZR)" },
        { label: "Power", value: "147 hp · 108 kW" },
        { label: "Transmission", value: "Automatic" },
        { label: "Drive", value: "Front-wheel drive" },
        { label: "Fuel tank", value: "64 L" },
        { label: "Emissions", value: "Euro 4" },
      ],
    },
    {
      id: "homologation",
      title: "Documents & compliance",
      rows: [
        { label: "GTP (TA)", value: "Valid until 27 Apr 2027" },
        { label: "Vignette", value: "Until 2 Feb 2027" },
        { label: "Civil liability (GO)", value: "Until 24 Mar 2027" },
      ],
    },
  ],
  obd: {
    adapter: {
      name: "Vgate",
      model: "iCar Pro",
      interface: "OBD-II",
      link: "bluetooth",
      status: "pending",
      statusLabel: "Adapter ordered · not paired yet",
      notes: "Bluetooth 4.0 ELM327-class dongle (16-pin). Supports ISO15765-4 CAN, KWP, J1850, ISO9141-2, and related OBD-II protocols.",
    },
    milOn: null,
    lastScanAt: null,
    dtcs: [],
    livePids: DEFAULT_LIVE_PIDS,
  },
}

/** Sister's Mini Cooper Clubman — registration data from vehicle docs */
export const MINI_CLUBMAN_CAR_SNAPSHOT: CarSnapshot = {
  vehicle: {
    id: "mini-clubman",
    viewerModel: "mini-clubman-jcw",
    displayName: "Sister's Mini",
    make: "Mini",
    model: "Cooper Clubman",
    year: 2010,
    generation: "R55",
    bodyStyle: "Station wagon (Combi)",
    trim: "Diesel · Automatic",
    plate: "CA9290XA",
    vin: "WMWMN51050TR90878",
    engineNumber: "0003645",
    firstRegistration: "2010-06-22",
    paintName: "Black · white roof",
    status: "idle",
    statusLabel: EMPTY,
    odometerKm: null,
    fuelPercent: null,
    rangeKm: null,
    locationLabel: null,
    bodyColor: "#0a0a0c",
  },
  specs: [
    { label: "Engine", value: "Diesel" },
    { label: "Power", value: EMPTY },
    { label: "Transmission", value: "Automatic · FWD" },
    { label: "Emissions", value: "Euro 4" },
    { label: "Seats", value: "4 (3+1)" },
    { label: "First reg.", value: "22 Jun 2010" },
    { label: "Color", value: "Black · white roof & mirror caps" },
    { label: "Purchased", value: "1 Oct 2025" },
  ],
  activeTrip: null,
  tripHistory: [],
  drivingSegments: [],
  maintenance: [
    { id: "vehicle-tax", label: "Vehicle tax (Данък МПС)", detail: "Due 4 Mar 2026" },
    { id: "gtp", label: "GTP (technical inspection)", detail: "Due 26 Apr 2026" },
    { id: "go", label: "Civil liability (GO)", detail: "Due 6 Feb 2027" },
    { id: "vignette", label: "Vignette", detail: "Due 22 Feb 2027" },
  ],
  technicalSheet: [
    {
      id: "registration",
      title: "Registration",
      rows: [
        { label: "Plate", value: "CA 9290 XA" },
        { label: "VIN", value: "WMWMN51050TR90878" },
        { label: "Engine no.", value: "0003645" },
        { label: "First registration", value: "22 Jun 2010" },
        { label: "Category", value: "M1 · passenger car" },
        { label: "Acquired", value: "1 Oct 2025 · private owner" },
      ],
    },
    {
      id: "vehicle",
      title: "Vehicle",
      rows: [
        { label: "Make / model", value: "Mini Cooper Clubman" },
        { label: "Generation", value: "R55 (2007–2014)" },
        { label: "Body", value: "Station wagon (Combi)" },
        { label: "Trim", value: "Diesel · Automatic" },
        { label: "Color", value: "Black · white roof & mirror caps" },
        { label: "Seats", value: "4 (3+1)" },
      ],
    },
    {
      id: "powertrain",
      title: "Powertrain",
      rows: [
        { label: "Engine", value: "Diesel" },
        { label: "Power", value: EMPTY },
        { label: "Transmission", value: "Automatic" },
        { label: "Drive", value: "Front-wheel drive" },
        { label: "Fuel", value: "Diesel" },
        { label: "Emissions", value: "Euro 4" },
      ],
    },
    {
      id: "homologation",
      title: "Documents & compliance",
      rows: [
        { label: "Vehicle tax", value: "Due 4 Mar 2026" },
        { label: "GTP (TA)", value: "Valid until 26 Apr 2026" },
        { label: "Vignette", value: "Until 22 Feb 2027" },
        { label: "Civil liability (GO)", value: "Until 6 Feb 2027" },
      ],
    },
  ],
  obd: {
    adapter: {
      name: "—",
      model: "—",
      interface: "OBD-II",
      link: "bluetooth",
      status: "disconnected",
      statusLabel: "No adapter linked for this vehicle",
      notes: "Pair a dongle when you want live scans for the Clubman.",
    },
    milOn: null,
    lastScanAt: null,
    dtcs: [],
    livePids: DEFAULT_LIVE_PIDS,
  },
}

export type CarCatalogEntry = {
  id: CarId
  snapshot: CarSnapshot
}

export const CAR_CATALOG: CarCatalogEntry[] = [
  { id: "mazda6", snapshot: MAZDA6_CAR_SNAPSHOT },
  { id: "mini-clubman", snapshot: MINI_CLUBMAN_CAR_SNAPSHOT },
]

export const DEFAULT_CAR_ID: CarId = "mazda6"

export function getCarSnapshot(id: CarId): CarSnapshot {
  const hit = CAR_CATALOG.find((c) => c.id === id)
  if (!hit) return MAZDA6_CAR_SNAPSHOT
  return hit.snapshot
}

/** @deprecated use `getCarSnapshot` / `CAR_CATALOG` */
export const CAR_MOCK_SNAPSHOT = MAZDA6_CAR_SNAPSHOT