-- Analytics Sprint 2: additive-only migration.
-- Adds 9 nullable-or-defaulted columns and 2 indexes to the existing "User"
-- table. Does not alter, drop, or rename any existing column, table, or
-- index. Every ADD COLUMN below has a constant DEFAULT, which Postgres
-- applies as a metadata-only operation (no table rewrite, no row-by-row
-- write, no meaningful lock duration) -- existing rows are backfilled to
-- these defaults automatically as part of this DDL. A small, separate,
-- explicit backfill (server/src/scripts/backfill-user-taxonomy.ts) updates
-- only the handful of known non-default rows (demo/founder/test accounts)
-- after this migration runs.
--
-- See docs/analytics/USER_TAXONOMY.md and docs/analytics/DATABASE_MIGRATION_PLAN.md (M1).

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "userClass" TEXT NOT NULL DEFAULT 'registered',
  ADD COLUMN "isFounder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDeveloper" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isQa" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "includeInBusinessMetrics" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "User_userClass_idx" ON "User"("userClass");

-- CreateIndex
CREATE INDEX "User_includeInBusinessMetrics_idx" ON "User"("includeInBusinessMetrics");

-- Rollback (not executed by Prisma automatically -- kept here for the
-- documented rollback path; run manually only if this migration needs to be
-- reverted; safe because nothing reads these columns yet):
-- DROP INDEX IF EXISTS "User_includeInBusinessMetrics_idx";
-- DROP INDEX IF EXISTS "User_userClass_idx";
-- ALTER TABLE "User"
--   DROP COLUMN IF EXISTS "userClass",
--   DROP COLUMN IF EXISTS "isFounder",
--   DROP COLUMN IF EXISTS "isInternal",
--   DROP COLUMN IF EXISTS "isDeveloper",
--   DROP COLUMN IF EXISTS "isQa",
--   DROP COLUMN IF EXISTS "isDemo",
--   DROP COLUMN IF EXISTS "isBot",
--   DROP COLUMN IF EXISTS "isDeleted",
--   DROP COLUMN IF EXISTS "includeInBusinessMetrics";
