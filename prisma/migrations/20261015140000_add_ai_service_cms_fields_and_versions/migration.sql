-- Migration: Add AI Service CMS fields and PlanVersion table

-- 1. Alter Plan table with new columns if not exists
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "cardSummary" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isListed" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "draftData" JSONB;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "primaryCtaLabel" TEXT DEFAULT 'Paketleri İncele';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "primaryCtaUrl" TEXT DEFAULT '#paketler';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "heroImageAlt" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "showStartingPrice" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "demoScreenshots" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "trustBlocks" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "comparisonFeatureKeys" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappNumber" TEXT DEFAULT '+905303412156';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "whatsappTemplate" TEXT DEFAULT 'Merhaba, {ürün} hakkında bilgi ve canlı demo almak istiyorum.';
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isDemoFormActive" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "sectionVisibility" JSONB NOT NULL DEFAULT '{"hero":true,"benefits":true,"steps":true,"demoScreenshots":true,"pricing":true,"trustBlocks":true,"faqs":true,"whatsappCta":true}'::jsonb;

-- 2. Alter PlanTier table with new columns
ALTER TABLE "PlanTier" ADD COLUMN IF NOT EXISTS "comparisonFeatures" JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "PlanTier" ADD COLUMN IF NOT EXISTS "vatNote" TEXT;
ALTER TABLE "PlanTier" ADD COLUMN IF NOT EXISTS "renewalNote" TEXT;
ALTER TABLE "PlanTier" ADD COLUMN IF NOT EXISTS "buttonText" TEXT;

-- 3. Create PlanVersion table
CREATE TABLE IF NOT EXISTS "PlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "title" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PlanVersion_planId_createdAt_idx" ON "PlanVersion"("planId", "createdAt");
