-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Daha önce yumuşak silinmiş (sipariş geçmişi olduğu için pasife alınmış) ürünleri
-- ayırt etmek mümkün değil; bu nedenle mevcut kayıtlara dokunulmaz.
-- Gerekirse elle: UPDATE "Product" SET "deletedAt" = NOW() WHERE id IN (...);
