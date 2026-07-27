# GATE_2_REPORT.md — VideoText

Status: executed, 2026-07-27. Gate 2 of `FINAL_DEPLOYMENT_PLAN.md` —
enable shadow-mode flags only (`MRR_EXTRACTION_V2_SHADOW`,
`DASHBOARD_SHADOW_COMPUTE`), everything else stays off.

**This report covers an initial validation window (~15 minutes of direct
observation within this session), not the full multi-day burn-in
`FINAL_DEPLOYMENT_PLAN.md` specifies for this gate.** See §7 for why that
distinction matters and what it means for the Gate 3 recommendation.

## 1. What was changed

Added to `.env`:
```
MRR_EXTRACTION_V2_SHADOW=true
DASHBOARD_SHADOW_COMPUTE=true
MRR_EXTRACTION_V2_WRITE=false
DASHBOARD_CANONICAL_CUTOVER=false
ROLLUP_CANONICAL_SOURCE=false
STRIPE_RECONCILIATION_ENABLED=false
```
Only the `api` container was restarted (`docker compose up -d api`) to
load the new values — `worker`, `postgres`, and `redis` were not touched
(confirmed via unchanged container start times). Neither shadow path
executes in the `worker` process (`MRR_EXTRACTION_V2_SHADOW` is read by
the Stripe webhook handler, `DASHBOARD_SHADOW_COMPUTE` by the dashboard
route — both are `api`-only routes), so this was correctly unnecessary,
not merely convenient.

Confirmed post-restart, read directly from the running container's parsed
flag values (not just the `.env` file):
```
MRR_EXTRACTION_V2_SHADOW: true
MRR_EXTRACTION_V2_WRITE: false
STRIPE_RECONCILIATION_ENABLED: false
DASHBOARD_SHADOW_COMPUTE: true
DASHBOARD_CANONICAL_CUTOVER: false
ROLLUP_CANONICAL_SOURCE: false
```

## 2. Shadow execution count

| Path | Executions observed | Notes |
|---|---|---|
| `DASHBOARD_SHADOW_COMPUTE` | **3** full executions | Triggered by `GET /api/admin/dashboard` (mix of synthetic founder-JWT requests and 2 real founder-browser requests from `https://videotext.io` that landed in the same window) |
| `MRR_EXTRACTION_V2_SHADOW` | **0** executions | This path only runs inside `handleInvoicePaymentSucceeded`, triggered by a real Stripe `invoice.payment_succeeded` webhook. None arrived during this observation window — expected, not a defect (it depends on real customer payment events, which don't happen on a fixed schedule). The flag is confirmed live and ready; it has simply had no event to react to yet. |

## 3. Comparison summary (dashboard shadow-compute)

| Metric | Value |
|---|---|
| Total shadow-compute runs | 3 |
| Metrics compared per run | 31 (matches the documented count from Sprints 5–8) |
| Total individual metric comparisons | 93 |
| `IDENTICAL` / `EXPECTED_DIVERGENCE` | All 93 fell into one of these two categories |
| `UNEXPLAINED` | **0** |
| `NOT_YET_COMPARABLE` | Included in the 31/run as usual (MRR/revenue/funnel/etc. — unchanged from prior sprints) |

Sample log lines (representative, not exhaustive):
```
{"msg":"dashboard_shadow_compare","card":"snapshot","metric":"totalUsers",
 "legacyValue":417,"canonicalValue":413,"absoluteDiff":4,"percentDiff":0.96,
 "classification":"EXPECTED_DIVERGENCE",
 "explanation":"Delta attributable to the 4 Sprint 2 taxonomy exclusions
 (1 demo, 1 founder, 2 internal) and/or guest jobs..."}

{"msg":"dashboard_shadow_compare","card":"snapshot","metric":"newUsers (30d)",
 "legacyValue":195,"canonicalValue":195,"absoluteDiff":0,"percentDiff":0,
 "classification":"IDENTICAL", ...}

{"msg":"dashboard_shadow_compare_summary","totalMetrics":31,
 "unexplainedCount":0,"unexplainedMetrics":[]}
```
All three runs produced an identical `unexplainedCount: 0`, consistent
with every prior sprint's live validation of this same comparison logic
(Sprints 5–8).

## 4. Unexplained differences

**0.** Every divergence observed matches the already-documented, expected
pattern (guest-job exclusion + the 4 Sprint-2-classified accounts).

## 5. Timeout count

**0.** The shadow comparison has a 15-second budget
(`SHADOW_COMPUTE_TIMEOUT_MS`); actual completion time per run was 91ms,
148ms, and 103ms after the response was already sent — nowhere close to
the budget.

## 6. Fallback count

**0.** There is no per-field fallback mechanism in the shadow path (that
mechanism belongs to Sprint 6/8's *cutover* code, not shadow-compute) —
the shadow path either completes and logs a summary, or its single
`.catch()` logs `dashboard_shadow_compare_failed` and gives up for that
request only, never affecting the response already sent. Zero
`dashboard_shadow_compare_failed` entries were logged in this window.

## 7. Performance impact

| Measurement | Result |
|---|---|
| Dashboard response time (`Founder dashboard computed`, `ms` field — this is computed and logged **before** the response is sent, so shadow-compute cannot affect it by construction) | 270ms, 204ms, 72ms across the 3 runs — consistent with the 223ms figure observed during Gate 1, no regression |
| Shadow-compute completion time (time between "response sent" and the shadow summary log) | 91ms, 148ms, 103ms — well within the 15s budget, and irrelevant to what the user experiences since it runs after the response |
| User-visible latency | **Unaffected** — verified both by the timing data above and by the architectural fact that `shadowCompareDashboard()` is invoked only after `res.json(response)` has already returned |

## 8. Database writes

**Zero.** Row counts for every table checked (`SubscriptionSnapshot`,
`SubscriptionCurrentState`, `DailyMetrics`, `MonthlyMetrics`, `User`,
`Job`) were identical immediately before enabling the flags and after the
observation window. Both shadow paths are read-only by design — this
confirms it empirically, not just by code review.

## 9. Users continue receiving legacy responses

Fetched the dashboard through the exact same founder-JWT technique used
in `GATE_1_DEPLOYMENT_REPORT.md` and compared checksums: **identical
SHA-256 (`b91320ad3bba5a...`) to the Gate 1 post-deploy baseline.** The
served response is untouched — `DASHBOARD_SHADOW_COMPUTE` only adds a
comparison that runs and logs *after* the response, never altering it.

## 10. Worker impact

Worker container was not restarted and needed no restart (neither shadow
path executes there). Worker logs show zero new errors attributable to
Gate 2. One unrelated, pre-existing warning was observed
(`Onboarding email send failed... daily_quota_exceeded`, a Resend API
rate limit on the onboarding-email cron) — confirmed unrelated to this
deploy (it's about transactional email sending, not analytics), flagged
here only for completeness, not as a Gate 2 finding.

## 11. Log excerpts

Full raw logs for this window are available via `docker logs
videotools-api --since <window>` on the host; representative excerpts are
in §3 above. No `"level":"error"` entries appeared anywhere in the
observation window.

## 12. Recommendation for Gate 3

**Mechanism validation: pass, cleanly, on every dimension measured.**
Zero unexplained differences, zero timeouts, zero fallbacks, zero
regressions, zero database writes, zero user-visible change, worker
unaffected.

**However:** `FINAL_DEPLOYMENT_PLAN.md`'s own prerequisite for Gate 3 is
"Gate 2's shadow window has shown zero unexplained divergence" over its
specified monitoring period — **5 business days for the MRR shadow
specifically**, since that's the higher-stakes of the two paths. This
report covers roughly 15 minutes of direct observation within a single
session, not that period. That gap can't be closed by more thorough
checking in one sitting — it requires real elapsed calendar time, the
same category of constraint noted for every calendar-gated criterion
since Sprint 5.

Additionally, `MRR_EXTRACTION_V2_SHADOW` has had **zero real executions**
so far, since no `invoice.payment_succeeded` webhook has arrived during
this window. Recommending Gate 3 before that specific path has actually
run at least once against a real invoice would mean approving the
highest-stakes flag in this whole program on a sample size of zero.

**Recommendation: do not proceed to Gate 3 yet.** Instead:
1. Leave both shadow flags on (as approved) and let them continue running
   in production.
2. Check back periodically (daily is reasonable) over the coming days for:
   - continued `dashboard_shadow_compare_summary` logs with
     `unexplainedCount: 0`,
   - at least one real `mrr_extraction_shadow_compare` log once a real
     invoice payment occurs, manually cross-checked against the Stripe
     Dashboard for that specific invoice (per `SPRINT_PLAN.md` Sprint 1's
     own validation requirement),
   - continued zero errors/timeouts/fallbacks.
3. Bring me back in to review the accumulated logs and produce an updated
   Gate 2 closure report once the observation period has actually
   elapsed, at which point Gate 3 can be considered with real evidence
   behind it rather than a 15-minute sample.

This session's Gate 2 state remains exactly as configured above —
flags on, nothing else touched — until you decide otherwise.
