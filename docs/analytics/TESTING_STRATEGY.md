# TESTING_STRATEGY.md — VideoText Analytics Migration

Status: design/blueprint only.

| Category | Scope | Example for this project | Where it runs |
|---|---|---|---|
| **Unit tests** | Pure functions: taxonomy classification logic, MRR normalization (`stripeMrr.ts`-equivalent for the canonical layer), tolerance-threshold comparators used by validation jobs | "Given a `User` row with email `demo-user-007@...`, `classifyUser()` returns `user_class='demo'`, `include_in_business_metrics=false`" | CI, every commit |
| **Integration tests** | A route/job talking to a real (test) Postgres + mocked Stripe/PostHog | "`POST /api/stripe/webhook` with a synthetic `invoice.payment_succeeded` payload results in exactly one `business_subscriptions` row, not a new row per call" | CI, every PR, against an ephemeral test database |
| **Migration tests** | Every migration's up **and down** path | Run each migration from DATABASE_MIGRATION_PLAN.md against a snapshot of the production schema (anonymized/staging copy) in CI; assert the down-migration returns the schema to an identical state | CI, on every migration-file change |
| **Backfill tests** | The taxonomy backfill script and the `business_subscriptions` Stripe-derived backfill | Run against a seeded dataset containing known demo/founder/guest/real-customer rows; assert each is classified correctly; run in `--dry-run` first (mirrors the existing `delete-test-users.ts --dry-run` convention already used in this codebase) | Staging, before every backfill run in production |
| **Regression tests** | Confirm a fixed issue (from the Phase 1 register) never recurs | "Given 6 renewal invoices for the same `stripe_subscription_id`, canonical MRR reflects the price once, not 6×" — this test *is* the permanent proof that Issue #1 stays fixed | CI, permanent, never removed |
| **Analytics validation tests** | The Part-10 data-quality jobs' own correctness | Feed a validation job a synthetic dataset with a known-injected defect (e.g., a duplicate subscription) and assert it's flagged; feed it a clean dataset and assert zero false positives | CI + staging, on every validation-job change |
| **Dashboard snapshot tests** | Golden-file comparison of dashboard JSON response shape before/after each cutover step | Capture the dashboard endpoint's response shape (not values, shape) before Sprint 6 and assert every field the frontend depends on still exists post-cutover, preventing a silent breaking change to the frontend contract | CI, on every dashboard-endpoint change |
| **End-to-end tests** | Full user journey through a system that now has canonical metrics behind it | "A test user signs up, uploads a file, completes a job, subscribes via Stripe test mode → appears correctly as `registered`→`activated`→`paying_customer` in `business_users`, and the dashboard reflects it within the expected refresh window" | Staging, nightly + pre-release |
| **Load tests** | Dashboard endpoint and reconciliation jobs under realistic concurrency | Simulate N concurrent admin dashboard requests to confirm the shared Redis cache (Sprint 6) prevents the query-fan-out regression a naive cutover could introduce; simulate a large subscription/job table to confirm nightly reconciliation completes within its off-peak window | Staging, before each major cutover (Sprints 5–7) |
| **Chaos testing** | Partial-failure resilience of the migration itself | Kill the Postgres connection mid-`recomputeMetrics` run and verify the rollup table is left in its last-good state, not partially written; kill Redis mid-dashboard-request and verify the endpoint falls back gracefully rather than 500ing; simulate a Stripe API timeout during reconciliation and verify the job retries/backs off rather than false-alerting | Staging, scheduled game-days ahead of Sprints 3 and 6 specifically (the two sprints with the highest external-dependency and user-facing risk) |

## Testing gates per sprint (tie-back to SPRINT_PLAN.md)

- **Sprint 0–2**: unit + backfill tests only (nothing user-facing yet).
- **Sprint 3**: integration tests against mocked Stripe + a staged known-bad
  scenario proving the alert fires (see SPRINT_PLAN.md Sprint 3 validation).
- **Sprint 4**: migration tests (view creation/drop) + regression test for
  Issue #1 first written here, even before the schema-level fix (M4) lands —
  it should fail against the *old* behavior and pass once M4 is live, proving
  the test itself is meaningful.
- **Sprint 5**: dashboard snapshot tests (shape must not change while values
  are still shadow-only).
- **Sprint 6**: load tests (cache behavior under concurrency) + E2E tests
  (full signup→paying-customer journey reflected correctly) + chaos game-day
  before the MRR card specifically cuts over.
- **Sprint 7**: migration tests for the rollup-cron change + regression tests
  proving old and new recompute logic agree for historical periods.
- **Sprint 8**: integration tests for the `fact_event`/funnel fix, comparing
  pre- and post-fix event capture for a synthetic pre-signup guest journey.
