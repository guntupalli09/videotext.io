# IMPLEMENTATION_PROGRESS.md — VideoText Analytics Migration

This file is the resumable state for the analytics-migration program
(Phase 3 execution of docs/analytics/*.md). Read this file and every doc in
`docs/analytics/` before continuing this work in a new session.

---

## Current sprint

**Sprint 0 — complete.** **Sprint 1 — implemented and validated in shadow-mode
form; not yet fully closed.** The corrected extraction is proven correct
against 10 real production invoices (see "Sprint 1 validation results"
below). Both new feature flags (`MRR_EXTRACTION_V2_SHADOW`,
`MRR_EXTRACTION_V2_WRITE`) default OFF — **zero production behavior has
changed**. Do not enable `MRR_EXTRACTION_V2_WRITE` and do not run
`prisma migrate deploy` for the new `SubscriptionCurrentState` table until
the "New open question" below is resolved and the operator explicitly
approves both. Do not start Sprint 2 until that happens.

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

**New open question (surfaced by validation, not a defect):** 4 of the 10
sampled invoices had a 100%-off promo/discount applied
(`billing_reason: subscription_create`, real Stripe discount object present,
`amount_paid: 0`). The corrected extraction reports the **contractual**
price ($40/$10/$24.99), matching `stripeMrr.ts`'s own pre-existing documented
intent to ignore `invoice.amount_paid` — but this means MRR will show the
committed run-rate, not the $0 actually collected during an active 100%-off
promo period. **This is a business decision, not a bug**, and needs an
explicit answer before `MRR_EXTRACTION_V2_WRITE` is turned on:
- Option A: MRR = contractual/list price (current implementation's behavior;
  matches the pre-existing code's stated design intent).
- Option B: MRR = actual amount collectible this period (would need to net
  out active discounts — not implemented).

## Unresolved issues

1. **[Blocks `MRR_EXTRACTION_V2_WRITE` and the `SubscriptionCurrentState`
   migration apply — awaiting operator decision]** The contractual-vs-collected
   MRR question above. Shadow mode itself is NOT blocked by this (it's pure
   read/log, no behavior change) and can be enabled at any time.
2. **[Separate, not part of Sprint 1]** `Subscription.current_period_start/end`
   restructuring — likely breaks `User.billingPeriodStart/End` tracking.
   Needs its own investigation before any decision or fix.
3. The `SubscriptionCurrentState` migration file exists but has **not** been
   applied (`prisma migrate deploy` not run) — pending explicit go-ahead,
   per the operator's database safety rules (treated as its own approval
   gate even though it's purely additive).
4. No unit test exists yet for the new `stripeMrr.ts` V2 functions or
   `analytics-baseline.ts`'s flag logic (loose ends, non-blocking — the
   functions are validated via the live validation report instead, which is
   arguably stronger evidence than a synthetic unit test, but a unit test
   would still be good hygiene for regression protection going forward).

## Latest commit hash

`eeb429b` — `analytics-plan-revision: correct Sprint 1 root cause via
read-only Stripe investigation` (local only, not pushed). A further commit
for this session's Sprint 1 implementation + validation follows immediately
after this file is saved — see git log.

## Exact next step

1. **Present the contractual-vs-collected MRR question to the operator** and
   get an explicit answer before enabling `MRR_EXTRACTION_V2_WRITE`.
2. If/when approved: run `prisma migrate deploy` for
   `20260727120000_add_subscription_current_state` (additive, low risk, but
   its own explicit go-ahead per the database safety rules) and wire
   `SubscriptionCurrentState` writes into the webhook handler.
3. Separately: decide whether/when to investigate the
   `Subscription.current_period_end` finding — not blocking Sprint 1, but a
   real, live, billing-adjacent defect worth a decision.
4. Do not start Sprint 2 until 1–2 above are resolved and Sprint 1 is
   explicitly confirmed complete by the operator.
