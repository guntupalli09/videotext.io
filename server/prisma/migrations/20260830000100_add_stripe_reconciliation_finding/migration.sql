-- Additive-only migration. Creates a new, empty table for the daily
-- Stripe<->VideoText entitlement reconciliation job (see
-- services/stripeReconciliation.ts:runEntitlementReconciliation, wired into
-- the nightly cron in index.ts). Does not alter, drop, or rename any
-- existing table, column, or index.

-- CreateTable
CREATE TABLE "StripeReconciliationFinding" (
    "id"                   TEXT NOT NULL,
    "findingType"          TEXT NOT NULL,
    "stripeCustomerId"     TEXT,
    "stripeSubscriptionId" TEXT,
    "userId"               TEXT,
    "details"              JSONB NOT NULL,
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeReconciliationFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StripeReconciliationFinding_createdAt_idx" ON "StripeReconciliationFinding"("createdAt");

-- CreateIndex
CREATE INDEX "StripeReconciliationFinding_findingType_idx" ON "StripeReconciliationFinding"("findingType");
