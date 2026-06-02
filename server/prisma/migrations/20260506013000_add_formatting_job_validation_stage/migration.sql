-- Add stage + validation report to FormattingJob
ALTER TABLE "FormattingJob"
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "validationReport" JSONB;

