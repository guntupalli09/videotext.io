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

## Sprint 1 — MRR Fix (Critical, isolated)

- **Objective:** Stop double/multi-counting MRR without touching subscription
  storage yet — fix the *read*, not the schema.
- **Files affected:** the dashboard's MRR-computing query path only.
- **Services affected:** API (dashboard endpoint) only; no worker, no webhook
  change.
- **Database changes:** none — this is a query-shape fix (dedup by
  `stripe_subscription_id`, take latest period per subscription), not a schema
  change.
- **Risk:** Low — isolated, read-only query change; high scrutiny because it's
  revenue-facing.
- **Rollback:** Feature flag reverting to the old query; instant.
- **Validation:** Shadow-compute both old and new MRR for 3–5 days, log
  divergence, require Finance sign-off that the new number matches manual
  spot-checks against Stripe before flipping the flag.
- **Deployment strategy:** Feature-flagged dark launch → burn-in → cutover.
- **Business impact:** Critical — the single highest-value fix in the entire
  program.
- **Engineering effort:** 5 points.
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
