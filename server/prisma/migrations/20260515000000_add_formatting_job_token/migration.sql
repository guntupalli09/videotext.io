ALTER TABLE "FormattingJob" ADD COLUMN "jobToken" TEXT;
CREATE UNIQUE INDEX "FormattingJob_jobToken_key" ON "FormattingJob"("jobToken");
