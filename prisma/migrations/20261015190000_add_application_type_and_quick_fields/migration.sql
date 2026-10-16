-- Migration: Add applicationType to SocialMediaApplication and make non-phone fields optional for quick applications

ALTER TABLE "social_media_applications" 
ADD COLUMN IF NOT EXISTS "applicationType" TEXT NOT NULL DEFAULT 'detailed';

ALTER TABLE "social_media_applications" ALTER COLUMN "fullName" DROP NOT NULL;
ALTER TABLE "social_media_applications" ALTER COLUMN "companyName" DROP NOT NULL;
ALTER TABLE "social_media_applications" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "social_media_applications" ALTER COLUMN "sector" DROP NOT NULL;
ALTER TABLE "social_media_applications" ALTER COLUMN "monthlyServiceBudget" DROP NOT NULL;
ALTER TABLE "social_media_applications" ALTER COLUMN "monthlyAdSpendBudget" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "social_media_applications_applicationType_idx" 
ON "social_media_applications"("applicationType");
