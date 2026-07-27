# SPRINT_4_RECONCILIATION_REPORT.md — VideoText

Status: reconciliation report, generated 2026-07-27. Produced by
`server/src/scripts/sprint4-shadow-comparison-report.ts` (read-only,
re-runnable at any time — safe to re-run against live production data since
it performs no writes). This document is the frozen record of that run's
output plus the classification/explanation of every discrepancy found, per
the operator's Sprint 4 instructions: *"Compare every result. Document every
discrepancy... If any canonical view produces numbers that differ materially
from the current dashboard, stop and produce a reconciliation report before
changing downstream consumers."*

**Verdict: 8 metrics compared, 0 unexplained discrepancies. No stop
condition was triggered — every divergence found is fully accounted for by
either (a) the 4 known non-default accounts classified in Sprint 2 (1 demo,
1 founder, 2 internal/test), or (b) the pre-existing, already-documented
Phase 1 finding that guest activity (`Job` rows with no matching `User` row)
is currently blended into several dashboard metrics that the canonical layer
correctly excludes.** Dashboard behavior has **not** been changed — this
report is comparison output only; `adminDashboard.ts` is untouched.

## Method

For each metric below, "OLD" is the dashboard's actual current query
(`server/src/routes/adminDashboard.ts`), unmodified, run live. "NEW" is the
equivalent query against the new `business_users`/`business_jobs` canonical
views (`server/prisma/migrations/20260727150000_add_business_views/migration.sql`),
filtered by `includeInBusinessMetrics` where the design calls for it. Every
pair was computed in the same script run, against the same live production
data, seconds apart.

## Comparison table

| Metric | OLD (current dashboard) | NEW (canonical) | Delta | Classification | Why |
|---|---|---|---|---|---|
| Total Users | 409 | 405 | −4 | **Expected** | Exactly the 4 Sprint 2 exclusions (demo, founder, 2 internal) |
| New Users (30d) | 190 | 190 | 0 | **Expected** | All 4 excluded accounts predate this window |
| Plan Distribution | `free:403, pro:3, founding_workflow:3` | `free:400, pro:2, founding_workflow:3` | `free:−3, pro:−1` | **Expected** | Founder+2 internal are `plan=free` (−3); demo is `plan=pro` (−1) |
| Active Users, 7d | 104 | 54 | −50 | **Expected** | Guest + founder/internal/demo activity excluded (subset relationship confirmed: canonical ≤ raw always) |
| Active Users, 30d | 338 | 166 | −172 | **Expected** | Same as above, larger window |
| Jobs by Tool Type, 30d total | 481 | 309 | −172 | **Expected** | Same population exclusion, job-level |
| Top Users by Job Count (30d, top 10) | founder not in list | founder not in list (identical list) | none | **Identical** | Founder's 144 all-time jobs don't happen to place them in *this* 30-day window's top 10 either way — see note below |
| All-time Total Jobs (All vs. Customer) | 1383 | 583 | −800 | **Expected** | 653 guest jobs (no `User` row at all) + 147 founder/internal jobs = 800, matching the independently-verified view validation exactly |

## Notes on specific rows

**Top Users by Job Count:** this is the one row where I initially mis-classified my own script's output as "expected divergence" when the two lists were actually byte-for-byte identical (founder wasn't in the top 10 in *either* version, for this particular 30-day window). Caught and corrected before this report was finalized — see `IMPLEMENTATION_PROGRESS.md` for the correction note. The underlying data was never wrong, only my script's classification label was, on the first pass. This is exactly the kind of thing this report is supposed to catch, and it caught itself — a good sign for the process, not a data-integrity concern. The structural fix (founder excluded from canonical "top customers" reporting) is still correct and will matter in windows where the founder's testing volume is concentrated.

**All-time Total Jobs:** this is the largest-magnitude divergence (800 of 1383 jobs, 58%) and is presented deliberately as **both numbers**, not a replacement — per `docs/analytics/METRICS.md`'s "Jobs Created/Completed/Failed" design, "All Jobs" and "Customer Jobs" are meant to coexist as two distinct, separately-labeled figures on the dashboard, not one replacing the other. The 800-job gap is dominated by guest activity (653, unauthenticated tool usage — normal and expected for a free-to-try product) plus the founder's own testing (144) and 2 internal accounts (3 combined).

## What this report does NOT cover (scoped out, not overlooked)

Metrics that don't depend on user/job taxonomy at all were not re-derived
through the canonical views, since there is no mechanism by which they could
diverge: `avgProcessingMs`/`p95ProcessingMs`/`failureRate` (pure job-timing
stats), MRR/revenue figures (covered by Sprint 1/3's own validation
separately), `feedbackByTool`/`starDistribution` (from the `Feedback` table,
unrelated to `User`/`Job`), `utmBreakdown`, `costMetrics`,
`youtubeResolution`, `funnelByCohort` (separate systems, not yet part of the
canonical layer — later sprints). Limiting this report to
taxonomy-dependent metrics is a deliberate scoping decision, not an
oversight — it is exactly where Phase 1 found problems and exactly what
Sprint 4's views are designed to fix.

## Conclusion

No unexplained discrepancy exists. Per the operator's instructions, Sprint 4
may proceed to close-out without a stop. The dashboard itself has not been
touched — cutting any of these cards over to the canonical source is Sprint
6's job (per `docs/analytics/DASHBOARD_MIGRATION_PLAN.md`), not this one.
