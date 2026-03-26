-- Pro-only shareable transcript links (read-only public pages)
CREATE TABLE "TranscriptShare" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "sourceTool" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "targetLanguage" TEXT,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TranscriptShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TranscriptShare_slug_key" ON "TranscriptShare"("slug");
CREATE INDEX "TranscriptShare_userId_idx" ON "TranscriptShare"("userId");
CREATE INDEX "TranscriptShare_jobId_idx" ON "TranscriptShare"("jobId");
