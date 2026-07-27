/**
 * Analytics Sprint 5 — full dashboard reconciliation report.
 *
 * Read-only. Runs the exact same comparison the live dashboard route runs
 * in shadow mode (server/src/services/canonicalDashboard.ts), but prints a
 * complete, human-readable report instead of structured log lines, and
 * exits non-zero if any UNEXPLAINED discrepancy is found (per the
 * operator's Sprint 5 requirement 8: "if any unexplained difference
 * appears, stop immediately").
 *
 * Usage (from server/):
 *   npx tsx src/scripts/sprint5-dashboard-reconciliation-report.ts
 */

import 'dotenv/config'
import { prisma } from '../db'
import { compareDashboardMetrics } from '../services/canonicalDashboard'

async function main(): Promise<void> {
  console.log('=== Sprint 5 Dashboard Reconciliation Report ===')
  console.log(`Generated: ${new Date().toISOString()}\n`)

  const comparisons = await compareDashboardMetrics()

  for (const c of comparisons) {
    console.log(`--- [${c.card}] ${c.metric} ---`)
    console.log(`  Source: ${c.source}`)
    console.log(`  Legacy:    ${JSON.stringify(c.legacyValue)}`)
    console.log(`  Canonical: ${JSON.stringify(c.canonicalValue)}`)
    if (c.absoluteDiff !== null) console.log(`  Absolute difference: ${c.absoluteDiff}`)
    if (c.percentDiff !== null) console.log(`  Percentage difference: ${c.percentDiff.toFixed(2)}%`)
    console.log(`  Classification: ${c.classification}`)
    console.log(`  Explanation: ${c.explanation}`)
    console.log()
  }

  const byClassification = {
    IDENTICAL: comparisons.filter((c) => c.classification === 'IDENTICAL').length,
    EXPECTED_DIVERGENCE: comparisons.filter((c) => c.classification === 'EXPECTED_DIVERGENCE').length,
    UNEXPLAINED: comparisons.filter((c) => c.classification === 'UNEXPLAINED').length,
    NOT_YET_COMPARABLE: comparisons.filter((c) => c.classification === 'NOT_YET_COMPARABLE').length,
  }

  console.log('=== Summary ===')
  console.log(JSON.stringify(byClassification, null, 2))

  const unexplained = comparisons.filter((c) => c.classification === 'UNEXPLAINED')
  if (unexplained.length > 0) {
    console.log('\n⚠️  STOP CONDITION MET — unexplained discrepancy found:')
    for (const u of unexplained) {
      console.log(`   - [${u.card}] ${u.metric}: legacy=${JSON.stringify(u.legacyValue)} canonical=${JSON.stringify(u.canonicalValue)}`)
    }
    process.exitCode = 1
  } else {
    console.log('\n✅ Every comparable metric is IDENTICAL or fully EXPECTED_DIVERGENCE. No unexplained discrepancy. Sprint 5 may proceed.')
  }
}

main()
  .catch((err) => {
    console.error('Reconciliation report failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
