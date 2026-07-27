/**
 * Analytics Sprint 7 — canonical rollup field computation.
 *
 * Read-only mirror of recomputeMetrics.ts's legacy day/month queries, but
 * sourced from the Sprint 4 canonical views (business_users/business_jobs,
 * filtered by "includeInBusinessMetrics") instead of raw "User"/"Job".
 * Same date-boundary semantics as the legacy functions, field for field, so
 * the only difference between a legacy and canonical result for the same
 * window is the population filter -- not the window itself.
 *
 * Deliberately excludes every MRR/subscription-derived field
 * (mrrCents, churnedUsers, newPaidUsers, newMrrCents, churnedMrrCents,
 * churnRatePercent) -- there is no canonical business_subscriptions model
 * yet (second-wave work, DATABASE_MIGRATION_PLAN.md Part 6), so those
 * fields have nothing to redirect to. recomputeMetrics.ts continues to
 * compute them from SubscriptionSnapshot unconditionally, regardless of
 * ROLLUP_CANONICAL_SOURCE.
 *
 * No writes anywhere in this file -- every export is a pure read returning
 * plain numbers, safe to call at any time without side effects.
 */

import { prisma } from '../db'

function scalarInt(row: { count?: bigint | number } | null | undefined): number {
  if (!row) return 0
  const v = row.count
  if (v === null || v === undefined) return 0
  return typeof v === 'bigint' ? Number(v) : Math.round(Number(v))
}

export interface CanonicalDayFields {
  totalUsers: number
  newUsers: number
  activeUsers: number
  jobsCreated: number
  jobsCompleted: number
  jobsFailed: number
  avgProcessingMs: number | null
  p95ProcessingMs: number | null
}

export async function computeCanonicalDayFields(dayStart: Date, dayEnd: Date): Promise<CanonicalDayFields> {
  const [totalUsersRow, newUsersRow, activeUsersRow, jobsCreatedRow, jobsCompletedRow, jobsFailedRow] =
    await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM business_users
        WHERE "createdAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM business_users
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT "userId")::bigint as count FROM business_jobs
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM business_jobs
        WHERE "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM business_jobs
        WHERE status = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM business_jobs
        WHERE status = 'failed' AND "createdAt" >= ${dayStart} AND "createdAt" < ${dayEnd} AND "includeInBusinessMetrics"
      `,
    ])

  const [avgRow, p95Row] = await Promise.all([
    prisma.$queryRaw<[{ avg: number | null }]>`
      SELECT AVG("processingMs")::double precision as avg FROM business_jobs
      WHERE status = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd}
        AND "processingMs" IS NOT NULL AND "includeInBusinessMetrics"
    `,
    prisma.$queryRaw<[{ p95: number | null }]>`
      SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY "processingMs")::double precision as p95
      FROM business_jobs
      WHERE status = 'completed' AND "completedAt" >= ${dayStart} AND "completedAt" < ${dayEnd}
        AND "processingMs" IS NOT NULL AND "includeInBusinessMetrics"
    `,
  ])

  return {
    totalUsers: scalarInt(totalUsersRow?.[0]),
    newUsers: scalarInt(newUsersRow?.[0]),
    activeUsers: scalarInt(activeUsersRow?.[0]),
    jobsCreated: scalarInt(jobsCreatedRow?.[0]),
    jobsCompleted: scalarInt(jobsCompletedRow?.[0]),
    jobsFailed: scalarInt(jobsFailedRow?.[0]),
    avgProcessingMs: avgRow?.[0]?.avg !== null && avgRow?.[0]?.avg !== undefined ? Math.round(avgRow[0].avg) : null,
    p95ProcessingMs: p95Row?.[0]?.p95 !== null && p95Row?.[0]?.p95 !== undefined ? Math.round(p95Row[0].p95) : null,
  }
}

export interface CanonicalMonthFields {
  totalUsers: number
  newUsers: number
  activeUsers: number
}

export async function computeCanonicalMonthFields(monthStart: Date, monthEnd: Date): Promise<CanonicalMonthFields> {
  const [totalUsersRow, newUsersRow, activeUsersRow] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM business_users
      WHERE "createdAt" < ${monthEnd} AND "includeInBusinessMetrics"
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM business_users
      WHERE "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd} AND "includeInBusinessMetrics"
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count FROM business_jobs
      WHERE "createdAt" >= ${monthStart} AND "createdAt" < ${monthEnd} AND "includeInBusinessMetrics"
    `,
  ])

  return {
    totalUsers: scalarInt(totalUsersRow?.[0]),
    newUsers: scalarInt(newUsersRow?.[0]),
    activeUsers: scalarInt(activeUsersRow?.[0]),
  }
}
