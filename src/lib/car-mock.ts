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
    livePids: [
      { pid: "010C", label: "Engine RPM", value: null, unit: "rpm" },
      { pid: "010D", label: "Vehicle speed", value: null, unit: "km/h" },
      { pid: "0105", label: "Coolant temp", value: null, unit: "°C" },
      { pid: "0104", label: "Engine load", value: null, unit: "%" },
      { pid: "0111", label: "Throttle", value: null, unit: "%" },
      { pid: "012F", label: "Fuel level", value: null, unit: "%" },
      { pid: "0142", label: "ECU voltage", value: null, unit: "V" },
    ],
  },
}