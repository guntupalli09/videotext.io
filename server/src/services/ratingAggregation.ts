/**
 * Canonical star-rating aggregation, shared by the Founder Dashboard
 * (server/src/routes/adminDashboard.ts) and the public rating endpoint
 * (server/src/routes/publicStats.ts) so the two surfaces cannot present
 * two different "average rating" numbers.
 *
 * Exclusion semantics match canonicalDashboard.ts's starDistribution
 * comparison: feedback from founder/internal/demo accounts
 * (business_users.includeInBusinessMetrics = false) is excluded, while
 * anonymous feedback (no userId, e.g. public /survey submissions) is
 * always included.
 */

import { prisma } from '../db'

export interface StarDistributionRow {
  stars: number
  count: number
}

export async function getCanonicalStarDistribution(): Promise<StarDistributionRow[]> {
  const rows = await prisma.$queryRaw<{ stars: number; count: bigint }[]>`
    SELECT f.stars, COUNT(*)::bigint as count
    FROM "Feedback" f
    LEFT JOIN business_users bu ON bu.id = f."userId"
    WHERE f.stars IS NOT NULL AND (f."userId" IS NULL OR bu."includeInBusinessMetrics")
    GROUP BY f.stars
    ORDER BY f.stars DESC
  `
  return rows.map((r) => ({ stars: Number(r.stars), count: Number(r.count) }))
}

export function computeAverageRating(distribution: StarDistributionRow[]): { average: number | null; count: number } {
  const count = distribution.reduce((sum, r) => sum + r.count, 0)
  if (count === 0) return { average: null, count: 0 }
  const weightedSum = distribution.reduce((sum, r) => sum + r.stars * r.count, 0)
  return { average: weightedSum / count, count }
}
