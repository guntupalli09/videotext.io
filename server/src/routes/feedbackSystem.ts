/**
 * Feedback System v2 routes.
 *
 * POST /api/feedback/structured       — Store contextual FeedbackEvent (triggers A–E).
 * GET  /api/admin/feedback-analytics  — Funnel metrics, segmentation, feature engine (founder only).
 * GET  /api/admin/reactivation-users  — Users who reported a specific issue category.
 */

import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db'
import { getEffectiveUserId, getAuthFromRequest } from '../utils/auth'
import { getUser } from '../models/User'
import {
  computeFunnelMetrics,
  computeFeatureEngine,
  computeSegmentBreakdown,
  computeDecisionEngine,
  computeTopIssueClusters,
  computeSegmentIssues,
  getUsersWhoReportedIssue,
} from '../services/feedbackEngine'

const router = express.Router()

const submitLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.ip ?? 'unknown',
})

const VALID_TRIGGERS = new Set(['result', 'export', 'dropoff', 'pmf', 'competitor'])

function sanitize(v: unknown, maxLen = 1000): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, maxLen)
  return s || null
}

async function requireFounder(req: Request, res: Response): Promise<string | null> {
  const auth = getAuthFromRequest(req)
  if (!auth?.userId) { res.status(401).json({ message: 'Unauthorized' }); return null }
  const user = await getUser(auth.userId)
  if (!user || user.role !== 'founder') {
    res.status(403).json({ message: 'Forbidden' }); return null
  }
  return auth.userId
}

// ─── POST /api/feedback/structured ──────────────────────────────────────────

router.post('/structured', submitLimit, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>

    const triggerType = sanitize(body.triggerType, 50)
    if (!triggerType || !VALID_TRIGGERS.has(triggerType)) {
      return res.status(400).json({ message: 'Invalid trigger type' })
    }

    const sessionId = sanitize(body.sessionId, 64)
    if (!sessionId) return res.status(400).json({ message: 'sessionId required' })

    const userId = getEffectiveUserId(req) || null
    const rating = sanitize(body.rating, 200)
    const category = sanitize(body.category, 200)
    const freeText = sanitize(body.freeText) ?? ''
    const dismissed = body.dismissed === true

    // Snapshot user score at submission time
    let userScore: number | null = null
    if (userId) {
      const metrics = await prisma.userMetrics.findUnique({ where: { userId } })
      userScore = metrics?.userScore ?? null

      // Mark one-time triggers as shown
      if (triggerType === 'pmf') {
        await prisma.userMetrics.upsert({
          where: { userId },
          create: { userId, pmfShown: true },
          update: { pmfShown: true },
        })
      }
      if (triggerType === 'competitor') {
        await prisma.userMetrics.upsert({
          where: { userId },
          create: { userId, competitorShown: true },
          update: { competitorShown: true },
        })
      }
    }

    await prisma.feedbackEvent.create({
      data: { userId, sessionId, triggerType, rating, category, freeText, userScore, dismissed },
    })

    return res.status(201).json({ ok: true })
  } catch {
    return res.status(500).json({ message: 'Failed to save feedback' })
  }
})

// ─── GET /api/admin/feedback-analytics ──────────────────────────────────────

router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response

    const [funnel, features, segments, decisionEngine, issueClusters, segmentIssues] = await Promise.all([
      computeFunnelMetrics(),
      computeFeatureEngine(),
      computeSegmentBreakdown(),
      computeDecisionEngine(),
      computeTopIssueClusters(),
      computeSegmentIssues(),
    ])

    // Recent trigger breakdowns
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [recentByTrigger, recentEvents] = await Promise.all([
      prisma.feedbackEvent.groupBy({
        by: ['triggerType'],
        where: { createdAt: { gte: since }, dismissed: false },
        _count: { id: true },
      }),
      prisma.feedbackEvent.findMany({
        where: { dismissed: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, triggerType: true, rating: true, category: true, freeText: true, userScore: true, createdAt: true },
      }),
    ])

    return res.json({
      decisionEngine,
      funnel,
      features,
      segments,
      issueClusters,
      segmentIssues,
      triggerBreakdown: recentByTrigger.map((r) => ({
        triggerType: r.triggerType,
        count: r._count.id,
      })),
      recentEvents: recentEvents.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
    })
  } catch {
    return res.status(500).json({ message: 'Internal server error' })
  }
})

// ─── GET /api/admin/reactivation-users ───────────────────────────────────────

router.get('/reactivation-users', async (req: Request, res: Response) => {
  try {
    const founderId = await requireFounder(req, res)
    if (!founderId) return res as Response

    const category = typeof req.query.category === 'string' ? req.query.category : ''
    if (!category) return res.status(400).json({ message: 'category required' })
    const users = await getUsersWhoReportedIssue(category)
    // Enrich with user email
    const ids = users.map((u) => u.userId).filter((id): id is string => id != null)
    const dbUsers = ids.length > 0
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, email: true, plan: true } })
      : []
    const emailMap = Object.fromEntries(dbUsers.map((u) => [u.id, u]))

    return res.json({
      users: users.map((u) => ({
        userId: u.userId,
        email: u.userId ? emailMap[u.userId]?.email ?? null : null,
        plan: u.userId ? emailMap[u.userId]?.plan ?? null : null,
        reportedAt: u.createdAt,
        excerpt: u.freeText?.slice(0, 100) ?? null,
      })),
    })
  } catch {
    return res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
