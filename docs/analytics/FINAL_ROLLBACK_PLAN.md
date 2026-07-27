# FINAL_ROLLBACK_PLAN.md — VideoText

Status: consolidated rollback reference, generated 2026-07-27 (Sprint 8).
Companion to `FINAL_DEPLOYMENT_PLAN.md` — that document embeds each gate's
own rollback inline; this document exists so "how do I undo X" can be
answered without re-reading the whole deployment plan, and so every
rollback path across the entire program (Sprints 1–7, not just the two
this plan actively sequences) is in one place.

## The general rule

Per `DEPLOYMENT_RUNBOOK.md`: every flagged change in this program rolls
back by flipping its flag and restarting the API process. **No migration
reversal is ever required for a flag-level rollback** — every schema
change in this program has been additive-only (new tables/columns/views,
never a dropped or renamed existing one), so the schema is always
backward-compatible with the flag-off code path.

There are exactly **two exceptions** to "flip the flag and you're done,"
both called out explicitly below: Gate 3 (rollup canonical source) and
Gate 7 (MRR extraction writes) both *persist* their canonical computation
into a table, so reverting the flag stops *future* writes but does not by
itself undo values already written.

## Rollback by flag

| Flag | Rollback command | Is a flag flip sufficient? | If not, what else is needed |
|---|---|---|---|
| `MRR_EXTRACTION_V2_SHADOW` | Set `false`, restart API | Yes | — (log-only, nothing persisted) |
| `DASHBOARD_SHADOW_COMPUTE` | Set `false`, restart API | Yes | — (log-only, runs after response is sent) |
| `ROLLUP_CANONICAL_SOURCE` | Set `false`, restart API | **No** | Must also re-run `POST /api/admin/recompute` (full window) with the flag off, to overwrite the canonical values already written into `DailyMetrics`/`MonthlyMetrics` back to legacy |
| `DASHBOARD_CANONICAL_CUTOVER` | Set `false`, restart API | Yes | — (per-request read-time overlay only, nothing persisted) |
| `STRIPE_RECONCILIATION_ENABLED` | Set `false`, restart API | Yes | — (`MrrReconciliationRun` rows are historical, harmless to leave) |
| `MRR_EXTRACTION_V2_WRITE` | Set `false`, restart API | **No** | Stops *future* incorrect-path writes only; any `SubscriptionSnapshot`/`SubscriptionCurrentState` rows already written with the corrected values are historical facts — reverting a *specific* bad value (if one is ever found) requires a manual, individually-reviewed data correction, not a bulk operation |

## Decision tree

1. **Something looks wrong on the dashboard right now.**
   → Check `DASHBOARD_CANONICAL_CUTOVER` first (Gate 5) — flip it off,
   restart. If the dashboard was already correct before Gate 5, this alone
   fixes it, no further action.
2. **`DailyMetrics`/`MonthlyMetrics` values look wrong (via the `snapshot`/
   `daily` dashboard fields, or the raw table).**
   → This is `ROLLUP_CANONICAL_SOURCE` (Gate 3). Flip it off, then run a
   full-window recompute (`days=90&months=12` or larger if custom windows
   were used) to restore legacy values into the rollup tables. A flag
   flip alone leaves stale canonical values sitting in already-computed
   rows until the next recompute — do not skip the recompute step.
3. **MRR/subscription numbers look wrong.**
   → Check `MRR_EXTRACTION_V2_WRITE` (Gate 7) first — flip it off to stop
   further incorrect writes. Then inspect `SubscriptionCurrentState` and
   recent `SubscriptionSnapshot` rows manually; if a specific row is wrong,
   correct that row directly (Stripe is the source of truth — re-derive
   the correct value from the live Stripe subscription/invoice object, the
   same way `mrr-extraction-validation-report.ts` does read-only, then
   apply the fix as a reviewed, one-off write, not an automated bulk
   correction).
4. **The nightly reconciliation job is alerting incorrectly, or not
   running.**
   → `STRIPE_RECONCILIATION_ENABLED` (Gate 6) off, restart. No data
   consequence either way.
5. **Shadow-compare logs are noisy/wrong, no served value has changed.**
   → `MRR_EXTRACTION_V2_SHADOW`/`DASHBOARD_SHADOW_COMPUTE` (Gate 2) off,
   restart. Purely cosmetic to logs, zero user impact either way.
6. **Something is wrong and it's not obviously one of the above.**
   → Roll back every flag to `false` (full reset to the pre-Sprint-6
   state), restart, then re-run a full recompute. This is always safe —
   it is exactly this program's starting state, already proven stable for
   the entire duration of Sprints 0–8's development.

## Migration-level rollback (reference only — not expected to be needed)

No migration reversal is required for any flag-level rollback above. If a
schema-level rollback were ever independently needed (e.g. removing the
capability entirely, not just disabling it):

| Migration | Rollback | Data-loss risk |
|---|---|---|
| `20260727120000_add_subscription_current_state` | `DROP TABLE "SubscriptionCurrentState"` | None if empty (current state); real data loss if `MRR_EXTRACTION_V2_WRITE` has ever been on |
| `20260727130000_add_user_taxonomy` | `ALTER TABLE "User" DROP COLUMN ...` (9 columns) | Loses the Sprint 2 backfill classification; would need to be re-run from `knownTestAccounts.ts` |
| `20260727140000_add_mrr_reconciliation_run` | `DROP TABLE "MrrReconciliationRun"` | Loses reconciliation history — a real loss if `STRIPE_RECONCILIATION_ENABLED` has been on for any length of time |
| `20260727150000_add_business_views` | `DROP VIEW business_jobs; DROP VIEW business_users;` | None — a view has no storage; instant, zero data-loss by construction |

**None of these are part of the two active gates in `FINAL_DEPLOYMENT_
PLAN.md` (Gates 1–7 only ever flip flags and run recomputes) — this table
exists purely so a full-teardown scenario has a documented answer, not
because the deployment plan ever calls for it.**

## What is NOT reversible by any of the above

- Real Stripe subscription/invoice state — this program only ever reads
  Stripe, never writes to it. Nothing here can be "rolled back" on the
  Stripe side because nothing here ever changes it.
- Historical `MrrReconciliationRun`/shadow-compare log rows — these are
  intentionally permanent audit trails, not scaffolding; rolling back a
  flag stops new rows/logs, it does not and should not delete old ones.
- Any specific incorrect `SubscriptionSnapshot`/`SubscriptionCurrentState`
  row written while `MRR_EXTRACTION_V2_WRITE` was on and subsequently found
  wrong — see decision-tree item 3. This is the one place in the entire
  program where "undo" means a reviewed manual correction, not an
  automated reversal, and it is called out this explicitly on purpose.
