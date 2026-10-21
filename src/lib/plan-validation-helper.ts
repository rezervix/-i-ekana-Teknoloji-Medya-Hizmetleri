/**
 * Plan / Ürün Yönetim Paneli Doğrulama & Hata Yönlendirme Yardımcısı
 * 
 * Bu modül; Zod veya API doğrulama hatalarını kullanıcı dostu Türkçe mesajlara dönüştürür,
 * hatanın hangi sekmede (tab) ve hangi form alanında (elementId) olduğunu tespit ederek
 * otomatik kaydırma ve odaklanma (jump-to-field) işlemlerini yönetir.
 */

export type PlanTabId =
  | 'general'
  | 'hero'
  | 'benefits'
  | 'steps'
  | 'screenshots'
  | 'pricing'
  | 'trust'
  | 'faqs'
  | 'whatsapp'
  | 'seo'
  | 'visibility';

export interface PlanTabInfo {
  id: PlanTabId;
  label: string;
}

export const PLAN_TABS: PlanTabInfo[] = [
  { id: 'general', label: 'Genel Bilgiler' },
  { id: 'hero', label: 'Hero & Giriş' },
  { id: 'benefits', label: 'Fayda Kartları' },
  { id: 'steps', label: 'Nasıl Çalışır' },
  { id: 'screenshots', label: 'Demo & Görseller' },
  { id: 'pricing', label: 'Paketler & Fiyat' },
  { id: 'trust', label: 'Güven Blokları' },
  { id: 'faqs', label: 'SSS' },
  { id: 'whatsapp', label: 'WhatsApp & Demo' },
  { id: 'seo', label: 'SEO & Paylaşım' },
  { id: 'visibility', label: 'Bölüm Ayarları' },
];

export interface FieldMeta {
  tab: PlanTabId;
  tabLabel: string;
  fieldLabel: string;
  elementId: string;
}

export interface FormIssueDetail {
  path: string;
  field: string;
  tab: PlanTabId;
  tabLabel: string;
  fieldLabel: string;
  elementId: string;
  message: string;
  code?: string;
  receivedLength?: number;
  maximum?: number;
}

export interface FormErrorDetail {
  error: string;
  tab: PlanTabId;
  tabLabel: string;
  field: string;
  fieldLabel: string;
  elementId: string;
  message: string;
  fullMessage: string;
  issues: FormIssueDetail[];
}

export const PLAN_FIELD_REGISTRY: Record<string, { tab: PlanTabId; tabLabel: string; fieldLabel: string; elementId: string }> = {
  name: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Hizmet Adı', elementId: 'field-name' },
  slug: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'URL Adresi (Slug)', elementId: 'field-slug' },
  shortDescription: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Kısa Açıklama', elementId: 'field-shortDescription' },
  cardSummary: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Liste Kartı Kısa Özeti', elementId: 'field-cardSummary' },
  category: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Kategori / Etiket', elementId: 'field-category' },
  imageUrl: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Hizmet Logosu / İkonu', elementId: 'field-imageUrl' },
  isListed: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Listeleme Durumu', elementId: 'field-isListed' },
  isFeatured: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Öne Çıkarılan Hizmet', elementId: 'field-isFeatured' },
  displayOrder: { tab: 'general', tabLabel: 'Genel Bilgiler', fieldLabel: 'Sıralama', elementId: 'field-displayOrder' },

  tagline: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Hero Üst Rozet / Slogan', elementId: 'field-tagline' },
  heroHeadline: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Hero Ana Başlık', elementId: 'field-heroHeadline' },
  heroSubheadline: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Hero Alt Başlık', elementId: 'field-heroSubheadline' },
  primaryCtaLabel: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Birincil Buton Metni', elementId: 'field-primaryCtaLabel' },
  primaryCtaUrl: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Birincil Buton Bağlantısı', elementId: 'field-primaryCtaUrl' },
  secondaryCtaLabel: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'İkincil Buton Metni', elementId: 'field-secondaryCtaLabel' },
  secondaryCtaUrl: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'İkincil Buton Bağlantısı', elementId: 'field-secondaryCtaUrl' },
  heroMockupUrl: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Hero Görseli (Mockup)', elementId: 'field-heroMockupUrl' },
  heroImageAlt: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Hero Görsel Açıklaması', elementId: 'field-heroImageAlt' },
  showStartingPrice: { tab: 'hero', tabLabel: 'Hero & Giriş', fieldLabel: 'Başlangıç Fiyatı Gösterimi', elementId: 'field-showStartingPrice' },

  benefits: { tab: 'benefits', tabLabel: 'Fayda Kartları', fieldLabel: 'Fayda Kartları', elementId: 'field-benefits' },
  stats: { tab: 'benefits', tabLabel: 'Fayda Kartları', fieldLabel: 'Rakamlarla İstatistikler', elementId: 'field-stats' },
  highlights: { tab: 'benefits', tabLabel: 'Fayda Kartları', fieldLabel: 'Öne Çıkan Özellikler', elementId: 'field-highlights' },

  steps: { tab: 'steps', tabLabel: 'Nasıl Çalışır', fieldLabel: 'Nasıl Çalışır Adımları', elementId: 'field-steps' },

  demoScreenshots: { tab: 'screenshots', tabLabel: 'Demo & Görseller', fieldLabel: 'Demo Ekran Görüntüleri', elementId: 'field-demoScreenshots' },

  tiers: { tab: 'pricing', tabLabel: 'Paketler & Fiyat', fieldLabel: 'Fiyatlandırma & Paketler', elementId: 'field-tiers' },
  comparisonFeatureKeys: { tab: 'pricing', tabLabel: 'Paketler & Fiyat', fieldLabel: 'Karşılaştırma Özellikleri', elementId: 'field-comparisonFeatureKeys' },
  vatNote: { tab: 'pricing', tabLabel: 'Paketler & Fiyat', fieldLabel: 'KDV Notu', elementId: 'field-vatNote' },
  disclaimer: { tab: 'pricing', tabLabel: 'Paketler & Fiyat', fieldLabel: 'Yasal Dipnot / Uyarı', elementId: 'field-disclaimer' },

  trustBlocks: { tab: 'trust', tabLabel: 'Güven Blokları', fieldLabel: 'Kurumsal Güven Blokları', elementId: 'field-trustBlocks' },
  trustPoints: { tab: 'trust', tabLabel: 'Güven Blokları', fieldLabel: 'Güven Maddeleri', elementId: 'field-trustPoints' },

  faqs: { tab: 'faqs', tabLabel: 'SSS', fieldLabel: 'Sıkça Sorulan Sorular', elementId: 'field-faqs' },

  whatsappNumber: { tab: 'whatsapp', tabLabel: 'WhatsApp & Demo', fieldLabel: 'WhatsApp Numarası', elementId: 'field-whatsappNumber' },
  whatsappTemplate: { tab: 'whatsapp', tabLabel: 'WhatsApp & Demo', fieldLabel: 'WhatsApp Şablon Metni', elementId: 'field-whatsappTemplate' },
  isDemoFormActive: { tab: 'whatsapp', tabLabel: 'WhatsApp & Demo', fieldLabel: 'Demo Talep Formu', elementId: 'field-isDemoFormActive' },

  metaTitle: { tab: 'seo', tabLabel: 'SEO & Paylaşım', fieldLabel: 'Meta Başlık (SEO Title)', elementId: 'field-metaTitle' },
  metaDescription: { tab: 'seo', tabLabel: 'SEO & Paylaşım', fieldLabel: 'Meta Açıklama (SEO Description)', elementId: 'field-metaDescription' },
  ogImageUrl: { tab: 'seo', tabLabel: 'SEO & Paylaşım', fieldLabel: 'Paylaşım Görseli (OG)', elementId: 'field-ogImageUrl' },

  sectionVisibility: { tab: 'visibility', tabLabel: 'Bölüm Ayarları', fieldLabel: 'Bölüm Görünürlükleri', elementId: 'field-sectionVisibility' },
};

/**
 * Zod path dizisini (örn: ['tiers', 0, 'priceMonthly']) çözümleyerek
 * hangi sekmede olduğunu, insan tarafından okunur adını ve element id'sini döndürür.
 */
export function resolveFieldMeta(path: (string | number)[]): FieldMeta {
  const rootKey = String(path[0] || '');
  const rootMeta = PLAN_FIELD_REGISTRY[rootKey] || {
    tab: 'general' as PlanTabId,
    tabLabel: 'Genel Bilgiler',
    fieldLabel: rootKey || 'İlgili Alan',
    elementId: `field-${rootKey}`,
  };

  if (path.length <= 1) {
    return rootMeta;
  }

  const index = typeof path[1] === 'number' ? path[1] : parseInt(String(path[1]), 10);
  const subKey = path[2] ? String(path[2]) : '';

  if (!isNaN(index)) {
    const itemNum = index + 1;
    if (rootKey === 'tiers') {
      const subLabels: Record<string, string> = {
        name: 'Paket Adı',
        priceMonthly: 'Aylık Fiyat',
        description: 'Paket Açıklaması',
        badge: 'Rozet Metni',
        vatNote: 'KDV Notu',
        renewalNote: 'Yenileme Notu',
        buttonText: 'Buton Metni',
        features: 'Paket Özellikleri',
        comparisonFeatures: 'Karşılaştırma Özellikleri',
      };
      const subLabel = subKey && subLabels[subKey] ? ` (${subLabels[subKey]})` : '';
      return {
        tab: 'pricing',
        tabLabel: 'Paketler & Fiyat',
        fieldLabel: `Paket #${itemNum}${subLabel}`,
        elementId: subKey ? `field-tiers-${index}-${subKey}` : `field-tiers-${index}`,
      };
    }

    if (rootKey === 'benefits') {
      const subLabels: Record<string, string> = {
        title: 'Başlık',
        description: 'Açıklama',
        icon: 'İkon',
      };
      const subLabel = subKey && subLabels[subKey] ? ` (${subLabels[subKey]})` : '';
      return {
        tab: 'benefits',
        tabLabel: 'Fayda Kartları',
        fieldLabel: `Fayda Kartı #${itemNum}${subLabel}`,
        elementId: subKey ? `field-benefits-${index}-${subKey}` : `field-benefits-${index}`,
      };
    }

    if (rootKey === 'steps') {
      const subLabels: Record<string, string> = {
        title: 'Başlık',
        description: 'Açıklama',
      };
      const subLabel = subKey && subLabels[subKey] ? ` (${subLabels[subKey]})` : '';
      return {
        tab: 'steps',
        tabLabel: 'Nasıl Çalışır',
        fieldLabel: `Adım #${itemNum}${subLabel}`,
        elementId: subKey ? `field-steps-${index}-${subKey}` : `field-steps-${index}`,
      };
    }

    if (rootKey === 'faqs') {
      const subLabels: Record<string, string> = {
        question: 'Soru',
        answer: 'Cevap',
      };
      const subLabel = subKey && subLabels[subKey] ? ` (${subLabels[subKey]})` : '';
      return {
        tab: 'faqs',
        tabLabel: 'SSS',
        fieldLabel: `Soru #${itemNum}${subLabel}`,
        elementId: subKey ? `field-faqs-${index}-${subKey}` : `field-faqs-${index}`,
      };
    }

    if (rootKey === 'demoScreenshots') {
      return {
        tab: 'screenshots',
        tabLabel: 'Demo & Görseller',
        fieldLabel: `Demo Görseli #${itemNum}`,
        elementId: `field-demoScreenshots-${index}`,
      };
    }

    if (rootKey === 'trustBlocks') {
      return {
        tab: 'trust',
        tabLabel: 'Güven Blokları',
        fieldLabel: `Güven Bloğu #${itemNum}`,
        elementId: `field-trustBlocks-${index}`,
      };
    }

    return {
      tab: rootMeta.tab,
      tabLabel: rootMeta.tabLabel,
      fieldLabel: `${rootMeta.fieldLabel} #${itemNum}`,
      elementId: `field-${rootKey}-${index}`,
    };
  }

  return rootMeta;
}

/**
 * İç içe geçmiş nesneden path dizisine göre değeri çeker
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
  if (!obj) return undefined;
  let curr = obj;
  for (const seg of path) {
    if (curr == null) return undefined;
    curr = curr[seg];
  }
  return curr;
}

/**
 * ZodError nesnesini kullanıcı dostu, yapılandırılmış hata nesnesine çevirir.
 */
export function formatPlanZodError(error: any, rawData?: any): FormErrorDetail {
  const rawIssues: any[] = error?.issues || [];
  const issues: FormIssueDetail[] = rawIssues.map((issue) => {
    const meta = resolveFieldMeta(issue.path || []);
    let friendlyMsg = issue.message || 'Geçersiz değer';

    const rawVal = getNestedValue(rawData, issue.path || []);
    const currentLen = typeof rawVal === 'string' ? rawVal.length : undefined;

    // İngilizce standart Zod mesajlarını Türkçe ve net hale getir
    if (issue.code === 'too_big' && issue.type === 'string') {
      friendlyMsg = `${meta.fieldLabel} en fazla ${issue.maximum} karakter olabilir.${
        currentLen !== undefined ? ` (Şu an: ${currentLen} karakter)` : ''
      }`;
    } else if (issue.code === 'too_small' && issue.type === 'string') {
      if (issue.minimum === 1) {
        friendlyMsg = `${meta.fieldLabel} alanı zorunludur.`;
      } else {
        friendlyMsg = `${meta.fieldLabel} en az ${issue.minimum} karakter olmalıdır.${
          currentLen !== undefined ? ` (Şu an: ${currentLen} karakter)` : ''
        }`;
      }
    } else if (issue.code === 'invalid_string') {
      if (issue.validation === 'url') {
        friendlyMsg = `${meta.fieldLabel} geçerli bir web bağlantısı (URL) olmalıdır.`;
      } else if (issue.validation === 'regex') {
        friendlyMsg = `${meta.fieldLabel} yalnızca küçük harf, rakam ve tire içerebilir.`;
      }
    } else if (friendlyMsg.includes('expected string to have <=')) {
      const match = friendlyMsg.match(/<=\s*(\d+)/);
      const max = match ? match[1] : '';
      friendlyMsg = `${meta.fieldLabel} en fazla ${max} karakter olabilir.${
        currentLen !== undefined ? ` (Şu an: ${currentLen} karakter)` : ''
      }`;
    }

    return {
      path: (issue.path || []).join('.'),
      field: String(issue.path?.[0] || ''),
      tab: meta.tab,
      tabLabel: meta.tabLabel,
      fieldLabel: meta.fieldLabel,
      elementId: meta.elementId,
      message: friendlyMsg,
      code: issue.code,
      receivedLength: currentLen,
      maximum: issue.maximum,
    };
  });

  const first = issues[0] || {
    path: '',
    field: '',
    tab: 'general' as PlanTabId,
    tabLabel: 'Genel Bilgiler',
    fieldLabel: 'Hata',
    elementId: 'field-name',
    message: error?.message || 'Geçersiz veri girdisi',
  };

  const primaryErrorText = `[${first.tabLabel}] ${first.fieldLabel}: ${first.message}`;

  return {
    error: primaryErrorText,
    tab: first.tab,
    tabLabel: first.tabLabel,
    field: first.field,
    fieldLabel: first.fieldLabel,
    elementId: first.elementId,
    message: first.message,
    fullMessage: primaryErrorText,
    issues,
  };
}

/**
 * Belirtilen nesne içinde max uzunluğu aşan string alanları arar
 */
function findFieldExceedingLength(
  obj: any,
  maxAllowed: number,
  prefix: (string | number)[] = []
): { path: (string | number)[]; value: string; length: number } | null {
  if (!obj || typeof obj !== 'object') return null;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const currentPath = [...prefix, key];

    if (typeof val === 'string' && val.length > maxAllowed) {
      return { path: currentPath, value: val, length: val.length };
    }

    if (val && typeof val === 'object') {
      const nested = findFieldExceedingLength(val, maxAllowed, currentPath);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Ham API hata metinlerini (örn: "Too big: expected string to have <=120 characters")
 * formdaki değerlerle eşleştirerek zenginleştirilmiş hata nesnesine çevirir.
 */
export function parseGenericPlanError(rawError: string, formValues?: any): FormErrorDetail | null {
  if (!rawError || typeof rawError !== 'string') return null;

  // 1. Zod "Too big" kontrolü
  const tooBigMatch = rawError.match(/expected string to have <=?\s*(\d+)/i) ||
                      rawError.match(/en fazla (\d+) karakter/i);

  if (tooBigMatch && formValues) {
    const maxAllowed = parseInt(tooBigMatch[1], 10);
    const culprit = findFieldExceedingLength(formValues, maxAllowed);
    if (culprit) {
      const meta = resolveFieldMeta(culprit.path);
      const msg = `${meta.fieldLabel} en fazla ${maxAllowed} karakter olabilir. (Mevcut metin: ${culprit.length} karakter)`;
      const full = `[${meta.tabLabel}] ${meta.fieldLabel}: En fazla ${maxAllowed} karakter olabilir (Şu an: ${culprit.length} karakter).`;
      return {
        error: full,
        tab: meta.tab,
        tabLabel: meta.tabLabel,
        field: String(culprit.path[0] || ''),
        fieldLabel: meta.fieldLabel,
        elementId: meta.elementId,
        message: msg,
        fullMessage: full,
        issues: [
          {
            path: culprit.path.join('.'),
            field: String(culprit.path[0] || ''),
            tab: meta.tab,
            tabLabel: meta.tabLabel,
            fieldLabel: meta.fieldLabel,
            elementId: meta.elementId,
            message: msg,
            code: 'too_big',
            receivedLength: culprit.length,
            maximum: maxAllowed,
          },
        ],
      };
    }
  }

  // 2. Fiyat paketi bulunamadı hatası
  if (rawError.includes('en az bir fiyat paketi')) {
    return {
      error: '[Paketler & Fiyat] Her ürünün en az bir fiyat paketi olmalıdır.',
      tab: 'pricing',
      tabLabel: 'Paketler & Fiyat',
      field: 'tiers',
      fieldLabel: 'Fiyatlandırma Paketleri',
      elementId: 'field-tiers',
      message: 'Lütfen en az bir fiyat paketi ekleyin veya silinen paketi yeniden tanımlayın.',
      fullMessage: '[Paketler & Fiyat] Fiyatlandırma Paketleri: En az bir paket tanımlanmalıdır.',
      issues: [],
    };
  }

  // 3. Aktif aboneliği olan paket silinme hatası
  if (rawError.includes('ACTIVE_TIER_SUBSCRIPTIONS') || rawError.includes('aktif abonelik')) {
    return {
      error: '[Paketler & Fiyat] Bu pakete kayıtlı aktif müşteri abonelikleri bulunduğu için paket silinemez.',
      tab: 'pricing',
      tabLabel: 'Paketler & Fiyat',
      field: 'tiers',
      fieldLabel: 'Fiyatlandırma Paketleri',
      elementId: 'field-tiers',
      message: 'Aktif aboneliği olan bir fiyat paketini silemezsiniz. Bunun yerine paketi pasife alabilirsiniz.',
      fullMessage: '[Paketler & Fiyat] Aktif aboneliği bulunan paket silinemez.',
      issues: [],
    };
  }

  return null;
}
