/**
 * Founder-only "Conversion Intent" dashboard API client.
 * Backed by server GET /api/admin/conversion-intent?range=24h|7d|30d|all.
 */

import { api } from './api'

export type IntentRange = '24h' | '7d' | '30d' | 'all'
export type IntentLevel = 'CONVERTED' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface ConversionIntentEvent {
  eventName: string
  createdAt: string
}

export interface ConversionIntentPerson {
  userId: string
  email: string
  name: string | null
  plan: string
  converted: boolean
  intentLevel: IntentLevel
  source: string | null
  tool: string | null
  remainingImports: number | null
  billingChoice: string | null
  lastActivityAt: string | null
  events: ConversionIntentEvent[]
}

export interface ConversionIntentFunnel {
  counts: {
    pricingVisitors: number
    upgradeClickers: number
    checkoutStarters: number
    converted: number
  }
  rates: {
    pricingToUpgradePct: number | null
    upgradeToCheckoutPct: number | null
    checkoutToPaidPct: number | null
    overallPricingToPaidPct: number | null
  }
  rawEventCounts: Record<string, number>
  /** Explains why this dashboard cannot show an anonymous-visitor count (see spec Section 6). */
  anonymousVisitorNote: string
}

export interface ConversionIntentData {
  range: IntentRange
  funnel: ConversionIntentFunnel
  people: ConversionIntentPerson[]
  hotLeads: ConversionIntentPerson[]
}

export type FetchConversionIntentResult =
  | { ok: true; data: ConversionIntentData }
  | { ok: false; status: 401 | 403 | 'error' }

export async function fetchConversionIntent(range: IntentRange = '30d'): Promise<FetchConversionIntentResult> {
  try {
    const res = await api(`/api/admin/conversion-intent?range=${encodeURIComponent(range)}`)
    if (res.status === 401) return { ok: false, status: 401 }
    if (res.status === 403) return { ok: false, status: 403 }
    if (!res.ok) return { ok: false, status: 'error' }
    const data = await res.json()
    return { ok: true, data }
  } catch {
    return { ok: false, status: 'error' }
  }
}
