-- Fixes a confirmed webhook-ordering bug found during the 2026-08 revenue-
-- leakage audit: Stripe does not guarantee webhook delivery order, so a
-- late-arriving but chronologically-older customer.subscription.updated
-- event could overwrite a newer customer.subscription.deleted event's
-- subscriptionStatus ('canceled' regressing back to 'past_due'). This column
-- lets stripeWebhook.ts reject any subscription-mutating event older than
-- the last one already applied to the user (see isStaleSubscriptionEvent).
--
-- Additive only — nullable, no backfill needed (null = "no event applied
-- yet", which correctly lets the very next event through unconditionally).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastSubscriptionEventAt" TIMESTAMP(3);
