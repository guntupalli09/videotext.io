# SPRINT_7_RECONCILIATION_REPORT.md — VideoText

Status: reconciliation report, generated 2026-07-27. Sprint 7's scope this
session is narrower than `docs/analytics/SPRINT_PLAN.md`'s original Sprint 7
framing (which also included `metric_version`/`computed_at` columns and a
`GET /api/metrics/:name` API) — per the operator's explicit Sprint 7
objectives, this session covers **only** the rollup generation layer
redirect (objective 1/2) and its validation (objectives 5/6/7), with the
dashboard endpoint, `DASHBOARD_CANONICAL_CUTOVER`, and any deploy/restart
explicitly untouched (objectives 3/4/9/10). The metrics-API/versioning work
remains available for a future sprint; not started here, not silently
dropped.

## 0. Scope

**Redirected** (objective 1 — DailyMetrics/MonthlyMetrics rollup generator,
`server/src/services/recomputeMetrics.ts`, sourced from `business_users`/
`business_jobs` when `ROLLUP_CANONICAL_SOURCE` is enabled):

| Granularity | Fields with a canonical equivalent |
|---|---|
| Daily (`DailyMetrics`) | `totalUsers`, `newUsers`, `activeUsers`, `jobsCreated`, `jobsCompleted`, `jobsFailed`, `avgProcessingMs`, `p95ProcessingMs` |
| Monthly (`MonthlyMetrics`) | `totalUsers`, `newUsers`, `activeUsers` |

**Not redirected, by design** — no canonical subscription model
(`business_subscriptions`) exists yet (second-wave work,
`DATABASE_MIGRATION_PLAN.md` Part 6), so these fields have nothing to
redirect to and are read from `SubscriptionSnapshot` exactly as before,
regardless of the flag:

- Daily: `mrrCents`, `churnedUsers`, `newPaidUsers`
- Monthly: `mrrCents`, `newMrrCents`, `churnedMrrCents`, `churnRatePercent`

**Untouched this sprint** (objectives 3/4): `server/src/routes/
adminDashboard.ts` was not opened for editing. `DASHBOARD_CANONICAL_CUTOVER`
remains exactly as Sprint 6 left it — unset, false, not evaluated or
enabled anywhere. The dashboard's *served* `snapshot.*`/`daily[]` fields
continue to read whatever is currently stored in `DailyMetrics`/
`MonthlyMetrics`, which continues to be written by the **legacy** path,
because `ROLLUP_CANONICAL_SOURCE` is also off (default) in every
environment, including the one this validation ran against. Nothing a
founder sees today changes as a result of this sprint.

## 1. Implementation

- `server/src/utils/featureFlags.ts`: new `ROLLUP_CANONICAL_SOURCE` flag,
  default `false`. Governs only the two fields sets above; MRR/churn fields
  are never affected by it.
- `server/src/services/recomputeMetricsCanonical.ts` (new): pure, read-only
  `computeCanonicalDayFields()`/`computeCanonicalMonthFields()`, mirroring
  the legacy queries field-for-field but against `business_users`/
  `business_jobs` filtered by `includeInBusinessMetrics`. No writes.
- `server/src/services/recomputeMetrics.ts` (modified): `recomputeDay`/
  `recomputeMonth` split into a pure `computeLegacy*Fields()` step (now
  exported, so the reconciliation script and any future caller can request
  legacy values without touching the database) and the existing upsert.
  When `ROLLUP_CANONICAL_SOURCE` is on, the day/month object is
  `{ ...legacy, ...canonical }` — i.e. only the fields canonical actually
  covers are overwritten; MRR/churn fields always come from `legacy`. When
  the flag is off (the only state exercised in this validation and the only
  state live anywhere), the object is `legacy` itself, unchanged — **the
  upsert receives byte-for-byte the same values as before this sprint's
  refactor**, proven in §3 below, not just asserted.
- `server/src/services/rollupReconciliation.ts` (new): pure classification
  helpers, `classifyMonotonicCount()` (count fields — canonical is always a
  subset of legacy, so `canonical <= legacy` is the only expected shape;
  `canonical > legacy` or a negative value is `UNEXPLAINED`) and
  `classifyNonMonotonic()` (`avgProcessingMs`/`p95ProcessingMs` — an
  average/percentile isn't guaranteed to move in a fixed direction when
  rows are removed, so any unequal *finite* pair is `EXPECTED_DIVERGENCE`;
  a value appearing on the canonical side while legacy is `null` is
  `UNEXPLAINED`, since that is structurally impossible for a true subset).
- `server/src/scripts/sprint7-rollup-reconciliation-report.ts` (new,
  read-only CLI): runs all four validations in §2–§5 below. Never writes to
  `DailyMetrics`/`MonthlyMetrics` or any other table. Non-zero exit on any
  `UNEXPLAINED` classification or cross-check mismatch (objective 7's "stop
  and investigate" signal).
- Tests: `server/tests/rollupReconciliation.test.ts` (9 new, the
  classification functions' boundary cases), `server/tests/
  featureFlags.test.ts` (+1, asserts `ROLLUP_CANONICAL_SOURCE` defaults
  false).

## 2. Live validation — field-by-field, daily rollups (2026-07-27)

Run against live production Postgres (read-only throughout), last 14 full
UTC days (2026-07-13 through 2026-07-26):

| Field | Days compared | IDENTICAL | EXPECTED_DIVERGENCE | UNEXPLAINED | Σ legacy | Σ canonical |
|---|---|---|---|---|---|---|
| `totalUsers` (required) | 14 | 0 | 14 | **0** | 5,038 | 4,982 |
| `newUsers` (required) | 14 | 14 | 0 | **0** | 101 | 101 |
| `activeUsers` (bonus — same rollup fn) | 14 | 0 | 14 | **0** | 187 | 107 |
| `jobsCreated` (required) | 14 | 0 | 14 | **0** | 254 | 174 |
| `jobsCompleted` (required) | 14 | 0 | 14 | **0** | 244 | 172 |
| `jobsFailed` (required) | 14 | 9 | 5 | **0** | 10 | 2 |
| `avgProcessingMs` (bonus) | 14 | 0 | 14 | **0** | n/a (non-additive) | n/a |
| `p95ProcessingMs` (bonus) | 14 | 0 | 14 | **0** | n/a (non-additive) | n/a |

**112 field-day comparisons, 0 UNEXPLAINED.** Every divergence is explained
by the same root cause established in Sprints 2/4/5/6: canonical excludes
guest jobs (no matching `User` row) and the 4 Sprint-2-classified
demo/founder/internal accounts. `newUsers` is `IDENTICAL` on all 14 days
because none of the 4 excluded accounts, nor any guest (guests have no
`User` row at all, so can't appear in a new-*user* count either way), signed
up during this specific 14-day window — expected, not a sign the filter
isn't being applied. `jobsFailed` is `IDENTICAL` on 9/14 days simply because
those days had zero failed jobs on both sides (0 = 0), not because the
filter had nothing to exclude on the other 5 days.

`avgProcessingMs`/`p95ProcessingMs` diverge on all 14 days, in **both
directions** depending on the day (e.g. 2026-07-13: legacy 31,563ms →
canonical 9,638ms *lower*; 2026-07-15: legacy 36,428ms → canonical 45,167ms
*higher*) — exactly the expected non-monotonic behavior documented in
Sprint 5/6 (`canonicalDashboard.ts`'s `avgProcessingMs` note): removing
guest/excluded-account jobs changes the mean in whichever direction those
particular jobs happened to sit relative to the rest, not a fixed direction
like a count would. Classified `EXPECTED_DIVERGENCE` on every occurrence,
per `classifyNonMonotonic()`'s rule, not flagged as suspicious.

## 3. Live validation — monthly rollups (2026-04, 2026-05, 2026-06)

| Month | Field | Legacy | Canonical | Classification |
|---|---|---|---|---|
| 2026-04 | totalUsers | 73 | 69 | EXPECTED_DIVERGENCE |
| 2026-04 | newUsers | 44 | 41 | EXPECTED_DIVERGENCE |
| 2026-04 | activeUsers | 139 | 15 | EXPECTED_DIVERGENCE |
| 2026-05 | totalUsers | 137 | 133 | EXPECTED_DIVERGENCE |
| 2026-05 | newUsers | 64 | 64 | IDENTICAL |
| 2026-05 | activeUsers | 131 | 31 | EXPECTED_DIVERGENCE |
| 2026-06 | totalUsers | 243 | 239 | EXPECTED_DIVERGENCE |
| 2026-06 | newUsers | 106 | 106 | IDENTICAL |
| 2026-06 | activeUsers | 234 | 90 | EXPECTED_DIVERGENCE |

9 field-months, 0 UNEXPLAINED. `activeUsers` shows the largest relative gap
of any field in this report (e.g. June: 234 → 90, a 61% drop) — expected,
per the same Sprint 4/5/6 finding that guest jobs are a large share of
short/medium-window activity counts (Sprint 0 baseline: 641 guest-
attributable ids vs. 409 real users), and monthly `activeUsers` sums
distinct active users over a full calendar month, giving guests more
opportunity to appear than a single day does.

**2026-04's `newUsers` (44 → 41) is the one case in this report where
`totalUsers`/`newUsers` diverge in the same month** (every other month's
`newUsers` was IDENTICAL) — April is when the founder/demo/internal
accounts were actually created (all `User.createdAt` predates Sprint 2's
classification work, per the original Sprint 0/2 baseline), so April is the
one calendar month where their signups fall inside the window. Consistent
with, not contradicting, the known exclusion set.

## 4. Independent live-query cross-check (objective 5, "canonical live
queries")

For the most recent fully-completed day (2026-07-26), two fields were
computed twice — once via `computeCanonicalDayFields()` (the shared
function used everywhere else in this report), once via a **separately
hand-written** ad hoc query in the report script itself, not calling the
shared function:

| Field | Independent live query | Rollup function | Match |
|---|---|---|---|
| `totalUsers` | 405 | 405 | ✅ |
| `jobsCreated` | 12 | 12 | ✅ |

Both agree exactly — two independent code paths computing the same number
from `business_users`/`business_jobs`, not one function coincidentally
agreeing with itself.

## 5. Legacy-path regression check (objective 5, "legacy rollups")

Freshly recomputed (via the refactored, but logically unchanged,
`computeLegacyDayFields()`) values for all 14 days were compared against
whatever is **currently stored** in the live `DailyMetrics` table for those
same dates (written by the pre-Sprint-7 code, before this session started):

**14/14 days: every one of `totalUsers`/`newUsers`/`activeUsers`/
`jobsCreated`/`jobsCompleted`/`jobsFailed` matches exactly.** This confirms
splitting `recomputeDay`/`recomputeMonth` into a compute step + an upsert
step did not change the legacy computation's output at all — a pure
refactor, not a behavior change, exactly as required by objective 3 ("do
not modify the production dashboard yet") and the general "flag off = zero
behavior change" discipline this whole program has followed since Sprint 1.

## 6. Cross-reference against Sprint 5/6's existing 30-day live-query proxy
(objective 5, "Sprint 6 reconciliation expectations")

`canonicalDashboard.ts`'s `compareDashboardMetrics()` (built in Sprint 5,
already producing `snapshot.totalUsers`/`newUsers (30d)`/`jobsCreated
(30d)`/`jobsCompleted (30d)`/`jobsFailed (30d)` as a **live-query proxy**
for these same fields, because at the time `DailyMetrics`' actual
sourcing wasn't yet understood — see Sprint 6 report §0) was re-run
alongside this sprint's rollup-based validation, for cross-reference:

| Metric | Legacy | Canonical | Classification |
|---|---|---|---|
| `totalUsers` | 417 | 413 | EXPECTED_DIVERGENCE |
| `newUsers` (30d) | 195 | 195 | IDENTICAL |
| `jobsCreated` (30d) | 475 | 309 | EXPECTED_DIVERGENCE |
| `jobsCompleted` (30d) | 455 | 305 | EXPECTED_DIVERGENCE |
| `jobsFailed` (30d) | 20 | 4 | EXPECTED_DIVERGENCE |

These numbers do **not** match §2's daily figures exactly, and are not
expected to — this is a 30-day rolling live-query window vs. §2's per-
calendar-day `DailyMetrics` rollup values, genuinely different windows over
a moving `now()`. What matters for this cross-check is that the
**direction and rough magnitude** agree (canonical always ≤ legacy, driven
by the same guest + 4-account exclusion), which they do, and that
`newUsers` being the one near-identical field in both views is consistent
(same reasoning as §2: none of the excluded accounts or guests skew a
recent new-signup count in this window). No contradiction found between
the two validation methods.

## 7. Stop-condition evaluation (objective 7)

**Not triggered.** Summary across every check in this report:

- Field comparisons (daily + monthly): **121 total, 0 UNEXPLAINED.**
- Independent live-query cross-check: **2/2 match, 0 mismatches.**
- Legacy-path regression check: **14/14 days match stored production
  values exactly, 0 mismatches.**

The reconciliation script (`sprint7-rollup-reconciliation-report.ts`)
implements this exact stop condition programmatically — non-zero exit if
any of the three counts above is nonzero — and exited `0` on this run.
Sprint 7 proceeds on the strength of this result.

## 8. Tests run

- `npx tsc --noEmit`: clean.
- Lint: baseline (main, before this sprint) is **343** problems. After this
  sprint's changes: **361** — a delta of **+18**, and all 18 are
  `no-console` in the new `sprint7-rollup-reconciliation-report.ts`
  CLI script, matching the already-established repo convention (every
  prior sprint's standalone report script has the same pattern). Verified
  by isolating `recomputeMetricsCanonical.ts`/`rollupReconciliation.ts`/
  the modified `recomputeMetrics.ts`/`featureFlags.ts` and confirming they
  introduce **zero** issues of any kind on their own; the 3 pre-existing
  `eqeqeq` hits reported against `recomputeMetrics.ts`/`featureFlags.ts`
  are on lines this sprint did not touch (`scalarInt`'s `v == null` and
  `isFlagEnabled`'s `value == null`, both present on `main` before this
  session).
- Full suite: **47/47 pass** (37 prior + 10 new: 9 in
  `tests/rollupReconciliation.test.ts` covering both classification
  functions' boundary cases, no DB required; +1 in `tests/
  featureFlags.test.ts` asserting `ROLLUP_CANONICAL_SOURCE` defaults
  false).
- Live validation: §2–§7 above, run directly against live production
  Postgres, read-only throughout (no row was ever written to
  `DailyMetrics`, `MonthlyMetrics`, or any other table by this sprint's
  validation).

## 9. Rollback

`ROLLUP_CANONICAL_SOURCE` is unset (defaults `false`) in every environment,
including the one this validation ran against — nothing needs to be rolled
back because nothing live has changed. If the flag is ever enabled in the
future and needs reverting: set it back to `false` (or unset it) and
restart the process that runs the recompute job (the API's `POST /api/
admin/recompute` handler and the CLI script both call the same
`runRecompute()`) — no code revert, no migration reversal (this sprint
introduced no schema change at all), no data cleanup, since
`recomputeDay`/`recomputeMonth` are idempotent upserts either way.

## 10. Not done this sprint (deferred, not dropped)

- `metric_version`/`computed_at` columns and `GET /api/metrics/:name` (the
  rest of the original `SPRINT_PLAN.md` Sprint 7 scope) — outside this
  session's operator-specified objectives; a natural follow-up once
  `ROLLUP_CANONICAL_SOURCE` itself has been enabled and burned in.
- `mrrCents`/`newMrrCents`/`churnedMrrCents`/`churnRatePercent`/
  `newPaidUsers`/`churnedUsers` rollup fields — no canonical
  `business_subscriptions` model exists yet (`DATABASE_MIGRATION_PLAN.md`
  Part 6, second-wave work); these keep reading `SubscriptionSnapshot`
  regardless of `ROLLUP_CANONICAL_SOURCE`.
- Enabling `ROLLUP_CANONICAL_SOURCE` anywhere, and any container
  rebuild/restart/redeploy — per objectives 4/9/10, both remain separate,
  future, explicit-approval decisions.
