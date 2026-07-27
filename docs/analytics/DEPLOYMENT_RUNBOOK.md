# DEPLOYMENT_RUNBOOK.md — VideoText Analytics Migration

Status: design/blueprint only.

## The one pattern used for every non-trivial change in this migration

**Expand → Shadow → Validate → Cutover (flagged) → Burn-in → Contract.**

1. **Expand**: add new schema/code additively; nothing existing changes
   behavior.
2. **Shadow**: compute the new path alongside the old, serve only the old
   result, log divergence.
3. **Validate**: automated checks (Testing Strategy + Data Quality Plan)
   confirm the new path is correct, not just present.
4. **Cutover (flagged)**: serve the new path, gated by a feature flag capable
   of instant revert without a redeploy.
5. **Burn-in**: hold at the cutover state for a defined period (card-
   dependent: days for low-stakes cards, a full billing cycle for
   revenue-adjacent ones) with monitoring active.
6. **Contract**: remove the old code path and the flag only after burn-in
   completes cleanly — never before.

This single pattern is applied to every schema migration, every dashboard
card, and the rollup-cron change. No step in this program is a "big bang."

## Deployment order (ties to SPRINT_PLAN.md)

1. Sprint 0 (instrumentation) — no feature flag needed, purely additive/read-only.
2. Sprint 1 (MRR query fix) — flagged, dark-launched, burn-in 5 days, cutover.
3. Sprint 2 (taxonomy columns + backfill) — additive migration, then a
   separately-flagged read of the new columns (initially unused by anything).
4. Sprint 3 (Stripe reconciliation) — ships disabled → staging → production
   log-only → production paging, over roughly 2 weeks of its own internal
   burn-in.
5. Sprint 4 (canonical views) — zero-flag needed (views are inert until
   queried by name).
6. Sprint 5 (dashboard shadow-read) — flagged shadow-only.
7. Sprint 6 (dashboard cutover) — per-card flags, sequential.
8. Sprint 7 (rollup redesign + Metrics API) — parallel-run flag on the cron,
   Metrics API ships as a new, additive endpoint (nothing depends on it yet
   except the already-cutover dashboard, wired in last).
9. Sprint 8 (PostHog/funnel fix + governance) — standard rolling deploy, no
   special flag needed (additive event-capture change).

## Feature flags required

| Flag | Controls | Default | Removed when |
|---|---|---|---|
| `mrr_dedup_query` | Sprint 1 MRR fix | off → on after burn-in | Sprint 6's schema-level MRR cutover supersedes it; remove both together once stable |
| `dashboard_shadow_compute` | Sprint 5 shadow computation | on (log-only, never user-visible) | Once every card has individually cut over in Sprint 6 |
| `dashboard_card_<name>_canonical` | Per-card cutover (one flag per card in the table in DASHBOARD_MIGRATION_PLAN.md) | off → on per card, sequentially | 30 days after each card's individual cutover |
| `rollup_dual_compute` | Sprint 7 parallel-run of old/new recompute logic | on during parallel-run window | After 2+ nightly and 1 monthly cycle match |
| `funnel_event_guest_capture` | Sprint 8 pre-signup event capture fix | off → on | Not removed — this becomes the permanent behavior; flag exists only to allow an instant revert during initial rollout |

## Dual writes / dual reads

- **Dual write**: the Stripe webhook handler writes to both the legacy
  `SubscriptionSnapshot` (unchanged, becomes the history ledger) and the new
  `business_subscriptions` (current-state) starting the moment M4 ships — this
  is a dual write, not a cutover, and continues indefinitely (the history
  ledger is a permanent, intentional artifact, not a migration scaffold to be
  torn down).
- **Dual read** (temporary only): during Sprint 5–7, the dashboard/rollup
  cron reads both old and new sources to diff them. Dual reads are always
  temporary — the goal state has exactly one read path per metric.

## Parallel validation windows

| Change | Parallel-run duration | Go/no-go owner |
|---|---|---|
| MRR query fix | 5 business days | Finance sign-off + zero unexplained divergence |
| Each dashboard card cutover | 3 business days (5+ for revenue cards) | Analytics Engineering + domain owner (per METRICS.md ownership) |
| Rollup cron redesign | 2 nightly cycles + 1 full monthly cycle | Analytics Engineering |
| Stripe reconciliation job promotion to paging | 5 consecutive clean nightly runs in production | Platform on-call lead |

## Cutover checklist (applies to any card/query cutover)

1. Confirm shadow divergence has been zero (or fully explained) for the
   required window.
2. Confirm the relevant Data Quality Plan checks are green.
3. Announce the change (internally — this still changes a founder-visible
   number) with the expected before/after delta, especially for MRR/user
   counts, so a legitimate drop isn't mistaken for an incident.
4. Flip the flag during business hours, not off-hours — someone must be
   watching.
5. Monitor the dashboard's error rate and latency for the following hour.
6. Leave the flag in place, defaulting on, for the full burn-in period before
   removing the old code path.

## Rollback procedure (generic)

Every flagged change rolls back the same way: flip the flag off. No redeploy,
no migration reversal required for a query-level or dashboard-level rollback.
Schema migrations (Part 5) each specify their own `DROP`/reverse-migration
path, but because every schema change in this plan is additive-only during
the expand phase, a schema-level rollback is never required to recover from a
bad cutover — the flag is always sufficient on its own.

## Monitoring and alerting

- **Per-cutover dashboards**: divergence-over-time chart for every
  in-progress shadow/burn-in, visible to the whole team, not just the
  engineer doing the migration.
- **Data Quality dashboard** (DATA_QUALITY_PLAN.md): the permanent, ongoing
  view of "is everything still reconciling," which outlives the migration
  itself and becomes standard operations tooling.
- **Alert routing**: as specified per-check in DATA_QUALITY_PLAN.md and
  STRIPE_RECONCILIATION_PLAN.md — log-only for the first two weeks of any new
  check, escalating only after a proven quiet baseline.
