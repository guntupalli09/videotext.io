-- Analytics Sprint 3: additive-only migration.
-- Creates a new, empty table for reconciliation-run history. Does not alter,
-- drop, or rename any existing table, column, or index. Safe to roll back
-- with a single DROP TABLE (see bottom of file, commented out).
--
-- See docs/analytics/STRIPE_RECONCILIATION_PLAN.md.

-- CreateTable
CREATE TABLE "MrrReconciliationRun" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "writePathEnabled" BOOLEAN NOT NULL,
    "postgresMrrCents" INTEGER NOT NULL,
    "stripeMrrCents" INTEGER NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "deltaPct" DOUBLE PRECISION,
    "postgresActiveCount" INTEGER NOT NULL,
    "stripeActiveCount" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrrReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MrrReconciliationRun_runAt_idx" ON "MrrReconciliationRun"("runAt");

-- CreateIndex
CREATE INDEX "MrrReconciliationRun_severity_idx" ON "MrrReconciliationRun"("severity");

-- Rollback (not executed automatically -- kept here for the documented
-- rollback path; safe because nothing else depends on this table existing):
-- DROP TABLE IF EXISTS "MrrReconciliationRun";
