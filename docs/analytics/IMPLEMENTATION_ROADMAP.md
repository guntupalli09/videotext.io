# IMPLEMENTATION_ROADMAP.md — VideoText Analytics Platform

Status: design/prioritization only. No implementation performed. Effort/risk/
impact are relative t-shirt sizes for planning purposes, not estimates derived
from the actual codebase's velocity.

## Priority 1 — Trust & Safety (stop the bleeding)

Goal: make the numbers currently on the dashboard not actively wrong, before
building anything new on top of them.

| Item | Effort | Risk | Business Impact | Dependencies |
|---|---|---|---|---|
| Fix MRR to read a deduplicated current-state view instead of summing the append-only snapshot ledger | Small | Low | Critical — this is the single highest-severity number on the dashboard | None |
| Add `include_in_business_metrics`/`user_class` flags; backfill known demo/founder/test accounts | Small–Medium | Low | High — removes demo-account contamination from paid conversion, plan distribution, user counts | USER_TAXONOMY.md definitions agreed |
| Stripe reconciliation job: MRR + active-customer count vs. live Stripe (Part 9, rules #1–#2) | Medium | Low | Critical — this is the permanent safety net; once it exists, a future regression is caught automatically instead of discovered by another manual audit | None |

**Quick wins in this tier:** the MRR query fix and the reconciliation job are both
small, isolated, and independently shippable within days — they don't require the
full canonical layer to exist first.

## Priority 2 — Canonical layer foundation

Goal: stand up `business_users` and `business_subscriptions` as the real source
of truth, so Priority 1's fixes become permanent architecture rather than
one-off patches.

| Item | Effort | Risk | Business Impact | Dependencies |
|---|---|---|---|---|
| Build `business_users` (canonical identity + taxonomy model) | Medium–Large | Medium (schema/migration risk on a live table) | High — unlocks every downstream user-based metric | Priority 1 taxonomy decisions |
| Redesign subscription storage: `business_subscriptions` (current-state, unique per subscription) + `business_subscription_history` (append-only audit ledger) | Medium | Medium (must not lose or corrupt existing MRR history during migration) | Critical — permanent fix for the MRR bug class, not just today's instance of it | Priority 1 MRR fix as interim patch |
| Metrics API (`GET /api/metrics/:name`) as the single sanctioned read path | Medium | Low | High — this is what makes "every future query reconciles" actually true, not aspirational | `business_users`/`business_subscriptions` in place |

## Priority 3 — Job / cost / identity canonicalization

| Item | Effort | Risk | Business Impact | Dependencies |
|---|---|---|---|---|
| `business_jobs` model + nightly reconciliation against Bull/Redis counters | Medium | Low | Medium–High — catches silent job-analytics write failures | Priority 2 users model (for `is_guest`/taxonomy joins) |
| AI cost reconciliation against vendor (OpenAI/Deepgram) invoices | Medium | Low | Medium–High for gross-margin accuracy and investor unit-economics claims | `business_jobs` in place |
| Persistent `anonymous_id` guest identity stitching | Medium | Low–Medium (needs a privacy/consent review — a persistent identifier before signup has GDPR/CCPA implications) | Medium — fixes DAU/MAU and guest-metric integrity | None technical; privacy review is the real gating factor |

## Priority 4 — Funnel/behavior unification

| Item | Effort | Risk | Business Impact | Dependencies |
|---|---|---|---|---|
| Fix `fact_event`/`EventLog` to stop silently dropping pre-signup events | Medium | Low | Medium — makes Postgres funnel numbers trustworthy for stages currently undercounted | Guest identity stitching (Priority 3) for full effect |
| Postgres-vs-PostHog reconciliation panel (labeled, not blended) | Medium | Low | Medium — sets correct expectations rather than papering over a structural difference | `fact_event` fix |
| Timezone-safe dashboard rendering (explicit UTC/localized formatting) | Small | Low | Low–Medium (correctness of interpretation, not of underlying numbers) | None — genuine quick win, bundle with any other dashboard-touching work |

**Quick win in this tier:** the timezone fix is small and isolated; ship it
opportunistically alongside any other dashboard change rather than waiting for
its "turn" in the priority queue.

## Priority 5 — Governance & scale

| Item | Effort | Risk | Business Impact | Dependencies |
|---|---|---|---|---|
| Metrics versioning system + restatement log + RFC process | Medium (mostly process/tooling, not heavy engineering) | Low | Long-term/compounding — this is what prevents the *next* Phase-1-style audit from being necessary | Priority 2 layer in place (there must be something to version) |
| Repo lint rule blocking raw `business_*` table access outside the analytics layer | Small–Medium | Low | High leverage for a small effort — structurally prevents regression to "every dashboard writes its own SQL" | Metrics API (Priority 2) |
| Formal LTV / Gross Margin / ARR models with documented, versioned methodology | Medium | Low | High for investor-grade reporting credibility | Priorities 1–4 (needs stable revenue, job, and cost inputs first) |
| Quarterly metric audit cadence formalized (calendar + trigger-based reviews) | Small (process) | Low | Long-term risk reduction | Governance doc adopted |

## Sequencing rationale

Priority 1 exists because **the current dashboard is actively misleading
business decisions today** — it must be addressed before anything else,
independent of how long the full canonical layer takes to build. Priority 2 is
the load-bearing foundation everything else depends on; skipping straight to
Priority 3/4/5 without it means building new features on the same unreliable
base that caused Phase 1's findings. Priority 5 is intentionally last relative
to engineering effort but should be **adopted in parallel, immediately**, at the
process level (the RFC template and review cadence cost almost nothing to start
using, even before any new table exists) — governance is not something to defer
until the technical work is "done," because the technical work is never
permanently done; new metrics get proposed continuously.
