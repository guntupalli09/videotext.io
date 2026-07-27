# STRIPE_API_COMPATIBILITY_AUDIT.md — VideoText

Status: audit only. No fixes implemented here (except the Sprint 1 MRR
extraction fix, already shipped separately — referenced below for
completeness). Created per operator instruction 2026-07-27, as a dedicated,
standalone audit distinct from Sprint 1/2 of the analytics migration
(`docs/analytics/SPRINT_PLAN.md`).

## Scope & methodology

Every file in `server/src` that imports or references the `Stripe` type/SDK
was enumerated (`grep -rl "Stripe\." src`): `services/stripe.ts`,
`routes/billing.ts`, `routes/stripeWebhook.ts`, `utils/stripeMrr.ts`,
`scripts/mrr-extraction-validation-report.ts`. Every Stripe object field each
one reads was cross-referenced against **live, read-only GET requests**
against the production Stripe account, pinned to `Stripe-Version:
2026-01-28.clover` (the exact version configured in
`server/src/services/stripe.ts`), for each resource type actually used:
`Invoice` (+ line items), `Subscription`, `Checkout.Session`. No object was
created, updated, canceled, or deleted; no database writes occurred. `Customer`
fields are assessed by code inspection only (not independently verified live
— see "Unverified / lower confidence" below) since the codebase's usage of
that resource is limited to basic, stable fields unlikely to be part of the
same restructuring, and verifying them was judged lower-value than the
resources already confirmed affected.

## Executive summary

| Parser / function | File | Resource | Status | Risk | Required fix |
|---|---|---|---|---|---|
| `computeNormalizedMonthlyCentsFromLines` / `getPriceRecurring` | `utils/stripeMrr.ts` | `Invoice.lines.data[]` | **CONFIRMED AFFECTED — FIXED** (Sprint 1, shadow mode; write path pending operator sign-off) | Was Critical, now mitigated | Done — see `SPRINT_PLAN.md` Sprint 1 |
| `getPlanFromSubscriptionItems` | `routes/stripeWebhook.ts` | `Subscription.items.data[].price` | **CONFIRMED UNAFFECTED** | None | None |
| `handleCheckoutSessionCompleted` (period lookup) | `routes/stripeWebhook.ts` | `Subscription.current_period_start/end` (via `stripe.subscriptions.retrieve`) | **CONFIRMED AFFECTED — NOT FIXED** | High (billing period / grace-period logic) | See "Required fixes" below |
| `handleCustomerSubscriptionCreated` | `routes/stripeWebhook.ts` | `Subscription.current_period_start/end` (from webhook payload directly) | **CONFIRMED AFFECTED — NOT FIXED** | High | Same as above |
| `handleCustomerSubscriptionUpdated` | `routes/stripeWebhook.ts` | `Subscription.current_period_start/end` (from webhook payload directly) | **CONFIRMED AFFECTED — NOT FIXED** | High | Same as above |
| `handleCustomerSubscriptionDeleted` (period-end fallback) | `routes/stripeWebhook.ts` | `Subscription.current_period_end` | **CONFIRMED AFFECTED — NOT FIXED** | Medium (has two other fallbacks: `cancel_at`, `ended_at`, both still top-level and unaffected, so this handler degrades rather than fully fails) | Same as above |
| `getSubscriptionPeriodEnd` | `services/stripe.ts` | `Subscription.current_period_start/end` | **CONFIRMED AFFECTED — NOT FIXED** | High — this function returns `null` unconditionally for every call right now | Same as above |
| `getPlanAndEmailForStripeCustomer` (period field only) | `services/stripe.ts` | `Subscription.current_period_end` | **CONFIRMED AFFECTED — NOT FIXED** | Medium (only affects the `currentPeriodEnd` field of this function's return value; `plan`/`email`/`subscriptionId` resolution in the same function is unaffected) | Same as above |
| `handleCheckoutSessionCompleted`, `handleInvoicePaymentSucceeded` (session fields) | `routes/stripeWebhook.ts` | `Checkout.Session` (`.subscription`, `.customer_details`, `.payment_status`, `.mode`, `.metadata`) | **CONFIRMED UNAFFECTED** | None | None |
| `session-details`, `session-status`, checkout creation | `routes/billing.ts` | `Checkout.Session` | **CONFIRMED UNAFFECTED** | None | None |
| `handleInvoicePaymentFailed` (`invoice.last_payment_error`) | `routes/stripeWebhook.ts` | `Invoice.last_payment_error` | **UNCONFIRMED** (see below) | Low–Medium, unconfirmed | Investigate before relying on it for alerting/dunning UX |
| `findStripeCustomerIdByEmail`, `getPlanAndEmailForStripeCustomer` (non-period fields) | `services/stripe.ts` | `Customer` (`.deleted`, `.email`, `.metadata`) | **UNVERIFIED, LOW RISK** | Low (basic, stable field types; not part of the Invoice/Subscription-period redesign observed elsewhere) | Optional follow-up verification, not urgent |
| `handleCustomerSubscriptionUpdated` (`sub.cancel_at_period_end`) | `routes/stripeWebhook.ts` | `Subscription.cancel_at_period_end` | **CONFIRMED UNAFFECTED** | None | None |
| Plan resolution via `sub.status` | multiple | `Subscription.status` | **CONFIRMED UNAFFECTED** | None | None |

## Detailed findings

### 1. Invoice Line Items — CONFIRMED AFFECTED, FIXED (Sprint 1)

Already fully documented in `SPRINT_PLAN.md` (Sprint 1) and
`IMPLEMENTATION_PROGRESS.md`. Summary: `line.type`, `line.price`, and
`line.subscription` were all relocated (to `line.parent.type`,
`line.pricing.price_details.price`, and
`line.parent.subscription_item_details.subscription` respectively). Fixed via
new V2 extraction functions in `stripeMrr.ts`, shadow-mode validated against
10 real invoices, write path gated behind `MRR_EXTRACTION_V2_WRITE` (still
off pending the separate contractual-vs-collected decision, now resolved as
Option A — see `SPRINT_PLAN.md`).

### 2. Subscription period fields — CONFIRMED AFFECTED, NOT FIXED (excluded from Sprint 1 by operator instruction)

Real `Subscription` object fetched live (`sub_1TbFmF2QqK3pYun3TuN01mGI`) has
`current_period_start`/`current_period_end` **absent at the top level**
(`undefined`); the real values are only present per-item, at
`items.data[0].current_period_end` (confirmed: `1787730709`, a valid
timestamp, while the top-level field was `undefined` on the exact same
object).

**Every code path that reads the top-level field silently gets `undefined`
instead of throwing**, because all of them use optional field access
(`sub.current_period_end`) or an `if (sub.current_period_end)` guard — so the
failure mode is **silent no-op**, not a crash:

- `stripeWebhook.ts` `handleCheckoutSessionCompleted` (~line 167-174): fetches
  the subscription after checkout, reads `sub.current_period_end` to set
  `user.billingPeriodEnd`/`billingPeriodStart` — **never sets them**
  (condition `if (sub.current_period_end)` is always false).
- `stripeWebhook.ts` `handleCustomerSubscriptionCreated` (~line 539-543): same
  pattern, reading the field directly off the webhook payload.
- `stripeWebhook.ts` `handleCustomerSubscriptionUpdated` (~line 605-609): same
  pattern.
- `stripeWebhook.ts` `handleCustomerSubscriptionDeleted` (~line 700): uses
  `sub.current_period_end ?? sub.cancel_at ?? sub.ended_at ?? now` as a
  three-way fallback chain — `cancel_at`/`ended_at` **are** still top-level
  fields (not part of this restructuring, per Stripe's general pattern of
  only moving *recurring-billing-cycle* fields to the item level), so this
  specific handler **degrades to a less-precise but non-null fallback**
  rather than fully failing — lower severity than the other three call sites.
- `services/stripe.ts` `getSubscriptionPeriodEnd()`: `if (sub.status !==
  'active' || !sub.current_period_end) return null` — **this function
  returns `null` for every single call**, unconditionally, regardless of the
  subscription's real status, since `current_period_end` is always falsy now.
- `services/stripe.ts` `getPlanAndEmailForStripeCustomer()`: only the
  `currentPeriodEnd` field of its return value is affected (always
  `undefined`); `plan`, `email`, `subscriptionId` resolution in the same
  function reads `sub.items.data[0].price`, which is unaffected (confirmed
  §3 below) and continues to work correctly.

**Business impact:** `User.billingPeriodStart`/`billingPeriodEnd` are very
likely stale or never-set for any subscription event that has occurred since
this Stripe API version took effect. This feeds
`enforceSubscriptionState()`'s grace-period/downgrade-at-period-end logic
(`utils/subscriptionGuard.ts`) — the practical risk is that a canceled
subscription's automatic downgrade-to-free at the correct period end may not
be firing on schedule, or usage-reset-date display to users may be wrong.
**Not fixed in this audit or in Sprint 1, per explicit operator instruction.**
Requires its own decision/sprint given it touches subscription-lifecycle
webhook code directly (similar risk class to the MRR fix, arguably higher
since it affects access-control timing, not just a reporting number).

### 3. `Subscription.items.data[].price` — CONFIRMED UNAFFECTED

Real data (`sub_1TbFmF2QqK3pYun3TuN01mGI` and the 3 live active subscriptions
sampled during Sprint 1 validation) shows this is still a fully expanded
`Price` object (`id`, `recurring.interval`, `recurring.interval_count`,
`unit_amount` all present inline). `getPlanFromSubscriptionItems()` and the
price-resolution branch of `getPlanAndEmailForStripeCustomer()` both read
`item.price?.id` / `item.price` correctly against this shape. **No fix
needed.**

### 4. `Checkout.Session` — CONFIRMED UNAFFECTED

Fetched a real, completed checkout session live. `session.subscription`
(string ID), `session.customer` (string ID), `session.customer_details.email`,
`session.payment_status`, `session.status`, `session.mode`,
`session.metadata` are all present exactly where `stripeWebhook.ts`'s
`handleCheckoutSessionCompleted` and every relevant route in `billing.ts`
expect them. **No fix needed.**

### 5. `Invoice.last_payment_error` — UNCONFIRMED

`handleInvoicePaymentFailed` (`stripeWebhook.ts`) reads
`invoice.last_payment_error` for logging/alerting on failed payments. The
full top-level key list of a real (paid) invoice object, captured during
this audit, does **not** include `last_payment_error` — it includes
`last_finalization_error` instead, which is a different concept (finalizing
a draft invoice, not a payment attempt failing). However, this evidence comes
from a **successfully paid** invoice, where a payment-error field would
plausibly be absent/null in *any* API version regardless of restructuring —
so this is not proof the field is gone, only a data point consistent with
that possibility. **Confirming this would require inspecting a real
`invoice.payment_failed` event's payload** (not done in this audit — no
recent failed-and-still-relevant invoice was available to fetch, and
manufacturing a real payment failure to test against a live account was
judged out of scope for a read-only audit). Flagged as an open, unconfirmed
risk, not a confirmed defect.

### 6. `Customer` object fields — UNVERIFIED, LOW RISK

`findStripeCustomerIdByEmail()` and the non-period parts of
`getPlanAndEmailForStripeCustomer()` read `customer.deleted`, `customer.email`,
`customer.metadata`. These were not independently fetched live in this audit.
Assessed as low risk because: (a) they are basic, long-stable Customer object
fields, not part of the Invoice-line-item or Subscription-period redesigns
observed elsewhere, and (b) Stripe's object redesigns in this API generation
have specifically targeted billing-cycle and invoice-line-item structures, not
core Customer identity fields. Recommend a quick confirmatory check
(`customers.retrieve` on a real customer id) before or during any future work
that touches this function, but not urgent enough to block anything currently
planned.

## Confirmed unaffected fields (safe to rely on as-is)

`Subscription.status`, `Subscription.cancel_at_period_end`,
`Subscription.cancel_at`, `Subscription.ended_at`, `Subscription.trial_start`,
`Subscription.trial_end`, `Subscription.items.data[].price` (full object),
`Checkout.Session.subscription`, `.customer`, `.customer_details.email`,
`.payment_status`, `.status`, `.mode`, `.metadata`, `Invoice.period_start`/
`.period_end` (top-level), `Invoice.lines.data[].period.start/end`,
`Invoice.amount_paid`/`.currency`/`.customer`.

## Confirmed affected fields

`Invoice.lines.data[].type` (gone), `Invoice.lines.data[].price` (always
null), `Invoice.lines.data[].subscription` (gone),
`Invoice.subscription` (gone, top-level), `Subscription.current_period_start`
(gone, top-level), `Subscription.current_period_end` (gone, top-level).

## Required fixes (not implemented — for a future, separately-scoped sprint)

1. **Subscription period-field fix** (the highest-priority item from this
   audit): update `handleCheckoutSessionCompleted`,
   `handleCustomerSubscriptionCreated`, `handleCustomerSubscriptionUpdated`,
   `handleCustomerSubscriptionDeleted` (`stripeWebhook.ts`) and
   `getSubscriptionPeriodEnd`/`getPlanAndEmailForStripeCustomer`
   (`services/stripe.ts`) to read `sub.items.data[0].current_period_start`/
   `current_period_end` instead of the top-level fields, with the same
   feature-flagged, shadow-validated rollout discipline used for the MRR fix
   (this is billing-access-control-adjacent code, not just reporting, so if
   anything it warrants at least equal caution).
2. **Confirm or rule out the `last_payment_error` risk** by inspecting a real
   `invoice.payment_failed` webhook payload (naturally occurring, not
   manufactured) the next time one arrives, or by asking Stripe support /
   consulting their API changelog for this API version directly.
3. **Optional, low-priority:** confirm `Customer` object field stability with
   a live `customers.retrieve` call before or during any future work in that
   area.

## Relationship to Sprint 2

Per operator instruction: **this audit does not delay Sprint 2.** No new
issue was found here that constitutes a *previously-unknown* billing-
correctness defect requiring an immediate stop — the Subscription
period-field issue was already known and explicitly excluded from Sprint 1's
scope by the operator before this audit began; this document formalizes and
completes that already-acknowledged finding with full evidence and a
prioritized fix list, rather than surfacing something new that would warrant
pausing the taxonomy work in Sprint 2.
