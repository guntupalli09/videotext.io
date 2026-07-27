/**
 * Analytics Sprint 7 — pure classification logic for the rollup
 * reconciliation report (scripts/sprint7-rollup-reconciliation-report.ts).
 * Extracted so it can be unit-tested without a live database, following the
 * same pattern as stripeReconciliation.ts's classify() and
 * canonicalDashboard.ts's classifySubsetScalar().
 */

export type RollupFieldClassification = 'IDENTICAL' | 'EXPECTED_DIVERGENCE' | 'UNEXPLAINED'

/**
 * For count-like fields (totalUsers, newUsers, activeUsers, jobsCreated,
 * jobsCompleted, jobsFailed): the canonical population is always a subset
 * of the legacy one (guest jobs + the 4 Sprint 2 excluded accounts are
 * removed, never added), so canonical <= legacy is the only "expected"
 * shape. Canonical > legacy, or a negative value on either side, is
 * UNEXPLAINED and should stop the report per operator instruction #7.
 */
export function classifyMonotonicCount(legacy: number, canonical: number): RollupFieldClassification {
  if (legacy === canonical) return 'IDENTICAL'
  if (canonical < 0 || legacy < 0) return 'UNEXPLAINED'
  return canonical <= legacy ? 'EXPECTED_DIVERGENCE' : 'UNEXPLAINED'
}

/**
 * For avgProcessingMs/p95ProcessingMs: removing rows from an average or
 * percentile can move it in either direction depending on whether the
 * removed rows were faster or slower than the rest -- there is no
 * subset-monotonic expectation the way there is for a count. Any
 * unequal-but-finite pair is EXPECTED_DIVERGENCE; the only UNEXPLAINED case
 * is a null/NaN appearing on one side without the same on the other side
 * (which would indicate a query-shape bug, not a population change).
 */
export function classifyNonMonotonic(
  legacy: number | null,
  canonical: number | null
): RollupFieldClassification {
  if (legacy === canonical) return 'IDENTICAL'
  // canonical is always computed over a subset of the rows legacy sees, so
  // canonical can legitimately go to null (zero qualifying rows that day)
  // even when legacy has data -- that is an expected, not alarming, shape.
  if (legacy !== null && canonical === null) return 'EXPECTED_DIVERGENCE'
  // The reverse -- canonical has a value while legacy is null -- is
  // impossible by construction (canonical's rows are a subset of legacy's),
  // so it signals a real bug in one of the two queries, not a population
  // change.
  if (legacy === null || canonical === null) return 'UNEXPLAINED'
  if (!Number.isFinite(legacy) || !Number.isFinite(canonical)) return 'UNEXPLAINED'
  return 'EXPECTED_DIVERGENCE'
}
