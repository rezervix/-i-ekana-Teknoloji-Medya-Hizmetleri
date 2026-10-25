/**
 * Structured Data (Schema.org / JSON-LD) Generator
 * Optimizes for Google Rich Results, AI Overviews, Perplexity, and ChatGPT Search (GEO).
 */

import { getSiteUrl } from "@/lib/site-url";

export interface SchemaTier {
  id?: string;
  name?: string;
  priceMonthly?: number;
  description?: string | null;
  features?: unknown;
  isRecommended?: boolean;
}

export interface SchemaPlan {
  id?: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  heroHeadline?: string | null;
  heroSubheadline?: string | null;
  cardSummary?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  heroMockupUrl?: string | null;
  heroImageAlt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  features?: unknown;
  benefits?: unknown;
  faqs?: unknown;
  tiers?: SchemaTier[];
  updatedAt?: string | Date;
}

export const DEFAULT_SITE_URL = getSiteUrl();

export const ORGANIZATION_SCHEMA = {
  "@type": "Organization",
  "@id": `${DEFAULT_SITE_URL}#organization`,
  name: "Çiçekana Teknoloji & Medya",
  alternateName: ["Çiçekana", "Cicekana Tech & Media", "Çiçekana Teknoloji"],
  url: DEFAULT_SITE_URL,
  logo: {
    "@type": "ImageObject",
    "@id": `${DEFAULT_SITE_URL}#logo`,
    url: `${DEFAULT_SITE_URL}/favicon.ico`,
    caption: "Çiçekana Teknoloji & Medya",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+90-530-341-21-56",
      contactType: "customer service",
      areaServed: "TR",
      availableLanguage: ["Turkish", "English"],
    },
  ],
  sameAs: [
    "https://www.instagram.com/cicekanatechmedia",
    "https://www.linkedin.com/company/cicekana",
    "https://x.com/cicekanamedia",
  ],
};

/**
 * Fallback curated high-quality FAQs per product if DB is empty
 */
export const PRODUCT_FALLBACK_FAQS: Record<string, Array<{ question: string; answer: string }>> = {
  "midvem-musteri-destek-ve-iletisim-sistemi": [
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
  ],
  "faktura": [
    {
      question: "Faktura nedir?",
      answer:
        "Faktura, işletmelerin e-fatura, e-arşiv ve finansal belge süreçlerini yapay zeka ile otomatikleştiren, Gelir İdaresi Başkanlığı (GİB) uyumlu akıllı finans ve e-dönüşüm platformudur.",
    },
    {
      question: "Faktura muhasebe ve ERP programlarıyla entegre olur mu?",
      answer:
        "Evet, Faktura yaygın tüm muhasebe ve ERP yazılımlarıyla API üzerinden entegre olarak fatura eşleştirme ve mutabakat işlemlerini saniyeler içinde tamamlar.",
    },
    {
      question: "Faktura kurulumu ne kadar sürer?",
      answer:
        "Kurulum ve entegrasyon süreci uzman ekibimiz tarafından 24-48 saat içinde tamamlanarak canlıya alınır.",
    },
  ],
  "scoreform-musteri-deneyimi-itibar-yonetimi": [
    {
      question: "ScoreForm nedir ve ne işe yarar?",
      answer:
        "ScoreForm, işletmelerin Google Haritalar, Trustpilot ve diğer inceleme platformlarındaki müşteri yorumlarını ve itibarını otomatik olarak toplayan, yapay zeka ile analiz eden ve pozitif geri bildirimleri artıran itibar yönetimi platformudur.",
    },
    {
      question: "ScoreForm negatif yorumları nasıl yönetir?",
      answer:
        "Negatif geri bildirimleri anında tespit edip yetkili ekibinize bildirim gönderir ve müşteriye özel yapıcı çözüm önerileri sunarak itibar kaybını önler.",
    },
  ],
  "kuscu-finansal-analiz-piyasa-zekasi-platformu": [
    {
      question: "Kuşçu Finansal Analiz Platformu nedir?",
      answer:
        "Kuşçu; BIST, küresel piyasalar, kripto varlıklar ve makroekonomik verileri gerçek zamanlı analiz eden, yapay zeka destekli piyasa zekası ve sinyal platformudur.",
    },
    {
      question: "Kuşçu hangi yatırımcılara yöneliktir?",
      answer:
        "Bireysel profesyonel yatırımcılardan fon yöneticilerine ve kurumsal hazinelere kadar veri odaklı piyasa kararları almak isteyen tüm aktörler için uygundur.",
    },
  ],
  "microsoft-call-center-ai": [
    {
      question: "Microsoft Call Center AI nasıl çalışır?",
      answer:
        "Microsoft Azure AI ve ses modellerini kullanan çağrı merkezi çözümümüz, gelen telefonları bekletmeden yanıtlar, müşterinin niyetini doğal dille anlar, soruları çözer ve karmaşık talepleri ilgili müşteri temsilcisine aktarır.",
    },
    {
      question: "Hangi dilleri destekler?",
      answer:
        "Türkçe ve İngilizce başta olmak üzere 50'den fazla dilde akıcı, insan doğallığında çift yönlü sesli iletişim sağlayabilir.",
    },
  ],
};

/**
 * Build rich JSON-LD graph for a single AI automation plan/product page
 */
export function buildPlanJsonLd(plan: SchemaPlan, baseUrl = DEFAULT_SITE_URL) {
  const canonicalUrl = `${baseUrl}/services/ai-automation/${plan.slug}`;
  const heroImage = plan.heroMockupUrl || plan.imageUrl || `${baseUrl}/favicon.ico`;
  const heroSubtitle =
    plan.heroSubheadline || plan.shortDescription || plan.cardSummary || plan.name;

  const tiers: SchemaTier[] = Array.isArray(plan.tiers) ? plan.tiers : [];

  // 1. BreadcrumbList
  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hizmetlerimiz",
        item: `${baseUrl}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "AI Otomasyon",
        item: `${baseUrl}/services/ai-automation`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: plan.name,
        item: canonicalUrl,
      },
    ],
  };

  // 2. Offers list with valid absolute URLs
  const offers = tiers.map((tier) => {
    const tierName = tier.name || "Standart Paket";
    const tierPrice =
      typeof tier.priceMonthly === "number" ? (tier.priceMonthly / 100).toFixed(2) : "0.00";
    return {
      "@type": "Offer",
      "@id": `${canonicalUrl}#tier-${tier.id || tierName.toLowerCase().replace(/\s+/g, "-")}`,
      name: tierName,
      description: tier.description || `${plan.name} - ${tierName}`,
      price: tierPrice,
      priceCurrency: "TRY",
      availability: "https://schema.org/InStock",
      url: `${canonicalUrl}#paketler`,
      priceValidUntil: "2027-12-31",
      seller: {
        "@type": "Organization",
        name: "Çiçekana Teknoloji & Medya",
        url: baseUrl,
      },
    };
  });

  // 3. Extract feature list strings
  const featureList: string[] = [];
  if (Array.isArray(plan.features)) {
    plan.features.forEach((f) => {
      if (typeof f === "string") featureList.push(f);
      else if (f && typeof f === "object" && "title" in f && typeof (f as any).title === "string") {
        featureList.push((f as any).title);
      }
    });
  }
  tiers.forEach((t) => {
    if (Array.isArray(t.features)) {
      t.features.forEach((f) => {
        if (typeof f === "string" && !featureList.includes(f)) {
          featureList.push(f);
        }
      });
    }
  });

  // 4. SoftwareApplication & Product Schema
  const softwareApplicationSchema = {
    "@type": ["SoftwareApplication", "Product"],
    "@id": `${canonicalUrl}#software`,
    name: plan.name,
    alternateName: plan.name.split("–")[0]?.trim() || plan.name,
    description: heroSubtitle,
    url: canonicalUrl,
    image: heroImage,
    applicationCategory:
      plan.category ||
      (plan.slug.includes("midvem")
        ? "Customer Support CRM / Help Desk"
        : "BusinessApplication"),
    operatingSystem: "All modern web browsers, Cloud SaaS, iOS, Android",
    softwareVersion: "2.0",
    featureList: featureList.length > 0 ? featureList : undefined,
    brand: {
      "@type": "Brand",
      name: "Çiçekana Teknoloji & Medya",
    },
    manufacturer: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "Çiçekana Teknoloji & Medya",
      url: baseUrl,
    },
    provider: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "Çiçekana Teknoloji & Medya",
      url: baseUrl,
    },
    offers: offers.length > 0 ? offers : undefined,
  };

  // 5. Service Schema
  const serviceSchema = {
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    name: plan.name,
    serviceType: plan.category || "AI Otomasyon & Yazılım Çözümleri",
    description: heroSubtitle,
    provider: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "Çiçekana Teknoloji & Medya",
      url: baseUrl,
    },
    areaServed: {
      "@type": "Country",
      name: "TR",
    },
    hasOfferCatalog:
      offers.length > 0
        ? {
            "@type": "OfferCatalog",
            name: `${plan.name} Abonelik Paketleri`,
            itemListElement: offers,
          }
        : undefined,
  };

  // 6. FAQs Schema (Use DB faqs if present, else fallback)
  let rawFaqs: Array<{ question: string; answer: string }> = [];
  if (Array.isArray(plan.faqs) && plan.faqs.length > 0) {
    rawFaqs = plan.faqs.filter(
      (item): item is { question: string; answer: string } =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof item.question === "string" &&
            typeof item.answer === "string"
        )
    );
  }
  if (rawFaqs.length === 0 && PRODUCT_FALLBACK_FAQS[plan.slug]) {
    rawFaqs = PRODUCT_FALLBACK_FAQS[plan.slug];
  }

  const faqSchema =
    rawFaqs.length > 0
      ? {
          "@type": "FAQPage",
          "@id": `${canonicalUrl}#faq`,
          mainEntity: rawFaqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  const graph = [
    ORGANIZATION_SCHEMA,
    breadcrumbSchema,
    softwareApplicationSchema,
    serviceSchema,
    ...(faqSchema ? [faqSchema] : []),
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

/**
 * Build rich JSON-LD graph for the AI Automation directory / listing page (/services/ai-automation)
 */
export function buildAIAutomationListJsonLd(plans: SchemaPlan[], baseUrl = DEFAULT_SITE_URL) {
  const pageUrl = `${baseUrl}/services/ai-automation`;

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hizmetlerimiz",
        item: `${baseUrl}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "AI Otomasyon Hizmetlerimiz",
        item: pageUrl,
      },
    ],
  };

  const itemListElements = plans.map((plan, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${baseUrl}/services/ai-automation/${plan.slug}`,
    name: plan.name,
    description: plan.cardSummary || plan.shortDescription || plan.name,
    image: plan.imageUrl || plan.heroMockupUrl || undefined,
  }));

  // Include Microsoft Call Center AI
  itemListElements.push({
    "@type": "ListItem",
    position: itemListElements.length + 1,
    url: `${baseUrl}/services/ai-automation/microsoft-call-center-ai`,
    name: "Microsoft Call Center AI - Yapay Zeka Destekli Çağrı Merkezi Çözümü",
    description:
      "Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, her dili anlayan ve insan doğallığında konuşan kurumsal yapay zeka çözümü.",
    image: undefined,
  });

  const collectionSchema = {
    "@type": "CollectionPage",
    "@id": `${pageUrl}#collection`,
    url: pageUrl,
    name: "AI Otomasyon Hizmetlerimiz — Çiçekana Teknoloji & Medya",
    description:
      "Kurumsal iş süreçlerinizi optimize eden, ölçeklenebilir ve güvenli yapay zeka çözümlerini keşfedin.",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${baseUrl}#website`,
      name: "Çiçekana Teknoloji & Medya",
      url: baseUrl,
    },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: itemListElements,
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [ORGANIZATION_SCHEMA, breadcrumbSchema, collectionSchema],
  };
}

/**
 * Build rich JSON-LD graph for the static Microsoft Call Center AI page
 */
export function buildMicrosoftCallCenterJsonLd(baseUrl = DEFAULT_SITE_URL) {
  const pageUrl = `${baseUrl}/services/ai-automation/microsoft-call-center-ai`;

  const breadcrumbSchema = {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hizmetlerimiz",
        item: `${baseUrl}/services`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "AI Otomasyon",
        item: `${baseUrl}/services/ai-automation`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: "Microsoft Call Center AI",
        item: pageUrl,
      },
    ],
  };

  const softwareSchema = {
    "@type": ["SoftwareApplication", "Service"],
    "@id": `${pageUrl}#software`,
    name: "Microsoft Call Center AI — Yapay Zeka Çağrı Merkezi",
    description:
      "Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, her dili anlayan ve insan doğallığında konuşan yapay zeka çağrı merkezi çözümü.",
    applicationCategory: "CallCenterAI / VoiceBot CRM",
    operatingSystem: "Cloud, VoIP, SIP Trunk, Microsoft Azure AI",
    provider: {
      "@type": "Organization",
      "@id": `${baseUrl}#organization`,
      name: "Çiçekana Teknoloji & Medya",
      url: baseUrl,
    },
    url: pageUrl,
  };

  const faqs = PRODUCT_FALLBACK_FAQS["microsoft-call-center-ai"] || [];
  const faqSchema = {
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [ORGANIZATION_SCHEMA, breadcrumbSchema, softwareSchema, faqSchema],
  };
}
