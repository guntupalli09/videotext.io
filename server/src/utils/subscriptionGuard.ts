/**
 * Centralized subscription-state enforcement.
 *
 * Call enforceSubscriptionState() at the top of EVERY route that gates on plan
 * (upload, batch, translate-transcript, usage/current, etc.).  It is the single
 * place where expired/canceled subscriptions get downgraded to free.
 *
 * Design principles:
 *   - Pure DB reads/writes — no Stripe API calls (keeps routes fast).
 *   - Idempotent — safe to call multiple times for the same user.
 *   - founding_workflow is a permanent grandfathered plan, never auto-downgraded.
 *   - past_due subscriptions retain access; Stripe is retrying payment.
 *     If all retries fail, Stripe fires customer.subscription.deleted and we
 *     downgrade there.  We never cut users off mid-dunning-window.
 */

import { PlanType, User, getUser, saveUser } from '../models/User'
import { getPlanLimits } from './limits'
import { getAuthFromRequest, getEffectiveUserId } from './auth'
import { verifyAuthToken } from './auth'
import { isFounderAccountEmail } from './founderAccount'
import type { Request } from 'express'

const VALID_PLANS: PlanType[] = ['free', 'basic', 'pro', 'agency', 'founding_workflow', 'business']

export function isValidPlan(plan: unknown): plan is PlanType {
  return typeof plan === 'string' && (VALID_PLANS as string[]).includes(plan)
}

/**
 * Pick the plan used for request gating.
 *
 * Once a DB user exists, the DB is authoritative. JWTs can be stale after a
 * promo-code or webhook upgrade, so a signed old "free" token must not
 * downgrade an already-upgraded Pro user back to Free.
 */
export function resolveRequestPlan(user: User | null | undefined, authPlan?: unknown): PlanType {
  if (user) return user.plan
  return isValidPlan(authPlan) ? authPlan : 'free'
}

/**
 * Enforce subscription access rules and persist any state change.
 *
 * Mutates `user` in-place and saves to DB when the plan changes.
 * Returns the (possibly updated) user.
 *
 * Downgrade condition:
 *   billingPeriodEnd has passed  AND  subscriptionId is gone
 *   → the subscription was deleted and the grace period expired.
 *   Downgrade to free immediately.
 */
export async function enforceSubscriptionState(user: User, now: Date = new Date()): Promise<User> {
  // Permanent plan — never downgrade.
  if (user.plan === 'founding_workflow' || user.plan === 'free') return user

  const periodExpired = user.billingPeriodEnd != null && user.billingPeriodEnd < now
  const subscriptionGone = !user.subscriptionId

  if (periodExpired && subscriptionGone) {
    user.plan = 'free'
    user.subscriptionStatus = undefined
    user.cancelAtPeriodEnd = false
    user.limits = getPlanLimits('free')
    user.usageThisMonth = {
      ...user.usageThisMonth,
      totalMinutes: 0,
      videoCount: 0,
      batchCount: 0,
      languageCount: 0,
      translatedMinutes: 0,
      importCount: 0,
      resetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      importCountToday: 0,
      importCountTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      dailyMinutesToday: 0,
      dailyMinutesTodayResetDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    }
    user.overagesThisMonth = { minutes: 0, languages: 0, batches: 0, totalCharge: 0 }
    user.updatedAt = now
    await saveUser(user)
  }

  return user
}

/**
 * DB-authoritative plan resolution for any Express request.
 * Loads the user from the database and returns the effective plan.
 * No route should inspect auth.plan / jwt.plan directly.
 */
export async function getEffectivePlan(req: Request): Promise<{ plan: PlanType; user: User | null }> {
  const userId = getEffectiveUserId(req)
  if (!userId) return { plan: 'free', user: null }

  const user = await getUser(userId)
  if (!user) return { plan: 'free', user: null }

  if (isFounderAccountEmail(user.email)) return { plan: 'business', user }

  await enforceSubscriptionState(user)
  return { plan: user.plan, user }
}

/**
 * DB-authoritative plan resolution from a raw auth token string (for WebSocket routes).
 */
export async function getEffectivePlanFromToken(token: string | null): Promise<{ plan: PlanType; user: User | null }> {
  if (!token) return { plan: 'free', user: null }
  const auth = verifyAuthToken(token)
  if (!auth?.userId) return { plan: 'free', user: null }

  const user = await getUser(auth.userId)
  if (!user) return { plan: 'free', user: null }

  if (isFounderAccountEmail(user.email)) return { plan: 'business', user }

  await enforceSubscriptionState(user)
  return { plan: user.plan, user }
}

/**
 * Returns true when the user currently has paid-plan access.
 * Does NOT enforce — call enforceSubscriptionState first if you need enforcement.
 *
 * Must mirror enforceSubscriptionState()'s notion of "not yet expired": that
 * function only downgrades a paid plan to free once billingPeriodEnd has
 * passed AND subscriptionId is gone, treating an unset billingPeriodEnd as
 * "never expires" (used for founding_workflow-style permanent grants and for
 * comped/manually-granted plans set via admin/support/set-plan or
 * provision-zapier-reviewer.ts, neither of which carry a Stripe
 * subscription). If this function required a subscriptionId or a future
 * billingPeriodEnd, such an account would read as unpaid here while
 * enforceSubscriptionState still considers it active Pro — exactly the kind
 * of split-brain entitlement state this whole module exists to prevent.
 */
export function hasPaidAccess(user: User, now: Date = new Date()): boolean {
  if (user.plan === 'free') return false
  if (user.plan === 'founding_workflow') return true
  // Active or past_due subscription (still within Stripe's retry window)
  if (user.subscriptionId) return true
  // No Stripe subscription on record: either a permanent, non-expiring grant
  // (billingPeriodEnd never set) or a canceled subscription still within its
  // grace period (billingPeriodEnd set and in the future).
  if (user.billingPeriodEnd == null || user.billingPeriodEnd >= now) return true
  return false
}
