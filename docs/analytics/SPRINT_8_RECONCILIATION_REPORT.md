# SPRINT_8_RECONCILIATION_REPORT.md — VideoText

Status: reconciliation report, generated 2026-07-27. Sprint 8 is the
finalization/consolidation sprint for the canonical analytics migration
(Sprints 0–7). All work in this sprint is additive code + read-only
validation + documentation. No feature flag was enabled, no migration was
applied, no container was touched.

## 0. Scope decision (read this first)

`docs/analytics/SPRINT_PLAN.md`'s original Sprint 8 text describes a
different sprint: fixing `captureFunnelEvent()` to stop dropping pre-signup
events (a new `fact_event`-shaped table, relaxing `EventLog`'s `userId`
not-null constraint) plus formal governance-process adoption. The
operator's actual Sprint 8 kickoff instructions for this session describe
something else: complete the remaining canonical work reachable from
already-existing models, produce a final field mapping and data
dictionary, run a full cross-system reconciliation, and produce one
coordinated deployment/rollback plan for Sprints 6+7.

Per the operator's explicit instruction not to silently expand scope, and
following the same precedent set in Sprint 7 (where the operator's stated
objectives narrowed the original plan text and that narrowing was
documented, not silently absorbed), **this session treats its own stated
objectives as authoritative**:

- The PostHog funnel-capture fix and governance-process adoption are
  **out of scope this session**. Neither was requested, and both require a
  schema change (`fact_event`) and a live event-capture code change —
  meaningfully different in kind from "complete canonical work reachable
  from existing models." `funnelByCohort` remains formally Deferred, same
  dependency as documented since Sprint 5/6.
- "Complete the remaining approved canonical analytics work" +
  "resolve every remaining Legacy/Deferred field" is interpreted as:
  resolve every field answerable from the **existing** `business_users`/
  `business_jobs` views (the previously Verified/Legacy fields:
  `topUsersByJobCount`, `toolPerf`, `costMetrics`, `feedback`,
  `feedbackByTool`, `starDistribution`), and formally defer everything that
  needs a model that doesn't exist (`business_subscriptions` for MRR/
  revenue fields, `fact_event`/`business_conversion` for `funnelByCohort`,
  a cost fact table for `youtubeResolution`).
- **New finding, this sprint:** `users` (allUsers) cannot be fully
  resolved either — `business_users` (the Sprint 4 view) does not expose
  `name`/`lastActiveAt`, both of which the served row includes. Fixing this
  requires an additive view migration (`CREATE OR REPLACE VIEW`, adding two
  columns to the existing explicit column list). **Not written this
  sprint** — it is a small, low-risk change, but it is still a net-new
  schema-touching artifact that wasn't part of this session's requested
  scope, so it's documented as a dependency rather than added unrequested.
  This is not a "conflict with the approved architecture" (the operator's
  stop condition) — it's a minor completeness gap in a view definition,
  cleanly fixable later — so it did not warrant halting the sprint.

## 1. Field resolution — what changed this sprint

| Field | Before (Sprint 6 status) | After (this sprint) | What shipped |
|---|---|---|---|
| `usage.topUsersByJobCount` | Verified (email-list only) | **Canonical and production-ready** | Full row (`userId`/`email`/`plan`/`jobCount`) comparison + cutover |
| `toolPerf` | Verified (`count` only) | **Canonical and production-ready** | All 6 fields (`count`/`avgMs`/`p95Ms`/`avgFileSizeMb`/`avgDurationSec`/`totalMinutes`) comparison + cutover |
| `costMetrics` | Verified (`jobCount`/`totalWhisperCostUsd` only) | **Canonical and production-ready** | All 4 fields (+ `avgWhisperCostUsd`/`avgDurationSec`) comparison + cutover |
| `feedback` | Verified (aggregate count only) | **Canonical and production-ready** | Actual served LIMIT-20 feed (id-list + full-row cutover incl. email enrichment) |
| `feedbackByTool` | Verified (not actually computed, despite an old comment implying it was) | **Canonical and production-ready** | Real per-tool `avgStars`/`count` comparison + cutover |
| `starDistribution` | Verified (not actually computed, same old-comment gap) | **Canonical and production-ready** | Real per-star `count` comparison + cutover |
| `users` (allUsers) | Legacy (never validated) | **Deferred with documented dependency** | Finding only (missing `name`/`lastActiveAt` on `business_users`) — no code shipped |
| `daily` (31-day trend) | Legacy (never validated) | **Canonical but awaiting rollout** (7/10 sub-fields) / **Legacy and blocked** (3/10: `mrrCents`/`churnedUsers`/`newPaidUsers`) | No new code — inherits Sprint 7's `ROLLUP_CANONICAL_SOURCE` capability for the 7 redirectable sub-fields; the array itself was never a separate query, so nothing to cut over independently |

Implementation:
- `server/src/services/canonicalDashboard.ts`: 6 new/upgraded comparison
  blocks (see table above), all following the same subset/non-monotonic
  classification rules established in Sprints 5–7.
- `server/src/services/canonicalDashboardCutover.ts`: 6 new canonical
  compute functions, 6 new structural validators
  (`isTopUsersArray`/`isToolPerfArray`/`isCostMetricsShape`/
  `isFeedbackArray`/`isFeedbackByToolArray`/reused `isCountArray`), all
  wired into `applyCanonicalCutover()` under the **same, existing**
  `DASHBOARD_CANONICAL_CUTOVER` flag — no new flag introduced. The flag now
  governs 15 fields total (Sprint 6's 9 + Sprint 8's 6), still off
  everywhere.
- `server/tests/canonicalDashboardCutover.test.ts`: +9 tests for the new
  validators.

## 2. Live validation (read-only, 2026-07-27)

### 2a. Cutover correctness

`applyCanonicalCutover()` was run against a synthetic placeholder response
(same technique as Sprint 6) and every field's canonical output was
cross-checked against the independent `compareDashboardMetrics()`
computation. All 15 fields (9 carried over from Sprint 6 + 6 new) match.

**Self-correction during this validation** (recorded transparently, same
discipline as Sprint 4's self-correction): the first cross-check pass
reported `toolPerf`/`feedbackByTool`/`starDistribution` as mismatches. On
inspection, these were **validation-script artifacts, not data or code
defects** — `canonicalDashboard.ts`'s comparison entries and
`canonicalDashboardCutover.ts`'s serving functions independently (and
correctly) differ in array ordering, and `toolPerf`'s comparison logs raw
`avgFileSizeBytes` (diagnostic) while the cutover serves rounded
`avgFileSizeMb` (the actual response format). Once compared order-
independently and unit/rounding-aware, all values reconcile exactly (e.g.
`video-to-transcript`: 202,297,336.26 bytes ÷ 1024÷1024, rounded to 1
decimal = 192.9 MB, matching the cutover's `avgFileSizeMb: 192.9` exactly).
No code was changed as a result — only the throwaway validation script's
own comparison logic was corrected before this result was recorded.

### 2b. Fresh production snapshot (all read-only)

| System | Metric | Value |
|---|---|---|
| Postgres `"User"` | total rows | 417 |
| Postgres `"Job"` | total rows | 1,394 |
| `business_users` | total rows | 417 (matches `"User"` exactly — view is a straight passthrough) |
| `business_jobs` | total rows | 1,394 (matches `"Job"` exactly) |
| `SubscriptionCurrentState` | total rows | 0 (expected — `MRR_EXTRACTION_V2_WRITE` still off) |
| `MrrReconciliationRun` | total rows | 1 (unchanged since Sprint 3; this sprint's dry run did not persist a new row) |
| `DailyMetrics` | total rows | 230 |
| Stripe (live, `stripe-reconciliation-report.ts --dry-run`) | `stripeMrrCents` | 5,000 ($50.00/mo) |
| Stripe (live) | `stripeActiveCount` | 2 |
| Reconciliation job | `severity` | `info` (correctly non-alarming — write path off) |

**Note on the Stripe numbers moving since Sprint 3** (then: $60.00/mo, 3
active subscriptions): initially attributed to "real subscription churn"
without verification. Per operator instruction, this was followed up with
a dedicated, read-only (GET-only) Stripe investigation identifying the
**exact** subscriptions involved and their cancellation reasons — see
`FINAL_DEPLOYMENT_PLAN.md`'s "Pre-Gate-1 frozen baseline" section for the
full, verified breakdown. Summary: two subscriptions ($40/mo Pro, $10/mo
Founding Plan) were explicitly canceled by their customers
(`cancellation_requested`, not `payment_failed`) within the ~24 hours
spanning Sprint 3's and this sprint's runs, offset by one new $40/mo
signup from a different customer — net $60→$50/mo. Confirmed not
attributable to the Sprint 1 extraction bug (which affects reading price
data off invoice lines, not a subscription's `status` field). This is
exactly the kind of drift `STRIPE_RECONCILIATION_ENABLED` (Gate 6) exists
to track automatically going forward instead of relying on manual
re-investigation.

### 2c. PostHog — behavior-only comparison (not a strict reconciliation)

Per the operator's own framing ("PostHog where behavior-only comparison is
appropriate"), PostHog was queried read-only for two directional data
points, explicitly **not** expected to equal the Postgres numbers — PostHog
tracks browser sessions/pre-signup behavior; Postgres tracks completed
registrations and server-side job records:

| PostHog metric | Value | Postgres equivalent | Relationship |
|---|---|---|---|
| Distinct `persons` (all-time) | 2,740 | `business_users` (registered) = 417 | PostHog sees ~6.6× more identities than Postgres has registered accounts — consistent with the already-documented guest/anonymous-visitor gap (Sprint 0 baseline: 641 guest-attributable job-actor ids vs. 409 registered users at the time); PostHog additionally captures visitors who never took any product action at all. |
| `job_created` events (last 30d) | 444 | `"Job"` created (30d, legacy/unfiltered) = 475; `business_jobs` created (30d, canonical/customer-only) = 309 | 444 sits between the two Postgres figures — directionally sensible: client-side event capture under-fires relative to the server-authoritative `"Job"` count (ad blockers, client-side failures before the event fires), while still capturing guest activity that the canonical, customer-only count excludes. |

Both relationships are consistent with the already-documented architecture
(PostHog is a superset-ish, lossy, client-side view; Postgres is the
server-side system of record) — no unexplained divergence. This is
explicitly a sanity check, not a target-equality validation; PostHog is not
and is not intended to become a canonical source for any dashboard field in
this program.

## 3. Separating the categories the operator asked to keep distinct (item 7)

| Category | Value (2026-07-27, live) | Source |
|---|---|---|
| **Contractual MRR** | $50.00/mo (Stripe, `stripeMrrCents=5000`) | Stripe `subscriptions.list`, normalized via `stripeMrr.ts` V2 (shadow-validated, not live-written) |
| **Collected cash** | Tracked per-invoice as `collectedCashCents` in the `mrr_extraction_shadow_compare` log (shadow mode only — `SubscriptionCurrentState` is empty, so no aggregate collected-cash figure exists yet) | `SubscriptionCurrentState.lastInvoiceAmountPaidCents` (schema exists, unpopulated) |
| **Active subscriptions** (Stripe-verified) | 2 | Stripe `subscriptions.list(status=active)` |
| **Paid-access accounts** (Postgres `plan <> 'free'`) | 12 | `"User"` table |
| **Demo/internal/founder accounts** | 4 (1 demo, 1 founder, 2 internal) | `business_users` `userClass`, Sprint 2 backfill |
| **Guest activity** (jobs with no matching `User` row, 30d) | 166 | `business_jobs.isGuest` |
| **Registered-customer activity** (30d, `includeInBusinessMetrics`) | 309 | `business_jobs` |

**The "12 paid-access accounts vs. 2 active Stripe subscriptions" gap is
the single most important number in this table.** It means 10 of the 12
accounts showing a non-free `plan` value in Postgres have **no
corresponding live Stripe subscription** — consistent with, and further
evidence for, the already-known issues this program exists to fix: manually
granted/legacy plan values (e.g. `founding_workflow`), the demo account
(`plan='pro'`, no Stripe subscription by construction), and the founder's
own account, none of which should be counted as "paying customers" in any
canonical revenue metric. This is exactly the confusion `METRICS.md`'s
"Paying Customers" definition (`stripe_subscription_id IS NOT NULL`
required) is designed to prevent — and confirms, with fresh data, that the
Sprint 2 taxonomy exclusions are doing real work, not just handling a
name-your-friend edge case.

## 4. Tests run

- `npx tsc --noEmit`: clean.
- `npx tsc --outDir <tmp>` full build: clean, exit 0.
- Lint: **361 → 361, delta 0.** This sprint's code changes are entirely
  within already-linted files (`canonicalDashboard.ts`,
  `canonicalDashboardCutover.ts`); every `!= null` pattern introduced while
  writing the new comparisons/computations was found and converted to
  strict `!==`/`!== undefined` before this count was taken — zero new
  issues of any kind, not even the usual accepted `no-console` bump (no new
  CLI script was added this sprint).
- Full suite: **56/56 pass** (47 prior + 9 new validator tests in
  `tests/canonicalDashboardCutover.test.ts`).
- Live validation: §2 above, entirely read-only.

## 5. Stop-condition evaluation

**Not triggered.** No production assumption was found to conflict with the
approved architecture. Two findings surfaced during this sprint
(`business_users` missing `name`/`lastActiveAt`; Stripe's live subscriber
count having moved since Sprint 3) are both explained, non-alarming, and
don't require halting: the first is a minor, additively-fixable view gap;
the second is expected real-world drift in a live external system, exactly
what `STRIPE_RECONCILIATION_ENABLED` (Gate 6) exists to track automatically.

## 6. Rollback

Nothing to roll back — no flag was enabled, no migration was written or
applied this sprint (the `users`/`business_users` view-extension fix is
explicitly **not** written, only documented as a future dependency), and
`DASHBOARD_CANONICAL_CUTOVER` remains exactly as capable-but-off as it was
after Sprint 6, just covering 6 more fields whenever it is eventually
enabled (Gate 5).
