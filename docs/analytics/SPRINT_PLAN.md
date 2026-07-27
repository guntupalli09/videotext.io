# SPRINT_PLAN.md — VideoText Analytics Migration

Status: design/blueprint only. 2-week sprints. Story points are relative
t-shirt-size estimates for planning, not derived from actual team velocity.
Every sprint ships something independently deployable and reversible — no
sprint depends on a future sprint to be "safe" in isolation.

---

## Sprint 0 — Baseline Instrumentation (read-only, zero production risk)

- **Objective:** Measure the actual magnitude of every Phase 1 finding before
  changing anything, so every later fix has a "before" number to prove against.
- **Files affected:** new, isolated scripts/jobs only — no existing route,
  worker, or schema file touched.
- **Services affected:** none in the request path; a new scheduled job only.
- **Database changes:** none (read-only queries).
- **Risk:** None — purely additive, read-only.
- **Rollback:** Delete the new job; nothing else to undo.
- **Validation:** The job's own output *is* the validation — e.g., "MRR via
  naive sum: $X, MRR via deduplicated-by-subscription: $Y, delta: Z%."
- **Deployment strategy:** Ship as a manually-triggered or nightly cron,
  output to logs/a Slack digest — no UI change.
- **Business impact:** High leverage for near-zero cost — gives leadership a
  real number for "how wrong is our MRR right now" before any fix ships.
- **Engineering effort:** 3 points.
- **Success criteria:** A documented baseline report exists for MRR
  double-count magnitude, demo-account count, duplicate-subscription count,
  guest-vs-total-user gap, and job-count drift (Bull vs. Postgres).

## Sprint 1 — MRR Extraction Fix (REVISED 2026-07-27 after live root-cause investigation — Critical)

> **This sprint's scope changed from the original plan.** Sprint 0's baseline,
> run against live production data, showed `SubscriptionSnapshot.priceMonthly`
> is `0` and `stripeSubscriptionId` is `NULL` for all 21 rows ever written —
> not the "overcounted via duplicate active rows" theory this sprint was
> originally scoped to fix (there is nothing to deduplicate; the field has
> never once been populated). A read-only investigation against the live
> Stripe account (approved and scoped to GET-only calls: one recent paid
> invoice, its subscription, its price) confirmed the actual root cause:
> **Stripe's Invoice/Invoice Line Item object shape changed in this account's
> pinned API version (`2026-01-28.clover`)**, and
> `server/src/utils/stripeMrr.ts` was written against the older shape. See
> `IMPLEMENTATION_PROGRESS.md` for the full root-cause writeup and raw
> evidence. The original dedup-only Sprint 1 below is preserved struck
> through for audit history; the revised scope follows it.

- ~~**Objective:** Stop double/multi-counting MRR without touching
  subscription storage yet — fix the *read*, not the schema.~~
- ~~**Database changes:** none — this is a query-shape fix (dedup by
  `stripe_subscription_id`, take latest period per subscription), not a
  schema change.~~
- ~~**Validation:** Shadow-compute both old and new MRR for 3–5 days...~~

### Revised objective

Fix `getPriceRecurring()` / `computeNormalizedMonthlyCentsFromLines()`
(`server/src/utils/stripeMrr.ts`) to read the account's **actual** invoice
line item shape instead of the pre-restructure shape it was written against:

| Was read from (no longer populated) | Must read from instead |
|---|---|
| `line.type === 'subscription'` | `line.parent?.type === 'subscription_item_details'` (or equivalently, `line.parent?.subscription_item_details != null`) |
| `line.price` (expected an expandable `Stripe.Price` object) | `line.pricing?.price_details?.price` — a bare string price ID; the recurring interval/unit amount are **not** inline on the line at all in this API version and must be resolved separately |
| `line.subscription` / `invoice.subscription` | `line.parent?.subscription_item_details?.subscription` (and `invoice.parent?.subscription_details?.subscription` at the invoice level) |

- **Files affected:** `server/src/utils/stripeMrr.ts` (extraction logic),
  `server/src/routes/stripeWebhook.ts` (may need to pass more context or make
  one additional read-only `stripe.prices.retrieve()` call per
  `invoice.payment_succeeded` event to resolve `recurring.interval`/
  `unit_amount`, since the line item no longer carries them inline).
- **Services affected:** API (webhook handler) — this now touches **webhook
  parsing of real revenue events**, a materially higher-risk surface than the
  originally-scoped dashboard-query-only change.
- **Database changes:** none required for the extraction fix itself. The
  dedup/current-state model (`business_subscriptions`, originally scoped for
  Sprint 4 / migration M4) is pulled forward and shipped **together with**
  this fix rather than as a separate later sprint, since dedup logic has no
  observable effect until extraction actually starts producing non-null
  subscription IDs to deduplicate.
- **Risk:** Medium (upgraded from the original Low) — this is now a change to
  webhook parsing of live revenue events, not a read-only dashboard query.
- **Rollback:** Feature flag reverting to the old (currently-inert) extraction
  path; instant. The webhook handler's *write* behavior (still writing a
  `SubscriptionSnapshot` row every time, just with correct values once fixed)
  must also be flag-gated so a bad deploy can't start writing incorrect
  non-zero values instead of the current, at-least-consistent zeros.
- **Validation (revised, more conservative than originally planned):**
  1. Shadow-log the corrected extraction (subscription id, price id,
     normalized monthly cents) for every real incoming
     `invoice.payment_succeeded` webhook **without writing to
     `SubscriptionSnapshot` yet** — log-only.
  2. Manually cross-check a handful of shadow-logged results against the
     Stripe Dashboard's own invoice/subscription view (human, one-by-one,
     for the first several real invoices).
  3. Only after that manual cross-check confirms correctness, cut the
     webhook handler over to actually writing the corrected values, flagged,
     with the same divergence-monitoring pattern as any other cutover.
  4. **Before considering this sprint complete**, verify whether
     `getPlanFromSubscriptionItems()` (reads `sub.items.data[].price]` from
     the `Subscription` resource, used in `customer.subscription.updated`/
     `created` handlers) is affected by the same restructuring — this was
     **not** checked in the approved read-only investigation (scope was
     invoices only) and is a plausible second instance of the same bug class.
- **Deployment strategy:** Feature-flagged, log-only shadow mode first
  (no write-path change at all), then a separately-flagged write cutover —
  two gates, not one, given the higher stakes.
- **Business impact:** Critical, unchanged — still the single highest-value
  fix in the program; the fix itself is now different, not less important.
- **Engineering effort:** Re-estimated at 8 points (up from 5) — schema-shape
  discovery work is done, but the fix now includes an extra Stripe API call
  per webhook event, an additional flag gate, and the
  `getPlanFromSubscriptionItems()` follow-up check.
- **Approval status:** Revised scope approved 2026-07-27. **Contractual-vs-
  collected-cash question resolved same day: Option A approved** — MRR is
  canonically the subscription's contractual value, independent of temporary
  discounts; collected cash is tracked as a separate, non-substitutable
  metric (`SubscriptionCurrentState.lastInvoiceAmountPaidCents`, logged per
  invoice as `collectedCashCents`). `SubscriptionCurrentState` migration
  applied and validated against production (schema-up-to-date, existing
  table row counts unchanged, new table structure matches exactly). **Sprint
  1 is now closed.** `MRR_EXTRACTION_V2_WRITE` (turning on actual
  `SubscriptionSnapshot`/`SubscriptionCurrentState` writes) remains a
  separate, later decision — not required to close this sprint, since the
  sprint's deliverable was the corrected, validated extraction logic and the
  dedup/current-state schema, both of which are now in place. The
  `Subscription.current_period_start/end` finding was explicitly excluded
  from this sprint's scope by the operator and is fully documented instead in
  the standalone `STRIPE_API_COMPATIBILITY_AUDIT.md`.

### Implementation status (2026-07-27)

Shipped (all additive, both new flags default OFF, zero behavior change to
production as deployed):
- `server/src/utils/stripeMrr.ts` — new `computeNormalizedMonthlyCentsFromInvoiceV2`/
  `computeNormalizedMonthlyCentsFromLinesV2`/`resolvePriceV2` functions reading
  the corrected field paths, with a cached-`prices.retrieve()` fallback if an
  invoice's price ever comes back unexpanded. Legacy functions untouched.
- `server/src/utils/featureFlags.ts` — `MRR_EXTRACTION_V2_SHADOW`,
  `MRR_EXTRACTION_V2_WRITE`, both default false.
- `server/src/routes/stripeWebhook.ts` — shadow-compare wired into
  `handleInvoicePaymentSucceeded`; logs `mrr_extraction_shadow_compare` per
  invoice when the shadow flag is on; `SubscriptionSnapshot` writes remain
  the legacy values unless the write flag is *also* on.
- `server/prisma/schema.prisma` + hand-written migration
  `20260727120000_add_subscription_current_state` — new `SubscriptionCurrentState`
  table (current-state/dedup model). **Schema change written, NOT yet applied
  to the live database** — pending a separate, explicit go-ahead for
  `prisma migrate deploy` (additive-only, but treated as its own approval
  gate per the operator's database safety rules).
- `server/src/scripts/mrr-extraction-validation-report.ts` — read-only
  comparison report against real Stripe data (GET calls only).

Validated (real, live, read-only, 2026-07-27):
- **10 real paid invoices** (Pro $40/mo, Founding Plan $10/mo, founding_pro
  $24.99/mo): legacy extraction produced `0` for **10/10** (100% failure,
  confirming the diagnosed bug exactly); corrected extraction matched the
  invoice line's contractual amount for **10/10**.
- **Active subscriptions** (3 sampled): all resolved correctly, including
  one genuine **annual** subscriber found live (`interval: year`,
  $120/year) that the initial investigation had incorrectly assumed didn't
  exist (no `STRIPE_PRICE_*_ANNUAL` env var is configured, but a
  grandfathered annual subscription is still active in Stripe) — annual
  *subscription* resolution is validated; annual *invoice* extraction
  (the ÷12 branch) had no live invoice example in this sample and remains
  analytically-but-not-live validated.
- **`getPlanFromSubscriptionItems()`** (separately approved check): confirmed
  NOT affected — `Subscription.items.data[].price` is still a full object in
  this API version.
- **Cancellations**: confirmed unaffected/out of scope — that code path
  hardcodes `priceMonthly=0` and never calls the buggy function.
- **Upgrades/downgrades**: no live proration line in the sample; analytically
  covered (proration is a boolean flag inside the same `subscription_item_details`
  parent type, not a different classification), not live-confirmed.
- **Trial subscriptions**: none exist live in this account currently; not
  applicable, documented gap.

**New open question surfaced by live validation (not a defect in this fix,
but a business decision needed before enabling writes):** 4 of the 10
sampled invoices had a 100%-off promo/discount applied
(`billing_reason: subscription_create`, `amount_paid: 0`, contractual line
amount fully discounted). The corrected extraction reports the
**contractual** price ($40, $10, $24.99 — matching `stripeMrr.ts`'s own
documented design intent of ignoring `invoice.amount_paid`), not the
**actual amount collected** ($0 for that invoice). This is a pre-existing
design choice in the original code, made operational for the first time by
this fix — not something introduced by it — but it is a real business
question (should MRR reflect committed run-rate or actual near-term
collectible cash during a promo period?) that should be answered explicitly
before `MRR_EXTRACTION_V2_WRITE` is ever turned on. See
`IMPLEMENTATION_PROGRESS.md` for the full writeup.

**Separately flagged, not part of this sprint's scope, needs its own
decision:** the same live investigation found `Subscription.current_period_start`/
`current_period_end` have moved from the top level to `items.data[0].current_period_end`
in this API version. Code in `stripeWebhook.ts` and `services/stripe.ts`
(`getSubscriptionPeriodEnd`) reads the top-level fields directly, meaning
`User.billingPeriodStart/End` is likely also silently broken for any
subscription event since this API version took effect — a third instance of
the same underlying bug class, affecting grace-period/reset-date logic, not
MRR. Not fixed here; flagged for its own sprint/decision.
- **Success criteria:** New MRR query matches a manual Stripe spot-check within
  rounding tolerance; old query removed only after Sprint 3's reconciliation
  job has run clean for 5+ consecutive days.

## Sprint 2 — User Taxonomy Foundation

- **Objective:** Add classification columns to `User` and backfill known
  demo/founder/test accounts, with zero behavior change to existing queries.
- **Files affected:** `server/prisma/schema.prisma` (additive columns), a new
  one-off backfill script (parallel to the existing `delete-test-users.ts`
  pattern already in the repo).
- **Services affected:** none — additive columns are inert until read.
- **Database changes:** `ALTER TABLE "User" ADD COLUMN ...` (all nullable or
  defaulted — expand phase of expand/contract).
- **Risk:** Low — additive migration, `ADD COLUMN ... DEFAULT` is a fast
  metadata-only change on modern Postgres, no table rewrite/lock.
- **Rollback:** Drop the new columns; nothing reads them yet, so this is safe
  at any point before Sprint 4.
- **Validation:** Backfill script run in `--dry-run` mode first (mirrors the
  existing `delete-test-users.ts --dry-run` convention already in the
  codebase), reviewed, then applied; row counts before/after compared.
- **Deployment strategy:** Migration deploy → dry-run backfill → reviewed
  live backfill.
- **Business impact:** High (unlocks everything downstream) but invisible to
  users this sprint.
- **Engineering effort:** 5 points.
- **Success criteria:** Every known demo/founder/test account is correctly
  flagged; `include_in_business_metrics` is `false` for exactly that set and
  `true` for everyone else, verified against Sprint 0's baseline counts.

### Implementation status — COMPLETE, 2026-07-27

Shipped and validated against production:
- `server/prisma/schema.prisma`: `User` gains `userClass`, `isFounder`,
  `isInternal`, `isDeveloper`, `isQa`, `isDemo`, `isBot`, `isDeleted`,
  `includeInBusinessMetrics`, plus `@@index([userClass])` and
  `@@index([includeInBusinessMetrics])`. Migration
  `20260727130000_add_user_taxonomy`, additive only.
- `server/src/utils/knownTestAccounts.ts`: new, shared, side-effect-free
  module holding the known-test-email list (extracted from
  `delete-test-users.ts`, which previously hardcoded it inline) so it can be
  reused by the new backfill script without pulling in that script's
  unrelated Stripe-client-construction side effect on import.
- `server/src/scripts/backfill-user-taxonomy.ts`: classifies the 4 known
  non-default rows (1 demo, 1 founder, 2 internal/test); dry-run supported
  and run first.

**Migration validated:** `prisma migrate status` → "Database schema is up to
date!"; existing table row counts unchanged before/after (`User`=409,
`Job`=1383, `SubscriptionSnapshot`=21); all 409 pre-existing rows correctly
auto-backfilled to `userClass='registered', includeInBusinessMetrics=true`
by the `ADD COLUMN ... DEFAULT` itself (confirmed via direct SQL, not just
the Prisma migration tool's own report).

**Backfill validated:** dry-run matched exactly 4 rows (1 demo, 1 founder, 2
internal) with zero unexpected matches; live run updated exactly those 4;
independent post-hoc SQL query confirms the final distribution
(`registered`: 405, `internal`: 2, `demo`: 1, `founder`: 1 — sums to 409) and
that every flag combination is internally consistent (e.g. every `founder`
row has `isFounder=true` and all other flags false).

Full test suite (14/14), type-check, and build all clean after the schema
change and Prisma client regeneration; lint delta is exactly the
already-accepted `no-console` script convention (+10, all in the new
backfill script), zero new issues of any other kind.

**Not done in this sprint (explicitly deferred, matches the sprint's own
"nothing reads them yet" scope):** no application code (routes, dashboard,
`models/User.ts`'s `rowToUser`/`userToDb` mapping) reads or writes these new
columns yet — that begins with the canonical `business_users` model
(Sprint 4 onward). Also noted but out of scope: founder-identification is
already inconsistent across the codebase (`founderAccount.ts`'s
env-var-driven `FOUNDER_ACCOUNT_EMAIL` vs. three admin route files that
hardcode the same email literal directly instead) — not fixed here, flagged
for a future cleanup.

## Sprint 3 — Stripe Reconciliation Job

- **Objective:** Build the permanent safety net: nightly comparison of
  canonical MRR/active-customer-count against live Stripe.
- **Files affected:** new scheduled job only.
- **Services affected:** none in the request path; calls the Stripe API
  read-only, on a schedule.
- **Database changes:** new, additive table to store reconciliation run
  results/history (for trend-of-drift visibility, not just pass/fail).
- **Risk:** Low — read-only against both systems.
- **Rollback:** Disable the cron; no other system depends on it existing yet.
- **Validation:** Intentionally introduce a known-bad test scenario in a
  staging Stripe test-mode account (a subscription the reconciliation job
  should flag) to prove the alert actually fires.
- **Deployment strategy:** Ship disabled → enable in staging → enable in
  production with alert routed to a low-urgency channel for the first week →
  promote to paging severity once proven quiet.
- **Business impact:** Critical — this is what prevents every future
  regression of Sprint 1's fix from going unnoticed.
- **Engineering effort:** 8 points.
- **Success criteria:** Job runs nightly, produces a delta report, alert
  fires correctly on the staged test case, zero false positives for 5
  consecutive nights in production before promotion to paging severity.

## Sprint 4 — Canonical Views: `business_users`, `business_jobs`

- **Objective:** Stand up the first two canonical models as **SQL views**
  (not new physical tables) over existing data + Sprint 2's taxonomy columns —
  lowest-risk way to introduce the canonical layer.
- **Files affected:** new view-definition migration files only.
- **Services affected:** none — nothing reads these views in production code
  yet.
- **Database changes:** `CREATE VIEW business_users AS ...`, `CREATE VIEW
  business_jobs AS ...` (views are trivially reversible — `DROP VIEW`).
- **Risk:** Very low — a view has no storage footprint and cannot corrupt
  underlying data.
- **Rollback:** `DROP VIEW`; instant, zero data-loss risk by definition.
- **Validation:** Compare view output row-for-row against the equivalent raw
  query used in Sprint 0's baseline.
- **Deployment strategy:** Ship the views; nothing in the app changes yet.
- **Business impact:** Foundation-laying — no user-visible impact this sprint,
  but unblocks Sprint 5 onward.
- **Engineering effort:** 8 points.
- **Success criteria:** Views exist, are documented in METRICS.md, and
  independently spot-checked against raw-table counts.

## Sprint 5 — Dashboard Shadow-Read

- **Objective:** Make the dashboard endpoint compute values from both the old
  path and the new `business_*` views, log divergence, **serve only the old
  values** to the UI.
- **Files affected:** dashboard endpoint only (`server/src/routes/
  adminDashboard.ts`).
- **Services affected:** API only.
- **Database changes:** none (reads only).
- **Risk:** Low — additional read load on every dashboard hit; monitor query
  latency, add a timeout/circuit-breaker on the shadow computation so a slow
  shadow query can never slow down or fail the real response.
- **Rollback:** Remove the shadow-compute call; the served response is
  unaffected either way.
- **Validation:** Divergence log reviewed daily for the sprint's duration;
  target zero divergence beyond rounding by end of sprint.
- **Deployment strategy:** Feature-flagged, shadow-only, no UI change.
- **Business impact:** Risk-reduction for Sprint 6, not directly visible.
- **Engineering effort:** 8 points.
- **Success criteria:** Divergence between old and new paths is zero (or
  fully explained) for at least 5 consecutive business days.

## Sprint 6 — Dashboard Cutover, Card by Card

- **Objective:** Flip cards over to canonical sources one at a time, lowest
  risk first: Plan Distribution → Total/New Users → Jobs Created/Completed/
  Failed → Active Users → **MRR/ARR/ARPU last**, only after Sprint 3's
  reconciliation has run clean for the full burn-in period.
- **Files affected:** dashboard endpoint, Redis cache layer (move from
  per-process to shared Redis cache in the same sprint since it's low-risk
  and naturally bundled with a dashboard-endpoint change already in flight).
- **Services affected:** API.
- **Database changes:** none.
- **Risk:** Medium (this is the sprint with the most user-facing surface
  area) — mitigated by per-card feature flags, so a bad cutover on one card
  never affects the others.
- **Rollback:** Per-card flag flip back to the old path; independent per
  card.
- **Validation:** Same divergence check as Sprint 5, now gating each
  individual card's cutover rather than the whole dashboard at once.
- **Deployment strategy:** Sequential, one card per 1–2 days within the
  sprint, each with its own go/no-go check.
- **Business impact:** High — this is where the founder-visible numbers
  actually become trustworthy.
- **Engineering effort:** 13 points.
- **Success criteria:** All cards cut over; shared Redis cache confirmed
  consistent across API instances; zero reconciliation alerts during the
  cutover window.

## Sprint 7 — Rollups Redesign + Metrics API v1

- **Objective:** Redirect `DailyMetrics`/`MonthlyMetrics` computation to read
  only from `business_*` (retiring raw-table reads in `recomputeMetrics.ts`),
  add `metric_version`/`computed_at`; stand up `GET /api/metrics/:name` as an
  internal-only endpoint with the dashboard as its first consumer.
- **Files affected:** `recomputeMetrics.ts`, new metrics API route file.
- **Services affected:** API, nightly/hourly cron.
- **Database changes:** additive columns on `DailyMetrics`/`MonthlyMetrics`.
- **Risk:** Medium — changes the rollup cron's read path; mitigate by running
  old and new recompute logic in parallel for one full nightly cycle and
  diffing output before retiring the old path.
- **Rollback:** Revert the cron to the old query set; rollup tables are
  unaffected structurally (only how they're populated changes).
- **Validation:** Parallel-run diff for at least 2 nightly + 1 monthly cycle.
- **Deployment strategy:** Parallel-run → diff → cutover → retire old path.
- **Business impact:** Medium-high — historical trend charts become
  provably consistent with live cards for the first time.
- **Engineering effort:** 13 points.
- **Success criteria:** New and old rollup outputs match for 2+ cycles;
  Metrics API serves the dashboard successfully with no regression in
  response time.

## Sprint 8 — PostHog Cleanup, Funnel Fix, Governance Adoption

- **Objective:** Fix `captureFunnelEvent()` to not silently drop pre-signup
  events (write to a guest-aware `fact_event` keyed by `anonymous_id`,
  Sprint-2-adjacent taxonomy already in place); finalize PostHog event
  ownership boundaries (POSTHOG_STRATEGY.md); formally adopt the governance
  process (RFC template, review cadence) for anything shipped from here
  forward.
- **Files affected:** `funnelEvents.ts`, PostHog SDK config (client + server).
- **Services affected:** API, client.
- **Database changes:** none beyond what Sprint 2/4 already added (the
  `fact_event` model can reuse the existing `EventLog` table shape with a
  relaxed not-null constraint on `userId` plus an `anonymousId` column).
- **Risk:** Low — additive event-capture change, no revenue-path impact.
- **Rollback:** Revert `funnelEvents.ts` to the old required-`User` behavior.
- **Validation:** Confirm pre-signup events now appear in `business_
  conversion`'s top-of-funnel stages; compare against PostHog's equivalent
  counts to quantify (not eliminate) the expected remaining gap.
- **Deployment strategy:** Standard rolling deploy.
- **Business impact:** Medium — closes the largest remaining Postgres-vs-
  PostHog gap; governance adoption is the long-term compounding win.
- **Engineering effort:** 8 points.
- **Success criteria:** Funnel fix live and validated; ADRs published;
  first metric proposal successfully run through the new RFC process as a
  dry-run of the governance workflow itself.

---

## Sprint velocity summary

| Sprint | Points | Cumulative | Primary risk profile |
|---|---|---|---|
| 0 | 3 | 3 | None |
| 1 | 5 | 8 | Low (isolated, flagged) |
| 2 | 5 | 13 | Low (additive) |
| 3 | 8 | 21 | Low (read-only) |
| 4 | 8 | 29 | Very low (views) |
| 5 | 8 | 37 | Low (shadow-only) |
| 6 | 13 | 50 | Medium (user-facing cutover) |
| 7 | 13 | 63 | Medium (cron path change) |
| 8 | 8 | 71 | Low |

~71 points ≈ 8–10 two-week sprints for one focused engineer/pair, i.e. roughly
4–5 months for the full canonical-layer migration through governance adoption
— consistent with a "12 months of engineering work" ceiling that also leaves
room for `business_subscriptions`/`business_revenue`/`business_cost`/
`business_retention` (DATABASE_MIGRATION_PLAN.md Part 6) as a second wave once
this foundation is proven.
