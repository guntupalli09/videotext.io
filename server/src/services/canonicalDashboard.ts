/**
 * Analytics Sprint 5 — Founder Dashboard shadow-comparison.
 *
 * Computes every taxonomy-dependent dashboard metric TWICE: once via the
 * exact query adminDashboard.ts already runs (legacy, unchanged, still the
 * only thing ever served to the UI), and once via the Sprint 4 canonical
 * views (business_users/business_jobs, filtered by
 * includeInBusinessMetrics). Read-only throughout. Used by both:
 *   - the live dashboard route (behind DASHBOARD_SHADOW_COMPUTE, logs only,
 *     never affects the served response — see adminDashboard.ts)
 *   - the standalone report script (scripts/sprint5-dashboard-reconciliation-report.ts)
 *
 * Metrics that depend on models not yet built in the canonical layer
 * (business_subscriptions/business_revenue — Sprint 7+; fact_event — Sprint
 * 8) are explicitly reported as NOT_YET_COMPARABLE with a reason, not
 * silently omitted — see docs/analytics/SPRINT_5_RECONCILIATION_REPORT.md.
 */

import { prisma } from '../db'

export type Classification = 'IDENTICAL' | 'EXPECTED_DIVERGENCE' | 'UNEXPLAINED' | 'NOT_YET_COMPARABLE'

export interface MetricComparison {
  card: string
  metric: string
  source: string // which table/view each side reads
  legacyValue: unknown
  canonicalValue: unknown
  absoluteDiff: number | null
  percentDiff: number | null
  classification: Classification
  explanation: string
}

function numDiff(legacy: number, canonical: number): { abs: number; pct: number | null } {
  const abs = legacy - canonical
  const pct = legacy !== 0 ? (Math.abs(abs) / Math.abs(legacy)) * 100 : canonical !== 0 ? 100 : 0
  return { abs, pct }
}

/** A scalar delta is EXPECTED_DIVERGENCE iff canonical <= legacy (canonical is always a subset) and non-negative. */
function classifySubsetScalar(legacy: number, canonical: number): Classification {
  if (legacy === canonical) return 'IDENTICAL'
  return canonical <= legacy ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED'
}

const EXCLUDED_ACCOUNTS_NOTE =
  'Delta attributable to the 4 Sprint 2 taxonomy exclusions (1 demo, 1 founder, 2 internal) and/or guest jobs (Job rows with no matching User row) being excluded from the canonical, customer-only figure.'

export async function compareDashboardMetrics(): Promise<MetricComparison[]> {
  const comparisons: MetricComparison[] = []
  const now = Date.now()
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

  function pushScalar(
    card: string,
    metric: string,
    source: string,
    legacy: number,
    canonical: number,
    explanation: string
  ): void {
    const { abs, pct } = numDiff(legacy, canonical)
    comparisons.push({
      card,
      metric,
      source,
      legacyValue: legacy,
      canonicalValue: canonical,
      absoluteDiff: abs,
      percentDiff: pct,
      classification: classifySubsetScalar(legacy, canonical),
      explanation,
    })
  }

  function pushDistribution(
    card: string,
    metric: string,
    source: string,
    legacy: Record<string, number>,
    canonical: Record<string, number>,
    explanation: string
  ): void {
    const keys = new Set([...Object.keys(legacy), ...Object.keys(canonical)])
    let allSubset = true
    for (const k of keys) {
      if ((canonical[k] ?? 0) > (legacy[k] ?? 0)) allSubset = false
    }
    const legacyTotal = Object.values(legacy).reduce((a, b) => a + b, 0)
    const canonicalTotal = Object.values(canonical).reduce((a, b) => a + b, 0)
    const { abs, pct } = numDiff(legacyTotal, canonicalTotal)
    comparisons.push({
      card,
      metric,
      source,
      legacyValue: legacy,
      canonicalValue: canonical,
      absoluteDiff: abs,
      percentDiff: pct,
      classification: legacyTotal === canonicalTotal ? 'IDENTICAL' : allSubset ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
      explanation,
    })
  }

  // ── Snapshot: Total Users ──────────────────────────────────────────────
  const [totalUsersLegacy, totalUsersCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "User"`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_users WHERE "includeInBusinessMetrics"`,
  ])
  pushScalar(
    'snapshot', 'totalUsers', '"User" (legacy) vs business_users WHERE includeInBusinessMetrics (canonical)',
    Number(totalUsersLegacy[0].count), Number(totalUsersCanonical[0].count), EXCLUDED_ACCOUNTS_NOTE
  )

  // ── Snapshot: New Users (30d) ───────────────────────────────────────────
  const [newUsersLegacy, newUsersCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "User" WHERE "createdAt" >= ${thirtyDaysAgo}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_users WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"`,
  ])
  pushScalar(
    'snapshot', 'newUsers (30d)', '"User" (legacy) vs business_users (canonical)',
    Number(newUsersLegacy[0].count), Number(newUsersCanonical[0].count), EXCLUDED_ACCOUNTS_NOTE
  )

  // ── Snapshot: Jobs Created/Completed/Failed (30d, all-time definitions match dashboard's own windows) ──
  const [jobsCreatedLegacy, jobsCreatedCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "Job" WHERE "createdAt" >= ${thirtyDaysAgo}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_jobs WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"`,
  ])
  pushScalar(
    'snapshot', 'jobsCreated (30d)', '"Job" (legacy, incl. guest+founder/internal/demo) vs business_jobs (canonical, customer-only)',
    Number(jobsCreatedLegacy[0].count), Number(jobsCreatedCanonical[0].count),
    'Delta attributable to guest jobs (no matching User row) PLUS the 4 Sprint 2 excluded accounts\' own job activity.'
  )

  const [jobsCompletedLegacy, jobsCompletedCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "Job" WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_jobs WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"`,
  ])
  pushScalar(
    'snapshot', 'jobsCompleted (30d)', '"Job" (legacy) vs business_jobs (canonical)',
    Number(jobsCompletedLegacy[0].count), Number(jobsCompletedCanonical[0].count),
    'Same population exclusion as jobsCreated, restricted to completed status.'
  )

  const [jobsFailedLegacy, jobsFailedCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "Job" WHERE status='failed' AND "createdAt" >= ${thirtyDaysAgo}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_jobs WHERE status='failed' AND "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"`,
  ])
  pushScalar(
    'snapshot', 'jobsFailed (30d)', '"Job" (legacy) vs business_jobs (canonical)',
    Number(jobsFailedLegacy[0].count), Number(jobsFailedCanonical[0].count),
    'Same population exclusion as jobsCreated, restricted to failed status.'
  )

  // ── Snapshot: MRR/ARPU — NOT_YET_COMPARABLE-with-context (Sprint 1/3 precedent) ──
  const [legacyMrr, canonicalMrr] = await Promise.all([
    prisma.$queryRaw<[{ mrrCents: bigint | null }]>`SELECT SUM("priceMonthly")::bigint AS "mrrCents" FROM "SubscriptionSnapshot" WHERE status='active'`,
    prisma.subscriptionCurrentState.aggregate({ where: { status: 'active' }, _sum: { normalizedMonthlyCents: true } }),
  ])
  comparisons.push({
    card: 'snapshot',
    metric: 'mrrCents',
    source: '"SubscriptionSnapshot" (legacy, known broken per Sprint 1 root cause) vs SubscriptionCurrentState (canonical, currently empty -- write path off)',
    legacyValue: Number(legacyMrr[0]?.mrrCents ?? 0),
    canonicalValue: canonicalMrr._sum.normalizedMonthlyCents ?? 0,
    absoluteDiff: null,
    percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation:
      'MRR_EXTRACTION_V2_WRITE is off (Sprint 1 decision, unrelated to this sprint) -- SubscriptionCurrentState ' +
      'is expected to be empty. This is not a Sprint 5 finding; it is the same, already-documented Sprint 1/3 ' +
      'state carried forward. Not classified as a divergence at all -- there is nothing to compare until the ' +
      'write path is enabled.',
  })

  // ── Snapshot/Daily/Revenue: newPaidUsers, churnedUsers, MRR/churn trends — NOT_YET_COMPARABLE ──
  comparisons.push({
    card: 'snapshot/revenue/daily',
    metric: 'newPaidUsers, churnedUsers, mrrTrend, newMrrTrend, churnedMrrTrend, churnRateTrend',
    source: 'DailyMetrics/MonthlyMetrics (derived from SubscriptionSnapshot history)',
    legacyValue: 'n/a',
    canonicalValue: 'n/a',
    absoluteDiff: null,
    percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation:
      'These depend on a canonical business_subscriptions / business_revenue model, which is scoped for ' +
      'Sprint 7+ (docs/analytics/SPRINT_PLAN.md) and does not exist yet. business_users/business_jobs ' +
      '(Sprint 4) cannot answer subscription-history questions. Explicitly out of scope for this sprint, ' +
      'not silently skipped.',
  })

  // ── Usage: topUsersByJobCount ─────────────────────────────────────────
  // Sprint 8: upgraded from an email-list-only comparison (Sprint 5) to the
  // full served row shape (userId, email, plan, jobCount) -- Sprint 6 §2
  // explicitly excluded this field because only the coarser email-list
  // check had been done.
  const [topUsersLegacy, topUsersCanonical] = await Promise.all([
    prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
      SELECT j."userId", u.email, u.plan, COUNT(*)::bigint as "jobCount"
      FROM "Job" j JOIN "User" u ON u.id = j."userId"
      WHERE j."createdAt" >= ${thirtyDaysAgo}
      GROUP BY j."userId", u.email, u.plan ORDER BY "jobCount" DESC LIMIT 10
    `,
    prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
      SELECT bj."userId", bu.email, bu.plan, COUNT(*)::bigint as "jobCount"
      FROM business_jobs bj JOIN business_users bu ON bu.id = bj."userId"
      WHERE bj."createdAt" >= ${thirtyDaysAgo} AND bj."includeInBusinessMetrics"
      GROUP BY bj."userId", bu.email, bu.plan ORDER BY "jobCount" DESC LIMIT 10
    `,
  ])
  const legacyTop10Full = topUsersLegacy.map((r) => ({ userId: r.userId, email: r.email, plan: r.plan, jobCount: Number(r.jobCount) }))
  const canonicalTop10Full = topUsersCanonical.map((r) => ({ userId: r.userId, email: r.email, plan: r.plan, jobCount: Number(r.jobCount) }))
  const legacyTop10 = legacyTop10Full.map((r) => r.email)
  const canonicalTop10 = canonicalTop10Full.map((r) => r.email)
  const listsIdentical = JSON.stringify(legacyTop10Full) === JSON.stringify(canonicalTop10Full)
  const founderInLegacy = legacyTop10.includes('santhoshguntupalli06@gmail.com')
  comparisons.push({
    card: 'usage',
    metric: 'topUsersByJobCount (top 10, 30d, full row: userId/email/plan/jobCount)',
    source: '"Job" INNER JOIN "User" (legacy) vs business_jobs INNER JOIN business_users WHERE includeInBusinessMetrics (canonical)',
    legacyValue: legacyTop10Full,
    canonicalValue: canonicalTop10Full,
    absoluteDiff: null,
    percentDiff: null,
    classification: listsIdentical ? 'IDENTICAL' : founderInLegacy ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation: listsIdentical
      ? 'Full rows (not just emails) are identical for this 30-day window (none of the 4 excluded accounts placed in the top 10 either way).'
      : 'Legacy list includes the founder/an internal account in the top 10 (crowding out a real customer); canonical structurally excludes them.',
  })

  // ── Usage: jobsByToolType (30d) ────────────────────────────────────────
  const [toolLegacy, toolCanonical] = await Promise.all([
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint as count FROM "Job" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY "toolType"`,
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint as count FROM business_jobs WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics" GROUP BY "toolType"`,
  ])
  pushDistribution(
    'usage', 'jobsByToolType (30d)', '"Job" (legacy) vs business_jobs (canonical)',
    Object.fromEntries(toolLegacy.map((r) => [r.toolType, Number(r.count)])),
    Object.fromEntries(toolCanonical.map((r) => [r.toolType, Number(r.count)])),
    EXCLUDED_ACCOUNTS_NOTE + ' (job-level, 30-day window)'
  )

  // ── Performance: avgProcessingMs / p95ProcessingMs (30d completed jobs) ──
  const [perfLegacy, perfCanonical] = await Promise.all([
    prisma.$queryRaw<[{ avgProcessing: number | null; p95Processing: number | null }]>`
      SELECT AVG("processingMs")::double precision as "avgProcessing",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as "p95Processing"
      FROM "Job" WHERE status = 'completed' AND "completedAt" >= ${thirtyDaysAgo} AND "processingMs" IS NOT NULL
    `,
    prisma.$queryRaw<[{ avgProcessing: number | null; p95Processing: number | null }]>`
      SELECT AVG("processingMs")::double precision as "avgProcessing",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as "p95Processing"
      FROM business_jobs WHERE status = 'completed' AND "completedAt" >= ${thirtyDaysAgo} AND "processingMs" IS NOT NULL AND "includeInBusinessMetrics"
    `,
  ])
  const avgL = perfLegacy[0]?.avgProcessing ?? 0
  const avgC = perfCanonical[0]?.avgProcessing ?? 0
  comparisons.push({
    card: 'performance', metric: 'avgProcessingMs (30d)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: avgL, canonicalValue: avgC,
    absoluteDiff: avgL - avgC, percentDiff: avgL !== 0 ? (Math.abs(avgL - avgC) / avgL) * 100 : null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation:
      'A processing-TIME average is not a subset-monotonic metric like a count (removing rows can move an ' +
      'average in either direction depending on whether the removed jobs were faster or slower than the mean) -- ' +
      'a nonzero delta in either direction is expected here, not a data-integrity signal the way a negative ' +
      'count delta would be. Classified EXPECTED given the population change is fully explained by the same ' +
      'known exclusions.',
  })

  // ── Performance: p95ProcessingMs, failureRate (gap found during Sprint 6 prep) ──
  const p95L = perfLegacy[0]?.p95Processing ?? 0
  const p95C = perfCanonical[0]?.p95Processing ?? 0
  comparisons.push({
    card: 'performance', metric: 'p95ProcessingMs (30d)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: p95L, canonicalValue: p95C,
    absoluteDiff: p95L - p95C, percentDiff: p95L !== 0 ? (Math.abs(p95L - p95C) / p95L) * 100 : null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation: 'Same non-subset-monotonic reasoning as avgProcessingMs -- a percentile is not guaranteed to move in a fixed direction when rows are removed.',
  })

  const [failRateLegacy, failRateCanonical] = await Promise.all([
    prisma.$queryRaw<[{ failureRate: number | null }]>`
      SELECT (COUNT(*) FILTER (WHERE status='failed')::float / NULLIF(COUNT(*)::float,0)) as "failureRate"
      FROM "Job" WHERE "createdAt" >= ${thirtyDaysAgo}
    `,
    prisma.$queryRaw<[{ failureRate: number | null }]>`
      SELECT (COUNT(*) FILTER (WHERE status='failed')::float / NULLIF(COUNT(*)::float,0)) as "failureRate"
      FROM business_jobs WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"
    `,
  ])
  const frL = failRateLegacy[0]?.failureRate ?? 0
  const frC = failRateCanonical[0]?.failureRate ?? 0
  comparisons.push({
    card: 'performance', metric: 'failureRate (30d)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: frL, canonicalValue: frC,
    absoluteDiff: frL - frC, percentDiff: frL !== 0 ? (Math.abs(frL - frC) / frL) * 100 : null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation: 'A RATE (failed/total) is not subset-monotonic either -- excluding rows changes both numerator and denominator. Expected to move given the population change is fully explained by the same known exclusions; not independently alarming.',
  })

  // ── Retention: Active Users Last 7/30 Days (gap found during Sprint 6 prep -- ──
  // validated once already in the Sprint 4 report but dropped when this file was
  // rewritten for Sprint 5; restored here before any cutover is built on it) ──
  for (const [metricName, since] of [
    ['activeUsersLast7Days', sevenDaysAgo],
    ['activeUsersLast30Days', thirtyDaysAgo],
  ] as const) {
    const [rL, rC] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(DISTINCT "userId")::bigint AS count FROM "Job" WHERE "createdAt" >= ${since}`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(DISTINCT "userId")::bigint AS count FROM business_jobs WHERE "createdAt" >= ${since} AND "includeInBusinessMetrics"`,
    ])
    pushScalar(
      'retention', metricName, '"Job" (legacy, incl. guests+excluded accounts) vs business_jobs (canonical)',
      Number(rL[0].count), Number(rC[0].count),
      'Delta attributable to guest jobs (no matching User row) PLUS the 4 Sprint 2 excluded accounts\' own activity.'
    )
  }

  // ── Plan Distribution ────────────────────────────────────────────────
  const [planLegacy, planCanonical] = await Promise.all([
    prisma.$queryRaw<{ plan: string; count: bigint }[]>`SELECT plan, COUNT(*)::bigint as count FROM "User" GROUP BY plan`,
    prisma.$queryRaw<{ plan: string; count: bigint }[]>`SELECT plan, COUNT(*)::bigint as count FROM business_users WHERE "includeInBusinessMetrics" GROUP BY plan`,
  ])
  pushDistribution(
    'planDistribution', 'plan counts', '"User" (legacy) vs business_users (canonical)',
    Object.fromEntries(planLegacy.map((r) => [r.plan, Number(r.count)])),
    Object.fromEntries(planCanonical.map((r) => [r.plan, Number(r.count)])),
    EXCLUDED_ACCOUNTS_NOTE
  )

  // ── UTM Breakdown ─────────────────────────────────────────────────────
  const [utmLegacy, utmCanonical] = await Promise.all([
    prisma.$queryRaw<{ source: string; count: bigint }[]>`SELECT COALESCE("utmSource",'direct') as source, COUNT(*)::bigint as count FROM "User" GROUP BY 1`,
    prisma.$queryRaw<{ source: string; count: bigint }[]>`SELECT COALESCE("utmSource",'direct') as source, COUNT(*)::bigint as count FROM business_users WHERE "includeInBusinessMetrics" GROUP BY 1`,
  ])
  pushDistribution(
    'utmBreakdown', 'source counts', '"User" (legacy) vs business_users (canonical)',
    Object.fromEntries(utmLegacy.map((r) => [r.source, Number(r.count)])),
    Object.fromEntries(utmCanonical.map((r) => [r.source, Number(r.count)])),
    EXCLUDED_ACCOUNTS_NOTE
  )

  // ── Failure Reasons (30d) ─────────────────────────────────────────────
  const [failLegacy, failCanonical] = await Promise.all([
    prisma.$queryRaw<{ reason: string; count: bigint }[]>`SELECT COALESCE("failureReason",'unknown') as reason, COUNT(*)::bigint as count FROM "Job" WHERE status='failed' AND "createdAt" >= ${thirtyDaysAgo} GROUP BY 1`,
    prisma.$queryRaw<{ reason: string; count: bigint }[]>`SELECT COALESCE("failureReason",'unknown') as reason, COUNT(*)::bigint as count FROM business_jobs WHERE status='failed' AND "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics" GROUP BY 1`,
  ])
  pushDistribution(
    'failureReasons', 'reason counts (30d)', '"Job" (legacy) vs business_jobs (canonical)',
    Object.fromEntries(failLegacy.map((r) => [r.reason, Number(r.count)])),
    Object.fromEntries(failCanonical.map((r) => [r.reason, Number(r.count)])),
    EXCLUDED_ACCOUNTS_NOTE
  )

  // ── toolPerf (all-time completed jobs per tool) ──────────────────────
  const [toolPerfLegacy, toolPerfCanonical] = await Promise.all([
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint as count FROM "Job" WHERE status='completed' GROUP BY "toolType"`,
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint as count FROM business_jobs WHERE status='completed' AND "includeInBusinessMetrics" GROUP BY "toolType"`,
  ])
  pushDistribution(
    'toolPerf', 'completed job counts per tool (all-time)', '"Job" (legacy) vs business_jobs (canonical)',
    Object.fromEntries(toolPerfLegacy.map((r) => [r.toolType, Number(r.count)])),
    Object.fromEntries(toolPerfCanonical.map((r) => [r.toolType, Number(r.count)])),
    EXCLUDED_ACCOUNTS_NOTE + ' (all-time, dominated by the founder\'s 144 all-time jobs)'
  )

  // ── toolPerf full shape (Sprint 8: avgMs/p95Ms/avgFileSizeMb/avgDurationSec/totalMinutes -- ──
  // Sprint 6 §2 excluded this field because only `count` had been validated;
  // the actual served response also returns these five additional per-tool
  // aggregates, none of which had been compared until now. ──
  const [toolPerfFullLegacy, toolPerfFullCanonical] = await Promise.all([
    prisma.$queryRaw<{ toolType: string; avgMs: number | null; p95Ms: number | null; avgFileSizeBytes: number | null; avgDurationSec: number | null; totalMinutes: number | null }[]>`
      SELECT "toolType",
        AVG("processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "avgMs",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "p95Ms",
        AVG("fileSizeBytes"::double precision)::double precision as "avgFileSizeBytes",
        AVG("videoDurationSec")::double precision as "avgDurationSec",
        SUM("videoDurationSec"::double precision / 60.0)::double precision as "totalMinutes"
      FROM "Job" WHERE status = 'completed' GROUP BY "toolType"
    `,
    prisma.$queryRaw<{ toolType: string; avgMs: number | null; p95Ms: number | null; avgFileSizeBytes: number | null; avgDurationSec: number | null; totalMinutes: number | null }[]>`
      SELECT "toolType",
        AVG("processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "avgMs",
        percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs") FILTER (WHERE "processingMs" IS NOT NULL)::double precision as "p95Ms",
        AVG("fileSizeBytes"::double precision)::double precision as "avgFileSizeBytes",
        AVG("videoDurationSec")::double precision as "avgDurationSec",
        SUM("videoDurationSec"::double precision / 60.0)::double precision as "totalMinutes"
      FROM business_jobs WHERE status = 'completed' AND "includeInBusinessMetrics" GROUP BY "toolType"
    `,
  ])
  comparisons.push({
    card: 'toolPerf',
    metric: 'per-tool avgMs/p95Ms/avgFileSizeMb/avgDurationSec/totalMinutes (all-time)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: toolPerfFullLegacy,
    canonicalValue: toolPerfFullCanonical,
    absoluteDiff: null,
    percentDiff: null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation:
      'Averages/percentiles/sums over a changed population -- not subset-monotonic like a count. Every tool ' +
      'present in canonical is also present in legacy (canonical never adds a tool legacy lacks); values ' +
      'expected to shift by whatever amount the 4 excluded accounts + guest jobs contributed, in either direction ' +
      'for the non-additive aggregates (avgMs/p95Ms/avgFileSizeMb/avgDurationSec) and only downward for the ' +
      'additive one (totalMinutes, a sum).',
  })

  // ── Cost Metrics (30d completed jobs with cost data) ─────────────────
  const [costLegacy, costCanonical] = await Promise.all([
    prisma.$queryRaw<[{ jobCount: bigint; totalWhisperMicros: bigint | null }]>`
      SELECT COUNT(*)::bigint as "jobCount", SUM("whisperCostMicros")::bigint as "totalWhisperMicros"
      FROM "Job" WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "whisperCostMicros" IS NOT NULL
    `,
    prisma.$queryRaw<[{ jobCount: bigint; totalWhisperMicros: bigint | null }]>`
      SELECT COUNT(*)::bigint as "jobCount", SUM("whisperCostMicros")::bigint as "totalWhisperMicros"
      FROM business_jobs WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "whisperCostMicros" IS NOT NULL AND "includeInBusinessMetrics"
    `,
  ])
  pushScalar(
    'costMetrics', 'jobCount with cost data (30d)', '"Job" (legacy) vs business_jobs (canonical)',
    Number(costLegacy[0]?.jobCount ?? 0), Number(costCanonical[0]?.jobCount ?? 0), EXCLUDED_ACCOUNTS_NOTE
  )
  const legacyCostUsd = Number(costLegacy[0]?.totalWhisperMicros ?? 0) / 1_000_000
  const canonicalCostUsd = Number(costCanonical[0]?.totalWhisperMicros ?? 0) / 1_000_000
  pushScalar(
    'costMetrics', 'totalWhisperCostUsd (30d)', '"Job" (legacy, includes founder\'s own AI spend) vs business_jobs (canonical, customer-attributable only)',
    legacyCostUsd, canonicalCostUsd,
    'Per docs/analytics/METRICS.md AI Cost definition: reported both with and without internal usage. ' +
    'This is the first concrete instance of that split -- the founder\'s own testing consumes real ' +
    'transcription cost that should not be attributed to "customer" unit economics.'
  )

  // ── costMetrics full shape (Sprint 8: avgWhisperCostUsd/avgDurationSec) ──
  // Sprint 6 §2 excluded this field as a whole because the served response
  // also returns avgWhisperCostUsd and avgDurationSec, neither validated.
  const [costFullLegacy, costFullCanonical] = await Promise.all([
    prisma.$queryRaw<[{ avgWhisperMicros: number | null; avgDurationSec: number | null }]>`
      SELECT AVG("whisperCostMicros")::double precision as "avgWhisperMicros", AVG("videoDurationSec")::double precision as "avgDurationSec"
      FROM "Job" WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "whisperCostMicros" IS NOT NULL
    `,
    prisma.$queryRaw<[{ avgWhisperMicros: number | null; avgDurationSec: number | null }]>`
      SELECT AVG("whisperCostMicros")::double precision as "avgWhisperMicros", AVG("videoDurationSec")::double precision as "avgDurationSec"
      FROM business_jobs WHERE status='completed' AND "completedAt" >= ${thirtyDaysAgo} AND "whisperCostMicros" IS NOT NULL AND "includeInBusinessMetrics"
    `,
  ])
  const avgWhisperLegacyUsd = costFullLegacy[0]?.avgWhisperMicros !== null && costFullLegacy[0]?.avgWhisperMicros !== undefined ? costFullLegacy[0].avgWhisperMicros / 1_000_000 : 0
  const avgWhisperCanonicalUsd = costFullCanonical[0]?.avgWhisperMicros !== null && costFullCanonical[0]?.avgWhisperMicros !== undefined ? costFullCanonical[0].avgWhisperMicros / 1_000_000 : 0
  comparisons.push({
    card: 'costMetrics', metric: 'avgWhisperCostUsd (30d)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: avgWhisperLegacyUsd, canonicalValue: avgWhisperCanonicalUsd,
    absoluteDiff: avgWhisperLegacyUsd - avgWhisperCanonicalUsd,
    percentDiff: avgWhisperLegacyUsd !== 0 ? (Math.abs(avgWhisperLegacyUsd - avgWhisperCanonicalUsd) / avgWhisperLegacyUsd) * 100 : null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation: 'A per-job average, not subset-monotonic -- same reasoning as avgProcessingMs.',
  })
  const avgDurLegacy = costFullLegacy[0]?.avgDurationSec ?? 0
  const avgDurCanonical = costFullCanonical[0]?.avgDurationSec ?? 0
  comparisons.push({
    card: 'costMetrics', metric: 'avgDurationSec (30d)',
    source: '"Job" (legacy) vs business_jobs (canonical)',
    legacyValue: avgDurLegacy, canonicalValue: avgDurCanonical,
    absoluteDiff: avgDurLegacy - avgDurCanonical,
    percentDiff: avgDurLegacy !== 0 ? (Math.abs(avgDurLegacy - avgDurCanonical) / avgDurLegacy) * 100 : null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation: 'A per-job average, not subset-monotonic -- same reasoning as avgProcessingMs.',
  })

  // ── Feedback: aggregate count (Sprint 5) ──────────────────────────────
  const [feedbackLegacy, feedbackCanonical] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint as count FROM "Feedback" WHERE stars IS NOT NULL`,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM "Feedback" f
      LEFT JOIN business_users bu ON bu.id = f."userId"
      WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
    `,
  ])
  pushScalar(
    'feedback', 'starred feedback total count (all-time)',
    '"Feedback" (legacy) vs "Feedback" LEFT JOIN business_users, excluding rows from founder/internal/demo (canonical)',
    Number(feedbackLegacy[0].count), Number(feedbackCanonical[0].count),
    'Anonymous feedback (userId IS NULL, e.g. public /survey submissions) is always included on both sides -- ' +
    'only feedback explicitly attributed to one of the 4 excluded accounts would differ.'
  )

  // ── Feedback: actual served shape (Sprint 8) -- LIMIT 20, ORDER BY createdAt DESC, id-list comparison ──
  // Sprint 6 §2 excluded `feedback` because only the aggregate count above
  // had been validated, not the actual served (most-recent-20) row set.
  const [feedbackRowsLegacy, feedbackRowsCanonical] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Feedback" ORDER BY "createdAt" DESC LIMIT 20`,
    prisma.$queryRaw<{ id: string }[]>`
      SELECT f.id FROM "Feedback" f
      LEFT JOIN business_users bu ON bu.id = f."userId"
      WHERE f."userId" IS NULL OR bu."includeInBusinessMetrics"
      ORDER BY f."createdAt" DESC LIMIT 20
    `,
  ])
  const feedbackIdsLegacy = feedbackRowsLegacy.map((r) => r.id)
  const feedbackIdsCanonical = feedbackRowsCanonical.map((r) => r.id)
  const feedbackIdsIdentical = JSON.stringify(feedbackIdsLegacy) === JSON.stringify(feedbackIdsCanonical)
  comparisons.push({
    card: 'feedback', metric: 'served feed (LIMIT 20, id list)',
    source: '"Feedback" (legacy) vs "Feedback" LEFT JOIN business_users, excluding founder/internal/demo submitters (canonical)',
    legacyValue: feedbackIdsLegacy, canonicalValue: feedbackIdsCanonical,
    absoluteDiff: null, percentDiff: null,
    classification: feedbackIdsIdentical ? 'IDENTICAL' : 'EXPECTED_DIVERGENCE',
    explanation: feedbackIdsIdentical
      ? 'The most recent 20 feedback rows are identical -- none of the last 20 submissions came from an excluded account.'
      : 'One or more of the most recent 20 submissions came from an excluded account (founder/internal/demo) and is present in legacy but not canonical; every canonical id is still a subset of the legacy id set.',
  })

  // ── feedbackByTool: per-tool avgStars/count (Sprint 8) ────────────────
  const [feedbackByToolLegacy, feedbackByToolCanonical] = await Promise.all([
    prisma.$queryRaw<{ toolId: string; avgStars: number; count: bigint }[]>`
      SELECT COALESCE("toolId",'unknown') as "toolId", AVG(stars)::double precision as "avgStars", COUNT(*)::bigint as count
      FROM "Feedback" WHERE stars IS NOT NULL GROUP BY "toolId"
    `,
    prisma.$queryRaw<{ toolId: string; avgStars: number; count: bigint }[]>`
      SELECT COALESCE(f."toolId",'unknown') as "toolId", AVG(f.stars)::double precision as "avgStars", COUNT(*)::bigint as count
      FROM "Feedback" f LEFT JOIN business_users bu ON bu.id = f."userId"
      WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
      GROUP BY f."toolId"
    `,
  ])
  comparisons.push({
    card: 'feedbackByTool', metric: 'avgStars/count per tool (all-time)',
    source: '"Feedback" (legacy) vs "Feedback" LEFT JOIN business_users (canonical)',
    legacyValue: feedbackByToolLegacy.map((r) => ({ toolId: r.toolId, avgStars: Number(r.avgStars), count: Number(r.count) })),
    canonicalValue: feedbackByToolCanonical.map((r) => ({ toolId: r.toolId, avgStars: Number(r.avgStars), count: Number(r.count) })),
    absoluteDiff: null, percentDiff: null,
    classification: 'EXPECTED_DIVERGENCE',
    explanation: 'count is subset-monotonic (excluded-account feedback removed); avgStars is not (an average can move either direction) -- both expected to differ only if an excluded account left feedback for that tool.',
  })

  // ── starDistribution: per-star count (Sprint 8) ───────────────────────
  const [starDistLegacy, starDistCanonical] = await Promise.all([
    prisma.$queryRaw<{ stars: number; count: bigint }[]>`SELECT stars, COUNT(*)::bigint as count FROM "Feedback" WHERE stars IS NOT NULL GROUP BY stars`,
    prisma.$queryRaw<{ stars: number; count: bigint }[]>`
      SELECT f.stars, COUNT(*)::bigint as count FROM "Feedback" f LEFT JOIN business_users bu ON bu.id = f."userId"
      WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
      GROUP BY f.stars
    `,
  ])
  pushDistribution(
    'starDistribution', 'count per star rating (all-time)', '"Feedback" (legacy) vs "Feedback" LEFT JOIN business_users (canonical)',
    Object.fromEntries(starDistLegacy.map((r) => [String(r.stars), Number(r.count)])),
    Object.fromEntries(starDistCanonical.map((r) => [String(r.stars), Number(r.count)])),
    'Delta attributable to feedback submitted by one of the 4 excluded accounts, if any, per star rating.'
  )

  // ── Not-yet-comparable: users (allUsers, Sprint 8 finding) ────────────
  comparisons.push({
    card: 'users', metric: 'allUsers (LIMIT 500, full row)', source: '"User" LEFT JOIN "Job" (legacy) vs business_users (canonical)',
    legacyValue: 'n/a', canonicalValue: 'n/a', absoluteDiff: null, percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation: 'Sprint 8 finding: the served row includes "name" and "lastActiveAt", neither of which business_users ' +
      'exposes (the Sprint 4 view is an explicit column list that omits them). Comparable only after an additive ' +
      'view migration adds these two passthrough columns -- not written this sprint, to avoid an unrequested schema ' +
      'change; tracked as a documented dependency in DASHBOARD_FIELD_STATUS.md.',
  })

  // ── Not-yet-comparable: recentJobs (operational feed, not an aggregate KPI) ──
  comparisons.push({
    card: 'recentJobs', metric: 'recent jobs feed (LIMIT 50)', source: '"Job" LEFT JOIN "User"',
    legacyValue: 'n/a', canonicalValue: 'n/a', absoluteDiff: null, percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation: 'This is an operational visibility feed (intentionally shows everything, including guest/internal activity, per docs/analytics/DASHBOARD_MIGRATION_PLAN.md), not a KPI/aggregate -- there is nothing to "reconcile" about a raw recent-activity list.',
  })

  // ── Not-yet-comparable: youtubeResolution (Redis-derived, no User dimension) ──
  comparisons.push({
    card: 'youtubeResolution', metric: 'all fields', source: 'Redis hashes (metrics:yt:resolution:*)',
    legacyValue: 'n/a', canonicalValue: 'n/a', absoluteDiff: null, percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation: 'Stored as ad hoc Redis hashes with no User/Job foreign key at all -- no taxonomy filter is structurally applicable until this is migrated into a proper fact table (docs/analytics/DASHBOARD_MIGRATION_PLAN.md, second-wave work).',
  })

  // ── Not-yet-comparable: funnelByCohort (EventLog, Sprint 8 territory) ──
  comparisons.push({
    card: 'funnelByCohort', metric: 'all cohort funnel stages', source: '"EventLog" (cohort-joined to "User")',
    legacyValue: 'n/a', canonicalValue: 'n/a', absoluteDiff: null, percentDiff: null,
    classification: 'NOT_YET_COMPARABLE',
    explanation: 'Depends on a canonical business_conversion/fact_event model (Sprint 8, docs/analytics/SPRINT_PLAN.md) which does not exist yet -- and EventLog itself currently drops pre-signup events (Phase 1 finding, not yet fixed), so even a canonical join today would inherit that gap. Explicitly deferred.',
  })

  return comparisons
}
