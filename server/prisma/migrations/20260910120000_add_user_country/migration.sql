-- Add country column for signup geo-IP attribution (founder dashboard).
ALTER TABLE "User" ADD COLUMN "country" TEXT;
