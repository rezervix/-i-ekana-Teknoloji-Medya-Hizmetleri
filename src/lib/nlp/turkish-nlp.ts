/**
 * Çiçekana Tech Media — Turkish Natural Language Processing (NLP) Library
 * 
 * Provides robust, deterministic Turkish text normalization, stemming,
 * synonym expansion, fuzzy similarity, and stop-word filtering
 * without external APIs or heavy dependencies.
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

// Converts Turkish special characters to standard Latin ASCII equivalents for relaxed matching
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

// Clean text: strip punctuation, emojis, extra whitespace, normalize quotes
export function cleanPunctuation(text: string): string {
  if (!text) return "";
  return text
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”«»\[\]<>|\\+]/g, " ")
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

// Turkish Stop Words (Words that carry minimal discriminative information)
export const TURKISH_STOP_WORDS = new Set([
  "acaba", "ama", "ancak", "arada", "artık", "asla", "az", "bana", "bazen", "bazı",
  "belki", "ben", "benden", "beni", "benim", "beri", "bile", "bin", "bir", "biraz",
  "biri", "birkaç", "birkez", "birşey", "birlikte", "biz", "bizden", "bize", "bizi",
  "bizim", "böyle", "bu", "buna", "bunda", "bundan", "bunu", "bunun", "burada",
  "bütün", "çoğu", "çoğunlukla", "çok", "çünkü", "da", "daha", "dahi", "de", "defa",
  "değil", "diye", "doksan", "dolayı", "dolayısıyla", "dört", "edecek", "eden", "ederek",
  "edilecek", "ediliyor", "edilmesi", "ediyor", "eğer", "elli", "en", "esnasında",
  "fakat", "gibi", "göre", "halen", "hangi", "hangisi", "hani", "hatta", "hem", "henüz",
  "hep", "hepsi", "her", "herhangi", "herkes", "herkesin", "hiç", "hiçbir", "için",
  "içinde", "iki", "ile", "ilgili", "ise", "işte", "itibaren", "itibariyle", "kadar",
  "karşın", "katrilyon", "kendi", "kendine", "kendini", "kendisi", "kendisine", "kez",
  "ki", "kim", "kime", "kimin", "kimisi", "kimse", "kırk", "lakin", "madem", "mı",
  "mi", "milyar", "milyon", "mu", "mü", "nasıl", "ne", "neden", "nedenle", "nerde",
  "nerede", "nereden", "nereye", "nesi", "neyse", "niçin", "niye", "o", "olan", "olarak",
  "oldu", "olduğu", "olduğunu", "oldukça", "olduklarını", "olmadı", "olmadığı", "olmak",
  "olması", "olmayan", "olmaz", "olsa", "olsun", "olup", "olur", "olursa", "oluyor",
  "on", "ona", "ondan", "onlar", "onlardan", "onlara", "onları", "onların", "onu",
  "onun", "orada", "oysa", "oysaki", "öbürü", "ön", "önce", "ötürü", "öyle", "pek",
  "rağmen", "sadece", "sanki", "sekiz", "seksen", "sen", "senden", "sana", "seni",
  "senin", "siz", "sizden", "size", "sizi", "sizin", "sonra", "şayet", "şey", "şeyden",
  "şeye", "şeyi", "şeyler", "şu", "şuna", "şunda", "şundan", "şunları", "şunu", "şunun",
  "tabii", "tamam", "tarafından", "trilyon", "tüm", "üç", "üzere", "üzerine", "var",
  "vardı", "ve", "veya", "veyahut", "ya", "yani", "yapacak", "yapılan", "yapılması",
  "yapıyor", "yapmak", "yaptı", "yaptığı", "yaptığını", "yaptılar", "yedi", "yerine",
  "yetmiş", "yine", "yirmi", "yok", "yoksa", "yüz", "zaten"
]);

// Conservative Turkish suffix stripper (Stemmer)
// Strips common grammatical endings without destroying root semantics.
export function stemTurkishWord(word: string): string {
  const w = turkishToLower(word.trim());
  if (w.length <= 3) return w;

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

// Synonyms and Domain Vocabulary Dictionary for Çiçekana Tech Media
export const TURKISH_SYNONYMS: Record<string, string[]> = {
  // Pricing & Cost
  "fiyat": ["ücret", "maliyet", "tutar", "tarife", "bütçe", "kaç para", "ne kadar", "fiyatı", "fiyatlar", "fiyatlandırma", "ödeme", "aylık"],
  "ücret": ["fiyat", "maliyet", "tutar", "tarife", "kaç para", "ne kadar", "fiyatlandırma", "ödeme"],
  "maliyet": ["fiyat", "ücret", "tutar", "harcama", "masraf"],
  "paket": ["plan", "tarife", "paketler", "üyelik", "abonelik", "versiyon", "paketleri"],
  "ucuz": ["uygun", "ekonomik", "başlangıç", "küçük", "en uygun", "avantajlı"],

  // Ordering & Purchasing
  "sipariş": ["satın alma", "alım", "satış", "alışveriş", "order", "sepet"],
  "satın": ["almak", "sipariş", "edinmek", "ödeme yap", "temin"],
  "iade": ["iptal", "cayma", "geri ödeme", "değişim"],

  // Shipping & Delivery
  "kargo": ["teslimat", "gönderi", "gönderim", "ulaşım", "kurye", "dağıtım", "kaç günde", "ne zaman gelir"],
  "teslimat": ["kargo", "gönderi", "ulaşım", "dağıtım", "teslim süresi"],

  // Integration & Connections
  "entegrasyon": ["bağlantı", "bağlama", "senkronizasyon", "api", "bağlamak", "köprü", "entegre"],
  "bağlantı": ["entegrasyon", "bağlama", "köprü", "bağlanma", "senkronize"],

  // Support & Help
  "destek": ["yardım", "müşteri hizmetleri", "asistan", "teknik destek", "iletişim", "danışmanlık"],
  "yardım": ["destek", "müşteri hizmetleri", "asistan", "bilgi"],
  "temsilci": ["müşteri temsilcisi", "yetkili", "insan", "uzman", "canlı destek", "danışman"],

  // Business Types & SMEs
  "esnaf": ["küçük işletme", "kobi", "küçük esnaf", "yeni başlayan", "girişimci", "butik", "dükkan"],
  "kobi": ["esnaf", "küçük işletme", "orta ölçekli", "şirket"],
  "girişimci": ["genç girişimci", "yeni iş", "start-up", "startup", "kurulum"],

  // Free / Trial / Demo
  "ücretsiz": ["bedava", "beleş", "parasız", "ücretsiz mi", "deneme", "demo"],
  "bedava": ["ücretsiz", "parasız", "beleş", "deneme"],
  "demo": ["deneme", "test", "canlı demo", "örnek"],

  // Web & Development
  "web": ["internet", "web sitesi", "website", "yazılım", "site", "web sayfası"],
  "tasarım": ["dizayn", "geliştirme", "yazılım", "kurulum", "arayüz"],
  "yazılım": ["program", "kodlama", "özel yazılım", "otomasyon", "web yazılım"],

  // E-Commerce
  "e-ticaret": ["online satış", "sanal mağaza", "online mağaza", "eticaret", "ikas", "shopify", "woocommerce"],
  "mağaza": ["dükkan", "store", "e-ticaret sitesi", "online mağaza"],

  // Printing & Print Store
  "matbaa": ["baskı", "matbaacılık", "kurumsal baskı", "ofset"],
  "baskı": ["matbaa", "kartvizit", "bloknot", "broşür", "el ilanı", "antetli", "etiket", "cepli dosya"],
  "kartvizit": ["kart", "kurumsal kartvizit", "laklı", "kabartma"],
  "bloknot": ["tutkallı bloknot", "not defteri", "spiralli bloknot", "küp bloknot"],

  // AI & Automation
  "yapay zeka": ["ai", "otomasyon", "akıllı sistem", "yapay zekâ", "bot", "asistan"],
  "otomasyon": ["yapay zeka", "otomatikleştirme", "süreç otomasyonu", "akıllı sistem"],
  "çağrı merkezi": ["santral", "call center", "sesli ai", "sesli asistan", "telefon karşılama", "alom"],
  "santral": ["çağrı merkezi", "call center", "sesli sistem", "telefon sistemi"],
  "fotoğraf": ["ürün fotoğrafı", "görsel", "e-studio", "stüdyo", "fotoğrafçılık", "render"],
  "sosyal medya": ["instagram", "facebook", "meta", "içerik yönetimi", "postify", "reklam"],
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

// Token Containment similarity: calculates how much of targetTokens is covered by queryTokens
export function tokenContainmentSimilarity(queryTokens: string[], targetTokens: string[]): number {
  if (!queryTokens.length || !targetTokens.length) return 0;
  const targetSet = new Set(targetTokens.map(toAsciiFolded));
  if (targetSet.size === 0) return 0;

  // Guard against single-token target subsuming long queries (e.g. brand name like "midvem" in a 6-word query)
  if (targetSet.size === 1 && queryTokens.length > 2) {
    return 0;
  }

  let matched = 0;
  for (const t of targetSet) {
    if (queryTokens.some((qt) => {
      const qf = toAsciiFolded(qt);
      return qf === t || qf.includes(t) || t.includes(qf) || (qf.length >= 4 && t.length >= 4 && levenshteinDistance(qf, t) <= 1);
    })) {
      matched++;
    }
  }
  return matched / targetSet.size;
}

// Generic domain terms that appear everywhere and should not trigger false positive matches alone
export const GENERIC_DOMAIN_WORDS = new Set([
  "sirket", "sirketiniz", "kurumsal", "isletme", "isletmeler", "urun", "urunler",
  "urunleriniz", "hizmet", "hizmetler", "hizmetiniz", "satis", "satisi", "yapiyor",
  "yapmak", "program", "uygulama", "sistem", "sistemi", "cozum", "cozumler",
  "ozellik", "ozellikleri", "bilgi", "detay", "konu", "alan", "platform"
]);

