/**
 * Public stats endpoint — no auth required.
 * Returns aggregate job counts and minutes processed for the trust badge.
 * Results are cached in memory for 1 hour.
 */

import express, { Request, Response } from 'express'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'
import { getCanonicalStarDistribution, computeAverageRating } from '../services/ratingAggregation'

const log = getLogger('api')
const router = express.Router()
export default router

interface PublicStats {
  totalJobsCompleted: number
  totalMinutesProcessed: number
  cachedAt: string
}

let cache: PublicStats | null = null
let cacheExpiresAt = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Minimum sample size before we're willing to show an average publicly —
// a couple of ratings shouldn't swing a number visitors treat as social proof.
const MIN_RATINGS_FOR_PUBLIC_DISPLAY = 5

interface PublicRating {
  averageRating: number | null
}

let ratingCache: PublicRating | null = null
let ratingCacheExpiresAt = 0
const RATING_CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour — ratings don't need second-by-second freshness

async function fetchRating(): Promise<PublicRating> {
  const distribution = await getCanonicalStarDistribution()
  const { average, count } = computeAverageRating(distribution)
  const averageRating = average != null && count >= MIN_RATINGS_FOR_PUBLIC_DISPLAY
    ? Math.round(average * 10) / 10
    : null
  return { averageRating }
}

async function fetchStats(): Promise<PublicStats> {
  const [jobCount, durationResult] = await Promise.all([
    prisma.job.count({ where: { status: 'completed' } }),
    prisma.job.aggregate({
      where: { status: 'completed', videoDurationSec: { not: null } },
      _sum: { videoDurationSec: true },
    }),
  ])

  const totalSeconds = durationResult._sum.videoDurationSec ?? 0
  return {
    totalJobsCompleted: jobCount,
    totalMinutesProcessed: Math.floor(totalSeconds / 60),
    cachedAt: new Date().toISOString(),
  }
}

router.get('/public', async (_req: Request, res: Response) => {
  try {
    const now = Date.now()
    if (!cache || now > cacheExpiresAt) {
      cache = await fetchStats()
      cacheExpiresAt = now + CACHE_TTL_MS
      log.info({ msg: '[publicStats] cache refreshed', totalJobsCompleted: cache.totalJobsCompleted })
    }
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')
    res.json(cache)
  } catch (err) {
    log.error({ msg: '[publicStats] failed to fetch stats', error: (err as Error)?.message })
    // Return zeros rather than a 500 so the badge degrades gracefully
    res.json({ totalJobsCompleted: 0, totalMinutesProcessed: 0, cachedAt: new Date().toISOString() })
  }
})

// GET /api/stats/public/rating — canonical overall rating average, no auth.
// Same aggregation/exclusion semantics as the Founder Dashboard's
// "Overall rating" card (see server/src/services/ratingAggregation.ts) so
// the two can never disagree. Exposes only the rounded average — no counts,
// no individual feedback, no per-tool or per-user data.
router.get('/public/rating', async (_req: Request, res: Response) => {
  try {
    const now = Date.now()
    if (!ratingCache || now > ratingCacheExpiresAt) {
      ratingCache = await fetchRating()
      ratingCacheExpiresAt = now + RATING_CACHE_TTL_MS
      log.info({ msg: '[publicStats] rating cache refreshed', averageRating: ratingCache.averageRating })
    }
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=300')
    res.json(ratingCache)
  } catch (err) {
    log.error({ msg: '[publicStats] failed to fetch rating', error: (err as Error)?.message })
    // No fabricated rating on failure — null tells the client to hide it.
    res.json({ averageRating: null })
  }
})
