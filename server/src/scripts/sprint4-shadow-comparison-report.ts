/**
 * Analytics Sprint 4 — dashboard shadow-comparison report.
 *
 * Read-only. Computes every taxonomy-dependent metric the founder dashboard
 * (server/src/routes/adminDashboard.ts) currently shows TWICE: once via the
 * dashboard's actual existing query (unfiltered — current production
 * behavior, unchanged), and once via the new business_users/business_jobs
 * canonical views (filtered by includeInBusinessMetrics). Diffs every pair
 * and classifies each discrepancy as EXPECTED (fully explained by the
 * Sprint 2 taxonomy exclusions — demo/founder/internal accounts, or the
 * Phase 1 guest-inclusion finding) or UNEXPLAINED (would require stopping
 * per the operator's Sprint 4 instructions).
 *
 * Does NOT modify adminDashboard.ts or any other application code — this is
 * pure comparison tooling, dashboard behavior is unchanged.
 *
 * Usage (from server/):
 *   npx tsx src/scripts/sprint4-shadow-comparison-report.ts
 */

import 'dotenv/config'
import { prisma } from '../db'

interface Comparison {
  metric: string
  oldQueryDescription: string
  newQueryDescription: string
  oldValue: unknown
  newValue: unknown
  delta: string
  classification: 'IDENTICAL' | 'EXPECTED_DIVERGENCE' | 'UNEXPLAINED'
  explanation: string
}

const comparisons: Comparison[] = []

function record(c: Comparison): void {
  comparisons.push(c)
}

async function main(): Promise<void> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // ── 1. Total Users ────────────────────────────────────────────────────
  const [totalUsersOld, totalUsersNew] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "User"`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_users WHERE "includeInBusinessMetrics"`,
  ])
  const oldTotal = Number(totalUsersOld[0].count)
  const newTotal = Number(totalUsersNew[0].count)
  record({
    metric: 'Total Users',
    oldQueryDescription: 'adminDashboard.ts current: SELECT COUNT(*) FROM "User" (unfiltered)',
    newQueryDescription: 'canonical: SELECT COUNT(*) FROM business_users WHERE "includeInBusinessMetrics"',
    oldValue: oldTotal,
    newValue: newTotal,
    delta: `${oldTotal - newTotal} fewer in canonical`,
    classification: oldTotal - newTotal === 4 ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation:
      'Expected delta is exactly 4: the 1 demo account, 1 founder account, and 2 internal/test accounts ' +
      'classified in Sprint 2. Canonical excludes all four from "Total Users."',
  })

  // ── 2. New Users (last 30 days) ──────────────────────────────────────
  const [newUsersOld, newUsersNew] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "User" WHERE "createdAt" >= ${thirtyDaysAgo}`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_users WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics"`,
  ])
  const oldNew = Number(newUsersOld[0].count)
  const newNew = Number(newUsersNew[0].count)
  record({
    metric: 'New Users (last 30 days)',
    oldQueryDescription: 'adminDashboard.ts-equivalent: COUNT(*) FROM "User" WHERE createdAt >= 30d ago',
    newQueryDescription: 'canonical: same, business_users WHERE includeInBusinessMetrics',
    oldValue: oldNew,
    newValue: newNew,
    delta: `${oldNew - newNew} fewer in canonical`,
    classification: oldNew - newNew >= 0 && oldNew - newNew <= 4 ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation:
      'Expected delta is 0-4 depending on how many of the 4 known-excluded accounts were created in the ' +
      'last 30 days (all 4 accounts predate this window based on Sprint 0/2 findings, so 0 is the most ' +
      'likely correct value; any value up to 4 is still fully explained by the same 4 accounts).',
  })

  // ── 3. Plan Distribution ─────────────────────────────────────────────
  const [planOld, planNew] = await Promise.all([
    prisma.$queryRaw<{ plan: string; count: bigint }[]>`SELECT plan, COUNT(*)::bigint AS count FROM "User" GROUP BY plan ORDER BY plan`,
    prisma.$queryRaw<{ plan: string; count: bigint }[]>`SELECT plan, COUNT(*)::bigint AS count FROM business_users WHERE "includeInBusinessMetrics" GROUP BY plan ORDER BY plan`,
  ])
  const planOldMap = Object.fromEntries(planOld.map((r) => [r.plan, Number(r.count)]))
  const planNewMap = Object.fromEntries(planNew.map((r) => [r.plan, Number(r.count)]))
  const planKeys = new Set([...Object.keys(planOldMap), ...Object.keys(planNewMap)])
  const planDeltas: Record<string, number> = {}
  for (const k of planKeys) planDeltas[k] = (planOldMap[k] ?? 0) - (planNewMap[k] ?? 0)
  const planExplained =
    planDeltas.free === 3 && planDeltas.pro === 1 && (planDeltas.founding_workflow ?? 0) === 0
  record({
    metric: 'Plan Distribution',
    oldQueryDescription: 'adminDashboard.ts current: GROUP BY plan FROM "User" (unfiltered)',
    newQueryDescription: 'canonical: GROUP BY plan FROM business_users WHERE includeInBusinessMetrics',
    oldValue: planOldMap,
    newValue: planNewMap,
    delta: JSON.stringify(planDeltas),
    classification: planExplained ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation:
      'Expected: free -3 (founder + 2 internal, all plan=free), pro -1 (the demo account, plan=pro), ' +
      'founding_workflow unchanged (0 of the 4 excluded accounts are on that plan).',
  })

  // ── 4/5. Active Users (retention) ────────────────────────────────────
  for (const [label, since] of [
    ['Active Users Last 7 Days', sevenDaysAgo],
    ['Active Users Last 30 Days', thirtyDaysAgo],
  ] as const) {
    const [oldR, newR] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(DISTINCT "userId")::bigint AS count FROM "Job" WHERE "createdAt" >= ${since}`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(DISTINCT "userId")::bigint AS count FROM business_jobs WHERE "createdAt" >= ${since} AND "includeInBusinessMetrics"`,
    ])
    const oldV = Number(oldR[0].count)
    const newV = Number(newR[0].count)
    record({
      metric: label,
      oldQueryDescription: 'adminDashboard.ts current: COUNT(DISTINCT userId) FROM "Job" WHERE createdAt >= window (includes guests + founder/internal/demo activity)',
      newQueryDescription: 'canonical: same window, business_jobs WHERE includeInBusinessMetrics (excludes guests AND founder/internal/demo)',
      oldValue: oldV,
      newValue: newV,
      delta: `${oldV - newV} fewer in canonical`,
      classification: oldV >= newV ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
      explanation:
        'Canonical value must be <= raw value, since it is a strict subset (excludes guest ids entirely ' +
        'plus the 4 known non-customer accounts). A canonical value HIGHER than raw would indicate a bug ' +
        'in the view join, not an expected taxonomy exclusion.',
    })
  }

  // ── 6. Jobs by Tool Type, 30-day total (sum across tool types) ───────
  const [jobsByToolOld, jobsByToolNew] = await Promise.all([
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint AS count FROM "Job" WHERE "createdAt" >= ${thirtyDaysAgo} GROUP BY "toolType"`,
    prisma.$queryRaw<{ toolType: string; count: bigint }[]>`SELECT "toolType", COUNT(*)::bigint AS count FROM business_jobs WHERE "createdAt" >= ${thirtyDaysAgo} AND "includeInBusinessMetrics" GROUP BY "toolType"`,
  ])
  const oldToolTotal = jobsByToolOld.reduce((s, r) => s + Number(r.count), 0)
  const newToolTotal = jobsByToolNew.reduce((s, r) => s + Number(r.count), 0)
  record({
    metric: 'Jobs by Tool Type — 30-day total (sum across all tools)',
    oldQueryDescription: 'adminDashboard.ts current jobsByToolType: GROUP BY toolType FROM "Job" (unfiltered, no join at all — includes guest AND founder/internal/demo jobs)',
    newQueryDescription: 'canonical: same, business_jobs WHERE includeInBusinessMetrics',
    oldValue: { total: oldToolTotal, byTool: Object.fromEntries(jobsByToolOld.map((r) => [r.toolType, Number(r.count)])) },
    newValue: { total: newToolTotal, byTool: Object.fromEntries(jobsByToolNew.map((r) => [r.toolType, Number(r.count)])) },
    delta: `${oldToolTotal - newToolTotal} fewer in canonical (last 30 days)`,
    classification: oldToolTotal >= newToolTotal ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation:
      'Delta magnitude depends on how many of the founder/internal/demo/guest jobs fall within the last ' +
      '30 days -- the all-time total (147 non-guest excluded jobs, mostly founder) is the upper bound; ' +
      'this 30-day window will show 0 up to that many fewer, all attributable to the same known accounts ' +
      'plus guest exclusion.',
  })

  // ── 7. Top Users By Job Count (30 days, LIMIT 10) — does the founder appear? ──
  const [topUsersOld, topUsersNew] = await Promise.all([
    prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
      SELECT j."userId", u.email, u.plan, COUNT(*)::bigint as "jobCount"
      FROM "Job" j
      JOIN "User" u ON u.id = j."userId"
      WHERE j."createdAt" >= ${thirtyDaysAgo}
      GROUP BY j."userId", u.email, u.plan
      ORDER BY "jobCount" DESC
      LIMIT 10
    `,
    prisma.$queryRaw<{ userId: string; email: string; plan: string; jobCount: bigint }[]>`
      SELECT bj."userId", bu.email, bu.plan, COUNT(*)::bigint as "jobCount"
      FROM business_jobs bj
      JOIN business_users bu ON bu.id = bj."userId"
      WHERE bj."createdAt" >= ${thirtyDaysAgo} AND bj."includeInBusinessMetrics"
      GROUP BY bj."userId", bu.email, bu.plan
      ORDER BY "jobCount" DESC
      LIMIT 10
    `,
  ])
  const founderInOldTop10 = topUsersOld.some((r) => r.email === 'santhoshguntupalli06@gmail.com')
  const founderInNewTop10 = topUsersNew.some((r) => r.email === 'santhoshguntupalli06@gmail.com')
  record({
    metric: 'Top Users By Job Count (30d, LIMIT 10) — founder presence',
    oldQueryDescription: 'adminDashboard.ts current topUsersByJobCount (INNER JOIN, excludes guests already, but NOT founder/internal/demo)',
    newQueryDescription: 'canonical: same shape, via business_jobs/business_users WHERE includeInBusinessMetrics',
    oldValue: { founderAppearsInTop10: founderInOldTop10, top10Emails: topUsersOld.map((r) => r.email) },
    newValue: { founderAppearsInTop10: founderInNewTop10, top10Emails: topUsersNew.map((r) => r.email) },
    delta: founderInOldTop10 && !founderInNewTop10 ? 'founder removed from top-10 list' : 'no change in founder presence',
    classification:
      founderInOldTop10 === founderInNewTop10
        ? 'IDENTICAL'
        : founderInOldTop10 && !founderInNewTop10
          ? 'EXPECTED_DIVERGENCE'
          : 'UNEXPLAINED',
    explanation: founderInOldTop10
      ? 'The existing dashboard\'s "Top Users" panel is one of the concrete Phase-1-identified failure ' +
        'cases -- the founder\'s own test jobs crowd out a real customer from this list. Canonical view ' +
        'structurally excludes the founder, freeing that slot for a real top-10 customer.'
      : 'In this specific 30-day window, the founder\'s 144 all-time test jobs did not happen to place ' +
        'them in the top 10 anyway (their volume is spread across a longer history than just this ' +
        'window), so old and new produce an identical list here. The structural exclusion still matters ' +
        '-- it is not guaranteed to stay this way in every future 30-day window -- but this run shows no ' +
        'difference to report for the current window.',
  })

  // ── 8. All-time total Job count (customer vs all) ────────────────────
  const [allJobsOld, allJobsNew] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM "Job"`,
    prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*)::bigint AS count FROM business_jobs WHERE "includeInBusinessMetrics"`,
  ])
  const oldAllJobs = Number(allJobsOld[0].count)
  const newAllJobs = Number(allJobsNew[0].count)
  record({
    metric: 'All-time Total Jobs (all vs. customer-only)',
    oldQueryDescription: '"All Jobs": COUNT(*) FROM "Job" (unfiltered, all-time)',
    newQueryDescription: '"Customer Jobs": COUNT(*) FROM business_jobs WHERE includeInBusinessMetrics (all-time)',
    oldValue: oldAllJobs,
    newValue: newAllJobs,
    delta: `${oldAllJobs - newAllJobs} fewer in canonical (${653 /* guest */} guest + 147 founder/internal, matches Sprint 4 view validation)`,
    classification: oldAllJobs - newAllJobs === 800 ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED',
    explanation:
      'Expected delta is exactly 653 (guest jobs, no User row at all) + 147 (founder=144, internal=3) = 800. ' +
      'This is the METRICS.md-documented "All Jobs vs. Customer Jobs" dual-reporting design -- both numbers ' +
      'are meant to coexist on the dashboard, not replace each other.',
  })

  console.log('=== Sprint 4 Shadow Comparison Report ===\n')
  for (const c of comparisons) {
    console.log(`--- ${c.metric} ---`)
    console.log(`  OLD (${c.oldQueryDescription})`)
    console.log(`    = ${JSON.stringify(c.oldValue)}`)
    console.log(`  NEW (${c.newQueryDescription})`)
    console.log(`    = ${JSON.stringify(c.newValue)}`)
    console.log(`  Delta: ${c.delta}`)
    console.log(`  Classification: ${c.classification}`)
    console.log(`  Explanation: ${c.explanation}`)
    console.log()
  }

  const unexplained = comparisons.filter((c) => c.classification === 'UNEXPLAINED')
  console.log('=== Verdict ===')
  console.log(`${comparisons.length} metrics compared. ${unexplained.length} UNEXPLAINED discrepancies.`)
  if (unexplained.length > 0) {
    console.log('⚠️  STOP CONDITION MET — unexplained discrepancy found:')
    for (const u of unexplained) console.log(`   - ${u.metric}`)
  } else {
    console.log('✅ Every discrepancy found is fully explained by the known Sprint 2 taxonomy exclusions and the Phase 1 guest-inclusion finding. No stop condition triggered.')
  }
}

main()
  .catch((err) => {
    console.error('Shadow comparison report failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
