import { prisma } from '../src/lib/prisma';
import fs from 'fs';

const DEFAULT_TRUST_BLOCKS = [
  {
    key: "setup_time",
    title: "24 Saat İçinde Kurulum",
    text: "Ekibimiz tüm teknik entegrasyonu ve yapılandırmayı 24 saat içinde tamamlar, sisteminizi hemen kullanmaya başlarsınız.",
    icon: "Clock",
    isEnabled: true,
  },
  {
    key: "support",
    title: "Kesintisiz Uzman Desteği",
    text: "Her adımda yanınızda olan dedike müşteri temsilciniz ve 7/24 teknik destek hattımızla işiniz asla aksamaz.",
    icon: "Headphones",
    isEnabled: true,
  },
  {
    key: "security",
    title: "KVKK & Kurumsal Veri Güvenliği",
    text: "Tüm müşteri verileriniz ve görüşme kayıtlarınız 256-bit SSL şifreleme ve KVKK standartlarında güvenle korunur.",
    icon: "ShieldCheck",
    isEnabled: true,
  },
  {
    key: "cancel_policy",
    title: "Taahhütsüz & Kolay İptal",
    text: "Yıllık bağlayıcı taahhüt zorunluluğu yoktur; dilediğiniz zaman tek tıkla aboneliğinizi sonlandırabilirsiniz.",
    icon: "Lock",
    isEnabled: true,
  },
  {
    key: "pricing_transparency",
    title: "Şeffaf Yenileme & Sabit Fiyat",
    text: "Gizli maliyet veya sürpriz kurulum bedeli bulunmaz; her ay şeffaf fatura ile sabit fiyat garantisi sunulur.",
    icon: "CheckCircle",
    isEnabled: true,
  },
];

const DEFAULT_SECTION_VISIBILITY = {
  hero: true,
  benefits: true,
  steps: true,
  demoScreenshots: true,
  pricing: true,
  trustBlocks: true,
  faqs: true,
  whatsappCta: true,
};

async function main() {
  console.log("=== ADIM 1: VERİTABANI TABLO & KOLON MİGRASYONU UYGULANIYOR ===");
  const sql = fs.readFileSync('prisma/migrations/20261015140000_add_ai_service_cms_fields_and_versions/migration.sql', 'utf8');
  await prisma.$executeRawUnsafe(sql);
  console.log("Veritabanı kolonları ve PlanVersion tablosu başarıyla oluşturuldu.");

  console.log("\n=== ADIM 2: MEVCUT PLANLARI LİSTELEME & TAŞINACAKLARIN TESPİTİ ===");
  const plans = await prisma.plan.findMany({
    include: { tiers: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Toplam ${plans.length} adet mevcut AI hizmeti bulundu:`);
  for (const p of plans) {
    console.log(`\n• [${p.slug}] "${p.name}"`);
    console.log(`  - Kısa Özet (eski): ${p.shortDescription?.slice(0, 80)}...`);
    console.log(`  - Taşınacak cardSummary (max 120): ${p.shortDescription?.slice(0, 117)}...`);
    console.log(`  - Kategori atanacak: ${p.category || 'AI Otomasyon & Çözümler'}`);
    console.log(`  - Paket sayısı: ${p.tiers.length}`);
    console.log(`  - Güven blokları atanacak: 5 standart blok eklenecek`);
    console.log(`  - WhatsApp & Demo şablonu: +90 530 341 21 56 atanacak`);
    console.log(`  - Bölüm görünürlükleri: 8 bölümün tümü açık yapılacak`);
  }

  console.log("\n=== ADIM 3: VERİ DÖNÜŞÜMÜ & SÜRÜM 1 (SNAPSHOT) OLUŞTURULUYOR ===");
  for (const p of plans) {
    const cardSummary = p.cardSummary || (p.shortDescription ? p.shortDescription.slice(0, 120) : p.name);
    const category = p.category || (
      p.slug.includes("kuscu") ? "Finans & Piyasa Analizi" :
      p.slug.includes("scoreform") ? "Müşteri Deneyimi & İtibar" :
      p.slug.includes("midvem") ? "Müşteri Desteği & İletişim" :
      p.slug.includes("faktura") ? "Finans & E-Dönüşüm" :
      "Yapay Zeka & Otomasyon"
    );

    // Update Plan
    const updatedPlan = await prisma.plan.update({
      where: { id: p.id },
      data: {
        cardSummary,
        category,
        isListed: p.isListed ?? true,
        isFeatured: p.isFeatured ?? (p.slug.includes("scoreform")),
        status: p.status || "PUBLISHED",
        publishedAt: p.publishedAt || p.createdAt,
        primaryCtaLabel: p.primaryCtaLabel || "Paketleri İncele",
        primaryCtaUrl: p.primaryCtaUrl || "#paketler",
        showStartingPrice: p.showStartingPrice ?? true,
        heroImageAlt: p.heroImageAlt || `${p.name} Ürün Arayüzü`,
        trustBlocks: (Array.isArray(p.trustBlocks) && p.trustBlocks.length > 0) ? p.trustBlocks : DEFAULT_TRUST_BLOCKS,
        sectionVisibility: (p.sectionVisibility && typeof p.sectionVisibility === 'object' && Object.keys(p.sectionVisibility).length > 0) ? p.sectionVisibility : DEFAULT_SECTION_VISIBILITY,
        whatsappNumber: p.whatsappNumber || "+90 530 341 21 56",
        whatsappTemplate: p.whatsappTemplate || `Merhaba, ${p.name} hakkında bilgi ve canlı demo almak istiyorum.`,
        metaTitle: p.metaTitle || `${p.name} | Çiçekana Teknoloji`,
        metaDescription: p.metaDescription || (p.heroSubheadline || p.shortDescription || p.name).slice(0, 160),
      },
    });

    // Update Tiers default notes and button texts
    for (const t of p.tiers) {
      await prisma.planTier.update({
        where: { id: t.id },
        data: {
          buttonText: t.buttonText || `${t.name} Aboneliğini Başlat`,
          vatNote: t.vatNote || p.vatNote || "+ %20 KDV",
          renewalNote: t.renewalNote || "Aylık yenilenir, taahhütsüzdür ve dilediğiniz zaman tek tıkla iptal edilebilir.",
        },
      });
    }

    // Check if initial PlanVersion exists
    const existingVersion = await prisma.planVersion.findFirst({
      where: { planId: p.id },
    });

    if (!existingVersion) {
      const fullSnapshot = await prisma.plan.findUnique({
        where: { id: p.id },
        include: { tiers: { orderBy: { displayOrder: "asc" } } },
      });

      await prisma.planVersion.create({
        data: {
          planId: p.id,
          versionNumber: 1,
          title: "Sürüm 1 (Mevcut İçerik Taşındı & Yayında)",
          snapshot: fullSnapshot as any,
          createdBy: "Sistem Migrasyonu",
        },
      });
      console.log(`[OK] ${p.name} için Sürüm 1 snapshot kaydedildi.`);
    }
  }

  console.log("\n=== TAMAMLANDI: TÜM PLANLAR BAŞARIYLA YENİ VERİ MODELİNE TAŞINDI ===");
}

main()
  .catch((e) => {
    console.error("Migration hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
