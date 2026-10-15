-- Migration: Add guest subscription fields and unique phone constraint
-- Reversible and non-destructive for existing subscriptions and users

-- 1. Make userId nullable in Subscription (allows pending guest subscriptions)
ALTER TABLE "Subscription" ALTER COLUMN "userId" DROP NOT NULL;

-- 2. Add pending fields and claim token to Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingPhone" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingName" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "pendingPasswordHash" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "claimToken" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "claimTokenExpiresAt" TIMESTAMP(3);

-- 3. Create unique index on claimToken and index on pendingPhone
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_claimToken_key" ON "Subscription"("claimToken");
CREATE INDEX IF NOT EXISTS "Subscription_pendingPhone_idx" ON "Subscription"("pendingPhone");

-- 4. Ensure phone on User is unique
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

-- 5. Seed default consent text in dynamic_contents
INSERT INTO "dynamic_contents" ("id", "key", "content", "locale", "description", "group", "created_at", "updated_at")
VALUES (
    'dc_sub_consent',
    'subscription_terms_kvkk_consent',
    'Abonelik koşullarını ve KVKK aydınlatma metnini okudum, kabul ediyorum.',
    'tr',
    'Abonelik Ödeme Sayfası Koşullar ve KVKK Onay Metni',
    'subscription',
    NOW(),
    NOW()
)
ON CONFLICT ("key", "locale") DO NOTHING;
