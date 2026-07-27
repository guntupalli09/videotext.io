# FINAL_DEPLOYMENT_PLAN.md — VideoText

Status: coordinated production rollout plan, generated 2026-07-27 (Sprint
8), covering the Sprint 6 (dashboard cutover) and Sprint 7 (rollup
canonical source) code that is committed locally but not deployed, plus
Sprint 8's extension of the cutover field set. **No gate below has been
executed.** Each gate requires its own separate, explicit operator
approval before any command in it is run — approving one gate is not
approval for the next.

Follows the single pattern established in `DEPLOYMENT_RUNBOOK.md`:
**Expand → Shadow → Validate → Cutover (flagged) → Burn-in → Contract.**
Every gate below maps onto that pattern; nothing here is a new philosophy,
only the concrete sequencing for the code that currently exists.

## Flags this plan governs

| Flag | Default | Governs | Gate |
|---|---|---|---|
| `MRR_EXTRACTION_V2_SHADOW` | false | Shadow-log corrected Stripe MRR extraction | 2 |
| `DASHBOARD_SHADOW_COMPUTE` | false | Shadow-compute canonical dashboard metrics, log-only | 2 |
| `ROLLUP_CANONICAL_SOURCE` | false | `DailyMetrics`/`MonthlyMetrics` canonical rollup source | 3 |
| `DASHBOARD_CANONICAL_CUTOVER` | false | Serve 15 canonical dashboard fields (Sprint 6 + 8) | 5 |
| `STRIPE_RECONCILIATION_ENABLED` | false | Nightly Stripe-vs-Postgres reconciliation cron | 6 |
| `MRR_EXTRACTION_V2_WRITE` | false | Write corrected MRR to `SubscriptionSnapshot`/`SubscriptionCurrentState` | 7 |

All six are off in every environment as of this document. **No command in
any gate below sets more than that gate's own flag(s).**

---

## Gate 1 — Deploy code with every new flag disabled

**Objective:** Get Sprints 6/7/8's code onto the running `videotools-api`
container with zero behavior change — a pure "the code exists now" step.

**Prerequisites:**
- Operator approval for this specific gate.
- All local commits (`analytics-sprint-6`, `analytics-sprint-7`,
  `analytics-sprint-8`) pushed to the branch that triggers the production
  build (an operator action — this agent does not push).
- No new Prisma migration exists to apply (Sprints 6/7/8 introduced no
  schema changes) — confirm with the command below before proceeding, in
  case that assumption has changed since this plan was written.

**Exact commands:**
```bash
# Confirm no pending migrations (should print "Database schema is up to date!")
cd server && npx prisma migrate status

# Rebuild and redeploy videotools-api (operator-run; exact command depends
# on the deploy tooling in use — e.g.:)
docker compose build api
docker compose up -d api
```

**Expected results:**
- `videotools-api` container reports healthy (`docker compose ps` shows
  `Up ... (healthy)`).
- `GET /healthz` and `GET /readyz` return 200.
- Dashboard renders identically to before the deploy — every field still
  Legacy-served, because every flag is still unset.

**Validation queries:**
```bash
docker exec videotools-postgres psql -U videotools -d videotext -c \
  "SELECT COUNT(*) FROM \"DailyMetrics\";"   # should be unchanged from pre-deploy
curl -s https://<host>/healthz
curl -s https://<host>/readyz
```
Confirm via logs that no `dashboard_canonical_cutover_FALLBACK` or
`ROLLUP_CANONICAL_SOURCE`-related log lines appear (they shouldn't — the
code paths they'd come from are unreachable with all flags off).

**Monitoring period:** 1 hour of normal traffic, watching error rate and
p95 latency on `/api/admin/dashboard` and `/api/admin/recompute`.

**Rollback command:** Redeploy the previous image tag. No flag change, no
migration reversal needed — this gate makes no functional change at all.

**Stop conditions:** Container fails to become healthy; `/healthz`/
`/readyz` fail; dashboard response shape changes in any way (it must not —
if it does, something in this deploy touched more than intended and must
be investigated before Gate 2).

---

## Gate 2 — Enable shadow extraction/computation only

**Objective:** Turn on log-only shadow paths for MRR extraction and
dashboard comparison. Nothing served to the UI changes; this only
generates comparison logs for human review.

**Prerequisites:** Gate 1 complete and stable for at least the monitoring
period above. Log aggregation reachable (`GET /api/admin/logs` or
equivalent) so the new log lines can actually be reviewed.

**Exact commands:**
```bash
# Set in the production environment (e.g. docker-compose env_file or
# platform secret manager), then restart the API process to pick them up:
MRR_EXTRACTION_V2_SHADOW=true
DASHBOARD_SHADOW_COMPUTE=true

docker compose up -d api   # restart to load new env
```

**Expected results:** Every real `invoice.payment_succeeded` webhook now
also logs `mrr_extraction_shadow_compare` (legacy vs. V2-corrected
extraction). Every `GET /api/admin/dashboard` call now also logs
`dashboard_shadow_compare` per metric plus a `dashboard_shadow_compare_
summary`, running *after* the response is already sent. **Served dashboard
values and webhook-written `SubscriptionSnapshot` rows are unchanged.**

**Validation queries:**
```sql
-- Confirm SubscriptionSnapshot writes are still legacy-only (unchanged row count/shape)
SELECT COUNT(*), MAX("createdAt") FROM "SubscriptionSnapshot";
```
```bash
# Tail logs for the shadow-compare events
curl -s "https://<host>/api/admin/logs?limit=200" | grep -E "mrr_extraction_shadow_compare|dashboard_shadow_compare"
```
Look specifically for `dashboard_shadow_compare_UNEXPLAINED_DISCREPANCY` —
should never appear.

**Monitoring period:** 5 business days minimum (this is the MRR extraction
fix's parallel-validation window per `DEPLOYMENT_RUNBOOK.md`) — review
shadow logs daily.

**Rollback command:**
```bash
MRR_EXTRACTION_V2_SHADOW=false
DASHBOARD_SHADOW_COMPUTE=false
docker compose up -d api
```
No data cleanup needed — both flags are purely additive logging.

**Stop conditions:** Any `dashboard_shadow_compare_UNEXPLAINED_DISCREPANCY`
log; any shadow-computed MRR value that doesn't match a manual Stripe
Dashboard spot-check for the same invoice; any measurable latency
regression on the dashboard endpoint (the shadow compute must never affect
response time — if it does, its timeout/circuit-breaker isn't working as
designed).

---

## Gate 3 — Enable canonical rollup source and run a controlled recompute

**Objective:** Redirect `DailyMetrics`/`MonthlyMetrics` generation to
`business_users`/`business_jobs` for the 9 Sprint-7-approved fields, then
run one recompute to populate rows with canonical values.

**Prerequisites:** Gate 2's shadow window has shown zero unexplained
divergence. Sprint 7's reconciliation script
(`sprint7-rollup-reconciliation-report.ts`) re-run fresh against current
production data (not just this session's 2026-07-27 run) with a clean
result.

**Exact commands:**
```bash
ROLLUP_CANONICAL_SOURCE=true
docker compose up -d api   # and worker, if it ever runs recompute — currently only the API cron/route does

# Controlled recompute — start with a SHORT window, not the full history,
# so a bad result is cheap to inspect and re-run:
curl -X POST "https://<host>/api/admin/recompute?days=7&months=1" \
  -H "Authorization: Bearer <founder JWT>"
```

**Expected results:** The `recompute` response reports `dayErrors: 0`,
`monthErrors: 0`. `DailyMetrics` rows for the last 7 days now hold
canonical values for `totalUsers`/`newUsers`/`activeUsers`/`jobsCreated`/
`jobsCompleted`/`jobsFailed`/`avgProcessingMs`/`p95ProcessingMs` (smaller
than before, per the known guest/excluded-account exclusions);
`mrrCents`/`churnedUsers`/`newPaidUsers` are unchanged (still
`SubscriptionSnapshot`-sourced, this flag never touches them).

**Validation queries:**
```sql
-- Compare the last 7 days' DailyMetrics against a fresh independent canonical query
SELECT date, "totalUsers", "jobsCreated" FROM "DailyMetrics" ORDER BY date DESC LIMIT 7;

SELECT COUNT(*) FROM business_users WHERE "includeInBusinessMetrics";
SELECT COUNT(*) FROM business_jobs WHERE "includeInBusinessMetrics" AND "createdAt" >= now() - interval '7 days';
```
The `DailyMetrics` values should now be ≤ the pre-recompute (legacy)
values, matching the delta pattern documented in
`SPRINT_7_RECONCILIATION_REPORT.md` §2.

**Monitoring period:** Run the 7-day/1-month controlled recompute, inspect
results manually, then (only if clean) recompute the full default window
(`days=90&months=12`) and re-inspect before considering Gate 3 complete.

**Rollback command:**
```bash
ROLLUP_CANONICAL_SOURCE=false
docker compose up -d api
curl -X POST "https://<host>/api/admin/recompute?days=90&months=12" \
  -H "Authorization: Bearer <founder JWT>"   # re-run to restore legacy values in DailyMetrics/MonthlyMetrics
```
Rollback requires a **second recompute** with the flag off to overwrite
the canonical values back to legacy — unlike a pure read-path flag, this
one's effect is persisted into a table, so simply flipping the flag back
is necessary but not sufficient.

**Stop conditions:** Any `dayErrors`/`monthErrors` > 0 in the recompute
result; any `DailyMetrics` row where a canonical-sourced field is *larger*
than the pre-recompute legacy value (structurally impossible for a true
subset — would indicate a query defect); any dashboard field relying on
`DailyMetrics` (`snapshot.*`, `daily[]`) showing a number that doesn't
match the expected direction/magnitude from `SPRINT_7_RECONCILIATION_
REPORT.md`.

---

## Gate 4 — Validate rollups against canonical live queries

**Objective:** Independently confirm the just-recomputed `DailyMetrics`/
`MonthlyMetrics` rows agree with fresh, live canonical queries — not just
with themselves.

**Prerequisites:** Gate 3's recompute completed with zero errors.

**Exact commands:**
```bash
cd server
DATABASE_URL=<prod-readonly-or-primary> npx tsx src/scripts/sprint7-rollup-reconciliation-report.ts
```

**Expected results:** Exit code `0`. Report shows 0 UNEXPLAINED
classifications, the independent live-query cross-check matches, and the
"stored vs. fresh legacy" check now naturally reports mismatches for the
recomputed days (expected — those rows are now canonical, not legacy,
following Gate 3) — re-read that section as "stored vs. fresh **canonical**"
for any day recomputed under Gate 3.

**Validation queries:** The script's own output *is* the validation — see
`SPRINT_7_RECONCILIATION_REPORT.md` for the exact query set it runs
(independent ad hoc SQL cross-check, per-field classification).

**Monitoring period:** One-time check immediately after Gate 3's
recompute; re-run after each subsequent scheduled recompute for at least
the first week to build confidence the pattern holds on an ongoing basis.

**Rollback command:** N/A — this gate is validation-only, no state change.
If it fails, the rollback is Gate 3's rollback (revert the flag and
re-recompute).

**Stop conditions:** Non-zero exit code from the reconciliation script;
any UNEXPLAINED classification; any cross-check mismatch.

---

## Gate 5 — Enable dashboard canonical cutover

**Objective:** Serve the 15 canonical fields (Sprint 6's 9 + Sprint 8's 6)
to the dashboard UI instead of their legacy equivalents.

**Prerequisites:** Gate 2's `DASHBOARD_SHADOW_COMPUTE` window has shown
zero unexplained divergence for at least 3 consecutive business days (5+
if any revenue-adjacent field were included — none of the 15 are, since
MRR/revenue fields are excluded from this cutover by design).

**Exact commands:**
```bash
DASHBOARD_CANONICAL_CUTOVER=true
docker compose up -d api
```

**Expected results:** `GET /api/admin/dashboard` now returns the 15
canonical fields with smaller (or, for rates/averages, different) values
than before, matching the documented deltas in `SPRINT_6_RECONCILIATION_
REPORT.md` §1 and `SPRINT_8_RECONCILIATION_REPORT.md` §1. `snapshot`/
`daily`/revenue fields are unaffected by this flag (they depend on Gate 3
instead, or remain Legacy/Deferred).

**Validation queries:**
```bash
curl -s "https://<host>/api/admin/dashboard" -H "Authorization: Bearer <founder JWT>" | jq '.planDistribution, .utmBreakdown, .toolPerf, .feedbackByTool'
```
Compare against the pre-cutover response captured before this gate (a
dashboard snapshot test per `TESTING_STRATEGY.md`).

**Monitoring period:** 1 full business day minimum, watching
`dashboard_canonical_cutover_FALLBACK` log lines (should be absent) and
the still-running Sprint 5 shadow-compare logs (which continue
independently after cutover, re-deriving both sides from scratch — see
`canonicalDashboardCutover.ts`'s design note).

**Rollback command:**
```bash
DASHBOARD_CANONICAL_CUTOVER=false
docker compose up -d api
```
No data cleanup — this flag only changes which value is read into the
response, nothing is written.

**Stop conditions:** Any `dashboard_canonical_cutover_FALLBACK` at a
sustained rate (occasional, individually-explained fallbacks are the
designed degrade-gracefully behavior; a *pattern* of fallbacks for the
same field means that field's canonical query has a real problem); any
`dashboard_shadow_compare_UNEXPLAINED_DISCREPANCY` appearing after
cutover; user (founder) reporting a dashboard number that looks wrong
without a documented explanation.

---

## Gate 6 — Enable nightly Stripe reconciliation

**Objective:** Turn on the permanent safety net — nightly Stripe-vs-
Postgres MRR/active-count comparison, log-only severity routing first.

**Prerequisites:** Gates 1–5 stable. This gate has no dependency on
Gates 3–5 technically (it reads Stripe + `SubscriptionCurrentState`
directly) but is sequenced last-but-one deliberately, matching
`SPRINT_PLAN.md`'s original ordering (reconciliation before MRR writes).

**Exact commands:**
```bash
STRIPE_RECONCILIATION_ENABLED=true
docker compose up -d api   # cron registered in index.ts, 3 AM UTC
```

**Expected results:** One new `MrrReconciliationRun` row appears every
night at 3 AM UTC. Given `MRR_EXTRACTION_V2_WRITE` is still off at this
point (Gate 7 not yet reached), every run's `severity` should be `info`
(per `classify()`'s explicit write-path-disabled downgrade rule) —
**never** `warn`/`critical` at this stage; if one appears, it signals a
bug in the job itself, not a real revenue divergence (there is nothing
live to diverge from yet).

**Validation queries:**
```sql
SELECT "runAt", "writePathEnabled", "postgresMrrCents", "stripeMrrCents", severity
FROM "MrrReconciliationRun" ORDER BY "runAt" DESC LIMIT 10;
```

**Monitoring period:** 5 consecutive clean (`info`-only) nightly runs in
production before considering promotion to paging severity, per
`DEPLOYMENT_RUNBOOK.md`'s parallel-validation table.

**Rollback command:**
```bash
STRIPE_RECONCILIATION_ENABLED=false
docker compose up -d api
```
No cleanup — `MrrReconciliationRun` rows are historical records, harmless
to leave in place.

**Stop conditions:** Any `warn`/`critical` severity while
`MRR_EXTRACTION_V2_WRITE` is off (a job-logic bug, since nothing should be
alarming yet); the cron failing to run at all for more than one night;
any Stripe API error causing job failure without a retry/backoff (per
`TESTING_STRATEGY.md`'s chaos-testing scenario for this exact job).

---

## Gate 7 — Enable MRR extraction writes only after shadow results reconcile with Stripe

**Objective:** The final, highest-stakes gate — start writing corrected
MRR values to `SubscriptionSnapshot`/`SubscriptionCurrentState` for real.

**Prerequisites (all required, not any-of):**
- Gate 2's MRR shadow-compare has run for 5+ consecutive business days
  with every shadow-logged value manually cross-checked against the
  Stripe Dashboard for at least the first several real invoices (per
  `SPRINT_PLAN.md` Sprint 1's own validation requirement).
- Gate 6's reconciliation job has been live for 5+ consecutive clean
  nights (still `info`, since write path is still off at this point).
- Finance/founder sign-off specifically on this gate — MRR is the single
  most consequential number in the whole program (`DASHBOARD_MIGRATION_
  PLAN.md`: "MRR will drop, likely substantially... must be communicated
  proactively to leadership before cutover so it isn't mistaken for a
  revenue collapse").

**Exact commands:**
```bash
MRR_EXTRACTION_V2_WRITE=true
docker compose up -d api
```

**Expected results:** The next real `invoice.payment_succeeded` webhook
writes a `SubscriptionSnapshot` row (and populates `SubscriptionCurrentState`)
using the corrected V2 extraction — real, non-zero `priceMonthly`/
`normalizedMonthlyCents` values, for the first time ever in this table's
history.

**Validation queries:**
```sql
SELECT "stripeSubscriptionId", status, "normalizedMonthlyCents", "lastInvoiceAmountPaidCents", "updatedAt"
FROM "SubscriptionCurrentState" ORDER BY "updatedAt" DESC LIMIT 10;

SELECT * FROM "MrrReconciliationRun" ORDER BY "runAt" DESC LIMIT 3;  -- severity should now reflect real reconciliation, not the write-path-off downgrade
```

**Monitoring period:** Minimum one full billing cycle (~30 days) before
considering the old extraction path eligible for removal, per
`DASHBOARD_MIGRATION_PLAN.md`'s "Cleanup" step. Daily reconciliation-run
review for at least the first week.

**Rollback command:**
```bash
MRR_EXTRACTION_V2_WRITE=false
docker compose up -d api
```
`SubscriptionSnapshot` rows already written with corrected values are
historical facts, not reverted — the flag only stops *future* writes from
using the corrected path. If a specific bad value was written, it requires
a manual data correction, not a flag flip (this is the one place in the
whole plan where rollback is not "free" — flagged explicitly here so it
is never assumed to be).

**Stop conditions:** Any shadow-vs-Stripe manual cross-check mismatch
during the prerequisite window; any reconciliation run reporting `warn`/
`critical` once this flag is on; MRR dropping by an amount inconsistent
with the pre-announced expected delta (`DASHBOARD_MIGRATION_PLAN.md`'s
explicit warning about this exact scenario); any webhook processing error
rate increase after enabling (the extra Stripe API call this path adds
per invoice is a new failure surface).

---

## Summary sequencing

```
Gate 1 (deploy, flags off)
   ↓ 1hr monitor
Gate 2 (shadow flags on)
   ↓ 5 business days
Gate 3 (rollup canonical source + controlled recompute)
   ↓ immediate
Gate 4 (validate rollups vs. live queries)
   ↓ 1 week of re-validation on subsequent recomputes
Gate 5 (dashboard cutover, 15 fields)
   ↓ 1 business day minimum
Gate 6 (nightly Stripe reconciliation, log-only)
   ↓ 5 consecutive clean nights
Gate 7 (MRR extraction writes) — requires Finance/founder sign-off
   ↓ 1 full billing cycle burn-in
[Contract phase: remove old code paths + flags, out of scope for this plan]
```

Gates 3–4 and Gate 6 can run in parallel with each other (independent
subsystems); Gate 5 has no hard dependency on Gates 3/4/6 either (it
governs a disjoint field set) and could in principle move earlier — it is
sequenced after Gate 4 here only to keep the rollout story simple and
because both events are appropriate to complete in the same production
change window at reduced release-management overhead. This is
a deliberate simplification, not a technical requirement.
