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

import { PlanType, User, saveUser } from '../models/User'
import { getPlanLimits } from './limits'

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
 * Returns true when the user currently has paid-plan access.
 * Does NOT enforce — call enforceSubscriptionState first if you need enforcement.
 */
export function hasPaidAccess(user: User, now: Date = new Date()): boolean {
  if (user.plan === 'free') return false
  if (user.plan === 'founding_workflow') return true
  // Active or past_due subscription (still within Stripe's retry window)
  if (user.subscriptionId) return true
  // Subscription deleted but still within grace period
  if (user.billingPeriodEnd && user.billingPeriodEnd >= now) return true
  return false
}
