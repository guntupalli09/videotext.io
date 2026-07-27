# GATE_1_DEPLOYMENT_REPORT.md — VideoText

Status: executed and complete, 2026-07-27. Gate 1 of `FINAL_DEPLOYMENT_
PLAN.md` — deploy code with every new analytics feature flag disabled.
**Zero user-visible behavioral change**, confirmed, not just expected —
the dashboard response is byte-for-byte identical before and after
(matching SHA-256 checksums, see §4).

## 0. Pre-deployment discovery — production was already ahead of the documented state

Before touching anything, the pre-deployment recording step (§1) found
that `videotools-api` was **already running Sprint 6's code**, not the
pre-Sprint-6 baseline every prior report in this program claimed. This
was investigated before any deploy action was taken, per the operator's
explicit "stop and investigate" instruction, rather than proceeding on an
incorrect assumption.

**What was found (all read-only):**
- `videotools-api` had been restarted at `2026-07-27T02:39:53Z` — about 5
  minutes after the Sprint 6 commit (`97343f3`, `02:34:08Z`).
- The running container's own filesystem confirmed Sprint 6 code present
  (`/app/dist/services/canonicalDashboardCutover.js` exists) but not
  Sprint 7/8 code (`recomputeMetricsCanonical.js`/`rollupReconciliation.js`
  absent, `ROLLUP_CANONICAL_SOURCE` not present in the built
  `featureFlags.js`).
- An image was tagged `videotools-api:pre-sprint6-rollback` — a name only
  explicable as a deliberate rollback-safety tag applied immediately
  before that deploy, following this program's own established
  convention.
- Login history and shell history on the host show a single session
  (`root@99.30.48.69`, 2026-07-26 23:49 → 2026-07-27 07:45) whose window
  contains every Sprint 0–6 commit timestamp *and* multiple
  `docker compose build --no-cache && docker compose up -d` invocations.
- Host uptime is 178 days (no reboot); no cron/systemd timer or CI path
  exists that could explain an automatic redeploy (nothing in this
  program has ever been pushed to a remote).
- Every governing flag was confirmed `false` inside that already-running
  container, both as raw env and as the app's own parsed values — so
  despite the code being ahead of the documented state, **no behavior had
  actually changed**.
- Separately, `videotools-worker` was still running an image built
  **2026-06-23** (tagged `pre-sprint6-rollback`) — about a month behind
  `main`, unrelated to this analytics program specifically.

**Conclusion, presented to and confirmed by the operator:** this was very
likely an intentional Sprint-6-to-`api`-only deploy made outside this
conversation's visibility (by the operator directly, or an earlier
session not reflected in this conversation's transcript), done with
correct rollback-tagging discipline and with flags correctly left off.
**Operator decision:** proceed with Gate 1 as planned — rebuild the shared
image fresh from `c6e89ae` and recreate both `api` and `worker`, bringing
both fully current, correcting the "not deployed" claim in
`IMPLEMENTATION_PROGRESS.md`/`SPRINT_6_RECONCILIATION_REPORT.md` as part
of this report.

## 1. Pre-deployment baseline (recorded before any build/restart command)

| Check | Result |
|---|---|
| Git commit (this deploy) | `c6e89ae639a4d36e10a186cae9b2d45696e74798` |
| Running `api` image (before) | `b97bd2f42fee` (Sprint 6 state, per §0), created `2026-07-27T02:38:38Z` |
| Running `worker` image (before) | `a5d98bf8e066`, tagged `pre-sprint6-rollback`, created `2026-06-23T04:32:37Z` |
| Container status | `api` up 13h (healthy); `worker` up 4 weeks; `postgres` up 2 months (healthy); `redis` up 8 weeks (healthy); `docker-cleanup` already crash-looping (`Restarting`) — pre-existing, unrelated to this deploy, not touched |
| `/healthz` | 200 |
| `/readyz` | 200 `{"status":"ok"}` |
| Worker heartbeat (Redis) | fresh (~5s old at time of check) |
| `prisma migrate status` | "Database schema is up to date!" (23 migrations, none pending) |
| Row counts | `User`=417, `Job`=1394, `SubscriptionSnapshot`=22, `SubscriptionCurrentState`=0, `MrrReconciliationRun`=1, `DailyMetrics`=230, `MonthlyMetrics`=16, `Feedback`=40, `EventLog`=6505 |
| Dashboard response (founder JWT, read-only `GET`) | Captured in full; SHA-256 `b91320ad3bba5a...` |
| Stripe (fresh `stripe-reconciliation-report.ts --dry-run`) | `stripeMrrCents=5000` ($50.00), `stripeActiveCount=2`, `severity=info` — matches the frozen baseline documented in `FINAL_DEPLOYMENT_PLAN.md`'s "Pre-Gate-1 frozen baseline" section exactly |
| All 6 governing flags (confirmed inside the running container) | `MRR_EXTRACTION_V2_SHADOW`, `MRR_EXTRACTION_V2_WRITE`, `STRIPE_RECONCILIATION_ENABLED`, `DASHBOARD_SHADOW_COMPUTE`, `DASHBOARD_CANONICAL_CUTOVER` = `false`; `ROLLUP_CANONICAL_SOURCE` not yet present in this image |

## 2. Deployment actions taken

1. Tagged the then-current image for rollback: `docker tag videotools-api:latest videotools-api:pre-sprint7-8-rollback` (image `b97bd2f42fee`).
2. `docker compose build api` — rebuilt the single shared image
   (`api`/`worker` both run `image: videotools-api`, per `Dockerfile`'s
   "single image for API and worker" design) from the working tree at
   commit `c6e89ae`. Resulting image: `c9237a84fea8`.
3. Verified the new image contains Sprint 7 + 8 code
   (`recomputeMetricsCanonical.js`, `rollupReconciliation.js`,
   `sprint7-rollup-reconciliation-report.js`, `ROLLUP_CANONICAL_SOURCE`
   present in `featureFlags.js`) **before** deploying it.
4. `docker compose up -d api worker` — recreated **only** these two
   containers. `postgres` and `redis` were not recreated (compose
   reported them as already `Running`/`Healthy`, confirmed by their
   unchanged uptimes post-deploy: `postgres` still "up 2 months",
   `redis` still "up 8 weeks").
5. No migration was manually applied — the `api` container's own startup
   command (`npx prisma migrate deploy && node dist/index.js`) ran as it
   always does; confirmed harmless (§3).
6. No feature flag was set. No `POST /api/admin/recompute` was called. No
   Stripe object was created, updated, or deleted. No production business
   data (`User`/`Job`/`Feedback`/etc.) was written.

## 3. Post-deployment validation

| Check | Result |
|---|---|
| `api` container | `Up ... (healthy)`, started `2026-07-27T16:12:59Z` |
| `worker` container | `Up`, started same time, clean startup log (`Worker process started`, queues registered, zero errors) |
| `/healthz` | 200 |
| `/readyz` | 200 `{"status":"ok"}` |
| Worker heartbeat | resumed, fresh |
| `prisma migrate status` (post-deploy) | "Database schema is up to date!" — unchanged |
| **All 6 flags, including `ROLLUP_CANONICAL_SOURCE`** (confirmed inside the new container) | all `false` |
| Dashboard response (same founder JWT technique, `GET`, read-only) | **SHA-256 `b91320ad3bba5a...` — identical to the pre-deploy capture, `diff` empty.** `canonicalCutover:false` in the request log confirms the legacy path served it. |
| Dashboard schema | Unchanged — same 17 top-level keys, same per-field shapes |
| Auth | Valid founder JWT → 200; no token → 401; garbage token → 401 |
| Stripe webhook endpoint | `POST /api/stripe/webhook` with no signature → 400 `"Missing Stripe-Signature header"` (reachable, correctly rejecting, not 404/500) |
| Upload pathway | `POST /api/upload/init` with an empty body → 400 with a real validation message (route mounted, auth middleware executes, no crash) |
| Job pathway | `GET /api/job/:jobId` for a nonexistent id → 404 `{"message":"Job not found"}` (real application-level not-found, not a routing 404) |
| Login pathway | `POST /api/auth/login` with a nonexistent account → 401 `"Invalid email or password"` |
| Row counts (post-deploy) | Identical to pre-deploy: `User`=417, `Job`=1394, `SubscriptionSnapshot`=22, `SubscriptionCurrentState`=0, `MrrReconciliationRun`=1, `DailyMetrics`=230, `MonthlyMetrics`=16, `Feedback`=40, `EventLog`=6505 |
| Stripe baseline | `stripeMrrCents=5000`, `stripeActiveCount=2`, `severity=info` — unchanged from pre-deploy, matches the frozen baseline |
| API logs since restart | Zero `error`/`critical` level entries; real live founder-browser traffic observed flowing through correctly (`https://videotext.io` origin requests to `/api/admin/dashboard`, `/api/admin/server-health`, etc., all 200) |
| Worker logs since restart | Zero `error`/`critical` level entries |
| `docker-cleanup` container | Still crash-looping — **pre-existing**, confirmed present in the very first `docker compose ps` before any action was taken this Gate; not touched, not caused by this deploy, out of this Gate's scope |

**Deliberate scope note on "upload and job-processing smoke tests":**
a full end-to-end test (actually uploading a file and letting a job
process) would create a real `Job` row — which the deployment
constraints explicitly forbid ("do not modify production business data").
Validation was therefore limited to confirming every relevant route is
mounted, reachable, and behaves correctly at the application layer
(proper validation/not-found responses, not framework-level 404s or
crashes) without creating new production data. This is a deliberate,
reasoned substitution, recorded transparently rather than silently
narrowing scope — same discipline as Sprint 3's staging-account
substitution.

## 4. Exact rollback path

```bash
# Roll back both containers to the exact pre-deploy image:
docker tag videotools-api:pre-sprint7-8-rollback videotools-api:latest
docker compose up -d api worker
```
`videotools-api:pre-sprint7-8-rollback` (image `b97bd2f42fee`) is
preserved on this host and will not be pruned by the weekly
`docker-cleanup` job's 7-day age threshold for at least a week. No
migration reversal is required (no schema changed this deploy). No data
cleanup is required (no data was written).

## 5. Correction to the documented record

`IMPLEMENTATION_PROGRESS.md` and `SPRINT_6_RECONCILIATION_REPORT.md`
previously stated Sprint 6 was "NOT deployed... container has NOT been
rebuilt, restarted, or redeployed." Per §0 above, that was already false
for the `api` container at the time those documents were last read this
session (though harmless in effect, since flags were correctly off).
`IMPLEMENTATION_PROGRESS.md` is updated alongside this report to reflect
the actual, now-fully-understood deployment history.

## 6. Result

**Zero user-visible behavioral change**, confirmed by an exact
byte-for-byte dashboard response match (not merely "should be
unaffected"). Both containers are healthy, all 6 flags remain off, no
migration ran beyond its routine no-op check, no production data was
written, and Postgres/Redis were never touched. Gate 1 is complete.

**Per operator instruction, this agent stops here. Gate 2 requires a
separate, explicit approval.**
