# ANALYTICS_ARCHITECTURE.md — VideoText Analytics Platform Design

Status: design only. Target architecture, not a migration plan (see
IMPLEMENTATION_ROADMAP.md for sequencing).

## 1. Design principle

**One metric, one definition, one code path.** Any dashboard, SQL query, Stripe
report, or Claude/LLM analysis must be able to ask "what is MRR" and get the same
answer, because there is exactly one place MRR is computed, and everything else
reads that answer instead of recomputing it. This is the single structural fix for
every discrepancy found in Phase 1.

## 2. Source of truth per domain (Part 3)

| Domain | Authoritative Source | Why authoritative | Anti-pattern to avoid |
|---|---|---|---|
| **Users** | Postgres `business_users` (canonicalized from the raw `User` table) | Only place identity, auth state, plan, and taxonomy (guest/demo/internal/paying) intersect. Stripe doesn't know guests or free users exist; PostHog identity is probabilistic pre-merge. | Reading `plan` or user counts directly off the raw `User` table anywhere outside the canonical layer (this is exactly how demo accounts leaked into "paid conversion" in Phase 1). |
| **Subscriptions** | **Stripe**, mirrored into `business_subscriptions` via webhook | Stripe is the actual billing engine — it is the money. Postgres must be a faithful, deduplicated mirror, never an independent opinion. | Treating a locally-stored ledger as authoritative when it can drift from Stripe (Phase 1's append-only `SubscriptionSnapshot` bug). |
| **Revenue / Payments** | **Stripe** invoices/charges, normalized into `business_revenue` | Only Stripe has authoritative invoice-line-level detail (proration, tax, refunds, currency). | Deriving revenue from subscription price × time instead of actual invoiced/collected amounts. |
| **Jobs** | Postgres `business_jobs`, written by the worker | Stripe/PostHog have no concept of a "job." Must be reconciled nightly against Bull/Redis job-completion counters to catch silent write failures (Phase 1 §2.5). | Treating Bull/Redis state and the Postgres `Job` table as interchangeable without a reconciliation check. |
| **AI Usage / Cost** | Postgres `business_jobs` cost fields, reconciled **monthly** against the vendor invoice (OpenAI/Deepgram) | Internal fields are point-of-processing *estimates*; only the vendor invoice is ground truth for actual dollars spent. | Reporting internal cost estimates as final COGS without a reconciliation step. |
| **Analytics / Behavior / Funnels (investor/finance-facing)** | Postgres `business_conversion` / `fact_event` (a redesigned, always-writing event log) | Must never silently drop events (today's `EventLog` drops any event without an existing `User` row). Must never be blockable by an ad blocker. | Using PostHog as the source of truth for any number that appears in a board deck or a Stripe reconciliation — PostHog is sampled/blockable by design intent (opt-out on ad-block detection) and identity-merge is probabilistic. |
| **Analytics / Behavior (product/UX exploration)** | **PostHog** | Session replay, exploratory funnels, feature-flag experimentation, and ad hoc product questions are exactly what PostHog is built for and Postgres is not (no session recording, no built-in experimentation). | Rebuilding PostHog's exploratory tooling in-house; forcing product managers to write SQL for questions PostHog answers natively. |
| **Marketing / Acquisition** | Postgres `business_users.utm_*`, captured server-side at signup | Captured once, durably, independent of client-side pixel survival or ad blockers. | Relying solely on client-side UTM capture that can be lost to privacy tooling. |
| **Feature Usage (aggregate/reporting)** | Postgres `business_jobs.tool_type` | Deterministic, tied to billable/costed activity. | — |
| **Feature Usage (UX-level exploration)** | PostHog | Button-level, funnel-step-level UX questions. | Treating UX-level PostHog counts as reconcilable against Postgres job counts — they measure different things (clicks vs. completed jobs) and are not expected to match. |
| **Billing** | Stripe | Same as Subscriptions/Revenue. | — |
| **Cost (infra)** | Manually loaded monthly from hosting invoices (Hetzner/Vercel/etc.) into `fact_infra_cost` | No programmatic source exists today; must be an explicit, auditable monthly entry, not inferred. | Estimating infra cost from usage without ever reconciling to the actual invoice. |
| **Retention** | Postgres `business_retention`, built from `business_users` + `business_jobs` | Retention must use the canonical identity model (guests excluded, demo excluded) — PostHog's own retention charts use PostHog's identity resolution, which will disagree by construction. | Quoting PostHog's built-in retention chart as "the" retention number in a board deck. |

## 3. Canonical analytics layer (Part 5)

A four-layer model, dbt-style, regardless of what tool eventually implements it:

```
L0  Raw / Landing        →  L1  Staging (cleaned)   →  L2  Canonical business_* (dims & facts)  →  L3  Marts / Rollups  →  L4  Serving (cache + API)
```

### L0 — Raw / Landing
Verbatim, append-only mirrors of external truth, kept for replay/audit:
- `raw_stripe_events` — every Stripe webhook payload, unmodified, with idempotency key (this already exists conceptually as `StripeEventLog`; extend it to store the full payload, not just the event ID).
- `raw_posthog_export` — nightly export of PostHog events for backup/replay (PostHog is not itself a replayable source once retention windows lapse).
- `raw_job_events` — an **append-only** event stream of job state transitions (`queued`, `started`, `completed`, `failed`) emitted by the worker, decoupled from the mutable `Job` row. This is new: today job state is only ever the *current* row, so how/when it changed is not auditable.

### L1 — Staging
Typed, deduplicated, one clean row per natural key, no business logic yet:
- `stg_users`, `stg_subscriptions` (deduplicated to one row per `stripe_subscription_id`, latest state wins), `stg_jobs`, `stg_events`.

### L2 — Canonical business layer (the semantic core)
This is what every metric in METRICS.md reads from. Nothing downstream is allowed
to read L0/L1 directly.

| Model | Grain | Inputs | Key columns | Refresh strategy |
|---|---|---|---|---|
| `business_users` | 1 row / identity | `stg_users` + taxonomy rules (USER_TAXONOMY.md) | `user_class`, `include_in_business_metrics`, `is_founder/internal/developer/qa/demo/bot/deleted`, `utm_*`, `first_anonymous_id` | Trigger-refreshed on every user write; taxonomy flags recomputed nightly (in case rules change) |
| `business_subscriptions` | 1 row / **current state** per `stripe_subscription_id` (unique constraint) | `stg_subscriptions` | `status`, `normalized_monthly_cents`, `plan`, `period_start/end` | Upsert on every Stripe webhook — **never insert a new row for the same subscription**, always update in place |
| `business_subscription_history` | append-only ledger, 1 row / state transition | Stripe webhook stream | full audit trail (this is where the *old* `SubscriptionSnapshot` behavior belongs — as an audit log, never queried for "current MRR") | Append-only, insert on every transition |
| `business_revenue` | 1 row / invoice line item | Stripe invoice line items | `amount_cents`, `type` (subscription/refund/tax/one-time), `is_recurring` | Upsert on webhook |
| `business_jobs` | 1 row / job | `stg_jobs`, joined to `business_users` | `tool_type`, `status`, `ai_cost_micros`, `user_id`, `is_guest` | Near-real-time upsert from worker; nightly reconciliation against Bull/Redis counters |
| `business_growth` | 1 row / user-cohort-day | `business_users`, `business_jobs` | signup date, activation date, cohort_week | Nightly batch |
| `business_retention` | 1 row / cohort × offset | `business_users`, `business_jobs` | cohort_week, day_offset, retained_count | Nightly batch |
| `business_conversion` | 1 row / funnel-stage × cohort | `business_users`, `fact_event` | stage, cohort_week, count | Nightly batch |

### L3 — Marts / Rollups
Purpose-built, pre-aggregated tables for dashboards and reports — this is where
today's `DailyMetrics`/`MonthlyMetrics` belong, **redesigned to read only from L2**:
- `DailyMetrics` / `MonthlyMetrics` (redesigned): same shape as today, but every
  column is computed from `business_*` models with `include_in_business_metrics`
  already applied — no raw `User`/`Job` table access.
- `mv_founder_dashboard_snapshot` — a single materialized view backing the entire
  founder dashboard's "snapshot" card row, refreshed every 15 minutes, so the
  dashboard never joins seven tables live on every request.

### L4 — Serving layer
- Redis cache in front of L3, standard TTLs per METRICS.md cache tiers — **shared
  across all API instances** (fixes Phase 1 §2.7 per-process cache divergence).
- A single internal **Metrics API** (`GET /api/metrics/:name?window=...`) that is
  the *only* sanctioned way for the founder dashboard, any future admin tool, ad
  hoc SQL notebooks, or a Claude-based analysis session to retrieve a metric value.
  Ad hoc SQL against `business_*` tables directly is allowed for exploration, but
  anything that becomes a recurring report must be added to the Metrics API
  (Part 8, governance).

## 4. Metric ownership — where computed today vs. where it should be (Part 4)

| KPI | Computed today (Phase 1 finding) | Should be computed | Tier |
|---|---|---|---|
| MRR / ARR | Live `$queryRaw` SUM over an append-only `SubscriptionSnapshot`, no dedup | `business_subscriptions` (deduplicated current-state) | T2, webhook-driven |
| ARPU / ARPPU | Derived inline in the dashboard endpoint from the broken MRR + a raw `plan` GROUP BY | Derived in L3 mart from `business_subscriptions` + `business_users` | T2 |
| Total/New/Active Users | Raw `User`/`Job` COUNTs, no taxonomy filter | `business_users`/`business_jobs` rollup | T2 (rollup) + T1 (60s cache for live card) |
| Plan Distribution | Raw `GROUP BY plan` on `User`, includes demo accounts | `business_users` with `STD_FILTER` | T1 (cheap, safe to compute live behind a short cache) |
| Activation / Funnel / Cohorts | Live 6-way `$queryRaw` join computed on every uncached dashboard hit, requires an existing `User` row (drops guest activity) | `business_conversion` materialized nightly | T3 |
| Churn / Churned MRR | Rollup job, correct bracketing, but not cross-checked against Stripe | Same computation, **plus** nightly Stripe reconciliation | T2 + T4 validation |
| Jobs Created/Completed/Failed | Raw `Job` COUNTs, no guest/demo tagging, two dashboard panels disagree (joined vs. unjoined) | `business_jobs` rollup, dual-reported (all vs. customer-only) | T2 (rollup) + T1 (live card) |
| Server health / queue depth / worker heartbeat | Live Redis/Bull query, uncached | **Unchanged** — this is correctly an operational, not business, metric | T0 (live, no cache — correct as-is) |
| AI Cost / Gross Margin | Estimated inline per job, no vendor reconciliation | `business_jobs` estimate (T2) reconciled monthly against vendor invoice (T4) | T2 → T4 monthly |
| Feedback / star ratings | Live Postgres, no taxonomy filter | `business_users`-joined, `STD_FILTER` applied | T1 |

## 5. Dashboard architecture (Part 6)

| Card | Source | Tier | Refresh | Why |
|---|---|---|---|---|
| MRR / ARR / ARPU / ARPPU headline | `business_subscriptions` mart | T2, Redis-cached T1 (60s) | Webhook-driven + nightly Stripe reconciliation | Revenue numbers must be dedup-safe and cheap to serve; live Stripe calls on every page load would be slow and rate-limit-risky, so the mart is the read path and Stripe is the nightly *auditor*, not the request-time source |
| Total/New/Active Users | `business_users`/`business_jobs` rollup | T2 + T1 (60s) | Hourly rollup | High cardinality, safe to precompute; a 60s-stale user count is never a business risk |
| Plan Distribution | `business_users` live | T1 (60s) | On request | Cheap `GROUP BY`, low cardinality (≤10 plans), no reason to precompute — but must query the canonical table, not raw `User` |
| Activation Rate / Cohort Funnel | `business_conversion` materialized view | T3 | Nightly | Heavy multi-join cohort logic; cohort definitions don't change minute-to-minute, nightly freshness is more than sufficient and avoids an expensive live join on every dashboard load (today's exact performance/correctness trade-off, but now correct) |
| Server health / queue depth / worker heartbeat | Live Redis/Bull | T0 | Real-time | Genuinely operational — a stale "is the worker alive" signal is actively harmful; this is the one card class that should stay exactly as architected today |
| Feedback / star ratings | `business_users`-joined Postgres | T1 (60s) | On request | Low volume, cheap join once taxonomy filter is in place |
| Recent jobs feed | `business_jobs` live, `LIMIT 50` | T0–T1 | On request | Operational visibility card, small result set, freshness matters more than cache savings |
| **NEW: Stripe Reconciliation panel** | Direct Stripe API call (T4) | T0, explicit "Verify against Stripe" button, never auto-polled | On demand only | This is the trust-but-verify control entirely absent today — a founder can always force a live Stripe comparison against the cached MRR/subscriber numbers |
| **NEW: PostHog Product Insights embed** | PostHog API/embedded insight (T4) | T4 native caching | PostHog-native | Clearly labeled "product analytics — may under/overcount due to ad-block opt-out and identity merge"; never used to answer a revenue-adjacent question |
| YouTube resolution / ingestion cost metrics | Migrate off ad hoc Redis hashes into a `business_jobs`-adjacent fact table | T2 | Hourly | Today's Redis-hash-only storage is not auditable or joinable to revenue/user context; move it into the same layered model as everything else |

## 6. Why the Metrics API matters for "Claude analysis"

Any LLM-based analysis (this conversation included) is only as trustworthy as the
query it's allowed to run. If a future Claude session is given raw database access
and asked "what's our MRR," it will write a plausible-looking query — and Phase 1
proved exactly how easy it is to write a plausible-looking query that is wrong (the
un-deduplicated `SUM(priceMonthly) WHERE status='active'`). The Metrics API removes
this failure mode structurally: a well-instructed analysis session is directed to
call `GET /api/metrics/mrr` (or read `METRICS_DICTIONARY.md` and use the exact
blessed SQL) rather than free-hand a new query against raw tables every time.
