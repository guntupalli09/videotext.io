/**
 * Analytics Sprint 6 (extended by Sprint 8) — controlled dashboard cutover.
 *
 * Sprint 6 migrated the first 9 approved fields (see
 * docs/analytics/SPRINT_6_RECONCILIATION_REPORT.md field-by-field mapping)
 * from their legacy (unfiltered) live queries to the Sprint 4 canonical
 * views. Sprint 8 completes the fields that were excluded only because
 * they'd been validated at a coarser granularity than actually served
 * (Sprint 6 §2): `usage.topUsersByJobCount` (full row, not just email),
 * `toolPerf` (all 6 fields, not just `count`), `costMetrics` (all 4 fields,
 * not just `jobCount`/`totalWhisperCostUsd`), `feedback` (actual served
 * LIMIT-15000 feed, not just an aggregate count), `feedbackByTool`,
 * `starDistribution` — all still gated by the same `DASHBOARD_CANONICAL_
 * CUTOVER` flag (still default off; this sprint does not add a new flag).
 *
 * Still completely untouched by this file: all DailyMetrics-sourced
 * "snapshot"/"daily" fields (Sprint 7's `ROLLUP_CANONICAL_SOURCE` governs
 * those, at the rollup layer, independently of this file), MRR/revenue
 * trends, `funnelByCohort`, `recentJobs`, `youtubeResolution`, and
 * `users`/allUsers (Sprint 8 finding: `business_users` doesn't expose
 * `name`/`lastActiveAt` — see docs/analytics/SPRINT_8_RECONCILIATION_REPORT.md).
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

/** Sprint 8: like isFiniteNonNegativeNumber, but null is also valid (e.g. an average with no qualifying rows). */
export function isFiniteNonNegativeNumberOrNull(v: unknown): boolean {
  return v === null || isFiniteNonNegativeNumber(v)
}

/** Sprint 8: usage.topUsersByJobCount's actual served row shape. */
export function isTopUsersArray(v: unknown): v is { userId: string; email: string; plan: string; jobCount: number }[] {
  if (!Array.isArray(v)) return false
  return v.every(
    (row) =>
      row !== null &&
      typeof row === 'object' &&
      typeof (row as Record<string, unknown>).userId === 'string' &&
      typeof (row as Record<string, unknown>).email === 'string' &&
      typeof (row as Record<string, unknown>).plan === 'string' &&
      isFiniteNonNegativeNumber((row as Record<string, unknown>).jobCount)
  )
}

/** Sprint 8: toolPerf's actual served row shape -- count is required; the 5 aggregates may be null. */
export function isToolPerfArray(v: unknown): v is {
  toolType: string; count: number; avgMs: number | null; p95Ms: number | null
  avgFileSizeMb: number | null; avgDurationSec: number | null; totalMinutes: number | null
}[] {
  if (!Array.isArray(v)) return false
  return v.every((row) => {
    if (row === null || typeof row !== 'object') return false
    const r = row as Record<string, unknown>
    return (
      typeof r.toolType === 'string' &&
      isFiniteNonNegativeNumber(r.count) &&
      isFiniteNonNegativeNumberOrNull(r.avgMs) &&
      isFiniteNonNegativeNumberOrNull(r.p95Ms) &&
      isFiniteNonNegativeNumberOrNull(r.avgFileSizeMb) &&
      isFiniteNonNegativeNumberOrNull(r.avgDurationSec) &&
      isFiniteNonNegativeNumberOrNull(r.totalMinutes)
    )
  })
}

/** Sprint 8: costMetrics's actual served shape -- the whole field is null when there's no cost data at all. */
export function isCostMetricsShape(v: unknown): v is {
  jobsWithCost: number; avgWhisperCostUsd: number | null; totalWhisperCostUsd: number | null; avgDurationSec: number | null
} | null {
  if (v === null) return true
  if (typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    isFiniteNonNegativeNumber(r.jobsWithCost) &&
    isFiniteNonNegativeNumberOrNull(r.avgWhisperCostUsd) &&
    isFiniteNonNegativeNumberOrNull(r.totalWhisperCostUsd) &&
    isFiniteNonNegativeNumberOrNull(r.avgDurationSec)
  )
}

/** Sprint 8: feedback's actual served row shape -- validated lightly (id/stars/createdAt), not every free-text field. */
export function isFeedbackArray(v: unknown): v is { id: string; stars: number | null; createdAt: string }[] {
  if (!Array.isArray(v)) return false
  return v.every((row) => {
    if (row === null || typeof row !== 'object') return false
    const r = row as Record<string, unknown>
    return typeof r.id === 'string' && (r.stars === null || typeof r.stars === 'number') && typeof r.createdAt === 'string'
  })
}

/** Sprint 8: feedbackByTool's actual served row shape. */
export function isFeedbackByToolArray(v: unknown): v is { toolId: string; avgStars: number; count: number }[] {
  if (!Array.isArray(v)) return false
  return v.every((row) => {
    if (row === null || typeof row !== 'object') return false
    const r = row as Record<string, unknown>
    return typeof r.toolId === 'string' && typeof r.avgStars === 'number' && Number.isFinite(r.avgStars) && isFiniteNonNegativeNumber(r.count)
  })
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

// ── Sprint 8 additions: full-granularity canonical computations ────────

async function canonicalTopUsersByJobCount(thirtyDaysAgo: Date): Promise<{ userId: string; email: string; plan: string; jobCount: number }[]> {
  const rows = await prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
    SELECT bj."userId", bu.email, bu.plan, COUNT(*)::bigint as "jobCount"
    FROM business_jobs bj JOIN business_users bu ON bu.id = bj."userId"
    WHERE bj."createdAt" >= ${thirtyDaysAgo} AND bj."includeInBusinessMetrics"
    GROUP BY bj."userId", bu.email, bu.plan ORDER BY "jobCount" DESC LIMIT 10
  `
  return rows.map((r) => ({ userId: r.userId, email: r.email, plan: r.plan ?? 'free', jobCount: Number(r.jobCount) }))
}

async function canonicalToolPerf(): Promise<{
  toolType: string; count: number; avgMs: number | null; p95Ms: number | null
  avgFileSizeMb: number | null; avgDurationSec: number | null; totalMinutes: number | null
}[]> {
  const rows = await prisma.$queryRaw<{
    toolType: string; count: bigint; avgMs: number | null; p95Ms: number | null
    avgFileSizeBytes: number | null; avgDurationSec: number | null; totalMinutes: number | null
  }[]>`
    SELECT "toolType", COUNT(*)::bigint as count,
      AVG("processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "avgMs",
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "p95Ms",
      AVG("fileSizeBytes"::double precision)::double precision as "avgFileSizeBytes",
      AVG("videoDurationSec")::double precision as "avgDurationSec",
      SUM("videoDurationSec"::double precision / 60.0)::double precision as "totalMinutes"
    FROM business_jobs WHERE status = 'completed' AND "includeInBusinessMetrics" GROUP BY "toolType" ORDER BY count DESC
  `
  return rows.map((r) => ({
    toolType: r.toolType,
    count: Number(r.count),
    avgMs: r.avgMs !== null ? Math.round(r.avgMs) : null,
    p95Ms: r.p95Ms !== null ? Math.round(r.p95Ms) : null,
    avgFileSizeMb: r.avgFileSizeBytes !== null ? Math.round((r.avgFileSizeBytes / 1024 / 1024) * 10) / 10 : null,
    avgDurationSec: r.avgDurationSec !== null ? Math.round(r.avgDurationSec) : null,
    totalMinutes: r.totalMinutes !== null ? Math.round(r.totalMinutes) : null,
  }))
}

async function canonicalCostMetrics(thirtyDaysAgo: Date): Promise<{
  jobsWithCost: number; avgWhisperCostUsd: number | null; totalWhisperCostUsd: number | null; avgDurationSec: number | null
} | null> {
  const rows = await prisma.$queryRaw<[{
    jobCount: bigint; avgWhisperMicros: number | null; totalWhisperMicros: bigint | null; avgDurationSec: number | null
  }]>`
    SELECT COUNT(*)::bigint as "jobCount",
      AVG("whisperCostMicros")::double precision as "avgWhisperMicros",
      SUM("whisperCostMicros")::bigint as "totalWhisperMicros",
      AVG("videoDurationSec")::double precision as "avgDurationSec"
    FROM business_jobs WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "whisperCostMicros" IS NOT NULL AND "includeInBusinessMetrics"
  `
  const cm = rows[0]
  if (!cm || !Number(cm.jobCount)) return null
  const avgWhisperUsd = cm.avgWhisperMicros !== null ? cm.avgWhisperMicros / 1_000_000 : null
  const totalWhisperUsd = cm.totalWhisperMicros !== null ? Number(cm.totalWhisperMicros) / 1_000_000 : null
  return {
    jobsWithCost: Number(cm.jobCount),
    avgWhisperCostUsd: avgWhisperUsd !== null ? Math.round(avgWhisperUsd * 10000) / 10000 : null,
    totalWhisperCostUsd: totalWhisperUsd !== null ? Math.round(totalWhisperUsd * 100) / 100 : null,
    avgDurationSec: cm.avgDurationSec !== null ? Math.round(cm.avgDurationSec) : null,
  }
}

async function canonicalFeedback(): Promise<{
  id: string; toolId: string | null; stars: number | null; comment: string | null; planAtSubmit: string | null
  createdAt: string; userId: string | null; userNameOrEmail: string | null; email: string | null
  topTool: string | null; topToolReason: string | null; featureRequest: string | null; otherFeedback: string | null; source: string | null
}[]> {
  const rows = await prisma.$queryRaw<{
    id: string; toolId: string | null; stars: number | null; comment: string | null; planAtSubmit: string | null
    createdAt: Date; userId: string | null; userNameOrEmail: string | null; email: string | null
    topTool: string | null; topToolReason: string | null; featureRequest: string | null; otherFeedback: string | null; source: string | null
  }[]>`
    SELECT f.id, f."toolId", f.stars, f.comment, f."planAtSubmit", f."createdAt", f."userId", f."userNameOrEmail",
      f.email, f."topTool", f."topToolReason", f."featureRequest", f."otherFeedback", f.source
    FROM "Feedback" f LEFT JOIN business_users bu ON bu.id = f."userId"
    WHERE f."userId" IS NULL OR bu."includeInBusinessMetrics"
    ORDER BY f."createdAt" DESC LIMIT 15000
  `
  const userIds = rows.map((f) => f.userId).filter((id): id is string => id !== null)
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : []
  const emailMap = Object.fromEntries(users.map((u) => [u.id, u.email]))
  return rows.map((f) => ({
    id: f.id,
    toolId: f.toolId,
    stars: f.stars,
    comment: f.comment,
    planAtSubmit: f.planAtSubmit,
    createdAt: f.createdAt.toISOString(),
    userId: f.userId,
    userNameOrEmail: f.userNameOrEmail ?? (f.userId ? emailMap[f.userId] ?? null : null),
    email: f.email,
    topTool: f.topTool,
    topToolReason: f.topToolReason,
    featureRequest: f.featureRequest,
    otherFeedback: f.otherFeedback,
    source: f.source,
  }))
}

async function canonicalFeedbackByTool(): Promise<{ toolId: string; avgStars: number; count: number }[]> {
  const rows = await prisma.$queryRaw<{ toolId: string; avgStars: number; count: bigint }[]>`
    SELECT COALESCE(f."toolId",'unknown') as "toolId", AVG(f.stars)::double precision as "avgStars", COUNT(*)::bigint as count
    FROM "Feedback" f LEFT JOIN business_users bu ON bu.id = f."userId"
    WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
    GROUP BY f."toolId" ORDER BY count DESC
  `
  return rows.map((r) => ({ toolId: r.toolId, avgStars: Number(r.avgStars), count: Number(r.count) }))
}

async function canonicalStarDistribution(): Promise<{ stars: number; count: number }[]> {
  const rows = await prisma.$queryRaw<{ stars: number; count: bigint }[]>`
    SELECT f.stars, COUNT(*)::bigint as count FROM "Feedback" f LEFT JOIN business_users bu ON bu.id = f."userId"
    WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
    GROUP BY f.stars ORDER BY f.stars DESC
  `
  return rows.map((r) => ({ stars: Number(r.stars), count: Number(r.count) }))
}

// ── Cutover orchestration ───────────────────────────────────────────────

/** Minimal shape this function needs from the dashboard response — avoids importing adminDashboard.ts's full response type and creating a circular dependency. */
export interface CutoverableResponse {
  usage: {
    jobsByToolType: { toolType: string; count: number }[]
    topUsersByJobCount: { userId: string; email: string; plan: string; jobCount: number }[]
    [k: string]: unknown
  }
  performance: { avgProcessingMs: number; p95ProcessingMs: number; failureRate: number }
  retention: { activeUsersLast7Days: number; activeUsersLast30Days: number }
  planDistribution: { plan: string; count: number }[]
  utmBreakdown: { source: string; count: number }[]
  failureReasons: { reason: string; count: number }[]
  toolPerf: {
    toolType: string; count: number; avgMs: number | null; p95Ms: number | null
    avgFileSizeMb: number | null; avgDurationSec: number | null; totalMinutes: number | null
  }[]
  costMetrics: {
    jobsWithCost: number; avgWhisperCostUsd: number | null; totalWhisperCostUsd: number | null; avgDurationSec: number | null
  } | null
  feedback: {
    id: string; toolId: string | null; stars: number | null; comment: string | null; planAtSubmit: string | null
    createdAt: string; userId: string | null; userNameOrEmail: string | null; email: string | null
    topTool: string | null; topToolReason: string | null; featureRequest: string | null; otherFeedback: string | null; source: string | null
  }[]
  feedbackByTool: { toolId: string; avgStars: number; count: number }[]
  starDistribution: { stars: number; count: number }[]
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
    // ── Sprint 8 additions ──────────────────────────────────────────────
    tryCutoverField(
      'usage.topUsersByJobCount',
      () => canonicalTopUsersByJobCount(thirtyDaysAgo),
      isTopUsersArray,
      (v) => { response.usage.topUsersByJobCount = v }
    ),
    tryCutoverField(
      'toolPerf',
      canonicalToolPerf,
      isToolPerfArray,
      (v) => { response.toolPerf = v }
    ),
    tryCutoverField(
      'costMetrics',
      () => canonicalCostMetrics(thirtyDaysAgo),
      isCostMetricsShape,
      (v) => { response.costMetrics = v }
    ),
    tryCutoverField(
      'feedback',
      canonicalFeedback,
      isFeedbackArray,
      (v) => { response.feedback = v }
    ),
    tryCutoverField(
      'feedbackByTool',
      canonicalFeedbackByTool,
      isFeedbackByToolArray,
      (v) => { response.feedbackByTool = v }
    ),
    tryCutoverField(
      'starDistribution',
      canonicalStarDistribution,
      (v) => isCountArray(v, 'stars'),
      (v) => { response.starDistribution = v }
    ),
  ])
}
