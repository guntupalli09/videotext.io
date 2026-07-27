# DASHBOARD_FIELD_STATUS.md — VideoText

Status: complete field-by-field status of the real `GET /api/admin/dashboard`
response, regenerated 2026-07-27 per Sprint 7 objective 11. Read directly
from `server/src/routes/adminDashboard.ts`'s actual response object (not
from any prior report's summary), so this supersedes Sprint 5/6's partial
field inventories as the single up-to-date reference. **Every flag governing
any of this is off in every environment right now** — this document
describes migration *readiness*, not what is currently rendered; see the
"Currently served" column, which is `Legacy` for literally every field,
every row, with no exception.

## Status definitions (precedence, lowest to highest readiness)

1. **Deferred** — no canonical model exists yet for this field at all
   (needs `business_subscriptions`/`business_conversion`/`fact_event`/a
   cost fact table, or the data has no `User`/`Job` dimension to filter by
   in the first place, e.g. Redis-derived operational metrics).
2. **Legacy** — a canonical model (`business_users`/`business_jobs`) could
   answer this field, but it has never been shadow-validated against the
   legacy value at the granularity actually served.
3. **Verified** — shadow-validated (Sprint 4/5) at the granularity actually
   served, or explicitly acknowledged as validated only at a *coarser*
   granularity than served (Sprint 6 §2's exclusion list) — either way, no
   cutover code has been written for it yet.
4. **Canonical** — cutover code exists and is validated end-to-end (Sprint
   6's 9 dashboard fields; Sprint 7's rollup-layer-redirectable fields).
   Gated behind a feature flag that is off everywhere; "Canonical" here
   means *capability shipped*, not *currently rendered*.

## snapshot

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `totalUsers` | Canonical | Legacy | Sprint 7: rollup capability shipped (`ROLLUP_CANONICAL_SOURCE`, off). Sourced from `DailyMetrics`, not a live query — Sprint 6 §0 finding. |
| `newUsers` | Canonical | Legacy | Same as `totalUsers`. |
| `activeUsers` | Canonical | Legacy | Sprint 7 bonus field (same rollup function as the 5 required fields). |
| `jobsCreated` | Canonical | Legacy | Sprint 7. |
| `jobsCompleted` | Canonical | Legacy | Sprint 7. |
| `jobsFailed` | Canonical | Legacy | Sprint 7. |
| `mrrCents` | Deferred | Legacy | No `business_subscriptions` model yet (`DATABASE_MIGRATION_PLAN.md` Part 6, second-wave). Real-time override reads `SubscriptionSnapshot` directly, known-broken per Sprint 1 root cause until `MRR_EXTRACTION_V2_WRITE` is enabled (separate, still-off decision). |
| `arpuCents` | Deferred | Legacy | Derived from `mrrCents` (deferred) ÷ paid user count (canonical-capable) — bottlenecked by its weaker input. |
| `newPaidUsers` | Deferred | Legacy | Subscription-derived, same as `mrrCents`. |
| `churnedUsers` | Deferred | Legacy | Subscription-derived, same as `mrrCents`. |

## revenue

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `mrrTrend` | Deferred | Legacy | `MonthlyMetrics.mrrCents`, subscription-derived. |
| `newMrrTrend` | Deferred | Legacy | Same. |
| `churnedMrrTrend` | Deferred | Legacy | Same. |
| `churnRateTrend` | Deferred | Legacy | Same. |

## usage

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `topUsersByJobCount` | Verified | Legacy | Sprint 5 validated the email list only; actual served shape (`userId`,`email`,`plan`,`jobCount`) not fully validated — Sprint 6 §2 explicit exclusion. |
| `jobsByToolType` | Canonical | Legacy | Sprint 6 cutover shipped (`DASHBOARD_CANONICAL_CUTOVER`, off). |

## performance

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `avgProcessingMs` | Canonical | Legacy | Sprint 6 (dashboard-level, 30d live query) + Sprint 7 (rollup-level, per calendar day). Non-monotonic — validated divergence can go either direction, by design. |
| `p95ProcessingMs` | Canonical | Legacy | Same as `avgProcessingMs`. |
| `failureRate` | Canonical | Legacy | Sprint 6. |

## retention

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `activeUsersLast7Days` | Canonical | Legacy | Sprint 6. |
| `activeUsersLast30Days` | Canonical | Legacy | Sprint 6. |

## Top-level arrays / objects

| Field | Status | Currently served | Notes |
|---|---|---|---|
| `feedback` | Verified | Legacy | Sprint 5 validated an aggregate proxy ("total starred feedback count") that doesn't correspond to the actual served per-row shape — Sprint 6 §2 exclusion. |
| `users` (all users, ≤500 rows) | Legacy | Legacy | Never validated in any prior sprint — Sprint 6 §2 explicit statement. Canonical-capable (`business_users`) but nobody has shadow-compared this specific row shape yet. |
| `daily` (31-day `DailyMetrics` trend) | Legacy (mixed) | Legacy | Composite of 10 sub-fields per day. 7 of them (`totalUsers`,`newUsers`,`activeUsers`,`jobsCreated`,`jobsCompleted`,`jobsFailed`,`avgProcessingMs`) now have Sprint 7 canonical rollup capability — same status as `snapshot`'s equivalents. The remaining 3 (`mrrCents`,`churnedUsers`,`newPaidUsers`) are Deferred (subscription-derived). Tagged `Legacy` overall because the array as a served unit has never itself been shadow-compared end-to-end, only its individual sub-fields addressed piecemeal across Sprints 5–7. |
| `planDistribution` | Canonical | Legacy | Sprint 6. |
| `recentJobs` | Deferred | Legacy | Intentionally, permanently out of scope — operational visibility feed, not a KPI (`DASHBOARD_MIGRATION_PLAN.md`: shows everything including guest/demo activity by design). |
| `utmBreakdown` | Canonical | Legacy | Sprint 6. |
| `failureReasons` | Canonical | Legacy | Sprint 6. |
| `feedbackByTool` | Verified | Legacy | Sprint 5 aggregate-proxy-only validation, same as `feedback` — Sprint 6 §2 exclusion. |
| `starDistribution` | Verified | Legacy | Same as `feedback`/`feedbackByTool`. |
| `toolPerf` | Verified | Legacy | Sprint 5 validated `count` per tool only; `avgMs`/`p95Ms`/`avgFileSizeMb`/`avgDurationSec`/`totalMinutes` not validated — Sprint 6 §2 exclusion. |
| `costMetrics` | Verified | Legacy | Sprint 5 validated `jobCount`/`totalWhisperCostUsd` aggregate; `avgWhisperCostUsd`/`avgDurationSec` not validated — Sprint 6 §2 exclusion. |
| `youtubeResolution` | Deferred | Legacy | Ad hoc Redis hashes, no `User`/`Job` foreign key at all — needs a second-wave cost fact table before any taxonomy filter is even structurally applicable. |
| `funnelByCohort` | Deferred | Legacy | Needs `business_conversion`/`fact_event` (Sprint 8). `EventLog` itself currently drops pre-signup events (Phase 1 finding, not yet fixed), so even a canonical join today would inherit that gap. |

## Summary counts

34 fields total, counted as individual rows in the tables above.

| Status | Field count | Fields |
|---|---|---|
| Canonical | 15 | `snapshot.totalUsers/newUsers/activeUsers/jobsCreated/jobsCompleted/jobsFailed` (6), `usage.jobsByToolType`, `performance.avgProcessingMs/p95ProcessingMs/failureRate` (3), `retention.activeUsersLast7Days/activeUsersLast30Days` (2), `planDistribution`, `utmBreakdown`, `failureReasons` |
| Verified | 6 | `usage.topUsersByJobCount`, `feedback`, `feedbackByTool`, `starDistribution`, `toolPerf`, `costMetrics` |
| Legacy | 2 | `users`, `daily` (mixed — see note above) |
| Deferred | 11 | `snapshot.mrrCents/arpuCents/newPaidUsers/churnedUsers` (4), `revenue.mrrTrend/newMrrTrend/churnedMrrTrend/churnRateTrend` (4), `recentJobs`, `youtubeResolution`, `funnelByCohort` |

No field in this dashboard is currently served from anything other than its
legacy path — every `Currently served` cell reads `Legacy` because every
governing flag (`DASHBOARD_SHADOW_COMPUTE`, `DASHBOARD_CANONICAL_CUTOVER`,
`ROLLUP_CANONICAL_SOURCE`) is off in every environment, exactly as required
by Sprint 6/7's operator instructions.
