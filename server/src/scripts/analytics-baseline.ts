/**
 * Analytics Sprint 0 — baseline instrumentation (read-only, zero production risk).
 *
 * Measures the actual magnitude of every Phase 1 audit finding directly against
 * the live database, before any fix ships, so every later change has a real
 * "before" number to prove against. Does not write anything. Safe to re-run at
 * any time; intended to be re-run before and after each later sprint's cutover
 * as a before/after comparison, and eventually promoted into the Data Quality
 * Plan's permanent nightly checks (see docs/analytics/DATA_QUALITY_PLAN.md).
 *
 * Usage (from server/):
 *   npx tsx src/scripts/analytics-baseline.ts
 *
 * See docs/analytics/SPRINT_PLAN.md (Sprint 0) and
 * docs/analytics/IMPLEMENTATION_MASTER_PLAN.md (Part 1, issue register) for
 * the design this script implements.
 */

import 'dotenv/config'
import { prisma } from '../db'

interface BaselineReport {
  generatedAt: string
  mrr: {
    activeSnapshotRows: number
    distinctActiveSubscriptionIds: number
    naiveMrrCents: number
    dedupedMrrCents: number | null
    activeRowsWithNullSubscriptionId: number
  }
  demoAccounts: { plan: string; count: number }[]
  userVsGuestActivity: {
    totalRegisteredUsers: number
    distinctJobUserIdsWithNoUserRow: number
  }
  jobsByStatus: { status: string; count: number }[]
  planDistributionRaw: { plan: string; count: number }[]
}

async function computeBaseline(): Promise<BaselineReport> {
  const [activeAgg, dedupRows, demoAccounts, totalUsers, guestJobIds, jobsByStatus, planDist] =
    await Promise.all([
      prisma.$queryRaw<[{ activeSnapshotRows: bigint; distinctActiveSubscriptionIds: bigint; naiveMrrCents: bigint | null; nullSubIdRows: bigint }]>`
        SELECT
          COUNT(*)::bigint AS "activeSnapshotRows",
          COUNT(DISTINCT "stripeSubscriptionId")::bigint AS "distinctActiveSubscriptionIds",
          COALESCE(SUM("priceMonthly"), 0)::bigint AS "naiveMrrCents",
          COUNT(*) FILTER (WHERE "stripeSubscriptionId" IS NULL)::bigint AS "nullSubIdRows"
        FROM "SubscriptionSnapshot"
        WHERE status = 'active'
      `,
      prisma.$queryRaw<{ priceMonthly: number }[]>`
        SELECT t."priceMonthly"
        FROM (
          SELECT DISTINCT ON ("stripeSubscriptionId") "stripeSubscriptionId", "priceMonthly", status
          FROM "SubscriptionSnapshot"
          WHERE "stripeSubscriptionId" IS NOT NULL
          ORDER BY "stripeSubscriptionId", "createdAt" DESC
        ) t
        WHERE t.status = 'active'
      `,
      prisma.$queryRaw<{ plan: string; count: bigint }[]>`
        SELECT plan, COUNT(*)::bigint AS count FROM "User" WHERE email LIKE 'demo-user-%' GROUP BY plan
      `,
      prisma.user.count(),
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT j."userId")::bigint AS count
        FROM "Job" j
        LEFT JOIN "User" u ON u.id = j."userId"
        WHERE u.id IS NULL
      `,
      prisma.$queryRaw<{ status: string; count: bigint }[]>`
        SELECT status, COUNT(*)::bigint AS count FROM "Job" GROUP BY status ORDER BY count DESC
      `,
      prisma.$queryRaw<{ plan: string; count: bigint }[]>`
        SELECT plan, COUNT(*)::bigint AS count FROM "User" GROUP BY plan ORDER BY count DESC
      `,
    ])

  const activeRow = activeAgg[0]
  const dedupedMrrCents = dedupRows.length > 0
    ? dedupRows.reduce((sum, r) => sum + Number(r.priceMonthly), 0)
    : null // null (not 0) when there are zero subscriptions with a resolvable subscription id — distinguishes "no data" from "verified zero"

  return {
    generatedAt: new Date().toISOString(),
    mrr: {
      activeSnapshotRows: Number(activeRow.activeSnapshotRows),
      distinctActiveSubscriptionIds: Number(activeRow.distinctActiveSubscriptionIds),
      naiveMrrCents: Number(activeRow.naiveMrrCents ?? 0),
      dedupedMrrCents,
      activeRowsWithNullSubscriptionId: Number(activeRow.nullSubIdRows),
    },
    demoAccounts: demoAccounts.map((r) => ({ plan: r.plan, count: Number(r.count) })),
    userVsGuestActivity: {
      totalRegisteredUsers: totalUsers,
      distinctJobUserIdsWithNoUserRow: Number(guestJobIds[0]?.count ?? 0),
    },
    jobsByStatus: jobsByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    planDistributionRaw: planDist.map((r) => ({ plan: r.plan, count: Number(r.count) })),
  }
}

async function main(): Promise<void> {
  const report = await computeBaseline()

  console.log('=== Analytics Sprint 0 — Baseline Report ===')
  console.log(JSON.stringify(report, null, 2))

  // Flag the specific conditions the Phase 1/2 plan assumed, so a re-run after
  // a fix ships can be diffed against this same set of flags.
  const flags: string[] = []
  if (report.mrr.activeRowsWithNullSubscriptionId > 0) {
    flags.push(
      `${report.mrr.activeRowsWithNullSubscriptionId} of ${report.mrr.activeSnapshotRows} active SubscriptionSnapshot rows have a NULL stripeSubscriptionId — MRR cannot be attributed to a real subscription for these rows.`
    )
  }
  if (report.mrr.naiveMrrCents === 0 && report.planDistributionRaw.some((p) => p.plan !== 'free' && p.count > 0)) {
    flags.push(
      'naiveMrrCents is 0 while paid-plan Users exist — revenue capture into SubscriptionSnapshot appears to be failing, not merely duplicated. Do NOT ship a dedup-only fix without root-causing this first (see docs/analytics/IMPLEMENTATION_PROGRESS.md).'
    )
  }
  if (report.demoAccounts.some((d) => d.plan !== 'free')) {
    flags.push('Demo account(s) exist on a non-free plan — will inflate plan distribution / paid-conversion metrics until Sprint 2 taxonomy lands.')
  }
  if (report.userVsGuestActivity.distinctJobUserIdsWithNoUserRow > 0) {
    flags.push(
      `${report.userVsGuestActivity.distinctJobUserIdsWithNoUserRow} distinct Job.userId values have no matching User row (guest activity) vs. ${report.userVsGuestActivity.totalRegisteredUsers} registered Users — active-user counts including these are not a subset of total-user counts.`
    )
  }

  if (flags.length > 0) {
    console.log('\n=== Flags for review ===')
    flags.forEach((f) => console.log(`- ${f}`))
  }
}

main()
  .catch((err) => {
    console.error('Baseline script failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
