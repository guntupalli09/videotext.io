# METRICS.md — VideoText Canonical Metric Definitions

Status: design only. Every metric below assumes the `dim_user.user_class` /
`include_in_business_metrics` model from USER_TAXONOMY.md and the layered tables
from ANALYTICS_ARCHITECTURE.md (`business_users`, `business_subscriptions`,
`business_revenue`, `business_jobs`, `business_growth`, `business_retention`,
`business_conversion`). Names like `business_*` are proposed canonical models, not
existing tables — this is a target-state specification.

## Global conventions (apply to every metric unless explicitly overridden)

- **Timezone:** UTC everywhere in storage and computation. Day buckets are
  `[00:00:00.000Z, 24:00:00.000Z)`. Any UI localization is a display-layer concern
  only and must pass an explicit `timeZone` parameter — never implicit
  browser-local formatting of a UTC timestamp.
- **Standard exclusion filter** (referred to below as `STD_FILTER`):
  `business_users.include_in_business_metrics = true` — excludes `founder`,
  `internal`, `developer`, `qa`, `demo`, `bot`, `deleted`. Any metric that
  intentionally includes a normally-excluded class (e.g., "Guest Users") says so
  explicitly.
- **Cache tiers** referenced below: **T0** live/no-cache · **T1** Redis hot cache
  (15–60s, shared across instances) · **T2** rollup table refreshed on a schedule
  · **T3** materialized view refreshed nightly or on-trigger · **T4** external
  system of record (Stripe/PostHog), queried directly, not locally cached for
  reconciliation purposes.
- **Confidence:** **High** = single deterministic source, audited · **Medium** =
  derived/normalized with judgment calls · **Low** = third-party black box or
  heuristic (session stitching, bot detection).

---

## A. Audience & Identity

| Metric | Business Definition | Source of Truth & Computation | Exclusions | Timezone / Refresh / Cache | Owner | Confidence |
|---|---|---|---|---|---|---|
| **Visitors** | Every distinct browser/session that loaded the app, authenticated or not | Web analytics edge layer (PostHog `$pageview` distinct sessions), NOT Postgres | None — this is the one metric that intentionally includes everyone, incl. bots (bots reported as a sub-slice) | UTC; T4 (PostHog), refreshed live in PostHog, ingested into `business_growth` nightly for trend charts | Growth/Marketing | Low (PostHog session/bot heuristics) |
| **Anonymous Visitors** | Visitors who never reached a persistent `anonymous_id` (bounced before any product action) | `Visitors` − distinct `anonymous_id` count in `business_users` (guest class) | None | UTC; T4 → T3 nightly | Growth/Marketing | Low |
| **Guest Users** | Distinct `anonymous_id`s that performed at least one product action (upload, job) without registering | `SELECT COUNT(DISTINCT anonymous_id) FROM business_users WHERE user_class='guest'` | Excludes bots; explicitly **includes** guests (this is an audience metric) | UTC; T2, hourly | Growth/Product | Medium (depends on anonymous_id persistence, §4 of USER_TAXONOMY) |
| **Registered Users** | Rows in `business_users` with a completed identity (`user_class NOT IN ('guest','anonymous_visitor')`) | `SELECT COUNT(*) FROM business_users WHERE user_class NOT IN ('guest') AND STD_FILTER` | `STD_FILTER` | UTC; T2, hourly (`business_growth.total_registered`) | Growth/Product | High |
| **Verified Users** | Registered users with a confirmed contact channel (`is_verified=true`) | `... WHERE is_verified AND STD_FILTER` | `STD_FILTER` | UTC; T2, hourly | Growth/Product | High |
| **Activated Users** | Verified/free/trial/paying users who reached the product's defined "aha" event within N hours of signup (VideoText: first completed job within 24h) | `business_growth` cohort model: `EXISTS(business_jobs WHERE user_id=u.id AND status='completed' AND completed_at <= u.created_at + interval 'N hours')` | `STD_FILTER`; `N` is a governed constant (Part 8), currently 24h | UTC; T3, nightly (cohort windows don't need real-time) | Growth/Product | High |
| **Active Users (DAU/WAU/MAU)** | Distinct **registered+ identities** (never guests, never demo) with ≥1 qualifying product event in the trailing 1/7/30 days | `SELECT COUNT(DISTINCT user_id) FROM business_jobs j JOIN business_users u ON u.id=j.user_id WHERE j.created_at >= now()-interval AND STD_FILTER` | `STD_FILTER`; **guests reported as a separate "Guest DAU" metric, never blended into canonical DAU/MAU** (fixes Phase 1 §2.4) | UTC; T2, hourly rollup + T1 60s cache for live card | Product/Growth | High |
| **New Users** | Registered users whose `created_at` falls in the reporting window | `SELECT COUNT(*) FROM business_users WHERE created_at BETWEEN :start AND :end AND STD_FILTER` | `STD_FILTER` | UTC; T2, hourly | Growth | High |
| **Returning Users** | Active users in the current window who were also active in the prior equal-length window | `business_retention` cohort join (current-period active ∩ prior-period active) | `STD_FILTER` | UTC; T3, nightly | Product | Medium |
| **Free Users** | `business_users.user_class='free'` | `SELECT COUNT(*) FROM business_users WHERE user_class='free' AND STD_FILTER` | `STD_FILTER` | UTC; T2, hourly | Growth | High |
| **Trial Users** | `business_users.user_class='trial'` and `trial_ends_at > now()` | `SELECT COUNT(*) ... WHERE user_class='trial' AND trial_ends_at > now() AND STD_FILTER` | `STD_FILTER` | UTC; T1, 60s (small population, cheap to compute live) | Growth/Sales | High |

## B. Revenue & Subscriptions

| Metric | Business Definition | Source of Truth & Computation | Exclusions | Timezone / Refresh / Cache | Owner | Confidence |
|---|---|---|---|---|---|---|
| **Paying Customers** | Distinct `business_users` with a Stripe subscription in `active`/`trialing`/`past_due` (dunning) state | `SELECT COUNT(DISTINCT u.id) FROM business_users u JOIN business_subscriptions s ON s.user_id=u.id WHERE s.status IN ('active','trialing','past_due') AND STD_FILTER` | `STD_FILTER`; **must** require `stripe_subscription_id IS NOT NULL` — no row may be "paying" without a live Stripe object (fixes Phase 1 demo-account and any future manual-grant contamination) | UTC; T2, refreshed on every Stripe webhook + reconciled nightly against live Stripe API (T4) | Finance/RevOps | High |
| **Active Subscribers** | Same population as Paying Customers, counted at the **subscription** grain (one enterprise account can have >1 subscription) | `SELECT COUNT(*) FROM business_subscriptions WHERE status='active'` | dedup by `stripe_subscription_id` — exactly one current-state row per subscription (fixes Phase 1 append-only double-count) | UTC; T2 (webhook-driven) | Finance/RevOps | High |
| **Cancelled Subscribers** | Subscriptions with `status='canceled'` whose cancellation event fell in the reporting window | `SELECT COUNT(*) FROM business_subscriptions WHERE status='canceled' AND canceled_at BETWEEN :start AND :end` | none additional | UTC; T2 | Finance/RevOps | High |
| **MRR** | Sum of normalized monthly-equivalent recurring price across all currently-active subscriptions, **one row per subscription** | `SELECT SUM(normalized_monthly_cents) FROM business_subscriptions WHERE status='active'` — `business_subscriptions` is a **current-state table** (unique key = `stripe_subscription_id`), not an append-only ledger | none additional; explicitly forbids summing a ledger of historical invoices (the exact Phase 1 §2.1 bug) | UTC; T2, recomputed on every relevant Stripe webhook, reconciled nightly against Stripe's live subscription list (T4) | Finance | High |
| **ARR** | `MRR × 12` | Derived, same source | same as MRR | UTC; same cadence as MRR | Finance | High |
| **Revenue** (recognized) | Sum of actual invoice line amounts collected in the period (cash/accrual basis stated explicitly per report) | `SELECT SUM(amount_cents) FROM business_revenue WHERE type='subscription' AND invoice_paid_at BETWEEN :start AND :end` — `business_revenue` is a normalized mirror of Stripe invoice line items | Excludes refunded/voided lines (tracked separately, see Refunds) | UTC; T2, webhook-driven, reconciled nightly against Stripe (T4) | Finance | High |
| **Refunds** | Sum of refunded amounts in the period, kept as a **separate signed ledger**, never netted silently into Revenue | `SELECT SUM(amount_cents) FROM business_revenue WHERE type='refund' AND created_at BETWEEN :start AND :end` | none | UTC; T2, webhook-driven (`charge.refunded`) | Finance | High |
| **ARPU** | Average revenue per **registered user** (free + trial + paying), i.e. monetization efficiency across the whole base | `MRR / COUNT(business_users WHERE user_class NOT IN ('guest') AND STD_FILTER)` | `STD_FILTER` | UTC; T2 | Finance | High |
| **ARPPU** | Average revenue per **paying customer only** | `MRR / COUNT(DISTINCT paying business_users)` | `STD_FILTER`, `stripe_subscription_id IS NOT NULL` | UTC; T2 | Finance | High |
| **LTV** | Predicted/observed total revenue per paying customer over their lifetime | `ARPPU / monthly_churn_rate` (cohort-survival model preferred over the simple formula once ≥12 months of cohort data exist) | `STD_FILTER` | UTC; T3, nightly (cohort-based) | Finance/Data Science | Medium (model-dependent — flag simple-formula vs. cohort-survival explicitly in every report) |

## C. Retention, Churn, Conversion

| Metric | Business Definition | Source of Truth & Computation | Exclusions | Timezone / Refresh / Cache | Owner | Confidence |
|---|---|---|---|---|---|---|
| **Retention** | % of a signup/subscriber cohort still active (or still paying, stated explicitly which) at N days/months after cohort start | `business_retention` cohort table: cohort-week × N-day-offset matrix | `STD_FILTER` | UTC; T3, nightly | Product/Growth | Medium |
| **Churn** | % of paying customers (or % of MRR) lost in the period, relative to the paying base at period start | User churn: `canceled_in_period / active_at_period_start`. Revenue churn: `canceled_mrr_in_period / mrr_at_period_start` — **both reported, never conflated** | none additional (subscription-grain, already excludes non-payers) | UTC; T2, monthly + rolling 30-day | Finance | High |
| **Activation Rate** | % of new registered users who become Activated Users within the governed window | `activated_in_cohort / new_users_in_cohort` from `business_growth` | `STD_FILTER` — **guests can never appear in the numerator or denominator** (fixes Phase 1: guests structurally can't be "activated" today; canonical model keeps that exclusion but makes it explicit and documented, not accidental) | UTC; T3, nightly | Growth/Product | High |
| **Conversion Rate** | Overall term — must always be qualified by stage: (a) Visitor→Guest, (b) Guest→Registered, (c) Free→Trial, (d) Trial→Paying, (e) Free→Paying direct. Each is its own named metric in `business_conversion`, computed once, in one place | `business_conversion` funnel table, one row per stage per cohort | `STD_FILTER` (stage b onward); stage (a)/(b) intentionally include guests, since that's what they measure | UTC; T3, nightly | Growth | Medium (top-of-funnel stages depend on anonymous_id persistence) |

## D. Product / Operations

| Metric | Business Definition | Source of Truth & Computation | Exclusions | Timezone / Refresh / Cache | Owner | Confidence |
|---|---|---|---|---|---|---|
| **Jobs Created** | Count of `business_jobs` rows created in the period | `SELECT COUNT(*) FROM business_jobs WHERE created_at BETWEEN :start AND :end` | Reported **twice**: "All Jobs" (incl. guest, tagged) and "Customer Jobs" (`STD_FILTER` applied) — never a single blended number (fixes Phase 1 §1.7/§2.4 job-count ambiguity) | UTC; T2, hourly rollup + T1 60s live card | Platform/Infra | High |
| **Jobs Completed** | `business_jobs WHERE status='completed'`, same dual reporting as above | same pattern | same | UTC; T2/T1 | Platform/Infra | High |
| **Jobs Failed** | `business_jobs WHERE status='failed'`, same dual reporting | same pattern | same | UTC; T2/T1 | Platform/Infra | High |
| **Average Jobs/User** | `Jobs Created (customer) / Active Users` for the period | Derived from `business_jobs` + `business_users`, `STD_FILTER` applied to both sides | `STD_FILTER` | UTC; T2 | Product | High |
| **Average Jobs/Customer** | `Jobs Created (customer) / Paying Customers` for the period | Derived, `STD_FILTER` + `stripe_subscription_id IS NOT NULL` | `STD_FILTER` | UTC; T2 | Product/CS | High |
| **Tool Usage** | Job count broken out by `tool_type`, for product-mix and roadmap decisions | `SELECT tool_type, COUNT(*) FROM business_jobs WHERE STD_FILTER GROUP BY tool_type` | `STD_FILTER` for the "customer usage" view; unfiltered view kept for capacity planning | UTC; T2, hourly | Product | High |

## E. Cost & Margin

| Metric | Business Definition | Source of Truth & Computation | Exclusions | Timezone / Refresh / Cache | Owner | Confidence |
|---|---|---|---|---|---|---|
| **AI Cost** | Actual/estimated spend on transcription + LLM calls attributable to jobs | `SELECT SUM(total_ai_cost_micros)/1e6 FROM business_jobs WHERE completed_at BETWEEN :start AND :end` — **reconciled monthly against the vendor (OpenAI/Deepgram) invoice**, discrepancy logged, not silently trusted | Reported both **with and without** internal usage (founder/internal/qa/demo still cost real money and must appear in a "total infra spend" view, even though excluded from customer-facing unit economics) | UTC; T2 hourly (estimate) reconciled T4 monthly (actual invoice) | Finance/Platform | Medium (estimate) → High (post vendor-invoice reconciliation) |
| **Gross Margin** | `(Revenue − COGS) / Revenue`, where COGS = AI Cost + proportional infra (compute/storage/bandwidth) + payment processing fees | `business_revenue` − (`business_jobs` AI cost + allocated infra cost from `fact_infra_cost`) | `STD_FILTER` on the revenue side; AI cost uses **customer-attributable only** (internal/demo AI spend is opex, not COGS against revenue) | UTC; T3, monthly (infra costs are billed monthly, no finer granularity is meaningful) | Finance | Medium (depends on infra cost allocation methodology, which must be documented and versioned like any other metric) |

---

## Notes on metrics intentionally NOT given a single formula

**LTV** and **Gross Margin** are flagged Medium confidence by design: they are
model outputs, not raw aggregations. Every report that cites them must state which
model version produced them (see DATA_GOVERNANCE.md, metric versioning) — this is
a deliberate architectural choice, not a gap. A model-derived number presented with
false High confidence is more dangerous than the same number correctly labeled
Medium.
