/**
 * Pure webhook-ordering guard — no Stripe/DB imports, so it can be unit
 * tested without triggering services/stripe.ts's env-var validation (same
 * "DB/Stripe-free logic module" pattern as services/conversionIntent.ts).
 *
 * Stripe does not guarantee webhook delivery order. Without this guard, a
 * late-arriving but chronologically-older event (e.g. a
 * customer.subscription.updated carrying an earlier 'past_due' status) can
 * overwrite a newer event's state (e.g. a customer.subscription.deleted's
 * 'canceled') that was already correctly applied — confirmed happening in
 * production during the 2026-08 revenue-leakage audit (two accounts stuck at
 * subscriptionStatus 'past_due' despite their subscription having already
 * been fully canceled).
 */

/**
 * @param lastAppliedAt The user's currently-stored `lastSubscriptionEventAt`
 *   (undefined if no subscription event has ever been applied — nothing to
 *   compare against, so the first event always wins).
 * @param eventCreatedUnixSeconds The incoming Stripe event's own `created`
 *   field (seconds since epoch, as Stripe always sends it).
 * @returns true if the incoming event is strictly older than the last one
 *   already applied, and must be rejected before it mutates any
 *   subscription-derived field (subscriptionStatus, subscriptionId,
 *   billingPeriod*, plan-via-subscription-items).
 */
export function isStaleSubscriptionEvent(
  lastAppliedAt: Date | undefined,
  eventCreatedUnixSeconds: number
): boolean {
  if (!lastAppliedAt) return false
  return eventCreatedUnixSeconds * 1000 < lastAppliedAt.getTime()
}
