# BACKLOG.md — VideoText Analytics Program

Tracked work items that have been identified, scoped, and deliberately
deferred (not forgotten, not silently dropped). No external issue tracker is
integrated with this repository at present, so this file is the system of
record for such items until one exists. Each item follows a fixed shape:
Title / Status / Priority / Discovered / Description / Impact / Required fix
/ References.

---

## WI-001: Subscription.current_period_start/end API compatibility fix

- **Status:** Open — deferred, not started
- **Priority:** High (billing-lifecycle-adjacent; not urgent enough to
  interrupt Sprint 2/3, per explicit operator decision 2026-07-27)
- **Discovered:** 2026-07-27, during the `getPlanFromSubscriptionItems()`
  read-only investigation approved alongside Sprint 1
- **Description:** Stripe restructured `Subscription.current_period_start`/
  `current_period_end` in this account's pinned API version
  (`2026-01-28.clover`) — they moved from the top level of the `Subscription`
  object to `items.data[0].current_period_end`/`current_period_start`.
  Confirmed live against a real subscription object
  (`sub_1TbFmF2QqK3pYun3TuN01mGI`): the top-level fields are `undefined`
  while the item-level field holds the correct value.
- **Impact:** Four call sites in `server/src/routes/stripeWebhook.ts`
  (`handleCheckoutSessionCompleted`, `handleCustomerSubscriptionCreated`,
  `handleCustomerSubscriptionUpdated`, `handleCustomerSubscriptionDeleted`)
  and two in `server/src/services/stripe.ts`
  (`getSubscriptionPeriodEnd`, `getPlanAndEmailForStripeCustomer`) read the
  now-empty top-level fields. `getSubscriptionPeriodEnd()` returns `null`
  unconditionally as a result. `User.billingPeriodStart`/`billingPeriodEnd`
  are very likely stale or never-set for any subscription event since this
  API version took effect, which feeds
  `enforceSubscriptionState()`'s grace-period/downgrade-at-period-end logic
  in `server/src/utils/subscriptionGuard.ts` — practical risk is that
  automatic downgrade-to-free at the correct period end, or usage-reset-date
  display, may not be firing/showing correctly right now.
  `handleCustomerSubscriptionDeleted` degrades more gracefully (has a
  `cancel_at`/`ended_at` fallback chain, both still top-level and unaffected)
  than the other three call sites, which have no fallback at all.
- **Required fix:** Update all six call sites to read
  `sub.items.data[0].current_period_start`/`current_period_end` instead of
  the top-level fields. Should ship with the same feature-flagged,
  shadow-validated rollout discipline used for the Sprint 1 MRR fix — this is
  billing/access-control-adjacent code, not just reporting, so if anything it
  warrants at least equal caution, not less.
- **References:** `docs/analytics/STRIPE_API_COMPATIBILITY_AUDIT.md` §2 (full
  investigation detail, confirmed-affected field table, per-call-site
  breakdown); `IMPLEMENTATION_PROGRESS.md` (root-cause investigation log).
