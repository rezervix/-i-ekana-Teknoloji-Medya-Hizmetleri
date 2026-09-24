-- =============================================================================
-- PAYTR ABONELİK & ÖDEME SİSTEMİ MİGRASYONU
-- Şema: prisma/schema.prisma güncellemesine karşılık gelir.
-- Yeni tablolar: SubscriptionPlan, SavedPaymentCard, Subscription, PaymentAttempt
-- Enum'lar:   SubscriptionStatus, PaymentStatus
-- Değişiklikler: Product (isSubscription, defaultMonthlyPrice), 
--                ilişki kolonları (User, Order için FK gerekmez - ters ilişkiler Prisma katmanında sanal)
-- =============================================================================
-- PostgreSQL 14+ için uyumlu (Prisma 7.x Postgres datasource)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ENUM TİPLERİ (Önce oluşturulmalı)
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
    CREATE TYPE "SubscriptionStatus" AS ENUM (
      'ACTIVE',
      'PAST_DUE',
      'CANCELED',
      'TRIALING',
      'EXPIRED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM (
      'SUCCESS',
      'FAILED',
      'PENDING'
    );
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Product tablosuna YENİ ALANLAR (Abonelik ürünü flag + varsayılan aylık fiyat)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "isSubscription" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "defaultMonthlyPrice" DOUBLE PRECISION;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. SubscriptionPlan Tablosu
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
  "id"                TEXT                     NOT NULL,
  "name"              TEXT                     NOT NULL,
  "slug"              TEXT                     NOT NULL,
  "price_monthly_tl"  DOUBLE PRECISION         NOT NULL,
  "interval_days"     INTEGER                  NOT NULL DEFAULT 30,
  "isActive"          BOOLEAN                  NOT NULL DEFAULT true,
  "description"       TEXT,
  "features"          TEXT[]                   NOT NULL DEFAULT ARRAY[]::TEXT[],
  "productId"         TEXT,
  "createdAt"         TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_slug_key"
  ON "SubscriptionPlan"("slug");

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_productId_idx"
  ON "SubscriptionPlan"("productId");

CREATE INDEX IF NOT EXISTS "SubscriptionPlan_isActive_idx"
  ON "SubscriptionPlan"("isActive");


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SavedPaymentCard Tablosu (PCI-DSS Uyumlu)
-- DİKKAT: HİÇBİR ZAMAN ham kart no / CVV / SKT saklanmaz!
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "SavedPaymentCard" (
  "id"             TEXT                     NOT NULL,
  "userId"         TEXT                     NOT NULL,
  "utoken"         TEXT                     NOT NULL,
  "ctoken"         TEXT,
  "masked_card_no" TEXT                     NOT NULL,
  "card_brand"     TEXT,
  "card_type"      TEXT,
  "expires_at"     TEXT,
  "isDefault"      BOOLEAN                  NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SavedPaymentCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavedPaymentCard_userId_idx"
  ON "SavedPaymentCard"("userId");

CREATE INDEX IF NOT EXISTS "SavedPaymentCard_userId_isDefault_idx"
  ON "SavedPaymentCard"("userId", "isDefault");


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. Subscription Tablosu
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id"                      TEXT                     NOT NULL,
  "userId"                  TEXT                     NOT NULL,
  "planId"                  TEXT,
  "productId"               TEXT,
  "savedCardId"             TEXT,
  "status"                  "SubscriptionStatus"     NOT NULL DEFAULT 'ACTIVE',
  "current_period_start"    TIMESTAMP(3)             NOT NULL,
  "current_period_end"      TIMESTAMP(3)             NOT NULL,
  "next_charge_at"          TIMESTAMP(3)             NOT NULL,
  "cancel_at_period_end"    BOOLEAN                  NOT NULL DEFAULT false,
  "canceled_at"             TIMESTAMP(3),
  "cancel_reason"           TEXT,
  "past_due_at"             TIMESTAMP(3),
  "proration_credit"        DOUBLE PRECISION         NOT NULL DEFAULT 0,
  "price_snapshot"          DOUBLE PRECISION         NOT NULL,
  "reminder_sent_at"        TIMESTAMP(3),
  "createdAt"               TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Subscription_userId_idx"
  ON "Subscription"("userId");

CREATE INDEX IF NOT EXISTS "Subscription_planId_idx"
  ON "Subscription"("planId");

CREATE INDEX IF NOT EXISTS "Subscription_productId_idx"
  ON "Subscription"("productId");

CREATE INDEX IF NOT EXISTS "Subscription_status_next_charge_at_idx"
  ON "Subscription"("status", "next_charge_at");

CREATE INDEX IF NOT EXISTS "Subscription_cancel_at_period_end_idx"
  ON "Subscription"("cancel_at_period_end");


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. PaymentAttempt (İşlem / Tahsilat Denemesi) Tablosu
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id"                   TEXT                     NOT NULL,
  "userId"               TEXT                     NOT NULL,
  "subscriptionId"       TEXT,
  "orderId"              TEXT,
  "amount"               DOUBLE PRECISION         NOT NULL,
  "currency"             TEXT                     NOT NULL DEFAULT 'TRY',
  "status"               "PaymentStatus"          NOT NULL DEFAULT 'PENDING',
  "paytr_merchant_oid"   TEXT                     NOT NULL,
  "paytr_transaction_id" TEXT,
  "error_code"           TEXT,
  "error_message"        TEXT,
  "masked_card_no"       TEXT,
  "is_recurring"         BOOLEAN                  NOT NULL DEFAULT false,
  "attempt_number"       INTEGER                  NOT NULL DEFAULT 1,
  "raw_response"         JSONB,
  "createdAt"            TIMESTAMP(3)             NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentAttempt_paytr_merchant_oid_key"
  ON "PaymentAttempt"("paytr_merchant_oid");

CREATE INDEX IF NOT EXISTS "PaymentAttempt_userId_idx"
  ON "PaymentAttempt"("userId");

CREATE INDEX IF NOT EXISTS "PaymentAttempt_subscriptionId_idx"
  ON "PaymentAttempt"("subscriptionId");

CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_idx"
  ON "PaymentAttempt"("orderId");

CREATE INDEX IF NOT EXISTS "PaymentAttempt_status_idx"
  ON "PaymentAttempt"("status");

CREATE INDEX IF NOT EXISTS "PaymentAttempt_createdAt_idx"
  ON "PaymentAttempt"("createdAt");


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. FK CONSTRAINTS (Foreign Keys)
-- ═══════════════════════════════════════════════════════════════════════════════

-- SubscriptionPlan → Product
ALTER TABLE "SubscriptionPlan"
  ADD CONSTRAINT "SubscriptionPlan_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- SavedPaymentCard → User
ALTER TABLE "SavedPaymentCard"
  ADD CONSTRAINT "SavedPaymentCard_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription → User
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Subscription → SubscriptionPlan
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription → Product
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Subscription → SavedPaymentCard
ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_savedCardId_fkey"
  FOREIGN KEY ("savedCardId") REFERENCES "SavedPaymentCard"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentAttempt → User
ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- PaymentAttempt → Subscription
ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- PaymentAttempt → Order
ALTER TABLE "PaymentAttempt"
  ADD CONSTRAINT "PaymentAttempt_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. updatedAt TRIGGER (Seçilen tüm tablolar için zaman damgası)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

DO $$ BEGIN
  CREATE TRIGGER trigger_set_timestamp_subscription_plan
    BEFORE UPDATE ON "SubscriptionPlan"
    FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_set_timestamp_saved_payment_card
    BEFORE UPDATE ON "SavedPaymentCard"
    FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trigger_set_timestamp_subscription
    BEFORE UPDATE ON "Subscription"
    FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
