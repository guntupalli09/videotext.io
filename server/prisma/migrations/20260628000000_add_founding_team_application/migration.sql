-- CreateTable
CREATE TABLE "FoundingTeamApplication" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "linkedIn" TEXT NOT NULL,
    "portfolio" TEXT,
    "resumeUrl" TEXT,
    "resumeFileName" TEXT,
    "currentCompany" TEXT,
    "currentPosition" TEXT,
    "yearsOfExperience" TEXT,
    "industry" TEXT,
    "areasOfHelp" JSONB NOT NULL DEFAULT '[]',
    "impactDescription" TEXT NOT NULL,
    "hasSaasExperience" BOOLEAN NOT NULL DEFAULT false,
    "saasDetails" TEXT,
    "whyVideoText" TEXT NOT NULL,
    "opportunities" TEXT NOT NULL,
    "first90Days" TEXT NOT NULL,
    "hoursPerWeek" TEXT NOT NULL,
    "preferredCollaboration" TEXT NOT NULL,
    "location" TEXT,
    "anythingElse" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoundingTeamApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoundingTeamApplication_email_idx" ON "FoundingTeamApplication"("email");

-- CreateIndex
CREATE INDEX "FoundingTeamApplication_createdAt_idx" ON "FoundingTeamApplication"("createdAt");
