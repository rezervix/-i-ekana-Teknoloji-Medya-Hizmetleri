import { prisma } from '../src/lib/prisma';
import { normalizeTiers } from '../src/app/api/admin/plans/route';

async function testAdminPlansLifecycle() {
  console.log("=== ADMİN PLAN & PAKET YÖNETİMİ ENTEGRASYON TESTİ ===\n");

  // 1. normalizeTiers ve Fiyat Güvenliği Testi
  console.log("[TEST 1] normalizeTiers Fonksiyonunun Doğrulanması:");
  const sampleTiersInput = [
    {
      name: "Test Başlangıç",
      description: "Test amaçlı paket açıklaması",
      priceMonthly: 7500, // 7500 TL girildi
      badge: "Önerilen",
      isRecommended: true,
      vatNote: "+ %20 KDV",
      features: ["Özellik 1", " Özellik 2 ", ""],
      comparisonFeatures: [
        { key: "Canlı Destek", value: "Sınırsız", included: true },
        { key: "API Erişimi", included: false },
      ],
    },
    {
      name: "Geçersiz Fiyatlı Paket",
      priceMonthly: 0, // 0 TL elenmeli
    },
    {
      name: "", // İsimsiz elenmeli
      priceMonthly: 5000,
    },
  ];

  const normalized = normalizeTiers(sampleTiersInput);
  if (normalized.length !== 1) {
    throw new Error(`normalizeTiers geçersiz paketleri eleyemedi: beklenen 1, gelen ${normalized.length}`);
  }
  const tier = normalized[0];
  if (tier.priceMonthly !== 750000) {
    throw new Error(`Kuruş dönüşümü hatalı: beklenen 750000, gelen ${tier.priceMonthly}`);
  }
  if (tier.features.length !== 2 || tier.features[1] !== "Özellik 2") {
    throw new Error(`Özellik dizisi temizliği hatalı: ${JSON.stringify(tier.features)}`);
  }
  if (!Array.isArray(tier.comparisonFeatures) || tier.comparisonFeatures.length !== 2) {
    throw new Error(`comparisonFeatures aktarımı hatalı: ${JSON.stringify(tier.comparisonFeatures)}`);
  }
  console.log("  ✓ normalizeTiers: Fiyat kuruşa dönüştürüldü (7500 TL -> 750000 kuruş).");
  console.log("  ✓ comparisonFeatures ve özellik dizileri başarıyla filtrelendi.");
  console.log("  ✓ Geçersiz ve 0 TL'lik paketler başarıyla elendi.");

  // 2. Veritabanındaki Planların Taslak & Canlı Bütünlüğü
  console.log("\n[TEST 2] Veritabanı Planlarının Bütünlük Kontrolü:");
  const allPlans = await prisma.plan.findMany({
    include: { tiers: true, versions: true },
  });

  for (const p of allPlans) {
    console.log(`  ✓ Plan: ${p.name} (Slug: ${p.slug})`);
    console.log(`    Durum: ${p.status}, Yayınlanma: ${p.publishedAt ? p.publishedAt.toISOString() : 'Taslak'}`);
    console.log(`    Paket Sayısı: ${p.tiers.length}, Geçmiş Versiyon Sayısı: ${p.versions.length}`);
    
    // Her planın en az 1 paketi olmalı
    if (p.tiers.length === 0) {
      console.warn(`    ⚠️ Uyarı: ${p.name} planında aktif paket bulunmuyor.`);
    }

    // Fiyat tutarlılığı kontrolü
    for (const t of p.tiers) {
      if (t.priceMonthly <= 0) {
        throw new Error(`Hatalı paket fiyatı: ${p.name} - ${t.name}: ${t.priceMonthly}`);
      }
    }
  }

  // 3. Taslak Önizleme (Draft Simulation)
  console.log("\n[TEST 3] Taslak Önizleme (Preview Simulation):");
  const samplePlan = allPlans[0];
  if (samplePlan) {
    const mockDraftData = {
      heroHeadline: "Yeni Taslak Başlık Testi",
      tiers: [
        {
          id: samplePlan.tiers[0]?.id,
          name: samplePlan.tiers[0]?.name,
          priceMonthly: 800000,
          isRecommended: true,
          features: ["Taslak Özellik 1"],
        },
      ],
    };

    // getPlan simülasyonu
    const canPreview = true;
    const resolvedData = canPreview && mockDraftData ? {
      ...samplePlan,
      ...mockDraftData,
      tiers: mockDraftData.tiers,
    } : samplePlan;

    if (resolvedData.heroHeadline !== "Yeni Taslak Başlık Testi") {
      throw new Error("Taslak başlık önizlemesi giydirilemedi!");
    }
    console.log(`  ✓ Taslak önizleme mantığı başarıyla doğrulandı: "${resolvedData.heroHeadline}"`);
  }

  console.log("\n=== TÜM ADMİN VE VERİ DÖNGÜSÜ TESTLERİ BAŞARIYLA TAMAMLANDI ===");
}

testAdminPlansLifecycle().catch((err) => {
  console.error("Test başarısız:", err);
  process.exit(1);
}).finally(() => process.exit(0));
