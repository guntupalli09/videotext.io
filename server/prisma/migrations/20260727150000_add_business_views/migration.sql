-- Analytics Sprint 4: additive-only migration.
-- Creates two SQL VIEWs, business_users and business_jobs -- the first two
-- canonical models per docs/analytics/ANALYTICS_ARCHITECTURE.md /
-- docs/analytics/DATABASE_MIGRATION_PLAN.md (M2/M3). A view has no storage
-- footprint and cannot corrupt or duplicate underlying data; it is a stored
-- query definition only. Does not alter, drop, or rename any existing
-- table, column, or index. Nothing in the application reads these views yet
-- (Sprint 4's own scope explicitly excludes wiring them into the dashboard
-- or any other consumer -- see docs/analytics/SPRINT_PLAN.md Sprint 4).
-- Rollback is a single DROP VIEW per view, with zero data-loss risk by
-- construction (see bottom of this file).

-- business_users: canonical identity view. Straight passthrough of "User"
-- plus the Sprint 2 taxonomy columns, explicit column list (not SELECT *)
-- so future ADD COLUMNs on "User" don't silently change this view's shape.
CREATE VIEW business_users AS
SELECT
  u.id,
  u.email,
  u.plan,
  u.role,
  u."stripeCustomerId",
  u."subscriptionId",
  u."subscriptionStatus",
  u."userClass",
  u."isFounder",
  u."isInternal",
  u."isDeveloper",
  u."isQa",
  u."isDemo",
  u."isBot",
  u."isDeleted",
  u."includeInBusinessMetrics",
  u."utmSource",
  u."firstReferrer",
  u."createdAt",
  u."updatedAt"
FROM "User" u;

-- business_jobs: canonical job view. LEFT JOINs to business_users so guest
-- jobs (Job.userId with no matching User row -- confirmed to exist,
-- Sprint 0 baseline: 641 such ids) are preserved and explicitly tagged
-- "isGuest", not silently dropped or silently included as if they were a
-- registered user's activity. "includeInBusinessMetrics" here means
-- "counts as customer usage" -- false for guests (no User row to vouch for
-- them) AND false for founder/internal/demo/etc (per business_users' own
-- flag), true only for genuine registered, non-internal users.
CREATE VIEW business_jobs AS
SELECT
  j.id,
  j."userId",
  j."toolType",
  j.status,
  j."fileSizeBytes",
  j."videoDurationSec",
  j."startedAt",
  j."completedAt",
  j."processingMs",
  j."failureReason",
  j."planAtRun",
  j."whisperCostMicros",
  j."totalAiCostMicros",
  j."createdAt",
  (bu.id IS NULL) AS "isGuest",
  bu."userClass" AS "userClass",
  (bu.id IS NOT NULL AND bu."includeInBusinessMetrics") AS "includeInBusinessMetrics"
FROM "Job" j
LEFT JOIN business_users bu ON bu.id = j."userId";

-- Rollback (not executed automatically -- kept here for the documented
-- rollback path; safe because nothing reads these views yet):
-- DROP VIEW IF EXISTS business_jobs;
-- DROP VIEW IF EXISTS business_users;
