import crypto from 'crypto'
import express from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const unsubscribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { message: 'Too many requests. Please try again later.' },
})

export function generateUnsubscribeToken(email: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret'
  return crypto.createHmac('sha256', secret).update(email.toLowerCase()).digest('hex').slice(0, 32)
}

router.post('/unsubscribe', unsubscribeLimiter, async (req, res) => {
  const { email, token } = req.body as { email?: unknown; token?: unknown }

  if (!email || typeof email !== 'string' || !token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Missing email or token.' })
  }

  const expected = generateUnsubscribeToken(email)
  if (token !== expected) {
    return res.status(400).json({ message: 'Invalid unsubscribe link.' })
  }

  try {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, newsletterSubscribed: true },
    })

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { newsletterSubscribed: false },
      })
    }

    // Always return success to avoid email enumeration
    return res.json({ success: true })
  } catch (e) {
    log.warn({ msg: 'Unsubscribe error', error: (e as Error)?.message })
    return res.status(500).json({ message: 'Failed to unsubscribe. Please try again.' })
  }
})

export default router
