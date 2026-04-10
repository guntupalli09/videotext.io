/**
 * Referral program — Borrow strategy (Dropbox model).
 * Referrer gets 45 bonus minutes; referred user gets 45 bonus minutes on first paid plan.
 *
 * Redis keys:
 *   referral:code:{userId}      → referral code string for this user
 *   referral:user:{code}        → userId who owns this code
 *   referral:claims:{userId}    → INCR counter of successful referrals made
 *   referral:claimedby:{userId} → referrerUserId (prevents multi-claim per user)
 */
import express, { Request, Response } from 'express'
import crypto from 'crypto'
import Redis from 'ioredis'
import { getAuthFromRequest } from '../utils/auth'
import { getUser, saveUser } from '../models/User'
import { createRedisClient } from '../utils/redis'
import { getLogger } from '../lib/logger'

const log = getLogger('api')
const router = express.Router()

const redis = createRedisClient('client')

/** Bonus minutes granted to both referrer and referred user. */
const REFERRAL_BONUS_MINUTES = 45

/** Generate a short, URL-safe referral code (8 uppercase alphanumeric chars). */
function generateCode(): string {
  return crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 8).replace(/[^A-Z0-9]/g, 'X')
}

async function getOrCreateCode(userId: string): Promise<string> {
  const existing = await redis.get(`referral:code:${userId}`)
  if (existing) return existing
  const code = generateCode()
  await redis.set(`referral:code:${userId}`, code)
  await redis.set(`referral:user:${code}`, userId)
  return code
}

/** Add bonus minutes to a user's usageThisMonth JSON. */
async function grantBonusMinutes(userId: string, minutes: number): Promise<void> {
  const user = await getUser(userId)
  if (!user) return
  const usage = user.usageThisMonth as Record<string, unknown>
  const current = typeof usage.bonusMinutes === 'number' ? usage.bonusMinutes : 0
  ;(user.usageThisMonth as Record<string, unknown>).bonusMinutes = current + minutes
  await saveUser(user)
}

/** GET /api/referral/code — returns the logged-in user's referral code and link. */
router.get('/code', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in to get your referral link.' })
    }
    const code = await getOrCreateCode(auth.userId)
    const claims = await redis.get(`referral:claims:${auth.userId}`)
    const successfulReferrals = parseInt(claims || '0', 10)
    return res.json({
      code,
      link: `https://videotext.io/?ref=${code}`,
      bonusMinutesPerReferral: REFERRAL_BONUS_MINUTES,
      successfulReferrals,
      bonusEarned: successfulReferrals * REFERRAL_BONUS_MINUTES,
    })
  } catch (error: unknown) {
    log.error({ msg: 'referral code error', error: (error as Error)?.message })
    return res.status(500).json({ message: 'Failed to get referral code.' })
  }
})

/**
 * POST /api/referral/claim
 * Body: { code: string }
 * Called after a user upgrades to a paid plan. Grants bonus minutes to both parties.
 * Idempotent — a user can only claim once.
 */
router.post('/claim', async (req: Request, res: Response) => {
  try {
    const auth = getAuthFromRequest(req)
    if (!auth?.userId) {
      return res.status(401).json({ message: 'Sign in required.' })
    }
    const claimantId = auth.userId
    const { code } = req.body as { code?: string }
    if (!code || typeof code !== 'string' || code.length < 4) {
      return res.status(400).json({ message: 'Invalid referral code.' })
    }
    const upperCode = code.toUpperCase().trim()

    // Prevent a user from claiming their own code
    const ownCode = await redis.get(`referral:code:${claimantId}`)
    if (ownCode && ownCode === upperCode) {
      return res.status(400).json({ message: "You can't use your own referral code." })
    }

    // Each user can only claim one referral code (prevent abuse)
    const alreadyClaimed = await redis.get(`referral:claimedby:${claimantId}`)
    if (alreadyClaimed) {
      return res.status(200).json({ message: 'Already claimed. Bonus already applied.', alreadyClaimed: true })
    }

    // Look up the referrer
    const referrerId = await redis.get(`referral:user:${upperCode}`)
    if (!referrerId) {
      return res.status(404).json({ message: 'Referral code not found. Check the code and try again.' })
    }

    // Prevent referrer from gaming by having many accounts
    const referrer = await getUser(referrerId)
    if (!referrer) {
      return res.status(404).json({ message: 'Referrer account not found.' })
    }

    log.info({ msg: 'referral: claiming bonus', claimantId, referrerId, code: upperCode })

    // Grant bonus to both parties
    await Promise.all([
      grantBonusMinutes(claimantId, REFERRAL_BONUS_MINUTES),
      grantBonusMinutes(referrerId, REFERRAL_BONUS_MINUTES),
    ])

    // Track the claim
    await redis.set(`referral:claimedby:${claimantId}`, referrerId)
    await redis.incr(`referral:claims:${referrerId}`)

    return res.json({
      success: true,
      bonusMinutes: REFERRAL_BONUS_MINUTES,
      message: `You and your referrer each received ${REFERRAL_BONUS_MINUTES} bonus minutes!`,
    })
  } catch (error: unknown) {
    log.error({ msg: 'referral claim error', error: (error as Error)?.message })
    return res.status(500).json({ message: 'Failed to claim referral. Please try again.' })
  }
})

export default router
