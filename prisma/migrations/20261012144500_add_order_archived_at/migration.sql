-- AlterTable: Order modeline nullable archivedAt alanı ekle (mevcut veriyi bozmayan, geri alınabilir)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_archivedAt_idx" ON "Order"("archivedAt");

-- Geri Alma (Rollback) SQL:
-- DROP INDEX IF EXISTS "Order_archivedAt_idx";
-- ALTER TABLE "Order" DROP COLUMN IF EXISTS "archivedAt";
