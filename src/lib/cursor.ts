export type CursorUsageBreakdown = {
  included: number
  bonus: number
  total: number
}

export type CursorUsagePlan = {
  used: number
  limit: number
  remaining: number
  breakdown: CursorUsageBreakdown | null
  totalPercentUsed: number
  autoPercentUsed: number
  apiPercentUsed: number
  enabled: boolean
}

export type CursorOnDemand = {
  enabled: boolean
  used: number
  limit: number | null
  remaining: number | null
}

export type CursorModelRow = {
  model: string
  label: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  totalCents: number
}

export type CursorDailyPoint = {
  time: string
  value: number
}

export type CursorRecentEvent = {
  timestamp: number
  model: string
  label: string
  chargedCents: number
  kind: string | null
}

export type CursorCloudAgent = {
  id: string
  name: string
  status: string
  url: string | null
  updatedAt: string | null
}

export type CursorStatus = {
  connected: boolean
  configured?: boolean
  user?: {
    email: string | null
    name: string | null
  }
  billing?: {
    cycleStart: string | null
    cycleEnd: string | null
    membershipType: string | null
    isUnlimited: boolean
    daysLeft?: number | null
  }
  usage?: CursorUsagePlan | null
  onDemand?: CursorOnDemand | null
  messages?: {
    auto: string | null
    api: string | null
  }
  limits?: {
    overageBlocked: boolean | null
  }
  analytics?: {
    models: CursorModelRow[]
    tokenTotals: {
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      costCents: number
    } | null
    dailySpend: CursorDailyPoint[]
    recentEvents: CursorRecentEvent[]
    eventsInCycle: number
    eventsSampled: number
  }
  cloud?: {
    configured: boolean
    agents: CursorCloudAgent[]
    apiKeyName: string | null
    activeCount?: number
  }
  error?: string
  message?: string
}

export async function fetchCursorStatus(): Promise<CursorStatus> {
  const bridge = window.notch?.cursor
  if (!bridge) {
    return {
      connected: false,
      error: "no_electron",
      message: "Run Notch with Electron (npm run dev), not the browser.",
    }
  }
  return bridge.status()
}

export async function openCursorDashboard(): Promise<void> {
  await window.notch?.cursor.openDashboard()
}

export async function openCursorUrl(url: string): Promise<void> {
  await window.notch?.cursor.openUrl(url)
}

export function formatCursorCents(cents: number) {
  if (cents >= 100) return `$${(cents / 100).toFixed(2)}`
  return `${cents.toFixed(1)}¢`
}
