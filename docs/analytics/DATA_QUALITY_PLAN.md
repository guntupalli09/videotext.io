# DATA_QUALITY_PLAN.md — VideoText

Status: design/blueprint only. Every job below is read-only against
production data (it never mutates business data as a side effect of checking
it) and is itself subject to the same deployment discipline as any other
change (ship disabled → staging → enabled with log-only alerting → promoted to
paging severity once proven quiet).

| # | Validation | What it verifies | How | Cadence | Severity |
|---|---|---|---|---|---|
| 1 | Dashboard == Canonical | Every number rendered by the dashboard equals the corresponding `business_*`/Metrics API value at the moment of render | Contract test hitting the dashboard endpoint and the Metrics API in the same request window, diffing | CI (every deploy) + synthetic check every 15 min in production | Build-blocking (CI); page (prod synthetic failure) |
| 2 | Canonical == Stripe | MRR, ARR, revenue, customer count, subscription state, refunds | STRIPE_RECONCILIATION_PLAN.md (full detail) | Nightly + real-time per-event | Page (revenue/customer-count); log (other domains within tolerance) |
| 3 | Canonical == PostgreSQL (raw) | `business_users`/`business_jobs` view output matches a from-scratch raw-table computation using the same taxonomy rules | Automated diff query comparing view output to an independently-written raw query | Nightly | Log; page if the two diverge (means the view definition itself drifted from intent) |
| 4 | No duplicate subscriptions | Exactly one `business_subscriptions` row per `stripe_subscription_id` | DB uniqueness constraint (structural) + nightly `GROUP BY ... HAVING COUNT(*) > 1` sweep | Real-time (constraint) + nightly (defense-in-depth) | Page |
| 5 | No duplicate users | No two non-guest, non-demo `business_users` rows share the same verified email (case-insensitive) | Nightly dedup-candidate report, **human-reviewed, never auto-merged** | Nightly | Log (informational, human-adjudicated) |
| 6 | No orphaned jobs | Every `business_jobs.user_id` resolves to an existing `business_users` row (or is explicitly tagged `is_guest`/`anonymous_id`-only by design, not a broken foreign key) | Nightly left-anti-join `business_jobs` → `business_users` excluding intentional guest rows | Nightly | Log; page if the orphan count spikes suddenly (signals a write-path or deletion-cascade bug) |
| 7 | No impossible revenue | Every `business_revenue` line matches a currently- or previously-configured Stripe price; rejects negative amounts, amounts without a matching Stripe invoice ID, amounts timestamped in the future | Ingestion-time validation (webhook handler) + nightly full-table sweep | Real-time + nightly | Page (both) |
| 8 | No impossible MRR | `business_subscriptions.normalized_monthly_cents` falls within the bounds of currently-configured Stripe prices (catches a misconfigured/stale price ID silently producing a wrong number) | Nightly sweep against the live Stripe price catalog | Nightly | Page |
| 9 | No paid customer without Stripe | Every `business_users` row with `user_class='paying_customer'` has a non-null `stripe_subscription_id` with a Stripe-confirmed active/trialing/past_due status | Nightly cross-reference against live Stripe | Nightly | Page — this is the structural guard against a future manual "grant Pro" bypass or a recurrence of the demo-account failure class |
| 10 | No dashboard drift | The dashboard's served value and its own shadow-computed canonical value stay within tolerance continuously, not just during a migration's burn-in window | Same mechanism as the Sprint 5 shadow-read, kept running permanently as a background check even after cutover (not removed once "done") | Every dashboard request (sampled, not every single one, to bound overhead) | Log; page on sustained (multi-hour) drift |
| 11 | Job-count reconciliation | `business_jobs` completed-job count matches Bull/Redis's own completed-job counters for the same window | Nightly diff job (Sprint 0's baseline job, promoted to a permanent check) | Nightly | Log below tolerance; page above (e.g., >0.5% drift) |
| 12 | AI cost reconciliation | Summed `business_cost`/`business_jobs` AI cost vs. actual vendor invoice | Monthly manual-triggered job (vendor invoices aren't always same-day available) | Monthly | Log if within estimation-error band; page if wildly divergent |
| 13 | Timezone/day-boundary integrity | Every rollup row's date bucket is UTC-midnight-aligned; the dashboard's date-formatting utility always passes an explicit `timeZone` | CI unit test on the shared formatting utility + nightly data check for non-zero UTC time components in `DailyMetrics.date` | CI + nightly | Build-blocking (CI); log (nightly) |
| 14 | Guest/demo/internal exclusion integrity | `business_users.user_class NOT IN ('guest','demo','internal','developer','qa','bot','founder')` for every row counted in `business_subscriptions`/`business_revenue`/paid-customer metrics | Assertion query run as part of check #9 | Nightly | Page |

## Operational model for these checks

- Every check has an **owner** (from METRICS.md/DATA_GOVERNANCE.md's per-metric
  owner) accountable for triaging its failures — a validation job with no
  owner is worse than no validation job, because it trains the team to ignore
  alerts.
- Every check's **first two weeks in production run in log-only mode**
  regardless of eventual severity, to establish a noise baseline before it can
  page anyone — this prevents the exact failure mode of a new alert being
  muted by an exhausted on-call rotation on day one.
- All check results feed a single **Data Quality dashboard** (itself a
  founder-dashboard card, per DASHBOARD_MIGRATION_PLAN.md) so "is our data
  trustworthy right now" is answerable in one glance, not by mentally
  aggregating a dozen separate cron logs.
