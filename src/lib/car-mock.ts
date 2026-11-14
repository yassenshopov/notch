export type CarStatus = "parked" | "driving" | "idle"

export type CarVehicle = {
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

export type CarSnapshot = {
  vehicle: CarVehicle
  specs: CarSpec[]
  activeTrip: CarTrip | null
  tripHistory: CarTrip[]
  drivingSegments: DrivingSegment[]
  maintenance: MaintenanceItem[]
}

export const EMPTY = "—"

/** Registration-backed snapshot; telemetry/trips filled when integrated */
export const CAR_MOCK_SNAPSHOT: CarSnapshot = {
  vehicle: {
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
}