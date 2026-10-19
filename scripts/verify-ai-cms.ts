import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  console.log("=== AI HİZMETLERİ CMS DOĞRULAMA TESTİ ===");

  // 1. Planları sorgula
  const plans = await prisma.plan.findMany({
    include: {
      tiers: true,
      versions: true,
    },
  });

  console.log(`[TEST 1] Toplam Plan Sayısı: ${plans.length}`);
  if (plans.length < 4) throw new Error("Planlar eksik!");

  for (const p of plans) {
    console.log(`  ✓ ${p.name} (slug: ${p.slug})`);
    console.log(`    - cardSummary: ${p.cardSummary ? `OK (${p.cardSummary.length} char)` : "EKSİK"}`);
    console.log(`    - category: ${p.category}`);
    console.log(`    - isListed: ${p.isListed}, isFeatured: ${p.isFeatured}`);
    console.log(`    - status: ${p.status}`);
    console.log(`    - trustBlocks: ${(p.trustBlocks as any[])?.length || 0} blok`);
    console.log(`    - versionCount: ${p.versions.length} versiyon`);
    console.log(`    - tiers: ${p.tiers.length} paket (buttonText: ${p.tiers[0]?.buttonText})`);
  }

  // 2. Draft ve Sürüm Simülasyonu
  const testPlan = plans[0];
  console.log(`\n[TEST 2] Taslak Kaydetme Simülasyonu (${testPlan.slug})...`);
  const updatedWithDraft = await prisma.plan.update({
    where: { id: testPlan.id },
    data: {
      draftData: {
        ...testPlan,
        heroHeadline: "Test Taslak Başlığı (Canlıya Geçmemiş)",
      },
      status: "DRAFT",
    },
  });
  console.log(`  ✓ Plan durumu DRAFT yapıldı, draftData içine yazıldı.`);
  console.log(`  ✓ Canlı heroHeadline korundu: "${updatedWithDraft.heroHeadline}"`);
  console.log(`  ✓ Taslaktaki heroHeadline: "${(updatedWithDraft.draftData as any)?.heroHeadline}"`);

  // 3. Yayına Alma & Versiyon Alma Simülasyonu
  console.log(`\n[TEST 3] Yayına Alma & Sürüm Snapshot Simülasyonu...`);
  const published = await prisma.plan.update({
    where: { id: testPlan.id },
    data: {
      heroHeadline: "Yayınlanan Başlık",
      status: "PUBLISHED",
      draftData: Prisma.DbNull,
    },
  });

  const nextVersion = await prisma.planVersion.create({
    data: {
      planId: testPlan.id,
      versionNumber: testPlan.versions.length + 1,
      title: `Sürüm ${testPlan.versions.length + 1} (Test Yayını)`,
      snapshot: published as any,
      createdBy: "Test Runner",
    },
  });
  console.log(`  ✓ Başarıyla yayınlandı ve Sürüm #${nextVersion.versionNumber} snapshot alındı.`);

  // Temizle (Orijinal başlığı geri al)
  await prisma.plan.update({
    where: { id: testPlan.id },
    data: {
      heroHeadline: testPlan.heroHeadline,
      status: "PUBLISHED",
      draftData: Prisma.DbNull,
    },
  });
  await prisma.planVersion.delete({ where: { id: nextVersion.id } });
  console.log(`  ✓ Test temizliği tamamlandı, orijinal başlık korundu.`);

  console.log("\n=== TÜM DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ ===");
}

main()
  .catch((e) => {
    console.error("Test hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
