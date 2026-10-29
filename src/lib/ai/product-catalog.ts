/**
 * src/lib/ai/product-catalog.ts
 *
 * Çiçekana Teknoloji & Medya — Doğrulanmış Ürün ve Hizmet Kataloğu
 *
 * KURALLAR:
 * 1. /magaza altındaki baskı/matbaa/fiziksel ürünler kesinlikle satış kapsamı dışındadır.
 * 2. Ürün fiyatları için her zaman ayrıntılı ürün sayfasındaki (PlanTier / CMS) güncel fiyat esas alınır.
 * 3. Bilgi Bankası (KnowledgeQA / KnowledgeDocument) metinlerindeki eski fiyatlar tespit edildiğinde
 *    çakışma loglanır ([SourceConflict]) ve güncel ürün detay sayfası fiyatı önceliklendirilir.
 * 4. Sosyal Medya ve Reklam Danışmanlığı (/services/sosyal-medya-reklam-danismanligi) doğrudan sepet
 *    satışı değil, minimum 15.000 TL/ay hizmet bedelli (reklam bütçesi hariç) özel teklif/başvuru hizmetidir.
 */

import { prisma } from "@/lib/prisma";
import { formatTryPrice, getStartingPrice, getTierFeatures } from "@/lib/plan-pricing";
import { DEFAULT_ETICARET_CMS, type ETicaretCMSData } from "@/types/ecommerce-cms";

export const SITE_BASE_URL = "https://www.cicekanatechmedia.com";

export interface CatalogPackageTier {
  id: string;
  name: string;
  priceFormatted: string;
  priceMonthlyKurus: number | null;
  billingPeriod: "ay" | "yıl" | "özel";
  description: string | null;
  features: string[];
  badge: string | null;
  isRecommended: boolean;
}

export interface CatalogProduct {
  id: string;
  key: string; // canonical short key: "midvem" | "alom" | "faktura" | "scoreform" | "postify" | "e-studio" | "cicekana-erp" | "kuscu" | "microsoft-call-center-ai" | "sosyal-medya-danismanligi" | "e-ticaret" | "web-yazilim" | "genc-girisimci"
  slug: string;
  name: string;
  category: "ai_automation" | "special_offer_service" | "ecommerce" | "corporate_service";
  shortDescription: string;
  problemsSolved: string[];
  targetAudience: string;
  features: string[];
  prerequisites: string[];
  verifiedUsageLimits: string | null; // null if not publicly specified as a fixed number
  unverifiedLimitTopics: string[]; // topics that require team confirmation if asked (e.g. Alom monthly minute quota)
  startingPriceFormatted: string | null;
  vatNote: string | null;
  pricingModel: "fixed_tiers" | "special_offer_min_price" | "custom_quote";
  tiers: CatalogPackageTier[];
  packageDifferencesSummary: string;
  detailUrl: string;
  purchaseUrl: string;
  isDirectPurchase: boolean;
  faqs: Array<{ question: string; answer: string }>;
  keywords: string[];
  lastVerifiedAt: string;
  sourceType: "database_plan" | "cms_settings" | "verified_service_page";
}

export interface SourceConflictLog {
  timestamp: string;
  productKey: string;
  productName: string;
  conflictType: "PRICE_MISMATCH" | "LIMIT_AMBIGUITY";
  kbSourceExcerpt: string;
  authoritativeValue: string;
  resolution: string;
}

const recentConflicts: SourceConflictLog[] = [];

export function getRecentSourceConflicts(): SourceConflictLog[] {
  return [...recentConflicts];
}

export function logSourceConflict(conflict: Omit<SourceConflictLog, "timestamp">) {
  const entry: SourceConflictLog = {
    ...conflict,
    timestamp: new Date().toISOString(),
  };
  // Deduplicate in memory log
  const exists = recentConflicts.some(
    (c) =>
      c.productKey === entry.productKey &&
      c.conflictType === entry.conflictType &&
      c.authoritativeValue === entry.authoritativeValue
  );
  if (!exists) {
    recentConflicts.push(entry);
    if (recentConflicts.length > 100) recentConflicts.shift();
    console.warn(
      `[SourceConflict] ${entry.productName} (${entry.conflictType}): KB="${entry.kbSourceExcerpt.slice(0, 80)}..." -> Authoritative="${entry.authoritativeValue}"`
    );
  }
}

interface CatalogCache {
  items: CatalogProduct[];
  loadedAt: number;
}

let catalogCache: CatalogCache | null = null;
const CATALOG_CACHE_TTL_MS = 60_000;

export function invalidateCatalogCache() {
  catalogCache = null;
}

function resolveCanonicalKey(slug: string, name: string): string {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("midvem")) return "midvem";
  if (s.includes("alom")) return "alom";
  if (s.includes("microsoft-call-center") || s.includes("microsoft call center")) return "microsoft-call-center-ai";
  if (s.includes("faktura")) return "faktura";
  if (s.includes("scoreform")) return "scoreform";
  if (s.includes("postify")) return "postify";
  if (s.includes("e-studio") || s.includes("estudio")) return "e-studio";
  if (s.includes("cicekana-erp") || s.includes("ai-erp") || s.includes("erp")) return "cicekana-erp";
  if (s.includes("kuscu") || s.includes("kuşçu")) return "kuscu";
  return slug;
}

function getMetadataForKey(key: string): {
  problemsSolved: string[];
  targetAudience: string;
  prerequisites: string[];
  verifiedUsageLimits: string | null;
  unverifiedLimitTopics: string[];
  packageDifferencesSummary: string;
  keywords: string[];
} {
  switch (key) {
    case "midvem":
      return {
        problemsSolved: [
          "WhatsApp, Instagram DM, Facebook Messenger, web canlı destek ve e-posta mesajlarının farklı sekmelerde dağılması ve geç yanıtlanması",
          "Müşteri temsilcilerinin aynı anda gelen mesajlara yetişememesi ve mesai dışı kaçan satışlar",
          "E-ticaret (Shopify, ikas, WooCommerce) sipariş ve kargo durumu sorulurken sekme değiştirme zorunluluğu",
        ],
        targetAudience: "E-ticaret siteleri, KOBİ'ler, klinikler, hizmet işletmeleri ve müşteri destek ekipleri",
        prerequisites: [
          "Bulut tabanlı SaaS olduğu için kurulum gerektirmez; 24 saat içinde kanallar bağlanır",
          "Shopify / ikas sipariş paneli için aktif mağaza API bağlantısı yapılması gerekir",
          "WhatsApp entegrasyonu (Pro ve Kurumsal paketlerde) için resmi WhatsApp Business API bağlantısı kullanılır",
        ],
        verifiedUsageLimits:
          "Midvem Başlangıç: 2 temsilci kullanıcı hakkı | Midvem Pro: 5 temsilci kullanıcı ve sınırsız Midvem AI yanıt asistanı | Midvem Kurumsal: Sınırsız temsilci kullanıcı ve %99.9 SLA",
        unverifiedLimitTopics: [],
        packageDifferencesSummary:
          "Başlangıç paketi (1.500 TL/ay) 2 temsilci, web canlı destek widget'ı ve Instagram DM içerir. Pro paket (2.500 TL/ay) 5 temsilci, resmi WhatsApp Business, sınırsız AI yanıt asistanı ve e-ticaret (Shopify/ikas) canlı sepet/sipariş takibi ekler. Kurumsal paket (3.500 TL/ay) sınırsız temsilci, özel telefon/SMS entegrasyonu, özel AI modeli ve %99.9 SLA sunar.",
        keywords: [
          "midvem",
          "canlı destek",
          "whatsapp",
          "instagram dm",
          "omnikanal",
          "omnichannel",
          "müşteri destek",
          "mesaj yönetimi",
          "shopify",
          "ikas",
          "chatbot",
        ],
      };
    case "alom":
      return {
        problemsSolved: [
          "Yoğun telefon trafiğine yetişememe, meşgul çalan hatlar ve mesai dışında kaçan müşteri aramaları",
          "Sekreterya ve çağrı merkezi personelinin tekrarlayan sorularla (adres, fiyat, randevu) vakit kaybetmesi",
          "Telefon görüşmesi sırasında otomatik randevu oluşturma, hatırlatma araması (outbound) ve canlı temsilciye aktarım ihtiyacı",
        ],
        targetAudience: "Klinikler, sağlık merkezleri, restoran/otel işletmeleri, e-ticaret firmaları, KOBİ'ler ve yoğun telefon trafiği alan tüm işletmeler",
        prerequisites: [
          "Yönlendirme yapılabilen mevcut bir kurumsal sabit hat (0212, 0850 vb.) veya santral numarası",
          "Asistanın doğru bilgi vermesi için işletme hizmet/fiyat/çalışma kuralları senaryosu",
          "Randevu özelliği için Google Calendar veya Outlook takvim bağlantısı",
        ],
        verifiedUsageLimits: null,
        unverifiedLimitTopics: [
          "dakika",
          "kaç dakika",
          "arama hakkı",
          "görüşme süresi kotası",
          "aylık dakika limiti",
          "dakika aşım ücreti",
        ],
        packageDifferencesSummary:
          "Standart / Başlangıç Kapsamı (2.500 TL/ay + KDV) 7/24 gelen çağrıları (inbound) doğal insan sesiyle karşılar, söz kesme algılama, DTMF tuşlama, canlı temsilciye aktarım ve yazılı transkript sunar. Gelişmiş / Kurumsal Kapsam (5.000 TL/ay + KDV) bunlara ek olarak otomatik dış arama (outbound kampanya/hatırlatma), görüşme içi takvim/randevu yönetimi, harici sistemden canlı sipariş/müşteri sorgulama ve çok dilli yüksek eşzamanlı kapasite içerir.",
        keywords: [
          "alom",
          "sesli asistan",
          "çağrı merkezi",
          "telefon",
          "telefonlara yetişemiyoruz",
          "sekreter",
          "santral",
          "inbound",
          "outbound",
          "sesli yapay zeka",
          "aramaları cevaplayan",
        ],
      };
    case "microsoft-call-center-ai":
      return {
        problemsSolved: [
          "Çok dilli (50+ dil) kurumsal telefon çağrılarını Microsoft Azure ses altyapısıyla 7/24 bekletmeden karşılama",
          "Aynı anda gelen çoklu aramaları eşzamanlı yanıtlama ve kurumsal santral/CRM entegrasyonu",
        ],
        targetAudience: "50+ dilde uluslararası veya kurumsal sesli çağrı merkezi altyapısı arayan işletmeler",
        prerequisites: ["Mevcut sabit veya cep numarasının yapay zekâ hattına yönlendirilmesi"],
        verifiedUsageLimits:
          "Başlangıç Paketi: Aylık 300 dakika görüşme ve 1 eşzamanlı çağrı | Orta Ölçek Paketi: Aylık 1.000 dakika görüşme ve 3 eşzamanlı çağrı | Büyük Ölçek / Kurumsal: Yüksek hacimli özel dakika paketi ve 10+ eşzamanlı çağrı",
        unverifiedLimitTopics: [],
        packageDifferencesSummary:
          "Başlangıç Paketi (5.250 TL/ay; ürün detay sayfasında $259/ay) 300 dk/ay ve 1 eşzamanlı çağrı içerir. Orta Ölçek Paketi (10.920 TL/ay; detay sayfasında $312/ay) 1.000 dk/ay, 3 eşzamanlı çağrı, öncelikli destek ve canlı aktarım sunar. Büyük Ölçek / Kurumsal paket (25.000 TL/ay / Özel Teklif) 10+ eşzamanlı çağrı ve özel ERP/CRM/santral entegrasyonu sağlar.",
        keywords: ["microsoft call center", "azure sesli asistan", "50 dil", "microsoft çağrı merkezi"],
      };
    case "faktura":
      return {
        problemsSolved: [
          "Fatura, fiyat teklifi, gelir-gider ve ödeme takibinin dağınık tablolarla manuel yürütülmesi",
          "Tekrarlayan faturalandırma, müşteri cari mutabakatı ve çoklu şirket/marka ön muhasebe yönetimi",
        ],
        targetAudience: "Serbest çalışanlar, ajanslar, KOBİ'ler ve çoklu marka yöneten kurumsal işletmeler",
        prerequisites: ["Web tabanlı kullanım veya Enterprise Prime pakette özel sunucuya kurulum desteği"],
        verifiedUsageLimits: "Her iki pakette de sınırsız fatura ve fiyat teklifi oluşturma hakkı bulunur.",
        unverifiedLimitTopics: [],
        packageDifferencesSummary:
          "Faktura Solo Core (7.500 TL/ay) tek şirket/marka için sınırsız fatura ve teklif oluşturma, PDF motoru ve gelir/gider takibi sunar. Faktura Enterprise Prime (14.999,98 TL/ay) otomatik tekrarlayan faturalandırma, müşteri self-servis portalı, sınırsız alt şirket/marka, ekip RBAC yetkilendirme ve REST API/Webhook içerir.",
        keywords: ["faktura", "fatura", "ön muhasebe", "teklif hazırlama", "cari takip", "muhasebe", "e-fatura"],
      };
    case "scoreform":
      return {
        problemsSolved: [
          "Memnuniyetsiz müşterilerin doğrudan Google Haritalar veya Şikayetvar'a düşük puanlı yorum yazarak işletme itibarını düşürmesi",
          "Memnun müşterilerden Google yorumu toplamakta zorlanma ve şube bazlı memnuniyet ölçümü eksikliği",
        ],
        targetAudience: "Restoranlar, klinikler, oteller, yerel mağazalar, çok şubeli işletmeler ve e-ticaret markaları",
        prerequisites: ["QR kod, WhatsApp veya SMS linki ile anket paylaşımı; uygulama kurulumu gerekmez"],
        verifiedUsageLimits:
          "Temel Paket: Aylık 1.000 anket gösterimi | Pro Büyüme Paketi: Sınırsız anket gösterimi ve müşteri yanıtı",
        unverifiedLimitTopics: [],
        packageDifferencesSummary:
          "Temel Paket (5.000 TL/ay) aylık 1.000 anket gösterimi, Google Haritalar akıllı yorum yönlendirmesi ve kötü yorum filtresi (e-posta bildirimi) içerir. Pro Büyüme Paketi (7.500 TL/ay) sınırsız anket gösterimi, AI duygu analizi, anlık WhatsApp/SMS kriz bildirimleri ve çoklu şube yönetimi sunar.",
        keywords: [
          "scoreform",
          "google yorum",
          "google haritalar",
          "itibar yönetimi",
          "anket",
          "müşteri memnuniyeti",
          "kötü yorum engelleme",
          "yıldız yükseltme",
        ],
      };
    case "postify":
      return {
        problemsSolved: [
          "15+ sosyal medya ve blog kanalında ayrı ayrı içerik paylaşma ve planlama zahmeti",
          "Sosyal medya için düzenli metin/görsel üretimi, flood/zincir gönderi ve ekip onay süreçlerinin yavaşlığı",
        ],
        targetAudience: "İçerik üreticileri, KOBİ'ler, sosyal medya yöneticileri ve çoklu marka yöneten dijital ajanslar",
        prerequisites: ["Bulut tabanlıdır, bilgisayara program kurulumu gerektirmez"],
        verifiedUsageLimits: null,
        unverifiedLimitTopics: ["kanal sayısı limiti", "aylık ai kredi kotası"],
        packageDifferencesSummary:
          "Standart Paket (2.500 TL/ay + KDV) çok kanallı sosyal medya yayınlama, sürükle-bırak içerik takvimi, AI metin/görsel asistanı ve yerleşik grafik tasarım stüdyosu içerir. Profesyonel / Ajans Paketi (5.000 TL/ay + KDV) genişletilmiş kanal kapasitesi, zincir gönderi (flood), otomatik ilk yorum, Auto-Plug viral otomasyonu, RSS otomasyonu ve ekip/müşteri onay akışı ekler.",
        keywords: [
          "postify",
          "sosyal medya aracı",
          "içerik takvimi",
          "otomatik paylaşım",
          "auto-plug",
          "zamanlanmış gönderi",
          "sosyal medya yazılımı",
        ],
      };
    case "e-studio":
      return {
        problemsSolved: [
          "Fiziksel fotoğraf stüdyosu, ekipman ve manken kiralama maliyetlerinin yüksekliği ve çekimlerin haftalar sürmesi",
          "Amatör ürün fotoğraflarını pazaryeri ve reklam standartlarında profesyonel stüdyo görsellerine dönüştürme ihtiyacı",
        ],
        targetAudience: "E-ticaret satıcıları (Trendyol, Hepsiburada, Shopify, Amazon), moda/aksesuar/kozmetik markaları ve ajanslar",
        prerequisites: ["Tasarım bilgisi gerekmez; PNG, JPG ve WEBP çıktı alınır"],
        verifiedUsageLimits: null,
        unverifiedLimitTopics: ["aylık görsel üretim adedi", "kredi kotası", "kaç fotoğraf hakkı"],
        packageDifferencesSummary:
          "Standart Kapsam (2.500 TL/ay + KDV) metinden görsel üretimi, otomatik komut zenginleştirme, arka plan değiştirme (Inpaint), kadraj genişletme (Outpaint) ve çözünürlük artırma (1.5x/2x) sunar. Gelişmiş Kapsam (5.000 TL/ay + KDV) sanal manken yüz sabitleme (FaceSwap), 4'lü gelişmiş görsel referans, kenar/derinlik koruma ve toplu üretim (Batch) içerir.",
        keywords: [
          "e-studio",
          "estudio",
          "ürün fotoğrafı",
          "ürün fotoğrafçılığı",
          "sanal manken",
          "arka plan değiştirme",
          "yapay zeka fotoğraf",
          "stüdyo çekimi",
        ],
      };
    case "cicekana-erp":
      return {
        problemsSolved: [
          "Personel mesai/görev takibi, WhatsApp müşteri yazışmaları denetimi ve şubeler arası operasyonun tek merkezden kontrol edilememesi",
        ],
        targetAudience: "Büyüyen KOBİ'ler, saha/ofis ekipleri olan firmalar ve çok şubeli kurumsal işletmeler",
        prerequisites: ["Bulut tabanlı SaaS; Enterprise pakette Özel Alan Adı (Custom Domain) desteği"],
        verifiedUsageLimits: null,
        unverifiedLimitTopics: ["kullanıcı sayısı sınırı", "depolama kotası"],
        packageDifferencesSummary:
          "Profesyonel İşletme Paketi (10.000 TL/ay + KDV) WhatsApp sohbet içe aktarma, canlı ekip panosu/personel takibi ve yapay zekâ revizyon analizi sunar. Kurumsal Enterprise (25.000 TL/ay + KDV) Özel Alan Adı (Custom Domain), çoklu şube izole veri mimarisi ve öncelikli kurumsal destek sağlar.",
        keywords: ["cicekana erp", "çiçekana erp", "ai-erp", "erp", "personel takibi", "şube yönetimi", "operasyon yönetimi"],
      };
    case "kuscu":
      return {
        problemsSolved: [
          "Borsa İstanbul (BIST), küresel piyasalar, KAP bildirimleri ve bilançoların manuel takip edilemeyecek kadar yoğun olması",
        ],
        targetAudience: "Yatırımcılar, finans danışmanları, KOBİ finans ekipleri, portföy yöneticileri ve kurumlar",
        prerequisites: ["Web tabanlı finansal analiz platformu"],
        verifiedUsageLimits: "Kuşçu Başlangıç: Standart AI sorgulama limiti | Kuşçu Pro ve Kurumsal: Sınırsız AI soru-cevap ve derin sorgulama",
        unverifiedLimitTopics: [],
        packageDifferencesSummary:
          "Kuşçu Başlangıç (15.000 TL/ay) günlük haber/duygu analizi ve günlük piyasa özet raporları sunar. Kuşçu Pro (25.000 TL/ay) gerçek zamanlı analiz, bilanço AI özetleyici, sınırsız AI sorgulama ve kurumsal alarm/webhook içerir. Kuşçu Kurumsal (35.000 TL/ay) işletmeye özel finansal AI modeli, API erişimi ve portföy senaryo testleri sağlar.",
        keywords: ["kuşçu", "kuscu", "borsa", "bist", "finansal analiz", "bilanço", "piyasa zekası", "kap bildirimleri"],
      };
    default:
      return {
        problemsSolved: [],
        targetAudience: "İşletmeler ve kurumsal firmalar",
        prerequisites: [],
        verifiedUsageLimits: null,
        unverifiedLimitTopics: [],
        packageDifferencesSummary: "",
        keywords: [key],
      };
  }
}

async function loadETicaretCatalogItem(): Promise<CatalogProduct> {
  let cms: ETicaretCMSData = DEFAULT_ETICARET_CMS;
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { id: "singleton" },
    });
    const rawCms = (setting?.data as any)?.ecommerce_page_cms;
    if (rawCms && Array.isArray(rawCms.packages) && rawCms.packages.length > 0) {
      cms = { ...DEFAULT_ETICARET_CMS, ...rawCms };
    }
  } catch {
    // Fallback to DEFAULT_ETICARET_CMS
  }

  const tiers: CatalogPackageTier[] = cms.packages.map((pkg, idx) => ({
    id: pkg.id || `eticaret-tier-${idx}`,
    name: `${pkg.name} Paket`,
    priceFormatted: `${pkg.yearlyTotal} / yıl (Aylık ${pkg.monthly} karşılığı, ${pkg.installment})`,
    priceMonthlyKurus: null,
    billingPeriod: "yıl",
    description: pkg.bonus || null,
    features: (pkg.features || []).map((f) => (typeof f === "string" ? f : f.name)),
    badge: pkg.featured ? "Öne Çıkan" : null,
    isRecommended: Boolean(pkg.featured),
  }));

  return {
    id: "service-e-ticaret",
    key: "e-ticaret",
    slug: "e-ticaret",
    name: "Anahtar Teslim E-Ticaret Altyapısı ve Pazaryeri Entegrasyonu",
    category: "ecommerce",
    shortDescription:
      "Trendyol, Hepsiburada, Amazon, N11 entegrasyonlu, iOS & Android mobil uygulamalı, sınırsız trafik ve ürün kapasiteli anahtar teslim profesyonel e-ticaret paketleri.",
    problemsSolved: [
      "Yüksek komisyon ödenen pazaryerlerine bağımlı kalmadan kendi markanızla 7/24 online satış yapma ihtiyacı",
      "Tüm pazaryeri mağazalarını (Trendyol, Hepsiburada, Amazon, N11), stokları, faturaları ve kargoları tek panelden yönetme",
      "B2B bayi satışı ve e-ihracat (çoklu dil ve döviz) ile yurt dışına satış açma",
    ],
    targetAudience: "Kendi e-ticaret sitesini kurmak veya mevcut e-ticaret altyapısını büyütmek isteyen işletmeler ve markalar",
    features: [
      "Anahtar Teslim E-Ticaret Sitesi ve Sanal POS / Kargo Entegrasyonu",
      "Pazaryeri Entegrasyonları (Trendyol, Hepsiburada, Amazon, N11, Çiçeksepeti)",
      "iOS ve Android Native Mobil Uygulama",
      "Sınırsız Ürün, Trafik ve Bant Genişliği",
      "Plus Pakette: B2B Bayi Modülü, E-İhracat (Çoklu Dil & Döviz) ve AI Çapraz Satış Otomasyonu",
    ],
    prerequisites: ["Vergi levhası / şirket bilgileri (Sanal POS ve pazaryeri başvuruları için)"],
    verifiedUsageLimits: "Sınırsız trafik, sınırsız ürün ekleme ve sınırsız bant genişliği",
    unverifiedLimitTopics: [],
    startingPriceFormatted: tiers[0]?.priceFormatted || "65.000 TL / yıl",
    vatNote: "KDV Dahil, 9 Taksit İmkânı",
    pricingModel: "fixed_tiers",
    tiers,
    packageDifferencesSummary:
      "Gold Paket (65.000 TL/yıl - aylık 5.417 TL, KDV dahil) anahtar teslim e-ticaret sitesi, pazaryeri entegrasyonları, sanal POS/kargo ve iOS/Android mobil uygulama içerir. Plus Paket (200.000 TL/yıl - aylık 16.666 TL, KDV dahil) bunlara ek olarak B2B (Bayi) satış modülü, e-ihracat (çoklu dil ve döviz), yapay zekâ çapraz satış otomasyonu ve VIP destek sunar.",
    detailUrl: `${SITE_BASE_URL}/e-ticaret`,
    purchaseUrl: `${SITE_BASE_URL}/e-ticaret#paketler`,
    isDirectPurchase: true,
    faqs: (cms.faqs || []).map((f) => ({ question: f.q, answer: f.a })),
    keywords: [
      "e-ticaret",
      "eticaret",
      "online satış sitesi",
      "sanal mağaza",
      "pazaryeri entegrasyonu",
      "gold paket",
      "plus paket",
      "e-ihracat",
      "b2b e-ticaret",
    ],
    lastVerifiedAt: new Date().toISOString(),
    sourceType: "cms_settings",
  };
}

function getStaticSpecialAndCorporateServices(): CatalogProduct[] {
  return [
    {
      id: "service-sosyal-medya-reklam-danismanligi",
      key: "sosyal-medya-danismanligi",
      slug: "sosyal-medya-reklam-danismanligi",
      name: "Sosyal Medya Yönetimi ve Dijital Reklam Danışmanlığı",
      category: "special_offer_service",
      shortDescription:
        "Markanız için profesyonel sosyal medya yönetimi, içerik/Reels prodüksiyonu ve Meta (Instagram/Facebook), Google Ads, TikTok performans reklam danışmanlığı.",
      problemsSolved: [
        "Sosyal medya hesaplarının düzensiz görünmesi, organik etkileşim düşüklüğü ve profesyonel içerik/Reels üretememe",
        "Meta ve Google reklamlarında bütçenin yanlış hedeflemeyle boşa harcanması ve düşük satış/lead dönüşümü (ROAS)",
      ],
      targetAudience: "Marka bilinirliğini, müşteri taleplerini ve satışlarını profesyonel ajans yönetimiyle büyütmek isteyen işletmeler",
      features: [
        "Grup A — Kapsamlı Sosyal Medya Yönetimi: İçerik stratejisi, post & Reels prodüksiyonu, kurumsal görsel tasarım, yayın takvimi ve topluluk yönetimi",
        "Grup B — Performans Pazarlaması & Reklam Yönetimi: Meta Ads, Google Ads ve TikTok reklam kurulumu, piksel/dönüşüm takibi, A/B testleri ve ROAS optimizasyonu",
        "Grup C — 360° Büyüme & Tam Kapsam: Sosyal medya yönetimi + dijital reklam yönetimi + dönüşüm hunisi (funnel) danışmanlığı ve şeffaf aylık raporlama",
      ],
      prerequisites: [
        "Doğrudan sepete eklenen sabit paket satışı değildir; işletmenin sektörüne, yönetilecek kanal sayısına ve hedeflerine göre kapsam değerlendirmesi yapılarak özel teklif hazırlanır.",
      ],
      verifiedUsageLimits:
        "Minimum aylık hizmet bedeli 15.000 TL / ay'dan başlamaktadır (Bu tutar ajans yönetim ve danışmanlık bedelidir; reklam harcama bütçesi hariçtir).",
      unverifiedLimitTopics: [],
      startingPriceFormatted: "15.000 TL / ay (Minimum aylık hizmet bedeli; reklam bütçesi hariçtir)",
      vatNote: "Reklam harcama bütçesi hizmet bedeline dahil değildir",
      pricingModel: "special_offer_min_price",
      tiers: [
        {
          id: "social-group-a",
          name: "Grup A — Sosyal Medya Yönetimi",
          priceFormatted: "Minimum 15.000 TL / ay'dan başlayan özel teklif",
          priceMonthlyKurus: 1500000,
          billingPeriod: "özel",
          description: "İçerik stratejisi, post & Reels prodüksiyonu, yayın takvimi ve hesap yönetimi",
          features: [
            "Aylık İçerik Takvimi ve Strateji Planlama",
            "Kurumsal Post, Carousel ve Reels Tasarımı",
            "Metin Yazarlığı ve Hashtag Optimizasyonu",
            "Aylık Etkileşim ve Büyüme Raporu",
          ],
          badge: "Sosyal Medya",
          isRecommended: false,
        },
        {
          id: "social-group-b",
          name: "Grup B — Dijital Reklam & Performans Yönetimi",
          priceFormatted: "Minimum 15.000 TL / ay'dan başlayan özel teklif (Reklam bütçesi hariç)",
          priceMonthlyKurus: 1500000,
          billingPeriod: "özel",
          description: "Meta (Instagram/Facebook), Google Ads ve TikTok performans reklam yönetimi",
          features: [
            "Meta Ads & Google Ads Kampanya Kurulumu",
            "Piksel, Dönüşüm API ve Yeniden Pazarlama (Retargeting)",
            "Hedef Kitle ve Kreatif A/B Testleri",
            "ROAS Odaklı Bütçe Optimizasyonu ve Raporlama",
          ],
          badge: "Performans Reklam",
          isRecommended: false,
        },
        {
          id: "social-group-c",
          name: "Grup C — 360° Büyüme & Tam Kapsam Danışmanlık",
          priceFormatted: "Kapsama göre özel teklif (Minimum 15.000 TL / ay'dan başlar)",
          priceMonthlyKurus: 1500000,
          billingPeriod: "özel",
          description: "Sosyal medya yönetimi + reklam yönetimi + dönüşüm hunisi danışmanlığı",
          features: [
            "Grup A ve Grup B Kapsamlarının Tamamı",
            "Satış Hunisi (Funnel) ve Landing Page Danışmanlığı",
            "Özel Strateji Toplantıları ve Rakip Analizi",
          ],
          badge: "Tam Kapsam",
          isRecommended: true,
        },
      ],
      packageDifferencesSummary:
        "Sosyal medya ve reklam danışmanlığı hizmetimiz doğrudan sepet satışı değil, kapsam analizine dayalı özel teklif hizmetidir. Minimum aylık hizmet bedeli 15.000 TL/ay'dır (reklam bütçesi hariçtir). İhtiyacınıza göre Grup A (Sosyal Medya Yönetimi), Grup B (Performans Reklam Yönetimi) veya Grup C (360° Tam Kapsam) olarak kurgulanır.",
      detailUrl: `${SITE_BASE_URL}/services/sosyal-medya-reklam-danismanligi`,
      purchaseUrl: `${SITE_BASE_URL}/services/sosyal-medya-reklam-danismanligi#basvuru-formu`,
      isDirectPurchase: false,
      faqs: [
        {
          question: "Sosyal medya ve reklam danışmanlığı fiyatları ne kadar?",
          answer:
            "Sosyal medya ve reklam danışmanlığı hizmetimizde minimum aylık hizmet bedeli 15.000 TL'dir (reklam harcama bütçesi hariçtir). Net teklif; işletmenizin sektörüne, yönetilecek platformlara, içerik/Reels yoğunluğuna ve reklam hedeflerinize göre yapılan kapsam değerlendirmesiyle belirlenir.",
        },
      ],
      keywords: [
        "sosyal medya danışmanlığı",
        "reklam danışmanlığı",
        "sosyal medya yönetimi",
        "reklam yönetimi",
        "instagram reklam",
        "meta reklam",
        "google ads",
        "dijital pazarlama",
        "ajans",
        "reels çekimi",
      ],
      lastVerifiedAt: new Date().toISOString(),
      sourceType: "verified_service_page",
    },
    {
      id: "service-web-yazilim",
      key: "web-yazilim",
      slug: "technology",
      name: "Kurumsal Web Sitesi Tasarımı ve Özel Yazılım Geliştirme",
      category: "corporate_service",
      shortDescription:
        "Next.js ve modern bulut teknolojileriyle yüksek hızlı, %100 mobil ve SEO uyumlu kurumsal web siteleri, özel SaaS platformları, mobil uygulamalar ve ERP/CRM entegrasyonları.",
      problemsSolved: [
        "Yavaş açılan, mobil uyumsuz veya kurumsal güven vermeyen eski web sitelerinin yenilenmesi",
        "Standart paket yazılımların çözemediği şirkete özel iş akışı, portal, SaaS veya mobil uygulama ihtiyaçları",
      ],
      targetAudience: "Kurumsal web sitesi, özel web yazılımı veya mobil uygulama yaptırmak isteyen şirketler",
      features: [
        "Özgün UI/UX Kurumsal Web Tasarımı (%100 Mobil Uyumlu)",
        "Next.js / React Yüksek Performans ve Teknik SEO Altyapısı",
        "Çok Dilli Yönetim Paneli (CMS) ve Blog Altyapısı",
        "Özel Web Yazılımı, SaaS, Müşteri Portalı ve API/CRM Entegrasyonları",
      ],
      prerequisites: ["Proje kapsam analizi (sayfa sayısı, tasarım beklentisi, dil seçenekleri ve entegrasyonlar)"],
      verifiedUsageLimits: null,
      unverifiedLimitTopics: [],
      startingPriceFormatted: "Projeye Özel Teklif (Sabit paket fiyatı bulunmamaktadır)",
      vatNote: null,
      pricingModel: "custom_quote",
      tiers: [],
      packageDifferencesSummary:
        "Web sitesi tasarımı ve özel yazılım projelerinde sayfa sayısı, tasarım özgünlüğü, çok dilli yapı ve özel entegrasyon ihtiyaçlarına göre sabit bir fiyat yerine projeye özel teklif hazırlanmaktadır.",
      detailUrl: `${SITE_BASE_URL}/services/technology`,
      purchaseUrl: `${SITE_BASE_URL}/services/technology`,
      isDirectPurchase: false,
      faqs: [],
      keywords: [
        "web sitesi",
        "web tasarım",
        "kurumsal web",
        "özel yazılım",
        "mobil uygulama",
        "site yaptırmak",
        "yazılım geliştirme",
      ],
      lastVerifiedAt: new Date().toISOString(),
      sourceType: "verified_service_page",
    },
    {
      id: "service-genc-girisimci",
      key: "genc-girisimci",
      slug: "genc-girisimci-destegi",
      name: "Genç Girişimci Desteği (Anahtar Teslim E-Ticaret & Fulfillment)",
      category: "corporate_service",
      shortDescription:
        "E-ticarete yeni başlayan girişimcilere anahtar teslim ikas e-ticaret sitesi, nişe özel ürün tedariki, depolama, paketleme ve kargo (fulfillment) operasyonu.",
      problemsSolved: [
        "E-ticarete başlarken ne satacağını bulamama, depo kiralama ve kargo paketleme maliyetleri",
      ],
      targetAudience: "Yeni iş kuran genç girişimciler ve depo/tedarik zahmeti olmadan e-ticarete başlamak isteyenler",
      features: [
        "Anahtar Teslim ikas E-Ticaret Sitesi Kurulumu",
        "Nişe Özel Ürün Tedariki",
        "Depolama, Sipariş Paketleme ve Kargoya Teslimat (Fulfillment)",
      ],
      prerequisites: ["Başvuru ve kapsam görüşmesi"],
      verifiedUsageLimits: null,
      unverifiedLimitTopics: [],
      startingPriceFormatted: "Kapsama Göre Özel Planlama",
      vatNote: null,
      pricingModel: "custom_quote",
      tiers: [],
      packageDifferencesSummary:
        "Girişimcinin seçeceği ürün nişi ve operasyon kapsamına göre özel olarak yapılandırılır.",
      detailUrl: `${SITE_BASE_URL}/services/genc-girisimci-destegi`,
      purchaseUrl: `${SITE_BASE_URL}/services/genc-girisimci-destegi`,
      isDirectPurchase: false,
      faqs: [],
      keywords: ["genç girişimci", "girişimci desteği", "fulfillment", "ürün tedariki", "depolama"],
      lastVerifiedAt: new Date().toISOString(),
      sourceType: "verified_service_page",
    },
  ];
}

export async function getVerifiedCatalog(forceRefresh = false): Promise<CatalogProduct[]> {
  if (!forceRefresh && catalogCache && Date.now() - catalogCache.loadedAt < CATALOG_CACHE_TTL_MS) {
    return catalogCache.items;
  }

  const catalog: CatalogProduct[] = [];

  try {
    const dbPlans = await prisma.plan.findMany({
      where: { isActive: true, status: "PUBLISHED" },
      include: {
        tiers: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    for (const plan of dbPlans) {
      const key = resolveCanonicalKey(plan.slug, plan.name);
      const meta = getMetadataForKey(key);
      const startingPriceKurus = getStartingPrice(plan);
      const startingPriceFormatted =
        startingPriceKurus !== null
          ? `${formatTryPrice(startingPriceKurus)} / ay`
          : plan.priceMonthly > 0
            ? `${formatTryPrice(plan.priceMonthly)} / ay`
            : null;

      // Detect if Plan.priceMonthly (card price) differs from the lowest active PlanTier on the detail page
      if (
        startingPriceKurus !== null &&
        plan.priceMonthly > 0 &&
        plan.priceMonthly !== startingPriceKurus
      ) {
        logSourceConflict({
          productKey: key,
          productName: plan.name,
          conflictType: "PRICE_MISMATCH",
          kbSourceExcerpt: `Plan.priceMonthly=${formatTryPrice(plan.priceMonthly)}`,
          authoritativeValue: `Detail Page PlanTier starting price=${formatTryPrice(startingPriceKurus)}/ay`,
          resolution: "Used authoritative detail page PlanTier prices.",
        });
      }

      const tiers: CatalogPackageTier[] = plan.tiers.map((t) => ({
        id: t.id,
        name: t.name,
        priceFormatted: `${formatTryPrice(t.priceMonthly)} / ay`,
        priceMonthlyKurus: t.priceMonthly,
        billingPeriod: "ay",
        description: t.description,
        features: getTierFeatures(t.features),
        badge: t.badge,
        isRecommended: t.isRecommended,
      }));

      const rawFaqs = Array.isArray(plan.faqs) ? plan.faqs : [];
      const faqs = rawFaqs
        .filter(
          (f: any): f is { question: string; answer: string } =>
            Boolean(f && typeof f.question === "string" && typeof f.answer === "string")
        )
        .map((f) => ({ question: f.question, answer: f.answer }));

      const planFeatures = getTierFeatures(plan.features);
      const combinedFeatures =
        planFeatures.length > 0
          ? planFeatures
          : Array.from(new Set(tiers.flatMap((t) => t.features))).slice(0, 10);

      const detailUrl = `${SITE_BASE_URL}/services/ai-automation/${plan.slug}`;
      const purchaseUrl = `${SITE_BASE_URL}/services/ai-automation/${plan.slug}#paketler`;

      catalog.push({
        id: plan.id,
        key,
        slug: plan.slug,
        name: plan.name,
        category: "ai_automation",
        shortDescription: plan.shortDescription || plan.cardSummary || "",
        problemsSolved: meta.problemsSolved,
        targetAudience: meta.targetAudience,
        features: combinedFeatures,
        prerequisites: meta.prerequisites,
        verifiedUsageLimits: meta.verifiedUsageLimits,
        unverifiedLimitTopics: meta.unverifiedLimitTopics,
        startingPriceFormatted,
        vatNote: plan.vatNote || null,
        pricingModel: "fixed_tiers",
        tiers,
        packageDifferencesSummary: meta.packageDifferencesSummary,
        detailUrl,
        purchaseUrl,
        isDirectPurchase: true,
        faqs,
        keywords: meta.keywords,
        lastVerifiedAt: plan.updatedAt ? plan.updatedAt.toISOString() : new Date().toISOString(),
        sourceType: "database_plan",
      });
    }
  } catch (err) {
    console.warn("[ProductCatalog] Could not load DB plans, using static fallback:", err);
  }

  // Fallback if DB plans were empty (e.g. mock mode without DB connection)
  if (catalog.length === 0) {
    catalog.push(...getFallbackPlanCatalog());
  }

  const eticaretItem = await loadETicaretCatalogItem();
  catalog.push(eticaretItem);
  catalog.push(...getStaticSpecialAndCorporateServices());

  catalogCache = {
    items: catalog,
    loadedAt: Date.now(),
  };

  return catalog;
}

function getFallbackPlanCatalog(): CatalogProduct[] {
  const now = new Date().toISOString();
  const midvemMeta = getMetadataForKey("midvem");
  const alomMeta = getMetadataForKey("alom");
  const fakturaMeta = getMetadataForKey("faktura");
  const scoreformMeta = getMetadataForKey("scoreform");
  const postifyMeta = getMetadataForKey("postify");
  const estudioMeta = getMetadataForKey("e-studio");
  const erpMeta = getMetadataForKey("cicekana-erp");
  const kuscuMeta = getMetadataForKey("kuscu");

  return [
    {
      id: "plan-midvem",
      key: "midvem",
      slug: "midvem-musteri-destek-ve-iletisim-sistemi",
      name: "Midvem – Müşteri Destek ve İletişim Sistemi",
      category: "ai_automation",
      shortDescription:
        "WhatsApp, Instagram, canlı destek ve e-posta gibi tüm müşteri iletişim kanallarını tek bir ekranda birleştiren yapay zeka destekli müşteri destek sistemi.",
      ...midvemMeta,
      features: [
        "Omnichannel Tek Panel (WhatsApp, Instagram DM, Web Canlı Destek, E-posta)",
        "7/24 Yapay Zekâ Yanıt Asistanı",
        "E-Ticaret Entegrasyonu (Shopify, ikas, WooCommerce Canlı Sepet & Sipariş Takibi)",
        "Otomasyon Kuralları, Hızlı Yanıt Makroları ve SLA Yönetimi",
      ],
      startingPriceFormatted: "₺1.500 / ay",
      vatNote: null,
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "midvem-baslangic",
          name: "Midvem Başlangıç",
          priceFormatted: "₺1.500 / ay",
          priceMonthlyKurus: 150000,
          billingPeriod: "ay",
          description: null,
          features: ["2 Temsilci Kullanıcı Hakkı", "Canlı Destek Web Widget", "Instagram DM Entegrasyonu", "Temel Hızlı Yanıt Makroları"],
          badge: null,
          isRecommended: false,
        },
        {
          id: "midvem-pro",
          name: "Midvem Pro",
          priceFormatted: "₺2.500 / ay",
          priceMonthlyKurus: 250000,
          billingPeriod: "ay",
          description: null,
          features: [
            "5 Temsilci Kullanıcı",
            "Resmi WhatsApp Business Bağlantısı",
            "Instagram & Facebook Messenger",
            "Midvem AI Yanıt Asistanı (Sınırsız)",
            "Canlı Ziyaretçi & Sepet Takibi",
            "E-Ticaret Entegrasyonu (İkas, Shopify vb.)",
          ],
          badge: "Sık Tercih Edilen",
          isRecommended: true,
        },
        {
          id: "midvem-kurumsal",
          name: "Midvem Kurumsal",
          priceFormatted: "₺3.500 / ay",
          priceMonthlyKurus: 350000,
          billingPeriod: "ay",
          description: null,
          features: [
            "Sınırsız Temsilci Kullanıcı",
            "Tüm Kanallar + Özel Telefon/SMS Entegrasyonu",
            "Özel Eğitilmiş Kurumsal AI Modeli",
            "Öncelikli 7/24 Özel Müşteri Yöneticisi",
            "Özel Güvenlik, SSO & IP Kısıtlama",
            "%99.9 Kesintisiz Çalışma Garantisi (SLA)",
          ],
          badge: null,
          isRecommended: false,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-alom",
      key: "alom",
      slug: "alom-yapay-zeka-destekli-cagri-merkezi",
      name: "Alom Yapay Zeka Destekli Çağrı Merkezi",
      category: "ai_automation",
      shortDescription:
        "İşletmelerin telefon trafiğini gerçek zamanlı doğal sesli asistanlarla 7/24 karşılayan, randevu oluşturan ve gerektiğinde canlı temsilciye aktaran akıllı sesli iletişim platformu.",
      ...alomMeta,
      features: [
        "7/24 Gelen Çağrı Karşılama (Inbound) ve Doğal İnsan Sesi",
        "Gerçek Zamanlı Söz Kesme Algılama (Interruption Handling)",
        "Canlı Temsilciye Çağrı Aktarımı ve DTMF Tuş Takımı Desteği",
        "Gelişmiş Pakette: Otomatik Giden Arama (Outbound), Görüşme İçi Randevu/Takvim ve Canlı Sipariş Sorgulama",
      ],
      startingPriceFormatted: "₺2.500 / ay",
      vatNote: "+ KDV Dahil Değildir",
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "alom-standart",
          name: "Standart / Başlangıç Kapsamı",
          priceFormatted: "₺2.500 / ay",
          priceMonthlyKurus: 250000,
          billingPeriod: "ay",
          description: "Gelen çağrıları 7/24 karşılamak, sık sorulan soruları yanıtlamak ve çağrıları aktarmak isteyen KOBİ ve klinikler için idealdir.",
          features: [
            "7/24 Gelen Çağrı Karşılama (Inbound)",
            "Gerçek Zamanlı Söz Kesme Algılama",
            "Doğal İnsan Sesi ve Hız/Ton Ayarları",
            "Özelleştirilebilir Karşılama Mesajı",
            "Canlı Temsilciye Çağrı Aktarımı",
            "DTMF Tuş Takımı Desteği",
            "Çağrı Geçmişi ve Transkriptler",
          ],
          badge: "Başlangıç",
          isRecommended: false,
        },
        {
          id: "alom-gelismis",
          name: "Gelişmiş / Kurumsal Kapsam",
          priceFormatted: "₺5.000 / ay",
          priceMonthlyKurus: 500000,
          billingPeriod: "ay",
          description: "Otomatik dış aramalar, takvim randevu yönetimi ve entegre sistem sorgulamalarıyla operasyonunu büyüten işletmeler için.",
          features: [
            "Tüm Standart Özellikler Dahil",
            "Otomatik Giden Arama (Outbound) ve Kampanyalar",
            "Telesekreter Algılama ve Sesli Mesaj Bırakma",
            "Görüşme İçi Takvim ve Randevu Yönetimi",
            "Otomatik E-posta Bildirimleri",
            "Harici Sistemden Sipariş/Müşteri Bilgisi Sorgulama",
            "Çok Dilli Destek ve Yüksek Eşzamanlı Kapasite",
          ],
          badge: "Kurumsal",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/alom-yapay-zeka-destekli-cagri-merkezi`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/alom-yapay-zeka-destekli-cagri-merkezi#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-faktura",
      key: "faktura",
      slug: "faktura",
      name: "Faktura",
      category: "ai_automation",
      shortDescription: "İşletmelerin finansal süreçlerini, fatura ve fiyat tekliflerini yönetmesini sağlayan yeni nesil ön muhasebe platformu.",
      ...fakturaMeta,
      features: ["Sınırsız Fatura ve Fiyat Teklifi Oluşturma", "Gelir/Gider Raporları", "Enterprise Pakette: Otomatik Tekrarlayan Faturalandırma, Müşteri Portalı, Çoklu Şirket & API"],
      startingPriceFormatted: "₺7.500 / ay",
      vatNote: null,
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "faktura-solo",
          name: "Faktura Solo Core",
          priceFormatted: "₺7.500 / ay",
          priceMonthlyKurus: 750000,
          billingPeriod: "ay",
          description: null,
          features: ["Sınırsız Fatura ve Fiyat Teklifi Oluşturma", "Profesyonel PDF Tasarım Motoru", "Gelir/Gider Raporları", "Tek Şirket / Tek Marka Desteği"],
          badge: "Başlangıç Lisansı",
          isRecommended: false,
        },
        {
          id: "faktura-enterprise",
          name: "Faktura Enterprise Prime",
          priceFormatted: "₺15.000 / ay",
          priceMonthlyKurus: 1499998,
          billingPeriod: "ay",
          description: null,
          features: ["Otomatik Tekrarlayan Faturalandırma", "Müşteri Self-Servis Portalı", "Çoklu Şirket & Marka Desteği", "REST API & Webhook", "Özel Sunucuya Kurulum Desteği"],
          badge: "En Popüler",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/faktura`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/faktura#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-scoreform",
      key: "scoreform",
      slug: "scoreform-musteri-deneyimi-itibar-yonetimi",
      name: "ScoreForm - Müşteri Deneyimi & İtibar Yönetimi",
      category: "ai_automation",
      shortDescription: "Müşteri memnuniyetini artıran ve olumsuz yorumları Google Haritalar'a düşmeden çözmeyi sağlayan yapay zeka destekli itibar yönetim platformu.",
      ...scoreformMeta,
      features: ["Google Haritalar Akıllı Yorum Yönlendirmesi", "Kötü Yorum Filtresi & Anlık Bildirim", "QR Kod / WhatsApp Anket Paylaşımı"],
      startingPriceFormatted: "₺5.000 / ay",
      vatNote: null,
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "scoreform-temel",
          name: "Temel Paket",
          priceFormatted: "₺5.000 / ay",
          priceMonthlyKurus: 500000,
          billingPeriod: "ay",
          description: null,
          features: ["Aylık 1.000 Anket Gösterimi", "Google Haritalar Akıllı Yorum Yönlendirmesi", "Kötü Yorum Filtresi & E-posta Bildirimi"],
          badge: null,
          isRecommended: false,
        },
        {
          id: "scoreform-pro",
          name: "Pro Büyüme Paketi",
          priceFormatted: "₺7.500 / ay",
          priceMonthlyKurus: 750000,
          billingPeriod: "ay",
          description: null,
          features: ["Sınırsız Anket Gösterimi", "Yapay Zeka Duygu Analizi", "Anlık WhatsApp & SMS Kriz Bildirimleri", "Çoklu Şube Yönetimi"],
          badge: "En Popüler",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/scoreform-musteri-deneyimi-itibar-yonetimi`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/scoreform-musteri-deneyimi-itibar-yonetimi#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-postify",
      key: "postify",
      slug: "postify",
      name: "Postify",
      category: "ai_automation",
      shortDescription: "Yapay zekâ destekli çok kanallı sosyal medya ve içerik yönetim platformu.",
      ...postifyMeta,
      features: ["15+ Sosyal Ağda Tek Tıkla Yayınlama", "Yapay Zekâ Metin ve Görsel Asistanı", "Auto-Plug Viral Otomasyon ve Ekip Onay Akışı"],
      startingPriceFormatted: "₺2.500 / ay",
      vatNote: "+ KDV Dahil Değildir",
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "postify-standart",
          name: "Standart Paket",
          priceFormatted: "₺2.500 / ay",
          priceMonthlyKurus: 250000,
          billingPeriod: "ay",
          description: null,
          features: ["Çok kanallı sosyal medya yayınlama", "Görsel içerik takvimi", "Yapay zekâ metin ve görsel asistanı", "Yerleşik grafik tasarım stüdyosu"],
          badge: "Popüler",
          isRecommended: false,
        },
        {
          id: "postify-pro",
          name: "Profesyonel / Ajans Paketi",
          priceFormatted: "₺5.000 / ay",
          priceMonthlyKurus: 500000,
          billingPeriod: "ay",
          description: null,
          features: ["Genişletilmiş kanal kapasitesi", "Zincir gönderi ve otomatik ilk yorum", "Auto-Plug ve RSS otomasyonu", "Ekip yönetimi ve gönderi onay akışı"],
          badge: "Gelişmiş",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/postify`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/postify#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-estudio",
      key: "e-studio",
      slug: "e-studio",
      name: "e-Studio",
      category: "ai_automation",
      shortDescription: "Fiziksel stüdyo maliyeti olmadan dakikalar içinde profesyonel ürün fotoğrafları ve reklam kreatifleri üreten yapay zekâ platformu.",
      ...estudioMeta,
      features: ["Arka Plan Değiştirme (Inpaint)", "Kadraj Genişletme (Outpaint)", "Sanal Manken Yüz Sabitleme (FaceSwap)", "Çözünürlük Artırma (Upscale)"],
      startingPriceFormatted: "₺2.500 / ay",
      vatNote: "+ KDV Dahil Değildir",
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "estudio-standart",
          name: "Standart Kapsam",
          priceFormatted: "₺2.500 / ay",
          priceMonthlyKurus: 250000,
          billingPeriod: "ay",
          description: null,
          features: ["Metinden Görsel Üretimi", "Otomatik Komut Zenginleştirme", "Bölgesel Düzenleme (Inpaint)", "Akıllı Kadraj Genişletme (Outpaint)", "Çözünürlük Artırma (1.5x / 2x)"],
          badge: "Başlangıç",
          isRecommended: false,
        },
        {
          id: "estudio-gelismis",
          name: "Gelişmiş Kapsam",
          priceFormatted: "₺5.000 / ay",
          priceMonthlyKurus: 500000,
          billingPeriod: "ay",
          description: null,
          features: ["Standart Kapsamdaki Tüm Özellikler", "Gelişmiş Görsel Referans (4'lü Referans)", "Sanal Manken Yüz Sabitleme (FaceSwap)", "Yüksek Adetli Çoklu Üretim (Batch)"],
          badge: "Profesyonel",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/e-studio`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/e-studio#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-erp",
      key: "cicekana-erp",
      slug: "cicekana-erp",
      name: "Çiçekana AI-ERP: Yapay Zeka Destekli İşletme ve Operasyon Yönetim Sistemi",
      category: "ai_automation",
      shortDescription: "Mesajlaşma, personel takibi, yapay zeka analizleri ve çoklu şube yönetimini tek merkezden yöneten SaaS çözümü.",
      ...erpMeta,
      features: ["WhatsApp Sohbet İçe Aktarma ve AI Analizi", "Canlı Ekip Panosu ve Personel Denetimi", "Çoklu Şube Yönetimi ve Özel Alan Adı"],
      startingPriceFormatted: "₺10.000 / ay",
      vatNote: "+ KDV Dahil Değildir",
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "erp-pro",
          name: "Profesyonel İşletme Paketi",
          priceFormatted: "₺10.000 / ay",
          priceMonthlyKurus: 1000000,
          billingPeriod: "ay",
          description: null,
          features: ["WhatsApp sohbet içe aktarma", "Canlı ekip panosu ve personel takibi", "Yapay zekâ revizyon analizi"],
          badge: "Popüler",
          isRecommended: false,
        },
        {
          id: "erp-enterprise",
          name: "Kurumsal Enterprise",
          priceFormatted: "₺25.000 / ay",
          priceMonthlyKurus: 2500000,
          billingPeriod: "ay",
          description: null,
          features: ["Özel Alan Adı (Custom Domain) desteği", "Çoklu şube izole veri mimarisi", "Öncelikli kurumsal destek"],
          badge: "Özel",
          isRecommended: true,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/cicekana-erp`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/cicekana-erp#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
    {
      id: "plan-kuscu",
      key: "kuscu",
      slug: "kuscu-finansal-analiz-piyasa-zekasi-platformu",
      name: "Kuşçu - Finansal Analiz & Piyasa Zekası Platformu",
      category: "ai_automation",
      shortDescription: "BIST ve global piyasalardaki finansal haberleri, bilançoları ve piyasa verisini analiz eden yapay zeka destekli finansal akıl platformu.",
      ...kuscuMeta,
      features: ["Gerçek Zamanlı Finansal Haber & Sentiment Analizi", "Şirket Bilanço ve Faaliyet Raporu AI Özetleyici", "KAP, TCMB ve Küresel Veri Takibi"],
      startingPriceFormatted: "₺15.000 / ay",
      vatNote: null,
      pricingModel: "fixed_tiers",
      tiers: [
        {
          id: "kuscu-baslangic",
          name: "Kuşçu Başlangıç",
          priceFormatted: "₺15.000 / ay",
          priceMonthlyKurus: 1500000,
          billingPeriod: "ay",
          description: null,
          features: ["Günlük Haber ve Duygu Analizi", "Temel Borsa & Döviz Veri Akışı", "Günlük Piyasa Özet Raporları"],
          badge: "Bireysel & Küçük İşletme",
          isRecommended: false,
        },
        {
          id: "kuscu-pro",
          name: "Kuşçu Pro",
          priceFormatted: "₺25.000 / ay",
          priceMonthlyKurus: 2500000,
          billingPeriod: "ay",
          description: null,
          features: ["Gerçek Zamanlı Haber Analizi", "Bilanço AI Özetleyici", "Sınırsız AI Soru-Cevap"],
          badge: "En Popüler",
          isRecommended: true,
        },
        {
          id: "kuscu-kurumsal",
          name: "Kuşçu Kurumsal",
          priceFormatted: "₺35.000 / ay",
          priceMonthlyKurus: 3500000,
          billingPeriod: "ay",
          description: null,
          features: ["Özel Eğitilmiş Finansal AI Modeli", "API Erişim Hakkı", "Portföy Optimize Edici"],
          badge: "Kurumlar & Fonlar",
          isRecommended: false,
        },
      ],
      detailUrl: `${SITE_BASE_URL}/services/ai-automation/kuscu-finansal-analiz-piyasa-zekasi-platformu`,
      purchaseUrl: `${SITE_BASE_URL}/services/ai-automation/kuscu-finansal-analiz-piyasa-zekasi-platformu#paketler`,
      isDirectPurchase: true,
      faqs: [],
      lastVerifiedAt: now,
      sourceType: "database_plan",
    },
  ];
}

/**
 * Sayfa URL'sinden veya productId parametresinden aktif ürünü tespit eder.
 */
export function inferProductKeyFromContext(
  pageUrl?: string | null,
  productId?: string | null
): string | null {
  const combined = `${pageUrl || ""} ${productId || ""}`.toLowerCase();
  if (!combined.trim()) return null;

  if (combined.includes("midvem")) return "midvem";
  if (combined.includes("alom")) return "alom";
  if (combined.includes("microsoft-call-center")) return "microsoft-call-center-ai";
  if (combined.includes("faktura")) return "faktura";
  if (combined.includes("scoreform")) return "scoreform";
  if (combined.includes("postify")) return "postify";
  if (combined.includes("e-studio") || combined.includes("estudio")) return "e-studio";
  if (combined.includes("cicekana-erp") || combined.includes("ai-erp")) return "cicekana-erp";
  if (combined.includes("kuscu") || combined.includes("kuşçu")) return "kuscu";
  if (combined.includes("sosyal-medya-reklam-danismanligi")) return "sosyal-medya-danismanligi";
  if (combined.includes("/e-ticaret")) return "e-ticaret";
  if (combined.includes("genc-girisimci")) return "genc-girisimci";
  if (combined.includes("/services/technology")) return "web-yazilim";
  return null;
}

/**
 * Kullanıcı mesajından (ve varsa konuşma geçmişinden) hangi ürün veya hizmetin sorulduğunu tespit eder.
 */
export function detectProductKeyFromQuery(
  query: string,
  contextProductKey?: string | null,
  recentHistoryText?: string
): string | null {
  const q = query
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  // 1. Explicit product name mentions in current query
  if (/\bmidvem\b/.test(q)) return "midvem";
  if (/\balom\b/.test(q)) return "alom";
  if (/\bmicrosoft\s*call\s*center\b|\bazure\s*call\b/.test(q)) return "microsoft-call-center-ai";
  if (/\bfaktura\b/.test(q)) return "faktura";
  if (/\bscore\s*form\b|\bscoreform\b/.test(q)) return "scoreform";
  if (/\bpostify\b/.test(q)) return "postify";
  if (/\be-?studio\b|\bestudio\b/.test(q)) return "e-studio";
  if (/\bcicekana\s*erp\b|\bai-?erp\b|\berp\s*sistem|\berp\s*paket/.test(q)) return "cicekana-erp";
  if (/\bkuscu\b/.test(q)) return "kuscu";

  // 2. Specific service / domain mentions in current query
  if (
    (q.includes("sosyal medya") &&
      (q.includes("danisman") ||
        q.includes("yonetim") ||
        q.includes("ajans") ||
        q.includes("reklam") ||
        q.includes("fiyat") ||
        q.includes("ucret") ||
        q.includes("paket") ||
        q.includes("hizmet"))) ||
    (q.includes("reklam") && (q.includes("danisman") || q.includes("yonetim") || q.includes("meta") || q.includes("google ads")))
  ) {
    return "sosyal-medya-danismanligi";
  }

  if (
    (q.includes("e-ticaret") || q.includes("eticaret")) &&
    (q.includes("paket") ||
      q.includes("fiyat") ||
      q.includes("kur") ||
      q.includes("altyapi") ||
      q.includes("site") ||
      q.includes("gold") ||
      q.includes("plus"))
  ) {
    return "e-ticaret";
  }

  if (
    (q.includes("web site") || q.includes("web tasarim") || q.includes("kurumsal site") || q.includes("ozel yazilim")) &&
    !q.includes("canli destek") &&
    !q.includes("widget")
  ) {
    return "web-yazilim";
  }

  if (q.includes("genc girisimci") || q.includes("fulfillment")) {
    return "genc-girisimci";
  }

  // 3. Feature-specific unambiguous cues when no product name is explicitly given
  if (
    (q.includes("sesli asistan") || q.includes("cagri merkezi") || q.includes("telefon aramalarini") || q.includes("arama hakki") || q.includes("kac dakika")) &&
    contextProductKey !== "microsoft-call-center-ai"
  ) {
    return "alom";
  }
  if (q.includes("auto-plug") || q.includes("auto plug") || q.includes("zincir gonderi")) {
    return "postify";
  }
  if (q.includes("inpaint") || q.includes("outpaint") || q.includes("sanal manken") || q.includes("urun fotograf")) {
    return "e-studio";
  }
  if (q.includes("google harita") || q.includes("kotu yorum") || q.includes("itibar yonetim")) {
    return "scoreform";
  }
  if (q.includes("on muhasebe") || (q.includes("fatura") && q.includes("teklif") && q.includes("olusturma"))) {
    return "faktura";
  }
  if (q.includes("borsa") || q.includes("bist") || q.includes("bilanco analiz")) {
    return "kuscu";
  }

  // 4. Check recent conversation history if this is a follow-up question (e.g. "Peki fiyatı ne kadar?", "Yani?", "Kaç dakika hakkımız var?")
  if (recentHistoryText) {
    const h = recentHistoryText
      .toLocaleLowerCase("tr-TR")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c");
    if (/\balom\b/.test(h)) return "alom";
    if (/\bmidvem\b/.test(h)) return "midvem";
    if (/\bmicrosoft\s*call\s*center\b/.test(h)) return "microsoft-call-center-ai";
    if (/\bfaktura\b/.test(h)) return "faktura";
    if (/\bscoreform\b/.test(h)) return "scoreform";
    if (/\bpostify\b/.test(h)) return "postify";
    if (/\be-?studio\b/.test(h)) return "e-studio";
    if (/\bcicekana\s*erp\b|\bai-?erp\b/.test(h)) return "cicekana-erp";
    if (/\bkuscu\b/.test(h)) return "kuscu";
    if (h.includes("sosyal medya") && (h.includes("danisman") || h.includes("15.000") || h.includes("reklam"))) {
      return "sosyal-medya-danismanligi";
    }
    if (h.includes("e-ticaret") && (h.includes("gold paket") || h.includes("plus paket") || h.includes("65.000"))) {
      return "e-ticaret";
    }
  }

  // 5. Fallback to page context product key
  return contextProductKey || null;
}

/**
 * /magaza kapsamındaki fiziksel/baskı/matbaa ürünlerinin sorulup sorulmadığını tespit eder.
 * ÖNEMLİ: "Shopify mağazam var" veya "e-ticaret mağazası kurmak istiyorum" gibi yazılım
 * sorularını /magaza baskı ürünü olarak İŞARETLEMEZ.
 */
export function isMagazaStoreQuery(query: string): boolean {
  const q = query
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");

  // Direct /magaza URL or explicit print/store product keywords
  const explicitPrintKeywords = [
    "/magaza",
    "kartvizit",
    "bloknot",
    "tutkalli bloknot",
    "brosur",
    "el ilani",
    "antetli kagit",
    "cepli dosya",
    "matbaa",
    "katalog baski",
    "etiket baski",
    "cikartma sticker",
    "diplomat zarf",
    "torba zarf",
    "kuşe kagit",
    "kuse kagit",
    "gramaj",
    "baski siparis",
    "baski fiyat",
    "baski urun",
    "promosyon urun",
    "davetiye baski",
    "afis baski",
    "poster baski",
  ];

  if (explicitPrintKeywords.some((kw) => q.includes(kw))) {
    return true;
  }

  // "mağaza ürünleri", "mağazadaki ürünler", "mağazadan sipariş"
  if (
    (q.includes("magaza urun") || q.includes("magazadaki") || q.includes("magaza fiyat") || q.includes("magazadan")) &&
    !q.includes("shopify") &&
    !q.includes("ikas") &&
    !q.includes("woocommerce") &&
    !q.includes("e-ticaret") &&
    !q.includes("eticaret")
  ) {
    return true;
  }

  return false;
}

/**
 * Bilgi Bankası (KB) metninde güncel ürün detay sayfası fiyatlarıyla çelişen eski fiyatlar
 * varsa tespit eder, loglar ve güncel ürün detay sayfası fiyat bilgisini döndürür.
 */
export function sanitizeAndResolveConflictsInKBText(
  kbText: string,
  product: CatalogProduct | null
): { sanitizedText: string; hadPriceConflict: boolean } {
  if (!product || product.tiers.length === 0) {
    return { sanitizedText: kbText, hadPriceConflict: false };
  }

  let text = kbText;
  let hadPriceConflict = false;

  // Specifically check Midvem known legacy prices (7.500 TL, 15.000 TL, 25.000 TL in old KB QAs)
  if (product.key === "midvem") {
    const baslangicTier = product.tiers.find((t) => t.name.toLowerCase().includes("başlangıç") || t.name.toLowerCase().includes("baslangic")) || product.tiers[0];
    const proTier = product.tiers.find((t) => t.name.toLowerCase().includes("pro")) || product.tiers[1];
    const kurumsalTier = product.tiers.find((t) => t.name.toLowerCase().includes("kurumsal")) || product.tiers[2];

    if (/7\.?500\s*TL|15\.?000\s*TL|25\.?000\s*TL/i.test(text)) {
      hadPriceConflict = true;
      logSourceConflict({
        productKey: product.key,
        productName: product.name,
        conflictType: "PRICE_MISMATCH",
        kbSourceExcerpt: text.slice(0, 160),
        authoritativeValue: `${baslangicTier?.priceFormatted || "1.500 TL/ay"} / ${proTier?.priceFormatted || "2.500 TL/ay"} / ${kurumsalTier?.priceFormatted || "3.500 TL/ay"}`,
        resolution: "Overrode stale KB prices with live Midvem detail page PlanTier prices.",
      });

      if (baslangicTier) {
        text = text.replace(/7\.?500\s*TL(\s*\/\s*ay)?/gi, baslangicTier.priceFormatted);
      }
      if (proTier) {
        text = text.replace(/15\.?000\s*TL(\s*\/\s*ay)?/gi, proTier.priceFormatted);
      }
      if (kurumsalTier) {
        text = text.replace(/25\.?000\s*TL(\s*\/\s*ay)?/gi, kurumsalTier.priceFormatted);
      }
    }
  }

  return { sanitizedText: text, hadPriceConflict };
}

/**
 * Bir ürünün güncel paket ve fiyat bilgisini satış odaklı, net ve doğru bağlantıyla biçimlendirir.
 */
export function buildAuthoritativePricingResponse(
  product: CatalogProduct,
  options?: { isSmallBusinessQuery?: boolean; isFreeQuery?: boolean; language?: "tr" | "en" }
): string {
  const lang = options?.language || "tr";

  if (product.key === "sosyal-medya-danismanligi") {
    if (lang === "en") {
      return `Our Social Media Management & Advertising Consultancy service starts at a minimum monthly service fee of **15,000 TL / month** (excluding ad spend budget). Since the scope is tailored to your industry, platforms, and campaign goals rather than a fixed cart package, you can submit your request via our application form at ${product.purchaseUrl} or share your phone number/email here so our team can prepare a custom offer for you.`;
    }
    return `**${product.name}** hizmetimizde minimum aylık ajans hizmet bedeli **15.000 TL / ay**'dan başlamaktadır (reklam harcama bütçesi hariçtir). Bu hizmetimiz sabit sepet paketi yerine işletmenizin sektörüne, yönetilecek kanallara (Grup A Sosyal Medya, Grup B Performans Reklam veya Grup C 360° Tam Kapsam) ve hedeflerinize göre özel tekliflendirilir.\n\nDoğrudan başvuru oluşturmak için [Başvuru Formu](${product.purchaseUrl}) bağlantısını kullanabilir veya ekibimizin sizinle iletişime geçmesi için telefon numaranızı ya da e-posta adresinizi buradan paylaşabilirsiniz.`;
  }

  if (product.pricingModel === "custom_quote") {
    if (lang === "en") {
      return `For **${product.name}**, pricing is customized based on your project scope, page count, design requirements, and integrations. You can review details at ${product.detailUrl} or share your phone number/email so our team can prepare a custom quote for you.`;
    }
    return `**${product.name}** hizmetimizde sayfa sayısı, tasarım özgünlüğü ve entegrasyon ihtiyaçlarına göre sabit bir paket fiyatı yerine projeye özel teklif sunulmaktadır. Detayları [${product.name}](${product.detailUrl}) sayfamızdan inceleyebilir veya size özel teklif hazırlamamız için telefon numaranızı ya da e-posta adresinizi paylaşabilirsiniz.`;
  }

  if (options?.isFreeQuery) {
    const firstTier = product.tiers[0];
    const startText = firstTier ? `${firstTier.name} (${firstTier.priceFormatted})` : product.startingPriceFormatted || "";
    return `Hayır, **${product.name}** ürünümüzün ücretsiz bir paketi bulunmamaktadır; kesintisiz bulut ve yapay zekâ altyapısı sunduğu için aylık abonelik paketleriyle lisanslanır. Başlangıç için en uygun seçeneğimiz **${startText}** paketidir. Paketleri incelemek ve hemen satın almak için: [${product.name} Paketleri](${product.purchaseUrl})`;
  }

  if (options?.isSmallBusinessQuery && product.tiers.length > 0) {
    const firstTier = product.tiers[0];
    const secondTier = product.tiers[1];
    const featuresSample = firstTier.features.slice(0, 4).join(", ");
    let response = `Küçük işletmeler ve yeni başlayanlar için en uygun başlangıç seçeneğimiz **${firstTier.name}** (${firstTier.priceFormatted}${product.vatNote ? ` ${product.vatNote}` : ""}) paketimizdir; bu pakette ${featuresSample} özellikleri yer alır.`;
    if (secondTier) {
      response += ` İşletmeniz büyüdükçe ${secondTier.features.slice(0, 3).join(", ")} avantajları için **${secondTier.name}** (${secondTier.priceFormatted}) paketine geçebilirsiniz.`;
    }
    response += `\n\nPaketleri detaylı incelemek ve hemen satın almak için: [${product.name} Satın Alma Sayfası](${product.purchaseUrl})`;
    return response;
  }

  const tierLines = product.tiers.map((t) => {
    const featText = t.features.slice(0, 4).join(", ");
    const recBadge = t.isRecommended ? " *(Önerilen)*" : "";
    return `• **${t.name}${recBadge}:** ${t.priceFormatted}${product.vatNote ? ` (${product.vatNote})` : ""} — ${featText}`;
  });

  if (lang === "en") {
    return `Here are the current verified packages and prices for **${product.name}** on our product page:\n\n${tierLines.join("\n")}\n\nYou can review the full package details and purchase directly at: ${product.purchaseUrl}`;
  }

  return `**${product.name}** ürün sayfasındaki güncel paket ve fiyatlarımız şu şekildedir:\n\n${tierLines.join("\n")}\n\nİhtiyacınıza uygun paketi seçip doğrudan satın almak için: [${product.name} Paketleri](${product.purchaseUrl})`;
}
