# STRIPE_RECONCILIATION_PLAN.md — VideoText

Status: design/blueprint only. This is the permanent safety net (Sprint 3;
ships before the MRR schema migration in Sprint 6, and stays running forever
afterward — reconciliation is not a one-time migration check, it is ongoing
production infrastructure).

## Design principle

Stripe is always compared **against**, never merged **into**, the canonical
layer at read time. The nightly job pulls live Stripe state, computes the same
aggregate independently, and diffs it against `business_subscriptions`/
`business_revenue`. A clean diff is the *evidence* that the canonical layer is
correct — it is not itself the source used to answer "what is our MRR" on the
dashboard (that stays `business_subscriptions`, for latency and Stripe
rate-limit reasons).

## Per-domain reconciliation

| Domain | What's compared | Method | Tolerance | Frequency | Alerting |
|---|---|---|---|---|---|
| **MRR** | `SUM(business_subscriptions.normalized_monthly_cents WHERE status='active')` vs. Stripe's live `subscriptions.list(status='active')` normalized the same way (annual ÷12, recurring-only) | Full re-fetch of active subscriptions, independent recomputation, not a cached Stripe number | 1% or $50, whichever is larger (accounts for in-flight webhook lag of a few minutes) | Nightly (02:00 UTC, off-peak) + on-demand via the dashboard's "Verify against Stripe" button | Page finance/platform on-call if delta exceeds tolerance for 2 consecutive nightly runs (single-run spikes can be webhook-lag noise; sustained drift is the real signal) |
| **ARR** | Derived (`MRR × 12`) | Same as MRR | Same as MRR | Same as MRR | Same as MRR |
| **Revenue** | Sum of `business_revenue` invoice lines (type='subscription') for the period vs. Stripe's invoice list for the same period | Pull Stripe invoices for the trailing 24–48h window (covers any late-arriving webhook), diff line-item count and total | 0.5% (revenue reconciliation should be tighter than MRR since it's a closed historical period, not a live snapshot) | Nightly, plus a stricter month-end close reconciliation run against the full closed month | Page finance on sustained drift; month-end run failure blocks calling the books "closed" for that period until resolved |
| **Customers (Paying Customer count)** | `COUNT(business_users WHERE user_class='paying_customer')` vs. `COUNT(DISTINCT customer) FROM stripe.subscriptions.list(status IN active,trialing,past_due)` | Direct count comparison | **Zero tolerance** — any nonzero delta is a real defect (either a sync bug or a paid-looking account with no Stripe backing, exactly the demo-account failure class) | Nightly | Page on any nonzero delta |
| **Refunds** | `SUM(business_revenue WHERE type='refund')` vs. Stripe's `charge.refunded` events for the period | Event-count and amount diff | 0% count mismatch tolerance; amount tolerance = $1 (currency rounding only) | Nightly | Page on count mismatch; log on amount rounding within tolerance |
| **Subscription states** | `business_subscriptions.status` per subscription vs. Stripe's live status | Per-subscription status diff, not just aggregate counts | Zero tolerance — a stale/incorrect status is a correctness bug regardless of whether it currently affects an aggregate | Nightly (full table) + real-time (webhook handler asserts the state it's about to write matches what it just read from Stripe, when the event type warrants a live re-fetch, e.g. after `customer.subscription.updated`) | Log per-row mismatches; page if mismatch count exceeds a small absolute threshold (e.g., >5 subscriptions), since a handful can be timing noise but a larger count signals a systemic webhook-processing problem |
| **Payment failures** | `business_users` marked `past_due`/`subscriptionStatus` vs. Stripe's own `invoice.payment_failed` history for the same customers | Cross-reference count and recency | Zero tolerance on presence/absence; timing tolerance of a few minutes for webhook propagation | Nightly + real-time webhook-level assertion | Page if a customer shows `past_due` in Stripe but not reflected locally (or vice versa) for more than one reconciliation cycle |

## Why nightly (not real-time) for aggregates, but real-time for individual events

Aggregate reconciliation (MRR, ARR, customer counts) is deliberately nightly:
running a full Stripe subscription-list pull on every dashboard request would
be slow and risks Stripe API rate limits at scale. Real-time integrity is
instead enforced at the **event** level — every webhook handler already knows
exactly which subscription it just touched, so a lightweight, single-object
re-fetch-and-compare immediately after processing a `customer.subscription.*`
event catches drift within seconds for that one record, while the nightly job
catches anything the event-level check might have missed (a webhook that never
arrived at all, for instance).

## Alert routing and escalation

- **Log-only**: single-run tolerance breaches, rounding-level discrepancies.
- **Low-urgency alert (Slack/email, next-business-day SLA)**: first occurrence
  of a sustained (2-run) tolerance breach outside of MRR/customer-count.
- **Page (on-call, immediate)**: any MRR/customer-count sustained breach, any
  nonzero paying-customer-count delta, any payment-failure state mismatch.
- **Blocking**: month-end revenue reconciliation failure blocks financial
  close sign-off until root-caused — this is the one case where the
  reconciliation job's failure should stop a business process, not just alert
  on it.
