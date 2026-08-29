export const PAID_PLANS = ['basic', 'pro', 'agency', 'founding_workflow', 'business'] as const

export function normalizePlan(plan?: string | null): string {
  return (plan || 'free').trim().toLowerCase()
}

/** Mirrors the backend plans that carry paid/legacy entitlement. */
export function isPaidPlan(plan?: string | null): boolean {
  return PAID_PLANS.includes(normalizePlan(plan) as (typeof PAID_PLANS)[number])
}
