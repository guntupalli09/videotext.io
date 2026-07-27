# EXECUTIVE_IMPLEMENTATION_SUMMARY.md — VideoText Analytics Migration

Status: design/blueprint only. Nothing in this program has been implemented,
migrated, or deployed. This document is the single-page entry point into the
full Phase 3 blueprint (IMPLEMENTATION_MASTER_PLAN.md, SPRINT_PLAN.md,
DATABASE_MIGRATION_PLAN.md, DASHBOARD_MIGRATION_PLAN.md,
STRIPE_RECONCILIATION_PLAN.md, POSTHOG_STRATEGY.md, DATA_QUALITY_PLAN.md,
TESTING_STRATEGY.md, DEPLOYMENT_RUNBOOK.md, DOCUMENTATION_PLAN.md,
ADR_INDEX.md).

## Part 15 — Execution Order

| Order | Task | Prerequisites | Effort | Risk | Owner | Dependencies | Rollback | Verification | Business value |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Sprint 0: baseline instrumentation | None | 3 pts | None | Analytics Eng. | None | Delete the job | Baseline report published | Establishes the "before" numbers every later fix is judged against |
| 2 | Sprint 1: MRR query fix | Task 1 | 5 pts | Low | Platform + Finance sign-off | None | Feature flag off | Matches manual Stripe spot-check | **Highest single item of business value in the entire program** |
| 3 | Sprint 2: taxonomy columns + backfill | None (parallel with 2) | 5 pts | Low | Platform | None | Drop columns | Backfill dry-run diff clean | Unlocks every downstream exclusion fix |
| 4 | Sprint 3: Stripe reconciliation job | Task 2 | 8 pts | Low | Platform on-call | Task 2 | Disable cron | Staged known-bad scenario alerts correctly | Permanent safety net — prevents regression of Task 2 forever |
| 5 | Sprint 4: canonical views (`business_users`, `business_jobs`) | Task 3 | 8 pts | Very low | Analytics Eng. | Task 3 | Drop views | Row-for-row diff vs. raw tables | Foundation for every future canonical metric |
| 6 | Sprint 5: dashboard shadow-read | Task 5 | 8 pts | Low | Analytics Eng. | Tasks 2, 5 | Remove shadow call | Zero divergence for 5 business days | De-risks the user-facing cutover |
| 7 | Sprint 6: dashboard cutover, card by card | Task 6 | 13 pts | Medium | Analytics Eng. + domain owners | Tasks 2–6 | Per-card flag flip | Zero reconciliation alerts during cutover window | **Where the founder-visible numbers actually become trustworthy** |
| 8 | Sprint 7: rollups redesign + Metrics API v1 | Task 7 | 13 pts | Medium | Analytics Eng. | Task 7 | Revert cron to old queries | 2+ nightly and 1 monthly parallel-run match | Historical charts become provably consistent with live cards |
| 9 | Sprint 8: PostHog cleanup + funnel fix + governance adoption | Task 8 (loosely) | 8 pts | Low | Growth/Product + Analytics Eng. | None strict | Revert `funnelEvents.ts` | Pre-signup events now captured; first RFC run as a dry-run | Closes the largest remaining Postgres-vs-PostHog gap; makes consistency durable going forward |
| 10 | Second wave (post-12-sprint core): `business_subscriptions`/`business_revenue`/`business_cost`/`business_retention`/`business_conversion`, deferred M10 guest-identity migration | Tasks 1–9 | ~30+ pts (multi-sprint) | Medium | Finance + Analytics Eng. + Legal (for M10) | Full core foundation | Per-model, as designed in DATABASE_MIGRATION_PLAN.md Part 6 | Per-model reconciliation | Investor-grade LTV/gross-margin/ARR reporting, full funnel accuracy |

---

## Final Questions

### 1. What is the minimum set of changes required to achieve trustworthy business metrics?

Three changes, in this order, and nothing else is strictly required to stop
actively misleading the business:

1. **Fix the MRR query** (Sprint 1) — deduplicate by subscription, current
   state only.
2. **Add the taxonomy flag and exclude demo/founder/internal accounts**
   (Sprint 2) — stops the paid-conversion and user-count contamination.
3. **Stand up the Stripe reconciliation job** (Sprint 3) — without this, both
   of the above fixes can silently regress the next time someone touches
   billing code, and no one will know until the next manual audit.

Everything else in this program (canonical layer, dashboard cutover, rollups,
Metrics API, PostHog strategy, governance) makes the fix **durable and
scalable**, but these three items are what make the numbers **correct today**.

### 2. Which 20% of implementation work delivers 80% of the business value?

Sprints 0–3 (baseline, MRR fix, taxonomy, reconciliation) — roughly 21 of the
~71 core-plan story points, under 30% of the effort — eliminate the two
Critical-severity findings (MRR double-count, demo-account contamination) and
install the permanent safety net that prevents their recurrence. Every sprint
after that (canonical layer, dashboard cutover, rollups, PostHog) is
important for scale, maintainability, and the next 10x of growth, but is
incremental hardening on top of an already-correct foundation, not a second
wave of correctness fixes.

### 3. Which changes should be completed immediately?

- Sprint 0 (baseline instrumentation) — zero risk, should start this week.
- Sprint 1 (MRR fix) — Critical severity, isolated, low technical risk; the
  only reason to delay it at all is to let Sprint 0's baseline run for a few
  days first so there's a documented "before" number.
- Sprint 2 (taxonomy foundation) — can run in parallel with Sprint 1, equally
  low risk, high leverage for everything downstream.

### 4. Which changes can safely wait?

- The full canonical layer for `business_revenue`, `business_cost`,
  `business_retention`, `business_conversion` (DATABASE_MIGRATION_PLAN.md
  Part 6, "second wave") — these matter for LTV/gross-margin/investor-grade
  reporting but do not change whether today's top-line numbers (MRR, paid
  customers, user counts) are correct.
- Persistent `anonymous_id` guest-identity stitching (M10/ADR-009) — genuinely
  gated on a privacy/legal review, not an engineering decision, and the
  interim state (guests structurally excluded from canonical DAU/MAU rather
  than incorrectly blended in) is an acceptable, honestly-labeled limitation
  in the meantime.
- Full governance tooling (metric versioning system, restatement log,
  automated lint enforcement) — the *process* (RFC template, review habit)
  should start immediately at near-zero cost, but the supporting tooling can
  be built incrementally alongside Sprints 4–8.

### 5. If engineering time is limited to two weeks, exactly what should we implement first?

**Sprint 0 + Sprint 1, back to back, as a single two-week block:**

- Week 1: ship baseline instrumentation (Sprint 0), let it run and produce a
  documented "before" report; in parallel, build the deduplicated MRR query
  behind a feature flag and start the shadow-compute/divergence-logging
  period.
- Week 2: review the divergence log with Finance, get sign-off that the new
  MRR number is correct, flip the flag in production during business hours,
  monitor for a day, and leave the flag live (not yet removing the old code
  path — that waits for Sprint 3's reconciliation job to exist and run clean,
  which is the very next thing after this two-week window, not part of it).

This two-week scope deliberately **excludes** the taxonomy work (Sprint 2)
even though it's also low-risk, because it has a lower blast radius fix
available first (Sprint 1 alone already removes the single largest number
distortion) and two weeks is enough to do one thing carefully with a real
Finance sign-off gate, rather than two things quickly. If a third week were
available, Sprint 2 (taxonomy) would be the immediate next addition — but the
brief specifically asks for two weeks, and the honest answer is: fix MRR
first, prove it's fixed, and stop there until reconciliation infrastructure
exists to keep it fixed.
