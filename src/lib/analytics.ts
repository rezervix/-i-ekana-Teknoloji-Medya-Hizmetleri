/**
 * Faz 5: Ölçüm & Analitik Altyapısı
 * 
 * - GA4 e-ticaret olayları: view_item_list, view_item, add_to_cart, remove_from_cart,
 *   view_cart, begin_checkout, add_shipping_info, add_payment_info, purchase
 * - Çerez onayına saygılı çalışma (Faz 4: cicekana-cookie-consent = 'accepted')
 * - Kendi veritabanımıza funnel_events kaydı
 * - Oturum bazlı A/B test altyapısı (CTA: "Sepete Ekle" vs "Hemen Al, Yarın Kapında")
 */

export const GA4_EVENTS = {
  VIEW_ITEM_LIST: "view_item_list",
  VIEW_ITEM: "view_item",
  ADD_TO_CART: "add_to_cart",
  REMOVE_FROM_CART: "remove_from_cart",
  VIEW_CART: "view_cart",
  BEGIN_CHECKOUT: "begin_checkout",
  ADD_SHIPPING_INFO: "add_shipping_info",
  ADD_PAYMENT_INFO: "add_payment_info",
  PURCHASE: "purchase",
} as const;

export type GA4EventType = (typeof GA4_EVENTS)[keyof typeof GA4_EVENTS];

const COOKIE_CONSENT_KEY = "cicekana-cookie-consent";
const SESSION_STORAGE_KEY = "cicekana_session_id";
const UTM_STORAGE_KEY = "cicekana_utm_source";
const AB_CTA_KEY = "cicekana_ab_cta_variant";

export type ABVariant = "control" | "variant_fast";

export interface AnalyticsItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  category?: string;
  variant?: string;
}

export interface FunnelPayload {
  event: GA4EventType | string;
  productId?: string;
  value?: number;
  currency?: string;
  variant?: string;
  items?: AnalyticsItem[];
  metadata?: Record<string, any>;
}

/**
 * Çerez onay durumunu kontrol eder (Faz 4 uyumlu)
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * Oturum ID'sini alır veya oluşturur (session bazlı tekil takip)
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "server-session";
  try {
    let sid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = "ses_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return "anon-" + Date.now();
  }
}

/**
 * Cihaz tipini tespit eder: desktop, mobile, tablet
 */
export function getDeviceType(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024)) {
    return "tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || width < 768) {
    return "mobile";
  }
  return "desktop";
}

/**
 * URL'den veya depodan UTM Source değerini okur
 */
export function getUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source") || params.get("ref");
    const campaign = params.get("utm_campaign");
    const term = params.get("utm_term");
    const medium = params.get("utm_medium");

    if (utm) sessionStorage.setItem(UTM_STORAGE_KEY, utm);
    if (campaign) sessionStorage.setItem("cicekana_utm_campaign", campaign);
    if (term) sessionStorage.setItem("cicekana_utm_term", term);
    if (medium) sessionStorage.setItem("cicekana_utm_medium", medium);

    return utm || sessionStorage.getItem(UTM_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Hafif A/B Test Altyapısı:
 * Oturum bazlı sabit varyant atar (CTA metni için: 'control' | 'variant_fast')
 * control = "Sepete Ekle"
 * variant_fast = "Hemen Al, Yarın Kapında"
 */
export function getABVariant(testName = "cta_button"): ABVariant {
  if (typeof window === "undefined") return "control";
  try {
    const existing = sessionStorage.getItem(`${AB_CTA_KEY}_${testName}`);
    if (existing === "control" || existing === "variant_fast") {
      return existing;
    }
    // Deterministik 50/50 bölme (oturum ID'sine veya rastgeleliğe göre)
    const sid = getSessionId();
    const lastChar = sid.charCodeAt(sid.length - 1);
    const assigned: ABVariant = lastChar % 2 === 0 ? "variant_fast" : "control";
    sessionStorage.setItem(`${AB_CTA_KEY}_${testName}`, assigned);
    return assigned;
  } catch {
    return "control";
  }
}

/**
 * CTA metnini seçilen varyanta ve stok durumuna göre döndürür
 */
export function getCtaButtonText(stock = 1, isOrderOnly = false): string {
  if (stock === 0) return "Stokta Yok";
  const variant = getABVariant("cta_button");
  if (variant === "variant_fast" && !isOrderOnly) {
    return "Hemen Al, Yarın Kapında";
  }
  return "Sepete Ekle";
}

/**
 * Ana Olay Takip Fonksiyonu:
 * 1. GA4'e (window.gtag) e-ticaret parametreleriyle gönderir (Yalnızca çerez onayı varsa)
 * 2. Kendi Neon veritabanımızın `funnel_events` tablosuna yazar
 */
export async function trackFunnelEvent(payload: FunnelPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const sessionId = getSessionId();
  const device = getDeviceType();
  const utmSource = getUtmSource();
  const variant = payload.variant || getABVariant("cta_button");

  // 1. GA4 Event (Çerez Onayına Saygılı)
  const consentGiven = hasAnalyticsConsent();
  if (consentGiven && typeof (window as any).gtag === "function") {
    try {
      const ga4Items = (payload.items || []).map((item, index) => ({
        item_id: item.id,
        item_name: item.name,
        price: Number(item.price) || 0,
        quantity: item.quantity || 1,
        item_category: item.category || "Genel",
        index: index + 1,
      }));

      const ga4Data: Record<string, any> = {
        currency: payload.currency || "TRY",
        value: payload.value !== undefined ? Number(payload.value) : undefined,
        items: ga4Items.length > 0 ? ga4Items : undefined,
        variant,
        session_id: sessionId,
      };

      // Temizleme: tanımsız alanları sil
      Object.keys(ga4Data).forEach(
        (key) => ga4Data[key] === undefined && delete ga4Data[key]
      );

      (window as any).gtag("event", payload.event, ga4Data);
    } catch (err) {
      console.warn("[analytics] GA4 event error:", err);
    }
  }

  // 2. Kendi Veritabanımıza funnel_events Yazma
  try {
    const dbPayload = {
      sessionId,
      event: payload.event,
      productId: payload.productId || (payload.items?.[0]?.id ?? null),
      value: payload.value !== undefined ? Number(payload.value) : null,
      device,
      utmSource,
      variant,
      metadata: {
        currency: payload.currency || "TRY",
        consentGiven,
        itemsCount: payload.items?.length || 0,
        items: payload.items?.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.quantity || 1 })),
        ...(payload.metadata || {}),
      },
    };

    // sendBeacon veya fetch keepalive ile kesintisiz gönderim
    const bodyStr = JSON.stringify(dbPayload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([bodyStr], { type: "application/json" });
      const sent = navigator.sendBeacon("/api/analytics/track", blob);
      if (!sent) {
        fetch("/api/analytics/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: bodyStr,
          keepalive: true,
        }).catch(() => {});
      }
    } else {
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: bodyStr,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    console.warn("[analytics] DB tracking error:", err);
  }
}

// ─── Kolay Çağrılabilir E-Ticaret Olay Yardımcıları ─────────────────────────

export function trackViewItemList(items: AnalyticsItem[], listName = "Mağaza Kataloğu") {
  return trackFunnelEvent({
    event: GA4_EVENTS.VIEW_ITEM_LIST,
    items,
    metadata: { item_list_name: listName },
  });
}

export function trackViewItem(item: AnalyticsItem, variant?: string) {
  return trackFunnelEvent({
    event: GA4_EVENTS.VIEW_ITEM,
    productId: item.id,
    value: item.price,
    variant: variant || getABVariant("cta_button"),
    items: [item],
  });
}

export function trackAddToCart(item: AnalyticsItem, variant?: string) {
  return trackFunnelEvent({
    event: GA4_EVENTS.ADD_TO_CART,
    productId: item.id,
    value: (item.price || 0) * (item.quantity || 1),
    variant: variant || getABVariant("cta_button"),
    items: [item],
  });
}

export function trackRemoveFromCart(item: AnalyticsItem) {
  return trackFunnelEvent({
    event: GA4_EVENTS.REMOVE_FROM_CART,
    productId: item.id,
    value: (item.price || 0) * (item.quantity || 1),
    items: [item],
  });
}

export function trackViewCart(items: AnalyticsItem[], totalValue: number) {
  return trackFunnelEvent({
    event: GA4_EVENTS.VIEW_CART,
    value: totalValue,
    items,
  });
}

export function trackBeginCheckout(items: AnalyticsItem[], totalValue: number) {
  return trackFunnelEvent({
    event: GA4_EVENTS.BEGIN_CHECKOUT,
    value: totalValue,
    items,
  });
}

export function trackAddShippingInfo(items: AnalyticsItem[], totalValue: number, shippingTier = "Standart Kargo") {
  return trackFunnelEvent({
    event: GA4_EVENTS.ADD_SHIPPING_INFO,
    value: totalValue,
    items,
    metadata: { shipping_tier: shippingTier },
  });
}

export function trackAddPaymentInfo(items: AnalyticsItem[], totalValue: number, paymentType = "Kredi Kartı") {
  return trackFunnelEvent({
    event: GA4_EVENTS.ADD_PAYMENT_INFO,
    value: totalValue,
    items,
    metadata: { payment_type: paymentType },
  });
}

export function trackPurchase(orderNumber: string, items: AnalyticsItem[], totalValue: number) {
  return trackFunnelEvent({
    event: GA4_EVENTS.PURCHASE,
    value: totalValue,
    items,
    metadata: { transaction_id: orderNumber },
  });
}
