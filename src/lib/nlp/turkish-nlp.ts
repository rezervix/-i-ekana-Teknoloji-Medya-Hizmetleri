/**
 * Çiçekana Tech Media — Enhanced Turkish Natural Language Processing (NLP) Library
 * 
 * 100% Local & Deterministic — Zero External Generative AI API calls.
 * 
 * Capabilities:
 * - Precise Turkish lowercase/uppercase casing (ı/i, I/İ, ç, ğ, ö, ş, ü)
 * - Apostrophe and suffix detachment preserving brand names (WhatsApp'tan -> WhatsApp, Instagram'a -> Instagram)
 * - Negation and polarity preservation (karışır mı vs karışmaz mı, yapabiliyor mu vs yapamıyor mu)
 * - Robust domain phrase & synonym dictionary
 * - Intent & subject classifier (multi-channel separation, agent collision, pricing, products, etc.)
 * - Stemming & typo-tolerant Levenshtein fuzzy similarity
 */

// Proper Turkish lowercase transformation
export function turkishToLower(text: string): string {
  if (!text) return "";
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase();
}

// Proper Turkish uppercase transformation
export function turkishToUpper(text: string): string {
  if (!text) return "";
  return text
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toUpperCase();
}

// Converts Turkish special characters to standard Latin ASCII equivalents for relaxed fuzzy matching
export function toAsciiFolded(text: string): string {
  if (!text) return "";
  return turkishToLower(text)
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u");
}

// Clean text: strip punctuation, emojis, extra whitespace, normalize quotes & apostrophes
export function cleanPunctuation(text: string): string {
  if (!text) return "";
  return text
    .replace(/[’'´`]/g, " ") // detach apostrophe suffixes
    .replace(/[.,\/#!$%\^&\*;:{}=\-_~()?"“”«»\[\]<>|\\+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Full normalization pipeline for search keys
export function normalizeForSearch(text: string): string {
  const lowered = turkishToLower(text);
  const cleaned = cleanPunctuation(lowered);
  return cleaned;
}

// Relaxed ASCII normalization (used for typo & accent tolerant comparison)
export function normalizeForFuzzy(text: string): string {
  const searchNorm = normalizeForSearch(text);
  return toAsciiFolded(searchNorm);
}

// Polarity / Negation Detection
export interface PolarityInfo {
  isNegative: boolean;
  hasNegationSuffix: boolean;
  hasNegationWord: boolean;
  isConfirmationQuestion: boolean; // e.g. "karışmaz değil mi?", "karışmaz değil mi sonra?"
}

export function detectPolarity(text: string): PolarityInfo {
  const lowered = turkishToLower(text);
  const folded = toAsciiFolded(lowered);

  const hasNegationWord =
    /\b(?:degil|değil|yok|hayir|hayır|asla|hic|hiç|olmaz|etmez)\b/i.test(lowered);

  // Negative verb suffixes in Turkish: -me, -ma, -mez, -maz, -mıyor, -miyor, -muyor, -müyor, -mesin, -masın
  const hasNegationSuffix =
    /(?:mez|maz|miyor|mıyor|muyor|müyor|mey|may|mesin|masın|mem|mam|medik|madık)\b/i.test(lowered) ||
    /(?:mez|maz|miyor|miyor|musun|mesin|masin)\b/i.test(folded);

  const isConfirmationQuestion =
    /\b(?:değil\s*mi|degil\s*mi|oyle\s*degil\s*mi|öyle\s*değil\s*mi)\b/i.test(lowered);

  return {
    isNegative: hasNegationWord || hasNegationSuffix,
    hasNegationSuffix,
    hasNegationWord,
    isConfirmationQuestion,
  };
}

// Turkish Stop Words (carrying minimal discriminative information in search queries)
export const TURKISH_STOP_WORDS = new Set([
  "acaba", "ama", "ancak", "arada", "artık", "asla", "az", "bana", "bazen", "bazı",
  "belki", "ben", "benden", "beni", "benim", "beri", "bile", "bin", "bir", "biraz",
  "biri", "birkaç", "birkez", "birşey", "birlikte", "biz", "bizden", "bize", "bizi",
  "bizim", "böyle", "bu", "buna", "bunda", "bundan", "bunu", "bunun", "burada",
  "bütün", "çoğu", "çoğunlukla", "çok", "çünkü", "da", "daha", "dahi", "de", "defa",
  "diye", "doksan", "dolayı", "dolayısıyla", "dört", "edecek", "eden", "ederek",
  "edilecek", "ediliyor", "edilmesi", "ediyor", "eğer", "elli", "en", "esnasında",
  "fakat", "gibi", "göre", "halen", "hangi", "hangisi", "hani", "hatta", "hem", "henüz",
  "hep", "hepsi", "her", "herhangi", "herkes", "herkesin", "hiç", "hiçbir", "için",
  "içinde", "iki", "ile", "ilgili", "ise", "işte", "itibaren", "itibariyle", "kadar",
  "karşın", "katrilyon", "kendi", "kendine", "kendini", "kendisi", "kendisine", "kez",
  "ki", "kim", "kime", "kimin", "kimisi", "kimse", "kırk", "lakin", "madem",
  "milyar", "milyon", "nasıl", "ne", "neden", "nedenle", "nerde",
  "nerede", "nereden", "nereye", "nesi", "neyse", "niçin", "niye", "o", "olan", "olarak",
  "oldu", "olduğu", "olduğunu", "oldukça", "olduklarını", "olmadı", "olmadığı", "olmak",
  "olması", "olmayan", "olmaz", "olsa", "olsun", "olup", "olur", "olursa", "oluyor",
  "on", "ona", "ondan", "onlar", "onlardan", "onlara", "onları", "onların", "onu",
  "onun", "orada", "oysa", "oysaki", "öbürü", "ön", "önce", "ötürü", "öyle", "pek",
  "rağmen", "sadece", "sanki", "sekiz", "seksen", "sen", "senden", "sana", "seni",
  "senin", "siz", "sizden", "size", "sizi", "sizin", "sonra", "şayet", "şey", "şeyden",
  "şeye", "şeyi", "şeyler", "şu", "şuna", "şunda", "şundan", "şunları", "şunu", "şunun",
  "tabii", "tamam", "tarafından", "trilyon", "tüm", "üç", "üzere", "üzerine",
  "vardı", "ve", "veya", "veyahut", "ya", "yani", "yapacak", "yapılan", "yapılması",
  "yapıyor", "yapmak", "yaptı", "yaptığı", "yaptığını", "yaptılar", "yedi", "yerine",
  "yetmiş", "yine", "yirmi", "yoksa", "yüz", "zaten", "yahu"
]);

// Conservative Turkish suffix stripper (Stemmer)
export function stemTurkishWord(word: string): string {
  const w = turkishToLower(word.trim());
  if (w.length <= 3) return w;

  // Protect brand names from aggressive truncation
  const preservedBrands = ["midvem", "alom", "postify", "estudio", "shopify", "ikas", "paytr", "whatsapp", "instagram", "facebook", "telegram"];
  if (preservedBrands.includes(toAsciiFolded(w))) {
    return w;
  }

  let stem = w;

  // Patterns for multi-letter suffixes
  const suffixes = [
    // Copula / Verb endings
    /(?:dir|dır|dur|dür|tir|tır|tur|tür)$/,
    /(?:ydi|ydı|ydu|ydü|ti|tı|tu|tü)$/,
    /(?:ymiş|ymış|ymuş|ymüş|miş|mış|muş|müş)$/,
    /(?:yken|ken)$/,
    /(?:ysek|ysak|sek|sak)$/,
    // Plural + case / possessive combinations
    /(?:lerinde|larında|lerinden|larından|lerine|larına|lerini|larını)$/,
    /(?:lerimiz|larımız|leriniz|larınız|leridir|larıdır)$/,
    /(?:lerin|ların|lerle|larla)$/,
    /(?:ler|lar)$/,
    // Locative / Ablative / Dative cases
    /(?:deki|daki|tekin|taki)$/,
    /(?:den|dan|ten|tan)$/,
    /(?:de|da|te|ta)$/,
    /(?:ye|ya|e|a)$/,
    // Accusative / Genitive
    /(?:nin|nın|nun|nün|in|ın|un|ün)$/,
    /(?:yi|yı|yu|yü|i|ı|u|ü)$/,
    // Possessives
    /(?:imiz|ımız|umuz|ümüz|niz|nız|nuz|nüz)$/,
    /(?:im|ım|um|üm|in|ın|un|ün)$/,
    /(?:si|sı|su|sü)$/,
    // Instrumental
    /(?:yle|yla|le|la)$/,
    // Profession / derivation
    /(?:lik|lık|lük|luk)$/,
    /(?:ci|cı|cü|cu)$/,
  ];

  for (const suf of suffixes) {
    if (suf.test(stem)) {
      const candidate = stem.replace(suf, "");
      // Keep at least 3 letters for Turkish roots
      if (candidate.length >= 3) {
        stem = candidate;
      }
    }
  }

  return stem;
}

// Comprehensive Synonym and Domain Phrase Vocabulary for Çiçekana Tech Media
export const TURKISH_SYNONYMS: Record<string, string[]> = {
  // Platforms & Channels
  "instagram": ["insta", "ig", "instagram dm", "instagram mesajları", "sosyal medya", "meta"],
  "insta": ["instagram", "ig", "instagram dm"],
  "ig": ["instagram", "insta"],
  "whatsapp": ["whatsapp business", "wp", "whatsapp mesajları", "whatsapp hattı"],
  "wp": ["whatsapp", "whatsapp business"],
  "kanal": ["platform", "kaynak", "iletişim kanalı", "gelen kutusu", "nereden geldiği"],
  "platform": ["kanal", "kaynak", "ortam"],
  "kaynak": ["kanal", "platform", "nereden geldiği", "gelen kutusu"],

  // Shared Inbox & Screen Unification
  "tek ekran": ["tek panel", "merkezi ekran", "ortak gelen kutusu", "merkezi gelen kutusu", "shared inbox", "ortak panel", "tek bir yer", "aynı yer"],
  "tek panel": ["tek ekran", "merkezi ekran", "ortak gelen kutusu", "merkezi panel"],
  "ortak gelen kutusu": ["shared inbox", "tek ekran", "tek panel", "merkezi ekran", "gelen kutusu"],

  // Collision, Mixing, Confusion & Separation
  "karışmak": ["birbirine girmek", "çorbaya dönmek", "ayırt edememek", "çakışmak", "karmaşa", "mükerrer", "karışır mı", "karışıyor mu", "birbirine karışmak"],
  "çorbaya dönmek": ["karışmak", "birbirine girmek", "ayırt edememek", "karmaşa"],
  "birbirine girmek": ["karışmak", "çorbaya dönmek", "çakışmak", "ayırt edememek"],
  "çakışmak": ["çarpışma", "aynı anda yanıt", "mükerrer", "çakışma"],
  "ayırt etmek": ["anlamak", "görmek", "fark etmek", "belirlemek", "kanal ayrımı", "seçmek", "belli olmak", "ayırt edebilir miyiz", "nasıl anlayacağız"],
  "belli olmak": ["ayırt edilmek", "görünmek", "fark edilmek", "anlaşılmak"],

  // Staff & Customer Support Agents
  "temsilci": ["müşteri temsilcisi", "destek personeli", "çalışan", "ekip üyesi", "eleman", "personel", "yetkili", "destek ekibi"],
  "eleman": ["temsilci", "çalışan", "personel", "ekip üyesi", "destek elemanı"],
  "personel": ["temsilci", "çalışan", "eleman", "ekip üyesi"],
  "çalışan": ["temsilci", "eleman", "personel", "ekip üyesi"],

  // Conversation & Messages
  "konuşma": ["sohbet", "mesaj dizisi", "müşteri yazışması", "görüşme", "diyalog", "ticket"],
  "mesaj": ["yazışma", "ileti", "sohbet", "bildirim", "dm"],
  "sohbet": ["konuşma", "mesajlaşma", "görüşme", "canlı sohbet", "chat"],

  // Filtering & Folders
  "filtre": ["filtreleme", "süzme", "özel klasör", "custom views", "gruplama", "ayırma"],
  "filtrelemek": ["süzmek", "ayırmak", "gruplamak", "sıralamak"],

  // Merging & CRM Contacts
  "birleştirmek": ["kişileri birleştir", "merge contacts", "tek profilde topla", "aynı müşteri"],
  "kişileri birleştir": ["merge contacts", "müşteri birleştirme", "profilleri birleştir"],

  // Pricing & Packages
  "fiyat": ["ücret", "maliyet", "tutar", "tarife", "bütçe", "kaç para", "ne kadar", "fiyatı", "fiyatlar", "fiyatlandırma", "ödeme", "aylık"],
  "ücret": ["fiyat", "maliyet", "tutar", "tarife", "kaç para", "ne kadar", "fiyatlandırma", "ödeme"],
  "maliyet": ["fiyat", "ücret", "tutar", "harcama", "masraf"],
  "paket": ["plan", "tarife", "paketler", "üyelik", "abonelik", "versiyon", "paketleri"],
  "ucuz": ["uygun", "ekonomik", "başlangıç", "küçük", "en uygun", "avantajlı"],

  // Business Types & SMEs
  "esnaf": ["küçük işletme", "kobi", "küçük esnaf", "yeni başlayan", "girişimci", "butik", "dükkan", "mağaza"],
  "dükkan": ["işletme", "esnaf", "mağaza", "firma", "şirket"],
  "kobi": ["esnaf", "küçük işletme", "orta ölçekli", "şirket"],

  // Free / Trial / Demo
  "ücretsiz": ["bedava", "beleş", "parasız", "ücretsiz mi", "deneme", "demo"],
  "bedava": ["ücretsiz", "parasız", "beleş", "deneme"],

  // Integration & Connections
  "entegrasyon": ["bağlantı", "bağlama", "senkronizasyon", "api", "bağlamak", "köprü", "entegre"],
  "shopify": ["e-ticaret", "mağaza", "sipariş", "kargo takibi", "sağ panel", "sepet"],

  // AI & Voice & Photography
  "çağrı merkezi": ["santral", "call center", "sesli ai", "sesli asistan", "telefon karşılama", "alom"],
  "alom": ["çağrı merkezi", "sesli yapay zeka", "santral", "telefon asistanı", "sesli transkript"],
  "e-studio": ["ürün fotoğrafı", "fotoğrafçılık", "arka plan temizleme", "stüdyo fotoğrafı", "upscale"],
  "postify": ["sosyal medya", "içerik takvimi", "hashtag", "gönderi paylaşımı"],

  // Printing & Store
  "matbaa": ["baskı", "matbaacılık", "kurumsal baskı", "ofset"],
  "baskı": ["matbaa", "kartvizit", "bloknot", "broşür", "el ilanı", "antetli", "etiket", "cepli dosya"],
  "kargo": ["teslimat", "gönderi", "gönderim", "ulaşım", "kaç günde", "ne zaman gelir"],
  "teslimat": ["kargo", "gönderi", "ulaşım", "dağıtım", "teslim süresi"],
};

// Expand a set of tokens using the synonym dictionary
export function expandTokensWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);
    const folded = toAsciiFolded(token);

    // Direct match in dictionary
    for (const [key, synList] of Object.entries(TURKISH_SYNONYMS)) {
      const keyFolded = toAsciiFolded(key);
      if (folded === keyFolded || folded.includes(keyFolded) || keyFolded.includes(folded)) {
        for (const s of synList) {
          expanded.add(turkishToLower(s));
        }
      }
    }
  }

  return Array.from(expanded);
}

// Tokenize text into normalized, stemmed, and non-stopword tokens
export function tokenizeAndProcess(text: string): {
  rawTokens: string[];
  stemmedTokens: string[];
  expandedTokens: string[];
  foldedTokens: string[];
} {
  const normalized = normalizeForSearch(text);
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);

  const rawTokens: string[] = [];
  const stemmedTokens: string[] = [];
  const foldedTokens: string[] = [];

  for (const w of words) {
    if (!TURKISH_STOP_WORDS.has(w)) {
      rawTokens.push(w);
      const stem = stemTurkishWord(w);
      stemmedTokens.push(stem);
      foldedTokens.push(toAsciiFolded(w));
      foldedTokens.push(toAsciiFolded(stem));
    }
  }

  const expandedTokens = expandTokensWithSynonyms(rawTokens);

  return {
    rawTokens: Array.from(new Set(rawTokens)),
    stemmedTokens: Array.from(new Set(stemmedTokens)),
    expandedTokens: Array.from(new Set(expandedTokens)),
    foldedTokens: Array.from(new Set(foldedTokens)),
  };
}

// Levenshtein edit distance
export function levenshteinDistance(s1: string, s2: string): number {
  const a = s1 || "";
  const b = s2 || "";
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) {
    row[j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

// Fuzzy similarity between two strings: 0.0 (unrelated) to 1.0 (identical)
export function fuzzyStringSimilarity(s1: string, s2: string): number {
  const f1 = normalizeForFuzzy(s1);
  const f2 = normalizeForFuzzy(s2);

  if (f1 === f2) return 1.0;
  if (!f1 || !f2) return 0.0;

  const maxLen = Math.max(f1.length, f2.length);
  if (maxLen === 0) return 1.0;

  // Exact substring match bonus
  if (f1.includes(f2) || f2.includes(f1)) {
    const minLen = Math.min(f1.length, f2.length);
    return Math.max(0.75, minLen / maxLen);
  }

  const dist = levenshteinDistance(f1, f2);
  const sim = 1 - dist / maxLen;
  return Math.max(0, sim);
}

// Token Jaccard overlap similarity
export function tokenJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA.map(toAsciiFolded));
  const setB = new Set(tokensB.map(toAsciiFolded));

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    } else {
      // Check 1-char edit distance for fuzzy token match
      for (const target of setB) {
        if (item.length >= 4 && target.length >= 4 && levenshteinDistance(item, target) <= 1) {
          intersection += 0.85;
          break;
        }
      }
    }
  }

  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Token Containment similarity
export function tokenContainmentSimilarity(queryTokens: string[], targetTokens: string[]): number {
  if (!queryTokens.length || !targetTokens.length) return 0;
  const targetSet = new Set(targetTokens.map(toAsciiFolded));
  if (targetSet.size === 0) return 0;

  if (targetSet.size === 1 && queryTokens.length > 2) {
    return 0;
  }

  let matched = 0;
  for (const t of targetSet) {
    if (
      queryTokens.some((qt) => {
        const qf = toAsciiFolded(qt);
        return (
          qf === t ||
          qf.includes(t) ||
          t.includes(qf) ||
          (qf.length >= 4 && t.length >= 4 && levenshteinDistance(qf, t) <= 1)
        );
      })
    ) {
      matched++;
    }
  }
  return matched / targetSet.size;
}

// Generic domain terms that appear everywhere and should not trigger false positive matches alone
export const GENERIC_DOMAIN_WORDS = new Set([
  "sirket", "sirketiniz", "kurumsal", "isletme", "isletmeler", "urun", "urunler",
  "urunleriniz", "hizmet", "hizmetler", "hizmetiniz", "satis", "satisi", "yapiyor",
  "yapmak", "yap", "yapar", "yapilir", "etmek", "et", "eder", "olmak", "olur", "ol",
  "gelmek", "gelir", "gel", "vermek", "verir", "ver", "almak", "alir", "al",
  "program", "uygulama", "sistem", "sistemi", "cozum", "cozumler",
  "ozellik", "ozellikleri", "bilgi", "detay", "konu", "alan", "platform"
]);

// ─── Question Intent & Subject Analysis ─────────────────────────────────────────

export type QuestionIntent =
  | "CHANNEL_SEPARATION_COLLISION"   // Kanalların karışması, nereden geldiğini ayırt etme
  | "AGENT_COLLISION_ASSIGNMENT"     // Temsilcilerin aynı müşteriye yazması, kimin cevap verdiği
  | "MERGE_CONTACTS"                 // Aynı müşteri iki farklı kanaldan yazarsa
  | "FILTERING_CUSTOM_VIEWS"         // Kanallara göre filtreleme, özel klasörler
  | "PRICING_PLANS"                  // Fiyatlar, paketler, ücretler
  | "SMALL_BUSINESS_SUITABILITY"     // Küçük esnaf, yeni başlayanlar için paket
  | "FREE_TIER_POLICY"               // Bedava / ücretsiz paket var mı
  | "INTEGRATION_SHOPIFY"            // Shopify, sipariş detayı, sağ panel
  | "CALL_CENTER_VOICE_AI"           // Alom sesli yapay zeka, telefon karşılama
  | "STUDIO_PHOTO_AI"                // e-Studio ürün fotoğrafçılığı
  | "SOCIAL_MEDIA_AI"                // Postify sosyal medya
  | "PRINT_STORE_DELIVERY"           // Matbaa kargo süresi ve sipariş
  | "WEB_DESIGN_SOFTWARE"            // Web sitesi tasarımı, özel yazılım
  | "YOUNG_ENTREPRENEUR"             // Genç girişimci desteği
  | "WHATSAPP_POLICY"                // WhatsApp canlı destek var mı
  | "UNVERIFIED_CUSTOM_FEATURE"      // Kaynakta olmayan iddia (renk değiştirme vb.)
  | "EXPLICIT_HANDOVER"              // Temsilciye aktar, beni ara
  | "GREETING"                       // Selamlama
  | "GRATITUDE"                      // Teşekkür
  | "GENERAL_FEATURE_INQUIRY";       // Genel ürün / özellik sorusu

export interface QueryAnalysis {
  normalizedQuery: string;
  foldedQuery: string;
  intent: QuestionIntent;
  confidence: number;
  detectedSubject: string;
  polarity: PolarityInfo;
  distinctiveTokens: string[];
  channelsMentioned: string[];
}

export function analyzeCustomerQuery(query: string): QueryAnalysis {
  const normalizedQuery = normalizeForSearch(query);
  const folded = normalizeForFuzzy(query);
  const polarity = detectPolarity(query);
  const processed = tokenizeAndProcess(query);

  const distinctiveTokens = processed.stemmedTokens.filter(
    (tok) => tok.length >= 3 && !GENERIC_DOMAIN_WORDS.has(toAsciiFolded(tok))
  );

  // Channels mentioned
  const channelsMentioned: string[] = [];
  if (folded.includes("whatsapp") || folded.includes("wp")) channelsMentioned.push("WhatsApp");
  if (folded.includes("instagram") || folded.includes("insta") || folded.includes("ig")) channelsMentioned.push("Instagram");
  if (folded.includes("facebook") || folded.includes("messenger")) channelsMentioned.push("Facebook");
  if (folded.includes("telegram")) channelsMentioned.push("Telegram");
  if (folded.includes("e-posta") || folded.includes("eposta") || folded.includes("mail")) channelsMentioned.push("E-posta");
  if (folded.includes("sms")) channelsMentioned.push("SMS");
  if (folded.includes("canli sohbet") || folded.includes("web chat")) channelsMentioned.push("Web Canlı Sohbet");

  // Determine Intent deterministically
  let intent: QuestionIntent = "GENERAL_FEATURE_INQUIRY";
  let detectedSubject = "Genel";
  let intentConfidence = 0.7;

  // 1. Explicit Handover
  if (
    /(?:beni|bizi)\s+(?:ara|arayın|arar\s+mısınız|arayabilir\s+misiniz)/i.test(query) ||
    /telefon(?:um)?la\s+(?:ara|arayın|ulaşın|görüşelim)/i.test(query) ||
    /müşteri\s+temsilci(?:sine|siyle|ye)?\s+(?:bağlan|aktar|görüşmek)/i.test(query) ||
    /(?:canlı\s+)?temsilci(?:ye|yle)?\s+(?:bağla|aktar)/i.test(query) ||
    /yetkiliye\s+aktar/i.test(query)
  ) {
    return {
      normalizedQuery,
      foldedQuery: folded,
      intent: "EXPLICIT_HANDOVER",
      confidence: 1.0,
      detectedSubject: "Temsilci Talebi",
      polarity,
      distinctiveTokens,
      channelsMentioned,
    };
  }

  // 2. Greetings
  if (/^(?:merhaba|selam|selamlar|iyi\s+günler|günaydın|iyi\s+akşamlar|kolay\s+gelsin|merhabalar|merhablar)[.!?]?$/i.test(query.trim())) {
    return {
      normalizedQuery,
      foldedQuery: folded,
      intent: "GREETING",
      confidence: 1.0,
      detectedSubject: "Karşılama",
      polarity,
      distinctiveTokens,
      channelsMentioned,
    };
  }

  // 3. Gratitude
  if (/^(?:teşekkürler|teşekkür\s+ederim|sağol|sağolun|eyvallah|harika|çok\s+iyi|tamamdır)[.!?]?$/i.test(query.trim())) {
    return {
      normalizedQuery,
      foldedQuery: folded,
      intent: "GRATITUDE",
      confidence: 1.0,
      detectedSubject: "Teşekkür",
      polarity,
      distinctiveTokens,
      channelsMentioned,
    };
  }

  // 4. Free Tier Policy
  if (
    /(?:ucretsiz|ücretsiz|bedava|beles|beleş|parasiz|parasız|free\s*plan|deneme\s*surumu|deneme\s*sürümü)/i.test(folded) &&
    /(?:mi|mı|mu|mü|var|var\s*mi|kullanabilir|alabilir)/i.test(folded)
  ) {
    intent = "FREE_TIER_POLICY";
    detectedSubject = "Ücretsiz Paket Politikası";
    intentConfidence = 0.95;
  }
  // 5. Small Business / SME Package Suitability
  else if (
    /(?:kucuk\s*esnaf|küçük\s*esnaf|esnaf|yeni\s*baslayan|yeni\s*başlayan|kobi|butik\s*isletme|butik|dukkan|dükkan)/i.test(folded) &&
    /(?:en\s*uygun|en\s*ucuz|hangi\s*paket|paket\s*oner|paket\s*öner|uygun\s*mu|gider)/i.test(folded)
  ) {
    intent = "SMALL_BUSINESS_SUITABILITY";
    detectedSubject = "Küçük İşletme / Esnaf Paketi";
    intentConfidence = 0.95;
  }
  // 6. Pricing & Plans
  else if (
    /(?:fiyat|fiyatlar|fiyati|fiyatı|ucret|ücret|maliyet|kac\s*para|kaç\s*para|ne\s*kadar|tarife|paket\s*fiyat)/i.test(folded) &&
    !folded.includes("matbaa") && !folded.includes("kartvizit") && !folded.includes("bloknot") && !folded.includes("web")
  ) {
    intent = "PRICING_PLANS";
    detectedSubject = "Paket Fiyatları";
    intentConfidence = 0.95;
  }
  // 7. Same customer writing from two channels (Merge Contacts)
  else if (
    /(?:ayni\s*musteri|aynı\s*müşteri|iki\s*farkli\s*kanaldan|iki\s*farklı\s*kanaldan|hem\s*whatsapp.*hem\s*instagram|hem\s*whatsapp.*hem\s*e-?posta|iki\s*ayri\s*kayit|iki\s*ayrı\s*kayıt)/i.test(folded)
  ) {
    intent = "MERGE_CONTACTS";
    detectedSubject = "Farklı Kanallardan Yazan Aynı Müşteri (Kişileri Birleştir)";
    intentConfidence = 0.95;
  }
  // 8. Agent Collision & Assignment (İki personelin aynı müşteriye yazması / kimin neye baktığı)
  else if (
    /(?:ayni\s*musteriye\s*iki|aynı\s*müşteriye\s*iki|iki\s*temsilci|iki\s*eleman|iki\s*kisi\s*ayni\s*anda|iki\s*kişi\s*aynı\s*anda|birbirinin\s*konusmasina|birbirinin\s*müşterisine|birbirinin\s*musterisine|mukerrer|mükerrer|herkes\s*neye\s*cevap|kimin\s*neye\s*cevap|elemanlar\s*birbirinin)/i.test(folded)
  ) {
    intent = "AGENT_COLLISION_ASSIGNMENT";
    detectedSubject = "Temsilci Atama ve Çarpışma Tespiti";
    intentConfidence = 0.95;
  }
  // 9. Filtering by Channel (Kanallara göre filtreleme / klasörler)
  else if (
    /(?:kanallara\s*gore|kanallara\s*göre|kanal\s*bazli|kanal\s*bazlı|filtreleyebili|filtrele|ozel\s*gorunum|özel\s*görünüm|klasor|klasör)/i.test(folded) &&
    /(?:filtre|klasor|ayir|nasıl|mumkun|mümkün)/i.test(folded)
  ) {
    intent = "FILTERING_CUSTOM_VIEWS";
    detectedSubject = "Kanallara Göre Filtreleme ve Özel Görünümler";
    intentConfidence = 0.95;
  }
  // 10. Channel Separation & Collision (WhatsApp ve Instagram tek ekranda karışır mı, nereden geldiği nasıl anlaşılır)
  else if (
    (channelsMentioned.length >= 1 || folded.includes("tek ekran") || folded.includes("tek panel") || folded.includes("kanallar") || folded.includes("mesajlar")) &&
    (/(?:karis|karış|corba|çorba|birbirine\s*gir|ayirt|ayırt|hangi.*yazd|nereden\s*geld|nerden\s*geld|belli\s*ol|ayirabili|ayırabili|ayiracagiz|ayıracağız|hangisinden)/i.test(folded))
  ) {
    intent = "CHANNEL_SEPARATION_COLLISION";
    detectedSubject = "Çok Kanallı Ortak Gelen Kutusu ve Kanal Ayrımı";
    intentConfidence = 0.95;
  }
  // 11. Shopify Integration
  else if (folded.includes("shopify") || (folded.includes("siparis") && folded.includes("sag panel"))) {
    intent = "INTEGRATION_SHOPIFY";
    detectedSubject = "Shopify Entegrasyonu & Sipariş Takibi";
    intentConfidence = 0.95;
  }
  // 12. Alom Call Center Voice AI
  else if (folded.includes("alom") || folded.includes("cagri merkezi") || folded.includes("çağrı merkezi") || folded.includes("sesli santral") || (folded.includes("telefon") && folded.includes("sesli"))) {
    intent = "CALL_CENTER_VOICE_AI";
    detectedSubject = "Alom Sesli Yapay Zeka Çağrı Merkezi";
    intentConfidence = 0.95;
  }
  // 13. e-Studio Photo AI
  else if (folded.includes("e-studio") || folded.includes("estudio") || (folded.includes("fotograf") && (folded.includes("studyo") || folded.includes("urun")))) {
    intent = "STUDIO_PHOTO_AI";
    detectedSubject = "e-Studio Yapay Zeka Ürün Fotoğrafçılığı";
    intentConfidence = 0.95;
  }
  // 14. Postify Social Media AI
  else if (folded.includes("postify") || (folded.includes("sosyal medya") && (folded.includes("icerik") || folded.includes("takvim") || folded.includes("hashtag")))) {
    intent = "SOCIAL_MEDIA_AI";
    detectedSubject = "Postify Sosyal Medya Yönetimi";
    intentConfidence = 0.95;
  }
  // 15. Print Store Delivery & Orders
  else if (folded.includes("matbaa") || folded.includes("baski") || folded.includes("kartvizit") || folded.includes("bloknot") || (folded.includes("kargo") && folded.includes("gun"))) {
    intent = "PRINT_STORE_DELIVERY";
    detectedSubject = "Baskı & Matbaa Ürünleri ve Teslimat";
    intentConfidence = 0.95;
  }
  // 16. Web Design & Custom Software
  else if (folded.includes("web sitesi") || folded.includes("web tasarim") || folded.includes("ozel yazilim") || (folded.includes("site") && folded.includes("fiyat"))) {
    intent = "WEB_DESIGN_SOFTWARE";
    detectedSubject = "Web Tasarım & Yazılım Geliştirme";
    intentConfidence = 0.95;
  }
  // 17. Young Entrepreneur
  else if (folded.includes("genc girisimci") || folded.includes("genç girişimci")) {
    intent = "YOUNG_ENTREPRENEUR";
    detectedSubject = "Genç Girişimci Desteği";
    intentConfidence = 0.95;
  }
  // 18. WhatsApp Policy
  else if (folded.includes("whatsapp destek") || (folded.includes("whatsapp") && folded.includes("hat") && folded.includes("var mi"))) {
    intent = "WHATSAPP_POLICY";
    detectedSubject = "WhatsApp Destek Politikası";
    intentConfidence = 0.95;
  }
  // 19. Unverified custom feature (e.g. custom channel colors, 100k messages guarantee)
  else if (
    (/(?:renk|rengi|renkler|rengini|rengin)/i.test(folded) && /(?:degistir|değiştir|sec|seç|ayarla|ozellestir)/i.test(folded)) ||
    /(?:100\s*000|100000|100\s*bin|kapasite.*garanti|kesin.*kaldir)/i.test(folded)
  ) {
    intent = "UNVERIFIED_CUSTOM_FEATURE";
    detectedSubject = "Doğrulanmamış / Belgelenmemiş Özellik Talebi";
    intentConfidence = 0.85;
  }

  return {
    normalizedQuery,
    foldedQuery: folded,
    intent,
    confidence: intentConfidence,
    detectedSubject,
    polarity,
    distinctiveTokens,
    channelsMentioned,
  };
}
