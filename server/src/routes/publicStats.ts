/**
 * Public stats endpoint — no auth required.
 * Returns aggregate job counts and minutes processed for the trust badge.
 * Results are cached in memory for 1 hour.
 */

import express, { Request, Response } from 'express'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'

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
