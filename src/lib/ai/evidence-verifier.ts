import { RetrievedChunk, VerifiedProductInfo } from "./retrieval-engine";

export interface EvidenceVerificationResult {
  sufficient: boolean;
  confidence: number;
  reason?: string;
  isExplicitHandoverRequest: boolean;
  isGeneralGreeting: boolean;
  handoverPrompt?: string;
}

// Strictly matches explicit human agent / callback / call requests
const EXPLICIT_CALLBACK_PATTERNS = [
  /(beni|bizi)\s+(ara|arayın|arar\s+mısınız|arayabilir\s+misiniz)/i,
  /telefon(um)?la\s+(ara|arayın|ulaşın|görüşelim)/i,
  /numaramı\s+bırak(mak|ayım)/i,
  /geri\s+dönüş\s+yap(ın|ar\s+mısınız)?/i,
  /geri\s+arama\s+talebi/i,
];

const EXPLICIT_HUMAN_AGENT_PATTERNS = [
  /(müşteri\s+)?temsilci(sine|siyle|ye)?\s+(bağlan|aktar|görüşmek|konuşmak)/i,
  /(canlı\s+)?temsilci(ye|yle)?\s+(bağla|aktar)/i,
  /bir\s+(yetkili|insan|uzman)la\s+(görüşmek|konuşmak)\s+istiyorum/i,
  /insan\s+desteği(ne\s+bağla|yle\s+görüş)/i,
  /yetkiliye\s+aktar/i,
  /temsilciye\s+bağla/i,
];

const GREETING_PATTERNS = [
  /^(merhaba|selam|selamlar|iyi\s+günler|günaydın|iyi\s+akşamlar|kolay\s+gelsin|merhabalar)[.!?]?$/i,
];

/**
 * Evaluates whether the retrieved evidence contains verified facts to answer the question.
 * Strictly prevents hallucinations or speculative claims while never demanding phone numbers unsolicited.
 */
export function verifyEvidenceSufficiency(
  query: string,
  chunks: RetrievedChunk[],
  verifiedProducts: VerifiedProductInfo[]
): EvidenceVerificationResult {
  const trimmed = query.trim();

  // 1. Explicit request to talk with a human or receive a phone callback
  const isExplicitCallback = EXPLICIT_CALLBACK_PATTERNS.some((p) => p.test(trimmed));
  const isExplicitAgent = EXPLICIT_HUMAN_AGENT_PATTERNS.some((p) => p.test(trimmed));

  if (isExplicitCallback || isExplicitAgent) {
    return {
      sufficient: false,
      confidence: 1.0,
      isExplicitHandoverRequest: true,
      isGeneralGreeting: false,
      reason: isExplicitCallback
        ? "Müşteri telefonla aranma talebinde bulundu."
        : "Müşteri müşteri temsilcisine bağlanmak istedi.",
      handoverPrompt: isExplicitCallback
        ? "Talebinizi memnuniyetle aldık. Yetkili ekibimizin sizi en kısa sürede arayabilmesi için lütfen telefon numaranızı bırakınız."
        : "Talebinizi memnuniyetle müşteri temsilcimize aktarabiliriz. Size en kısa sürede ulaşabilmemiz için telefon numaranızı paylaşabilir misiniz?",
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
        "Bu konuda sistemimizde şu anda doğrulanmış bir bilgi kaydı bulunmuyor. Dilerseniz sorunuzu farklı kelimelerle iletebilir ya da müşteri temsilcimizle görüşmek istediğinizi belirtebilirsiniz.",
    };
  }

  // 4. Feature / Integration / Specific term verification
  const lowerQuery = trimmed.toLowerCase();

  const technicalKeywords = [
    "whatsapp", "instagram", "facebook", "shopify", "woocommerce", "trendyol",
    "hepsiburada", "entegrasyon", "api", "erp", "muhasebe", "sms", "e-posta",
    "iade", "kdv", "fatura", "özel yazılım", "mobil uygulama"
  ];

  const questionedTech = technicalKeywords.filter((tk) => lowerQuery.includes(tk));

  if (questionedTech.length > 0) {
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
      return {
        sufficient: false,
        confidence: 0.3,
        isExplicitHandoverRequest: false,
        isGeneralGreeting: false,
        reason: `Belirtilen özellik veya entegrasyon (${missingTech.join(", ")}) onaylı dokümanlarda doğrulanamadı.`,
        handoverPrompt:
          `Belirttiğiniz özellik veya entegrasyon (${missingTech.join(", ")}) hakkında sistemimizde şu an için doğrulanmış kapsam bilgisi bulunmuyor. Dilerseniz teknik detaylar için bir müşteri temsilcisine bağlanmak istediğinizi belirtebilirsiniz.`,
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
      "Sorduğunuz konu hakkında sistemimizde yeterli doğrulanmış bilgi bulunamadı. Dilerseniz sorunuzu farklı kelimelerle açıklayabilir veya müşteri temsilcimize bağlanmak istediğinizi söyleyebilirsiniz.",
  };
}
