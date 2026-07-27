# IMPLEMENTATION_PROGRESS.md — VideoText Analytics Migration

This file is the resumable state for the analytics-migration program
(Phase 3 execution of docs/analytics/*.md). Read this file and every doc in
`docs/analytics/` before continuing this work in a new session.

---

## Current sprint

**Sprint 0 — complete.** Execution is **paused before Sprint 1** pending human
decision — see "Blocking finding" below. Do not proceed to writing a Sprint 1
fix until this is resolved.

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

## Blocking finding — STOP before Sprint 1

**The approved plan's MRR root-cause assumption does not match production
data.** `IMPLEMENTATION_MASTER_PLAN.md` Issue #1 and `SPRINT_PLAN.md` Sprint 1
assume the defect is *overcounting*: multiple `SubscriptionSnapshot` rows per
subscription (one per renewal invoice) being summed together without
deduplication. **Live data shows the opposite: every `SubscriptionSnapshot`
row ever written (all 21, spanning the table's entire ~3.5-month history) has
`priceMonthly = 0`, and all 13 currently-`active` rows have
`stripeSubscriptionId IS NULL`.** Meanwhile the live `User` table has 3
accounts on `pro` and 3 on `founding_workflow` — real paid plans exist, but
none of their revenue has ever been captured into `SubscriptionSnapshot`.

**Practical implication:** MRR computed from `SubscriptionSnapshot` today is
$0, not inflated. The Sprint 1 fix as designed (deduplicate by
`stripeSubscriptionId`) would deduplicate a column that is already always
null in every active row — it would not fix anything, because it targets the
wrong root cause.

**Likely actual root cause (not yet confirmed — would require inspecting a
real Stripe invoice object, which this session has not done):**
`computeNormalizedMonthlyCentsFromInvoice`/`getPriceRecurring`
(`server/src/utils/stripeMrr.ts`) appears to be silently failing to extract a
recurring price and subscription id from real Stripe invoice line items on
every `invoice.payment_succeeded` webhook — possibly because the invoice's
line-item `price` field isn't expanded to a full `Stripe.Price` object as the
function expects (it treats a plain string price ID as "not recurring" and
returns `null`, per `stripeMrr.ts`'s `getPriceRecurring()`), or because of a
mismatch with the `2026-01-28.clover` Stripe API version's actual invoice
line-item shape referenced in a comment in `stripeWebhook.ts`.

**Why this stops here rather than continuing into a fix:** this is exactly
the operator's own STOP CONDITION — *"live production data violates
assumptions required by the plan"* — and *"implementation would change
billing behavior"* once a real fix is written. Sprint 1's approved design
(query-level dedup, no schema change) cannot be executed as written because
there's nothing to deduplicate; writing a *different* fix (root-causing and
patching the Stripe invoice price-extraction logic) would be an unplanned
change to revenue-critical webhook code, which itself needs a human decision
before proceeding, not a unilateral architecture deviation.

## Unresolved issues

1. **[Blocking]** MRR capture defect — see above. Needs either (a) approval to
   inspect a live Stripe invoice object (read-only `stripe.invoices.retrieve`
   call) to confirm the exact shape mismatch, or (b) a decision from the
   operator on how to proceed given this changes Sprint 1's actual scope.
2. `server/` has no installed `node_modules` in this environment — the new
   baseline script has not been executed via `tsx` itself (only its embedded
   SQL, validated directly). Not blocking, but noted so a future session
   doesn't assume the script has been end-to-end tested.
3. No unit test exists yet for `analytics-baseline.ts`'s flag logic (loose
   end, non-blocking).

## Latest commit hash

Pending — see "Exact next step."

## Exact next step

1. Commit Sprint 0's work now (docs + baseline script + this progress file)
   as `analytics-sprint-0: <summary>` — additive-only, zero production risk,
   safe to commit without further confirmation.
2. **Stop and present the blocking finding to the operator.** Do not write or
   commit any Sprint 1 code until they decide how to proceed (e.g., approve a
   read-only Stripe invoice inspection to confirm the root cause; or provide
   the actual root cause directly; or explicitly accept a revised Sprint 1
   scope that fixes price extraction instead of/in addition to deduplication).
3. Sprints 2–8 are unaffected by this finding and could in principle proceed
   in code-writing form (schema migrations as unapplied files, dashboard
   shadow-read logic defaulted off, etc.) — but per the operator's own rule
   ("do not redesign the architecture unless implementation reveals a
   genuinely blocking defect" / STOP CONDITIONS), the right move is to
   surface this now rather than silently reordering the roadmap around it.
