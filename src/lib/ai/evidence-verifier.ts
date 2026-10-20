import { RetrievedChunk, VerifiedProductInfo } from "./retrieval-engine";

export interface EvidenceVerificationResult {
  sufficient: boolean;
  confidence: number;
  reason?: string;
  isExplicitHandoverRequest: boolean;
  isGeneralGreeting: boolean;
  handoverPrompt?: string;
}

const HUMAN_REQUEST_PATTERNS = [
  /insan/i,
  /(müşteri\s+)?temsilci(si)?/i,
  /yetkili/i,
  /beni\s+ara(yın|r\s+mısınız)?/i,
  /telefon(um|la)?/i,
  /özel\s+(teklif|fiyat)/i,
  /canlı\s+destek/i,
  /biriyle\s+görüş/i,
];

const GREETING_PATTERNS = [
  /^(merhaba|selam|selamlar|iyi\s+günler|günaydın|iyi\s+akşamlar|kolay\s+gelsin|merhabalar)[.!?]?$/i,
];

/**
 * Evaluates whether the retrieved evidence contains verified facts to answer the question.
 * Strictly prevents hallucinations or speculative claims.
 */
export function verifyEvidenceSufficiency(
  query: string,
  chunks: RetrievedChunk[],
  verifiedProducts: VerifiedProductInfo[]
): EvidenceVerificationResult {
  const trimmed = query.trim();

  // 1. Explicit request to talk with a human
  const isExplicitHandoverRequest = HUMAN_REQUEST_PATTERNS.some((p) => p.test(trimmed));
  if (isExplicitHandoverRequest) {
    return {
      sufficient: false,
      confidence: 1.0,
      isExplicitHandoverRequest: true,
      isGeneralGreeting: false,
      reason: "Müşteri doğrudan insan temsilci ile görüşmek istedi.",
      handoverPrompt:
        "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?",
    };
  }

  // 2. Simple greetings
  const isGeneralGreeting = GREETING_PATTERNS.some((p) => p.test(trimmed));
  if (isGeneralGreeting) {
    return {
      sufficient: true,
      confidence: 1.0,
      isExplicitHandoverRequest: false,
      isGeneralGreeting: true,
    };
  }

  // 3. If there are neither document chunks nor matched verified products
  if (chunks.length === 0 && verifiedProducts.length === 0) {
    return {
      sufficient: false,
      confidence: 0.1,
      isExplicitHandoverRequest: false,
      isGeneralGreeting: false,
      reason: "Soruyla eşleşen aktif ve onaylanmış ürün dokümanı veya paket bilgisi bulunamadı.",
      handoverPrompt:
        "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili uzman ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?",
    };
  }

  // 4. Feature / Integration / Specific term verification
  // If query asks for a specific technical integration or guarantee, check whether any chunk mentions that subject
  const lowerQuery = trimmed.toLowerCase();
  const tokens = lowerQuery
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);

  // Common technical / integration terms to check
  const technicalKeywords = [
    "whatsapp", "instagram", "facebook", "shopify", "woocommerce", "trendyol",
    "hepsiburada", "entegrasyon", "api", "erp", "muhasebe", "sms", "e-posta",
    "iade", "kdv", "fatura", "özel yazılım", "mobil uygulama"
  ];

  const questionedTech = technicalKeywords.filter((tk) => lowerQuery.includes(tk));

  if (questionedTech.length > 0) {
    // If the customer specifically asks about a tech (e.g. "Shopify"), check if any chunk or product features mention it
    const allChunkText = chunks.map((c) => c.content.toLowerCase()).join(" ");
    const allProductText = verifiedProducts
      .flatMap((p) => [
        p.name.toLowerCase(),
        p.description?.toLowerCase() || "",
        ...(p.tiers?.flatMap((t) => t.features.map((f) => f.toLowerCase())) || []),
      ])
      .join(" ");

    const combinedText = allChunkText + " " + allProductText;

    const missingTech = questionedTech.filter((tk) => !combinedText.includes(tk));

    if (missingTech.length > 0) {
      // Evidence is missing for the questioned integration/feature
      return {
        sufficient: false,
        confidence: 0.3,
        isExplicitHandoverRequest: false,
        isGeneralGreeting: false,
        reason: `Belirtilen özellik veya entegrasyon (${missingTech.join(", ")}) onaylı dokümanlarda doğrulanamadı.`,
        handoverPrompt:
          "Bu özelliğin mevcut kapsamını şu anda sistemimizde doğrulanmış verilerle teyit edemiyorum. Size yanıltıcı bilgi vermemek adına konuyu yetkili teknik ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?",
      };
    }
  }

  // If we have top chunks with high relevance or verified products, evidence is sufficient
  const maxChunkScore = chunks.length > 0 ? chunks[0].score : 0;
  if (maxChunkScore >= 3 || verifiedProducts.length > 0) {
    return {
      sufficient: true,
      confidence: Math.min(1.0, 0.6 + maxChunkScore * 0.05),
      isExplicitHandoverRequest: false,
      isGeneralGreeting: false,
    };
  }

  // If score is weak and low confidence
  return {
    sufficient: false,
    confidence: 0.4,
    isExplicitHandoverRequest: false,
    isGeneralGreeting: false,
    reason: "Onaylı dokümanlardaki bilgi yetersizliği sebebiyle güvenli yanıt üretilemiyor.",
    handoverPrompt:
      "Bu konuda size yanlış bilgi vermek istemem. Sorunuzu ilgili ekibimize iletebiliriz. Size ulaşabilmemiz için telefon numaranızı bırakabilir misiniz?",
  };
}
