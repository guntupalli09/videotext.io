-- CreateTable: EventLog — behavioral event tracking for funnel analytics
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FeedbackEvent — structured feedback from contextual triggers A–E
CREATE TABLE "FeedbackEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "rating" TEXT,
    "category" TEXT,
    "freeText" TEXT NOT NULL DEFAULT '',
    "userScore" INTEGER,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedbackEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserMetrics — user engagement scoring and segmentation
CREATE TABLE "UserMetrics" (
    "userId" TEXT NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "totalExports" INTEGER NOT NULL DEFAULT 0,
    "hasReturned" BOOLEAN NOT NULL DEFAULT false,
    "isPaying" BOOLEAN NOT NULL DEFAULT false,
    "userScore" INTEGER NOT NULL DEFAULT 0,
    "segment" TEXT NOT NULL DEFAULT 'explorer',
    "pmfShown" BOOLEAN NOT NULL DEFAULT false,
    "competitorShown" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserMetrics_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex: EventLog
CREATE INDEX "EventLog_eventName_createdAt_idx" ON "EventLog"("eventName", "createdAt");
CREATE INDEX "EventLog_userId_createdAt_idx" ON "EventLog"("userId", "createdAt");
CREATE INDEX "EventLog_sessionId_idx" ON "EventLog"("sessionId");

-- CreateIndex: FeedbackEvent
CREATE INDEX "FeedbackEvent_triggerType_createdAt_idx" ON "FeedbackEvent"("triggerType", "createdAt");
CREATE INDEX "FeedbackEvent_userId_idx" ON "FeedbackEvent"("userId");
CREATE INDEX "FeedbackEvent_category_idx" ON "FeedbackEvent"("category");
CREATE INDEX "FeedbackEvent_createdAt_idx" ON "FeedbackEvent"("createdAt");

-- CreateIndex: UserMetrics
CREATE INDEX "UserMetrics_segment_idx" ON "UserMetrics"("segment");
CREATE INDEX "UserMetrics_userScore_idx" ON "UserMetrics"("userScore");
