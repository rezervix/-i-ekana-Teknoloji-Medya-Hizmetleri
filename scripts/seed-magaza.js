const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Magaza Products...");

  // Update existing products to TEKNOLOJI
  await prisma.product.updateMany({
    data: {
      category: 'TEKNOLOJI'
    }
  });
  console.log("Updated existing products to TEKNOLOJI category.");

  const printProducts = [
    {
      name: "Kartvizit Baskı",
      slug: "kartvizit-baski",
      description: "350g kuşe, tek/çift yüz, selefon seçenekli premium kartvizit.",
      category: "BASKI",
      subcategory: "Kartvizit",
      price: 250, // 1000 adet
      images: ["https://images.unsplash.com/photo-1589008272911-3091e0a81665?w=800"],
      stock: null,
      customizationOptions: [
        { id: "text", label: "Yazı", type: "text", enabled: true },
        { id: "image", label: "Görsel Yükle", type: "image_upload", enabled: true },
        { id: "file", label: "Dosya (Logo vs.)", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Broşür Baskı",
      slug: "brosur-baski",
      description: "A4/A5, 4 sayfa katlamalı, parlak/mat broşür.",
      category: "BASKI",
      subcategory: "Broşür",
      price: 450,
      images: ["https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Tasarım Dosyası (PDF)", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "El İlanı Baskı",
      slug: "el-ilani-baski",
      description: "A5/A6, tek yüz, renkli dijital baskı el ilanı.",
      category: "BASKI",
      subcategory: "El İlanı",
      price: 300,
      images: ["https://images.unsplash.com/photo-1588725354924-a7407bc46764?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Tasarım Dosyası", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Katalog Baskı",
      slug: "katalog-baski",
      description: "16-64 sayfa, A4, spiral veya tel dikişli katalog.",
      category: "BASKI",
      subcategory: "Katalog",
      price: 1500,
      images: ["https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Katalog İçeriği (PDF)", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Magnet Baskı",
      slug: "magnet-baski",
      description: "0.6mm mıknatıs levha, özel kesim seçenekli.",
      category: "BASKI",
      subcategory: "Magnet",
      price: 400,
      images: ["https://images.unsplash.com/photo-1579548122080-c35fd6820ceb?w=800"],
      stock: null,
      customizationOptions: [
        { id: "text", label: "Yazı", type: "text", enabled: true },
        { id: "image", label: "Görsel", type: "image_upload", enabled: true }
      ]
    },
    {
      name: "Sticker / Etiket Baskı",
      slug: "sticker-etiket-baski",
      description: "Yapışkanlı PP veya kağıt, özel şekil etiket.",
      category: "BASKI",
      subcategory: "Etiket",
      price: 200,
      images: ["https://images.unsplash.com/photo-1596484552834-6a58f850f0a1?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Etiket Tasarımı", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Afiş / Poster Baskı",
      slug: "afis-poster-baski",
      description: "A3/A2/A1, parlak kuşe afiş.",
      category: "BASKI",
      subcategory: "Afiş",
      price: 600,
      images: ["https://images.unsplash.com/photo-1580193769210-b8d1c049a7d9?w=800"],
      stock: null,
      customizationOptions: [
        { id: "image", label: "Poster Görseli", type: "image_upload", enabled: true },
        { id: "text", label: "Üzerine Yazılacak Metin", type: "text", enabled: true }
      ]
    },
    {
      name: "Antetli Kağıt",
      slug: "antetli-kagit",
      description: "A4, 90g, kurumsal logolu antetli kağıt.",
      category: "BASKI",
      subcategory: "Kırtasiye",
      price: 450,
      images: ["https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Firma Logosu (PNG/PDF)", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Zarf Baskı",
      slug: "zarf-baski",
      description: "DL/C5 standart, pencereli/penceresiz.",
      category: "BASKI",
      subcategory: "Kırtasiye",
      price: 350,
      images: ["https://images.unsplash.com/photo-1554593467-f273b069d32b?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Logo", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Kupon / İndirim Çeki Baskı",
      slug: "kupon-indirim-ceki",
      description: "Özel kesim, seri numaralı seçeneği.",
      category: "BASKI",
      subcategory: "Promosyon",
      price: 250,
      images: ["https://images.unsplash.com/photo-1607083206968-13611e3d76db?w=800"],
      stock: null,
      customizationOptions: [
        { id: "text", label: "İndirim Oranı / Tutar", type: "text", enabled: true },
        { id: "file", label: "Tasarım", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Cepli Dosya",
      slug: "cepli-dosya",
      description: "A4, 4 renkli baskı, karton.",
      category: "BASKI",
      subcategory: "Promosyon",
      price: 1200,
      images: ["https://images.unsplash.com/photo-1553856622-d1b352e9a211?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Dış Yüz Tasarımı", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Küp Bloknot",
      slug: "kup-bloknot",
      description: "9x9cm, 50-100 yaprak, özel baskılı.",
      category: "Baski",
      subcategory: "Promosyon",
      price: 500,
      images: ["https://images.unsplash.com/photo-1522069169874-c58e57ce8fb7?w=800"],
      stock: null,
      customizationOptions: [
        { id: "file", label: "Logo", type: "file_upload", enabled: true }
      ]
    },
    {
      name: "Faktura Solo Core",
      slug: "faktura-solo-core",
      description: "Freelancerlar, bağımsız danışmanlar ve tek kişilik işletmeler için sınırsız fatura, teklif, müşteri ve gider yönetimi sunan açık kaynak ön muhasebe platformu. Tek seferlik ömür boyu lisans, komisyonsuz ve kendi sunucunuzda çalışır.",
      category: "Teknoloji",
      subcategory: "Ön Muhasebe Yazılımı",
      price: 10000,
      images: ["/images/faktura-dashboard.svg"],
      stock: null,
      customizationOptions: [
        { id: "companyName", label: "Şirket / Marka Ünvanı", type: "text", enabled: true },
        { id: "domain", label: "Kullanılacak Domain / IP", type: "text", enabled: true }
      ]
    },
    {
      name: "Faktura Enterprise Prime",
      slug: "faktura-enterprise-prime",
      description: "Büyüyen işletmeler, ajanslar ve çoklu şirket yöneten profesyonel ekipler için uçtan uca muhasebe altyapısı. Otomatik tekrarlayan faturalar, müşteri portalı, çoklu şirket & RBAC, REST API & Webhook, öncelikli VIP destek ve anahtar teslim kurulum dahil. Tek seferlik ömür boyu lisans.",
      category: "Teknoloji",
      subcategory: "Ön Muhasebe Yazılımı",
      price: 20000,
      images: ["/images/faktura-dashboard.svg"],
      stock: null,
      customizationOptions: [
        { id: "companyName", label: "Şirket / Marka Ünvanı", type: "text", enabled: true },
        { id: "domain", label: "Kullanılacak Domain / IP", type: "text", enabled: true },
        { id: "serverAccess", label: "Kurulum Tercihi (Docker / Canlı Destek)", type: "text", enabled: true }
      ]
    },
    {
      name: "Midvem Başlangıç",
      slug: "midvem-baslangic",
      description: "Küçük işletmeler ve yeni başlayan e-ticaret siteleri için ideal başlangıç araçları. 2 Temsilci, Web Canlı Destek widget'ı, Instagram DM entegrasyonu ve temel hızlı yanıt makroları.",
      category: "Teknoloji",
      subcategory: "Müşteri İletişim Sistemi",
      price: 15000,
      images: ["/images/midvem-dashboard.svg"],
      stock: null,
      customizationOptions: [
        { id: "companyName", label: "Şirket / Marka Adı", type: "text", enabled: true },
        { id: "website", label: "Web Sitesi Adresi", type: "text", enabled: true }
      ]
    },
    {
      name: "Midvem Pro",
      slug: "midvem-pro",
      description: "WhatsApp & Yapay Zeka desteği ile satışlarını ve müşteri memnuniyetini katlamak isteyen KOBİ'ler. 5 Temsilci, Resmi WhatsApp Business API, Instagram & Messenger, Sınırsız Midvem AI Yanıt Asistanı, Canlı Ziyaretçi ve Sepet Takibi, E-Ticaret Entegrasyonu.",
      category: "Teknoloji",
      subcategory: "Müşteri İletişim Sistemi",
      price: 20000,
      images: ["/images/midvem-dashboard.svg"],
      stock: null,
      customizationOptions: [
        { id: "companyName", label: "Şirket / Marka Adı", type: "text", enabled: true },
        { id: "website", label: "Web Sitesi Adresi", type: "text", enabled: true },
        { id: "phoneForWhatsapp", label: "WhatsApp İçin Kullanılacak Hat", type: "text", enabled: true }
      ]
    },
    {
      name: "Midvem Kurumsal",
      slug: "midvem-kurumsal",
      description: "Yüksek hacimli iletişim yöneten, özel SLA ve özel entegrasyon isteyen büyük işletmeler. Sınırsız Temsilci, Tüm Kanallar + Özel Telefon/SMS, Özel Eğitilmiş Kurumsal AI Modeli, 7/24 Özel Müşteri Yöneticisi, Özel Güvenlik, SSO ve %99.9 SLA.",
      category: "Teknoloji",
      subcategory: "Müşteri İletişim Sistemi",
      price: 25000,
      images: ["/images/midvem-dashboard.svg"],
      stock: null,
      customizationOptions: [
        { id: "companyName", label: "Şirket / Marka Adı", type: "text", enabled: true },
        { id: "website", label: "Web Sitesi Adresi", type: "text", enabled: true },
        { id: "dedicatedAccount", label: "Özel Müşteri Yöneticisi Tercihi", type: "text", enabled: true }
      ]
    }
  ];

  for (const product of printProducts) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        price: product.price,
        images: product.images,
        customizationOptions: product.customizationOptions
      },
      create: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        subcategory: product.subcategory,
        price: product.price,
        images: product.images,
        stock: product.stock,
        customizationOptions: product.customizationOptions,
        isActive: true,
        isFeatured: false
      }
    });
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
