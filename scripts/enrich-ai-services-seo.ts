import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== ENRICHING AI SERVICES SEO & GEO DATA IN DATABASE ===");

  // 1. MIDVEM
  const midvemFaqs = [
    {
      question: "Midvem nedir ve işletmelere nasıl avantaj sağlar?",
      answer:
        "Midvem; WhatsApp Business, Instagram DM, web sitesi canlı destek ve e-posta gibi tüm müşteri iletişim kanallarını tek bir ekranda toplayan, yapay zeka destekli kurumsal müşteri destek ve iletişim sistemidir. Talepleri 7/24 anında karşılar, müşteri temsilcilerinin iş yükünü azaltır ve satış dönüşüm oranlarını artırır.",
    },
    {
      question: "Midvem kurulumu ne kadar sürer?",
      answer:
        "Midvem bulut tabanlı bir SaaS yazılımıdır. Teknik ekibimiz WhatsApp Business API, Instagram ve web widget entegrasyonlarını 24 saat içinde eksiksiz tamamlar ve sisteminizi hemen kullanıma hazır hale getirir.",
    },
    {
      question: "Midvem e-ticaret altyapılarıyla (İkas, Shopify, WooCommerce vb.) entegre çalışır mı?",
      answer:
        "Evet; Midvem İkas, Shopify, WooCommerce ve özel e-ticaret sistemleriyle tam entegre çalışır. Temsilciler ve yapay zeka botu müşteri sipariş durumunu, kargo hareketlerini ve canlı sepet bilgilerini doğrudan sohbet panelinde görüntüler.",
    },
    {
      question: "Midvem AI yanıt asistanı nasıl çalışır ve eğitilir?",
      answer:
        "Midvem AI asistanı, firmanızın ürün kataloğu, hizmet koşulları, sık sorulan soruları ve kurumsal diliyle eğitilir. Müşterilerin sorularına insan doğallığında, 7/24 kesintisiz ve doğru yanıtlar sunar.",
    },
    {
      question: "Midvem'de taahhüt zorunluluğu var mı? İptal koşulları nelerdir?",
      answer:
        "Hayır, bağlayıcı yıllık taahhüt zorunluluğu yoktur. Aboneliğinizi profil panelinizden dilediğiniz an tek tıkla iptal edebilirsiniz. İptal durumunda mevcut fatura döneminizin sonuna kadar hizmet kesintisiz devam eder.",
    },
    {
      question: "Müşteri verileri ve konuşmalar KVKK standartlarına uygun korunur mu?",
      answer:
        "Evet. Tüm veri aktarımları 256-bit SSL şifreleme ile güvence altındadır. Midvem KVKK ve kurumsal gizlilik standartlarına %100 uyumludur; verileriniz asla izinsiz üçüncü taraflarla paylaşılmaz veya genel modellerin eğitimi için kullanılmaz.",
    },
  ];

  const midvemBenefits = [
    {
      icon: "MessageSquare",
      title: "Omnichannel Tek Panel",
      description:
        "WhatsApp Business, Instagram DM, web canlı destek ve e-posta mesajlarını tek ekranda toplayın ve yönetin.",
      badge: "Tüm Kanallar",
    },
    {
      icon: "Bot",
      title: "7/24 Kesintisiz AI Yanıtı",
      description:
        "Müşterilerinize bekleme süresi olmadan, firmanızın kurumsal diliyle eğitilmiş yapay zeka ile anında yanıt verin.",
      badge: "Midvem AI",
    },
    {
      icon: "ShoppingCart",
      title: "E-Ticaret & Canlı Sepet Takibi",
      description:
        "İkas, Shopify ve WooCommerce ile sipariş sorgulama, kargo takibi ve terk edilmiş sepetleri anında görün.",
      badge: "Entegrasyon",
    },
    {
      icon: "Ticket",
      title: "Bilet (Ticket) & Ekip Yönetimi",
      description:
        "Gelen talepleri otomatik önceliklendirin, temsilcilerinize paylaştırın ve SLA performansını ölçümleyin.",
      badge: "Yönetim",
    },
  ];

  const midvemSteps = [
    {
      title: "24 Saatte Hızlı Kurulum & API Entegrasyonu",
      description:
        "Teknik ekibimiz WhatsApp Business API, web widget ve sosyal medya hesaplarınızı 24 saat içinde sisteme bağlar.",
    },
    {
      title: "Kurumsal AI Modelinin Eğitilmesi",
      description:
        "Ürün ve hizmet kataloglarınız, SSS belgeleriniz ve şirket kurallarınız sisteme yüklenerek AI asistanınız hazır hale getirilir.",
    },
    {
      title: "Canlıya Geçiş & 7/24 Destek",
      description:
        "Sisteminiz yayına alınır; dedike müşteri temsilciniz ve 7/24 teknik izleme ile kesintisiz çalışır.",
    },
  ];

  const midvem = await prisma.plan.findFirst({
    where: { slug: { contains: "midvem" } },
  });

  if (midvem) {
    await prisma.plan.update({
      where: { id: midvem.id },
      data: {
        tagline: "Omnichannel Müşteri Destek & İletişim CRM",
        heroHeadline: "Midvem – AI Müşteri Destek ve İletişim Sistemi",
        heroSubheadline:
          "WhatsApp, Instagram DM, canlı sohbet ve e-postayı tek merkezde toplayan, 7/24 yapay zeka yanıt asistanlı kurumsal müşteri destek yazılımı.",
        metaTitle: "Midvem Müşteri Destek ve İletişim Sistemi | AI Otomasyon — Çiçekana",
        metaDescription:
          "Midvem, işletmelerin WhatsApp, Instagram, canlı destek ve e-posta kanallarını tek ekranda birleştiren, yapay zeka destekli müşteri destek ve iletişim yazılımıdır.",
        benefits: midvemBenefits,
        steps: midvemSteps,
        faqs: midvemFaqs,
        cardSummary:
          "WhatsApp, Instagram, canlı destek ve e-postayı tek ekranda toplayan, 7/24 yapay zeka yanıt asistanlı müşteri destek sistemi.",
      },
    });
    console.log("✓ Midvem SEO & FAQ verileri güncellendi.");
  }

  // 2. FAKTURA
  const fakturaFaqs = [
    {
      question: "Faktura nedir ve hangi süreçleri kapsar?",
      answer:
        "Faktura; e-fatura, e-arşiv, e-irsaliye ve muhasebe mutabakat süreçlerini yapay zeka algoritmalarıyla otomatikleştiren, Gelir İdaresi Başkanlığı (GİB) uyumlu yeni nesil finans ve e-dönüşüm platformudur.",
    },
    {
      question: "Faktura mevcut muhasebe yazılımımızla entegre çalışabilir mi?",
      answer:
        "Evet; Logo, Mikro, Netsis, Paraşüt, Bizmu ve yaygın tüm kurumsal ERP yazılımlarıyla API düzeyinde çift yönlü tam entegrasyon sağlar.",
    },
  ];

  const faktura = await prisma.plan.findFirst({
    where: { slug: { contains: "faktura" } },
  });

  if (faktura) {
    await prisma.plan.update({
      where: { id: faktura.id },
      data: {
        tagline: "AI Destekli Finans & E-Dönüşüm Platformu",
        heroHeadline: "Faktura – Akıllı Finans ve E-Fatura Otomasyonu",
        heroSubheadline:
          "E-fatura kesimi, gider ayrıştırma ve banka mutabakatlarını yapay zeka ile otomatikleştirerek muhasebe hatalarını sıfırlayın.",
        metaTitle: "Faktura — AI Destekli Finans & E-Dönüşüm Platformu | Çiçekana",
        metaDescription:
          "E-fatura, e-arşiv ve finansal mutabakat süreçlerini yapay zeka ile otomatikleştiren GİB uyumlu akıllı finans platformu.",
        faqs: (Array.isArray(faktura.faqs) && (faktura.faqs as any[]).length > 0) ? faktura.faqs : fakturaFaqs,
      },
    });
    console.log("✓ Faktura SEO & FAQ verileri güncellendi.");
  }

  // 3. KUŞÇU
  const kuscuFaqs = [
    {
      question: "Kuşçu Finansal Analiz Platformu nedir?",
      answer:
        "Kuşçu; Borsa İstanbul (BIST), küresel hisse senedi piyasaları, kripto varlıklar ve makroekonomik verileri gerçek zamanlı analiz eden, yapay zeka destekli piyasa zekası ve sinyal platformudur.",
    },
    {
      question: "Kuşçu hangi veri kaynaklarını kullanır?",
      answer:
        "KAP bildirimleri, TCMB ve FED faiz kararları, bilanço açıklamaları ve gerçek zamanlı borsa emir defteri verilerini analiz eder.",
    },
  ];

  const kuscu = await prisma.plan.findFirst({
    where: { slug: { contains: "kuscu" } },
  });

  if (kuscu) {
    await prisma.plan.update({
      where: { id: kuscu.id },
      data: {
        metaTitle: "Kuşçu — Finansal Analiz & Piyasa Zekası Platformu | Çiçekana",
        metaDescription:
          "BIST ve küresel piyasaları gerçek zamanlı analiz eden, yapay zeka destekli piyasa zekası ve finansal sinyal platformu.",
        faqs: (Array.isArray(kuscu.faqs) && (kuscu.faqs as any[]).length > 0) ? kuscu.faqs : kuscuFaqs,
      },
    });
    console.log("✓ Kuşçu SEO & FAQ verileri güncellendi.");
  }

  console.log("=== ALL AI SERVICES SEO & GEO DATA ENRICHED SUCCESSFULLY ===");
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
