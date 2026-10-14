-- CreateTable: dynamic_contents
CREATE TABLE IF NOT EXISTS "dynamic_contents" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "description" TEXT,
    "group" TEXT NOT NULL DEFAULT 'general',
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dynamic_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dynamic_contents_key_locale_key" ON "dynamic_contents"("key", "locale");
CREATE INDEX IF NOT EXISTS "dynamic_contents_key_idx" ON "dynamic_contents"("key");
CREATE INDEX IF NOT EXISTS "dynamic_contents_group_idx" ON "dynamic_contents"("group");

-- Seed initial/fallback data for dynamic contents
INSERT INTO "dynamic_contents" ("id", "key", "content", "locale", "description", "group", "created_at", "updated_at")
VALUES
  ('dc_step1_title', 'product_configurator.step1_title', 'Ebat ve Kağıt Özellikleri', 'tr', 'Ürün Yapılandırıcı 1. Adım Başlığı (Varsayılan/Baskı)', 'product_configurator', NOW(), NOW()),
  ('dc_step2_title', 'product_configurator.step2_title', 'Sipariş Adedi', 'tr', 'Ürün Yapılandırıcı 2. Adım Başlığı', 'product_configurator', NOW(), NOW()),
  ('dc_step3_title', 'product_configurator.step3_title', 'Tasarımınızı Belirleyin', 'tr', 'Ürün Yapılandırıcı 3. Adım Başlığı', 'product_configurator', NOW(), NOW()),
  ('dc_step4_title', 'product_configurator.step4_title', 'Fiyat Özeti ve Sipariş', 'tr', 'Ürün Yapılandırıcı 4. Adım Başlığı', 'product_configurator', NOW(), NOW()),
  ('dc_step1_kase', 'product_configurator.step1_title_kase', 'Kaşe ve Mürekkep Özellikleri', 'tr', 'Kaşe/Mühür Ürünleri için 1. Adım Başlığı Override', 'product_configurator', NOW(), NOW()),
  ('dc_step1_teknoloji', 'product_configurator.step1_title_teknoloji', 'Ürün ve Donanım Özellikleri', 'tr', 'Teknoloji Ürünleri için 1. Adım Başlığı Override', 'product_configurator', NOW(), NOW()),
  ('dc_step1_medya', 'product_configurator.step1_title_medya', 'Hizmet ve Paket Özellikleri', 'tr', 'Medya Ürünleri için 1. Adım Başlığı Override', 'product_configurator', NOW(), NOW())
ON CONFLICT ("key", "locale") DO NOTHING;
