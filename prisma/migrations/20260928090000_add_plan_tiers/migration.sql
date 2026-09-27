-- Add the tier catalog for each subscription plan.
CREATE TABLE "PlanTier" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "badge" TEXT,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanTier_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Subscription" ADD COLUMN "planTierId" TEXT;

CREATE INDEX "PlanTier_planId_idx" ON "PlanTier"("planId");
CREATE INDEX "Subscription_planTierId_idx" ON "Subscription"("planTierId");

ALTER TABLE "PlanTier" ADD CONSTRAINT "PlanTier_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planTierId_fkey"
    FOREIGN KEY ("planTierId") REFERENCES "PlanTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
