# DASHBOARD_FIELD_STATUS.md — VideoText

Status: final field-by-field classification, regenerated 2026-07-27 at the
close of Sprint 8 (supersedes the Sprint 7 version of this document).
Read directly from `server/src/routes/adminDashboard.ts`'s actual response
object. **Every flag governing any of this is off in every environment
right now** — this document describes migration readiness per field, not
what is currently rendered. Every field's "Currently served" value is
`Legacy`, without exception, because every governing flag
(`DASHBOARD_SHADOW_COMPUTE`, `DASHBOARD_CANONICAL_CUTOVER`,
`ROLLUP_CANONICAL_SOURCE`) is off everywhere.

## Classification scheme (per operator requirement, Sprint 8)

Each field gets exactly one of five tags:

1. **Canonical and production-ready** — cutover code is written, unit-
   tested, and live-validated end-to-end; the only remaining step is
   `FINAL_DEPLOYMENT_PLAN.md` Gate 5 approval + burn-in. No further
   engineering is required for this field.
2. **Canonical but awaiting rollout** — the canonical *computation*
   capability exists and is validated, but this specific field's dashboard
   value is sourced from a rollup table (`DailyMetrics`/`MonthlyMetrics`)
   that must itself be redirected first (`FINAL_DEPLOYMENT_PLAN.md` Gate 3)
   — there is no separate dashboard-level cutover code for these fields to
   write, because the dashboard already just reads whatever the rollup
   table holds.
3. **Intentionally operational/non-business** — by explicit design
   (`DASHBOARD_MIGRATION_PLAN.md`), this field is not a KPI and is not
   meant to be filtered by business taxonomy at all. No migration is
   planned or needed, ever.
4. **Deferred with a documented dependency** — a specific, named canonical
   model or schema addition doesn't exist yet, and building it is out of
   this program's approved 8-sprint scope (second-wave work) or was
   explicitly scoped out of this session (see
   `SPRINT_8_RECONCILIATION_REPORT.md` §0).
5. **Legacy and blocked** — the *legacy* computation is known to be
   incorrect or unreliable (not just "unmigrated"), and moving to
   Canonical requires both a business/burn-in decision already in
   progress (Gates 2/6/7) **and** a canonical model that doesn't exist yet.

## snapshot

| Field | Status | Notes |
|---|---|---|
| `totalUsers` | Canonical but awaiting rollout | Sprint 7 rollup capability shipped; needs Gate 3 (enable `ROLLUP_CANONICAL_SOURCE`) + a recompute |
| `newUsers` | Canonical but awaiting rollout | Same |
| `activeUsers` | Canonical but awaiting rollout | Same (Sprint 7 bonus field) |
| `jobsCreated` | Canonical but awaiting rollout | Same |
| `jobsCompleted` | Canonical but awaiting rollout | Same |
| `jobsFailed` | Canonical but awaiting rollout | Same |
| `mrrCents` | Legacy and blocked | Legacy `SubscriptionSnapshot`-sourced value is known-wrong (Sprint 1 root cause: extraction never populated `priceMonthly` correctly pre-fix); the fix (`stripeMrr.ts` V2) is shadow-validated (Gate 2) but writing it live is Gate 7, and even once live there is still no canonical **rollup/dashboard** model (`business_subscriptions`) to source this field from — blocked on both the burn-in decision and a second-wave schema build |
| `arpuCents` | Legacy and blocked | Derived from `mrrCents` ÷ paid-user-count; inherits `mrrCents`'s blocker |
| `newPaidUsers` | Legacy and blocked | Subscription-derived, same lineage as `mrrCents` |
| `churnedUsers` | Legacy and blocked | Same |

## revenue

| Field | Status | Notes |
|---|---|---|
| `mrrTrend` | Legacy and blocked | Same lineage as `snapshot.mrrCents` |
| `newMrrTrend` | Legacy and blocked | Same |
| `churnedMrrTrend` | Legacy and blocked | Same |
| `churnRateTrend` | Legacy and blocked | Same |

## usage

| Field | Status | Notes |
|---|---|---|
| `topUsersByJobCount` | **Canonical and production-ready** | Sprint 8: full row (`userId`/`email`/`plan`/`jobCount`) comparison + cutover shipped |
| `jobsByToolType` | Canonical and production-ready | Sprint 6 |

## performance

| Field | Status | Notes |
|---|---|---|
| `avgProcessingMs` | Canonical and production-ready | Sprint 6 (dashboard-level, 30d) — non-monotonic divergence is expected by design |
| `p95ProcessingMs` | Canonical and production-ready | Sprint 6 |
| `failureRate` | Canonical and production-ready | Sprint 6 |

## retention

| Field | Status | Notes |
|---|---|---|
| `activeUsersLast7Days` | Canonical and production-ready | Sprint 6 |
| `activeUsersLast30Days` | Canonical and production-ready | Sprint 6 |

## Top-level arrays / objects

| Field | Status | Notes |
|---|---|---|
| `feedback` | **Canonical and production-ready** | Sprint 8: actual served LIMIT-20 feed (id-list + full-row cutover, incl. email enrichment) |
| `users` (allUsers, ≤500 rows) | **Deferred with a documented dependency** | Sprint 8 finding: `business_users` doesn't expose `name`/`lastActiveAt`; needs a small additive view migration, not written this sprint (see `SPRINT_8_RECONCILIATION_REPORT.md` §0) |
| `daily` (31-day `DailyMetrics` trend) | **Canonical but awaiting rollout** (7/10 sub-fields) / **Legacy and blocked** (3/10) | Mixed, mirrors `snapshot`: `totalUsers`/`newUsers`/`activeUsers`/`jobsCreated`/`jobsCompleted`/`jobsFailed`/`avgProcessingMs` await Gate 3; `mrrCents`/`churnedUsers`/`newPaidUsers` are Legacy and blocked, same as `snapshot`'s equivalents. The array itself has no independent query to cut over — it's a straight passthrough of `DailyMetrics` rows. |
| `planDistribution` | Canonical and production-ready | Sprint 6 |
| `recentJobs` | **Intentionally operational/non-business** | `DASHBOARD_MIGRATION_PLAN.md`: explicitly shows everything including guest/demo activity by design, not a KPI |
| `utmBreakdown` | Canonical and production-ready | Sprint 6 |
| `failureReasons` | Canonical and production-ready | Sprint 6 |
| `feedbackByTool` | **Canonical and production-ready** | Sprint 8: real per-tool `avgStars`/`count` comparison + cutover (previously not actually computed despite an older comment implying it was) |
| `starDistribution` | **Canonical and production-ready** | Sprint 8: real per-star `count` comparison + cutover |
| `toolPerf` | **Canonical and production-ready** | Sprint 8: all 6 fields (not just `count`) comparison + cutover |
| `costMetrics` | **Canonical and production-ready** | Sprint 8: all 4 fields (not just `jobCount`/`totalWhisperCostUsd`) comparison + cutover |
| `youtubeResolution` | **Deferred with a documented dependency** | Redis-derived, no `User`/`Job` foreign key; needs a second-wave cost fact table (`DATABASE_MIGRATION_PLAN.md`) |
| `funnelByCohort` | **Deferred with a documented dependency** | Needs `business_conversion`/`fact_event` (original Sprint 8 scope, explicitly deferred this session — see `SPRINT_8_RECONCILIATION_REPORT.md` §0); `EventLog` itself currently drops pre-signup events regardless |

## Summary counts (34 fields total)

| Status | Count | Fields |
|---|---|---|
| **Canonical and production-ready** | 15 | `usage.topUsersByJobCount`/`jobsByToolType`, `performance.avgProcessingMs`/`p95ProcessingMs`/`failureRate`, `retention.activeUsersLast7Days`/`activeUsersLast30Days`, `planDistribution`, `utmBreakdown`, `failureReasons`, `feedback`, `feedbackByTool`, `starDistribution`, `toolPerf`, `costMetrics` |
| **Canonical but awaiting rollout** | 7 | `snapshot.totalUsers`/`newUsers`/`activeUsers`/`jobsCreated`/`jobsCompleted`/`jobsFailed` (6), `daily` (1, mixed) |
| **Intentionally operational/non-business** | 1 | `recentJobs` |
| **Deferred with a documented dependency** | 3 | `users`, `youtubeResolution`, `funnelByCohort` |
| **Legacy and blocked** | 8 | `snapshot.mrrCents`/`arpuCents`/`newPaidUsers`/`churnedUsers` (4), `revenue.mrrTrend`/`newMrrTrend`/`churnedMrrTrend`/`churnRateTrend` (4) |

**22 of 34 fields (65%) are code-complete and validated, awaiting only a
deployment gate.** The remaining 12 need either a schema build outside
this program's approved scope (11) or a small, separately-approvable view
fix (1, `users`).
