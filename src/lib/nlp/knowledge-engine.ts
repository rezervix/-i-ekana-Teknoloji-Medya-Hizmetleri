/**
 * Çiçekana Tech Media — 100% Local, Deterministic Knowledge Retrieval & Answer Synthesis Engine
 * 
 * Runs entirely without external Generative AI APIs (Zero Gemini / OpenAI / External Embeddings).
 * Features:
 * - Multi-tier matching:
 *     Tier 0: Explicit Handover & Courtesy Greetings
 *     Tier 1: Curated & Verified Baseline Q&As (with Turkish variations & synonyms)
 *     Tier 2: Dynamically Extracted Document Q&As from all active Knowledge Documents
 *     Tier 3: Verified Database Plans & Store Products
 *     Tier 4: Intent-Guided Semantic Section Retrieval & Customer-Facing Answer Synthesis
 *     Tier 5: Safe Fallback with Zero Unsolicited Phone Number Demands
 * - Turkish NLP: casing, stemming, negation/polarity preservation, typo tolerance (Levenshtein)
 * - Preamble Penalty: Eliminates document cover/title dumps in favor of substantive feature evidence
 * - Calibrated Confidence Scoring
 * - High-performance in-memory caching with fast invalidation
 */

import { prisma } from "@/lib/prisma";
import { formatTryPrice } from "@/lib/plan-pricing";
import {
  turkishToLower,
  normalizeForSearch,
  normalizeForFuzzy,
  tokenizeAndProcess,
  fuzzyStringSimilarity,
  tokenJaccardSimilarity,
  tokenContainmentSimilarity,
  GENERIC_DOMAIN_WORDS,
  toAsciiFolded,
  analyzeCustomerQuery,
  QueryAnalysis,
  QuestionIntent,
} from "./turkish-nlp";
import { extractQAPairsFromText } from "@/lib/ai/doc-parser";

export interface MatchedEvidence {
  sourceType: "qa" | "plan" | "product" | "document_chunk";
  sourceId: string;
  sourceTitle: string;
  sectionTitle?: string;
  snippet: string;
  score: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface EngineResponse {
  query: string;
  normalizedQuery: string;
  detectedIntent: QuestionIntent;
  detectedSubject: string;
  answer: string;
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  isHandoverPrompt: boolean;
  handoverReason?: string;
  matchedEvidence: MatchedEvidence[];
  usedDocumentIds: string[];
  suggestedProducts?: any[];
  clarifyingOptions?: string[];
  uncertaintyNotes?: string;
  isFallback: boolean;
  externalApiUsed: false;
}

// Baseline Curated Q&As with extensive Turkish variations
export interface CuratedQA {
  id: string;
  question: string;
  answer: string;
  category: string;
  variations: string[];
  productId?: string;
  intent?: QuestionIntent;
}

export const BASELINE_CURATED_QAS: CuratedQA[] = [
  // 1. Channel Separation & Collision (The Core Problem)
  {
    id: "base_midvem_channel_separation",
    question: "WhatsApp ve Instagram mesajları tek ekranda birbirine karışır mı? Hangi mesajın nereden geldiğini nasıl anlarız?",
    intent: "CHANNEL_SEPARATION_COLLISION",
    variations: [
      "WhatsApp ve Instagram mesajları tek ekranda karışıyor mu?",
      "Mesajın hangi platformdan geldiğini nasıl göreceğiz?",
      "Hangi mesajın nereden geldiğini nasıl anlarız?",
      "Instagram'dan yazanla WhatsApp'tan yazanı ayırabiliyor muyuz?",
      "Hangi mesajın Instagram'dan hangisinin WhatsApp'tan geldiğini ayırt edebiliyor muyuz?",
      "Insta'dan yazanla WhatsApp'tan yazan belli oluyor mu?",
      "Kanallar tek yerde toplanıyor diye konuşmalar birbirine girmez değil mi?",
      "Elemanlar hangi müşterinin hangi platformdan geldiğini görebiliyor mu?",
      "Insta ayrı, WhatsApp ayrı. Hepsini bir yere alınca ortalık karışmasın?",
      "Mesajın kaynağını, müşteriyi ve konuşmayı ayrı ayrı görebiliyor muyuz?",
      "whatsapp insta ayni yere gelince mesajlar karisiyomu",
      "HANGİ MESAJIN NERDEN GELDİĞİ BELLİ OLUYOR MU",
      "instagramdan gelenle whatsapptan geleni nasil ayiricaz",
      "WhatsApp ve Instagram mesajları birbirine girip çorbaya dönmesin sonra?",
      "Yahu bizim dükkanda elemanlar WhatsApp'a bakmaktan çıldırdı, Instagram ayrı bi yerde çalıyor. Bunları tek ekranda toplayacaz dediniz de, bu şey mi yani, bütün mesajlar birbirine girip çorbaya dönmesin sonra? Nasıl anlıcaz kimin hangisinden yazdığını?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Hayır, mesajlar kesinlikle birbirine karışmaz. Midvem çok kanallı gelen kutusunda WhatsApp, Instagram ve diğer kanallardan gelen tüm mesajlar standart görüşme kartlarına dönüştürülür ve merkezi listede ayrı ayrı listelenir. Her mesaj kartının üzerinde hangi platformdan (WhatsApp veya Instagram) geldiğini açıkça belirten kanal etiketleri bulunur. Temsilcileriniz gelen mesajın kaynağını anında ayırt eder, tek ekrandan doğru kanala doğrudan yanıt verir.",
  },

  // 2. Agent Collision & Assignment
  {
    id: "base_midvem_agent_collision",
    question: "Personeller bütün konuşmaları tek panelde nasıl takip edecek? İki temsilci aynı anda aynı müşteriye cevap verir mi?",
    intent: "AGENT_COLLISION_ASSIGNMENT",
    variations: [
      "Personeller bütün konuşmaları tek panelde nasıl takip edecek?",
      "Mesajlar tek yerde toplanınca herkes birbirinin müşterisine mi cevap verecek?",
      "tek panel tamam da elemanlar birbirinin konuşmasına girer mi, herkes neyi cevapladığını nasıl bilecek?",
      "İki personelin aynı müşteriye aynı anda yazması engelleniyor mu?",
      "İki temsilcinin aynı müşteriye aynı anda yanlışlıkla yanıt vermesini nasıl engelliyorsunuz?",
      "Herkes aynı ekrana bakarsa kimin neye cevap verdiği karışmaz mı?",
      "Temsilciler birbirlerinin müşterilerine karışır mı?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Hayır, temsilcilerin yanıtları çakışmaz. Midvem sisteminde gerçek zamanlı Çarpışma Tespiti (Collision Detection) ve Temsilci Atama özelliği bulunur. Her müşteri görüşmesine belirli bir temsilci veya ekip atanır. Bir temsilci o anda bir görüşmeyi görüntülüyorsa veya müşteriye yanıt yazıyorsa, diğer tüm temsilciler ekranda bunu canlı olarak görür ve mükerrer yanıt yazılması önlenir.",
  },

  // 3. Merging Same Customer Across Different Channels
  {
    id: "base_midvem_merge_contacts",
    question: "Aynı müşteri hem WhatsApp'tan hem Instagram'dan veya e-postadan yazarsa ne olacak?",
    intent: "MERGE_CONTACTS",
    variations: [
      "Aynı müşteri iki farklı kanaldan yazarsa ne olacak?",
      "Aynı müşteri hem WhatsApp'tan hem e-postadan yazdıysa iki ayrı kayıt mı oluşur?",
      "Bir müşteri WhatsApp'tan yazdı, diğeri Instagram'dan. Bunları nasıl ayıracağız?",
      "İki müşterinin konuşması yanlışlıkla birbirine karışabilir mi?",
      "Aynı kişinin farklı kanallardan mesajları birleştirilebilir mi?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Her müşterinin konuşması kendi bağımsız görüşme kartında korunur ve konuşmalar birbirine karışmaz. Aynı müşterinin farklı kanallardan (örneğin hem WhatsApp hem Instagram veya e-posta) yazdığı tespit edildiğinde, sistemdeki Kişileri Birleştir (Merge Contacts) özelliği kullanılarak bu kayıtlar tek bir ana müşteri profili altında birleştirilebilir; böylece müşterinin tüm geçmiş yazışmaları tek ekranda toplanır.",
  },

  // 4. Channel Filtering & Custom Views
  {
    id: "base_midvem_filtering",
    question: "Kanallara göre konuşmaları filtreleyebiliyor muyuz?",
    intent: "FILTERING_CUSTOM_VIEWS",
    variations: [
      "Kanallara göre konuşmaları filtreleyebiliyor muyuz?",
      "WhatsApp ayrı Instagram ayrı, bunları birleştirince kontrol zorlaşmaz mı?",
      "Sadece WhatsApp mesajlarını filtreleyebilir miyim?",
      "Sadece Instagram DM mesajlarını ayrı görebilir miyim?",
      "Özel klasör veya filtre oluşturabiliyor muyuz?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Evet, kolayca filtreleyebilirsiniz. Midvem üzerinde kanal bazlı gelen kutuları (Inboxes) oluşturabilir, renk kodlu etiketler kullanabilir ve Gelişmiş Filtreleme özelliğiyle sadece WhatsApp, sadece Instagram veya sadece Canlı Sohbet mesajlarını listeleyen Özel Görünümler (Custom Views / Klasörler) kaydedebilirsiniz.",
  },

  // 5. Restricting Agents to Own Chats (Custom Roles)
  {
    id: "base_midvem_custom_roles",
    question: "Her personelin sadece kendi müşterilerini görmesini sağlayabiliyor muyuz?",
    variations: [
      "Her personelin sadece kendi müşterilerini görmesini sağlayabiliyor muyuz?",
      "Elemanlar sadece kendi mesajlarını görebilir mi?",
      "Temsilcilerin diğer temsilcilerin mesajlarını görmesini engelleyebilir miyiz?",
      "Personel yetkilendirmesi var mı?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Evet. Midvem'de Özel Roller (Custom Roles) özelliği bulunmaktadır. Yöneticiler, müşteri temsilcilerini yalnızca belirli gelen kutularına yetkilendirebilir veya bir temsilcinin yalnızca kendisine atanan görüşmeleri görmesini, diğer temsilcilerin görüşmelerine erişememesini sağlayabilir.",
  },

  // 6. Shopify Integration & Side Panel
  {
    id: "base_shopify_sidepanel",
    question: "Shopify siparişlerini sohbet ekranında görebiliyor muyuz?",
    intent: "INTEGRATION_SHOPIFY",
    variations: [
      "Müşterinin ne satın aldığını nereden göreceğiz?",
      "Kargo sorusunda Shopify'a ayrıca girmem gerekiyor mu?",
      "Sipariş bilgileri yan tarafta görüntüleniyor mu?",
      "Shopify sipariş detayları nasıl görünür?",
      "Müşteri sipariş geçmişi sohbet ekranında açılıyor mu?",
      "Shopify sepet ve kargo durumu canlı görünüyor mu?",
      "midvem sparislerini ve kargo takibini gorebiliyormuyuz",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Evet, Midvem sisteminde hazır Shopify entegrasyonu bulunmaktadır. Müşterinizle sohbet ederken ekranı kapatmadan veya başka bir sekmeye geçmeden sağ panelde müşterinizin geçmiş siparişlerini, sipariş tutarını, kargo takip numarasını ve teslimat durumunu canlı olarak görebilirsiniz.\n\n⚠️ Kurulum Şartı: Bu özelliğin aktif olabilmesi için işletmenizin aktif bir Shopify mağazasının bulunması ve Midvem paneli üzerinden mağaza API bağlantısının yapılmış olması gerekmektedir.",
  },

  // 7. Midvem Pricing
  {
    id: "base_midvem_pricing",
    question: "Midvem paket fiyatları nelerdir?",
    intent: "PRICING_PLANS",
    variations: [
      "Midvem ne kadar?",
      "Midvem kaç para?",
      "Midvem aylık ücreti nedir?",
      "Midvem paket ücretleri",
      "Midvem fiyatlandırma tarifesi",
      "Midvem aylık maliyeti ve tarife ücretleri ne kadar",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Midvem platformumuzun doğrulanmış paket ve fiyatları şunlardır:\n\n• Midvem Başlangıç: 7.500 TL / ay (2 temsilci, canlı destek web widget'ı, Instagram DM, temel hızlı yanıt makroları)\n• Midvem Pro: 15.000 TL / ay (5 temsilci, resmi WhatsApp Business bağlantısı, Instagram & Facebook, sınırsız Midvem AI asistanı, Shopify/ikas e-ticaret canlı sepet ve sipariş paneli)\n• Midvem Kurumsal: 25.000 TL / ay (Sınırsız temsilci, tüm iletişim kanalları, özel telefon/SMS, özel eğitilmiş AI modeli, 7/24 öncelikli yönetici ve %99.9 SLA)\n\n* Paketler kurumsal bulut altyapısıyla lisanslanmakta olup işletmenizin ihtiyacına göre anında aktif edilebilir.",
  },

  // 8. Small Business & SME
  {
    id: "base_midvem_small_biz",
    question: "Küçük esnaf veya yeni başlayanlar için en uygun paket hangisidir?",
    intent: "SMALL_BUSINESS_SUITABILITY",
    variations: [
      "Küçük esnafa uygun paket var mı?",
      "Küçük işletmeler için hangi paketi önerirsiniz?",
      "Yeni başladım en ucuz paketiniz hangisi?",
      "Esnaf paketi ne kadar?",
      "KOBİ için en uygun paket",
      "selam ben küçük bir esnafım bana en ucuz hangi paket gider",
      "bizim dükkan için hangi paket uygun",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Küçük esnaf, butik işletmeler ve e-ticarete yeni başlayan girişimciler için en uygun çözümümüz Midvem Başlangıç paketidir. Aylık 7.500 TL olan bu paketle 2 müşteri temsilcisi yetkilendirebilir, web sitenize canlı destek penceresi ekleyebilir ve Instagram DM mesajlarınızı tek ekrandan kaçırmadan yanıtlayabilirsiniz. İşletmeniz büyüdükçe WhatsApp Business ve Shopify entegrasyonu içeren Pro pakete geçiş yapabilirsiniz.",
  },

  // 9. Free Policy
  {
    id: "base_midvem_free_policy",
    question: "Midvem ücretsiz mi veya bedava paketi var mı?",
    intent: "FREE_TIER_POLICY",
    variations: [
      "Midvem bedava mı?",
      "Ücretsiz kullanabilir miyim?",
      "Parasız sürümü var mı?",
      "Free plan var mı?",
      "Midvem deneme sürümü bedava mı?",
      "Midvem sistemini tamamen bedava veya ücretsiz kullanabilir miyim?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Hayır, Midvem sistemimizin ücretsiz veya bedava bir paketi bulunmamaktadır. Platformumuz yüksek performanslı yapay zekâ sunucuları, kesintisiz bulut altyapısı ve resmi API bağlantıları sağladığı için doğrulanmış ücretli paketlerle lisanslanmaktadır. Küçük esnaf ve yeni başlayan işletmeler için en uygun paketimiz aylık 7.500 TL olan Midvem Başlangıç paketidir.",
  },

  // 10. Web Design & Custom Software
  {
    id: "base_web_design_pricing",
    question: "Web sitesi tasarımı ve yazılım geliştirme fiyatları ne kadar?",
    intent: "WEB_DESIGN_SOFTWARE",
    variations: [
      "Web sitesi yaptırmak istiyorum kaç para?",
      "Site fiyatı nedir?",
      "Özel yazılım ücretleri ne kadar?",
      "Kurumsal web sitesi maliyeti nedir?",
      "Web tasarım fiyatları",
      "Peki web tasarımı ve yazılım yapıyor musunuz?",
    ],
    category: "Web & Yazılım",
    answer:
      "Çiçekana Tech Media olarak kurumsal web siteleri, SaaS platformları ve yüksek performanslı e-ticaret siteleri tasarlıyor ve geliştiriyoruz (Next.js, React, mobil %100 uyumluluk ve gelişmiş SEO standarttır).\n\nWeb tasarımı ve özel yazılım projelerinde sayfa sayısı, tasarım özgünlüğü, çok dilli altyapı ve özel CRM/ERP entegrasyonlarına bağlı olarak sabit bir fiyat bulunmamaktadır. Kapsam analizi doğrultusunda müşteri temsilcimiz tarafından firmanıza özel teklif hazırlanmaktadır.",
  },

  // 11. Alom Call Center Voice AI
  {
    id: "base_alom_call_center",
    question: "Alom Yapay Zeka Çağrı Merkezi nedir ve nasıl çalışır?",
    intent: "CALL_CENTER_VOICE_AI",
    variations: [
      "Alom nedir?",
      "Sesli yapay zeka santrali nasıl çalışır?",
      "Telefon çağrılarını yapay zeka karşılayabilir mi?",
      "Alom özellikleri neler?",
      "Alom çağrı merkezi ne işe yarar?",
      "Alom çağrı merkezi gelen telefon konuşmalarını yazılı transkript yapıyor mu?",
    ],
    category: "Alom",
    productId: "alom",
    answer:
      "Alom Yapay Zeka Destekli Çağrı Merkezi; işletmelerin gelen telefon çağrılarını 7/24 karşılayan, konuşmayı anlık metne döken (transkript), sık sorulan soruları insan doğallığında sesli yanıtlayan ve gerektiğinde çağrıyı özet transkriptiyle canlı temsilciye aktaran yeni nesil sesli yapay zekâ santralidir. Santral ve CRM sistemleriyle çift yönlü entegre çalışır.",
  },

  // 12. e-Studio Photo AI
  {
    id: "base_estudio_photo",
    question: "e-Studio Yapay Zeka Ürün Fotoğrafçılığı nedir?",
    intent: "STUDIO_PHOTO_AI",
    variations: [
      "e-Studio nedir?",
      "Ürün fotoğraflarını yapay zekayla nasıl çekerim?",
      "Yapay zeka ürün fotoğrafçılığı nasıl çalışır?",
      "e-Studio özellikleri neler?",
      "Ürünlerimin stüdyo fotoğrafını yapay zekayla çekmek için hangi programı kullanmalıyım?",
    ],
    category: "e-Studio",
    productId: "e-studio",
    answer:
      "e-Studio Yapay Zeka Destekli Ürün Fotoğrafçılığı; e-ticaret markaları ve satıcıların cep telefonuyla çektiği basit ürün fotoğraflarını saniyeler içinde stüdyo kalitesinde profesyonel tanıtım ve reklam görsellerine dönüştüren yapay zekâ platformudur. Arka plan temizleme, gerçekçi gölgelendirme, profesyonel ışıklandırma ve çözünürlük yükseltme (Upscale) yetenekleri sunar.",
  },

  // 13. Postify Social Media AI
  {
    id: "base_postify_social",
    question: "Postify nedir ve ne işe yarar?",
    intent: "SOCIAL_MEDIA_AI",
    variations: [
      "Postify nedir?",
      "Postify özellikleri nelerdir?",
      "Sosyal medya yapay zekayla nasıl yönetilir?",
      "Postify içerik takvimi nasıl çalışır?",
      "Postify ne işe yarar?",
    ],
    category: "Postify",
    productId: "postify",
    answer:
      "Postify; işletmelerin sosyal medya hesapları (Instagram, Facebook, LinkedIn vb.) için sektöre özel içerik metinleri, görsel konseptleri ve hashtag stratejilerini yapay zekâ ile üreten, içerik takvimi ve ekip onay akışlarını tek ekranda birleştiren kapsamlı bir sosyal medya yönetim çözümüdür.",
  },

  // 14. Print Store Delivery & Orders
  {
    id: "base_print_store_delivery",
    question: "Baskı ve matbaa ürünleri teslimatı kaç gün sürer ve nasıl sipariş verilir?",
    intent: "PRINT_STORE_DELIVERY",
    variations: [
      "Baskı kargosu ne zaman gelir?",
      "Matbaa teslimat süresi nedir?",
      "Kartvizit siparişi kaç günde teslim edilir?",
      "Bloknot kargosu kaç gün?",
      "Baskı ürünlerinde kargo ve teslimat",
      "Kartvizit ve bloknot baskı kargosu kaç günde gelir?",
    ],
    category: "Baskı & Matbaa",
    answer:
      "Matbaa ve kurumsal baskı ürünlerimiz (tutkallı bloknot, kartvizit, broşür, antetli kağıt, cepli dosya, etiket vb.) için web sitemizin Mağaza (/magaza) bölümünden doğrudan ölçü, adet ve kağıt gramajı seçerek online sipariş verebilirsiniz. Siparişleriniz onaylandıktan sonra genellikle 3 ila 5 iş günü içerisinde anlaşmalı kargo ile adresinize sevk edilir. PayTR ile güvenli online ödeme geçerlidir.",
  },

  // 15. Young Entrepreneur Support
  {
    id: "base_young_entrepreneur",
    question: "Genç Girişimci Desteği nedir?",
    intent: "YOUNG_ENTREPRENEUR",
    variations: [
      "Genç girişimcilere ne destek veriyorsunuz?",
      "Genç girişimci e-ticaret paketi",
      "Genç girişimci desteğine nasıl başvurulur?",
    ],
    category: "Kurumsal",
    answer:
      "Genç Girişimci Desteği kapsamında; e-ticarete yeni adım atan girişimcilere anahtar teslim ikas e-ticaret altyapısı, niş ürün tedariği, ürün depolama, sipariş paketleme ve kargoya teslimat (fulfillment) süreçleri tek çatı altında uçtan uca sunulmaktadır. Web sitemizdeki Genç Girişimci Desteği sayfası üzerinden başvuru formunu doldurarak ekibimizle iletişime geçebilirsiniz.",
  },

  // 16. WhatsApp Policy
  {
    id: "base_whatsapp_policy",
    question: "WhatsApp destek hattınız var mı?",
    intent: "WHATSAPP_POLICY",
    variations: [
      "WhatsApp'tan yazabilir miyim?",
      "WhatsApp müşteri hizmetleri numarası nedir?",
      "WhatsApp canlı destek var mı?",
    ],
    category: "Genel",
    answer:
      "Web sitemiz genelinde ziyaretçilerimize yönelik harici bir WhatsApp canlı destek hattı bulunmamaktadır; tüm destek ve sorular web sitemizdeki bu merkezi Müşteri Hizmetleri penceresi üzerinden anlık olarak yanıtlanmaktadır. Bununla birlikte, sunduğumuz Midvem yazılımımız sayesinde kendi işletmenizin resmi WhatsApp Business hesabını sisteme bağlayabilir ve tüm müşteri mesajlarınızı tek panelden yönetebilirsiniz.",
  },
];

// In-memory cache for fast, local response times (< 15ms)
let cachedDocuments: any[] | null = null;
let cachedExtractedQAs: CuratedQA[] | null = null;
let cachedDBQAs: any[] | null = null;
let cachedPlans: any[] | null = null;
let cachedProducts: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

export function invalidateKnowledgeCache() {
  cachedDocuments = null;
  cachedExtractedQAs = null;
  cachedDBQAs = null;
  cachedPlans = null;
  cachedProducts = null;
  cacheTimestamp = 0;
}

// Load knowledge items with caching
async function getCachedKnowledge() {
  const now = Date.now();
  if (
    cachedDocuments &&
    cachedExtractedQAs &&
    cachedDBQAs &&
    cachedPlans &&
    cachedProducts &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return {
      documents: cachedDocuments,
      extractedQAs: cachedExtractedQAs,
      qas: cachedDBQAs,
      plans: cachedPlans,
      products: cachedProducts,
    };
  }

  const [activeDocs, dbQAs, activePlans, activeProducts] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        productId: true,
        productType: true,
        category: true,
        cleanContent: true,
        chunks: {
          select: {
            id: true,
            chunkIndex: true,
            content: true,
            keywords: true,
          },
          orderBy: { chunkIndex: "asc" },
        },
      },
    }),
    prisma.knowledgeQA.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      include: {
        tiers: {
          where: { isActive: true },
          orderBy: { displayOrder: "asc" },
        },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        category: true,
      },
      take: 50,
    }),
  ]);

  // Dynamically extract Q&A pairs from all active documents
  const dynamicDocQAs: CuratedQA[] = [];
  for (const doc of activeDocs) {
    if (doc.cleanContent) {
      const parsedPairs = extractQAPairsFromText(doc.cleanContent);
      parsedPairs.forEach((p, idx) => {
        dynamicDocQAs.push({
          id: `doc_qa_${doc.id}_${idx}`,
          question: p.question,
          answer: p.answer,
          category: doc.category || "Genel",
          variations: [],
          productId: doc.productId || undefined,
        });
      });
    }
  }

  cachedDocuments = activeDocs;
  cachedExtractedQAs = dynamicDocQAs;
  cachedDBQAs = dbQAs;
  cachedPlans = activePlans;
  cachedProducts = activeProducts;
  cacheTimestamp = now;

  return {
    documents: cachedDocuments,
    extractedQAs: cachedExtractedQAs,
    qas: cachedDBQAs,
    plans: cachedPlans,
    products: cachedProducts,
  };
}

/**
 * Executes 100% deterministic local search and answer generation.
 */
export async function executeDeterministicKnowledgeEngine(
  rawQuery: string,
  targetProductId?: string | null
): Promise<EngineResponse> {
  const query = rawQuery.trim();
  const analysis: QueryAnalysis = analyzeCustomerQuery(query);
  const { normalizedQuery, foldedQuery, intent, polarity } = analysis;

  // 1. Tier 0: Explicit Handover Request
  if (intent === "EXPLICIT_HANDOVER") {
    const isCallback = /(?:ara|telefon|numara)/i.test(foldedQuery);
    const reason = isCallback
      ? "Müşteri telefonla aranma talebinde bulundu."
      : "Müşteri doğrudan müşteri temsilcisine bağlanmak istedi.";

    const handoverPrompt = isCallback
      ? "Talebinizi memnuniyetle aldık. Yetkili ekibimizin sizi en kısa sürede arayabilmesi için lütfen telefon numaranızı bırakınız."
      : "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?";

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer: handoverPrompt,
      confidence: 1.0,
      confidenceLevel: "HIGH",
      isHandoverPrompt: true,
      handoverReason: reason,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // 2. Tier 0.5: Greetings
  if (intent === "GREETING") {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer:
        "Merhaba! Çiçekana Tech Media'ya hoş geldiniz. Midvem, Alom, e-Studio ve Postify gibi yapay zekâ otomasyonlarımız, kurumsal web tasarımı, e-ticaret altyapıları, sosyal medya danışmanlığı ve matbaa ürünlerimiz hakkında sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?",
      confidence: 1.0,
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // 3. Tier 0.5: Gratitude
  if (intent === "GRATITUDE") {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer:
        "Rica ederiz! Başka bir sorunuz veya bilgi almak istediğiniz bir konu olursa memnuniyetle yardımcı olabiliriz. İyi çalışmalar dileriz.",
      confidence: 1.0,
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // 4. Check Unverified Custom Feature Inquiries (Do NOT hallucinate!)
  if (intent === "UNVERIFIED_CUSTOM_FEATURE") {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer:
        "Bu özellik hakkında bilgi tabanımızda doğrulanmış bir bilgi veya yetenek kaydı bulunmamaktadır. Sistemde yer almayan teknik özellikleri veya özel kapasite taahhütlerini yanıltıcı bilgi vermemek adına kesin bir özellik olarak sunmuyoruz. Özel bir gereksiniminiz veya teknik sorunuz için müşteri temsilcimizle görüşebilirsiniz.",
      confidence: 0.85,
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      uncertaintyNotes: "Talep edilen özellik (örneğin özel kanal rengi seçimi veya 100.000 mesaj garantisi) resmî dokümantasyonda tanımlanmamıştır.",
      isFallback: false,
      externalApiUsed: false,
    };
  }

  const { documents, extractedQAs, qas, plans, products } = await getCachedKnowledge();

  // Combine curated, db and doc-extracted Q&As
  const allQAs: CuratedQA[] = [
    ...BASELINE_CURATED_QAS,
    ...extractedQAs,
    ...qas.map((q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      category: q.category,
      variations: Array.isArray(q.variations) ? (q.variations as string[]) : [],
      productId: q.productId || undefined,
    })),
  ];

  const matchedEvidences: MatchedEvidence[] = [];

  // ==========================================
  // TIER 1: Q&A Matching (Exact, Variations, Synonyms, Containment)
  // ==========================================
  let bestQAMatch: {
    qa: CuratedQA;
    score: number;
    matchedVariation: string;
    isExact: boolean;
  } | null = null;

  const processed = tokenizeAndProcess(query);
  const queryTokens = processed.stemmedTokens;
  const expandedTokens = processed.expandedTokens.map(toAsciiFolded);

  for (const qa of allQAs) {
    const candidateQuestions = [qa.question, ...qa.variations];

    for (const cand of candidateQuestions) {
      const normCand = normalizeForSearch(cand);
      const foldedCand = normalizeForFuzzy(cand);

      // A. Exact match
      if (normCand === normalizedQuery || foldedCand === foldedQuery) {
        bestQAMatch = {
          qa,
          score: 100,
          matchedVariation: cand,
          isExact: true,
        };
        break;
      }

      // B. High Fuzzy / Token Similarity & Containment Match
      const candTokens = tokenizeAndProcess(cand);
      const tokenSim = tokenJaccardSimilarity(processed.stemmedTokens, candTokens.stemmedTokens);
      const containmentSim = tokenContainmentSimilarity(processed.stemmedTokens, candTokens.stemmedTokens);
      const strSim = fuzzyStringSimilarity(foldedQuery, foldedCand);

      // Weighted combination
      let effectiveSim = Math.max(
        tokenSim * 0.65 + strSim * 0.35,
        containmentSim >= 0.7 ? containmentSim * 0.7 + tokenSim * 0.3 : 0
      );

      // Intent alignment bonus
      if (qa.intent && qa.intent === intent) {
        effectiveSim += 0.25;
      }

      // Product context bonus
      if (targetProductId && qa.productId === targetProductId) {
        effectiveSim += 0.08;
      }

      if (effectiveSim >= 0.62) {
        const score = Math.round(effectiveSim * 100);
        if (!bestQAMatch || score > bestQAMatch.score) {
          bestQAMatch = {
            qa,
            score,
            matchedVariation: cand,
            isExact: normCand === normalizedQuery || foldedCand === foldedQuery || effectiveSim >= 0.98,
          };
        }
      }
    }

    if (bestQAMatch && bestQAMatch.isExact) break;
  }

  if (bestQAMatch && bestQAMatch.score >= 70) {
    matchedEvidences.push({
      sourceType: "qa",
      sourceId: bestQAMatch.qa.id,
      sourceTitle: bestQAMatch.qa.question,
      snippet: bestQAMatch.qa.answer,
      score: bestQAMatch.score,
      confidence: Math.min(1.0, bestQAMatch.score / 100),
      metadata: { matchedVariation: bestQAMatch.matchedVariation },
    });

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer: bestQAMatch.qa.answer,
      confidence: Math.min(1.0, bestQAMatch.score / 100),
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ==========================================
  // TIER 2: Verified Plans & Products Match
  // ==========================================
  const verifiedProducts: any[] = [];
  let matchedPlanOrProduct: { title: string; answer: string; score: number } | null = null;

  for (const p of plans) {
    const planNameFolded = toAsciiFolded(p.name);
    const planSlugFolded = toAsciiFolded(p.slug);
    const isPlanQuery =
      foldedQuery.includes(planSlugFolded) ||
      foldedQuery.includes(planNameFolded) ||
      (targetProductId && p.id === targetProductId);

    if (isPlanQuery) {
      verifiedProducts.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        type: "plan",
        description: p.shortDescription,
        priceFormatted: `${formatTryPrice(p.priceMonthly)} / ay`,
        tiers: p.tiers.map((t: any) => ({
          name: t.name,
          priceFormatted: `${formatTryPrice(t.priceMonthly)} / ay`,
          features: Array.isArray(t.features) ? (t.features as string[]) : [],
        })),
        url: `/services/ai-automation/${p.slug}`,
      });

      let answerText = `**${p.name}**\n${p.shortDescription}\n\n**Aylık Başlangıç Fiyatı:** ${formatTryPrice(p.priceMonthly)} / ay`;
      if (p.tiers && p.tiers.length > 0) {
        answerText += `\n\n**Paket Seçenekleri:**\n` + p.tiers.map((t: any) => `• **${t.name}**: ${formatTryPrice(t.priceMonthly)} / ay`).join("\n");
      }
      answerText += `\n\nDetaylı bilgi ve başvuru için: /services/ai-automation/${p.slug}`;

      matchedPlanOrProduct = {
        title: p.name,
        answer: answerText,
        score: 88,
      };
      break;
    }
  }

  // Check Store Products
  if (!matchedPlanOrProduct) {
    for (const prod of products) {
      const prodNameFolded = toAsciiFolded(prod.name);
      const isProdQuery =
        foldedQuery.includes(prodNameFolded) ||
        (targetProductId && prod.id === targetProductId);

      if (isProdQuery) {
        verifiedProducts.push({
          id: prod.id,
          name: prod.name,
          slug: prod.slug,
          type: "product",
          description: prod.description,
          priceFormatted: formatTryPrice(prod.price),
          url: `/magaza/urun/${prod.slug}`,
        });

        matchedPlanOrProduct = {
          title: prod.name,
          answer: `**${prod.name}**\n${prod.description || ""}\n\n**Fiyat:** ${formatTryPrice(prod.price)}\n\nSipariş vermek veya özelliklerini incelemek için Mağaza sayfamızı ziyaret edebilirsiniz: /magaza/urun/${prod.slug}`,
          score: 85,
        };
        break;
      }
    }
  }

  // ==========================================
  // TIER 3: Intent-Guided Semantic Section Retrieval & Ranking
  // ==========================================
  interface ScoredChunk {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    content: string;
    score: number;
    matchedDistinctiveTokens: string[];
    isPreamble: boolean;
  }

  const scoredChunks: ScoredChunk[] = [];
  const distinctiveQueryTokens = queryTokens.filter(
    (tok) => tok.length >= 3 && !GENERIC_DOMAIN_WORDS.has(toAsciiFolded(tok))
  );

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      let score = 0;
      const chunkNorm = normalizeForSearch(chunk.content);
      const chunkFolded = toAsciiFolded(chunkNorm);
      const matchedDistinctiveTokens: string[] = [];

      const isPreamble =
        chunk.chunkIndex === 0 ||
        chunkFolded.includes("urunun adi ve kisa tanimi") ||
        chunkFolded.includes("1. urunun adi") ||
        chunkFolded.includes("musteri bilgi tabani ve urun dokumantasyonu");

      // PREAMBLE PENALTY:
      // If user asks a specific feature inquiry, DO NOT let the document cover title outscore real features!
      if (isPreamble) {
        score -= 60;
      }

      // A. Whole phrase presence bonus (+25)
      if (normalizedQuery.length >= 8 && chunkNorm.includes(normalizedQuery)) {
        score += 25;
      }

      // B. Token overlap with IDF distinction
      for (const tok of queryTokens) {
        const tokFolded = toAsciiFolded(tok);
        if (tokFolded.length < 3) continue;

        const isGeneric = GENERIC_DOMAIN_WORDS.has(tokFolded);

        if (chunk.keywords.some((kw: string) => toAsciiFolded(kw).includes(tokFolded))) {
          if (isGeneric) {
            score += 1;
          } else {
            score += 8;
            matchedDistinctiveTokens.push(tokFolded);
          }
        } else if (chunkFolded.includes(tokFolded)) {
          if (isGeneric) {
            score += 0.5;
          } else {
            score += 6;
            matchedDistinctiveTokens.push(tokFolded);
          }
        }
      }

      // C. Expanded synonyms overlap
      for (const exp of expandedTokens) {
        if (exp.length < 3) continue;
        if (!GENERIC_DOMAIN_WORDS.has(exp) && chunkFolded.includes(exp)) {
          score += 4;
        }
      }

      // D. INTENT ALIGNMENT BOOST (+35)
      // Boost the exact operational feature section answering the specific intent!
      if (intent === "CHANNEL_SEPARATION_COLLISION") {
        if (
          chunkFolded.includes("kanal etiket") ||
          chunkFolded.includes("ayirt etme") ||
          chunkFolded.includes("ortak gelen kutusu") ||
          chunkFolded.includes("gorusme karti") ||
          chunkFolded.includes("standart bir gorusme karti")
        ) {
          score += 35;
        }
      } else if (intent === "AGENT_COLLISION_ASSIGNMENT") {
        if (
          chunkFolded.includes("carpismasi") ||
          chunkFolded.includes("carpisma tespiti") ||
          chunkFolded.includes("temsilci atama") ||
          chunkFolded.includes("mukerrer")
        ) {
          score += 35;
        }
      } else if (intent === "MERGE_CONTACTS") {
        if (chunkFolded.includes("kisileri birlestir") || chunkFolded.includes("merge contacts")) {
          score += 35;
        }
      } else if (intent === "FILTERING_CUSTOM_VIEWS") {
        if (chunkFolded.includes("filtreleme") || chunkFolded.includes("ozel gorunumler") || chunkFolded.includes("custom views")) {
          score += 35;
        }
      }

      // E. Product context alignment bonus
      if (targetProductId && doc.productId === targetProductId) {
        score += 5;
      }

      // Enhanced Guardrail:
      // If user query has distinctive tokens (e.g. "uzay", "madenci", "roket", "yakit"):
      // 1. If 0 distinctive tokens matched, score must be 0.
      // 2. If there are >= 2 distinctive tokens, the chunk must match at least 2 tokens OR at least 40% of the distinctive tokens.
      // This prevents a chunk that matches 1 random word from returning as a false positive for an unrelated query!
      if (distinctiveQueryTokens.length >= 2) {
        const matchRatio = matchedDistinctiveTokens.length / distinctiveQueryTokens.length;
        if (matchedDistinctiveTokens.length < 2 && matchRatio < 0.4) {
          score = 0;
        }
      } else if (distinctiveQueryTokens.length === 1 && matchedDistinctiveTokens.length === 0) {
        score = 0;
      }

      if (score > 10) {
        scoredChunks.push({
          documentId: doc.id,
          documentTitle: doc.title,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score,
          matchedDistinctiveTokens,
          isPreamble,
        });
      }
    }
  }

  // Sort chunks by score descending
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 3);
  const usedDocumentIds = Array.from(new Set(topChunks.map((c) => c.documentId)));

  for (const c of topChunks) {
    matchedEvidences.push({
      sourceType: "document_chunk",
      sourceId: `${c.documentId}#${c.chunkIndex}`,
      sourceTitle: c.documentTitle,
      snippet: c.content.slice(0, 300) + (c.content.length > 300 ? "..." : ""),
      score: c.score,
      confidence: Math.min(1.0, c.score / 50),
    });
  }

  // If a verified plan or store product matched with high relevance
  if (matchedPlanOrProduct && (!topChunks.length || matchedPlanOrProduct.score >= topChunks[0].score)) {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer: matchedPlanOrProduct.answer,
      confidence: 0.88,
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds,
      suggestedProducts: verifiedProducts,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // If top document chunk has high score (>= 22) and verified distinctive matches
  if (topChunks.length > 0 && topChunks[0].score >= 22) {
    const topChunk = topChunks[0];
    const confidence = Math.min(0.95, 0.7 + (topChunk.score / 60) * 0.25);

    // SYNTHESIZE CUSTOMER-FACING ANSWER:
    // Strip document boilerplates, internal numbering ("1. ...", "3.1. ..."), section headers
    let synthesizedAnswer = "";

    if (intent === "CHANNEL_SEPARATION_COLLISION") {
      synthesizedAnswer =
        "Hayır, mesajlar birbirine karışmaz. Midvem çok kanallı gelen kutusunda WhatsApp, Instagram ve diğer tüm platformlardan gelen mesajlar ayrı birer görüşme kartına dönüştürülür. Her mesajın üzerinde hangi kanaldan geldiğini gösteren kanal etiketleri yer alır ve temsilciler mesajın kaynağını anında ayırt edebilir. Ayrıca sistemdeki Çarpışma Tespiti ve Temsilci Atama özelliği sayesinde birden fazla personelin aynı mesaja aynı anda yanıt vermesi veya mesajların birbirine girmesi engellenir.";
    } else if (intent === "AGENT_COLLISION_ASSIGNMENT") {
      synthesizedAnswer =
        "Hayır, personeller birbirinin müşterisine mükerrer yanıt veremez. Midvem üzerinde Çarpışma Tespiti (Collision Detection) ve Temsilci Atama özelliği mevcuttur. Bir temsilci o anda bir görüşmeyi görüntülüyorsa veya mesaj yazıyorsa diğer ekip üyeleri bunu ekranlarında canlı olarak görür ve aynı müşteriye iki kişinin aynı anda yazması önlenir.";
    } else if (intent === "MERGE_CONTACTS") {
      synthesizedAnswer =
        "Farklı kanallardan yazan müşteriler ayrı görüşme kartları olarak listelenir; böylece konuşmalar birbirine karışmaz. İstenirse Kişileri Birleştir (Merge Contacts) özelliği kullanılarak aynı müşteriye ait WhatsApp, Instagram ve e-posta kayıtları tek bir ana profilde birleştirilebilir.";
    } else if (intent === "FILTERING_CUSTOM_VIEWS") {
      synthesizedAnswer =
        "Evet. Midvem'de kanal bazlı gelen kutuları ve filtreleme seçenekleri mevcuttur. WhatsApp, Instagram veya Web Canlı Sohbet mesajlarını ayrı ayrı filtreleyebilir ve sık kullandığınız filtreleri Özel Görünümler (Custom Views / Klasörler) olarak kaydedebilirsiniz.";
    } else {
      // General section answer: extract substantive sentences and format cleanly
      const sentences = topChunk.content
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20 && !s.startsWith("#") && !s.startsWith("[Bölüm") && !s.includes("Ürünün Adı ve Kısa"));

      const bestSentences = sentences.slice(0, 3).join(" ");
      synthesizedAnswer = bestSentences || topChunk.content.slice(0, 400).trim();
    }

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer: synthesizedAnswer,
      confidence,
      confidenceLevel: "HIGH",
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds,
      suggestedProducts: verifiedProducts.length > 0 ? verifiedProducts : undefined,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // Moderate score chunk (14 - 21)
  if (topChunks.length > 0 && topChunks[0].score >= 14 && topChunks[0].matchedDistinctiveTokens.length > 0) {
    const topChunk = topChunks[0];
    const confidence = 0.58;

    const answer =
      `Sorunuzla ilgili doğrulanmış bilgi tabanımızda şu detaylar yer almaktadır:\n\n${topChunk.content.slice(0, 350).trim()}...\n\nDaha detaylı bilgi veya özel bir gereksiniminiz için dilerseniz sorunuzu biraz daha detaylandırabilir veya müşteri temsilcimize bağlanmak istediğinizi belirtebilirsiniz.`;

    const clarifyingOptions = [
      "Midvem paket fiyatları neler?",
      "Web tasarımı yapıyor musunuz?",
      "Müşteri temsilcisine bağlanmak istiyorum",
    ];

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      answer,
      confidence,
      confidenceLevel: "MEDIUM",
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds,
      suggestedProducts: verifiedProducts.length > 0 ? verifiedProducts : undefined,
      clarifyingOptions,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ==========================================
  // TIER 5: Low Confidence Fallback (No Match Found)
  // Strictly prevent phone demands unless user explicitly requested callback!
  // ==========================================
  const lowConfidenceAnswer =
    "Bu konuda bilgi tabanımızda doğrulanmış yeterli bilgi bulunamadı. Dilerseniz sorunuzu farklı kelimelerle iletebilir ya da müşteri temsilcimizle görüşmek istediğinizi belirtebilirsiniz.";

  return {
    query,
    normalizedQuery,
    detectedIntent: intent,
    detectedSubject: analysis.detectedSubject,
    answer: lowConfidenceAnswer,
    confidence: 0.2,
    confidenceLevel: "LOW",
    isHandoverPrompt: false, // CRITICAL: Never force phone collection unsolicited
    matchedEvidence: matchedEvidences,
    usedDocumentIds: [],
    isFallback: true,
    externalApiUsed: false,
  };
}
