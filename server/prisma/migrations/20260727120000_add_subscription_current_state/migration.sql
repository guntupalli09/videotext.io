-- Analytics Sprint 1 (revised): additive-only migration.
-- Creates a new, empty table. Does not alter, drop, or rename any existing
-- table, column, or index. Nothing reads or writes this table until it is
-- explicitly wired into application code behind a feature flag (not yet
-- done as of this migration). Safe to roll back with a single DROP TABLE
-- (see bottom of this file, commented out) since nothing depends on it.
--
-- See docs/analytics/DATABASE_MIGRATION_PLAN.md (M4) for the design.

-- CreateTable
CREATE TABLE "SubscriptionCurrentState" (
    "stripeSubscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "normalizedMonthlyCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "billingInterval" TEXT,
    "intervalCount" INTEGER,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionCurrentState_pkey" PRIMARY KEY ("stripeSubscriptionId")
);

-- CreateIndex
CREATE INDEX "SubscriptionCurrentState_userId_idx" ON "SubscriptionCurrentState"("userId");

-- CreateIndex
CREATE INDEX "SubscriptionCurrentState_status_idx" ON "SubscriptionCurrentState"("status");

-- Rollback (not executed by Prisma automatically — kept here for the
-- documented rollback path; run manually only if this migration needs to be
-- reverted):
-- DROP TABLE IF EXISTS "SubscriptionCurrentState";
