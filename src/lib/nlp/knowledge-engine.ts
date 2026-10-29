/**
 * src/lib/nlp/knowledge-engine.ts
 *
 * Çiçekana Teknoloji & Medya — Doğrulanmış Bilgi Erişimi, Ürün Katalog Eşleştirme ve Satış/Destek Motoru
 *
 * ÖZELLİKLER:
 * - Ürün detay sayfasındaki (PlanTier / CMS) güncel fiyatları her zaman genel bilgi bankası (KB) metinlerine göre önceliklendirir (Bölüm 4.2).
 * - /magaza altındaki baskı ve fiziksel mağaza ürünlerini satış/öneri kapsamı dışında tutar (Bölüm 3.2).
 * - Kapsam dışı genel kültür/isim anlamı sorularını (örn. "Cemre isminin anlamı") kibarca reddedip hizmetlere yönlendirir (Bölüm 8.1).
 * - Kapsam içi ancak doğrulanmamış/kaynakta yer almayan ürün detaylarında (örn. Alom aylık dakika hakkı) uydurma bilgi vermez,
 *   telefon veya e-posta isteyerek ekip takibine yönlendirir (Bölüm 8.2).
 * - Mevcut müşteri ödeme/hesap/teknik sorunlarını /profile destek alanına yönlendirir (Bölüm 9).
 * - Prompt injection ve yetkisiz indirim/ücretsiz ürün taleplerini engeller (Bölüm 13.4).
 */

import { prisma } from '@/lib/prisma';
import {
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
} from './turkish-nlp';
import { extractQAPairsFromText } from '@/lib/ai/doc-parser';
import {
  getVerifiedCatalog,
  inferProductKeyFromContext,
  detectProductKeyFromQuery,
  isMagazaStoreQuery,
  sanitizeAndResolveConflictsInKBText,
  buildAuthoritativePricingResponse,
  invalidateCatalogCache,
  SITE_BASE_URL,
  type CatalogProduct,
} from '@/lib/ai/product-catalog';

export interface MatchedEvidence {
  sourceType: 'qa' | 'plan' | 'product' | 'document_chunk';
  sourceId: string;
  sourceTitle: string;
  sectionTitle?: string;
  snippet: string;
  score: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export type ResponseCategory =
  | 'sales_catalog'
  | 'needs_analysis'
  | 'feature_qa'
  | 'special_offer_service'
  | 'magaza_excluded'
  | 'out_of_scope'
  | 'unanswered_in_scope'
  | 'support_escalation'
  | 'contact_captured'
  | 'injection_blocked'
  | 'greeting'
  | 'handover';

export interface ExtractedContactInfo {
  phone?: string;
  email?: string;
  name?: string;
}

export interface EngineContextOptions {
  pageUrl?: string | null;
  conversationHistory?: Array<{ senderType: string; content: string }>;
}

export interface EngineResponse {
  query: string;
  normalizedQuery: string;
  detectedIntent: QuestionIntent;
  detectedSubject: string;
  detectedProductKey?: string | null;
  detectedProductName?: string | null;
  responseCategory?: ResponseCategory;
  answer: string;
  confidence: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  isHandoverPrompt: boolean;
  handoverReason?: string;
  shouldNotifyEvent?: 'FOLLOWUP_NEEDED' | 'SALES_OPPORTUNITY' | 'SUPPORT_ESCALATION' | null;
  shouldLogUnanswered?: boolean;
  extractedContact?: ExtractedContactInfo | null;
  matchedEvidence: MatchedEvidence[];
  usedDocumentIds: string[];
  suggestedProducts?: any[];
  clarifyingOptions?: string[];
  uncertaintyNotes?: string;
  isFallback: boolean;
  externalApiUsed: boolean;
}

export interface CuratedQA {
  id: string;
  question: string;
  answer: string;
  category: string;
  variations: string[];
  productId?: string;
  productKey?: string;
  intent?: QuestionIntent;
}

export function getSupportResponseTargetText(): string {
  return process.env.SUPPORT_RESPONSE_TARGET_TEXT?.trim() || '30 dakika';
}

export function buildSlaFollowupConfirmationMessage(lang: 'tr' | 'en' = 'tr'): string {
  const targetTime = getSupportResponseTargetText();
  if (lang === 'en') {
    return `Thank you. I am forwarding your request and contact information to our team. We aim to get back to you within ${targetTime} during business hours, and on the next business day for requests submitted outside business hours.`;
  }
  return `Teşekkür ederim. Sorunuzu ekibimize iletiyorum. Mesai saatleri içinde ${targetTime} içerisinde dönüş yapılmasını hedefliyoruz. Mesai dışında iletilen taleplerde bir sonraki iş günü dönüş yapılmasını hedefliyoruz.`;
}

export const BASELINE_CURATED_QAS: CuratedQA[] = [
  {
    id: 'base_midvem_channel_separation',
    question:
      'WhatsApp ve Instagram mesajları tek ekranda birbirine karışır mı? Hangi mesajın nereden geldiğini nasıl anlarız?',
    intent: 'CHANNEL_SEPARATION_COLLISION',
    variations: [
      'WhatsApp ve Instagram mesajları tek ekranda karışıyor mu?',
      'Mesajın hangi platformdan geldiğini nasıl göreceğiz?',
      'Hangi mesajın nereden geldiğini nasıl anlarız?',
      "Instagram'dan yazanla WhatsApp'tan yazanı ayırabiliyor muyuz?",
      "Hangi mesajın Instagram'dan hangisinin WhatsApp'tan geldiğini ayırt edebiliyor muyuz?",
      'Kanallar tek yerde toplanıyor diye konuşmalar birbirine girmez değil mi?',
      'whatsapp insta ayni yere gelince mesajlar karisiyomu',
      'instagramdan gelenle whatsapptan geleni nasil ayiricaz',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      'Hayır, mesajlar kesinlikle birbirine karışmaz. Midvem çok kanallı gelen kutusunda WhatsApp, Instagram ve diğer kanallardan gelen tüm mesajlar standart görüşme kartlarına dönüştürülür ve her kartın üzerinde hangi platformdan geldiğini gösteren kanal etiketi yer alır. Temsilcileriniz mesajın kaynağını anında ayırt ederek tek ekrandan yanıt verir.',
  },
  {
    id: 'base_midvem_supported_channels',
    question: 'Midvem hangi kanalları destekliyor?',
    variations: [
      'Midvem hangi iletişim kanallarını destekler?',
      "Midvem'e hangi platformlar bağlanır?",
      "Midvem'de hangi mesajlaşma kanalları var?",
      'Midvem hangi sosyal medya ve mesaj kanallarını birleştiriyor?',
      'Midvem desteklenen kanallar nelerdir?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      'Midvem; resmi WhatsApp Business, Instagram DM, Facebook Messenger, Web Sitesi Canlı Sohbet (Live Chat Widget), E-posta, Telegram, SMS ve Line kanallarını tek bir ortak ekranda destekler. Ayrıca Pro ve Kurumsal paketlerde İkas, Shopify ve WooCommerce e-ticaret entegrasyonuyla müşteri sipariş ve sepet bilgilerini doğrudan sohbet panelinde gösterir.',
  },
  {
    id: 'base_midvem_agent_collision',
    question:
      'Personeller bütün konuşmaları tek panelde nasıl takip edecek? İki temsilci aynı anda aynı müşteriye cevap verir mi?',
    intent: 'AGENT_COLLISION_ASSIGNMENT',
    variations: [
      'Personeller bütün konuşmaları tek panelde nasıl takip edecek?',
      'Mesajlar tek yerde toplanınca herkes birbirinin müşterisine mi cevap verecek?',
      'İki personelin aynı müşteriye aynı anda yazması engelleniyor mu?',
      'İki temsilcinin aynı müşteriye aynı anda yanlışlıkla yanıt vermesini nasıl engelliyorsunuz?',
      'Temsilciler birbirlerinin müşterilerine karışır mı?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      "Hayır, temsilcilerin yanıtları çakışmaz. Midvem'de gerçek zamanlı Çarpışma Tespiti (Collision Detection) ve Temsilci Atama özelliği bulunur. Bir temsilci görüşmeyi görüntülüyorsa veya yanıt yazıyorsa diğer ekip üyeleri bunu ekranda canlı olarak görür ve mükerrer yanıt yazılması engellenir.",
  },
  {
    id: 'base_midvem_merge_contacts',
    question: "Aynı müşteri hem WhatsApp'tan hem Instagram'dan veya e-postadan yazarsa ne olacak?",
    intent: 'MERGE_CONTACTS',
    variations: [
      'Aynı müşteri iki farklı kanaldan yazarsa ne olacak?',
      "Aynı müşteri hem WhatsApp'tan hem e-postadan yazdıysa iki ayrı kayıt mı oluşur?",
      'Aynı kişinin farklı kanallardan mesajları birleştirilebilir mi?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      'Her müşterinin konuşması kendi bağımsız görüşme kartında korunur. Aynı müşterinin farklı kanallardan (örneğin hem WhatsApp hem Instagram veya e-posta) yazdığı tespit edildiğinde, Kişileri Birleştir (Merge Contacts) özelliğiyle kayıtlar tek bir müşteri profili altında birleştirilebilir.',
  },
  {
    id: 'base_midvem_filtering',
    question: 'Kanallara göre konuşmaları filtreleyebiliyor muyuz?',
    intent: 'FILTERING_CUSTOM_VIEWS',
    variations: [
      'Kanallara göre konuşmaları filtreleyebiliyor muyuz?',
      'Sadece WhatsApp mesajlarını filtreleyebilir miyim?',
      'Sadece Instagram DM mesajlarını ayrı görebilir miyim?',
      'Özel klasör veya filtre oluşturabiliyor muyuz?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      'Evet. Midvem üzerinde kanal bazlı gelen kutuları (Inboxes) oluşturabilir, etiketler kullanabilir ve sadece WhatsApp, sadece Instagram veya sadece Canlı Sohbet mesajlarını listeleyen Özel Görünümler (Custom Views) kaydedebilirsiniz.',
  },
  {
    id: 'base_midvem_custom_roles',
    question: 'Her personelin sadece kendi müşterilerini görmesini sağlayabiliyor muyuz?',
    variations: [
      'Her personelin sadece kendi müşterilerini görmesini sağlayabiliyor muyuz?',
      'Elemanlar sadece kendi mesajlarını görebilir mi?',
      'Temsilcilerin diğer temsilcilerin mesajlarını görmesini engelleyebilir miyiz?',
      'Personel yetkilendirmesi var mı?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      "Evet. Midvem'deki Özel Roller (Custom Roles) özelliğiyle yöneticiler, temsilcileri yalnızca belirli gelen kutularına yetkilendirebilir veya sadece kendilerine atanan görüşmeleri görmelerini sağlayabilir.",
  },
  {
    id: 'base_shopify_sidepanel',
    question: 'Shopify siparişlerini sohbet ekranında görebiliyor muyuz?',
    intent: 'INTEGRATION_SHOPIFY',
    variations: [
      'Müşterinin ne satın aldığını nereden göreceğiz?',
      "Kargo sorusunda Shopify'a ayrıca girmem gerekiyor mu?",
      'Sipariş bilgileri yan tarafta görüntüleniyor mu?',
      'Shopify sipariş detayları nasıl görünür?',
      'Müşteri sipariş geçmişi sohbet ekranında açılıyor mu?',
      'Shopify sepet ve kargo durumu canlı görünüyor mu?',
    ],
    category: 'Midvem',
    productId: 'midvem',
    productKey: 'midvem',
    answer:
      'Evet, Midvem Pro ve Kurumsal paketlerimizde hazır Shopify, İkas ve WooCommerce entegrasyonu bulunmaktadır. Müşterinizle sohbet ederken sekme değiştirmeden sağ panelde müşterinin geçmiş siparişlerini, sipariş tutarını, kargo takip numarasını ve teslimat durumunu canlı olarak görebilirsiniz (aktif mağaza API bağlantısı yapılması yeterlidir).',
  },
  {
    id: 'base_web_design_pricing',
    question: 'Web sitesi tasarımı ve yazılım geliştirme fiyatları ne kadar?',
    intent: 'WEB_DESIGN_SOFTWARE',
    variations: [
      'Web sitesi yaptırmak istiyorum kaç para?',
      'Site fiyatı nedir?',
      'Özel yazılım ücretleri ne kadar?',
      'Kurumsal web sitesi maliyeti nedir?',
      'Web tasarım fiyatları',
    ],
    category: 'Web & Yazılım',
    productKey: 'web-yazilim',
    answer: `Çiçekana Teknoloji & Medya olarak Next.js ve React altyapısıyla yüksek hızlı, %100 mobil ve SEO uyumlu kurumsal web siteleri, özel SaaS platformları ve mobil uygulamalar geliştiriyoruz. Sayfa sayısı, tasarım özgünlüğü ve entegrasyon kapsamına göre sabit bir paket fiyatı yerine projeye özel teklif hazırlıyoruz. Detayları [Teknoloji & Yazılım Hizmetleri](${SITE_BASE_URL}/services/technology) sayfamızdan inceleyebilir veya size özel teklif için telefon numaranızı ya da e-posta adresinizi paylaşabilirsiniz.`,
  },
  {
    id: 'base_alom_call_center',
    question: 'Alom Yapay Zeka Çağrı Merkezi nedir ve nasıl çalışır?',
    intent: 'CALL_CENTER_VOICE_AI',
    variations: [
      'Alom nedir?',
      'Sesli yapay zeka santrali nasıl çalışır?',
      'Telefon çağrılarını yapay zeka karşılayabilir mi?',
      'Alom özellikleri neler?',
      'Alom çağrı merkezi ne işe yarar?',
      'Alom çağrı merkezi gelen telefon konuşmalarını yazılı transkript yapıyor mu?',
    ],
    category: 'Alom',
    productId: 'alom',
    productKey: 'alom',
    answer: `Alom Yapay Zeka Destekli Çağrı Merkezi; işletmenizin gelen ve giden telefon aramalarını 7/24 doğal insan sesiyle karşılayan, söz kesme algılama (interruption handling) yeteneğiyle akıcı diyalog kuran, görüşme sırasında takvime randevu işleyen, konuşmaları yazılı metne (transkript) döken ve gerektiğinde çağrıyı canlı temsilciye aktaran sesli yapay zekâ platformudur.\n\n**Güncel Paketlerimiz:**\n• **Standart / Başlangıç Kapsamı:** ₺2.500 / ay (+ KDV) — 7/24 gelen çağrı karşılama, doğal ses, canlı temsilciye aktarım, DTMF ve transkript.\n• **Gelişmiş / Kurumsal Kapsam:** ₺5.000 / ay (+ KDV) — Otomatik dış arama (outbound), görüşme içi takvim/randevu yönetimi ve harici sistemden sipariş sorgulama dahil.\n\nİncelemek ve satın almak için: [Alom Paketleri](${SITE_BASE_URL}/services/ai-automation/alom-yapay-zeka-destekli-cagri-merkezi#paketler)`,
  },
  {
    id: 'base_estudio_photo',
    question: 'e-Studio Yapay Zeka Ürün Fotoğrafçılığı nedir?',
    intent: 'STUDIO_PHOTO_AI',
    variations: [
      'e-Studio nedir?',
      'Ürün fotoğraflarını yapay zekayla nasıl çekerim?',
      'Yapay zeka ürün fotoğrafçılığı nasıl çalışır?',
      'e-Studio özellikleri neler?',
      'Ürünlerimin stüdyo fotoğrafını yapay zekayla çekmek için hangi programı kullanmalıyım?',
    ],
    category: 'e-Studio',
    productId: 'e-studio',
    productKey: 'e-studio',
    answer: `e-Studio; fiziksel stüdyo ve manken maliyeti olmadan ürün fotoğraflarınızı dakikalar içinde profesyonel stüdyo ve katalog görsellerine dönüştüren yapay zekâ platformudur. Arka plan değiştirme (Inpaint), kadraj genişletme (Outpaint), sanal manken yüz sabitleme (FaceSwap) ve çözünürlük artırma (Upscale) özellikleri sunar.\n\n• **Standart Kapsam:** ₺2.500 / ay (+ KDV)\n• **Gelişmiş Kapsam:** ₺5.000 / ay (+ KDV)\n\nİncelemek ve satın almak için: [e-Studio Paketleri](${SITE_BASE_URL}/services/ai-automation/e-studio#paketler)`,
  },
  {
    id: 'base_postify_social',
    question: 'Postify nedir ve ne işe yarar?',
    intent: 'SOCIAL_MEDIA_AI',
    variations: [
      'Postify nedir?',
      'Postify özellikleri nelerdir?',
      'Sosyal medya yapay zekayla nasıl yönetilir?',
      'Postify içerik takvimi nasıl çalışır?',
      'Postify ne işe yarar?',
      'Postify hangi sosyal medya platformlarında çalışıyor?',
      'Postify hangi kanalları destekliyor?',
      'Postify hangi sosyal ağları destekler?',
    ],
    category: 'Postify',
    productId: 'postify',
    productKey: 'postify',
    answer: `Postify; 15'ten fazla sosyal medya, topluluk ve blog platformunu tek merkezden yönetmenizi, yapay zekâ asistanıyla metin/görsel üretmenizi, zincir gönderi (flood), otomatik ilk yorum, Auto-Plug viral otomasyonu ve ekip onay akışlarını yürütmenizi sağlayan bulut tabanlı sosyal medya yönetim platformudur.\n\n• **Standart Paket:** ₺2.500 / ay (+ KDV)\n• **Profesyonel / Ajans Paketi:** ₺5.000 / ay (+ KDV)\n\nİncelemek ve satın almak için: [Postify Paketleri](${SITE_BASE_URL}/services/ai-automation/postify#paketler)`,
  },
  {
    id: 'base_young_entrepreneur',
    question: 'Genç Girişimci Desteği nedir?',
    intent: 'YOUNG_ENTREPRENEUR',
    variations: [
      'Genç girişimcilere ne destek veriyorsunuz?',
      'Genç girişimci e-ticaret paketi',
      'Genç girişimci desteğine nasıl başvurulur?',
    ],
    category: 'Kurumsal',
    productKey: 'genc-girisimci',
    answer: `Genç Girişimci Desteği kapsamında; e-ticarete yeni adım atan girişimcilere anahtar teslim ikas e-ticaret altyapısı, niş ürün tedariği, depolama, sipariş paketleme ve kargoya teslimat (fulfillment) süreçleri tek çatı altında sunulmaktadır. Detaylar ve başvuru için [Genç Girişimci Desteği](${SITE_BASE_URL}/services/genc-girisimci-destegi) sayfamızı ziyaret edebilirsiniz.`,
  },
  {
    id: 'base_whatsapp_policy',
    question: 'WhatsApp destek hattınız var mı?',
    intent: 'WHATSAPP_POLICY',
    variations: [
      "WhatsApp'tan yazabilir miyim?",
      'WhatsApp müşteri hizmetleri numarası nedir?',
      'WhatsApp canlı destek var mı?',
    ],
    category: 'Genel',
    answer:
      'Web sitemizdeki bu merkezi Müşteri Hizmetleri sohbet penceresi üzerinden 7/24 anlık bilgi alabilir veya telefon numaranızı/e-posta adresinizi paylaşarak uzman ekibimizin size dönüş yapmasını sağlayabilirsiniz. Ayrıca kendi işletmenizin WhatsApp Business hattını tek panelden yönetmek isterseniz Midvem çözümümüzü inceleyebilirsiniz.',
  },
];

// Cache
let cachedDocuments: Array<{
  id: string;
  title: string;
  productId: string | null;
  productKey: string | null;
  productType: string | null;
  category: string | null;
  cleanContent: string;
  chunks: Array<{ id: string; chunkIndex: number; content: string; keywords: string[] }>;
}> | null = null;
let cachedExtractedQAs: CuratedQA[] | null = null;
let cachedDBQAs: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

export function invalidateKnowledgeCache() {
  cachedDocuments = null;
  cachedExtractedQAs = null;
  cachedDBQAs = null;
  cacheTimestamp = 0;
  invalidateCatalogCache();
}

async function getCachedKnowledge() {
  const now = Date.now();
  if (cachedDocuments && cachedExtractedQAs && cachedDBQAs && now - cacheTimestamp < CACHE_TTL_MS) {
    return {
      documents: cachedDocuments,
      extractedQAs: cachedExtractedQAs,
      qas: cachedDBQAs,
    };
  }

  const [activeDocs, dbQAs] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where: { status: 'ACTIVE' },
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
          orderBy: { chunkIndex: 'asc' },
        },
      },
    }),
    prisma.knowledgeQA.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const enrichedDocs = activeDocs.map((doc) => ({
    ...doc,
    productKey: inferProductKeyFromContext(doc.title, doc.productId),
  }));

  const dynamicDocQAs: CuratedQA[] = [];
  for (const doc of enrichedDocs) {
    if (doc.cleanContent) {
      const parsedPairs = extractQAPairsFromText(doc.cleanContent);
      parsedPairs.forEach((p, idx) => {
        dynamicDocQAs.push({
          id: `doc_qa_${doc.id}_${idx}`,
          question: p.question,
          answer: p.answer,
          category: doc.category || 'Genel',
          variations: [],
          productId: doc.productId || undefined,
          productKey: doc.productKey || undefined,
        });
      });
    }
  }

  cachedDocuments = enrichedDocs;
  cachedExtractedQAs = dynamicDocQAs;
  cachedDBQAs = dbQAs;
  cacheTimestamp = now;

  return {
    documents: cachedDocuments,
    extractedQAs: cachedExtractedQAs,
    qas: cachedDBQAs,
  };
}

/**
 * Kullanıcı mesajından telefon numarası, e-posta adresi ve isim bilgisini çıkarır.
 */
export function extractContactInfoFromMessage(message: string): ExtractedContactInfo | null {
  const text = message.trim();
  if (!text) return null;

  // Email regex
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0].toLowerCase() : undefined;

  // Phone regex (Turkish mobile/landline & international +90 / 05xx / 5xx)
  const phoneRegex =
    /(?:(?:\+?90|0090|0)?[\s\-().]*)(5\d{2}|[2348]\d{2})[\s\-().]*(\d{3})[\s\-().]*(\d{2})[\s\-().]*(\d{2})\b/;
  const phoneMatch = text.match(phoneRegex);
  let phone: string | undefined;
  if (phoneMatch) {
    phone = `0${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}${phoneMatch[4]}`;
  }

  if (!phone && !email) {
    return null;
  }

  let name: string | undefined;
  const nameMatch = text.match(
    /(?:adım|adim|ismim|ben)\s+([A-ZÇĞİÖŞÜa-zçğıöşü]{2,20}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,20})?)/i
  );
  if (nameMatch?.[1]) {
    const candidate = nameMatch[1].trim();
    if (!/numara|telefon|mail|eposta|adres/i.test(candidate)) {
      name = candidate;
    }
  }

  return { phone, email, name };
}

/**
 * Prompt injection veya yetkisiz indirim / ücretsiz ürün manipülasyonu kontrolü
 */
export function isPromptInjectionOrManipulation(query: string): boolean {
  const f = toAsciiFolded(query.toLowerCase());
  const injectionPatterns = [
    'sistem kurallarini unut',
    'kurallari unut',
    'onceki talimatlari unut',
    'ignore previous instructions',
    'ignore all instructions',
    'system prompt',
    'gizli prompt',
    'promptunu yaz',
    'promptunu goster',
    'developer mode',
    'jailbreak',
    'tum urunleri ucretsiz ver',
    'hepsini bedava ver',
    'bana %100 indirim',
    'fiyati 1 tl yap',
    'api key',
    'veritabani sifresi',
  ];
  return injectionPatterns.some((p) => f.includes(p));
}

/**
 * İndirim / pazarlık talebi kontrolü (ör. "Bana indirim yapar mısınız?")
 */
export function isDiscountBargainingQuery(query: string): boolean {
  const f = toAsciiFolded(query.toLowerCase());
  return (
    (f.includes('indirim yapar misin') ||
      f.includes('indirim var mi') ||
      f.includes('pazarlik') ||
      f.includes('daha ucuza olur mu') ||
      f.includes('kampanya kodu var mi') ||
      f.includes('indirim tanimla')) &&
    !f.includes('sistem kurallarini')
  );
}

/**
 * Mevcut müşteri teknik destek / ödeme / hesap sorunu kontrolü (Bölüm 9)
 */
export function isExistingCustomerSupportIssue(query: string): boolean {
  const f = toAsciiFolded(query.toLowerCase());
  const hasIssueSignal =
    (f.includes('satin aldigim') ||
      f.includes('odeme cekildi') ||
      f.includes('para cekildi') ||
      f.includes('aboneligim') ||
      f.includes('hesabim aktif olmadi') ||
      f.includes('aktif olmadi') ||
      f.includes('aktiflesmedi') ||
      f.includes('giris yapamiyorum') ||
      f.includes('hata aliyorum') ||
      f.includes('calismiyor') ||
      f.includes('ariza') ||
      f.includes('teknik destek') ||
      f.includes('destek talebi') ||
      f.includes('faturami goremiyorum')) &&
    !f.includes('fiyatlari') &&
    !f.includes('nedir');
  return hasIssueSignal;
}

/**
 * Kapsam dışı genel kültür / isim anlamı / hava durumu / tarif vb. soruları tespit eder (Bölüm 8.1)
 */
export function isOutOfScopeGeneralQuery(query: string): boolean {
  const f = toAsciiFolded(query.toLowerCase())
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Explicit out-of-scope patterns (e.g. "Cemre isminin anlamı nedir?", "Esmanın anlamı", "Cemre nın anamı")
  if (
    /\b(isminin|adinin)\s+(anlami|manasi)\b/.test(f) ||
    /\b[a-z]{3,12}\s*(nin|nun|in|un|nam|nin)\s*(anlami|anami|manasi)\b/.test(f) ||
    (/\banlami\s+nedir\b/.test(f) &&
      !/(midvem|alom|faktura|scoreform|postify|studio|erp|kuscu|auto plug|inpaint|outpaint|sla|ivr|dtmf|roas|seo|saas|b2b)/.test(
        f
      ))
  ) {
    return true;
  }

  const outOfScopeKeywords = [
    'hava durumu',
    'bugun hava nasil',
    'yemek tarifi',
    'corba tarifi',
    'kek tarifi',
    'burc yorumu',
    'gunluk burc',
    'mac sonucu',
    'maci kac kac',
    'galatasaray',
    'fenerbahce',
    'besiktas',
    'trabzonspor',
    'ruya tabiri',
    'bas agrisi',
    'hangi ilac',
    'siir yaz',
    'masal anlat',
    'fikra anlat',
    'baskenti neresidir',
    'kac kilometre',
    'gezegeni',
    'uzay madenciligi',
    'roket yakiti',
  ];

  if (outOfScopeKeywords.some((kw) => f.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Müşterinin bir iş problemi anlattığı ve ihtiyaç analizi / ürün eşleştirmesi gereken durumları tespit eder (Bölüm 5)
 */
export function detectNeedsAnalysisScenario(
  query: string,
  catalog: CatalogProduct[]
): {
  matchedProduct: CatalogProduct | null;
  answer: string;
  clarifyingOptions: string[];
} | null {
  const f = toAsciiFolded(query.toLowerCase());

  // 1. Phone / Call Center Traffic Problem ("Telefonlara yetişemiyoruz", "müşteriler meşgul çalıyor", "aramaları kaçırıyoruz")
  if (
    (f.includes('telefonlara yetisemiyoruz') ||
      f.includes('telefona yetisemiyoruz') ||
      f.includes('telefonlara bakamiyoruz') ||
      f.includes('mesgul caliyor') ||
      f.includes('cagrilara yetisemiyoruz') ||
      f.includes('aramalari kaciriyoruz') ||
      f.includes('telefon trafigi') ||
      (f.includes('telefon') &&
        (f.includes('yetisemiyor') ||
          f.includes('mesgul') ||
          f.includes('kaciriyor') ||
          f.includes('cevaplayan bir yapay zeka')))) &&
    !f.includes('fiyat') &&
    !f.includes('kac dakika')
  ) {
    const alom = catalog.find((c) => c.key === 'alom') || null;
    const msCall = catalog.find((c) => c.key === 'microsoft-call-center-ai') || null;
    const alomUrl =
      alom?.purchaseUrl ||
      `${SITE_BASE_URL}/services/ai-automation/alom-yapay-zeka-destekli-cagri-merkezi#paketler`;

    const answer =
      `Yoğun telefon trafiği ve meşgul çalan hatlar için **Alom Yapay Zeka Destekli Çağrı Merkezi** çözümümüz tam ihtiyacınıza uygundur. Alom; işletmenize gelen aramaları 7/24 doğal insan sesiyle bekletmeden karşılar, sık sorulan soruları yanıtlar, görüşme sırasında takviminize randevu işler ve gerektiğinde çağrıyı canlı temsilcinize aktarır (50+ yabancı dil desteği gereken kurumsal senaryolarda **Microsoft Call Center AI** çözümümüz de mevcuttur).\n\n` +
      `• **Standart / Başlangıç Kapsamı:** ₺2.500 / ay (+ KDV) — 7/24 gelen çağrı karşılama, doğal ses, canlı temsilciye aktarım ve yazılı transkript\n` +
      `• **Gelişmiş / Kurumsal Kapsam:** ₺5.000 / ay (+ KDV) — Otomatik dış arama (hatırlatma/kampanya), görüşme içi takvim/randevu yönetimi ve canlı sistem sorgulama\n\n` +
      `Paketleri incelemek ve hemen satın almak için: [Alom Paketleri](${alomUrl})\n\n` +
      `Size en doğru paketi önerebilmem için: **Yalnızca gelen telefonların 7/24 karşılanması mı yeterli olur, yoksa otomatik dış arama ve takvimden randevu oluşturma özelliğine de ihtiyacınız var mı?**`;

    return {
      matchedProduct: alom || msCall,
      answer,
      clarifyingOptions: [
        'Yalnızca gelen aramaları karşılasın (Standart Paket)',
        'Randevu ve dış arama da olsun (Gelişmiş Paket)',
        'Alom paketlerini satın almak istiyorum',
      ],
    };
  }

  // 2. Written Messaging / Omnichannel Problem ("Mesajlara yetişemiyoruz", "WhatsApp ve Instagram DM çok yoğun")
  if (
    (f.includes('mesajlara yetisemiyoruz') ||
      f.includes('dm yetisemiyoruz') ||
      (f.includes('whatsapp') &&
        f.includes('instagram') &&
        (f.includes('yetisemiyor') ||
          f.includes('tek ekran') ||
          f.includes('yonetmek istiyoruz')))) &&
    !f.includes('karisir mi') &&
    !f.includes('karisiyor mu')
  ) {
    const midvem = catalog.find((c) => c.key === 'midvem') || null;
    const midvemUrl =
      midvem?.purchaseUrl ||
      `${SITE_BASE_URL}/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi#paketler`;

    const answer =
      `WhatsApp, Instagram DM, web canlı destek ve e-posta mesajlarını tek merkezden yönetmek ve 7/24 yapay zekâ ile anında yanıtlamak için **Midvem – Müşteri Destek ve İletişim Sistemi** çözümümüzü öneririz.\n\n` +
      `• **Midvem Başlangıç:** ₺1.500 / ay (2 temsilci, canlı destek web widget, Instagram DM)\n` +
      `• **Midvem Pro *(Sık Tercih Edilen)*:** ₺2.500 / ay (5 temsilci, resmi WhatsApp Business, sınırsız AI yanıt asistanı, Shopify/ikas canlı sipariş paneli)\n` +
      `• **Midvem Kurumsal:** ₺3.500 / ay (Sınırsız temsilci, tüm kanallar + özel telefon/SMS, özel AI modeli, %99.9 SLA)\n\n` +
      `Paketleri incelemek ve hemen satın almak için: [Midvem Paketleri](${midvemUrl})\n\n` +
      `En uygun paketi belirleyebilmemiz için: **Kaç müşteri temsilcisiyle çalışıyorsunuz ve WhatsApp Business / e-ticaret sipariş entegrasyonuna ihtiyacınız var mı?**`;

    return {
      matchedProduct: midvem,
      answer,
      clarifyingOptions: [
        'Midvem Pro paketini incelemek istiyorum',
        'Küçük işletmeyiz, Başlangıç paketi uygun mu?',
      ],
    };
  }

  // 3. Broad / Ambiguous Need ("Ne önerirsiniz?", "İşletmem için hangi çözüm uygun?")
  if (
    f.includes('isletmem icin ne onerirsiniz') ||
    f.includes('hangi urunu onerirsiniz') ||
    f.includes('hangi cozum bana uygun') ||
    f.includes('dijital cozum ariyorum')
  ) {
    const answer =
      `İşletmenizin ihtiyacına göre doğrulanan başlıca çözümlerimiz şunlardır:\n\n` +
      `• **Telefon trafiğini 7/24 sesli yapay zekâ ile karşılamak için:** [Alom Çağrı Merkezi](${SITE_BASE_URL}/services/ai-automation/alom-yapay-zeka-destekli-cagri-merkezi#paketler) (₺2.500/ay'dan başlayan paketler)\n` +
      `• **WhatsApp, Instagram ve canlı destek mesajlarını tek ekranda toplamak için:** [Midvem Müşteri Destek Sistemi](${SITE_BASE_URL}/services/ai-automation/midvem-musteri-destek-ve-iletisim-sistemi#paketler) (₺1.500/ay'dan başlayan paketler)\n` +
      `• **Sosyal medya ve reklam yönetimi danışmanlığı için:** [Sosyal Medya & Reklam Danışmanlığı](${SITE_BASE_URL}/services/sosyal-medya-reklam-danismanligi#basvuru-formu) (Min. ₺15.000/ay hizmet bedeli)\n\n` +
      `Size en doğru çözümü sunabilmem için: **Öncelikli ihtiyacınız telefon aramalarını karşılamak mı, yazılı müşteri mesajlarını yönetmek mi, yoksa sosyal medya/e-ticaret satışı büyütmek mi?**`;

    return {
      matchedProduct: null,
      answer,
      clarifyingOptions: [
        'Telefon aramalarını karşılamak (Alom)',
        'WhatsApp ve Instagram mesajlarını yönetmek (Midvem)',
        'Sosyal medya ve reklam danışmanlığı',
      ],
    };
  }

  return null;
}

/**
 * Kapsam içi bir ürün için doğrulanmamış/kaynakta yer almayan spesifik limit/kota veya teknik özellik sorusu kontrolü (Bölüm 8.2 & Test G)
 */
export function checkUnverifiedProductDetailQuery(
  query: string,
  targetProduct: CatalogProduct | null,
  recentHistoryText?: string
): {
  isUnverifiedInScope: boolean;
  answer: string;
  handoverReason: string;
} | null {
  const f = toAsciiFolded(query.toLowerCase()).trim();

  // Case A: User asks a short follow-up like "Yani?" or "Yani kaç dakika?" right after an Alom / limit discussion
  if (
    (f === 'yani' || f === 'yani?' || f === 'peki kac dakika' || f === 'net bilgi yok mu') &&
    targetProduct
  ) {
    if (targetProduct.key === 'alom') {
      return {
        isUnverifiedInScope: true,
        handoverReason: `Müşteri ${targetProduct.name} için aylık dakika kotası / kullanım limiti detayını sordu.`,
        answer: `**${targetProduct.name}** ürünümüzde Standart (₺2.500/ay + KDV) ve Gelişmiş (₺5.000/ay + KDV) paketlerimiz mevcuttur; ancak aylık sabit dakika kotası kamuya açık dokümantasyonda tek bir standart rakam olarak belirtilmemiş olup işletmenizin çağrı hacmine göre yapılandırılmaktadır.\n\nBu detayı sizin için ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`,
      };
    }
  }

  if (!targetProduct) return null;

  // Case B: Product-specific unverified limit topics (e.g. Alom "kaç dakika hakkımız var", "arama hakkı", "dakika limiti")
  if (targetProduct.key === 'alom') {
    const asksMinuteQuota =
      f.includes('kac dakika') ||
      f.includes('dakika hakki') ||
      f.includes('arama hakki') ||
      f.includes('dakika limiti') ||
      f.includes('dakika siniri') ||
      f.includes('aylik dakika') ||
      f.includes('gorusme kotasi');

    if (asksMinuteQuota) {
      return {
        isUnverifiedInScope: true,
        handoverReason:
          'Müşteri Alom Yapay Zeka Çağrı Merkezi paketlerindeki aylık dakika hakkını / limitini sordu.',
        answer: `**Alom Yapay Zeka Destekli Çağrı Merkezi** paketlerimiz (**Standart Kapsam: ₺2.500 / ay + KDV** ve **Gelişmiş Kapsam: ₺5.000 / ay + KDV**) işletmelerin çağrı trafiğine ve eşzamanlı hat ihtiyacına göre ölçeklenmektedir; doğrulanmış ürün kaynaklarımızda sabit bir aylık dakika kotası rakamı yer almamaktadır.\n\nBu detayı sizin için ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`,
      };
    }
  }

  // Case C: e-Studio monthly image generation quota ("kaç fotoğraf hakkı var", "aylık kaç görsel")
  if (targetProduct.key === 'e-studio') {
    if (
      f.includes('kac fotograf') ||
      f.includes('kac gorsel') ||
      f.includes('kredi limiti') ||
      f.includes('uretim kotasi') ||
      f.includes('kac adet resim')
    ) {
      return {
        isUnverifiedInScope: true,
        handoverReason:
          'Müşteri e-Studio paketlerindeki aylık görsel üretim adedi / kredi kotasını sordu.',
        answer: `**e-Studio** ürünümüzde **Standart Kapsam (₺2.500 / ay + KDV)** ve **Gelişmiş Kapsam (₺5.000 / ay + KDV)** paketlerimiz bulunmaktadır; ancak aylık net görsel üretim kredisi/adedi kamuya açık kaynaklarımızda sabit bir sayı olarak belirtilmemiştir.\n\nBu detayı sizin için ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`,
      };
    }
  }

  // Case D: Postify channel count / AI credit quota
  if (targetProduct.key === 'postify') {
    if (
      f.includes('kac hesap baglanir') ||
      f.includes('kanal limiti kac') ||
      f.includes('kac kredi')
    ) {
      return {
        isUnverifiedInScope: true,
        handoverReason: 'Müşteri Postify paketlerindeki spesifik hesap/kredi kotasını sordu.',
        answer: `**Postify** ürünümüzde **Standart Paket (₺2.500 / ay + KDV)** ve **Profesyonel / Ajans Paketi (₺5.000 / ay + KDV)** sunulmaktadır; ancak bağlanabilecek maksimum hesap adedi ve aylık AI kredi kotası detayları resmi kaynaklarımızda sabit bir rakam olarak yer almamaktadır.\n\nBu detayı sizin için ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`,
      };
    }
  }

  return null;
}

/**
 * Ham doküman parçalarındaki (chunk) markdown başlık kalıntılarını ("[Bölüm: ...]", "### 3.2.") temizler.
 */
export function cleanChunkTextForCustomer(rawChunkText: string): string {
  return rawChunkText
    .replace(/\[Bölüm:[^\]]*\]/gi, '')
    .replace(/^[^\n]*\]\s*/gm, '')
    .replace(/^#{1,6}\s*\d*(\.\d+)*\.?\s*/gm, '')
    .replace(/\*\*Soru\s*\d+:\*\*/gi, '')
    .replace(/Soru\s*\d+:/gi, '')
    .replace(/\*\*Cevap:\*\*/gi, '')
    .replace(/\bCevap:\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toSuggestedProductCard(product: CatalogProduct) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    type: 'plan' as const,
    description: product.shortDescription,
    priceFormatted: product.startingPriceFormatted || 'Özel Teklif',
    tiers: product.tiers.map((t) => ({
      name: t.name,
      priceFormatted: t.priceFormatted,
      features: t.features,
    })),
    url: product.purchaseUrl,
  };
}

/**
 * Ana deterministik bilgi, katalog ve kural motoru.
 */
export async function executeDeterministicKnowledgeEngine(
  rawQuery: string,
  targetProductId?: string | null,
  contextOptions?: EngineContextOptions
): Promise<EngineResponse> {
  const query = rawQuery.trim();
  const analysis: QueryAnalysis = analyzeCustomerQuery(query);
  const { normalizedQuery, foldedQuery, intent } = analysis;

  const catalog = await getVerifiedCatalog();
  const recentHistoryText = (contextOptions?.conversationHistory || [])
    .slice(-6)
    .map((m) => m.content)
    .join(' ');

  const contextProductKey = inferProductKeyFromContext(contextOptions?.pageUrl, targetProductId);
  const detectedProductKey = detectProductKeyFromQuery(query, contextProductKey, recentHistoryText);
  const matchedCatalogProduct = detectedProductKey
    ? catalog.find(
        (c) =>
          c.key === detectedProductKey ||
          c.slug === detectedProductKey ||
          c.id === detectedProductKey
      ) || null
    : null;

  // ============================================================================
  // 0. PROMPT INJECTION & MANIPULATION GUARD (Bölüm 13.4 & Test N)
  // ============================================================================
  if (isPromptInjectionOrManipulation(query)) {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'injection_blocked',
      answer:
        "Güvenlik ve şirket politikamız gereği sistem yönergelerimizi paylaşamıyor, doğrulanmış resmi paket fiyatlarımız dışında ücretsiz ürün veya yetkisiz indirim tanımlayamıyoruz. Çiçekana Teknoloji & Medya'nın doğrulanmış yazılım, yapay zekâ otomasyonu ve danışmanlık çözümleri hakkında size memnuniyetle yardımcı olabilirim.",
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      shouldNotifyEvent: null,
      shouldLogUnanswered: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 1. CONTACT INFO SHARED IN MESSAGE (Bölüm 8.2, 8.3 & Test H)
  // ============================================================================
  const extractedContact = extractContactInfoFromMessage(query);
  if (extractedContact && (extractedContact.phone || extractedContact.email)) {
    const isEnglish = /\b(my phone|my email|call me|contact me|reach me)\b/i.test(query);
    return {
      query,
      normalizedQuery,
      detectedIntent: 'EXPLICIT_HANDOVER',
      detectedSubject: matchedCatalogProduct?.name || analysis.detectedSubject,
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'contact_captured',
      answer: buildSlaFollowupConfirmationMessage(isEnglish ? 'en' : 'tr'),
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      handoverReason:
        'Müşteri sohbet mesajı içerisinde iletişim bilgisini (telefon/e-posta) paylaştı.',
      shouldNotifyEvent: 'SALES_OPPORTUNITY',
      shouldLogUnanswered: false,
      extractedContact,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 2. /MAGAZA PRINT & STORE PRODUCTS EXCLUSION (Bölüm 3.2 & Test B)
  // ============================================================================
  if (
    isMagazaStoreQuery(query) ||
    (contextOptions?.pageUrl &&
      contextOptions.pageUrl.includes('/magaza') &&
      !matchedCatalogProduct)
  ) {
    if (isMagazaStoreQuery(query)) {
      return {
        query,
        normalizedQuery,
        detectedIntent: intent,
        detectedSubject: 'Mağaza / Baskı Ürünleri (Kapsam Dışı)',
        detectedProductKey: null,
        detectedProductName: null,
        responseCategory: 'magaza_excluded',
        answer:
          'Bu sohbet hattımız üzerinden `/magaza` bölümündeki baskı, matbaa ve fiziksel mağaza ürünleri için satış veya destek sunulamamaktadır. Ancak yapay zekâ destekli yazılımlarımız (**Alom, Midvem, Faktura, ScoreForm, Postify, e-Studio, Çiçekana AI-ERP, Kuşçu**), **Anahtar Teslim E-Ticaret Paketlerimiz**, **Kurumsal Web Yazılım** ve **Sosyal Medya & Reklam Danışmanlığı** hizmetlerimiz hakkında size memnuniyetle yardımcı olabilirim.',
        confidence: 1.0,
        confidenceLevel: 'HIGH',
        isHandoverPrompt: false,
        shouldNotifyEvent: null,
        shouldLogUnanswered: false,
        matchedEvidence: [],
        usedDocumentIds: [],
        suggestedProducts: [],
        isFallback: false,
        externalApiUsed: false,
      };
    }
  }

  // ============================================================================
  // 3. OUT-OF-SCOPE GENERAL QUESTIONS (Bölüm 8.1 & Test E - e.g. "Cemre isminin anlamı")
  // ============================================================================
  if (isOutOfScopeGeneralQuery(query)) {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: 'Kapsam Dışı Genel Soru',
      detectedProductKey: null,
      detectedProductName: null,
      responseCategory: 'out_of_scope',
      answer:
        "Bu sohbet asistanı yalnızca **Çiçekana Teknoloji & Medya**'nın sunduğu yazılım, yapay zekâ otomasyonları, web/e-ticaret altyapıları ve dijital danışmanlık hizmetleri hakkında bilgi vermektedir. Ürün ve hizmetlerimizle ilgili bir sorunuz varsa memnuniyetle yardımcı olabilirim.",
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      shouldNotifyEvent: null,
      shouldLogUnanswered: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 4. EXISTING CUSTOMER TECHNICAL / PAYMENT SUPPORT (/profile) (Bölüm 9 & Test I)
  // ============================================================================
  if (isExistingCustomerSupportIssue(query)) {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: matchedCatalogProduct?.name || 'Müşteri Teknik Destek',
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'support_escalation',
      answer: `Yaşadığınız ödeme/aktivasyon veya teknik sorun için hemen yardımcı olmak isteriz. Mevcut müşterilerimiz, hesaplarına giriş yaptıktan sonra [Profil Destek Talebi Alanı](${SITE_BASE_URL}/profile?tab=support) (\`/profile\`) üzerinden doğrudan teknik destek talebi oluşturabilir ve işlem durumunu anlık takip edebilirler (bu alan için üye girişi yapılması gerekmektedir).\n\nAyrıca dilerseniz kayıtlı **telefon numaranızı veya e-posta adresinizi** buradan da paylaşabilirsiniz; teknik ekibimize hemen bildirim iletiyoruz.`,
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: true,
      handoverReason:
        'Mevcut müşteri ödeme/hesap/teknik destek sorunu bildirdi ve /profile destek alanına yönlendirildi.',
      shouldNotifyEvent: 'SUPPORT_ESCALATION',
      shouldLogUnanswered: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 5. EXPLICIT HANDOVER REQUEST ("Müşteri temsilcisine bağlan", "Beni arayın")
  // ============================================================================
  if (intent === 'EXPLICIT_HANDOVER') {
    const isCallback = /(?:ara|telefon|numara)/i.test(foldedQuery);
    const reason = isCallback
      ? 'Müşteri telefonla aranma talebinde bulundu.'
      : 'Müşteri doğrudan müşteri temsilcisine bağlanmak istedi.';

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: matchedCatalogProduct?.name || analysis.detectedSubject,
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'handover',
      answer:
        'Talebinizi memnuniyetle ekibimize iletebiliriz. Size en kısa sürede dönüş yapabilmemiz için **telefon numaranızı veya e-posta adresinizi** paylaşır mısınız?',
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: true,
      handoverReason: reason,
      shouldNotifyEvent: 'SALES_OPPORTUNITY',
      shouldLogUnanswered: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 6. GREETINGS & GRATITUDE
  // ============================================================================
  if (intent === 'GREETING') {
    const isEnglish = /^\s*(hello|hi|hey|good morning|good afternoon)\b/i.test(query);
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: analysis.detectedSubject,
      responseCategory: 'greeting',
      answer: isEnglish
        ? 'Hello! Welcome to Çiçekana Tech Media. How can I help you with our AI automation products (Alom, Midvem, Faktura, ScoreForm, Postify, e-Studio, Çiçekana ERP, Kuşçu), e-commerce packages, web development, or social media & advertising consultancy?'
        : "Merhaba! Çiçekana Teknoloji & Medya'ya hoş geldiniz. Yapay zekâ otomasyonlarımız (**Alom, Midvem, Faktura, ScoreForm, Postify, e-Studio, Çiçekana AI-ERP, Kuşçu**), **E-Ticaret Paketlerimiz**, **Kurumsal Web Yazılım** ve **Sosyal Medya & Reklam Danışmanlığı** hizmetlerimiz hakkında size nasıl yardımcı olabilirim?",
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  if (
    intent === 'GRATITUDE' ||
    (!query.includes('?') &&
      /^(?:tesekkurler|tesekkur\s+ederim|cok\s+tesekkur|sagol|sagolun|sag\s+olun|eyvallah|harika|cok\s+iyi|tamamdir|anladim|gayet\s+aciklayici)/i.test(
        foldedQuery
      ))
  ) {
    return {
      query,
      normalizedQuery,
      detectedIntent: 'GRATITUDE',
      detectedSubject: analysis.detectedSubject,
      responseCategory: 'greeting',
      answer:
        'Rica ederiz! Ürünlerimiz, paketlerimiz veya hizmetlerimizle ilgili başka bir sorunuz olursa memnuniyetle yardımcı olabilirim.',
      confidence: 1.0,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 7. DISCOUNT / BARGAINING REQUEST ("İndirim yapar mısınız?")
  // ============================================================================
  if (isDiscountBargainingQuery(query)) {
    const prod = matchedCatalogProduct || catalog.find((c) => c.key === 'midvem') || null;
    const priceInfo = prod ? `\n\n${buildAuthoritativePricingResponse(prod)}` : '';
    return {
      query,
      normalizedQuery,
      detectedIntent: 'PRICING_PLANS',
      detectedSubject: prod?.name || 'Fiyatlandırma Politikası',
      detectedProductKey: prod?.key || null,
      detectedProductName: prod?.name || null,
      responseCategory: 'sales_catalog',
      answer: `Sohbet üzerinden standart paket fiyatlarımız dışında özel bir indirim veya kampanya tanımlayamıyoruz; tüm müşterilerimiz için ürün sayfalarımızdaki güncel resmi fiyatlarımız geçerlidir. Ancak çoklu lisans veya kurumsal kapsamlı talepleriniz için telefon numaranızı ya da e-posta adresinizi paylaşırsanız satış ekibimiz sizinle iletişime geçebilir.${priceInfo}`,
      confidence: 0.95,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: [],
      usedDocumentIds: [],
      suggestedProducts: prod && prod.isDirectPurchase ? [toSuggestedProductCard(prod)] : undefined,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 8. SPECIAL OFFER SERVICE: SOSYAL MEDYA & REKLAM DANIŞMANLIĞI (Bölüm 7 & Test F)
  // ============================================================================
  if (matchedCatalogProduct?.key === 'sosyal-medya-danismanligi') {
    const answer = buildAuthoritativePricingResponse(matchedCatalogProduct);
    return {
      query,
      normalizedQuery,
      detectedIntent: 'PRICING_PLANS',
      detectedSubject: matchedCatalogProduct.name,
      detectedProductKey: matchedCatalogProduct.key,
      detectedProductName: matchedCatalogProduct.name,
      responseCategory: 'special_offer_service',
      answer,
      confidence: 0.98,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: true,
      handoverReason:
        'Müşteri Sosyal Medya ve Reklam Danışmanlığı özel teklif hizmeti hakkında bilgi/teklif istedi.',
      shouldNotifyEvent: null,
      shouldLogUnanswered: false,
      matchedEvidence: [
        {
          sourceType: 'plan',
          sourceId: matchedCatalogProduct.id,
          sourceTitle: matchedCatalogProduct.name,
          snippet: answer,
          score: 98,
          confidence: 0.98,
        },
      ],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 9. UNVERIFIED IN-SCOPE PRODUCT DETAIL / QUOTA (Bölüm 8.2 & Test G - e.g. Alom minute limit)
  // ============================================================================
  const unverifiedDetail = checkUnverifiedProductDetailQuery(
    query,
    matchedCatalogProduct,
    recentHistoryText
  );
  if (unverifiedDetail && unverifiedDetail.isUnverifiedInScope) {
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: matchedCatalogProduct?.name || analysis.detectedSubject,
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'unanswered_in_scope',
      answer: unverifiedDetail.answer,
      confidence: 0.9,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: true,
      handoverReason: unverifiedDetail.handoverReason,
      shouldNotifyEvent: 'FOLLOWUP_NEEDED',
      shouldLogUnanswered: true,
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  if (intent === 'UNVERIFIED_CUSTOM_FEATURE') {
    const prodName = matchedCatalogProduct?.name || 'ilgili ürünümüz';
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: prodName,
      detectedProductKey: matchedCatalogProduct?.key || null,
      detectedProductName: matchedCatalogProduct?.name || null,
      responseCategory: 'unanswered_in_scope',
      answer: `Sorduğunuz bu teknik özellik veya özel kapasite detayı, **${prodName}** için doğrulanmış resmi dokümantasyonumuzda yer almamaktadır. Yanıltıcı bilgi vermemek adına bu detayı sizin için teknik ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`,
      confidence: 0.9,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: true,
      handoverReason: `Müşteri ${prodName} için kaynaklarda yer almayan özel bir teknik özellik sordu: "${query}"`,
      shouldNotifyEvent: 'FOLLOWUP_NEEDED',
      shouldLogUnanswered: true,
      uncertaintyNotes: 'Talep edilen özellik resmî dokümantasyonda tanımlanmamıştır.',
      matchedEvidence: [],
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 10. NEEDS ANALYSIS & PROBLEM-TO-PRODUCT MATCHING (Bölüm 5 & Test A)
  // ============================================================================
  const needsScenario = detectNeedsAnalysisScenario(query, catalog);
  if (needsScenario) {
    const prod = needsScenario.matchedProduct;
    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: prod?.name || 'İhtiyaç Analizi',
      detectedProductKey: prod?.key || null,
      detectedProductName: prod?.name || null,
      responseCategory: 'needs_analysis',
      answer: needsScenario.answer,
      confidence: 0.95,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: prod
        ? [
            {
              sourceType: 'plan',
              sourceId: prod.id,
              sourceTitle: prod.name,
              snippet: needsScenario.answer,
              score: 95,
              confidence: 0.95,
            },
          ]
        : [],
      usedDocumentIds: [],
      suggestedProducts: prod && prod.isDirectPurchase ? [toSuggestedProductCard(prod)] : undefined,
      clarifyingOptions: needsScenario.clarifyingOptions,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 11. AUTHORITATIVE PRODUCT PRICING, PACKAGES & PURCHASE INTENT (Bölüm 4.2, 6 & Test D)
  // ============================================================================
  const isPricingOrPurchaseQuery =
    intent === 'PRICING_PLANS' ||
    intent === 'SMALL_BUSINESS_SUITABILITY' ||
    intent === 'FREE_TIER_POLICY' ||
    /\b(fiyat|fiyati|fiyatlari|ucret|ucreti|kac para|ne kadar|paket|paketler|paketleri|satin al|abone ol|tarife|maliyet|bedava|ucretsiz|en ucuz|esnaf)\b/.test(
      foldedQuery
    );

  if (isPricingOrPurchaseQuery && matchedCatalogProduct) {
    // Also run conflict detector against any KB QAs for this product so conflicts are logged
    const { qas } = await getCachedKnowledge();
    for (const dbQa of qas) {
      if (
        (dbQa.productId && dbQa.productId.toLowerCase().includes(matchedCatalogProduct.key)) ||
        dbQa.question.toLowerCase().includes(matchedCatalogProduct.key)
      ) {
        sanitizeAndResolveConflictsInKBText(dbQa.answer, matchedCatalogProduct);
      }
    }

    const isSmallBiz =
      intent === 'SMALL_BUSINESS_SUITABILITY' ||
      /\b(kucuk esnaf|kucuk isletme|yeni baslayan|en ucuz|baslangic)\b/.test(foldedQuery);
    const isFree =
      intent === 'FREE_TIER_POLICY' || /\b(bedava|ucretsiz|parasiz|free)\b/.test(foldedQuery);
    const isEnglish = /\b(price|pricing|cost|package|buy|purchase|how much)\b/i.test(query);

    const authoritativeAnswer = buildAuthoritativePricingResponse(matchedCatalogProduct, {
      isSmallBusinessQuery: isSmallBiz,
      isFreeQuery: isFree,
      language: isEnglish ? 'en' : 'tr',
    });

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: matchedCatalogProduct.name,
      detectedProductKey: matchedCatalogProduct.key,
      detectedProductName: matchedCatalogProduct.name,
      responseCategory: 'sales_catalog',
      answer: authoritativeAnswer,
      confidence: 0.99,
      confidenceLevel: 'HIGH',
      isHandoverPrompt: !matchedCatalogProduct.isDirectPurchase,
      matchedEvidence: [
        {
          sourceType: 'plan',
          sourceId: matchedCatalogProduct.id,
          sourceTitle: `${matchedCatalogProduct.name} (Güncel Ürün Detay Sayfası)`,
          snippet: authoritativeAnswer,
          score: 100,
          confidence: 1.0,
        },
      ],
      usedDocumentIds: [],
      suggestedProducts: matchedCatalogProduct.isDirectPurchase
        ? [toSuggestedProductCard(matchedCatalogProduct)]
        : undefined,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 12. PRODUCT-SCOPED Q&A MATCHING (Curated + Extracted + DB KnowledgeQA)
  // ============================================================================
  const { documents, extractedQAs, qas } = await getCachedKnowledge();

  // Filter out any /magaza Q&As from DB KnowledgeQA
  const validDBQAs: CuratedQA[] = qas
    .filter((q) => !isMagazaStoreQuery(`${q.question} ${q.answer} ${q.category || ''}`))
    .map((q) => {
      const qaProdKey =
        inferProductKeyFromContext(q.question, q.productId) ||
        inferProductKeyFromContext(q.category, null);
      return {
        id: q.id,
        question: q.question,
        answer: q.answer,
        category: q.category,
        variations: Array.isArray(q.variations) ? (q.variations as string[]) : [],
        productId: q.productId || undefined,
        productKey: qaProdKey || undefined,
      };
    });

  const allQAs: CuratedQA[] = [...BASELINE_CURATED_QAS, ...validDBQAs, ...extractedQAs];

  const processed = tokenizeAndProcess(query);
  const queryTokens = processed.stemmedTokens;
  const expandedTokens = processed.expandedTokens.map(toAsciiFolded);

  let bestQAMatch: {
    qa: CuratedQA;
    score: number;
    matchedVariation: string;
    isExact: boolean;
  } | null = null;

  for (const qa of allQAs) {
    // STRICT PRODUCT ISOLATION (Bölüm 4.1):
    // If the user is asking about a specific product (e.g. Alom), NEVER match a QA from a different product (e.g. Midvem)!
    if (matchedCatalogProduct && qa.productKey && qa.productKey !== matchedCatalogProduct.key) {
      continue;
    }

    const candidateQuestions = [qa.question, ...qa.variations];
    for (const cand of candidateQuestions) {
      const normCand = normalizeForSearch(cand);
      const foldedCand = normalizeForFuzzy(cand);

      if (normCand === normalizedQuery || foldedCand === foldedQuery) {
        bestQAMatch = {
          qa,
          score: 100,
          matchedVariation: cand,
          isExact: true,
        };
        break;
      }

      const candTokens = tokenizeAndProcess(cand);
      const tokenSim = tokenJaccardSimilarity(processed.stemmedTokens, candTokens.stemmedTokens);
      const containmentSim = tokenContainmentSimilarity(
        processed.stemmedTokens,
        candTokens.stemmedTokens
      );
      const strSim = fuzzyStringSimilarity(foldedQuery, foldedCand);

      let effectiveSim = Math.max(
        tokenSim * 0.65 + strSim * 0.35,
        containmentSim >= 0.7 ? containmentSim * 0.7 + tokenSim * 0.3 : 0
      );

      if (qa.intent && qa.intent === intent) {
        effectiveSim += 0.25;
      }
      if (matchedCatalogProduct && qa.productKey === matchedCatalogProduct.key) {
        effectiveSim += 0.1;
      }

      if (effectiveSim >= 0.64) {
        const score = Math.round(effectiveSim * 100);
        if (!bestQAMatch || score > bestQAMatch.score) {
          bestQAMatch = {
            qa,
            score,
            matchedVariation: cand,
            isExact: effectiveSim >= 0.98,
          };
        }
      }
    }

    if (bestQAMatch && bestQAMatch.isExact) break;
  }

  const matchedEvidences: MatchedEvidence[] = [];

  if (bestQAMatch && bestQAMatch.score >= 70) {
    const qaProd =
      matchedCatalogProduct ||
      (bestQAMatch.qa.productKey
        ? catalog.find((c) => c.key === bestQAMatch!.qa.productKey) || null
        : null);

    // Sanitize any stale KB prices in the matched QA answer!
    const { sanitizedText } = sanitizeAndResolveConflictsInKBText(
      cleanChunkTextForCustomer(bestQAMatch.qa.answer),
      qaProd
    );

    matchedEvidences.push({
      sourceType: 'qa',
      sourceId: bestQAMatch.qa.id,
      sourceTitle: bestQAMatch.qa.question,
      snippet: sanitizedText,
      score: bestQAMatch.score,
      confidence: Math.min(1.0, bestQAMatch.score / 100),
      metadata: { matchedVariation: bestQAMatch.matchedVariation },
    });

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: qaProd?.name || analysis.detectedSubject,
      detectedProductKey: qaProd?.key || null,
      detectedProductName: qaProd?.name || null,
      responseCategory: 'feature_qa',
      answer: sanitizedText,
      confidence: Math.min(1.0, bestQAMatch.score / 100),
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds: [],
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 13. PRODUCT OVERVIEW / CATALOG FAQ MATCH
  // ============================================================================
  if (matchedCatalogProduct) {
    // Check if the query matches one of the product's own Plan FAQs
    for (const faq of matchedCatalogProduct.faqs) {
      const faqFolded = normalizeForFuzzy(faq.question);
      const faqSim = fuzzyStringSimilarity(foldedQuery, faqFolded);
      if (faqSim >= 0.55) {
        return {
          query,
          normalizedQuery,
          detectedIntent: intent,
          detectedSubject: matchedCatalogProduct.name,
          detectedProductKey: matchedCatalogProduct.key,
          detectedProductName: matchedCatalogProduct.name,
          responseCategory: 'feature_qa',
          answer: faq.answer,
          confidence: 0.9,
          confidenceLevel: 'HIGH',
          isHandoverPrompt: false,
          matchedEvidence: [
            {
              sourceType: 'plan',
              sourceId: matchedCatalogProduct.id,
              sourceTitle: faq.question,
              snippet: faq.answer,
              score: Math.round(faqSim * 100),
              confidence: 0.9,
            },
          ],
          usedDocumentIds: [],
          isFallback: false,
          externalApiUsed: false,
        };
      }
    }

    // If general overview query about the matched product (e.g. "Faktura nedir?", "Kuşçu ne işe yarar?", "ScoreForm ne işe yarıyor?")
    if (
      /\b(nedir|ne ise yarar|ne ise yariyor|ne is yapar|ozellikleri|hakkinda bilgi|nasil calisir|tanit|hangi platform|hangi kanal|hangi sosyal)\b/.test(
        foldedQuery
      )
    ) {
      const tierSummary =
        matchedCatalogProduct.tiers.length > 0
          ? `\n\n**Paket Seçenekleri:**\n` +
            matchedCatalogProduct.tiers
              .map(
                (t) => `• **${t.name}:** ${t.priceFormatted} (${t.features.slice(0, 3).join(', ')})`
              )
              .join('\n')
          : '';
      const answer =
        `**${matchedCatalogProduct.name}**; ${matchedCatalogProduct.shortDescription}${tierSummary}\n\n` +
        `Detayları incelemek ve satın almak için: [${matchedCatalogProduct.name}](${matchedCatalogProduct.purchaseUrl})`;

      return {
        query,
        normalizedQuery,
        detectedIntent: intent,
        detectedSubject: matchedCatalogProduct.name,
        detectedProductKey: matchedCatalogProduct.key,
        detectedProductName: matchedCatalogProduct.name,
        responseCategory: 'sales_catalog',
        answer,
        confidence: 0.92,
        confidenceLevel: 'HIGH',
        isHandoverPrompt: false,
        matchedEvidence: [
          {
            sourceType: 'plan',
            sourceId: matchedCatalogProduct.id,
            sourceTitle: matchedCatalogProduct.name,
            snippet: answer,
            score: 92,
            confidence: 0.92,
          },
        ],
        usedDocumentIds: [],
        suggestedProducts: matchedCatalogProduct.isDirectPurchase
          ? [toSuggestedProductCard(matchedCatalogProduct)]
          : undefined,
        isFallback: false,
        externalApiUsed: false,
      };
    }
  }

  // ============================================================================
  // 14. PRODUCT-ISOLATED DOCUMENT CHUNK RETRIEVAL
  // ============================================================================
  interface ScoredChunk {
    documentId: string;
    documentTitle: string;
    productKey: string | null;
    chunkIndex: number;
    content: string;
    score: number;
    matchedDistinctiveTokens: string[];
  }

  const scoredChunks: ScoredChunk[] = [];
  const distinctiveQueryTokens = queryTokens.filter(
    (tok) => tok.length >= 3 && !GENERIC_DOMAIN_WORDS.has(toAsciiFolded(tok))
  );

  for (const doc of documents) {
    // STRICT PRODUCT ISOLATION (Bölüm 4.1):
    // If query is about a specific product (e.g. "alom"), skip documents belonging to other specific products (e.g. "midvem")!
    if (matchedCatalogProduct && doc.productKey && doc.productKey !== matchedCatalogProduct.key) {
      continue;
    }

    for (const chunk of doc.chunks) {
      let score = 0;
      const chunkNorm = normalizeForSearch(chunk.content);
      const chunkFolded = toAsciiFolded(chunkNorm);
      const matchedDistinctiveTokens: string[] = [];

      // Skip chunks about /magaza print products
      if (chunkFolded.includes('/magaza') || chunkFolded.includes('tutkalli bloknot')) {
        continue;
      }

      const isPreamble =
        chunk.chunkIndex === 0 ||
        chunkFolded.includes('urunun adi ve kisa tanimi') ||
        chunkFolded.includes('1. urunun adi') ||
        chunkFolded.includes('musteri bilgi tabani ve urun dokumantasyonu');

      if (isPreamble) {
        score -= 60;
      }

      if (normalizedQuery.length >= 8 && chunkNorm.includes(normalizedQuery)) {
        score += 25;
      }

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

      for (const exp of expandedTokens) {
        if (exp.length < 3) continue;
        if (!GENERIC_DOMAIN_WORDS.has(exp) && chunkFolded.includes(exp)) {
          score += 4;
        }
      }

      if (matchedCatalogProduct && doc.productKey === matchedCatalogProduct.key) {
        score += 10;
      }

      if (distinctiveQueryTokens.length >= 2) {
        const matchRatio = matchedDistinctiveTokens.length / distinctiveQueryTokens.length;
        if (matchedDistinctiveTokens.length < 2 && matchRatio < 0.4) {
          score = 0;
        }
      } else if (distinctiveQueryTokens.length === 1 && matchedDistinctiveTokens.length === 0) {
        score = 0;
      }

      if (score > 14) {
        scoredChunks.push({
          documentId: doc.id,
          documentTitle: doc.title,
          productKey: doc.productKey,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          score,
          matchedDistinctiveTokens,
        });
      }
    }
  }

  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 3);
  const usedDocumentIds = Array.from(new Set(topChunks.map((c) => c.documentId)));

  for (const c of topChunks) {
    matchedEvidences.push({
      sourceType: 'document_chunk',
      sourceId: `${c.documentId}#${c.chunkIndex}`,
      sourceTitle: c.documentTitle,
      snippet: cleanChunkTextForCustomer(c.content).slice(0, 300),
      score: c.score,
      confidence: Math.min(1.0, c.score / 50),
    });
  }

  if (topChunks.length > 0 && topChunks[0].score >= 22) {
    const topChunk = topChunks[0];
    const chunkProd =
      matchedCatalogProduct ||
      (topChunk.productKey ? catalog.find((c) => c.key === topChunk.productKey) || null : null);

    const cleanedContent = cleanChunkTextForCustomer(topChunk.content);
    const sentences = cleanedContent
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 20 &&
          !s.startsWith('#') &&
          !s.startsWith('[Bölüm') &&
          !s.includes('Ürünün Adı ve Kısa') &&
          !s.includes('Müşteri Destek Chatbotu İçin Soru-Cevap')
      );

    const rawAnswer = sentences.slice(0, 3).join(' ') || cleanedContent.slice(0, 380).trim();
    const { sanitizedText } = sanitizeAndResolveConflictsInKBText(rawAnswer, chunkProd);

    return {
      query,
      normalizedQuery,
      detectedIntent: intent,
      detectedSubject: chunkProd?.name || analysis.detectedSubject,
      detectedProductKey: chunkProd?.key || null,
      detectedProductName: chunkProd?.name || null,
      responseCategory: 'feature_qa',
      answer: sanitizedText,
      confidence: Math.min(0.95, 0.7 + (topChunk.score / 60) * 0.25),
      confidenceLevel: 'HIGH',
      isHandoverPrompt: false,
      matchedEvidence: matchedEvidences,
      usedDocumentIds,
      isFallback: false,
      externalApiUsed: false,
    };
  }

  // ============================================================================
  // 15. IN-SCOPE BUT UNANSWERED QUESTION -> LEAD CAPTURE & TEAM FOLLOW-UP (Bölüm 8.2)
  // ============================================================================
  const prodContextText = matchedCatalogProduct
    ? `**${matchedCatalogProduct.name}** ile ilgili bu detayı`
    : 'Bu detayı';

  const unansweredAnswer = `${prodContextText} sizin için ekibimizle netleştirip dönüş yapabiliriz. Telefon numaranızı veya e-posta adresinizi paylaşır mısınız?`;

  return {
    query,
    normalizedQuery,
    detectedIntent: intent,
    detectedSubject: matchedCatalogProduct?.name || analysis.detectedSubject,
    detectedProductKey: matchedCatalogProduct?.key || null,
    detectedProductName: matchedCatalogProduct?.name || null,
    responseCategory: 'unanswered_in_scope',
    answer: unansweredAnswer,
    confidence: 0.35,
    confidenceLevel: 'LOW',
    isHandoverPrompt: true,
    handoverReason: `Kapsam içi soru için ekip teyidi gerekiyor: "${query}"`,
    shouldNotifyEvent: 'FOLLOWUP_NEEDED',
    shouldLogUnanswered: true,
    matchedEvidence: matchedEvidences,
    usedDocumentIds: [],
    isFallback: true,
    externalApiUsed: false,
  };
}
