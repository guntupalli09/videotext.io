import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { computeAverageRating, type StarDistributionRow } from '../src/services/ratingAggregation'

// ── computeAverageRating: pure aggregation math (no DB required) ──────────

test('computeAverageRating: weighted average across a mixed distribution', () => {
  const distribution: StarDistributionRow[] = [
    { stars: 5, count: 3 },
    { stars: 4, count: 1 },
    { stars: 1, count: 1 },
  ]
  // (5*3 + 4*1 + 1*1) / 5 = 20 / 5 = 4
  const { average, count } = computeAverageRating(distribution)
  assert.equal(count, 5)
  assert.equal(average, 4)
})

test('computeAverageRating: fractional average rounds consistently with toFixed(1) (Founder Dashboard convention)', () => {
  // (5*4 + 4*1 + 3*1 + 2*1 + 1*1) / 8 = (20+4+3+2+1)/8 = 30/8 = 3.75
  const distribution: StarDistributionRow[] = [
    { stars: 5, count: 4 },
    { stars: 4, count: 1 },
    { stars: 3, count: 1 },
    { stars: 2, count: 1 },
    { stars: 1, count: 1 },
  ]
  const { average } = computeAverageRating(distribution)
  assert.equal(average, 3.75)
  // Public endpoint rounding convention (Math.round(avg*10)/10) must agree
  // with the Founder Dashboard's display convention (avg.toFixed(1)).
  const publicRounded = Math.round((average as number) * 10) / 10
  assert.equal(publicRounded, 3.8)
  assert.equal((average as number).toFixed(1), '3.8')
})

test('computeAverageRating: empty distribution returns null average, zero count', () => {
  const { average, count } = computeAverageRating([])
  assert.equal(average, null)
  assert.equal(count, 0)
})

test('computeAverageRating: distribution with only zero counts returns null average', () => {
  const { average, count } = computeAverageRating([{ stars: 5, count: 0 }])
  assert.equal(average, null)
  assert.equal(count, 0)
})

// ── Shared source: public endpoint and Founder Dashboard must read the ────
// same canonical query, or they can silently diverge again.

test('adminDashboard imports the same getCanonicalStarDistribution used by publicStats (single source of truth)', () => {
  const adminDashboardSrc = readFileSync(resolve(process.cwd(), 'src/routes/adminDashboard.ts'), 'utf8')
  const publicStatsSrc = readFileSync(resolve(process.cwd(), 'src/routes/publicStats.ts'), 'utf8')

  assert.match(adminDashboardSrc, /import\s*\{\s*getCanonicalStarDistribution\s*\}\s*from\s*['"]\.\.\/services\/ratingAggregation['"]/)
  assert.match(publicStatsSrc, /getCanonicalStarDistribution/)

  // The Founder Dashboard's starDistribution slot must call the shared helper,
  // not re-implement its own unfiltered "Feedback" query.
  assert.match(adminDashboardSrc, /getCanonicalStarDistribution\(\)/)
  assert.doesNotMatch(
    adminDashboardSrc,
    /SELECT stars, COUNT\(\*\)::bigint as count\s*\n\s*FROM "Feedback"\s*\n\s*WHERE stars IS NOT NULL\s*\n\s*GROUP BY stars/,
  )
})

test('canonical star distribution query excludes founder/internal/demo accounts via business_users.includeInBusinessMetrics', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/services/ratingAggregation.ts'), 'utf8')
  assert.match(src, /LEFT JOIN business_users bu ON bu\.id = f\."userId"/)
  assert.match(src, /"userId" IS NULL OR bu\."includeInBusinessMetrics"/)
})

// ── Public endpoint: response shape and privacy ────────────────────────────

test('public rating endpoint response type exposes averageRating and ratingCount only', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/routes/publicStats.ts'), 'utf8')
  const interfaceMatch = src.match(/interface PublicRating \{([^}]*)\}/)
  assert.ok(interfaceMatch, 'PublicRating interface must exist')
  const body = interfaceMatch![1]
  assert.match(body, /averageRating\s*:\s*number \| null/)
  assert.match(body, /ratingCount\s*:\s*number \| null/)
  // No comments, no user identifiers, no per-tool breakdowns.
  for (const forbidden of ['comment', 'email', 'userId', 'toolId', 'stars:', 'name']) {
    assert.doesNotMatch(body, new RegExp(forbidden), `PublicRating must not expose "${forbidden}"`)
  }
})

test('public rating route does not accept query parameters that could widen access', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/routes/publicStats.ts'), 'utf8')
  const routeMatch = src.match(/router\.get\('\/public\/rating',[\s\S]*?\n\}\)/)
  assert.ok(routeMatch, 'GET /public/rating handler must exist')
  assert.doesNotMatch(routeMatch![0], /req\.query/, 'rating endpoint must not read any query parameters')
  assert.doesNotMatch(routeMatch![0], /requireFounder|getAuthFromRequest/, 'rating endpoint must stay unauthenticated and founder-free')
})

test('public rating route never fabricates a fallback rating on failure', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/routes/publicStats.ts'), 'utf8')
  const catchBlock = src.split("router.get('/public/rating'")[1]
  assert.ok(catchBlock)
  assert.match(catchBlock, /averageRating:\s*null/)
  assert.match(catchBlock, /ratingCount:\s*null/)
  assert.doesNotMatch(catchBlock, /averageRating:\s*4\.9/)
  assert.doesNotMatch(catchBlock, /averageRating:\s*4\.2/)
  assert.doesNotMatch(catchBlock, /ratingCount:\s*45/)
})
