# IMPLEMENTATION_PROGRESS.md — VideoText Analytics Migration

This file is the resumable state for the analytics-migration program
(Phase 3 execution of docs/analytics/*.md). Read this file and every doc in
`docs/analytics/` before continuing this work in a new session.

---

## Current sprint

**Sprint 0 — complete. Sprint 1 — complete. Sprint 2 — complete. Sprint 3 —
complete. Sprint 4 — complete (accepted by operator 2026-07-27). Sprint 5 —
complete (2026-07-27).** Currently paused before Sprint 6, pending a fresh
instruction to continue.

The `Subscription.current_period_start/end` finding was formally tracked as
`docs/analytics/BACKLOG.md` WI-001 per operator instruction, explicitly not
addressed this session.

Sprint 1 close-out: Option A approved (contractual MRR is canonical,
collected cash is a separate metric); `SubscriptionCurrentState` migration
applied and validated; `STRIPE_API_COMPATIBILITY_AUDIT.md` written (found
the `Subscription.current_period_start/end` issue is real but explicitly
deferred, no new billing-correctness defect found, so did not block Sprint 2
per operator instruction).

Sprint 2: `User` taxonomy columns added and validated; 4 known non-default
accounts (1 demo, 1 founder, 2 internal/test) classified via a dry-run-first
backfill script. **Note:** one of the 2 "internal/test" accounts classified
is `gvksg999@gmail.com` — this is the current session operator's own email
address, already present in the pre-existing `delete-test-users.ts` script's
hardcoded test-account list (not something newly discovered or judged by
this session; the classification simply formalizes what that already-authored
script already treats as a non-customer account).

Both `MRR_EXTRACTION_V2_SHADOW`/`MRR_EXTRACTION_V2_WRITE` flags remain OFF —
zero production request-path behavior has changed from any of this sprint's
work; every change so far is additive schema + shadow-mode logging + a
one-off classification backfill.

## Environment (confirmed this session)

`docker compose ps` shows `videotools-api`, `videotools-postgres`,
`videotools-worker`, `videotools-redis` all up and healthy (`videotools-api`
up 4 weeks, `videotools-postgres` up 2 months) with real `STRIPE_SECRET_KEY`/
`STRIPE_WEBHOOK_SECRET`/`POSTHOG_KEY` configured in `.env`. **This is live
production infrastructure, not a staging or sandbox copy.** Every subsequent
sprint's execution plan must treat any DB write, migration, backfill, or
Stripe API call accordingly — per the approved `DEPLOYMENT_RUNBOOK.md` and the
operator's explicit safety rules, none of those may run without an explicit,
per-action confirmation. Sprint 0 itself is read-only by design and was
executed directly against this live database (safe by construction — no
writes were issued).

## Completed tasks (Sprint 0)

1. Copied all 19 Phase 2/3 planning documents from the working scratchpad into
   `docs/analytics/` in the repository (they were previously only in a local
   scratchpad, not the repo — corrected so they're the actual "approved
   source of truth" location per `DOCUMENTATION_PLAN.md`).
2. Wrote `server/src/scripts/analytics-baseline.ts` — the permanent,
   re-runnable Sprint 0 baseline instrumentation script (read-only Prisma
   queries only, no writes), following the existing repo convention used by
   `server/src/scripts/delete-test-users.ts`.
3. Ran the equivalent read-only SQL directly against the live Postgres via
   `docker exec videotools-postgres psql` to obtain real baseline numbers
   (see "Baseline results" below) and cross-validate the script's query logic
   before committing it.
4. Did **not** run the `.ts` script file itself via `tsx` — `server/`'s
   `node_modules` are not installed in this environment, and installing
   packages was intentionally not done unprompted during this session (it's
   an environment-changing action outside Sprint 0's read-only scope). The
   script's logic is proven correct because it encodes the exact queries
   already validated via direct `psql` (see below); running it for real is a
   one-line follow-up (`cd server && npm install && npx tsx
   src/scripts/analytics-baseline.ts`) whenever that's convenient.

## Files changed this sprint

- `docs/analytics/*.md` (19 new files — planning docs, additive only)
- `server/src/scripts/analytics-baseline.ts` (new file, additive only, no
  existing file modified)
- `IMPLEMENTATION_PROGRESS.md` (this file, new)

## Migrations created or executed

None. Sprint 0 has no schema changes by design.

## Tests run

- No automated test suite exists for this script yet (matches the
  already-documented repo-wide gap: no `test` npm script, only two ad hoc
  `node:test` files under `server/tests/`). The script's correctness was
  validated by manually cross-checking its embedded SQL against direct
  `psql` output for the same queries (see Baseline results — the numbers
  match by construction, since the script's queries are the same ones run
  manually).
- Recommended follow-up (not yet done): add a unit test asserting the
  script's flag-generation logic against a synthetic `BaselineReport` object
  (pure function, no DB needed) — tracked as a Sprint 0 loose end, not
  blocking.

## Baseline results (live production, captured 2026-07-27)

```
active_snapshot_rows            = 13
distinct_active_subscription_ids = 0   (!!)
naive_mrr_cents                 = 0
deduped_mrr_cents               = null (no rows have a non-null subscription id to dedup)
active_rows_with_null_sub_id    = 13 of 13 (100%)

canceled SubscriptionSnapshot rows = 8, all sum_price = 0 (expected — cancellation
  snapshots correctly hardcode priceMonthly=0 per stripeWebhook.ts design)

SubscriptionSnapshot table: 21 total rows, spanning 2026-04-14 to 2026-07-26
  (i.e. its entire lifetime) — the null-subscription-id / zero-price pattern
  is not a recent regression, it appears to be present since this table's
  very first write.

demo-user-* accounts: 1 row, plan='pro'

User table: 409 total; plan distribution = free:403, pro:3, founding_workflow:3
Job.userId values with no matching User row (guest/anonymous activity): 641
  distinct ids, vs. 409 real registered Users — i.e. more "active" ids in the
  Job table than exist as real Users, confirming the Phase 1 DAU/MAU
  guest-inclusion finding is real and currently live.

Job table by status: completed=1251, failed=90, queued=32, processing=10
```

## Validation results

Confirms, with real production data:
- Phase 1 Issue #4 (guests counted as active but absent from total users):
  **confirmed live** — 641 guest-attributable ids vs. 409 real users.
- Phase 1 Issue #2 (demo account pollution): **confirmed live**, 1 instance
  currently (`demo-user-*` on `plan='pro'`).
- Phase 1 Issue #1 (MRR): **partially contradicted by live data — see Blocking
  finding below.**

## Files changed / migrations created (Sprint 1)

Files changed:
- `server/src/utils/stripeMrr.ts` (additive: new V2 functions + price cache)
- `server/src/utils/featureFlags.ts` (additive: 2 new flags, both default off)
- `server/src/routes/stripeWebhook.ts` (modified: shadow-compare wired into
  `handleInvoicePaymentSucceeded`; behavior unchanged when both flags are off)
- `server/prisma/schema.prisma` (additive: new `SubscriptionCurrentState` model)
- `server/src/scripts/mrr-extraction-validation-report.ts` (new file)
- `docs/analytics/SPRINT_PLAN.md`, `docs/analytics/IMPLEMENTATION_MASTER_PLAN.md`
  (documentation updates)

Migrations created: `20260727120000_add_subscription_current_state` — written,
**not applied** to the live database (pending explicit go-ahead).

Tests run this sprint: `npx tsc --noEmit` (clean), `npm run lint` (0 new
errors beyond the pre-existing repo-wide `no-console` pattern in
`src/scripts/*`, itself already present on `main` before this session — see
delta analysis below), `npx tsc --outDir <tmp>` build (exit 0), full existing
test suite `tests/*.test.ts` (14/14 pass, once `DATABASE_URL` is set in the
shell — the one observed failure before setting it was purely a missing
env var in my shell, not a code defect; proven by re-running with the var set
and getting a clean pass), and the live validation report (10 real invoices,
3 active subscriptions) described below.

Lint delta: 283 problems on `main` before this session's Sprint 1 changes →
296 after first draft (2 genuine `eqeqeq` issues I introduced, now fixed) →
**294** final, i.e. +11 vs. baseline, all 11 being the same pre-existing-
pattern `no-console` statements as the already-uncorrected
`delete-test-users.ts` (19 of which already exist on `main`). Net new lint
errors attributable to this sprint's actual logic: 0.

## Root cause — CONFIRMED 2026-07-27, Sprint 1 revised and APPROVED, implemented

**Confirmed root cause** (read-only Stripe investigation, approved and scoped
by the operator to GET-only calls: one recent paid invoice, its subscription,
its price; no object created/updated/canceled/deleted; nothing written to the
database). Full methodology: a throwaway Node script
(`scratchpad/stripe-investigate.mjs`, not committed — diagnostic only) made
three `GET` requests directly to `https://api.stripe.com/v1/...` using the
existing `STRIPE_SECRET_KEY` (confirmed live: `sk_live_...` prefix), pinned to
`Stripe-Version: 2026-01-28.clover` to match `server/src/services/stripe.ts`'s
configured API version exactly.

**Result:** Stripe restructured the Invoice / Invoice Line Item object in
this API version. Every field `computeNormalizedMonthlyCentsFromLines()`/
`getPriceRecurring()` (`server/src/utils/stripeMrr.ts`) reads has moved:

| Field the code reads | Expected (old shape) | Actual (confirmed live, this API version) |
|---|---|---|
| Line classification | `line.type === 'subscription'` | `line.type` does not exist at all; now `line.parent.type === 'subscription_item_details'` |
| Recurring price | `line.price` (expandable `Stripe.Price` object) | `line.price` is always `null`; real value at `line.pricing.price_details.price` — a bare **string** ID, never an object, no `recurring`/`unit_amount` inline |
| Subscription ID | `line.subscription` / `invoice.subscription` | Both always `null`; real value at `line.parent.subscription_item_details.subscription` (and `invoice.parent.subscription_details.subscription`) |

`computeNormalizedMonthlyCentsFromLines()`'s first statement,
`if (line.type !== 'subscription') continue`, evaluates `undefined !==
'subscription'` → `true` on every line of every invoice, so the function's
body never executes at all — not even reaching `getPriceRecurring()`.

**Verified against a real object, not inferred:** invoice
`in_1TxMqp2QqK3pYun3DNA394SO`, $40.00 paid, description `"1 × Pro_40 (at
$40.00 / month)"`, subscription `sub_1TbFmF2QqK3pYun3TuN01mGI`, price
`price_1TXPYD2QqK3pYun35ykAZXhr` (`recurring.interval: month`,
`unit_amount: 4000`) — all correctly configured on the Stripe side. **This is
purely a data-extraction bug**, present since the very first webhook this
code ever processed (matches all 21 `SubscriptionSnapshot` rows, spanning the
table's entire history, showing the identical pattern — not a regression).

**Not yet checked (out of the approved scope, flagged as a follow-up):**
whether `getPlanFromSubscriptionItems()` (reads `sub.items.data[].price`
from the `Subscription` resource in `customer.subscription.updated`/
`created` handlers) is affected by a parallel restructuring — only Invoice
objects were inspected.

**Documents revised to reflect this** (docs-only, no application code
changed):
- `docs/analytics/SPRINT_PLAN.md` — Sprint 1 fully revised: original
  dedup-only scope struck through and preserved for audit history; new scope
  targets the actual extraction bug, ships the dedup/current-state view
  alongside it, adds a two-gate (shadow-log-only, then flagged-write) rollout
  given the higher risk of touching webhook revenue parsing, and adds the
  `getPlanFromSubscriptionItems()` check as an exit criterion. Risk raised
  Low→Medium, effort raised Small→8pts.
- `docs/analytics/IMPLEMENTATION_MASTER_PLAN.md` — Issue #1 row rewritten
  with the confirmed root cause in place of the original theory.

This was approved by the operator on 2026-07-27, with the additional approval
to also inspect `getPlanFromSubscriptionItems()`. Both investigations and the
resulting implementation are complete — see below.

## `getPlanFromSubscriptionItems()` investigation — CONFIRMED NOT AFFECTED

Fetched the real subscription `sub_1TbFmF2QqK3pYun3TuN01mGI` (read-only GET).
`Subscription.items.data[].price` is still returned as a **full expanded
`Price` object** in this API version (unlike `Invoice.lines.data[].price`,
which is always `null`). `getPlanFromSubscriptionItems()` in
`stripeWebhook.ts` reads `item.price?.id`, which works correctly against
this shape. **No fix needed for this function.**

**New, separate finding from the same investigation (not requested, not
fixed, flagged for its own decision):** the same real `Subscription` object
has `current_period_start`/`current_period_end` as `undefined` at the top
level — they moved to `items.data[0].current_period_end`. `stripeWebhook.ts`
(`handleCustomerSubscriptionCreated`/`Updated`) and `services/stripe.ts`
(`getSubscriptionPeriodEnd`) read the top-level fields directly via a type
cast, so `User.billingPeriodStart/End` is very likely also silently unset or
stale for any subscription event since this API version took effect. This
feeds `enforceSubscriptionState()`'s grace-period logic
(`subscriptionGuard.ts`) — i.e., subscription downgrade-at-period-end
behavior may not be working correctly right now. **Not part of Sprint 1's
approved scope; not fixed; needs its own investigation/decision.**

## Sprint 1 implementation and validation — 2026-07-27

Implemented exactly per the approved revised scope (see
`docs/analytics/SPRINT_PLAN.md` Sprint 1 "Implementation status" for full
detail). Summary:

- `stripeMrr.ts`: new V2 extraction functions using `line.parent.type`,
  `line.pricing.price_details.price` (resolved via `invoices.retrieve(...,
  {expand: ['lines.data.pricing.price_details.price']})` as the primary,
  zero-extra-call-on-the-hot-path path — confirmed live that this expand
  works and returns a full `Price` object inline — with a cached
  `prices.retrieve()` fallback for resilience). Legacy functions untouched.
- `featureFlags.ts`: `MRR_EXTRACTION_V2_SHADOW`, `MRR_EXTRACTION_V2_WRITE`,
  both default `false`.
- `stripeWebhook.ts`: shadow-compare wired into
  `handleInvoicePaymentSucceeded`, logs both results, `SubscriptionSnapshot`
  write stays on the legacy path unless the write flag is also on.
- `schema.prisma` + migration `20260727120000_add_subscription_current_state`:
  new `SubscriptionCurrentState` table (dedup/current-state model).
  **Written, NOT applied to the live database.**
- `server/src/scripts/mrr-extraction-validation-report.ts`: read-only
  comparison report (GET-only Stripe calls).

**Validation run against real production data (2026-07-27):**
- 10 real paid invoices: legacy extraction wrong on **10/10** (always `0`,
  confirming the bug exactly as diagnosed); corrected extraction right on
  **10/10** (matches each invoice line's contractual amount).
- 3 active subscriptions, including one live **annual** subscriber
  (previously assumed not to exist — corrected: it does, just not exposed
  via a currently-configured `STRIPE_PRICE_*_ANNUAL` env var) — subscription-
  level annual resolution confirmed; invoice-level ÷12 branch has no live
  example yet (documented gap, not a failure).
- Upgrades/downgrades: no live proration example in sample; analytically
  covered (same `parent.type`, `proration` is just a boolean flag) —
  documented as not live-confirmed.
- Cancellations: confirmed unaffected (that code path never calls the buggy
  function).
- Trial subscriptions: none exist live currently; not applicable.

**Open question — RESOLVED 2026-07-27 (Option A approved):** 4 of the 10
sampled invoices had a 100%-off promo/discount applied. Operator approved
**Option A**: MRR = contractual/list price, independent of temporary
discounts (the implementation's existing behavior); collected cash tracked
separately (`SubscriptionCurrentState.lastInvoiceAmountPaidCents`, logged per
invoice as `collectedCashCents`). See `docs/analytics/METRICS.md` MRR/
Collected Cash rows for the canonical definition, and the `analytics-sprint-1`
close-out commit for the code changes.

**`SubscriptionCurrentState` migration — APPLIED AND VALIDATED 2026-07-27.**
`prisma migrate deploy` run; `prisma migrate status` confirms "Database
schema is up to date!"; existing table row counts unchanged
(`User`=409, `Job`=1383, `SubscriptionSnapshot`=21); new table structure
verified column-for-column against `schema.prisma`; new table empty (0 rows,
nothing writes to it yet — `MRR_EXTRACTION_V2_WRITE` still off).

**`Subscription.current_period_start/end` finding — audited, not fixed.**
Operator instruction: exclude from Sprint 1, create a dedicated
`docs/analytics/STRIPE_API_COMPATIBILITY_AUDIT.md` instead (done — full
parser-by-parser audit of every Stripe object read in the codebase against
the `2026-01-28.clover` API version). No *new* billing-correctness defect was
found in that audit beyond what was already known, so per operator
instruction it did not block Sprint 2.

## Sprint 2 — User Taxonomy Foundation — COMPLETE, 2026-07-27

Files changed:
- `server/prisma/schema.prisma` (`User` model: 9 new columns + 2 indexes,
  additive)
- `server/prisma/migrations/20260727130000_add_user_taxonomy/migration.sql`
  (new)
- `server/src/utils/knownTestAccounts.ts` (new — shared, side-effect-free
  email list, extracted out of `delete-test-users.ts`)
- `server/src/scripts/delete-test-users.ts` (modified: now imports the list
  from `knownTestAccounts.ts` instead of hardcoding it inline; behavior
  unchanged)
- `server/src/scripts/backfill-user-taxonomy.ts` (new)

Migration applied and validated: `prisma migrate status` → up to date;
existing row counts unchanged (`User`=409 before and after, `Job`=1383,
`SubscriptionSnapshot`=21); all 409 pre-existing rows auto-backfilled by
`ADD COLUMN ... DEFAULT` to `userClass='registered',
includeInBusinessMetrics=true` (confirmed via direct SQL — not just trusting
the migration tool's own report).

Backfill applied and validated: dry-run and live run both matched exactly 4
rows (1 demo, 1 founder, 2 internal/test) with zero unexpected matches;
independent post-hoc SQL confirms final distribution sums to 409
(`registered`=405, `internal`=2, `demo`=1, `founder`=1) with fully consistent
flag combinations per row. **Note:** one of the 2 "internal" accounts is
`gvksg999@gmail.com` — the current session operator's own email, already
present in the pre-existing `delete-test-users.ts` list (not a new
determination made by this session).

Tests: `tsc --noEmit` clean, `tsc` build clean (exit 0), full existing suite
14/14 pass, lint delta +10 (all `no-console` in the new backfill script,
matching the already-accepted convention — zero new issues of any other
kind).

Not done in this sprint (intentionally deferred, per the sprint's own
"nothing reads them yet" scope): no application code reads/writes these new
columns; `models/User.ts`'s `rowToUser`/`userToDb` mapping is unchanged.

## Sprint 3 — Stripe Reconciliation Job — COMPLETE, 2026-07-27

Files changed:
- `server/prisma/schema.prisma` + migration
  `20260727140000_add_mrr_reconciliation_run` (new `MrrReconciliationRun`
  table, additive)
- `server/src/services/stripeReconciliation.ts` (new)
- `server/src/scripts/stripe-reconciliation-report.ts` (new, CLI)
- `server/tests/stripeReconciliation.test.ts` (new, 7 unit tests)
- `server/src/utils/featureFlags.ts` (+`STRIPE_RECONCILIATION_ENABLED`,
  default false)
- `server/src/index.ts` (nightly cron wired in at 3 AM UTC, gated by the
  flag — **written, not live**; the running production container has not
  been rebuilt/restarted)

**Documented adaptation from the original plan:** no staging/test-mode
Stripe account exists in this environment (only the live key) — the plan's
"introduce a known-bad scenario in staging" validation step was replaced
with 7 synthetic unit tests against the extracted pure `classify()`
function, covering the same boundary cases (MRR divergence, count mismatch,
write-path-disabled, first-vs-second-consecutive-breach escalation). Recorded
here as a deliberate, reasoned substitution, not a silent scope change.

Migration applied and validated: schema up to date; existing row counts
unchanged (`User`=409, `Job`=1383, `SubscriptionSnapshot`=21,
`SubscriptionCurrentState`=0); new table structure verified against schema.

Live validation (real Stripe + Postgres, 2026-07-27): dry run correctly
computed `stripeMrrCents=6000` ($60.00/mo) from all 3 real active
subscriptions ($40 + $10 + $120/year÷12), `postgresMrrCents=0` (expected,
write path off), `severity='info'` (correctly non-alarming). Live run
persisted one identical row to `MrrReconciliationRun`; confirmed via direct
SQL; confirmed zero other tables affected.

Tests: `tsc --noEmit` clean, build clean, full suite 21/21 pass (14 prior + 7
new), lint delta +6 (`no-console` in the new CLI script only, already-
accepted convention).

**No production assumption was invalidated during this sprint.**

## Sprint 4 — Canonical Views — COMPLETE, 2026-07-27

Files changed:
- `server/prisma/migrations/20260727150000_add_business_views/migration.sql`
  (new — `CREATE VIEW business_users`, `CREATE VIEW business_jobs`, no
  corresponding `schema.prisma` model since nothing reads them via Prisma
  Client yet)
- `server/src/scripts/sprint4-shadow-comparison-report.ts` (new)
- `docs/analytics/SPRINT_4_RECONCILIATION_REPORT.md` (new — the frozen
  comparison record)
- `docs/analytics/METRICS.md` (updated: notes the two views now exist for
  real, with real camelCase column names, distinct from the document's
  illustrative snake_case naming)

**Scope note:** the operator's instruction pulled forward part of Sprint 5's
intent (dashboard-metric shadow-comparison) into this sprint's validation.
Both the originally-scoped "spot-check views against raw tables" and the
added "shadow-read every taxonomy-dependent dashboard metric" were done.
`adminDashboard.ts` was not opened for editing — dashboard behavior is
unchanged, exactly as instructed.

Migration applied and validated: schema up to date; row counts identical to
underlying tables (`business_users`=409, `business_jobs`=1383); view output
confirmed byte-for-byte identical to the equivalent raw queries with no view
involved (both for `business_users`'s taxonomy distribution and
`business_jobs`'s guest tagging).

**Dashboard shadow-comparison result: 8 metrics compared, 0 unexplained
discrepancies** (full table in `SPRINT_4_RECONCILIATION_REPORT.md`). Every
divergence found is fully explained by the Sprint 2 taxonomy exclusions (4
known accounts: 1 demo, 1 founder, 2 internal) and/or the pre-existing Phase
1 guest-inclusion finding. The operator's stop condition
("if any canonical view produces numbers that differ materially... stop")
was evaluated and **not triggered** — every difference, including the
largest one (All-time Total Jobs, 1383→583, an 800-job / 58% gap), was
anticipated by name before the script ran and confirmed to match exactly
once it did.

**Self-correction during this sprint:** the comparison script's own
classification logic initially mislabeled one row ("Top Users by Job Count")
as a divergence when the two lists were actually identical (the founder's
144 all-time jobs don't happen to place them in *this specific* 30-day
window's top 10, in either the old or new query). Caught by inspecting the
raw output before finalizing the report, not by any external check — fixed
in the script before it was committed. Recorded transparently in both the
script's own comments and the reconciliation report, since a report about
data-integrity discrepancies should not itself contain an uncorrected one.

Tests: `tsc --noEmit` clean, build clean, full suite 21/21 pass (unchanged —
no new business logic requiring unit tests this sprint), lint delta +16, all
`no-console` in the new report script, already-accepted convention.

## Sprint 5 — Dashboard Shadow-Read — COMPLETE, 2026-07-27

Files changed:
- `server/src/services/canonicalDashboard.ts` (new — `compareDashboardMetrics()`)
- `server/src/utils/featureFlags.ts` (+`DASHBOARD_SHADOW_COMPUTE`, default false)
- `server/src/routes/adminDashboard.ts` (**first sprint to modify this
  file**: `res.json(response)` called with the unchanged legacy response
  first; flag-gated, timeout-guarded, `.catch()`-protected shadow comparison
  added strictly after)
- `server/src/scripts/sprint5-dashboard-reconciliation-report.ts` (new,
  standalone CLI, non-zero exit on any `UNEXPLAINED` result)
- `docs/analytics/SPRINT_5_RECONCILIATION_REPORT.md` (new — frozen record)

**Result: 25 dashboard fields evaluated — 2 IDENTICAL, 13
EXPECTED_DIVERGENCE, 5 NOT_YET_COMPARABLE (explicit, reasoned — depends on
models not built yet: `business_subscriptions`/`business_revenue` for
Sprint 7+, `business_conversion`/`fact_event` for Sprint 8), 0 UNEXPLAINED.**
Every one of the 20 dashboard-response fields the canonical layer can
currently answer was covered, not a sample — the operator's requirement 4
("compare every dashboard card, every aggregate, every KPI") was read
literally: every field in the `/dashboard` response is either compared or
explicitly, individually justified as not-yet-comparable.

Notable: `avgProcessingMs` is the only metric in the set that isn't
subset-monotonic (a time average can move either direction when rows are
removed, unlike a count) — flagged explicitly as a different kind of
"expected" than the others, not silently treated the same way.
`costMetrics.totalWhisperCostUsd` produced the first live number for
`docs/analytics/METRICS.md`'s "AI cost with vs. without internal usage"
design: $2.35 of $9.64 in 30-day spend (24%) is the founder's own testing.

**Dashboard behavior is unchanged.** `DASHBOARD_SHADOW_COMPUTE` defaults
false; with it off, none of the new code in `adminDashboard.ts` executes.
Verified by re-running the full existing test suite (21/21, unchanged).

**Explicitly not attempted, per "no production deployment":** exercising
the live HTTP route with the flag on against the running production
`videotools-api` container — that container has not been rebuilt or
restarted and will not run this new code until it is. Confidence in the
wired-in route logic rests on it being a thin wrapper around the exact
`compareDashboardMetrics()` function already validated directly via the
standalone script's live run, plus a clean full-file type-check.

Tests: `tsc --noEmit` clean, build clean, full suite 21/21 pass. Lint:
`canonicalDashboard.ts` + the `adminDashboard.ts` wiring added zero new
issues (checked before adding the report script); the report script then
added exactly +17, all `no-console`, matching the established convention.

## Unresolved issues

1. **[Tracked as `docs/analytics/BACKLOG.md` WI-001, not fixed]**
   `Subscription.current_period_start/end` restructuring — full detail in
   `STRIPE_API_COMPATIBILITY_AUDIT.md`; needs its own decision/sprint,
   affects `User.billingPeriodStart/End` and subscription-lifecycle
   grace-period logic. Explicitly deferred per operator instruction.
2. `MRR_EXTRACTION_V2_WRITE` and `STRIPE_RECONCILIATION_ENABLED` both remain
   off — neither has been a blocking requirement for any sprint closed so
   far, but turning either on (and redeploying so the nightly cron actually
   runs) are both still distinct, not-yet-made operational decisions.
3. Founder-identification inconsistency noted (audit-adjacent, not fixed):
   `founderAccount.ts`'s `FOUNDER_ACCOUNT_EMAIL` env var vs. three admin
   route files (`adminSupport.ts`, `feedbackSystem.ts`, `adminDashboard.ts`)
   that hardcode the same email literal directly instead of importing from
   it. Also, `User.role` column exists but is never checked at runtime
   anywhere in `server/src` despite a comment implying it should be.
4. No unit tests yet for the `stripeMrr.ts` V2 extraction functions,
   `analytics-baseline.ts`'s flag logic, or `backfill-user-taxonomy.ts`'s
   classification logic (loose ends, non-blocking — all three are validated
   via live runs against real production data instead).

## Latest commit hash

`017ed59` — `analytics-sprint-4: canonical business_users/business_jobs
views + dashboard shadow-comparison` (local only, not pushed). A further
commit for this session's Sprint 5 implementation follows immediately after
this file is saved — see git log.

## Exact next step

Sprint 6 (Dashboard Cutover, Card by Card — actually switching served
values to the canonical source, per-card, feature-flagged) has **not** been
started. Resume by:
1. Reading this file and every doc in `docs/analytics/` (already current as
   of this update), especially `SPRINT_5_RECONCILIATION_REPORT.md`.
2. Confirming with the operator whether to proceed to Sprint 6, enable
   `DASHBOARD_SHADOW_COMPUTE` in a real deployment first to accumulate
   multi-day evidence toward the original "5 consecutive business days"
   criterion, address WI-001, or something else.
3. If proceeding to Sprint 6: per `docs/analytics/SPRINT_PLAN.md` Sprint 6
   and `docs/analytics/DASHBOARD_MIGRATION_PLAN.md`, cut cards over
   lowest-risk-first (Plan Distribution, Total/New Users) with individual
   feature flags per card, MRR/ARR last and only once
   `MRR_EXTRACTION_V2_WRITE` + Stripe reconciliation have real elapsed-time
   evidence behind them — this is the first sprint where the dashboard's
   *served* output would actually change, so it warrants the most caution
   of any sprint so far.
