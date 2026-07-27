# METRICS_DICTIONARY.md — VideoText

Status: design only. This document is the narrative companion to METRICS.md. Every
metric's mechanical fields (source of truth, SQL sketch, tables, filters,
timezone, refresh, cache, owner, confidence) are defined once in METRICS.md and
are not repeated here in full — this file adds **business purpose, worked
examples, and known caveats** for the metrics complex or risky enough to warrant
it. Simpler metrics (Registered Users, New Users, Jobs Created, etc.) should be
read directly from METRICS.md; duplicating their mechanical definition here would
create exactly the "two sources disagree" risk this whole redesign exists to
prevent.

---

### MRR (Monthly Recurring Revenue)

- **Definition:** Normalized monthly-equivalent value of all currently-active
  recurring subscriptions.
- **Business purpose:** The single number that answers "how much predictable
  revenue does the business have right now." Drives valuation multiples, hiring
  plans, and runway calculations.
- **Formula:** `Σ normalized_monthly_cents` across exactly one current-state row
  per active `stripe_subscription_id` (annual plans ÷ 12).
- **Tables:** `business_subscriptions` (current-state, deduplicated).
- **Filters/Exclusions:** `status='active'`; demo/founder/internal accounts cannot
  appear here by construction (no `stripe_subscription_id`).
- **Worked example:** A customer on a $40/mo Pro plan, active for 8 months, has
  exactly **one** `business_subscriptions` row showing `normalized_monthly_cents =
  4000`. They contribute $40 to MRR — not $320 (8 × $40), which is what the old
  append-only-ledger bug would have produced if that customer's 8 renewal
  invoices were each summed as a separate "active" row.
- **Known caveats:** (1) Multi-currency subscriptions require an FX-normalization
  step not yet designed — until then, MRR should be reported per-currency, never
  silently summed across currencies. (2) A subscription mid-proration (plan
  change effective immediately) can briefly have two Stripe invoice events in
  flight; the webhook handler must treat `business_subscriptions` as
  last-write-wins keyed by Stripe's own event timestamp, not by webhook arrival
  order, to avoid a race where the older event overwrites the newer state.
- **Owner:** Finance.

### ARR (Annual Recurring Revenue)

- **Definition:** `MRR × 12`. Purely a scale/investor-communication convention —
  not a separate measurement.
- **Business purpose:** Standard SaaS benchmark for comparing against peers and
  for ARR-multiple-based valuation conversations.
- **Known caveats:** ARR is not a forecast — it does not account for expected
  churn over the next 12 months. Any investor-facing "ARR" figure should be
  labeled "current run-rate ARR" to avoid it being misread as a revenue
  projection.
- **Owner:** Finance.

### Active Users (DAU/WAU/MAU)

- **Definition:** Distinct **registered-or-above** identities with ≥1 qualifying
  product action in the trailing 1/7/30 days. Guests are reported as a parallel,
  separately labeled "Guest DAU," never blended in.
- **Business purpose:** Core engagement health signal; the numerator for
  stickiness ratios (DAU/MAU).
- **Worked example:** A visitor uploads 3 files across 3 anonymous sessions
  without ever logging in. Under the legacy model this was 3 "active users."
  Under the canonical model, once persistent `anonymous_id` stitching is in
  place (USER_TAXONOMY.md §4), this is 1 Guest DAU — and 0 canonical Active
  Users, because guests never count toward the canonical DAU/MAU used in
  investor/board reporting.
- **Known caveats:** Stickiness ratios (DAU/MAU) computed before the
  `anonymous_id` stitching work lands will be understated for guest-heavy
  periods, since guest activity is entirely excluded rather than deduplicated —
  this is intentional (a conservative undercount is safer than a guest-inflated
  overcount) but should be flagged in any report until guest stitching ships.
- **Owner:** Product/Growth.

### Activation Rate

- **Definition:** % of a signup cohort reaching the defined activation event
  (first completed job within 24h of signup) — see USER_TAXONOMY.md, guests are
  structurally excluded because "signup" requires a `business_users` row.
- **Business purpose:** Early predictor of whether onboarding is working;
  leading indicator for paid conversion.
- **Formula:** `activated_in_cohort / new_users_in_cohort`.
- **Known caveats:** The 24-hour window is a **governed constant**, not a law of
  nature — changing it changes every historical activation-rate number
  retroactively if recomputed naively. Any change to this window must go through
  the metric-versioning process (DATA_GOVERNANCE.md) and produce `activation_rate_v2`
  rather than silently redefining `activation_rate_v1` for past cohorts.

### Churn (User Churn vs. Revenue Churn)

- **Definition:** Two distinct numbers, always reported together, never as one
  blended "churn rate": **User churn** = canceled subscriptions ÷ active
  subscriptions at period start. **Revenue churn** = canceled MRR ÷ total MRR at
  period start.
- **Business purpose:** User churn answers "are we losing customers"; revenue
  churn answers "are we losing revenue" — these diverge sharply if churned
  customers are disproportionately low- or high-value, which is exactly the kind
  of signal that gets lost if only one number is tracked.
- **Known caveat:** A mid-cycle plan **downgrade** via the Stripe customer
  portal (Pro → Basic without a full cancellation) is not a churn event under
  either definition, but it *is* a revenue-churn-adjacent event ("contraction").
  The canonical model should track `expansion_mrr` and `contraction_mrr` as
  separate line items alongside churn, sourced from `business_subscription_history`
  (the audit ledger), so downgrades are never invisible.
- **Owner:** Finance.

### LTV (Lifetime Value)

- **Definition:** Predicted total revenue from a paying customer over their
  relationship with VideoText.
- **Formula (interim, low cohort maturity):** `ARPPU / monthly_revenue_churn_rate`.
- **Formula (target, once ≥12 months of cohort data exist):** cohort-survival
  model — actual observed revenue retention curve per signup cohort, extrapolated
  rather than assumed constant-hazard.
- **Known caveats:** The simple formula assumes a constant monthly churn rate
  forever, which is rarely true (churn is typically front-loaded in the first 1–3
  months). **Every report using LTV must state which formula version produced
  it** — an investor update citing "LTV: $X" without a model version is not a
  usable number, it's a guess dressed as a fact. This is precisely the kind of
  ambiguity Phase 1 found across the existing MRR/plan metrics, and the fix is
  the same: name and version the model, don't just report a number.
- **Owner:** Finance/Data Science.

### AI Cost / Gross Margin

- **Definition:** AI Cost = attributable spend on transcription/LLM calls per
  job. Gross Margin = `(Revenue − COGS) / Revenue`, where COGS = customer-
  attributable AI cost + allocated infra cost + payment processing fees.
- **Business purpose:** Unit economics — is each customer's usage actually
  profitable, and is the business's core loop profitable at scale.
- **Worked example:** A Pro customer pays $40/mo and processes 200 minutes of
  video at an estimated $0.006/min Whisper cost = $1.20 in AI cost that month.
  Their gross contribution before infra/processing-fee allocation is ~$38.80.
  Aggregate this across all paying customers in the period, net of internal/demo
  usage (which is opex, not COGS), to get blended gross margin.
- **Known caveats:** (1) The internal cost field is an **estimate computed at
  job-processing time**, not a billed amount — it must be reconciled monthly
  against the actual OpenAI/Deepgram invoice, and any month where the two
  diverge by more than a defined tolerance should be flagged rather than
  silently trusted. (2) Infra cost allocation (how much of the monthly hosting
  bill "belongs" to a given job) requires an explicit, documented allocation
  methodology (e.g., per-minute-processed or per-GB-transferred) — whichever is
  chosen must be versioned like any other metric, since changing the allocation
  method changes historical gross margin retroactively if misapplied.
- **Owner:** Finance/Platform.

### Conversion Rate (multi-stage)

- **Definition:** There is no single "conversion rate" — the canonical model
  defines five distinct, separately-tracked stages in `business_conversion`:
  Visitor→Guest, Guest→Registered, Free→Trial, Trial→Paying, Free→Paying
  (direct, skipping trial). Any report using the bare term "conversion rate"
  must specify which stage.
- **Known caveat:** The existing dashboard's `paidConversionPct` (Phase 1)
  conflated "any user created in the last 14 days whose current plan isn't
  free" with "conversion," which silently counted demo-account creation as a
  paid conversion. The canonical Free→Paying/Trial→Paying stages require a
  **non-null `stripe_subscription_id`**, structurally preventing that failure
  mode from recurring.
- **Owner:** Growth/Finance (shared — Growth owns top-of-funnel stages, Finance
  owns Trial→Paying and Free→Paying since they're revenue events).

---

## Reading the rest of the catalog

All remaining metrics (Visitors, Anonymous Visitors, Guest Users, Registered
Users, Verified Users, New Users, Returning Users, Free Users, Trial Users,
Paying Customers, Active Subscribers, Cancelled Subscribers, Revenue, Refunds,
ARPU, ARPPU, Retention, Jobs Created/Completed/Failed, Average Jobs/User,
Average Jobs/Customer, Tool Usage) have their complete definition, SQL sketch,
tables, joins, filters, timezone, refresh, cache, owner, and confidence level
specified in **METRICS.md** — treat that file as the machine-readable half of
this dictionary and this file as the "why does this number look the way it does"
half.
