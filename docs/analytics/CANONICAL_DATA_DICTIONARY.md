# CANONICAL_DATA_DICTIONARY.md — VideoText

Status: permanent, as-built reference, generated 2026-07-27 (Sprint 8).
`METRICS.md`/`METRICS_DICTIONARY.md` remain the **target-state design**
documents (illustrative `snake_case` names, some models not yet built).
This file is the **as-built** counterpart: what actually exists in the
live schema today, its real (camelCase) column names, what's validated,
and what's still target-only — cross-referenced to `DASHBOARD_FIELD_
STATUS.md`'s per-field classification. When the two documents disagree on
a column name, this one is correct; `METRICS.md`'s `snake_case` names are
conceptual, not queryable.

## Live tables/views and their real columns

### `business_users` (VIEW, Sprint 4 — `20260727150000_add_business_views`)

Straight passthrough of `"User"` plus the Sprint 2 taxonomy columns.
Explicit column list (not `SELECT *`), so future `"User"` columns don't
silently change this view's shape.

| Column | Type | Notes |
|---|---|---|
| `id` | String | PK, same as `"User".id` |
| `email` | String | |
| `plan` | String | Raw plan string — **not** Stripe-verified; see §"Paid-access accounts vs. active subscriptions" below |
| `role` | String | Exists in schema; per Sprint 6 unresolved-issues note, never checked at runtime anywhere in `server/src` |
| `stripeCustomerId` | String? | |
| `subscriptionId` | String? | |
| `subscriptionStatus` | String? | |
| `userClass` | String | `registered` \| `internal` \| `demo` \| `founder` (Sprint 2 backfill); indexed |
| `isFounder`, `isInternal`, `isDeveloper`, `isQa`, `isDemo`, `isBot`, `isDeleted` | Boolean | Sprint 2 taxonomy flags |
| `includeInBusinessMetrics` | Boolean | The `STD_FILTER` referenced throughout `METRICS.md`; indexed |
| `utmSource`, `firstReferrer` | String? | |
| `createdAt`, `updatedAt` | DateTime | |

**Known gap (Sprint 8 finding):** does **not** expose `"User".name` or
`"User".lastActiveAt` — both needed to fully canonicalize the dashboard's
`users` (allUsers) field. See `DASHBOARD_FIELD_STATUS.md`.

### `business_jobs` (VIEW, Sprint 4)

`"Job"` LEFT JOINed to `business_users`, so guest jobs (no matching
`"User"` row) are preserved and tagged, never silently dropped or
silently counted as registered activity.

| Column | Type | Notes |
|---|---|---|
| `id`, `userId`, `toolType`, `status`, `fileSizeBytes`, `videoDurationSec`, `startedAt`, `completedAt`, `processingMs`, `failureReason`, `planAtRun`, `whisperCostMicros`, `totalAiCostMicros`, `createdAt` | (passthrough) | Direct from `"Job"` |
| `isGuest` | Boolean | `true` iff no matching `business_users` row (`bu.id IS NULL`) |
| `userClass` | String? | From the joined `business_users` row; `NULL` for guests |
| `includeInBusinessMetrics` | Boolean | `true` only for genuine registered, non-excluded users — `false` for guests **and** for founder/internal/demo |

### `SubscriptionCurrentState` (TABLE, Sprint 1 — `20260727120000_add_subscription_current_state`)

Applied and validated (Sprint 1); **currently empty** (0 rows) because
`MRR_EXTRACTION_V2_WRITE` is off. This is `business_subscriptions`'
current-state half in `METRICS.md`'s terminology — not yet named that in
the actual schema.

| Column | Type | Notes |
|---|---|---|
| `stripeSubscriptionId` | String | PK |
| `userId` | String | Indexed |
| `status` | String | `active` \| `canceled` \| `past_due` \| `trialing` \| `incomplete`; indexed |
| `plan` | String | |
| `normalizedMonthlyCents` | Int | **Canonical MRR** for this subscription — contractual, annual÷12, independent of discounts |
| `currency`, `stripePriceId`, `billingInterval`, `intervalCount` | | |
| `lastInvoiceId`, `lastInvoiceAmountPaidCents` | String?/Int? | **Collected cash** — a separate, never-substituted metric |
| `periodStart`, `periodEnd` | DateTime? | **Not yet populated correctly** even once the write path is on — see WI-001 (`BACKLOG.md`), a distinct, still-open issue |
| `updatedAt`, `createdAt` | DateTime | |

### `MrrReconciliationRun` (TABLE, Sprint 3 — `20260727140000_add_mrr_reconciliation_run`)

Applied and validated; 1 row currently (from Sprint 3's initial live
persisting run — `STRIPE_RECONCILIATION_ENABLED` off, so no nightly rows
accumulate yet).

| Column | Type | Notes |
|---|---|---|
| `id` | String | PK, cuid |
| `runAt` | DateTime | |
| `writePathEnabled` | Boolean | Snapshot of `MRR_EXTRACTION_V2_WRITE` at run time — required context for interpreting divergence |
| `postgresMrrCents`, `stripeMrrCents`, `deltaCents`, `deltaPct` | Int/Int/Int/Float? | |
| `postgresActiveCount`, `stripeActiveCount` | Int | |
| `severity` | String | `info` \| `ok` \| `warn` \| `critical` — see `classify()` in `stripeReconciliation.ts`, unit-tested |
| `notes` | String? | |

### `DailyMetrics` / `MonthlyMetrics` (TABLE, pre-existing; Sprint 7 added canonical-source capability)

Column list unchanged since before this program (no new migration was
needed for Sprint 7 — only the *computation source* changed, flag-gated).
230 rows currently in `DailyMetrics`.

| Field | Canonical-capable? | Source when `ROLLUP_CANONICAL_SOURCE` is on |
|---|---|---|
| `totalUsers`, `newUsers`, `activeUsers`, `jobsCreated`, `jobsCompleted`, `jobsFailed`, `avgProcessingMs`, `p95ProcessingMs` (Daily); `totalUsers`, `newUsers`, `activeUsers` (Monthly) | Yes (Sprint 7) | `business_users`/`business_jobs`, filtered by `includeInBusinessMetrics` |
| `mrrCents`, `churnedUsers`, `newPaidUsers` (Daily); `mrrCents`, `newMrrCents`, `churnedMrrCents`, `churnRatePercent` (Monthly) | **No** | Always `"SubscriptionSnapshot"` — no canonical subscription model exists at the rollup layer |

## Metric definitions: target (`METRICS.md`) vs. as-built status

| `METRICS.md` metric (`snake_case`, target) | As-built column/query (camelCase, live) | Status |
|---|---|---|
| `business_users.include_in_business_metrics` (STD_FILTER) | `business_users."includeInBusinessMetrics"` | **Live**, validated Sprint 4 |
| Registered Users / New Users | `business_users` count, filtered | **Canonical and production-ready** (Sprint 6 planDistribution/utmBreakdown prove the pattern; snapshot-level fields await Gate 3) |
| Active Users (DAU/WAU/MAU) | `business_jobs` distinct `userId`, filtered | **Canonical and production-ready** (`retention.activeUsersLast7Days/30Days`, Sprint 6) |
| Guest Users | `business_jobs.isGuest` | **Live**, reported alongside canonical active users, never blended |
| MRR / ARR | `SubscriptionCurrentState.normalizedMonthlyCents`, summed | **Shadow-validated, not live** — table exists, correctly designed, empty until Gate 7 |
| Collected Cash | `SubscriptionCurrentState.lastInvoiceAmountPaidCents` | **Shadow-logged only** (`collectedCashCents` in `mrr_extraction_shadow_compare`), no aggregate view built yet |
| Paying Customers / Active Subscribers | `business_subscriptions` (target name) | **Not built** — `SubscriptionCurrentState` is the current-state half but nothing reads/aggregates it yet as a dashboard field; second-wave `business_subscriptions` per `DATABASE_MIGRATION_PLAN.md` Part 6 is still the eventual target name |
| Jobs Created/Completed/Failed (dual-reported) | `business_jobs`, `includeInBusinessMetrics` filter vs. unfiltered | **Canonical and production-ready** at the dashboard-usage level (Sprint 6); **awaiting rollout** at the `snapshot`/`daily` rollup level (Sprint 7, Gate 3) |
| Tool Usage | `business_jobs` GROUP BY `toolType` | **Canonical and production-ready** (`usage.jobsByToolType`, `toolPerf`) |
| AI Cost (with/without internal usage) | `business_jobs.whisperCostMicros`/`totalAiCostMicros` | **Canonical and production-ready** (`costMetrics`, Sprint 5 discovered the split, Sprint 8 completed full-field validation) |
| Retention / Churn / Activation / Conversion (multi-stage) | `business_retention`/`business_conversion` (target names) | **Not built** — depend on cohort/funnel models scoped for Sprint 7 (rollups, partially done) and Sprint 8-original (funnel fix, deferred this session) |
| Feedback (stars/tool breakdown) | `"Feedback"` LEFT JOIN `business_users` | **Canonical and production-ready** (Sprint 8: `feedback`, `feedbackByTool`, `starDistribution`) |

## Cross-reference

- Per-dashboard-field final classification (Canonical and production-ready
  / Canonical but awaiting rollout / Intentionally operational-non-business
  / Deferred with documented dependency / Legacy and blocked): see
  `DASHBOARD_FIELD_STATUS.md`.
- Narrative business purpose, worked examples, known caveats per metric:
  see `METRICS_DICTIONARY.md` (unchanged this sprint — still accurate as
  the "why" companion to this file's "what actually exists").
- Deployment sequencing for turning any of the above live: see
  `FINAL_DEPLOYMENT_PLAN.md`.
