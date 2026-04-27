CREATE TABLE "UpgradeIntent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpgradeIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UpgradeIntent_createdAt_idx" ON "UpgradeIntent"("createdAt");
CREATE INDEX "UpgradeIntent_userId_createdAt_idx" ON "UpgradeIntent"("userId", "createdAt");

ALTER TABLE "UpgradeIntent" ADD CONSTRAINT "UpgradeIntent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
