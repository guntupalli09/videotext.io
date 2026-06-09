import crypto from 'crypto'
import express, { Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db'
import { getEffectiveUserId } from '../utils/auth'
import { makeFeedbackEmailToken } from '../jobs/feedbackEmailCron'

const router = express.Router()

const feedbackPostLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.ip ?? 'unknown'),
  message: { message: 'Too many feedback submissions. Please wait a minute.' },
})

const FEEDBACK_VIEWER_SECRET = process.env.FEEDBACK_VIEWER_SECRET || ''

const VALID_PLANS = /^(free|basic|pro|agency|founding_workflow)$/i

function sanitize(v: unknown, maxLen = 2000): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().slice(0, maxLen)
  return s || null
}

/** POST /api/feedback — store feedback (in-app Tex panel or shareable survey). No auth required. */
router.post('/', feedbackPostLimit, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>

    const toolId = sanitize(body.toolId, 200)
    let stars: number | null = null
    if (typeof body.stars === 'number' && body.stars >= 1 && body.stars <= 5) {
      stars = Math.round(body.stars)
    }
    const comment = sanitize(body.comment) ?? ''
    const userId = getEffectiveUserId(req) || null
    const userNameOrEmail = sanitize(body.userNameOrEmail, 500)
    const planAtSubmit =
      typeof body.planAtSubmit === 'string' && VALID_PLANS.test(body.planAtSubmit)
        ? body.planAtSubmit.toLowerCase()
        : null

    // Survey-specific fields
    const email = sanitize(body.email, 500)
    const topTool = sanitize(body.topTool, 300)
    const topToolReason = sanitize(body.topToolReason)
    const featureRequest = sanitize(body.featureRequest)
    const otherFeedback = sanitize(body.otherFeedback)
    const source = body.source === 'survey' ? 'survey' : 'in-app'

    // Auto-populate email from user record for logged-in users when not already provided
    let resolvedEmail = email
    let resolvedUserNameOrEmail = userNameOrEmail
    if (userId && !userId.startsWith('guest_') && !resolvedEmail && !resolvedUserNameOrEmail) {
      try {
        const dbUser = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
        if (dbUser?.email) resolvedUserNameOrEmail = dbUser.email
      } catch { /* non-blocking */ }
    }

    await prisma.feedback.create({
      data: {
        toolId,
        stars,
        comment,
        userId,
        userNameOrEmail: resolvedUserNameOrEmail,
        planAtSubmit,
        email: resolvedEmail,
        topTool,
        topToolReason,
        featureRequest,
        otherFeedback,
        source,
      },
    })
    return res.status(201).json({ ok: true })
  } catch (e) {
    return res.status(500).json({ message: 'Failed to save feedback' })
  }
})

/** GET /api/feedback/email-rate — one-click star rating from feedback emails. Records and redirects to homepage. */
router.get('/email-rate', async (req: Request, res: Response) => {
  const baseUrl = (process.env.BASE_URL || 'https://videotext.io').replace(/\/$/, '')
  const { userId, rating, token } = req.query as Record<string, string>

  if (!userId || !rating || !token) return res.redirect(`${baseUrl}/?feedback=invalid`)

  const stars = parseInt(rating, 10)
  if (isNaN(stars) || stars < 1 || stars > 5) return res.redirect(`${baseUrl}/?feedback=invalid`)

  const expected = makeFeedbackEmailToken(userId)
  if (token.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))) {
    return res.redirect(`${baseUrl}/?feedback=invalid`)
  }

  try {
    await prisma.feedback.create({
      data: { toolId: 'email-feedback', stars, userId, source: 'email', comment: '' },
    })
  } catch {
    // Non-blocking — still redirect on DB error
  }

  return res.redirect(`${baseUrl}/?feedback=thanks`)
})

/** GET /api/feedback — list all feedback (newest first). Requires X-Feedback-Viewer header matching FEEDBACK_VIEWER_SECRET. */
router.get('/', async (req: Request, res: Response) => {
  const secret = (req.headers['x-feedback-viewer'] as string) || ''
  if (!FEEDBACK_VIEWER_SECRET || secret !== FEEDBACK_VIEWER_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  try {
    const list = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    return res.json(list)
  } catch (e) {
    return res.status(500).json({ message: 'Failed to load feedback' })
  }
})

export default router
