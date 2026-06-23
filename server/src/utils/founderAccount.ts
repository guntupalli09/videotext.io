import type { PlanLimits, PlanType, User } from '../models/User'

/** Narrow auth shape for resolveEffectivePlan (avoids importing auth.ts — circular). */
type AuthPlanCarrier = { plan?: PlanType } | null | undefined

const DEFAULT_FOUNDER_EMAIL = 'santhoshguntupalli06@gmail.com'

/**
 * Production: set FOUNDER_ACCOUNT_EMAIL to the canonical ops account.
 * Default matches the existing hardcoded founder dashboard allowlist.
 */
export function getFounderAccountEmail(): string {
  const raw = process.env.FOUNDER_ACCOUNT_EMAIL ?? DEFAULT_FOUNDER_EMAIL
  return String(raw).trim().toLowerCase()
}

export function isFounderAccountEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === getFounderAccountEmail()
}

/** Highest internal tier: no billing, no metering — used only for the founder account email. */
export function getFounderUnlimitedLimits(): PlanLimits {
  return {
    minutesPerMonth: 9_999_999,
    maxVideoDuration: 24 * 60,
    maxFileSize: 50 * 1024 * 1024 * 1024,
    maxConcurrentJobs: 8,
    maxLanguages: 10,
    batchEnabled: true,
    batchMaxVideos: 100,
    batchMaxDuration: 999,
    batchMaxPerDay: 999,
  }
}

/** JWT should advertise Business-tier access for the founder so queues and the client stay aligned. */
export function getTokenPlanForJwt(user: Pick<User, 'email' | 'plan'>): PlanType {
  if (isFounderAccountEmail(user.email)) return 'business'
  return user.plan
}

/**
 * Effective tier for API routes: founder always resolves as business regardless of DB/JWT drift.
 * DB is authoritative — JWT plan is ignored in favor of user.plan.
 */
export function resolveEffectivePlan(auth: AuthPlanCarrier, user: User | null | undefined): PlanType {
  if (user && isFounderAccountEmail(user.email)) return 'business'
  if (user) return user.plan
  return 'free'
}
