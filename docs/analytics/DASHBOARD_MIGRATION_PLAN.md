# DASHBOARD_MIGRATION_PLAN.md — VideoText Founder Dashboard

Status: design/blueprint only.

## Generic per-card migration pattern (applied to every card below)

1. **Shadow-compute**: dashboard endpoint computes the target-source value
   alongside the current value, on every request, but serves only the current
   value. Shadow computation is wrapped in a timeout/circuit-breaker so it can
   never slow down or fail the real response.
2. **Diff logging**: any divergence beyond a defined tolerance is logged (and
   after a few days, alerted on) — not silently ignored.
3. **Burn-in**: require N consecutive days (card-dependent — 3 for low-stakes
   cards, 5+ for MRR/revenue) of zero unexplained divergence.
4. **Cutover**: feature-flag flip to serve the target-source value. Flag stays
   in the codebase for one full release cycle before removal, so an instant
   revert is possible without a redeploy.
5. **Cleanup**: once stable for a full billing cycle (~30 days for
   revenue-adjacent cards), remove the old code path and the flag.

## Card-by-card plan

| Card | Current source | Target source | Migration approach | Verification | Rollback | Expected impact |
|---|---|---|---|---|---|---|
| MRR / ARR / ARPU / ARPPU | Live unbracketed `SUM(SubscriptionSnapshot.priceMonthly) WHERE status='active'` | `business_subscriptions` (deduplicated current-state) | Sprint 1 query-level fix first (fast, isolated), Sprint 6 full canonical-source cutover last, gated by Sprint 3's Stripe reconciliation running clean | Manual Stripe spot-check + nightly reconciliation job | Feature flag to old query | **Largest visible change** — MRR will drop, likely substantially, to its true value; must be communicated proactively to leadership *before* cutover so it isn't mistaken for a revenue collapse |
| Total / New Users | Raw `COUNT(*) FROM "User"`, no taxonomy filter | `business_users` with `include_in_business_metrics` | Shadow → cutover, early in Sprint 6 (low risk, high confidence) | Diff against Sprint 0 baseline | Feature flag | User counts will drop by exactly the number of demo/founder/test accounts — expected and desired |
| Plan Distribution | Raw `GROUP BY plan` on `User`, includes demo accounts as "pro" | `business_users` filtered | Cutover **first** — simplest query, clearest expected outcome, good pilot for the cutover mechanism itself | Sum of new distribution should equal new Total Users | Feature flag | "Pro" bucket shrinks by demo-account count |
| Active Users (DAU/WAU/MAU retention panel) | `COUNT(DISTINCT userId) FROM "Job"`, includes guests | `business_jobs` with `STD_FILTER`, guests reported as a separate labeled metric | Cutover after Plan Distribution, before MRR | Confirm guest-only count is now visible as its own line item, not silently dropped | Feature flag | Canonical active-user number drops; a new "Guest Activity" card appears alongside it so no information is lost, only reclassified |
| Jobs Created / Completed / Failed | Two disagreeing panels (`jobsByToolType` unjoined vs. `topUsersByJobCount` inner-joined) | `business_jobs`, dual-reported (All Jobs vs. Customer Jobs) as two explicit numbers | Cutover alongside Active Users; resolves the internal self-disagreement as a side effect | The two dashboard panels must now sum consistently once both read the same canonical source | Feature flag | Panels stop silently disagreeing with each other |
| Activation Rate / Cohort Funnel | Live 6-way `$queryRaw` join, uncached beyond the 30s outer cache | `business_growth`/`business_conversion` materialized nightly | Sprint 7 (rollups redesign), later than the simpler cards — this is the highest-complexity migration | Compare new cohort numbers against the existing live-query output for several historical cohorts before cutover | Revert to existing live-query implementation (kept, not deleted, until this is fully proven) | Numbers should match closely for cohorts *after* the guest/demo fixes land; historical cohorts spanning the transition period may show a visible step-change, which must be footnoted, not hidden |
| Server health / queue depth / worker heartbeat | Live Redis/Bull query, no cache | **Unchanged** | No migration — this card is already architected correctly (operational, not business, metric) | N/A | N/A | None — explicitly out of scope |
| Feedback / star ratings | Live Postgres, no taxonomy filter | `business_users`-joined, `STD_FILTER` | Low-priority cutover, any time after `business_users` exists | Compare filtered vs. unfiltered counts to confirm founder/demo feedback (if any) is now excluded | Feature flag | Minor — likely small or zero visible change if founder rarely submits feedback |
| Recent Jobs feed | Live `Job` query, `LIMIT 50` | `business_jobs`, unfiltered (this is an operational visibility feed, not a KPI — intentionally shows everything including guest/demo activity, clearly labeled) | No cutover needed to the *filtering*, only re-pointed at the view for consistency of source | Spot-check row parity | Feature flag | None visible — same data, same source table underneath |
| YouTube resolution / ingestion cost metrics | Ad hoc Redis hashes, not joinable to user/revenue context | New `business_cost`-adjacent fact table (second-wave, DATABASE_MIGRATION_PLAN.md Part 6) | Deferred past the initial 8-sprint plan — not on the critical path for trustworthy top-line metrics | N/A yet | N/A yet | Deferred |
| **NEW: Stripe Reconciliation panel** | Does not exist | Direct Stripe API call, on-demand only | New card, ships with Sprint 3's reconciliation job — no migration, pure addition | Manual test against a known-divergent staging scenario | Remove the card; no dependency from anything else | Positive-only — first time a founder can force a live truth-check from the UI itself |
| **NEW: PostHog Product Insights embed** | Does not exist | PostHog API/embedded insight | New card, ships with Sprint 8 (PostHog cleanup), clearly labeled as exploratory/non-authoritative | N/A (PostHog-native) | Remove the card | Positive-only addition |

## Sequencing summary

**Move first** (Sprint 6, early): Plan Distribution, Total/New Users — simplest
queries, clearest expected before/after numbers, best low-stakes pilot for
proving the cutover mechanism works end-to-end.

**Move middle**: Active Users, Jobs Created/Completed/Failed — moderate
complexity, resolves an existing internal self-disagreement as a visible win.

**Move last**: MRR/ARR/ARPU/ARPPU — highest stakes, gated on Sprint 3's
reconciliation job having run clean for the full burn-in period; Activation/
Cohort Funnel — highest technical complexity, gated on Sprint 7's rollup
redesign.

**Stay real-time, unchanged**: server health, queue depth, worker heartbeat —
correctly architected today, explicitly out of scope.

**Become rollup-based**: Activation/Cohort Funnel (from live-join to nightly
materialized view).

**Become cached (shared, not per-process)**: every card, as part of Sprint 6's
Redis cache-layer change, bundled once rather than repeated per card.
