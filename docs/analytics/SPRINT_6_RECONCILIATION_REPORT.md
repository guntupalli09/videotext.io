# SPRINT_6_RECONCILIATION_REPORT.md — VideoText

Status: reconciliation report + deployment/rollback plan, generated
2026-07-27. This is the first sprint in the analytics program where the
dashboard's **served** output would actually change if the feature flag
were enabled. **The flag has not been enabled. No production deployment has
occurred.** Everything in this document describes code that is written,
tested, and committed locally, awaiting explicit operator approval before
either the flag is turned on or the running production container is
rebuilt/restarted.

## 0. Scope narrowing — read this first

The original `docs/analytics/SPRINT_PLAN.md` Sprint 6 framing suggested
migrating "Plan Distribution → Total/New Users → Jobs Created/Completed/
Failed" first. While preparing this sprint's field-by-field mapping (a
precision exercise the operator explicitly required before any cutover
code), a discovery invalidated part of that framing:

**`snapshot.totalUsers`, `newUsers`, `jobsCreated`, `jobsCompleted`, and
`jobsFailed` are not live queries.** They are read from `latestDaily`
(the `DailyMetrics` rollup table, populated by an hourly/nightly cron —
`server/src/services/recomputeMetrics.ts`), not from `COUNT(*) FROM "User"`/
`"Job"` directly. The Sprint 4/5 reconciliation reports built a live-query
*proxy* for these fields to validate the taxonomy-filtering concept, without
this codebase's author (this agent) realizing at the time that the actual
served value comes from a different source with different freshness and
window semantics (a specific rollup day, not "last 30 days"; can lag the
live data by up to ~1 hour). Migrating these 5 fields correctly requires
redirecting `DailyMetrics` itself to read from canonical sources — that is
explicitly `docs/analytics/SPRINT_PLAN.md` **Sprint 7**'s job, not
achievable as a simple "add a taxonomy filter" change here.

**Resolution:** all 5 `snapshot.*` fields are excluded from this sprint's
migration. Sprint 6's scope is instead **the 9 fields that are confirmed,
by direct re-reading of `adminDashboard.ts`'s actual query block, to be
genuine live raw queries today** — these accept a clean, apples-to-apples
"add the same `includeInBusinessMetrics` filter, nothing else changes"
migration. Three further fields (`usage.topUsersByJobCount`, `toolPerf`,
`costMetrics`) were also excluded because the Sprint 5 report validated them
only at a coarser granularity than they are actually served (e.g., an email
list rather than the full `{userId, email, plan, jobCount}` row shape) —
narrower scope, but every migrated field is validated at the exact
granularity it will be served in, with no exceptions.

This is reported here in full per the operator's instruction: *"If any
canonical value differs from the Sprint 5 expected-divergence model, stop
and investigate before completing Sprint 6."* The investigation is this
section. No unexplained **value** divergence was found — this is a scope
correction, not a data-integrity failure — and Sprint 6 proceeds on the
corrected, narrower, fully-validated field list below.

## 1. Field-by-field mapping (the 9 migrated fields)

| Field | Legacy source | Canonical source | Old definition | New definition | Expected value change | Reason |
|---|---|---|---|---|---|---|
| `usage.jobsByToolType` | `"Job"` (live, 30d) | `business_jobs` (live, 30d) | Every job in the last 30 days, any user | Every job in the last 30 days, excluding guests + founder/internal/demo | Total drops from 482 to 309 (−173, −36%) | Sprint 2 taxonomy exclusions + guest-job exclusion |
| `performance.avgProcessingMs` | `"Job"` (live, 30d completed) | `business_jobs` (live, 30d completed) | Mean processing time, any user's completed jobs | Mean processing time, customer jobs only | 22,074ms → 17,836ms (−4,238ms, −19%) | Same population change; **not monotonic** — could have moved either direction |
| `performance.p95ProcessingMs` | `"Job"` (live, 30d completed) | `business_jobs` (live, 30d completed) | Same as above, 95th percentile | Same population change | 111,612ms → 99,101ms (−12,511ms, −11%) | Same as above |
| `performance.failureRate` | `"Job"` (live, 30d) | `business_jobs` (live, 30d) | failed/total, any user | failed/total, customer jobs only | 4.15% → 1.29% (relative −69%) | Same population change; rate, not a count — both numerator and denominator shrink |
| `retention.activeUsersLast7Days` | `"Job"` (live) | `business_jobs` (live) | Distinct active `userId`s, any (incl. guests) | Distinct active `userId`s, customers only | 105 → 54 (−51, −49%) | Guest exclusion dominates this one (guests are a large share of short-window activity) |
| `retention.activeUsersLast30Days` | `"Job"` (live) | `business_jobs` (live) | Same, 30-day window | Same population change | 339 → 166 (−173, −51%) | Same as above |
| `planDistribution` | `"User"` (live) | `business_users` (live) | Every user's plan, any | Every customer's plan | `free` 403→400, `pro` 3→2, `founding_workflow` 3→3 | Exactly the 4 Sprint 2 exclusions (3 on `free`, 1 on `pro`) |
| `utmBreakdown` | `"User"` (live) | `business_users` (live) | Acquisition source, any user | Acquisition source, customers only | `direct` 409→405 (−4) | Same 4 exclusions (all 4 are UTM-less/"direct") |
| `failureReasons` | `"Job"` (live, 30d failed) | `business_jobs` (live, 30d failed) | Failure reasons, any user's failed jobs | Failure reasons, customer failed jobs only | 20 failed jobs / ~19 reasons → 4 failed jobs / 2 reasons | Guest + excluded-account failures removed |

**Every one of these was independently re-verified end-to-end** (not just
unit-tested) by running the actual cutover function
(`applyCanonicalCutover()`) against live production data with placeholder
legacy sentinel values, confirming every field was replaced with a value
matching the standalone reconciliation script's independent computation
exactly — see §5.

## 2. Fields explicitly NOT migrated in Sprint 6

| Field(s) | Why excluded |
|---|---|
| `snapshot.totalUsers`, `newUsers`, `jobsCreated`, `jobsCompleted`, `jobsFailed` | **Sourced from `DailyMetrics`, not a live query** — see §0. Requires Sprint 7's rollup-redirection work first. |
| `snapshot.mrrCents`/`arpuCents`, `revenue.*` (mrrTrend, newMrrTrend, churnedMrrTrend, churnRateTrend), `snapshot.newPaidUsers`/`churnedUsers` | Already excluded by the Sprint 5 report — depend on `business_subscriptions`/`business_revenue`, scoped for Sprint 7+. Operator's explicit exclusion list item "MRR/revenue trends." |
| `funnelByCohort` | Already excluded by the Sprint 5 report — depends on `business_conversion`/`fact_event`, Sprint 8. Operator's explicit exclusion list item "funnel by cohort." |
| `recentJobs` | Already excluded — operational feed, not a KPI. Operator's explicit exclusion list item "recent jobs feed." |
| `youtubeResolution` | Already excluded — Redis-derived, no `User` dimension. Operator's explicit exclusion list item "YouTube resolution metrics." |
| `usage.topUsersByJobCount` | Sprint 5 validated the email list only, not the full served row shape (`userId`, `email`, `plan`, `jobCount`). Excluded per "any other field explicitly deferred" — deferred here, now, for the same reason. |
| `toolPerf` | Sprint 5 validated `count` per tool only; the actual response also serves `avgMs`, `p95Ms`, `avgFileSizeMb`, `avgDurationSec`, `totalMinutes` per tool, none of which were validated. |
| `costMetrics` | Sprint 5 validated `jobCount`/`totalWhisperCostUsd` in aggregate; the actual response also serves `avgWhisperCostUsd` (derivable, low risk) and `avgDurationSec` (not validated). Excluded as a whole card to avoid a partially-validated object. |
| `feedback`, `starDistribution`, `feedbackByTool` | Sprint 5 validated an aggregate proxy ("total count of starred feedback") that does not correspond to an actual served field — the real fields are per-star and per-tool breakdowns, never validated at that granularity. |
| `users` (`allUsers`, up to 500 rows), `daily` (31-day trend array) | Never validated at all in any prior sprint's reconciliation. |

## 3. Implementation

- `server/src/services/canonicalDashboardCutover.ts` (new): one canonical
  computation function + one structural validator per approved field;
  `tryCutoverField()` orchestrates try → timeout (8s) → validate → apply,
  with any failure at any stage leaving the field's already-computed legacy
  value untouched and logging `dashboard_canonical_cutover_FALLBACK` at
  error/critical level. `applyCanonicalCutover()` runs all 9 in parallel.
- `server/src/utils/featureFlags.ts`: new, dedicated
  `DASHBOARD_CANONICAL_CUTOVER` flag (default `false`), separate from
  `DASHBOARD_SHADOW_COMPUTE` — shadow-mode observation and actual cutover
  can be toggled independently.
- `server/src/routes/adminDashboard.ts`: `response` is still built via every
  original legacy query, completely unchanged. `applyCanonicalCutover()` is
  called (only if the flag is on) immediately before `res.json(response)` —
  it can only ever *overwrite* fields in an already-fully-populated
  response, never leave a gap. The existing Sprint 5 shadow-compute
  (`shadowCompareDashboard()`) is untouched and still runs after the
  response is sent, **independently re-deriving both legacy and canonical
  values from scratch** — so shadow comparison logging continues exactly as
  before, regardless of whether cutover is also enabled. This satisfies
  requirement 7 ("preserve the shadow comparison after cutover") by
  construction: the shadow-compute code path does not know or care whether
  cutover ran.

## 4. Rollback

**Rollback is exactly: set `DASHBOARD_CANONICAL_CUTOVER` back to `false` (or
never set it in the first place) and restart/redeploy the API.** No code
change, no migration reversal, no data cleanup — `applyCanonicalCutover()`
is simply never called, and `response` is served exactly as it was built by
the untouched legacy queries. This was true by construction before writing
any code (the whole design goal), and is now also directly demonstrated:
the end-to-end run in §5 shows the exact "before" (legacy) and "after"
(canonical) state of the same response object.

## 5. End-to-end validation (live production data, read-only, 2026-07-27)

`applyCanonicalCutover()` was called directly against a synthetic response
object pre-populated with obviously-wrong placeholder legacy values
(`PLACEHOLDER_LEGACY`, `-999`, `-1`) to prove real overwriting occurs and to
inspect the exact resulting shape:

```
BEFORE: { jobsByToolType: [{toolType:"PLACEHOLDER_LEGACY",count:-999}],
          performance: {avgProcessingMs:-1, p95ProcessingMs:-1, failureRate:-1},
          retention: {activeUsersLast7Days:-1, activeUsersLast30Days:-1},
          planDistribution: [{plan:"PLACEHOLDER_LEGACY",count:-999}],
          utmBreakdown: [{source:"PLACEHOLDER_LEGACY",count:-999}],
          failureReasons: [{reason:"PLACEHOLDER_LEGACY",count:-999}] }

AFTER:  { jobsByToolType: [6 real tool-type rows summing to 309],
          performance: {avgProcessingMs:17836, p95ProcessingMs:99101, failureRate:0.01294...},
          retention: {activeUsersLast7Days:54, activeUsersLast30Days:166},
          planDistribution: [{free:400},{founding_workflow:3},{pro:2}],
          utmBreakdown: [{direct:405}],
          failureReasons: [{"400 Audio file is too short...":2},{"400 Language 'te'...":2}] }
```

Every value in "AFTER" matches the independent
`sprint5-dashboard-reconciliation-report.ts` run's canonical column exactly
— two different code paths (the reconciliation report's inline queries and
the cutover module's dedicated functions) computing the same numbers from
the same views, agreeing precisely.

## 6. Tests run

- `tsc --noEmit`: clean.
- `tsc` build: clean (exit 0).
- Full suite: **37/37 pass** (21 prior + 16 new: 11 in
  `tests/canonicalDashboardCutover.test.ts` covering every validator plus
  the fallback mechanism's success/throw/timeout/invalid-data paths against
  fake compute functions — no live database needed for these; 5 in
  `tests/featureFlags.test.ts` covering the flag-parsing rule and asserting
  all 5 analytics flags, including the 2 new ones, default to `false` in
  this environment).
- Lint: zero net new issues across all of Sprint 6's changes (343 problems
  before and after — the 3 `eqeqeq` issues initially introduced in
  `canonicalDashboardCutover.ts` were found and fixed before this count was
  taken; confirmed the two pre-existing `eqeqeq`/`no-floating-promises`
  hits elsewhere in `adminDashboard.ts`/`featureFlags.ts` are untouched,
  unrelated lines via `git diff --stat`).
- Response-schema validation: implemented as the `isFiniteNonNegativeNumber`/
  `isFiniteRate`/`isCountArray` structural validators, unit-tested directly,
  and exercised live in §5 (every field's real output passes its validator).
- Fallback-path tests: `tryCutoverField` tested against a throwing compute
  function, a slow (timeout-triggering) compute function, and a
  succeeding-but-structurally-invalid compute function — all three
  confirmed to never call `apply()` and to never throw back to the caller.
- Feature-flag tests: flag-parsing rule tested directly; all 5 analytics
  flags confirmed `false` by default in this environment.

## 7. Exact deployment steps (NOT executed — for operator approval)

1. Merge/push these local commits to the branch that triggers a production
   build (out of scope for this agent per "no remote push" — the operator
   performs this step).
2. Rebuild and redeploy the `videotools-api` container (and, if the worker
   process ever reads dashboard code — it does not today — the worker too).
   This is the step this agent has explicitly not performed
   ("do not rebuild, restart, or redeploy the live production containers
   without explicit approval").
3. Confirm the new container is healthy (`GET /healthz`, `GET /readyz`).
4. With `DASHBOARD_CANONICAL_CUTOVER` still unset/`false` in production env,
   confirm the dashboard renders identically to before deployment (this
   deploy step alone changes nothing user-visible — the flag gates
   everything).
5. Only after operator sign-off: set `DASHBOARD_CANONICAL_CUTOVER=true` in
   the production environment and restart the API process to pick it up.
6. Monitor `dashboard_canonical_cutover_FALLBACK` log lines (should be
   absent under normal operation) and the existing
   `dashboard_shadow_compare_summary`/`dashboard_shadow_compare_UNEXPLAINED_DISCREPANCY`
   logs for at least one full business day before considering this sprint's
   production rollout complete.

## 8. Exact rollback steps

1. Set `DASHBOARD_CANONICAL_CUTOVER=false` (or remove the env var) in the
   production environment.
2. Restart the API process to pick up the change.
3. No database rollback is needed — no schema changed this sprint, no data
   was written by this sprint's code (every canonical function is a
   read-only `SELECT`).
4. No code revert is needed either — the flag alone fully reverts behavior;
   a code revert would only be warranted if the goal were to also remove
   the *capability*, not just disable it.

## 9. Expected before/after dashboard values (once the flag is enabled)

See §1's table for the precise numbers as of 2026-07-27. In summary: the
`Usage`, `Performance`, `Retention`, `Plan Distribution`, `UTM Breakdown`,
and `Failure Reasons` cards will all show smaller (or, for rates, different)
numbers than today, by amounts that exactly match the 4 Sprint 2 taxonomy
exclusions plus guest-job exclusion. No other card changes. The `Snapshot`
card at the top of the dashboard (Total Users, New Users, Jobs Created/
Completed/Failed, MRR) is **unaffected by this sprint** and will look
exactly as it does today until Sprint 7.
