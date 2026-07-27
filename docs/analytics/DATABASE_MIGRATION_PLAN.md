# DATABASE_MIGRATION_PLAN.md — VideoText

Status: design/blueprint only. No migrations generated or run. All migrations
below follow the **expand → migrate → contract** pattern: add new structures
alongside old ones, dual-run/validate, cut over readers, only then remove the
old structure — never a single big-bang schema change.

---

## Part 5 — Required Migrations

| # | Migration | Purpose | Breaking? | Order | Rollback | Backfill? | Validation | Historical impact | Zero-downtime strategy |
|---|---|---|---|---|---|---|---|---|---|
| M1 | Add taxonomy columns to `User` (`user_class`, `is_founder`, `is_internal`, `is_developer`, `is_qa`, `is_demo`, `is_bot`, `is_deleted`, `include_in_business_metrics`) | Foundation for every downstream exclusion filter | Non-breaking (all nullable/defaulted, additive) | 1st | Drop columns — safe until Sprint 4 reads them | Yes — one-off script classifying known demo (`demo-user-%`), founder (allowlisted email), and historically-identified test accounts | Dry-run diff of row counts per class against Sprint 0 baseline | None — purely additive | `ADD COLUMN ... DEFAULT` is metadata-only on modern Postgres; no table rewrite, no lock beyond a brief `ACCESS EXCLUSIVE` for the DDL itself (sub-second) |
| M2 | Create `business_users` as a **view** over `User` + taxonomy columns | Canonical identity read surface | Non-breaking (new object) | 2nd (after M1) | `DROP VIEW` | No (view, not materialized) | Row-for-row diff against raw `User` query | None | Views carry no migration risk |
| M3 | Create `business_jobs` as a **view** over `Job` joined to `business_users` | Canonical job read surface, tags `is_guest`/taxonomy | Non-breaking | 2nd (parallel with M2) | `DROP VIEW` | No | Row-for-row diff against raw `Job` query | None | Same as M2 |
| M4 | Create `business_subscriptions` (physical table, unique constraint on `stripe_subscription_id`) — current-state summary | Fixes the MRR double-count at the schema level (not just the query fix from Sprint 1) | Non-breaking (new table; old `SubscriptionSnapshot` untouched and keeps being written by the webhook) | 3rd (after M1) | `DROP TABLE` — nothing reads it until explicitly wired in | **Yes, and non-trivial**: backfill must derive "current state" per subscription from the live Stripe API (the authoritative source), not merely from the polluted local ledger, since the ledger's own "latest row" may not reflect Stripe's true current state after historical webhook-ordering races | Backfilled rows spot-checked against live Stripe subscription objects for a sample + full reconciliation job (Sprint 3) | None to existing tables; this is additive | Table creation + backfill run off-peak; webhook handler updated in the *same* deploy to also upsert into `business_subscriptions` going forward (dual-write), so no gap opens between backfill cutoff and go-live |
| M5 | Keep `SubscriptionSnapshot` **as-is**, formally redesignate it as `business_subscription_history` (rename optional, semantics-only redesignation acceptable) | It is already, structurally, a correct append-only ledger — the bug was reading it as current-state, not the table shape itself | Non-breaking (no schema change required, only a documentation/usage contract change) | Can happen anytime, independent of M4 | N/A — no structural change | No | Confirm no code path relies on treating the newest row as "current" once M4 exists | None | Zero risk — this migration is a no-op at the DB level |
| M6 | Add `job_event` (new, append-only job-state-transition audit table) | Enables reconciliation between Bull/Redis and Postgres job counts (Issue #5) | Non-breaking (new table) | 4th | `DROP TABLE` | No — populate forward-only, no need to reconstruct unrecorded history | Compare `job_event` completion counts against Bull's own counters | None | Worker emits an additional, non-blocking insert per state transition — sized and load-tested before enabling in production (Testing Strategy, load tests) |
| M7 | Add `metrics_restatement_log` | Governance support — audit trail for any historical rollup correction | Non-breaking (new table) | Any time, independent | `DROP TABLE` | No | N/A until first restatement occurs | None | Zero risk |
| M8 | Add `metric_version`/`computed_at` columns to `DailyMetrics`/`MonthlyMetrics` | Enables versioned metrics per DATA_GOVERNANCE.md | Non-breaking (additive, defaulted) | Before Sprint 7 | Drop columns | No (default `v1` for all existing rows) | Confirm existing rollup reads still work with the new columns present but unused until Sprint 7 | None | Metadata-only |
| M9 | Add `CREATE INDEX CONCURRENTLY` on `business_users.user_class`, `business_users.include_in_business_metrics`, composite `Job(userId, status, completedAt)` | Performance for canonical/reconciliation queries at scale | Non-breaking | As needed, before the query patterns that need them go live (Sprint 4–7) | `DROP INDEX` | No | Query plan (`EXPLAIN ANALYZE`) before/after | None | `CONCURRENTLY` avoids locking the table for writes — required on a production table this large; takes longer but never blocks traffic |
| M10 | (Deferred, separate future migration — not in the 12-month critical path) Add persistent `anonymous_id` linkage for guest identity stitching | Fixes DAU/MAU guest-counting integrity (Issue #4) fully | Non-breaking at the schema level, but **requires a privacy/consent review before shipping** — a durable pre-signup identifier has GDPR/CCPA implications | After core canonical layer is stable | Drop column, stop issuing the identifier | Not retroactive — historical guest sessions before this ships remain uncorrected, and that's an accepted, documented limitation, not silently glossed over | Privacy review sign-off is itself a required "validation" gate distinct from technical testing | Additive column, no lock risk; the real gating factor is legal/privacy review, not engineering |

### Migration ordering rationale

M1 gates everything (nothing can be tagged/excluded without it). M2/M3 are
zero-risk views and can follow immediately. M4 is the highest-stakes migration
in the whole plan because it touches revenue truth — it is deliberately
sequenced *after* Sprint 1's query-level MRR fix has already been validated in
production, so the schema-level fix is confirming and formalizing an
already-proven correct computation, not introducing a new one under pressure.
M6–M9 are independent, low-risk, and can be parallelized across sprints as
capacity allows. M10 is explicitly deferred out of the 12-month critical path
pending a non-engineering (legal/privacy) gate.

---

## Part 6 — Canonical Metrics Layer: Implementation Sequence

| Model | Creation order | Depends on | Validation | Backfill | Cutover | Rollback |
|---|---|---|---|---|---|---|
| `business_users` | 1 | M1 (taxonomy columns) | Row-for-row diff vs. raw `User` + taxonomy | None (view) | Dashboard reads switch card-by-card (Sprint 6) | `DROP VIEW`, zero data risk |
| `business_jobs` | 2 (parallel with users) | `business_users` | Row-for-row diff vs. raw `Job` | None (view) | Same as above | `DROP VIEW` |
| `business_subscriptions` | 3 | `business_users`, M4 | Nightly Stripe reconciliation (Sprint 3) is the ongoing validation; initial backfill spot-checked against live Stripe | Yes, against live Stripe API (see M4) | Dashboard MRR/ARR/ARPU cards last, only after reconciliation has run clean (Sprint 6) | Feature flag back to old query; table itself can remain inert without harm |
| `business_revenue` | 4 | `business_subscriptions` | Reconciled against Stripe invoice list nightly | Yes, from Stripe invoice history (pull full invoice history once, then webhook-driven going forward) | Revenue/Refunds cards, after subscriptions cutover proven stable | Same pattern |
| `business_cost` | 5 | `business_jobs` | Monthly reconciliation against OpenAI/Deepgram vendor invoice | Yes, from existing `Job.whisperCostMicros`/`totalAiCostMicros` fields, straightforward since the raw data already exists | AI Cost / Gross Margin cards (second-wave, not in the initial 12-sprint critical path — sequenced after revenue is stable) | Drop table; underlying `Job` cost fields untouched |
| `business_growth` | 6 | `business_users`, `business_jobs` | Compare activation-rate output against the existing (already-live) `getGrowthMetrics()` logic for a burn-in period | Backfill from historical `User.createdAt`/`Job.completedAt` — straightforward, no external dependency | Activation/cohort cards | Revert to existing live-query implementation |
| `business_retention` | 7 | `business_growth` | Spot-check a known cohort's retention curve by hand | Backfill from historical `business_jobs` | New retention cards (net-new capability, no existing card to compare against — validate by manual cohort construction instead) | Drop table |
| `business_conversion` | 8 | `business_users`, `business_growth`, Sprint 8's `fact_event` fix | Compare funnel counts against PostHog for the same window, document the expected (not eliminated) gap for pre-fix-era historical data | Backfill only from the point `fact_event` stops dropping pre-signup events forward; historical pre-signup funnel data before that fix is **not** reconstructable and this limitation is documented, not hidden | New funnel cards | Drop table, funnel reporting reverts to today's live 6-way join |

**Why this order:** identity (`business_users`) must exist before anything can
be tagged as included/excluded, so it is always first. Jobs and subscriptions
are independent of each other and can proceed in parallel once identity
exists. Revenue depends on subscriptions being trustworthy first (no point
reconciling invoice-level detail against a subscription model that isn't
itself validated yet). Growth/retention/conversion are last because they are
the most analytically complex (multi-table joins, cohort logic) and benefit
most from every upstream model already being proven correct — building the
hardest, most-interpretive metrics on top of an already-validated foundation
is lower risk than building them on raw tables directly, which is exactly the
mistake the current `getGrowthMetrics()` implementation makes today.
