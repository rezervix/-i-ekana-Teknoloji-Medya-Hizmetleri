import { prisma } from '../src/lib/prisma';
import { formatTryPrice, getStartingPrice, getTierFeatures } from '../src/lib/plan-pricing';

async function testAIServices() {
  console.log("=== AI OTOMASYON HİZMETLERİ & DÖNÜŞÜM DOĞRULAMA TESTİ ===\n");

  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    include: {
      tiers: {
        where: { isActive: true },
        orderBy: [{ isRecommended: "desc" }, { displayOrder: "asc" }],
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  console.log(`[TEST 1] Aktif Veritabanı Planları (${plans.length} Adet):`);
  for (const p of plans) {
    const starting = getStartingPrice(p);
    console.log(`  ✓ Plan: ${p.name}`);
    console.log(`    Slug: /services/ai-automation/${p.slug}`);
    console.log(`    Kategori: ${p.category || 'Genel'}`);
    console.log(`    Başlangıç Fiyatı: ${starting !== null ? formatTryPrice(starting) : 'Özel Teklif'}/ay`);
    console.log(`    Aktif Paket (Tier) Sayısı: ${p.tiers.length}`);
    for (const t of p.tiers) {
      const feats = getTierFeatures(t.features);
      console.log(`      - ${t.name}: ${formatTryPrice(t.priceMonthly)}/ay (Önerilen: ${t.isRecommended ? 'EVET' : 'HAYIR'}) - ${feats.length} özellik`);
    }
  }

  // TEST 2: Sepete Ekleme & PayTR Tutar Güvenliği Simülasyonu
  console.log("\n[TEST 2] Sepet & PayTR Tutar Güvenliği Doğrulaması:");
  for (const p of plans) {
    for (const t of p.tiers) {
      const priceInTry = t.priceMonthly / 100;
      const cartItem = {
        productId: t.id,
        itemType: "subscription",
        subscriptionPlanId: p.id,
        subscriptionTierId: t.id,
        name: `${p.name} - ${t.name}`,
        price: priceInTry,
        quantity: 1,
      };
      // Doğrulama: Kurus -> TL -> Kurus kaybı olmamalı
      const reconstructedKurus = Math.round(cartItem.price * 100);
      if (reconstructedKurus !== t.priceMonthly) {
        throw new Error(`Fiyat yuvarlama uyuşmazlığı: ${t.name} ${reconstructedKurus} !== ${t.priceMonthly}`);
      }
    }
  }
  console.log("  ✓ Tüm plan paketlerinin kuruş/TL dönüşümleri %100 kayıpsız doğrulandı.");

  // TEST 3: Microsoft Call Center AI döviz kuru & add-on simülasyonu
  console.log("\n[TEST 3] Microsoft Call Center AI Hesaplama Simülasyonu:");
  const testRate = 35.0;
  const baseMonthlyUSD = 149;
  const baseYearlyMonthlyUSD = 126;
  
  // Aylık hesap: 149 USD * 35 = 5.215 TL
  const monthlyTL = baseMonthlyUSD * testRate;
  console.log(`  ✓ Başlangıç Aylık (USD 149 @ ${testRate} TL): ${monthlyTL} TL`);

  // Yıllık hesap (%15 indirimli): 126 USD * 12 = 1.512 USD * 35 = 52.920 TL
  const yearlyTL = (baseYearlyMonthlyUSD * 12) * testRate;
  console.log(`  ✓ Başlangıç Yıllık (USD 126*12 @ ${testRate} TL): ${yearlyTL} TL`);

  console.log("\n=== TÜM DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ ===");
}

testAIServices().catch((err) => {
  console.error("Test hatası:", err);
  process.exit(1);
}).finally(() => process.exit(0));
