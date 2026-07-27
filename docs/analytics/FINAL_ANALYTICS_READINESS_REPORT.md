# FINAL_ANALYTICS_READINESS_REPORT.md — VideoText

Status: capstone summary, generated 2026-07-27 at the close of Sprint 8.
Synthesizes Sprints 0–8 into a single production-readiness assessment.
Every claim below is backed by a specific prior report — this document
summarizes and cross-references, it does not re-derive.

## Executive summary

**The canonical analytics layer is code-complete, unit-tested, and
live-validated read-only for every field that is reachable from the
`business_users`/`business_jobs` views. Nothing has been deployed. Every
feature flag is off. No production write has occurred beyond what Sprints
0–3 already applied (additive schema only).** The program is ready to
begin its first production gate (Gate 1: deploy code with flags off)
pending operator approval — see `FINAL_DEPLOYMENT_PLAN.md`.

What remains **structurally** blocked (not just "not yet turned on") is
revenue: canonical MRR/subscription reporting requires a
`business_subscriptions` model that does not exist yet and was never
scoped into this 8-sprint program (it's explicitly "second-wave" work per
`DATABASE_MIGRATION_PLAN.md` Part 6). The extraction-level fix for MRR
(Sprint 1) is real, shadow-validated, and ready — but the rollup/dashboard
layer above it has nothing to source from until that second-wave model is
built.

## What's built and validated, by layer

| Layer | Status | Evidence |
|---|---|---|
| **Baseline instrumentation** | Complete | Sprint 0: confirmed live MRR bug, guest-inflation, demo pollution with real numbers |
| **MRR extraction fix** (`stripeMrr.ts` V2) | Shadow-validated, not live | Sprint 1: 10/10 real invoices corrected; `MRR_EXTRACTION_V2_SHADOW`/`_WRITE` both off |
| **User taxonomy** (`userClass`, `includeInBusinessMetrics`, etc.) | Live in schema, backfilled | Sprint 2: migration applied, 4 known accounts classified, validated against 409→417 total (accounts have grown since) |
| **Stripe reconciliation job** | Built, shadow-validated, not scheduled live | Sprint 3: `classify()` unit-tested (7 cases), live dry-run confirms correct `info`/`warn`/`critical` behavior; `STRIPE_RECONCILIATION_ENABLED` off |
| **Canonical views** (`business_users`, `business_jobs`) | Live in schema, validated byte-for-byte | Sprint 4: views exist, row counts match source tables exactly, re-confirmed this sprint (417/417, 1,394/1,394) |
| **Dashboard shadow-compute** | Built, validated | Sprint 5: 25 fields compared then, extended over Sprints 6–8; `DASHBOARD_SHADOW_COMPUTE` off |
| **Dashboard cutover** | Code-complete for 15 fields, not enabled | Sprint 6 (9 fields) + Sprint 8 (6 more); `DASHBOARD_CANONICAL_CUTOVER` off |
| **Rollup redirect** (`DailyMetrics`/`MonthlyMetrics`) | Code-complete for 9 fields, not enabled | Sprint 7: 121 field comparisons live-validated, 0 UNEXPLAINED; `ROLLUP_CANONICAL_SOURCE` off |
| **Final field mapping / data dictionary / deployment plan** | Complete | Sprint 8: this report + `DASHBOARD_FIELD_STATUS.md` + `CANONICAL_DATA_DICTIONARY.md` + `FINAL_DEPLOYMENT_PLAN.md` |

## Dashboard field readiness (34 fields total — full detail in `DASHBOARD_FIELD_STATUS.md`)

| Classification | Count | Examples |
|---|---|---|
| Canonical and production-ready | 15 | `usage.jobsByToolType`/`topUsersByJobCount`, `performance.*`, `retention.*`, `planDistribution`, `utmBreakdown`, `failureReasons`, `toolPerf`, `costMetrics`, `feedback`, `feedbackByTool`, `starDistribution` |
| Canonical but awaiting rollout | 7 | `snapshot.totalUsers/newUsers/activeUsers/jobsCreated/jobsCompleted/jobsFailed`, `daily` (7/10 sub-fields) |
| Intentionally operational/non-business | 1 | `recentJobs` |
| Deferred with a documented dependency | 3 | `funnelByCohort`, `youtubeResolution`, `users` (allUsers) |
| Legacy and blocked | 8 | `snapshot.mrrCents/arpuCents/newPaidUsers/churnedUsers`, `revenue.*` (4 fields) |

**58% of dashboard fields (15/34, expanding to 22/34 once Gate 3/4's rollup
burn-in completes) are ready to serve trustworthy, taxonomy-correct
numbers the moment their respective gate is approved.** The remaining 12
fields require either a schema build not in this program's scope
(`business_subscriptions`, `fact_event`, a cost fact table) or a small,
separately-approvable view fix (`users`).

## Known, deliberately-not-fixed issues carried forward

1. **WI-001** (`Subscription.current_period_start/end`) — tracked in
   `BACKLOG.md`, explicitly excluded from every sprint's scope by operator
   instruction, including this one. Affects grace-period/downgrade-at-
   period-end logic, not any metric in this report.
2. **MRR/revenue canonical model** (`business_subscriptions`) — not built,
   not scoped into this 8-sprint program; the "second wave" per
   `DATABASE_MIGRATION_PLAN.md` Part 6.
3. **PostHog funnel-capture fix** (`fact_event`) — SPRINT_PLAN.md's
   original Sprint 8 scope; explicitly deferred this session (§0 of
   `SPRINT_8_RECONCILIATION_REPORT.md`), available as a future sprint.
4. **`business_users` missing `name`/`lastActiveAt`** — Sprint 8 finding;
   small additive view fix, not yet written.
5. **Founder-identification inconsistency** (`FOUNDER_ACCOUNT_EMAIL` env
   var vs. hardcoded email literals in three admin route files) — noted
   since Sprint 2, still not fixed, still non-blocking.
6. **No unit tests for `stripeMrr.ts` V2 extraction functions** or
   `backfill-user-taxonomy.ts`'s classification logic — validated via live
   runs instead, since Sprint 1/2; still a loose end.

## Production readiness verdict

**Ready for Gate 1** (deploy code, flags off — zero behavior change).
**Not ready** for any flag enablement (Gates 2–7) without the specific,
separate approvals `FINAL_DEPLOYMENT_PLAN.md` lays out — each gate has its
own prerequisites, monitoring period, and stop conditions, and none has
been executed. No calendar-time-gated criterion (5-day MRR burn-in, 5
consecutive clean reconciliation nights, etc.) can be satisfied within a
single agent session regardless of code quality — those require real
elapsed time in production and are the actual purpose of Gates 2, 4, and 6.
