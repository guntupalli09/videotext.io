-- CreateTable
CREATE TABLE "FormattingJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inputText" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "outputText" TEXT,
    "diffData" JSONB,
    "flaggedSegments" JSONB,
    "appliedRules" JSONB NOT NULL,
    "presetId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormattingJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormattingJob_userId_idx" ON "FormattingJob"("userId");
