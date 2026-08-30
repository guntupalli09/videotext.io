-- Zapier private-beta readiness: additive-only migration.
--
-- 1. Adds a new ApiKey table (database-backed external API keys). Does not
--    touch the existing env-var-only apiKeyAuth mechanism, which remains
--    supported for backward compatibility (see server/src/utils/apiKey.ts).
-- 2. Adds four nullable-or-defaulted columns to the existing "Job" table:
--    jobToken, resultFilename, source (default 'web'), apiKeyId. Every
--    ADD COLUMN below either has a constant DEFAULT or is nullable, so
--    Postgres applies this as a metadata-only operation -- no table rewrite,
--    no row-by-row write, no meaningful lock duration. All existing Job rows
--    are valid immediately: source defaults to 'web' (correct, since every
--    pre-existing job came from the first-party web app), and the new
--    nullable columns simply read as NULL for old rows.
--
-- Nothing reads these columns for quota, entitlement, priority, or
-- transcription behavior -- see the column comments in schema.prisma.

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "clientType" TEXT NOT NULL DEFAULT 'generic',
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "ApiKey_userId_revokedAt_idx" ON "ApiKey"("userId", "revokedAt");

-- AlterTable
ALTER TABLE "Job"
  ADD COLUMN "jobToken" TEXT,
  ADD COLUMN "resultFilename" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'web',
  ADD COLUMN "apiKeyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Job_jobToken_key" ON "Job"("jobToken");

-- CreateIndex
CREATE INDEX "Job_resultFilename_idx" ON "Job"("resultFilename");

-- CreateIndex
CREATE INDEX "Job_source_createdAt_idx" ON "Job"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Job_userId_status_completedAt_idx" ON "Job"("userId", "status", "completedAt");

-- Rollback (not executed by Prisma automatically -- documented rollback path only):
-- DROP INDEX IF EXISTS "Job_userId_status_completedAt_idx";
-- DROP INDEX IF EXISTS "Job_source_createdAt_idx";
-- DROP INDEX IF EXISTS "Job_resultFilename_idx";
-- DROP INDEX IF EXISTS "Job_jobToken_key";
-- ALTER TABLE "Job"
--   DROP COLUMN IF EXISTS "apiKeyId",
--   DROP COLUMN IF EXISTS "source",
--   DROP COLUMN IF EXISTS "resultFilename",
--   DROP COLUMN IF EXISTS "jobToken";
-- DROP TABLE IF EXISTS "ApiKey";
