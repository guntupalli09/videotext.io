/**
 * Analytics Sprint 7 — rollup reconciliation report.
 *
 * Read-only CLI. Does not write to DailyMetrics, MonthlyMetrics, or any
 * other table -- every value below is computed fresh via the pure
 * compute-only functions (computeLegacyDayFields/computeLegacyMonthFields in
 * recomputeMetrics.ts, computeCanonicalDayFields/computeCanonicalMonthFields
 * in recomputeMetricsCanonical.ts). ROLLUP_CANONICAL_SOURCE stays whatever
 * it is in this environment (default false) -- this script never touches
 * the flag and never calls recomputeDay/recomputeMonth's upsert path.
 *
 * Validates four separate things, per the operator's Sprint 7 requirement 5:
 *   1. Legacy rollup vs. canonical rollup, for the last DAY_WINDOW days and
 *      MONTH_WINDOW months -- the main field-by-field comparison.
 *   2. Canonical rollup vs. an independently hand-written live query for the
 *      most recent fully-completed day (not calling the shared function --
 *      proves the two code paths agree, not just that one function agrees
 *      with itself).
 *   3. Freshly-recomputed legacy values vs. whatever is currently *stored*
 *      in the live DailyMetrics table for the same days -- proves this
 *      sprint's refactor did not change the legacy path's behavior at all.
 *   4. Sprint 5/6's existing 30-day-window live-query proxy
 *      (canonicalDashboard.ts's compareDashboardMetrics(), snapshot.* rows)
 *      shown alongside for cross-reference -- different window granularity
 *      (30-day rolling vs. single calendar day), so not expected to match
 *      exactly, but should show the same direction and be explained by the
 *      same known exclusions.
 *
 * Usage: cd server && npx tsx src/scripts/sprint7-rollup-reconciliation-report.ts
 * Exit code: non-zero if any UNEXPLAINED classification or cross-check
 * mismatch is found -- per operator instruction #7, that is the "stop and
 * investigate" signal.
 */

import '../env'
import { prisma } from '../db'
import {
  computeLegacyDayFields,
  computeLegacyMonthFields,
  type LegacyDayFields,
  type LegacyMonthFields,
} from '../services/recomputeMetrics'
import {
  computeCanonicalDayFields,
  computeCanonicalMonthFields,
  type CanonicalDayFields,
  type CanonicalMonthFields,
} from '../services/recomputeMetricsCanonical'
import { classifyMonotonicCount, classifyNonMonotonic, type RollupFieldClassification } from '../services/rollupReconciliation'
import { compareDashboardMetrics } from '../services/canonicalDashboard'

const DAY_WINDOW = 14
const MONTH_WINDOW = 3

function toUtcMidnight(d: Date): Date {
  const out = new Date(d)
  out.setUTCHours(0, 0, 0, 0)
  return out
}
function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCDate(out.getUTCDate() + n)
  return out
}
function firstDayOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}
function addMonths(d: Date, n: number): Date {
  const out = new Date(d)
  out.setUTCMonth(out.getUTCMonth() + n)
  return out
}

interface FieldRow {
  scope: 'day' | 'month'
  period: string
  field: string
  legacy: number | null
  canonical: number | null
  classification: RollupFieldClassification
}

const DAY_COUNT_FIELDS = ['totalUsers', 'newUsers', 'activeUsers', 'jobsCreated', 'jobsCompleted', 'jobsFailed'] as const
const DAY_RATE_FIELDS = ['avgProcessingMs', 'p95ProcessingMs'] as const
const MONTH_COUNT_FIELDS = ['totalUsers', 'newUsers', 'activeUsers'] as const

async function main(): Promise<void> {
  const rows: FieldRow[] = []
  const now = new Date()
  const todayStart = toUtcMidnight(now)

  // ── 1a. Daily rollups: last DAY_WINDOW full (completed) UTC days ────────
  const dayResults = new Map<string, { legacy: LegacyDayFields; canonical: CanonicalDayFields; dayStart: Date }>()
  for (let i = DAY_WINDOW; i >= 1; i--) {
    const dayStart = addDays(todayStart, -i)
    const dayEnd = addDays(dayStart, 1)
    const endOfDay = new Date(dayEnd.getTime() - 1)
    const [legacy, canonical] = await Promise.all([
      computeLegacyDayFields(dayStart, dayEnd, endOfDay),
      computeCanonicalDayFields(dayStart, dayEnd),
    ])
    const dateStr = dayStart.toISOString().slice(0, 10)
    dayResults.set(dateStr, { legacy, canonical, dayStart })

    for (const f of DAY_COUNT_FIELDS) {
      rows.push({
        scope: 'day', period: dateStr, field: f,
        legacy: legacy[f], canonical: canonical[f],
        classification: classifyMonotonicCount(legacy[f], canonical[f]),
      })
    }
    for (const f of DAY_RATE_FIELDS) {
      rows.push({
        scope: 'day', period: dateStr, field: f,
        legacy: legacy[f], canonical: canonical[f],
        classification: classifyNonMonotonic(legacy[f], canonical[f]),
      })
    }
  }

  // ── 1b. Monthly rollups: last MONTH_WINDOW full (completed) UTC months ──
  const monthEndBound = firstDayOfMonth(now)
  for (let i = MONTH_WINDOW; i >= 1; i--) {
    const monthStart = firstDayOfMonth(addMonths(monthEndBound, -i))
    const monthEnd = addMonths(monthStart, 1)
    const endOfMonth = new Date(monthEnd.getTime() - 1)
    const [legacy, canonical]: [LegacyMonthFields, CanonicalMonthFields] = await Promise.all([
      computeLegacyMonthFields(monthStart, monthEnd, endOfMonth),
      computeCanonicalMonthFields(monthStart, monthEnd),
    ])
    const periodStr = monthStart.toISOString().slice(0, 7)
    for (const f of MONTH_COUNT_FIELDS) {
      rows.push({
        scope: 'month', period: periodStr, field: f,
        legacy: legacy[f], canonical: canonical[f],
        classification: classifyMonotonicCount(legacy[f], canonical[f]),
      })
    }
  }

  // ── 2. Independent live cross-check for the most recent fully-completed day ──
  // Hand-written here, deliberately NOT calling computeCanonicalDayFields,
  // so agreement proves two independent code paths compute the same
  // number, not that one function agrees with itself.
  const lastFullDayStart = addDays(todayStart, -1)
  const lastFullDayEnd = todayStart
  const [adhocTotalUsersRow, adhocJobsCreatedRow] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM business_users
      WHERE "createdAt" < ${lastFullDayEnd} AND "includeInBusinessMetrics"
    `,
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count FROM business_jobs
      WHERE "createdAt" >= ${lastFullDayStart} AND "createdAt" < ${lastFullDayEnd} AND "includeInBusinessMetrics"
    `,
  ])
  const lastFullDayStr = lastFullDayStart.toISOString().slice(0, 10)
  const rollupFnResult = dayResults.get(lastFullDayStr)?.canonical ?? (await computeCanonicalDayFields(lastFullDayStart, lastFullDayEnd))
  const crossCheck = [
    { field: 'totalUsers', independentLiveQuery: Number(adhocTotalUsersRow[0].count), rollupFunction: rollupFnResult.totalUsers },
    { field: 'jobsCreated', independentLiveQuery: Number(adhocJobsCreatedRow[0].count), rollupFunction: rollupFnResult.jobsCreated },
  ].map((r) => ({ ...r, match: r.independentLiveQuery === r.rollupFunction }))

  // ── 3. Freshly-recomputed legacy vs. currently-stored production DailyMetrics rows ──
  // Proves this sprint's refactor (splitting compute from write) did not
  // change the legacy path's output at all -- the flag is off, so
  // production's stored rows were written by the old, unmodified logic;
  // if the refactored computeLegacyDayFields produces different numbers,
  // that is a regression, not a Sprint 7 finding.
  const storedDaily = await prisma.dailyMetrics.findMany({
    where: { date: { gte: addDays(todayStart, -DAY_WINDOW), lt: todayStart } },
    orderBy: { date: 'asc' },
  })
  const storedVsFreshLegacy = storedDaily.map((stored) => {
    const dateStr = stored.date.toISOString().slice(0, 10)
    const fresh = dayResults.get(dateStr)?.legacy
    if (!fresh) return { date: dateStr, hasStoredRow: true, hasFreshLegacy: false, allFieldsMatch: null }
    const allFieldsMatch =
      stored.totalUsers === fresh.totalUsers &&
      stored.newUsers === fresh.newUsers &&
      stored.activeUsers === fresh.activeUsers &&
      stored.jobsCreated === fresh.jobsCreated &&
      stored.jobsCompleted === fresh.jobsCompleted &&
      stored.jobsFailed === fresh.jobsFailed
    return { date: dateStr, hasStoredRow: true, hasFreshLegacy: true, allFieldsMatch }
  })

  // ── 4. Sprint 5/6 30-day-window live-query proxy, shown for cross-reference ──
  const dashboardComparisons = await compareDashboardMetrics()
  const snapshotProxyRows = dashboardComparisons.filter((c) => c.card === 'snapshot' && c.metric !== 'mrrCents')

  // ── Report ────────────────────────────────────────────────────────────
  console.log('=== Sprint 7 Rollup Reconciliation Report ===')
  console.log(`Generated: ${now.toISOString()}`)
  console.log(`Day window: ${DAY_WINDOW} full UTC days. Month window: ${MONTH_WINDOW} full UTC months.\n`)

  console.log('--- 1. Legacy vs. canonical rollup, field by field ---')
  for (const r of rows) {
    console.log(
      `[${r.scope}] ${r.period} ${r.field.padEnd(16)} legacy=${String(r.legacy).padStart(8)} canonical=${String(r.canonical).padStart(8)} -> ${r.classification}`
    )
  }
  const unexplainedRows = rows.filter((r) => r.classification === 'UNEXPLAINED')

  console.log('\n--- 2. Independent live-query cross-check (most recent full day: ' + lastFullDayStr + ') ---')
  for (const c of crossCheck) {
    console.log(`${c.field}: independentLiveQuery=${c.independentLiveQuery} rollupFunction=${c.rollupFunction} match=${c.match}`)
  }
  const crossCheckMismatches = crossCheck.filter((c) => !c.match)

  console.log('\n--- 3. Freshly-recomputed legacy vs. currently-stored production DailyMetrics ---')
  for (const s of storedVsFreshLegacy) {
    console.log(`${s.date}: hasFreshLegacy=${s.hasFreshLegacy} allFieldsMatch=${s.allFieldsMatch}`)
  }
  const storedMismatches = storedVsFreshLegacy.filter((s) => s.allFieldsMatch === false)

  console.log('\n--- 4. Sprint 5/6 30-day-window live-query proxy (cross-reference only, different window granularity) ---')
  for (const c of snapshotProxyRows) {
    console.log(`${c.metric}: legacy=${JSON.stringify(c.legacyValue)} canonical=${JSON.stringify(c.canonicalValue)} classification=${c.classification}`)
  }

  console.log('\n--- Summary ---')
  console.log(`Field comparisons: ${rows.length} total, ${unexplainedRows.length} UNEXPLAINED`)
  console.log(`Cross-check mismatches: ${crossCheckMismatches.length}`)
  console.log(`Stored-vs-fresh-legacy mismatches: ${storedMismatches.length}`)

  const stopConditionTriggered = unexplainedRows.length > 0 || crossCheckMismatches.length > 0 || storedMismatches.length > 0
  if (stopConditionTriggered) {
    console.error('\nSTOP CONDITION TRIGGERED (operator instruction #7) -- investigate before proceeding.')
    process.exitCode = 1
  } else {
    console.log('\nNo UNEXPLAINED classifications, no cross-check mismatches, no stored-vs-fresh-legacy mismatches.')
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
