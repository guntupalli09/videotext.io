-- AlterTable: add survey-specific columns to Feedback
ALTER TABLE "Feedback"
  ADD COLUMN "email"          TEXT,
  ADD COLUMN "topTool"        TEXT,
  ADD COLUMN "topToolReason"  TEXT,
  ADD COLUMN "featureRequest" TEXT,
  ADD COLUMN "otherFeedback"  TEXT,
  ADD COLUMN "source"         TEXT;
