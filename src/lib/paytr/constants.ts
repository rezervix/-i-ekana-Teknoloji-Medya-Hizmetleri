// =============================================================================
// PAYTR ENTEGRASYONU - SABİTLER (CONSTANTS)
// =============================================================================
// Gizli bilgiler (merchant_key, merchant_salt) BURAYA YAZILMAZ.
// Sadece .env içinden process.env ile okunur.
// =============================================================================

import "server-only";

// ─── PayTR API Endpoints ─────────────────────────────────────────────────────
export const PAYTR_BASE_URL = "https://www.paytr.com";
export const PAYTR_IFRAME_TOKEN_URL = `${PAYTR_BASE_URL}/odeme/api/get-token`;
export const PAYTR_IFRAME_EMBED_URL = `${PAYTR_BASE_URL}/odeme/guvenli`;
export const PAYTR_NON3D_CHARGE_URL = `${PAYTR_BASE_URL}/odeme/api/non3d`;
export const PAYTR_SAVED_CARD_CHARGE_URL = `${PAYTR_BASE_URL}/odeme/api/sakli-kart-ile-odeme`;

export const PAYTR_API = {
  iframeTokenUrl: PAYTR_IFRAME_TOKEN_URL,
  iframeEmbedUrl: PAYTR_IFRAME_EMBED_URL,
  non3dUrl: PAYTR_NON3D_CHARGE_URL,
  savedCardChargeUrl: PAYTR_SAVED_CARD_CHARGE_URL,
} as const;

// ─── Ortam Değişkenleri Okuma (Sadece Server-Side, server-only ile koruma) ────
function getEnv(name: string, required = false, fallback = ""): string {
  const val = process.env[name] ?? fallback;
  if (required && !val) {
    throw new Error(
      `[PAYTR] Gerekli ortam değişkeni tanımlı değil: ${name}. Lütfen .env dosyanızı kontrol edin.`
    );
  }
  return val;
}

export const PAYTR_CONFIG = {
  // Resolve secrets when a payment operation actually runs, not while Next.js
  // is collecting route/page data during a build.
  get merchantId() {
    return getEnv("PAYTR_MERCHANT_ID", true);
  },
  get merchantKey() {
    return getEnv("PAYTR_MERCHANT_KEY", true);
  },
  get merchantSalt() {
    return getEnv("PAYTR_MERCHANT_SALT", true);
  },
  get testMode() {
    return getEnv("PAYTR_TEST_MODE", false, "1") === "1";
  },
  get callbackUrl() {
    return getEnv("PAYTR_CALLBACK_URL", false, "");
  },
  get successUrl() {
    return getEnv("PAYTR_SUCCESS_URL", false, "");
  },
  get failUrl() {
    return getEnv("PAYTR_FAIL_URL", false, "");
  },
  get merchantOkUrl() {
    return getEnv("PAYTR_MERCHANT_OK_URL", false, "");
  },
};

// ─── Döviz ───────────────────────────────────────────────────────────────────
export const PAYTR_CURRENCY_TRY = "TL";

// ─── Taksit ──────────────────────────────────────────────────────────────────
export const PAYTR_NO_INSTALLMENT = "1";
export const PAYTR_MAX_INSTALLMENT_DEFAULT = "1";

// ─── KVKK BİLGİSİ (NFR-1.9)
// Kart ve ödeme verilerinin saklanma amacı ve süresi.
// Türk Ticaret Kanunu m.2109 uyarınca muhasebe kaydı niteliğindeki belgelerin
// saklama süresi 10 yıldır.
// =============================================================================
export const KVKK_DATA_RETENTION = {
  /** Kart ve ödeme verilerinin saklanma amacı */
  AMAC:
    "30 günlük tekrarlayan abonelik tahsilatı, ödeme geçmişi takibi, müşteri hizmetleri destek talepleri, fraud (sahte ödeme) denetimi ve Türk Ticaret Kanunu, KVK Kanunu ve ilgili diğer yasal mevzuatlardan doğan yükümlülüklerin ifası.",
  /** Öğe: Saklanan veri kategorileri (ham kart YOK, sadece token+maskeli) */
  VERI_KATEGORILERI: [
    "PayTR tarafından verilen kart saklama token'ı (utoken / ctoken)",
    "Maskelenmiş kart numarası (XXXXXX******XX formatında)",
    "Kart markası / tipi (Visa, Mastercard, Troy, vb.)",
    "Kart son kullanma tarihi (YYMM, sadece gösterim amaçlı)",
    "Ödeme tutarı, tarih, işlem referansı, hata kodu",
    "Kullanıcı adı, e-posta, fatura/adres bilgileri (sipariş ile ilişkili)",
  ],
  /** Yasal saklama süresi */
  SURE_YIL: 10,
  SURE_ACIKLAMA:
    "Abonelik sona erdikten sonra, ilgili ödeme fiillerinin yazışma ve dava zamanaşımı süreleri de dikkate alınarak 10 (on) yıl boyunca saklanır. Süre sonunda veriler güvenli şekilde silinir/yok edilir.",
  /** Kullanıcı hakları */
  KULLANICI_HAKLARI:
    "Kullanıcılar, CISSP (KVKK) uyarınca verilerinize erişim, düzeltme, silinme, işleme kısıtlama, veri taşınabilirliği ve itiraz etme haklarına sahiptir. Başvuru için: info@cicekanatechmedia.com",
};

// ─── PayTR Hata Kodu → Türkçe Kullanıcı Mesajı Mapping ────────────────────────
// Kaynak: PayTR Resmi Entegrasyon Dokümanı (yaygın hata kodları)
// Tam liste için: https://dev.paytr.com/odeme-entegrasyonu/hata-kodlari
export const PAYTR_ERROR_CODE_MAP: Record<string, string> = {
  E101: "Kart numarası geçersiz. Lütfen kart numaranızı kontrol ediniz.",
  E102: "Kart son kullanma tarihi geçersiz. Lütfen tarihi kontrol ediniz.",
  E103: "CVV / CVC güvenlik kodu geçersiz. Kartınızın arkasındaki 3 haneli kodu giriniz.",
  E104: "Yetersiz bakiye. Kartınızda yeterli bakiye bulunmamaktadır.",
  E105: "Kart sahibi bankanız işlem onayı vermedi. Lütfen bankanızla iletişime geçiniz.",
  E106: "İşlem bankanız tarafından reddedildi. Lütfen kart bilgilerinizi kontrol ediniz veya bankanızla iletişime geçiniz.",
  E107: "3D Secure / SMS doğrulaması başarısız. Lütfen doğrulama kodunu tekrar deneyiniz.",
  E109: "3D Secure doğrulaması tamamlanamadı. Lütfen tekrar deneyiniz.",
  E110: "Yetersiz bakiye. Kart limitinizi kontrol ediniz.",
  E111: "Kartınız daha önce kaydedilmiş (duplicate). Lütfen kayıtlı kartlarınızı kontrol ediniz.",
  E112: "Kartınız 3D Secure sistemine kayıtlı değil. Lütfen bankanızla iletişime geçiniz.",
  E113: "İşlem tutarı kart limiti için uygun değil. Limit aşımı.",
  E117: "Hatalı veya riskli işlem tespit edildi. Güvenlik nedeniyle işlem reddedildi.",
  E118: "Kart numarası kartlı geçiş sistemine uygun değil. Lütfen kart bilgilerinizi kontrol ediniz.",
  E119: "Ortak ödeme noktası kullanılamıyor. Lütfen daha sonra tekrar deneyiniz.",
  E120: "Kartınız online alışverişe kapalı olabilir. Bankanızın mobil uygulamasından açabilirsiniz.",
  E123: "PayTR sisteminde geçici bir sorun oluştu. Lütfen daha sonra tekrar deneyiniz.",
  E128: "Kart saklama token'ı (utoken/ctoken) geçersiz veya süresi dolmuş. Lütfen kartınızı yeniden kaydediniz.",
  E130: "Kart sahibi bankasından işlem onayı bekleniyor (Takdir-i kredi). Lütfen daha sonra tekrar deneyiniz.",
  E199: "Genel bir hata oluştu. Lütfen daha sonra tekrar deneyiniz veya kart bilgilerinizi kontrol ediniz.",
  E200: "Saklı kart bulunamadı. Lütfen kartınızı yeniden kaydediniz.",
  E203: "Kart saklama token'ı (utoken) geçersiz. Lütfen kartınızı yeniden kaydediniz.",
  E204: "3D Secure sonucu alınamadı. Lütfen tekrar deneyiniz.",
  E205: "Taksit sayısı bu kart için geçerli değil. Lütfen tek çekim olarak deneyiniz.",
  E206: "Taksit indirimi uygulanamadı. Tek çekim olarak devam ediniz.",
  E255: "Tekrarlanan sipariş numarası. (Duplicate merchant_oid).",
  E301: "Mağaza bilgileri doğrulanamadı. Entegrasyon ayarlarınızı kontrol ediniz.",
  E302: "Hash değeri doğrulanamadı (hash validation failed). Entegrasyon anahtarlarınızı kontrol ediniz.",
  E303: "IP adresi mağaza panelinde tanımlı değil. (IP whitelist kontrolü)",
  E304: "Gerekli parametreler eksik gönderildi. Lütfen istek detaylarını kontrol ediniz.",
  E305: "Para birimi desteklenmiyor. Sadece TRY (TL) kullanınız.",
  E306: "Tutar formatı hatalı. (Kuruş cinsinden integer olarak gönderilmeli. 1 TL = 100)",
  E310: "Limit aşımı (işlemler arası süre sınırı). Rate limit.",
  E999: "Bilinmeyen bir sistem hatası oluştu. Lütfen daha sonra tekrar deneyiniz.",
};

export const PAYTR_DEFAULT_ERROR_MESSAGE =
  "Ödeme işlemi başarısız oldu. Lütfen kart bilgilerinizi kontrol ediniz veya daha sonra tekrar deneyiniz. Sorun devam ederse bankanız veya kart sağlayıcınız ile iletişime geçebilirsiniz.";

export function translatePaytrErrorCode(code?: string | null): string {
  if (!code) return PAYTR_DEFAULT_ERROR_MESSAGE;
  return PAYTR_ERROR_CODE_MAP[code] ?? PAYTR_DEFAULT_ERROR_MESSAGE;
}

// ─── Dunning Stratejisi (Kullanıcı Kararı) ───────────────────────────────────
// Karar: Tekrar deneme YOKTUR.
// Başarısız tahsilat → status = PAST_DUE → 24 saat sonra → CANCELED
export const DUNNING_CONFIG = {
  /** Tekrar deneme sayısı (Kullanıcı kararına göre 0 — RETRY YOK) */
  RETRY_COUNT: 0,
  /** Tekrar deneme günleri (boş — retry yok) */
  RETRY_DAYS: [] as number[],
  /** Past due'dan cancel'a geçiş için bekleme süresi (saat) */
  PAST_DUE_GRACE_HOURS: 24,
};

// ─── Abonelik Politikaları ───────────────────────────────────────────────────
export const SUBSCRIPTION_POLICIES = {
  /** Standart dönem (gün) */
  DEFAULT_INTERVAL_DAYS: 30,
  /** Yenileme hatırlatması kaç gün önce gönderilsin */
  RENEWAL_REMINDER_DAYS_BEFORE: 3,
  /** İptal politikası: Dönem sonunda iptal (cancel_at_period_end=true) */
  CANCEL_AT_PERIOD_END_ONLY: true,
  /**
   * Proration (Oranlama):
   * - Upgrade (yükseltme): Kalan gün × fiyat farkı anında çekilir, hemen yeni plana geç
   * - Downgrade (düşürme): Dönem sonuna kadar eski plan aktif, sonraki dönemde yeni fiyat
   */
  PRORATION_UPGRADE_IMMEDIATE_CHARGE: true,
  PRORATION_DOWNGRADE_DEFER_TO_NEXT_PERIOD: true,
};
