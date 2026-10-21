/**
 * Çiçekana Tech Media — 100% Local, Deterministic Knowledge Retrieval & Answer Engine
 * 
 * Runs entirely without external Generative AI APIs (Zero Gemini/OpenAI/External Embeddings).
 * Features:
 * - Multi-tier matching: Exact match -> Question Variations -> Verified DB Models -> Document Chunks -> Fuzzy
 * - Turkish NLP tokenization, stemming, synonym expansion, and typo tolerance
 * - Calibrated confidence scoring (High >= 0.75, Medium 0.45-0.74, Low < 0.45)
 * - Structured factual response templates (Q&A, Pricing & Tiers, Document Excerpts)
 * - Safe fallback without unsolicited phone number collection
 * - High performance in-memory caching with fast invalidation
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
  expandTokensWithSynonyms,
  levenshteinDistance,
  toAsciiFolded,
} from "./turkish-nlp";

export interface MatchedEvidence {
  sourceType: "qa" | "plan" | "product" | "document_chunk";
  sourceId: string;
  sourceTitle: string;
  snippet: string;
  score: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface EngineResponse {
  query: string;
  answer: string;
  confidence: number;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  isHandoverPrompt: boolean;
  handoverReason?: string;
  matchedEvidence: MatchedEvidence[];
  usedDocumentIds: string[];
  suggestedProducts?: any[];
  clarifyingOptions?: string[];
  isFallback: boolean;
  externalApiUsed: false;
}

// Explicit handover patterns (User explicitly asks for callback or human agent)
const EXPLICIT_CALLBACK_PATTERNS = [
  /(?:beni|bizi)\s+(?:ara|arayın|arar\s+mısınız|arayabilir\s+misiniz)/i,
  /telefon(?:um)?la\s+(?:ara|arayın|ulaşın|görüşelim)/i,
  /numaramı\s+bırak(?:mak|ayım)/i,
  /geri\s+dönüş\s+yap(?:ın|ar\s+mısınız)?/i,
  /geri\s+arama\s+talebi/i,
];

const EXPLICIT_HUMAN_AGENT_PATTERNS = [
  /(?:müşteri\s+)?temsilci(?:sine|siyle|ye)?\s+(?:bağlan|aktar|görüşmek|konuşmak)/i,
  /(?:canlı\s+)?temsilci(?:ye|yle)?\s+(?:bağla|aktar)/i,
  /bir\s+(?:yetkili|insan|uzman)la\s+(?:görüşmek|konuşmak)\s+istiyorum/i,
  /insan\s+desteği(?:ne\s+bağla|yle\s+görüş)/i,
  /yetkiliye\s+aktar/i,
  /temsilciye\s+bağla/i,
  /canlı\s+destek(?:le\s+görüş|e\s+bağlan)/i,
];

const GREETING_PATTERNS = [
  /^(?:merhaba|selam|selamlar|iyi\s+günler|günaydın|iyi\s+akşamlar|kolay\s+gelsin|merhabalar|merhablar)[.!?]?$/i,
];

const GRATITUDE_PATTERNS = [
  /^(?:teşekkürler|teşekkür\s+ederim|sağol|sağolun|eyvallah|harika|çok\s+iyi|tamamdır)[.!?]?$/i,
];

// Baseline curated Q&As with question variations
export interface CuratedQA {
  id: string;
  question: string;
  answer: string;
  category: string;
  variations: string[];
  productId?: string;
}

export const BASELINE_CURATED_QAS: CuratedQA[] = [
  {
    id: "base_shopify_sidepanel",
    question: "Shopify siparişlerini sohbet ekranında görebiliyor muyuz?",
    variations: [
      "Müşterinin ne satın aldığını nereden göreceğiz?",
      "Kargo sorusunda Shopify'a ayrıca girmem gerekiyor mu?",
      "Sipariş bilgileri yan tarafta görüntüleniyor mu?",
      "Shopify sipariş detayları nasıl görünür?",
      "Müşteri sipariş geçmişi sohbet ekranında açılıyor mu?",
      "Shopify sepet ve kargo durumu canlı görünüyor mu?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Evet, Midvem sisteminde hazır Shopify entegrasyonu bulunmaktadır. Müşterinizle sohbet ederken ekranı kapatmadan veya başka bir sekmeye geçmeden sağ panelde müşterinizin geçmiş siparişlerini, sipariş tutarını, kargo takip numarasını ve teslimat durumunu canlı olarak görebilirsiniz (Shopify'a her seferinde ayrı sekmeden bakmaya gerek kalmaz).\n\n⚠️ Önemli Kurulum Şartı: Bu yetenek hazır bir özelliktir ancak sihirli şekilde otomatik açık gelmez. Aktif olabilmesi için işletmenizin aktif bir Shopify mağazasının bulunması ve Midvem paneli üzerinden mağaza API entegrasyon bağlantısının yapılmış olması gerekmektedir.",
  },
  {
    id: "base_midvem_pricing",
    question: "Midvem paket fiyatları nelerdir?",
    variations: [
      "Midvem ne kadar?",
      "Midvem kaç para?",
      "Midvem aylık ücreti nedir?",
      "Midvem paket ücretleri",
      "Midvem fiyatlandırma tarifesi",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Midvem çok kanallı müşteri iletişim platformumuzun doğrulanmış paketleri ve fiyatları şunlardır:\n\n• Midvem Başlangıç: 7.500 TL / ay (2 temsilci, canlı destek web widget'ı, Instagram DM, temel hızlı yanıt makroları)\n• Midvem Pro: 15.000 TL / ay (5 temsilci, resmi WhatsApp Business bağlantısı, Instagram & Facebook, sınırsız Midvem AI asistanı, Shopify/ikas e-ticaret canlı sepet ve sipariş paneli)\n• Midvem Kurumsal: 25.000 TL / ay (Sınırsız temsilci, tüm iletişim kanalları, özel telefon/SMS, özel eğitilmiş AI modeli, 7/24 öncelikli yönetici ve %99.9 SLA)\n\n* Paketler kurumsal bulut altyapısıyla lisanslanmakta olup işletmenizin ihtiyacına göre anında aktif edilebilir.",
  },
  {
    id: "base_midvem_small_biz",
    question: "Küçük esnaf veya yeni başlayanlar için en uygun paket hangisidir?",
    variations: [
      "Küçük esnafa uygun paket var mı?",
      "Küçük işletmeler için hangi paketi önerirsiniz?",
      "Yeni başladım en ucuz paketiniz hangisi?",
      "Esnaf paketi ne kadar?",
      "KOBİ için en uygun paket",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Küçük esnaf, butik işletmeler ve e-ticarete yeni başlayan girişimciler için en uygun çözümümüz Midvem Başlangıç paketidir. Aylık 7.500 TL olan bu paketle 2 müşteri temsilcisi yetkilendirebilir, web sitenize canlı destek penceresi ekleyebilir ve Instagram DM mesajlarınızı tek ekrandan kaçırmadan yanıtlayabilirsiniz. İşletmeniz büyüdükçe WhatsApp Business ve Shopify entegrasyonu içeren Pro pakete geçiş yapabilirsiniz.",
  },
  {
    id: "base_midvem_free_policy",
    question: "Midvem ücretsiz mi veya bedava paketi var mı?",
    variations: [
      "Midvem bedava mı?",
      "Ücretsiz kullanabilir miyim?",
      "Parasız sürümü var mı?",
      "Free plan var mı?",
      "Midvem deneme sürümü bedava mı?",
    ],
    category: "Midvem",
    productId: "midvem",
    answer:
      "Hayır, Midvem sistemimizin ücretsiz veya bedava bir paketi bulunmamaktadır. Platformumuz yüksek performanslı yapay zekâ sunucuları, kesintisiz bulut altyapısı ve resmi API bağlantıları sağladığı için doğrulanmış ücretli paketlerle lisanslanmaktadır. Küçük esnaf ve yeni başlayan işletmeler için en uygun paketimiz aylık 7.500 TL olan Midvem Başlangıç paketidir.",
  },
  {
    id: "base_web_design_pricing",
    question: "Web sitesi tasarımı ve yazılım geliştirme fiyatları ne kadar?",
    variations: [
      "Web sitesi yaptırmak istiyorum kaç para?",
      "Site fiyatı nedir?",
      "Özel yazılım ücretleri ne kadar?",
      "Kurumsal web sitesi maliyeti nedir?",
      "Web tasarım fiyatları",
    ],
    category: "Web & Yazılım",
    answer:
      "Çiçekana Tech Media olarak kurumsal web siteleri, SaaS platformları ve yüksek performanslı e-ticaret siteleri tasarlıyor ve geliştiriyoruz (Next.js, React, mobil %100 duyarlılık ve gelişmiş SEO standarttır).\n\nWeb tasarımı ve özel yazılım projelerinde sayfa sayısı, tasarım özgünlüğü, çok dilli altyapı ve özel CRM/ERP entegrasyonlarına bağlı olarak sabit bir fiyat bulunmamaktadır. Kapsam analizi doğrultusunda müşteri temsilcimiz tarafından firmanıza özel teklif hazırlanmaktadır.",
  },
  {
    id: "base_alom_call_center",
    question: "Alom Yapay Zeka Çağrı Merkezi nedir ve nasıl çalışır?",
    variations: [
      "Alom nedir?",
      "Sesli yapay zeka santrali nasıl çalışır?",
      "Telefon çağrılarını yapay zeka karşılayabilir mi?",
      "Alom özellikleri neler?",
      "Alom çağrı merkezi ne işe yarar?",
    ],
    category: "Alom",
    productId: "alom",
    answer:
      "Alom Yapay Zeka Destekli Çağrı Merkezi; işletmelerin gelen telefon çağrılarını 7/24 karşılayan, konuşmayı anlık metne döken, sık sorulan soruları insan doğallığında sesli yanıtlayan ve gerektiğinde çağrıyı özet transkriptiyle canlı temsilciye aktaran yeni nesil sesli yapay zekâ santralidir. Santral ve CRM sistemleriyle çift yönlü entegre çalışır.",
  },
  {
    id: "base_estudio_photo",
    question: "e-Studio Yapay Zeka Ürün Fotoğrafçılığı nedir?",
    variations: [
      "e-Studio nedir?",
      "Ürün fotoğraflarını yapay zekayla nasıl çekerim?",
      "Yapay zeka ürün fotoğrafçılığı nasıl çalışır?",
      "e-Studio özellikleri neler?",
    ],
    category: "e-Studio",
    productId: "e-studio",
    answer:
      "e-Studio Yapay Zeka Destekli Ürün Fotoğrafçılığı; e-ticaret markaları ve satıcıların cep telefonuyla çektiği basit ürün fotoğraflarını saniyeler içinde stüdyo kalitesinde profesyonel tanıtım ve reklam görsellerine dönüştüren yapay zekâ platformudur. Arka plan temizleme, gerçekçi gölgelendirme, profesyonel ışıklandırma ve çözünürlük yükseltme (Upscale) yetenekleri sunar.",
  },
  {
    id: "base_postify_social",
    question: "Postify nedir ve ne işe yarar?",
    variations: [
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
  {
    id: "base_print_store_delivery",
    question: "Baskı ve matbaa ürünleri teslimatı kaç gün sürer ve nasıl sipariş verilir?",
    variations: [
      "Baskı kargosu ne zaman gelir?",
      "Matbaa teslimat süresi nedir?",
      "Kartvizit siparişi kaç günde teslim edilir?",
      "Bloknot kargosu kaç gün?",
      "Baskı ürünlerinde kargo ve teslimat",
    ],
    category: "Baskı & Matbaa",
    answer:
      "Matbaa ve kurumsal baskı ürünlerimiz (tutkallı bloknot, kartvizit, broşür, antetli kağıt, cepli dosya, etiket vb.) için web sitemizin Mağaza (/magaza) bölümünden doğrudan ölçü, adet ve kağıt gramajı seçerek online sipariş verebilirsiniz. Siparişleriniz onaylandıktan ve baskı hazırlığı tamamlandıktan sonra genellikle 3 ila 5 iş günü içerisinde anlaşmalı kargo ile adresinize sevk edilir. PayTR ile güvenli online ödeme geçerlidir.",
  },
  {
    id: "base_young_entrepreneur",
    question: "Genç Girişimci Desteği nedir?",
    variations: [
      "Genç girişimcilere ne destek veriyorsunuz?",
      "Genç girişimci e-ticaret paketi",
      "Genç girişimci desteğine nasıl başvurulur?",
    ],
    category: "Kurumsal",
    answer:
      "Genç Girişimci Desteği kapsamında; e-ticarete yeni adım atan girişimcilere anahtar teslim ikas e-ticaret altyapısı, niş ürün tedariği, ürün depolama, sipariş paketleme ve kargoya teslimat (fulfillment) süreçleri tek çatı altında uçtan uca sunulmaktadır. Web sitemizdeki Genç Girişimci Desteği sayfası üzerinden başvuru formunu doldurarak ekibimizle iletişime geçebilirsiniz.",
  },
  {
    id: "base_whatsapp_policy",
    question: "WhatsApp destek hattınız var mı?",
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
let cachedQAs: any[] | null = null;
let cachedPlans: any[] | null = null;
let cachedProducts: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache TTL

export function invalidateKnowledgeCache() {
  cachedDocuments = null;
  cachedQAs = null;
  cachedPlans = null;
  cachedProducts = null;
  cacheTimestamp = 0;
}

// Load knowledge items with caching
async function getCachedKnowledge() {
  const now = Date.now();
  if (cachedDocuments && cachedQAs && cachedPlans && cachedProducts && now - cacheTimestamp < CACHE_TTL_MS) {
    return {
      documents: cachedDocuments,
      qas: cachedQAs,
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

  cachedDocuments = activeDocs;
  cachedQAs = dbQAs;
  cachedPlans = activePlans;
  cachedProducts = activeProducts;
  cacheTimestamp = now;

  return {
    documents: cachedDocuments,
    qas: cachedQAs,
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

  // 1. Check Explicit Handover Requests (Callback / Human Agent)
  const isExplicitCallback = EXPLICIT_CALLBACK_PATTERNS.some((p) => p.test(query));
  const isExplicitAgent = EXPLICIT_HUMAN_AGENT_PATTERNS.some((p) => p.test(query));

  if (isExplicitCallback || isExplicitAgent) {
    const reason = isExplicitCallback
      ? "Müşteri telefonla aranma talebinde bulundu."
      : "Müşteri doğrudan müşteri temsilcisine bağlanmak istedi.";

    const handoverPrompt = isExplicitCallback
      ? "Talebinizi memnuniyetle aldık. Yetkili ekibimizin sizi en kısa sürede arayabilmesi için lütfen telefon numaranızı bırakınız."
      : "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?";

    return {
      query,
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

  // 2. Check Greetings
  if (GREETING_PATTERNS.some((p) => p.test(query))) {
    return {
      query,
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

  // 3. Check Gratitude / Courtesies
  if (GRATITUDE_PATTERNS.some((p) => p.test(query))) {
    return {
      query,
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

  // NLP Tokenization & Normalization
  const processed = tokenizeAndProcess(query);
  const normalizedQuery = normalizeForSearch(query);
  const foldedQuery = normalizeForFuzzy(query);

  const { documents, qas, plans, products } = await getCachedKnowledge();

  // Combine baseline curated Q&As with database Q&As
  const allQAs: CuratedQA[] = [
    ...BASELINE_CURATED_QAS,
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
  // TIER 1 & TIER 2: Exact Match & Question Variations Match (with Containment)
  // ==========================================
  let bestQAMatch: {
    qa: CuratedQA;
    score: number;
    matchedVariation: string;
    isExact: boolean;
  } | null = null;

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

      // Use weighted combination of Jaccard overlap, containment and string similarity
      const effectiveSim = Math.max(
        tokenSim * 0.65 + strSim * 0.35,
        containmentSim >= 0.75 ? containmentSim * 0.7 + tokenSim * 0.3 : 0
      );

      // Product context bonus
      let bonus = 0;
      if (targetProductId && qa.productId === targetProductId) {
        bonus = 0.08;
      }

      const totalSim = effectiveSim + bonus;

      if (totalSim >= 0.65) {
        const score = Math.round(totalSim * 100);
        if (!bestQAMatch || score > bestQAMatch.score) {
          bestQAMatch = {
            qa,
            score,
            matchedVariation: cand,
            isExact: normCand === normalizedQuery || foldedCand === foldedQuery || totalSim >= 0.98,
          };
        }
      }
    }

    if (bestQAMatch && bestQAMatch.isExact) break;
  }

  if (bestQAMatch && bestQAMatch.score >= 75) {
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
  // TIER 3: Verified Plans & Products Match
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

      // Construct a clean, structured answer
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
  // TIER 4: Document Chunks Retrieval (TF-IDF & Distinctive Keywords)
  // ==========================================
  interface ScoredChunk {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    content: string;
    score: number;
    matchedDistinctiveTokens: string[];
  }

  const scoredChunks: ScoredChunk[] = [];
  const queryTokens = processed.stemmedTokens;
  const expandedTokens = processed.expandedTokens.map(toAsciiFolded);

  // Distinctive tokens are non-generic domain tokens with length >= 3
  const { GENERIC_DOMAIN_WORDS } = await import("./turkish-nlp");
  const distinctiveQueryTokens = queryTokens.filter(
    (tok) => tok.length >= 3 && !GENERIC_DOMAIN_WORDS.has(toAsciiFolded(tok))
  );

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      let score = 0;
      const chunkNorm = normalizeForSearch(chunk.content);
      const chunkFolded = toAsciiFolded(chunkNorm);
      const matchedDistinctiveTokens: string[] = [];

      // A. Whole phrase presence bonus (+25)
      if (normalizedQuery.length >= 6 && chunkNorm.includes(normalizedQuery)) {
        score += 25;
      } else if (foldedQuery.length >= 6 && chunkFolded.includes(foldedQuery)) {
        score += 20;
      }

      // B. Token overlap with IDF weight distinction
      for (const tok of queryTokens) {
        const tokFolded = toAsciiFolded(tok);
        if (tokFolded.length < 3) continue;

        const isGeneric = GENERIC_DOMAIN_WORDS.has(tokFolded);

        if (chunk.keywords.some((kw: string) => toAsciiFolded(kw).includes(tokFolded))) {
          if (isGeneric) {
            score += 1;
          } else {
            score += 10;
            matchedDistinctiveTokens.push(tokFolded);
          }
        } else if (chunkFolded.includes(tokFolded)) {
          if (isGeneric) {
            score += 0.5;
          } else {
            score += 7;
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

      // D. Product context alignment bonus
      if (targetProductId && doc.productId === targetProductId) {
        score += 5;
      }

      // Guardrail: If user asked a question with distinctive words, but this chunk matched ZERO distinctive words, ignore it!
      if (distinctiveQueryTokens.length > 0 && matchedDistinctiveTokens.length === 0) {
        score = 0;
      }

      if (score > 0) {
        scoredChunks.push({
          documentId: doc.id,
          documentTitle: doc.title,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score,
          matchedDistinctiveTokens,
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
      confidence: Math.min(1.0, c.score / 40),
    });
  }

  // If a verified plan or store product matched with high relevance
  if (matchedPlanOrProduct && (!topChunks.length || matchedPlanOrProduct.score >= topChunks[0].score)) {
    return {
      query,
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

  // If top document chunk has high score (>= 18) and verified distinctive matches
  if (topChunks.length > 0 && topChunks[0].score >= 18) {
    const topChunk = topChunks[0];
    const confidence = Math.min(0.95, 0.65 + (topChunk.score / 50) * 0.3);

    // Extract the most relevant sentences or paragraphs
    const paragraphs = topChunk.content.split(/\n\s*\n+/).filter((p) => p.trim().length > 15);
    let bestParagraph = "";
    let highestParaScore = -1;

    for (const p of paragraphs) {
      const pFolded = toAsciiFolded(p);
      let pScore = 0;
      for (const dt of topChunk.matchedDistinctiveTokens) {
        if (pFolded.includes(dt)) pScore += 10;
      }
      for (const tok of queryTokens) {
        if (pFolded.includes(toAsciiFolded(tok))) pScore += 3;
      }
      if (pScore > highestParaScore) {
        highestParaScore = pScore;
        bestParagraph = p.trim();
      }
    }

    const excerpt = bestParagraph || topChunk.content.slice(0, 500).trim();
    const answer = `${excerpt}\n\n*(Kaynak: ${topChunk.documentTitle})*`;

    return {
      query,
      answer,
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

  // Moderate score chunk (12 - 17) with at least 1 distinctive token match
  if (topChunks.length > 0 && topChunks[0].score >= 12 && topChunks[0].matchedDistinctiveTokens.length > 0) {
    const topChunk = topChunks[0];
    const confidence = 0.58;

    const answer =
      `Sorunuzla ilgili bilgi tabanımızda şu detaylar yer almaktadır:\n\n${topChunk.content.slice(0, 400).trim()}...\n\n*(Kaynak: ${topChunk.documentTitle})*\n\nDaha detaylı bilgi veya özel bir gereksiniminiz için dilerseniz sorunuzu biraz daha detaylandırabilir veya müşteri temsilcimize bağlanmak istediğinizi belirtebilirsiniz.`;

    const clarifyingOptions = [
      "Midvem paket fiyatları neler?",
      "Web tasarımı yapıyor musunuz?",
      "Müşteri temsilcisine bağlanmak istiyorum",
    ];

    return {
      query,
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
