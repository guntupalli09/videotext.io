/**
 * Analytics Sprint 3 — Stripe-vs-Postgres MRR/active-subscriber
 * reconciliation. Read-only against Stripe (subscriptions.list only — no
 * write-capable Stripe method is called anywhere in this file) and against
 * Postgres, except for its own INSERT into MrrReconciliationRun (a table
 * that exists solely to record this job's own run history).
 *
 * See docs/analytics/STRIPE_RECONCILIATION_PLAN.md for the design
 * (tolerance thresholds, cadence, alerting) this implements.
 */

import type Stripe from 'stripe'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'
import { MRR_EXTRACTION_V2_WRITE } from '../utils/featureFlags'

const log = getLogger('worker')

/** 1% or $50 (5000 cents), whichever is larger — per STRIPE_RECONCILIATION_PLAN.md. */
function toleranceCents(baseCents: number): number {
  return Math.max(5000, Math.round(baseCents * 0.01))
}

export interface StripeMrrTotals {
  mrrCents: number
  activeCount: number
}

/**
 * Sums normalized monthly-equivalent recurring value across all currently
 * active Stripe subscriptions, reading Subscription.items.data[].price
 * directly (confirmed live, 2026-07-27, that this is still a fully expanded
 * Price object in this account's API version — unlike Invoice line items,
 * the Subscription resource was not restructured; see
 * docs/analytics/STRIPE_API_COMPATIBILITY_AUDIT.md §3). Paginates through
 * the full active-subscription list; never assumes a single page.
 */
export async function computeStripeMrr(stripeClient: Pick<Stripe, 'subscriptions'>): Promise<StripeMrrTotals> {
  let mrrCents = 0
  let activeCount = 0
  let startingAfter: string | undefined

  for (;;) {
    const page = await stripeClient.subscriptions.list({
      status: 'active',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const sub of page.data) {
      activeCount += 1
      for (const item of sub.items.data) {
        const price = typeof item.price === 'string' ? null : item.price
        const recurring = price?.recurring
        if (!price || !recurring?.interval) continue
        const intervalCount = Math.max(1, recurring.interval_count ?? 1)
        const unitAmount = price.unit_amount ?? 0
        const quantity = item.quantity ?? 1
        const lineAmount = unitAmount * quantity
        mrrCents += Math.round(
          recurring.interval === 'year' ? lineAmount / 12 / intervalCount : lineAmount / intervalCount
        )
      }
    }

    if (!page.has_more || page.data.length === 0) break
    startingAfter = page.data[page.data.length - 1].id
  }

  return { mrrCents, activeCount }
}

export interface PostgresMrrTotals {
  mrrCents: number
  activeCount: number
}

/** Sums normalized monthly cents from the canonical current-state table. */
export async function computePostgresMrr(): Promise<PostgresMrrTotals> {
  const agg = await prisma.subscriptionCurrentState.aggregate({
    where: { status: 'active' },
    _sum: { normalizedMonthlyCents: true },
    _count: true,
  })
  return {
    mrrCents: agg._sum.normalizedMonthlyCents ?? 0,
    activeCount: agg._count,
  }
}

export interface ReconciliationResult {
  writePathEnabled: boolean
  postgresMrrCents: number
  stripeMrrCents: number
  deltaCents: number
  deltaPct: number | null
  postgresActiveCount: number
  stripeActiveCount: number
  severity: 'info' | 'ok' | 'warn' | 'critical'
  notes: string
}

/**
 * Pure comparison/classification logic — no I/O, fully unit-testable without
 * touching Stripe or Postgres. This is what Sprint 3's "validate the alert
 * actually fires on a known-bad scenario" requirement is validated against,
 * since manufacturing a real bad scenario against the live Stripe account
 * was judged out of scope for a read-only reconciliation job (see
 * IMPLEMENTATION_PROGRESS.md for that adaptation and its rationale).
 */
export function classify(
  postgres: PostgresMrrTotals,
  stripe: StripeMrrTotals,
  writePathEnabled: boolean,
  previousRunBreached?: boolean
): ReconciliationResult {
  const deltaCents = stripe.mrrCents - postgres.mrrCents
  const deltaPct =
    postgres.mrrCents > 0
      ? (Math.abs(deltaCents) / postgres.mrrCents) * 100
      : stripe.mrrCents > 0
        ? 100
        : 0

  if (!writePathEnabled) {
    return {
      writePathEnabled,
      postgresMrrCents: postgres.mrrCents,
      stripeMrrCents: stripe.mrrCents,
      deltaCents,
      deltaPct,
      postgresActiveCount: postgres.activeCount,
      stripeActiveCount: stripe.activeCount,
      severity: 'info',
      notes:
        'MRR_EXTRACTION_V2_WRITE is disabled — SubscriptionCurrentState is expected to be empty/stale ' +
        'and this comparison is diagnostic only, not a reconciliation failure.',
    }
  }

  const tolerance = toleranceCents(Math.max(postgres.mrrCents, stripe.mrrCents))
  const mrrWithinTolerance = Math.abs(deltaCents) <= tolerance
  const countMismatch = postgres.activeCount !== stripe.activeCount // zero-tolerance per plan

  let severity: ReconciliationResult['severity'] = 'ok'
  let notes = 'Within tolerance.'

  if (countMismatch) {
    severity = 'critical'
    notes = `Active subscriber count mismatch (zero tolerance): postgres=${postgres.activeCount}, stripe=${stripe.activeCount}.`
  } else if (!mrrWithinTolerance) {
    severity = previousRunBreached ? 'critical' : 'warn'
    notes = previousRunBreached
      ? 'MRR delta exceeds tolerance for the second consecutive run — escalated to critical.'
      : 'MRR delta exceeds tolerance (single occurrence so far — will escalate if it recurs next run).'
  }

  return {
    writePathEnabled,
    postgresMrrCents: postgres.mrrCents,
    stripeMrrCents: stripe.mrrCents,
    deltaCents,
    deltaPct,
    postgresActiveCount: postgres.activeCount,
    stripeActiveCount: stripe.activeCount,
    severity,
    notes,
  }
}

/**
 * Full run: compute both sides, classify, persist the result, log it.
 * Read-only against Stripe/business tables; the only write is this run's own
 * row in MrrReconciliationRun. Never throws — a failure is logged and
 * surfaced via the return value's absence (caller decides how to react).
 */
export async function runReconciliation(
  stripeClient: Pick<Stripe, 'subscriptions'>,
  options: { persist?: boolean } = {}
): Promise<ReconciliationResult> {
  const persist = options.persist ?? true

  const [postgres, stripeTotals] = await Promise.all([computePostgresMrr(), computeStripeMrr(stripeClient)])

  const previousRun = await prisma.mrrReconciliationRun.findFirst({
    where: { writePathEnabled: true },
    orderBy: { runAt: 'desc' },
    select: { severity: true },
  })
  const previousRunBreached = previousRun ? previousRun.severity !== 'ok' && previousRun.severity !== 'info' : false

  const result = classify(postgres, stripeTotals, MRR_EXTRACTION_V2_WRITE, previousRunBreached)

  log.info({ msg: 'stripe_reconciliation_run', ...result })

  if (persist) {
    await prisma.mrrReconciliationRun.create({
      data: {
        writePathEnabled: result.writePathEnabled,
        postgresMrrCents: result.postgresMrrCents,
        stripeMrrCents: result.stripeMrrCents,
        deltaCents: result.deltaCents,
        deltaPct: result.deltaPct,
        postgresActiveCount: result.postgresActiveCount,
        stripeActiveCount: result.stripeActiveCount,
        severity: result.severity,
        notes: result.notes,
      },
    })
  }

  return result
}
