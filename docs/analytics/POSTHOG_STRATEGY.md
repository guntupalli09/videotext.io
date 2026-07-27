# POSTHOG_STRATEGY.md — VideoText

Status: design/blueprint only.

## The future role of PostHog

PostHog is **product/UX exploratory analytics** — session-level behavior,
feature-flag experimentation, ad hoc funnel and retention exploration for
product managers. It is explicitly **not** a system of record for anything
that appears in a board deck, a Stripe reconciliation, or a canonical business
metric. This is not a demotion of PostHog's value — it is putting it in the
role it's actually built for, distinct from the role (deterministic financial
and identity truth) it was never designed to fill.

## What belongs in PostHog

- Session replay and heatmaps.
- Feature-flag/experiment assignment and results.
- Exploratory funnel/retention charts for product decisions where being
  approximately right, quickly, matters more than being exactly reconcilable
  (e.g., "which onboarding variant do users click through faster").
- UI-interaction events with no server-side equivalent and no revenue
  implication: navigation clicks, tool-selection clicks, format/option
  toggles, "samples module" attribution — the ~40 client-only entries already
  in `AnalyticsEvent` that describe pure UX behavior.

## What should never belong in PostHog (i.e., never be the source of truth for)

- MRR, ARR, revenue, refunds, any dollar figure.
- Paying-customer counts, plan distribution, churn.
- Canonical Active Users / DAU / MAU used in investor or governance reporting.
- Anything that must survive an ad-blocker, a sampled retention window, or a
  probabilistic identity merge without anyone noticing it changed.

## Events that remain client-side (PostHog only, no server mirror needed)

Pure UI interaction with no financial or funnel-gating significance:
`nav_cta_clicked`, `tool_nav_clicked`, `format_changed`, `language_selected`,
`tool_option_changed`, `samples_module_clicked`, `subtitle_editor_opened`,
`result_page_time_spent`. These describe *how* users interact with an already-
tracked action, not *whether* a business-relevant action occurred — losing a
fraction of these to ad-block opt-out is an acceptable, low-stakes trade-off.

## Events that should move to server-side-authoritative (with PostHog as an
## optional, clearly-secondary mirror)

Anything currently tracked client-side that also gates a funnel stage or
touches money: `signup_started`/`signup_completed`, `otp_requested`/
`otp_verified`/`otp_failed`, `login_completed`, `checkout_started`,
`plan_upgraded`, `payment_completed`. Most of these already have a
server-side equivalent (`utils/analytics.ts`, `funnelEvents.ts`) — the
strategic decision is to make the **server-side event the one that feeds
`business_conversion`**, and treat any client-side PostHog capture of the same
moment as a nice-to-have UX-timing signal, never a funnel-stage source. Job
lifecycle events (`job_started`, `job_completed`, `processing_completed`)
should be emitted to PostHog for exploratory cohort work but sourced from the
canonical `business_jobs` model, not double-tracked as independently
meaningful.

## How anonymous users should be handled

Every client request should carry the same first-party `anonymous_id` used by
the canonical guest-identity model (USER_TAXONOMY.md §4) as a **custom
property** on PostHog's own `distinct_id`/event payload. This does not make
PostHog authoritative for guest counting — it makes PostHog **joinable**
against the canonical model for research questions ("of the guests who did X
in PostHog, how many later converted according to Postgres"), without ever
requiring the two systems' guest counts to match by default.

## How ad-blocked sessions should be treated

Keep the existing opt-out behavior (`probeAndOptOutIfBlocked()`) exactly as it
is — respecting an ad-blocker's intent is correct product behavior, not a bug
to engineer around. What changes is the **documentation and consumption**
contract: every PostHog-sourced dashboard panel must carry a visible label
("Product analytics — undercounts ad-blocked/privacy-tool sessions") so no one
downstream mistakes a PostHog funnel count for a complete one. The
architecture's actual fix for ad-block-induced gaps is structural, not
PostHog-side: **any number that must be complete and defensible is captured
server-side** (Sprint 8's `fact_event` fix), so a blocked client SDK never
creates a hole in a number anyone is accountable for.

## Summary decision table

| Question | Answer |
|---|---|
| Which metrics belong in PostHog? | UX/session-level exploratory analytics, experiments, feature flags |
| Which should never belong there? | Revenue, MRR, paying-customer counts, canonical DAU/MAU, churn |
| Which events remain client-only? | Pure UI-interaction events with no funnel/revenue significance |
| Which events move server-authoritative? | Auth funnel, checkout/payment funnel, job lifecycle (PostHog keeps a secondary mirror for exploration only) |
| How are anonymous users handled? | Shared `anonymous_id` as a joinable custom property, not a shared identity system |
| How are ad-blocked sessions treated? | Left alone product-wise (respect the block); the response is a documented undercount label plus a server-side backstop for anything that must be complete |
