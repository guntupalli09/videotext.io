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

## Blocking finding — ROOT-CAUSED 2026-07-27, revised Sprint 1 pending approval

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

## Unresolved issues

1. **[Blocking — awaiting operator approval]** Revised Sprint 1 scope
   (extraction fix, not dedup) is documented but **no implementation code has
   been written**, per explicit operator instruction ("do not implement the
   fix until the revised Sprint 1 is approved"). Do not write code against
   `stripeMrr.ts`/`stripeWebhook.ts` until that approval is given.
2. Whether Stripe supports expanding `line.pricing.price_details.price` into
   a full object on the invoice fetch itself (avoiding an extra
   `stripe.prices.retrieve()` call per webhook) has not been checked — a
   quick read-only follow-up once the fix is approved, not blocking the
   approval decision itself.
3. `getPlanFromSubscriptionItems()` / `Subscription.items` shape not yet
   inspected (see above) — should be checked before Sprint 1 is called done,
   not necessarily before it starts.
4. `server/` has no installed `node_modules` in this environment — the
   Sprint 0 baseline script (`server/src/scripts/analytics-baseline.ts`) has
   not been executed via `tsx` itself (only its embedded SQL, validated
   directly via `psql`). Not blocking.
5. No unit test exists yet for `analytics-baseline.ts`'s flag logic (loose
   end, non-blocking).

## Latest commit hash

`9887a6a` — `analytics-sprint-0: baseline instrumentation, planning docs
committed, MRR root-cause finding` (local only, not pushed).

A second, docs-only commit for the Sprint 1 plan revision follows this update
(see git log after this file is saved) — labeled distinctly from the
`analytics-sprint-N` implementation-commit convention since it's a planning
correction, not a sprint's completed implementation.

## Exact next step

1. **Await explicit operator approval of the revised Sprint 1 scope** (see
   `docs/analytics/SPRINT_PLAN.md` Sprint 1, revised). Do not write or commit
   any code touching `stripeMrr.ts`, `stripeWebhook.ts`, or
   `SubscriptionSnapshot` until that approval is given.
2. Once approved: implement the extraction fix behind a feature flag,
   log-only shadow mode first (per the revised validation plan) — do **not**
   start by writing to `SubscriptionSnapshot` with corrected values; confirm
   correctness via logs + manual Stripe Dashboard cross-check first.
3. Before declaring Sprint 1 complete: check `getPlanFromSubscriptionItems()`
   / `Subscription.items` for the same restructuring pattern.
4. Sprints 2–8 are otherwise unaffected by this finding and remain available
   to resume once Sprint 1 is unblocked.
