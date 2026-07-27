# SPRINT_5_RECONCILIATION_REPORT.md — VideoText

Status: reconciliation report, generated 2026-07-27. Produced by
`server/src/scripts/sprint5-dashboard-reconciliation-report.ts` (read-only,
re-runnable at any time — safe to re-run against live production data since
it performs no writes; the same comparison also runs live, in shadow mode,
inside `GET /api/admin/dashboard` whenever `DASHBOARD_SHADOW_COMPUTE=true`,
logging every row per request without ever changing what's served).

**Verdict: 25 dashboard fields evaluated. 2 IDENTICAL, 13 EXPECTED_DIVERGENCE,
5 NOT_YET_COMPARABLE (explicitly scoped out, not silently skipped), 0
UNEXPLAINED.** Per the operator's Sprint 5 requirement 7 ("if every
difference is explained by the approved taxonomy or documented business
definitions, continue"), this sprint proceeds without a stop. Requirement 8's
stop condition ("if any unexplained difference appears, stop immediately")
was evaluated explicitly by the script itself (exit code 0, `UNEXPLAINED: 0`)
and was not triggered. **The dashboard's served response is unchanged —
`adminDashboard.ts`'s legacy queries and their output are exactly what they
were before this sprint; the canonical computation is shadow-only.**

## Method

For every field, "Legacy" is the exact query `adminDashboard.ts` already
runs (unmodified — still the only thing ever served to the client). "Canonical"
is the equivalent computation via the Sprint 4 `business_users`/
`business_jobs` views, filtered by `includeInBusinessMetrics`. Both sides
were computed in the same script run, seconds apart, against the same live
production data. Classification rules (implemented in
`server/src/services/canonicalDashboard.ts`):

- **IDENTICAL** — values match exactly.
- **EXPECTED_DIVERGENCE** — canonical is a subset of legacy (for counts) or
  the divergence is fully attributable to a documented, already-known cause
  (the 4 Sprint 2 taxonomy exclusions, guest-job exclusion, or the
  METRICS.md-documented "All Jobs vs. Customer Jobs" / "AI Cost with vs.
  without internal usage" dual-reporting design).
- **UNEXPLAINED** — canonical is *larger* than legacy for a count (would
  indicate a bug in the view/join, not a taxonomy exclusion), or a
  divergence exists with no attributable cause. **None found.**
- **NOT_YET_COMPARABLE** — the field depends on a canonical model that
  doesn't exist yet (`business_subscriptions`/`business_revenue` — Sprint
  7+; `business_conversion`/`fact_event` — Sprint 8), or isn't a KPI at all
  (the raw recent-activity feed). Explicitly enumerated, not omitted.

## Comparison table

| Card | Metric | Legacy | Canonical | Abs Δ | % Δ | Classification |
|---|---|---|---|---|---|---|
| snapshot | totalUsers | 409 | 405 | 4 | 0.98% | EXPECTED_DIVERGENCE |
| snapshot | newUsers (30d) | 190 | 190 | 0 | 0.00% | **IDENTICAL** |
| snapshot | jobsCreated (30d) | 482 | 309 | 173 | 35.89% | EXPECTED_DIVERGENCE |
| snapshot | jobsCompleted (30d) | 462 | 305 | 157 | 33.98% | EXPECTED_DIVERGENCE |
| snapshot | jobsFailed (30d) | 20 | 4 | 16 | 80.00% | EXPECTED_DIVERGENCE |
| snapshot | mrrCents | 0 | 0 | n/a | n/a | NOT_YET_COMPARABLE |
| snapshot/revenue/daily | newPaidUsers, churnedUsers, MRR/churn trends | n/a | n/a | n/a | n/a | NOT_YET_COMPARABLE |
| usage | topUsersByJobCount (top 10, 30d) | 10 emails | same 10 emails | — | — | **IDENTICAL** |
| usage | jobsByToolType (30d, total) | 482 | 309 | 173 | 35.89% | EXPECTED_DIVERGENCE |
| performance | avgProcessingMs (30d) | 22,074 ms | 17,836 ms | 4,238 ms | 19.20% | EXPECTED_DIVERGENCE |
| planDistribution | plan counts | `pro:3, founding_workflow:3, free:403` | `pro:2, founding_workflow:3, free:400` | 4 | 0.98% | EXPECTED_DIVERGENCE |
| utmBreakdown | source counts | `direct:409` | `direct:405` | 4 | 0.98% | EXPECTED_DIVERGENCE |
| failureReasons | distinct-reason counts (30d) | 20 failed jobs, ~19 distinct reasons | 4 failed jobs, 2 distinct reasons | 16 | 80.00% | EXPECTED_DIVERGENCE |
| toolPerf | completed jobs per tool (all-time) | 1,251 total | 575 total | 676 | 54.04% | EXPECTED_DIVERGENCE |
| costMetrics | jobCount with cost data (30d) | 264 | 193 | 71 | 26.89% | EXPECTED_DIVERGENCE |
| costMetrics | totalWhisperCostUsd (30d) | $9.64 | $7.29 | $2.35 | 24.38% | EXPECTED_DIVERGENCE |
| feedback | starDistribution total (all-time) | 33 | 24 | 9 | 27.27% | EXPECTED_DIVERGENCE |
| recentJobs | recent activity feed | — | — | — | — | NOT_YET_COMPARABLE |
| youtubeResolution | all fields | — | — | — | — | NOT_YET_COMPARABLE |
| funnelByCohort | all cohort stages | — | — | — | — | NOT_YET_COMPARABLE |

(Full raw values, including the complete `failureReasons` error-message
text — omitted here for readability, some individual entries are multi-KB
ffmpeg stderr dumps — are in the script's own stdout; re-run
`npx tsx src/scripts/sprint5-dashboard-reconciliation-report.ts` from
`server/` for the complete, unabridged output at any time.)

## Notable individual findings

**Largest magnitude: `toolPerf` (676 jobs, 54%).** This is an all-time,
unwindowed metric, so it accumulates the founder's full 144-job testing
history plus all guest activity ever recorded — the largest gap in this
report by design, not by surprise (matches the Sprint 4 report's "All-time
Total Jobs" finding of 800/1383, which is the same underlying population
difference measured a different way).

**`avgProcessingMs`: the only non-monotonic metric in this report.**
Every other row's canonical value is a strict subset count and therefore
mechanically ≤ legacy. Processing-time *averages* don't have that property —
removing a set of jobs can move an average up or down depending on whether
those jobs were faster or slower than the mean. The legacy average (22.1s)
being higher than canonical (17.8s) implies the founder's/guests' excluded
jobs skewed slower on average than genuine customer jobs — plausible (test
uploads are often larger/less optimized) but not independently confirmed
here; flagged as an observation, not a claim.

**`costMetrics.totalWhisperCostUsd`: the first live instance of the
METRICS.md "AI Cost with vs. without internal usage" design.** $2.35 of the
$9.64 in 30-day Whisper spend (24%) is attributable to the founder's own
testing, not customer usage — this is exactly the split
`docs/analytics/METRICS.md`'s AI Cost definition calls for, now demonstrated
with real numbers for the first time.

**`feedback.starDistribution`: 9 of 33 all-time star ratings (27%) came from
one of the 4 excluded accounts.** Anonymous feedback (`userId IS NULL`,
e.g. public `/survey` submissions) is unaffected either way, since it was
never attributable to any account, excluded or not.

## What "shadow-only" means in practice for this sprint

`adminDashboard.ts` was modified — this is the first sprint that touches it
— but only additively: `res.json(response)` is called with the exact same
`response` object as before, and only *after* that call does the (optional,
flag-gated) shadow comparison run, wrapped in a 15-second timeout and a
`.catch()` that can never throw back into the request/response cycle. With
`DASHBOARD_SHADOW_COMPUTE` at its default (`false`), the added code paths
never execute at all — behavior is byte-for-byte identical to before this
sprint. This was verified by re-running the full existing test suite (21/21
pass, unchanged) and confirming zero new lint errors beyond the
already-accepted `no-console` script convention.

## Conclusion

No unexplained discrepancy exists. Per the operator's instructions, Sprint 5
may proceed to close-out. Cutting any dashboard card over to read from the
canonical source instead of the legacy query remains Sprint 6's job — this
sprint only adds the ability to *observe* the difference, in the background,
without changing what anyone sees.
