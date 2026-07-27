/**
 * Analytics Sprint 6 — controlled dashboard cutover.
 *
 * Migrates EXACTLY the 9 fields approved for this sprint (see
 * docs/analytics/SPRINT_6_RECONCILIATION_REPORT.md field-by-field mapping)
 * from their legacy (unfiltered) live queries to the Sprint 4 canonical
 * views. Every other field in the dashboard response — including all
 * DailyMetrics-sourced "snapshot" fields discovered during this sprint's
 * prep to have different freshness/window semantics than assumed, and the
 * 5 fields already excluded by the Sprint 5 report (MRR/revenue trends,
 * funnel by cohort, recent jobs feed, YouTube resolution metrics) plus
 * topUsersByJobCount/toolPerf/costMetrics/feedback (validated only
 * partially, at a coarser granularity than they're actually served) — is
 * completely untouched by this file.
 *
 * Design: each approved field has its own canonical computation + a
 * structural validator. `applyCanonicalCutover()` tries each field
 * independently (one field's failure never affects another), and on any
 * failure — thrown error, timeout, or a value that fails structural
 * validation — leaves the already-computed legacy value in the response
 * untouched and emits a critical diagnostic log. Rollback is exactly
 * "set DASHBOARD_CANONICAL_CUTOVER back to false" — this file is never
 * called at all when the flag is off (see adminDashboard.ts).
 */

import { prisma } from '../db'
import { getLogger } from '../lib/logger'

const log = getLogger('api')

const CUTOVER_FIELD_TIMEOUT_MS = 8_000

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = CUTOVER_FIELD_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`canonical field "${label}" timed out`)), timeoutMs)
    ),
  ])
}

// ── Structural validators (exported for direct unit testing) ───────────────

export function isFiniteNonNegativeNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0
}

export function isFiniteRate(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
}

export function isCountArray(v: unknown, keyField: string): v is { [k: string]: unknown; count: number }[] {
  if (!Array.isArray(v)) return false
  return v.every(
    (row) =>
      row !== null &&
      row !== undefined &&
      typeof row === 'object' &&
      keyField in row &&
      typeof (row as Record<string, unknown>).count === 'number' &&
      Number.isFinite((row as Record<string, unknown>).count as number) &&
      ((row as Record<string, unknown>).count as number) >= 0
  )
}

// ── Canonical field computations (mirrors the exact legacy query shape, ──
// ── filtered by includeInBusinessMetrics) ──────────────────────────────

async function canonicalJobsByToolType(thirtyDaysAgo: Date): Promise<{ toolType: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ toolType: string; count: bigint }[]>`
    SELECT "toolType", COUNT(*)::bigint as count FROM business_jobs
    WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics" GROUP BY "toolType"
  `
  return rows.map((r) => ({ toolType: r.toolType, count: Number(r.count) }))
}

async function canonicalProcessingStats(thirtyDaysAgo: Date): Promise<{ avgProcessingMs: number; p95ProcessingMs: number }> {
  const rows = await prisma.$queryRaw<[{ avgProcessing: number | null; p95Processing: number | null }]>`
    SELECT AVG("processingMs")::double precision as "avgProcessing",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as "p95Processing"
    FROM business_jobs WHERE status = 'completed' AND "completedAt" >= ${thirtyDaysAgo} AND "processingMs" IS NOT NULL AND "includeInBusinessMetrics"
  `
  return {
    avgProcessingMs: rows[0]?.avgProcessing !== null && rows[0]?.avgProcessing !== undefined ? Math.round(rows[0].avgProcessing) : 0,
    p95ProcessingMs: rows[0]?.p95Processing !== null && rows[0]?.p95Processing !== undefined ? Math.round(rows[0].p95Processing) : 0,
  }
}

async function canonicalFailureRate(thirtyDaysAgo: Date): Promise<number> {
  const rows = await prisma.$queryRaw<[{ failureRate: number | null }]>`
    SELECT (COUNT(*) FILTER (WHERE status='failed')::float / NULLIF(COUNT(*)::float,0)) as "failureRate"
    FROM business_jobs WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"
  `
  return Number(rows[0]?.failureRate) || 0
}

async function canonicalActiveUsers(since: Date): Promise<number> {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT "userId")::bigint AS count FROM business_jobs
    WHERE "createdAt" >= ${since} AND "includeInBusinessMetrics"
  `
  return Number(rows[0].count)
}

async function canonicalPlanDistribution(): Promise<{ plan: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ plan: string; count: bigint }[]>`
    SELECT plan, COUNT(*)::bigint as count FROM business_users WHERE "includeInBusinessMetrics" GROUP BY plan ORDER BY count DESC
  `
  return rows.map((r) => ({ plan: r.plan, count: Number(r.count) }))
}

async function canonicalUtmBreakdown(): Promise<{ source: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ source: string; count: bigint }[]>`
    SELECT COALESCE("utmSource",'direct') as source, COUNT(*)::bigint as count
    FROM business_users WHERE "includeInBusinessMetrics" GROUP BY 1 ORDER BY count DESC LIMIT 20
  `
  return rows.map((r) => ({ source: r.source, count: Number(r.count) }))
}

async function canonicalFailureReasons(thirtyDaysAgo: Date): Promise<{ reason: string; count: number }[]> {
  const rows = await prisma.$queryRaw<{ reason: string; count: bigint }[]>`
    SELECT COALESCE("failureReason",'unknown') as reason, COUNT(*)::bigint as count
    FROM business_jobs WHERE status='failed' AND "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"
    GROUP BY 1 ORDER BY count DESC LIMIT 15
  `
  return rows.map((r) => ({ reason: r.reason, count: Number(r.count) }))
}

// ── Cutover orchestration ───────────────────────────────────────────────

/** Minimal shape this function needs from the dashboard response — avoids importing adminDashboard.ts's full response type and creating a circular dependency. */
export interface CutoverableResponse {
  usage: { jobsByToolType: { toolType: string; count: number }[]; [k: string]: unknown }
  performance: { avgProcessingMs: number; p95ProcessingMs: number; failureRate: number }
  retention: { activeUsersLast7Days: number; activeUsersLast30Days: number }
  planDistribution: { plan: string; count: number }[]
  utmBreakdown: { source: string; count: number }[]
  failureReasons: { reason: string; count: number }[]
}

/** Exported (not just internal) so the fallback/timeout/validation behavior can be unit-tested directly, without a live database — see tests/canonicalDashboardCutover.test.ts. */
export async function tryCutoverField<T>(
  fieldName: string,
  compute: () => Promise<T>,
  isValid: (v: T) => boolean,
  apply: (v: T) => void,
  timeoutMs = CUTOVER_FIELD_TIMEOUT_MS
): Promise<void> {
  try {
    const value = await withTimeout(compute(), fieldName, timeoutMs)
    if (!isValid(value)) {
      throw new Error(`canonical field "${fieldName}" returned structurally invalid data: ${JSON.stringify(value).slice(0, 200)}`)
    }
    apply(value)
  } catch (err) {
    log.error({
      msg: 'dashboard_canonical_cutover_FALLBACK',
      field: fieldName,
      error: (err as Error)?.message ?? String(err),
      action: 'served legacy value for this field; canonical computation failed validation or threw/timed out',
    })
    // Intentionally no re-throw and no mutation — the legacy value already
    // present in `response` (computed unconditionally, unchanged, before
    // this function is ever called) remains exactly as it was.
  }
}

/**
 * Mutates `response` in place, replacing exactly the 9 approved fields with
 * their canonical equivalents when valid, leaving every other field (and
 * any approved field whose canonical computation failed) at its
 * already-computed legacy value. Never throws.
 */
export async function applyCanonicalCutover(response: CutoverableResponse): Promise<void> {
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  await Promise.all([
    tryCutoverField(
      'usage.jobsByToolType',
      () => canonicalJobsByToolType(thirtyDaysAgo),
      (v) => isCountArray(v, 'toolType'),
      (v) => { response.usage.jobsByToolType = v }
    ),
    tryCutoverField(
      'performance.{avgProcessingMs,p95ProcessingMs}',
      () => canonicalProcessingStats(thirtyDaysAgo),
      (v) => isFiniteNonNegativeNumber(v.avgProcessingMs) && isFiniteNonNegativeNumber(v.p95ProcessingMs),
      (v) => {
        response.performance.avgProcessingMs = v.avgProcessingMs
        response.performance.p95ProcessingMs = v.p95ProcessingMs
      }
    ),
    tryCutoverField(
      'performance.failureRate',
      () => canonicalFailureRate(thirtyDaysAgo),
      isFiniteRate,
      (v) => { response.performance.failureRate = v }
    ),
    tryCutoverField(
      'retention.activeUsersLast7Days',
      () => canonicalActiveUsers(sevenDaysAgo),
      isFiniteNonNegativeNumber,
      (v) => { response.retention.activeUsersLast7Days = v }
    ),
    tryCutoverField(
      'retention.activeUsersLast30Days',
      () => canonicalActiveUsers(thirtyDaysAgo),
      isFiniteNonNegativeNumber,
      (v) => { response.retention.activeUsersLast30Days = v }
    ),
    tryCutoverField(
      'planDistribution',
      canonicalPlanDistribution,
      (v) => isCountArray(v, 'plan'),
      (v) => { response.planDistribution = v }
    ),
    tryCutoverField(
      'utmBreakdown',
      canonicalUtmBreakdown,
      (v) => isCountArray(v, 'source'),
      (v) => { response.utmBreakdown = v }
    ),
    tryCutoverField(
      'failureReasons',
      () => canonicalFailureReasons(thirtyDaysAgo),
      (v) => isCountArray(v, 'reason'),
      (v) => { response.failureReasons = v }
    ),
  ])
}
