# EXECUTIVE_SUMMARY.md — VideoText Analytics Architecture

Status: design only, nothing implemented, no code or repository changes.

## What this is

A target-state analytics architecture that makes every KPI at VideoText have
exactly one definition, one source of truth, and one code path — so a founder
dashboard card, a Stripe report, a raw SQL query, and an LLM-assisted analysis
session all produce the same number for the same question, by construction
rather than by coincidence.

This directly answers what Phase 1's audit surfaced: today, the same conceptual
metric (e.g., "MRR," "paid users," "active users") is computed differently in
different places, with no shared identity model to say which accounts should
even count.

## The core structural decisions

1. **One user taxonomy** (`USER_TAXONOMY.md`) — 16 explicit populations (visitor
   through suspended), each tagged with exactly which metric families it may and
   may not contribute to, collapsed into a single `include_in_business_metrics`
   flag every metric is required to use. This is the single fix that eliminates
   demo-account and internal-account contamination everywhere at once, instead
   of requiring a bespoke `WHERE` clause in every query.
2. **One canonical layer** (`ANALYTICS_ARCHITECTURE.md`) — raw → staging →
   `business_*` dimension/fact models → marts/rollups → cached serving API.
   Stripe is authoritative for money, Postgres is authoritative for identity and
   product usage, PostHog is authoritative for exploratory product analytics and
   explicitly *not* authoritative for anything revenue-adjacent.
3. **One metrics catalog** (`METRICS.md` / `METRICS_DICTIONARY.md`) — 33 KPIs,
   each with a declared source, filter set, refresh cadence, cache tier, owner,
   and confidence level, so "how fresh is this number" and "who do I ask if it
   looks wrong" are never guesswork.
4. **One governance model** (`DATA_GOVERNANCE.md`) — new metrics require a
   definition, a source declaration, an owner, and an automated validation rule
   before they ship; breaking changes are versioned, never silently redefined;
   11 automated validation rules continuously prove Postgres, Stripe, and the
   dashboard agree, closing the exact gaps Phase 1 found by hand.
5. **A sequenced roadmap** (`IMPLEMENTATION_ROADMAP.md`) — fix the two or three
   things that are actively wrong right now (days of effort), then build the
   permanent foundation (quarters), with governance adopted immediately and in
   parallel rather than deferred to "after the migration."

## Final question

> If VideoText followed this architecture, would every future report,
> dashboard, SQL query, Stripe report, and Claude analysis reconcile
> automatically? If not, what remaining risks exist?

**Yes, for anything that goes through the canonical layer — by construction, not
by discipline.** Once a metric is defined once in `business_*` models, served
through the single Metrics API, and continuously checked by the Part 9
validation suite, there is structurally no way for two consumers of that metric
to disagree, because there is only one place the number is computed. That is the
entire point of the design, and it is a mechanical guarantee, not a hope.

It does **not** eliminate every risk. Five categories remain, deliberately not
papered over:

1. **Bypass risk.** Anyone with database access can still write ad hoc SQL
   directly against raw tables instead of the canonical layer. Governance and a
   lint rule reduce this sharply but cannot make it physically impossible —
   this is a process/culture risk, not a solvable engineering problem.
2. **PostHog will never bit-for-bit reconcile with Postgres, by design.**
   PostHog measures anonymous browser sessions with probabilistic identity
   merge and is subject to ad-block opt-outs; Postgres measures canonical,
   deterministic identities. The architecture's job is to make sure no one
   *mistakes* one for the other (hence the explicitly-labeled PostHog panel and
   the rule that revenue-adjacent numbers never come from PostHog) — it
   deliberately does not force these two systems to agree, because forcing
   agreement between a sampled/probabilistic system and a deterministic one
   would just hide the sampling error, not remove it.
3. **Eventual-consistency windows are real and intentional.** Live/T0 cards
   (server health) and cached T1/rollup T2/materialized T3 cards can
   legitimately disagree for seconds to hours by design — the validation suite
   is tuned to catch *sustained* drift (a bug), not momentary staleness (the
   architecture working as intended).
4. **New, unmodeled populations will silently misclassify until someone adds
   them to the taxonomy.** A future enterprise SSO tier, a partner-API
   integration, or any new user shape not yet in the `user_class` enum will
   default into whatever bucket the code happens to fall through to — this is
   exactly the same failure mode as today's demo-account bug, and the mitigation
   is the governance process (mandatory re-review on taxonomy-relevant schema
   changes), not a permanent guarantee that it can never happen again.
5. **Multi-currency and cost-allocation methodology are open design questions,
   not yet solved here.** MRR/ARR normalization assumes single-currency
   reporting until an FX model is designed; gross margin depends on an infra
   cost-allocation methodology that must be chosen, documented, and versioned —
   until both exist, those two specific numbers carry more judgment than the
   rest of the catalog, and every report using them should say so explicitly
   (this is itself an application of the architecture's own principle: an
   honestly-labeled Medium-confidence number is safer than a falsely-precise
   one).

In short: the architecture makes internal consistency a structural property of
the system rather than a matter of vigilance — but it cannot make an incomplete
taxonomy complete in advance, cannot force two fundamentally different
measurement systems (deterministic ledger vs. probabilistic session analytics)
to produce identical numbers, and cannot substitute for the governance process
actually being followed by the humans who can still, if they choose to, write a
query that bypasses it.
