-- Migration: add subscriptionStatus and cancelAtPeriodEnd to User table
-- Both columns are additive and non-breaking. Safe to apply on a live table.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelAtPeriodEnd"  BOOLEAN NOT NULL DEFAULT false;

-- Backfill subscriptionStatus for existing paying users.
-- Any user who still has a subscriptionId is presumed active.
UPDATE "User"
SET "subscriptionStatus" = 'active'
WHERE "subscriptionId" IS NOT NULL
  AND "subscriptionStatus" IS NULL;

-- Backfill cancelAtPeriodEnd from the legacy JSON field subscriptionCancelingAt.
-- Only mark as true when the cancellation date is still in the future.
UPDATE "User"
SET "cancelAtPeriodEnd" = true
WHERE ("usageThisMonth" ->> 'subscriptionCancelingAt') IS NOT NULL
  AND ("usageThisMonth" ->> 'subscriptionCancelingAt')::timestamptz > NOW()
  AND "cancelAtPeriodEnd" = false;
