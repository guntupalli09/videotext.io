# DATA_GOVERNANCE.md — VideoText Metrics Governance & Validation

Status: design only. Covers Part 8 (Governance) and Part 9 (Validation) — placed
together because validation rules are the enforcement mechanism for governance
policy, not a separate concern.

## Part 8 — Governance Model

### 1. How new metrics are added

No metric goes live without four artifacts, submitted together as one
version-controlled change (a `metrics/` directory in the repo, reviewed like
code):

1. **Definition** — name, business definition, formula, in the exact shape used
   in METRICS.md.
2. **Source declaration** — which `business_*` model(s) it reads, which
   `user_class` filters apply, timezone, refresh cadence, cache tier.
3. **Owner** — a named team (Finance, Growth, Product, Platform) accountable for
   the metric's correctness and for approving future changes to it.
4. **Validation rule** — at least one automated check (Part 9) that would catch
   the metric being silently wrong (e.g., a reconciliation against an external
   source, a sanity bound, or a duplicate-row check).

A metric proposal is an RFC-style PR against `METRICS.md`/`METRICS_DICTIONARY.md`,
reviewed by: the Analytics Engineering function (arbitration authority — do the
mechanics hold up, does it reuse existing `business_*` models rather than
inventing a parallel table) **and** the domain owner (Finance signs off on
anything revenue-adjacent, Growth on anything funnel-adjacent, Platform on
anything job/cost-adjacent). No single team can unilaterally ship a metric that
another team will be asked to defend in a board meeting.

### 2. How metrics are reviewed

- **Quarterly metric audit**: re-run a Phase-1-style integrity pass (definitions
  vs. actual queries vs. actual filters) across the full catalog. This is the
  scheduled version of the ad hoc audit that produced this redesign — it should
  never again take an external prompt to discover a demo account inflating a
  conversion rate.
- **Mandatory re-review triggers** (not calendar-based, event-based): any change
  to the `user_class` taxonomy, any new subscription plan/price, any new tool
  type, any schema migration touching `business_*` tables. Each of these
  invalidates assumptions baked into existing metric definitions and must
  trigger a review of every metric that touches the changed surface.

### 3. How breaking changes are handled

**A metric's historical meaning is never mutated in place.** If the definition of
"Activated User" changes (e.g., the 24h window becomes 48h), that is not an edit
to `activation_rate` — it is the introduction of `activation_rate_v2`, computed
and stored alongside `activation_rate_v1`. Dashboards, reports, and any Claude
analysis session continue reading whichever version they were built against
until an explicit, deliberate migration:

- Every versioned metric carries `metric_name`, `metric_version`, `computed_at`.
- A migration is its own reviewed change: update the dashboard/report to read
  `_v2`, note the version bump in a visible changelog, and — critically — **never
  silently recompute historical `_v1` rows using `_v2` logic**. If leadership
  wants a "what would historical activation have looked like under the new
  definition" comparison, that is an explicit, separately-labeled restatement,
  not a retroactive overwrite.

### 4. How historical metrics are versioned

- Every row in a rollup/mart table (`DailyMetrics`, `MonthlyMetrics`, and any
  future mart) carries `metric_version` and `computed_at`.
- **Restatements** (correcting a past period because of a bug fix, a deleted
  test account, or a data-quality issue found later) are never silent
  `UPDATE`s. They go through a `metrics_restatement_log`: `metric_name`,
  `period`, `old_value`, `new_value`, `reason`, `approved_by`, `restated_at`.
  Any dashboard displaying a restated historical value must visibly flag it
  ("restated on 2026-08-01 — see restatement log") rather than quietly showing a
  different number than what was reported to stakeholders at the time.
- This directly fixes the Phase 1 finding that user deletions silently left
  stale historical `DailyMetrics` rows with no record that anything had changed.

### 5. How dashboards stay consistent

- **Single sanctioned data path**: the Metrics API (`GET /api/metrics/:name`,
  ANALYTICS_ARCHITECTURE.md §3) is the only way any dashboard, admin tool, or
  external report is allowed to retrieve a metric value that has a canonical
  definition. Direct `$queryRaw`/Prisma access to `business_*` tables from a
  route handler outside the analytics-layer package is a code-review-blocking
  violation, enforced by a repo lint rule scanning for raw queries against
  `business_users`, `business_subscriptions`, `business_revenue`, `business_jobs`
  outside the designated analytics module.
- **One dashboard, one cache key per card** — no two panels on the same
  dashboard may compute the "same" number via two different queries (this is
  exactly how Phase 1 found `jobsByToolType` and `topUsersByJobCount`
  silently disagreeing on the same page).

---

## Part 9 — Automated Validation

Every rule below: **what it verifies → how → cadence → severity → owner.**
"Severity: page" means an on-call/finance alert fires immediately; "severity:
log" means it's surfaced in a daily report for human review, not urgent.

1. **Dashboard MRR == Stripe MRR**
   *Verifies:* the deduplicated `business_subscriptions` MRR matches Stripe's own
   live subscription list (sum of active subscription prices, normalized the
   same way).
   *How:* nightly job pulls Stripe's subscription list directly (T4), computes
   the same normalization independently, diffs against `business_subscriptions`.
   *Cadence:* nightly + on-demand via the dashboard's "Verify against Stripe"
   button.
   *Severity:* page if delta > 1% or > $50 (whichever is larger); this is
   revenue-integrity, treat it like a payments incident.
   *Owner:* Finance/Platform on-call.

2. **Dashboard Paid Customers == Stripe Active Customers**
   *Verifies:* `COUNT(business_users WHERE user_class='paying_customer')` equals
   `stripe.subscriptions.list(status='active').length` (deduplicated by customer).
   *How:* same nightly job as #1.
   *Cadence:* nightly.
   *Severity:* page on any nonzero delta (customer counts are low-cardinality
   enough that "close" is not an acceptable outcome — any gap means either a
   sync bug or an account bypassing Stripe entirely, both urgent).
   *Owner:* Finance/Platform.

3. **Dashboard Users == Canonical Users**
   *Verifies:* every dashboard's reported user total equals
   `SELECT COUNT(*) FROM business_users WHERE include_in_business_metrics`.
   *How:* CI-time contract test on the Metrics API response, plus a lint rule
   flagging any direct `prisma.user.count()`/raw `User` table query outside the
   analytics layer.
   *Cadence:* every deploy (CI) + nightly runtime check.
   *Severity:* build-blocking in CI; page if detected in production runtime.
   *Owner:* Analytics Engineering.

4. **No duplicate subscriptions**
   *Verifies:* exactly one `business_subscriptions` row per `stripe_subscription_id`.
   *How:* a database uniqueness constraint (structural prevention) **plus** a
   nightly `GROUP BY stripe_subscription_id HAVING COUNT(*) > 1` sweep as a
   defense-in-depth check in case the constraint is ever bypassed by a migration.
   *Cadence:* real-time (constraint) + nightly (sweep).
   *Severity:* page (this is the exact class of bug that caused the Phase 1 MRR
   multiplication).
   *Owner:* Platform.

5. **No duplicate customers**
   *Verifies:* no two non-guest, non-demo `business_users` rows share the same
   verified email (case-insensitive).
   *How:* nightly dedup-candidate report — **flagged for human review, never
   auto-merged**, since a shared household/company email can be legitimate.
   *Cadence:* nightly.
   *Severity:* log (informational, human-adjudicated).
   *Owner:* Growth/Support.

6. **No impossible revenue**
   *Verifies:* every `business_revenue` line item's amount matches a currently-
   or previously-configured Stripe price (catches stale/misconfigured price IDs
   silently defaulting to $0 or an unrecognized value — the exact failure mode
   already logged loudly in the existing `stripeWebhook.ts` handler, now made
   into a first-class automated check instead of a log line someone has to
   notice); rejects negative amounts, amounts without a matching Stripe invoice
   ID, and amounts timestamped in the future.
   *How:* validation at ingestion time (webhook handler) + nightly full-table
   sweep for anything that slipped through.
   *Cadence:* real-time + nightly.
   *Severity:* page (real-time), page (nightly sweep finds any).
   *Owner:* Finance/Platform.

7. **No active subscriber without a Stripe subscription**
   *Verifies:* every `business_users` row with `user_class='paying_customer'`
   has a non-null `stripe_subscription_id` with Stripe-confirmed
   `active`/`trialing`/`past_due` status.
   *How:* nightly cross-reference against live Stripe data.
   *Cadence:* nightly.
   *Severity:* page — this is the guard against a *future* manual "grant Pro"
   admin action (or a bug) creating a paid-looking account with no revenue
   behind it, the same failure class as today's demo-account contamination.
   *Owner:* Finance/Platform.

8. **Guest/demo/internal never appear in revenue or paid-customer counts**
   *Verifies:* `business_users.user_class NOT IN ('guest','demo','internal',
   'developer','qa','bot','founder')` for every row counted in
   `business_subscriptions`/`business_revenue`/paid-customer metrics.
   *How:* a `CHECK`-style assertion query run as part of #2's nightly job.
   *Cadence:* nightly.
   *Severity:* page.
   *Owner:* Analytics Engineering.

9. **Job-count reconciliation (Postgres vs. Bull/Redis)**
   *Verifies:* `business_jobs` completed-job count matches Bull/Redis's own
   completed-job counters for the same window, within an agreed tolerance.
   *How:* nightly diff job; addresses the Phase 1 finding that job-analytics
   writes are non-blocking and can silently fail.
   *Cadence:* nightly.
   *Severity:* log below tolerance, page above (e.g., >0.5% drift).
   *Owner:* Platform.

10. **AI cost reconciliation (estimate vs. vendor invoice)**
    *Verifies:* summed `business_jobs` AI cost for the month vs. the actual
    OpenAI/Deepgram invoice.
    *How:* monthly manual-triggered job (vendor invoices aren't always available
    same-day).
    *Cadence:* monthly.
    *Severity:* log if within expected estimation error band, page if wildly
    divergent (signals a pricing-model or usage-tracking bug).
    *Owner:* Finance/Platform.

11. **Timezone / day-boundary integrity**
    *Verifies:* every rollup row's date bucket is UTC-midnight-aligned; the
    dashboard's date-formatting utility always passes an explicit `timeZone`.
    *How:* a snapshot/unit test on the shared formatting utility (one function,
    used everywhere, tested once) + a nightly check that no `DailyMetrics.date`
    value has a non-zero UTC time component.
    *Cadence:* CI (unit test) + nightly (data check).
    *Severity:* build-blocking (CI) / log (nightly).
    *Owner:* Analytics Engineering.
