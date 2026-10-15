-- Migration: Add SocialMediaApplication and SocialMediaApplicationNote tables and SocialApplicationStatus enum

-- 1. Create Enum SocialApplicationStatus
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SocialApplicationStatus') THEN
        CREATE TYPE "SocialApplicationStatus" AS ENUM (
            'NEW',
            'REVIEWING',
            'CONTACTED',
            'PROPOSAL_PREPARING',
            'PROPOSAL_SENT',
            'WON',
            'LOST',
            'ARCHIVED'
        );
    END IF;
END $$;

-- 2. Create Table social_media_applications
CREATE TABLE IF NOT EXISTS "social_media_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "socialMediaUrl" TEXT,
    "sector" TEXT NOT NULL,
    "city" TEXT,
    "services" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "monthlyServiceBudget" TEXT NOT NULL,
    "monthlyAdSpendBudget" TEXT NOT NULL,
    "preferredPeriod" TEXT,
    "currentAccountStatus" TEXT,
    "currentAdExperience" TEXT,
    "notes" TEXT,
    "preferredContactMethod" TEXT,
    "budgetConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "budgetConfirmedAt" TIMESTAMP(3),
    "kvkkConsent" BOOLEAN NOT NULL DEFAULT true,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" "SocialApplicationStatus" NOT NULL DEFAULT 'NEW',
    "followUpDate" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "landingPage" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_media_applications_pkey" PRIMARY KEY ("id")
);

-- Unique index on applicationNumber
CREATE UNIQUE INDEX IF NOT EXISTS "social_media_applications_applicationNumber_key" ON "social_media_applications"("applicationNumber");

-- Indexes for search and filter
CREATE INDEX IF NOT EXISTS "social_media_applications_status_idx" ON "social_media_applications"("status");
CREATE INDEX IF NOT EXISTS "social_media_applications_email_idx" ON "social_media_applications"("email");
CREATE INDEX IF NOT EXISTS "social_media_applications_phone_idx" ON "social_media_applications"("phone");
CREATE INDEX IF NOT EXISTS "social_media_applications_companyName_idx" ON "social_media_applications"("companyName");
CREATE INDEX IF NOT EXISTS "social_media_applications_createdAt_idx" ON "social_media_applications"("createdAt");

-- 3. Create Table social_media_application_notes
CREATE TABLE IF NOT EXISTS "social_media_application_notes" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'Admin',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_media_application_notes_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "social_media_application_notes_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "social_media_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "social_media_application_notes_application_id_idx" ON "social_media_application_notes"("application_id");
