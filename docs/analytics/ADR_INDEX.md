# ADR_INDEX.md — VideoText Analytics Architecture Decisions

Status: design/blueprint only — these are ADRs that *should* be written and
ratified as part of this program, not yet-formalized decisions.

---

### ADR-001: Canonical Metrics Layer

- **Problem:** Every KPI is computed ad hoc, in multiple places, with no
  shared definition — the root cause of every Phase 1 finding.
- **Decision:** Introduce a layered `business_*` model (raw → staging →
  canonical → marts → serving) as the single computation path for every
  business metric.
- **Alternatives considered:** (a) Fix each broken query in place, one at a
  time, with no shared layer — rejected because it fixes today's bugs without
  preventing the next one. (b) Adopt a third-party metrics/semantic-layer
  product wholesale — deferred, not rejected outright; worth revisiting once
  the in-house layer proves the definitions out, since the tooling matters
  less than the definitions themselves.
- **Tradeoffs:** More upfront engineering investment than patching queries;
  in exchange, the fix compounds instead of needing to be repeated.
- **Consequences:** All new dashboards/reports must go through the Metrics
  API; enforcement (lint rule) becomes a governance responsibility, not a
  one-time decision.

### ADR-002: User Taxonomy

- **Problem:** Guest, demo, founder, internal, and real-customer populations
  are indistinguishable in most queries, causing systematic metric
  contamination.
- **Decision:** A single `user_class` enum + `include_in_business_metrics`
  derived flag on `business_users`, computed once, referenced everywhere.
- **Alternatives considered:** Per-metric exclusion lists (status quo,
  proven to drift and be forgotten); a separate physical table per population
  (rejected as higher migration risk for demo users specifically — see
  DATABASE_MIGRATION_PLAN.md M7 discussion — flag-based exclusion chosen
  instead for the initial implementation).
- **Tradeoffs:** A single enum can't capture every future nuance (e.g.,
  enterprise sub-tiers) without extension — accepted, with governance's
  mandatory re-review trigger on taxonomy changes as the mitigation.
- **Consequences:** Every future population type must be explicitly added to
  the enum before it can be correctly excluded/included — an unmodeled
  population defaults to whatever the code happens to do, same risk class as
  today's demo-user bug, now at least contained to a single decision point.

### ADR-003: Revenue Source of Truth

- **Problem:** Local subscription/revenue storage (`SubscriptionSnapshot`)
  diverged from Stripe's actual state with no detection mechanism.
- **Decision:** Stripe is authoritative for all money; Postgres is a
  continuously-reconciled mirror, never an independent opinion.
- **Alternatives considered:** Treat Postgres as authoritative and Stripe as
  a downstream system — rejected; Stripe literally is the money movement, a
  local mirror can never be more correct than its source.
- **Tradeoffs:** Requires ongoing reconciliation infrastructure (Stripe API
  calls, nightly jobs) rather than trusting a purely local computation.
- **Consequences:** Any revenue number the dashboard shows is only as fresh
  as the last webhook/reconciliation cycle, not instantaneously live —
  accepted as the correct tradeoff for correctness over false immediacy.

### ADR-004: Dashboard Architecture

- **Problem:** The founder dashboard computes ~20 live aggregates per
  request with a 30-second per-process cache, causing both correctness bugs
  (unfiltered queries) and latent scaling risk (heavy joins on every hit).
- **Decision:** Per-card tiering (T0 live / T1 Redis-cached / T2 rollup / T3
  materialized view / T4 external), chosen per card based on its actual
  freshness requirement, not uniformly applied.
- **Alternatives considered:** Cache the entire dashboard response as one
  blob — rejected because it forces the freshest-required card (server
  health) to share a cache TTL with the least time-sensitive card (cohort
  funnel), which is wrong in both directions.
- **Tradeoffs:** More operational complexity (multiple cache tiers to reason
  about) than a single blanket cache.
- **Consequences:** Card-level ownership and tiering must be documented and
  kept current (`DASHBOARD_CARD_REFERENCE.md`) or the tiering rationale is
  lost over time.

### ADR-005: PostHog Ownership

- **Problem:** PostHog and Postgres both track overlapping funnel events with
  no declared authority, and PostHog's client SDK can be silently opted out
  by ad blockers.
- **Decision:** PostHog owns exploratory/UX product analytics only; Postgres
  (`business_conversion`/`fact_event`) is authoritative for anything
  revenue- or governance-adjacent.
- **Alternatives considered:** Make PostHog authoritative everywhere and
  drop the parallel Postgres event log — rejected, since PostHog's
  sampling/ad-block/identity-merge behavior makes it unsuitable as a system
  of record for numbers that must reconcile exactly.
- **Tradeoffs:** Some event-tracking duplication (server + PostHog) is
  intentional, not waste — it's the resilience mechanism.
- **Consequences:** Product teams must not cite PostHog numbers in
  finance/investor contexts; this must be enforced culturally, not just
  documented (see governance).

### ADR-006: Stripe Reconciliation

- **Problem:** No automated check exists to catch revenue/customer-count
  drift between Postgres and Stripe — every Phase 1 finding could recur
  silently.
- **Decision:** A nightly reconciliation job (plus real-time per-event
  assertions) is a **permanent operational requirement**, not a one-time
  migration verification step.
- **Alternatives considered:** Manual quarterly reconciliation (status quo
  pace, proven insufficient — it took an external audit to find these bugs);
  fully real-time reconciliation on every request — rejected as
  unnecessary load and Stripe rate-limit risk for aggregate-level checks.
- **Tradeoffs:** A nightly cadence means a drift can persist for up to 24
  hours before being caught — accepted, mitigated by event-level real-time
  checks for the highest-value individual-record cases.
- **Consequences:** Reconciliation job uptime/correctness itself becomes a
  monitored, on-call-owned system, not a fire-and-forget script.

### ADR-007: Metrics Governance

- **Problem:** No process exists for proposing, reviewing, or versioning a
  metric definition — anyone can change what "MRR" means by changing a query.
- **Decision:** An RFC-style process (definition + source + owner +
  validation rule required before shipping), metric versioning (never
  silently redefine a historical metric), and a quarterly audit cadence.
- **Alternatives considered:** No formal process, rely on code review alone
  — rejected, since code review catches "does this query run," not "does
  this query mean the same thing as the metric everyone already trusts."
- **Tradeoffs:** Slower to ship a brand-new metric than an unreviewed query
  change — accepted deliberately, since the entire program exists because an
  unreviewed query change is exactly how the MRR bug happened.
- **Consequences:** Governance overhead must stay proportional — trivial
  metrics shouldn't require the same ceremony as revenue metrics; the RFC
  template should scale its rigor to the metric's blast radius (a future
  refinement, not fully specified here).

### ADR-008: Subscription State Modeling (current-state vs. ledger)

- **Problem:** `SubscriptionSnapshot` conflated "audit history" and "current
  state" in one append-only table, causing the MRR double-count.
- **Decision:** Split into two explicit models: `business_subscriptions`
  (current-state, one row per subscription, upsert) and
  `business_subscription_history` (append-only ledger — reusing the existing
  `SubscriptionSnapshot` table's shape unchanged).
- **Alternatives considered:** Add a `is_latest` boolean flag to the existing
  table instead of a new table — rejected as more fragile (requires
  atomically un-flagging the previous "latest" row on every insert, a race
  condition risk); a separate table with a uniqueness constraint is
  structurally safer.
- **Tradeoffs:** Two tables to keep in sync (via the webhook's dual-write)
  instead of one — accepted, since the two have genuinely different
  correctness requirements (dedup vs. append-only completeness).
- **Consequences:** Every future subscription-state consumer must know which
  of the two tables answers their question — documented explicitly in
  METRICS.md/DATABASE_MIGRATION_PLAN.md to prevent the split itself becoming
  a new source of confusion.

### ADR-009: Guest Identity Model

- **Problem:** Guest sessions are keyed by a fresh UUID per request, making
  "unique guest users" and DAU/MAU structurally uncountable.
- **Decision:** Issue a persistent first-party `anonymous_id`, merged into
  the resulting account on signup — deferred to a later migration (M10)
  pending privacy review, not part of the initial 8-sprint critical path.
- **Alternatives considered:** Use PostHog's own anonymous `distinct_id` as
  the canonical guest identity — rejected as the canonical identity source,
  since it would make the canonical layer dependent on a third-party system's
  availability and identity-merge behavior; PostHog's ID is instead carried
  as a joinable property, not the primary key.
- **Tradeoffs:** A durable pre-signup identifier has real privacy/consent
  implications that must be resolved before shipping, which is why this is
  explicitly deferred rather than rushed into the initial sprints.
- **Consequences:** DAU/MAU/guest-counting integrity remains only partially
  fixed (demo/founder exclusion solved; guest-uniqueness not solved) until
  this ADR's decision is actually implemented — documented as a known,
  accepted limitation, not hidden.

### ADR-010: Cache Tier Strategy

- **Problem:** The dashboard's cache is a per-process in-memory variable,
  invisible and inconsistent the moment more than one API instance exists.
- **Decision:** Move to a shared Redis cache with per-card TTLs matched to
  each card's actual freshness requirement (METRICS.md cache tiers T0–T4).
- **Alternatives considered:** No caching at all, compute everything live —
  rejected on load/latency grounds for the heavier cohort/funnel queries;
  a single global TTL for the whole dashboard — rejected per ADR-004's
  reasoning.
- **Tradeoffs:** Adds a Redis dependency to the dashboard's read path (it
  already depends on Redis for Bull, so this is not a new infrastructure
  dependency, just a new usage of an existing one).
- **Consequences:** Cache invalidation on webhook-driven updates (e.g., MRR
  changing the instant a new subscription is created) must be explicitly
  wired, not assumed — a gap to close explicitly in Sprint 6, not an
  automatic side effect of moving to Redis.
