/**
 * Conversion Intent — pure classification logic for the Founder-only
 * "Conversion Intent" dashboard section (server/src/routes/adminConversionIntent.ts).
 *
 * Data source: the app's own Postgres tables (EventLog + User + UpgradeIntent),
 * NOT PostHog — there is no server-side PostHog query client in the running app
 * (only a standalone maintenance script), and this feature intentionally does
 * not add one. See adminConversionIntent.ts for the query layer; this file
 * holds only pure, DB-free logic so it can be unit tested without a database.
 *
 * IMPORTANT: conversion ("CONVERTED") must never be asserted from a client
 * -submitted event (e.g. a PostHog/EventLog `checkout_completed`-style event).
 * It is derived exclusively from the authoritative `User.plan` /
 * `subscriptionStatus` fields, which are written only by the Stripe webhook.
 */

export type IntentEventName =
  | 'pricing_page_view'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'checkout_session_created'
  | 'stripe_redirect'

/** Event names read from EventLog to build the funnel + people list. */
export const RELEVANT_EVENT_NAMES: IntentEventName[] = [
  'pricing_page_view',
  'upgrade_clicked',
  'checkout_started',
  'checkout_session_created',
  'stripe_redirect',
]

export type IntentLevel = 'CONVERTED' | 'HIGH' | 'MEDIUM' | 'LOW'

export type IntentRange = '24h' | '7d' | '30d' | 'all'

/** Milliseconds lookback for each supported range; 'all' has no lower bound. */
export const RANGE_MS: Record<Exclude<IntentRange, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export function isValidRange(v: unknown): v is IntentRange {
  return v === '24h' || v === '7d' || v === '30d' || v === 'all'
}

export function rangeStartDate(range: IntentRange, now: Date = new Date()): Date | null {
  if (range === 'all') return null
  return new Date(now.getTime() - RANGE_MS[range])
}

/**
 * Precedence order for a single event's own tier, independent of any other
 * signal (lowest to highest): pricing_page_view < upgrade_clicked <
 * checkout-tier (checkout_started / checkout_session_created / stripe_redirect,
 * treated as equal-highest pre-conversion tier). CONVERTED is never derived
 * from an event — see classifyUser below.
 */
export function eventTierRank(eventName: string): number {
  switch (eventName) {
    case 'checkout_started':
    case 'checkout_session_created':
    case 'stripe_redirect':
      return 3 // HIGH
    case 'upgrade_clicked':
      return 2 // MEDIUM
    case 'pricing_page_view':
      return 1 // LOW
    default:
      return 0
  }
}

function tierRankToLevel(rank: number): IntentLevel {
  if (rank >= 3) return 'HIGH'
  if (rank === 2) return 'MEDIUM'
  return 'LOW'
}

export interface IntentEventRecord {
  eventName: string
  createdAt: Date
  metadata: Record<string, unknown> | null | undefined
}

export interface ExtractedIntentProps {
  source: string | null
  tool: string | null
  remainingImports: number | null
  billingChoice: string | null
}

function readString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function readNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Pull source/tool/remaining_imports/billing_choice out of an event's stored metadata, never fabricating. */
export function extractIntentProps(metadata: Record<string, unknown> | null | undefined): ExtractedIntentProps {
  const m = metadata ?? {}
  return {
    source: readString(m.source),
    tool: readString(m.tool),
    remainingImports: readNumber(m.remaining_imports),
    billingChoice: readString(m.billing_interval) ?? readString(m.billingInterval),
  }
}

export interface ClassifiedUser {
  intentLevel: IntentLevel
  lastActivityAt: Date | null
  /** Properties from the highest-tier event that carries them (never fabricated). */
  props: ExtractedIntentProps
  /** Full chronological event list (ascending) actually used for classification. */
  events: IntentEventRecord[]
}

/**
 * Classify a single user's strongest intent from their relevant EventLog rows,
 * confirming CONVERTED only against the authoritative plan/subscription state.
 * Precedence (highest wins): CONVERTED > HIGH (checkout tier) > MEDIUM (upgrade_clicked) > LOW (pricing_page_view).
 */
export function classifyUser(events: IntentEventRecord[], isConvertedNow: boolean): ClassifiedUser {
  const sorted = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  let bestRank = 0
  let bestEvent: IntentEventRecord | null = null
  let lastActivityAt: Date | null = null

  for (const e of sorted) {
    const rank = eventTierRank(e.eventName)
    if (lastActivityAt == null || e.createdAt.getTime() > lastActivityAt.getTime()) {
      lastActivityAt = e.createdAt
    }
    if (rank >= bestRank) {
      bestRank = rank
      bestEvent = e
    }
  }

  const intentLevel: IntentLevel = isConvertedNow ? 'CONVERTED' : tierRankToLevel(bestRank)

  return {
    intentLevel,
    lastActivityAt,
    props: extractIntentProps(bestEvent?.metadata),
    events: sorted,
  }
}

/**
 * Hot Leads: authenticated Free-plan users (not converted) whose strongest
 * intent is MEDIUM (upgrade_clicked) or HIGH (checkout-tier) — i.e. showed
 * real purchase intent but have not converted.
 */
export function isHotLead(intentLevel: IntentLevel): boolean {
  return intentLevel === 'MEDIUM' || intentLevel === 'HIGH'
}

export interface FunnelCounts {
  pricingVisitors: number
  upgradeClickers: number
  checkoutStarters: number
  converted: number
}

export interface FunnelRates {
  pricingToUpgradePct: number | null
  upgradeToCheckoutPct: number | null
  checkoutToPaidPct: number | null
  overallPricingToPaidPct: number | null
}

function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 1000) / 10
}

/**
 * Funnel counts are UNIQUE USERS reaching each tier at least once in range
 * (cumulative: a checkout starter also counts as an upgrade clicker/pricing
 * visitor is NOT assumed — each count reflects users who fired that specific
 * event, since a user can jump straight to checkout without a tracked
 * pricing_page_view). `converted` reflects current authoritative plan state.
 */
export function computeFunnelRates(counts: FunnelCounts): FunnelRates {
  return {
    pricingToUpgradePct: pct(counts.upgradeClickers, counts.pricingVisitors),
    upgradeToCheckoutPct: pct(counts.checkoutStarters, counts.upgradeClickers),
    checkoutToPaidPct: pct(counts.converted, counts.checkoutStarters),
    overallPricingToPaidPct: pct(counts.converted, counts.pricingVisitors),
  }
}

/** True when the authoritative User record represents a paid, non-free plan. */
export function isUserConverted(plan: string | null | undefined): boolean {
  return !!plan && plan !== 'free'
}
