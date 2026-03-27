-- Add optional display name for Google (and future social) sign-in users
ALTER TABLE "User" ADD COLUMN "name" TEXT;
