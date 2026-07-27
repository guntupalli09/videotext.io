# DOCUMENTATION_PLAN.md — VideoText

Status: design/blueprint only.

| Doc area | Document(s) | Owner | Lives where | Update cadence |
|---|---|---|---|---|
| **Architecture** | `ANALYTICS_ARCHITECTURE.md` (Phase 2, already produced) | Analytics Engineering | Repo `docs/analytics/` | Reviewed every quarterly metric audit; updated on any layer change |
| **Metrics** | `METRICS.md`, `METRICS_DICTIONARY.md` (Phase 2) | Per-metric owner listed in the catalog itself | Repo `docs/analytics/` | Updated on every metric RFC (Data Governance process); reviewed quarterly |
| **Database** | New: `DATABASE_SCHEMA.md` documenting `business_*` models, keys, and the expand/contract history of each migration in DATABASE_MIGRATION_PLAN.md | Platform | Repo `docs/database/` | Updated with every migration PR |
| **Dashboard** | New: `DASHBOARD_CARD_REFERENCE.md` — one entry per card: source, refresh, cache tier, owner (derived from DASHBOARD_MIGRATION_PLAN.md, kept current post-migration) | Analytics Engineering | Repo `docs/analytics/` | Updated on any card's source/cache change |
| **Analytics (PostHog)** | `POSTHOG_STRATEGY.md` (this phase) | Growth/Product | Repo `docs/analytics/` | Reviewed whenever a new event type is proposed |
| **Governance** | `DATA_GOVERNANCE.md` (Phase 2) | Analytics Engineering (arbitration authority) | Repo `docs/analytics/` | Living document, updated as the RFC/versioning process itself evolves |
| **Runbooks** | New: `RUNBOOK_MRR_RECONCILIATION_ALERT.md`, `RUNBOOK_DASHBOARD_ROLLBACK.md`, `RUNBOOK_BACKFILL_EXECUTION.md` | Platform/on-call | Repo `docs/runbooks/` | Reviewed after every incident that touches them |
| **Operational playbooks** | New: `PLAYBOOK_NEW_METRIC_PROPOSAL.md` (the RFC template in practice), `PLAYBOOK_METRIC_RESTATEMENT.md` | Analytics Engineering | Repo `docs/analytics/` | Reviewed quarterly |
| **Incident response** | New: `INCIDENT_RESPONSE_DATA_QUALITY.md` — what to do when a Part-10 validation pages: triage steps, who to loop in per domain (Finance for revenue checks, Platform for job/infra checks), how to declare a restatement if the root cause turns out to be a past reporting error | Platform + Finance jointly | Repo `docs/runbooks/` | Reviewed after every paging incident |

## Documentation principles carried over from DATA_GOVERNANCE.md

- No metric ships without its dictionary entry (definition/formula/SQL/owner)
  existing first — documentation is a **shipping gate**, not a follow-up task.
- No dashboard card exists without an entry in `DASHBOARD_CARD_REFERENCE.md`
  stating its current source and cache tier — this is what makes future
  audits (like Phase 1) unnecessary busywork instead of essential archaeology.
- Every runbook is written to be executable by whoever is on-call, not just
  the engineer who wrote the underlying system — validated by having a
  different engineer dry-run each runbook once before it's considered
  complete.
