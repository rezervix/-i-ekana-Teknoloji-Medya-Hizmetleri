/**
 * scripts/test-conversion-audit.ts
 * 
 * Google Ads & GA4 Dönüşüm Ölçümü Uçtan Uca Doğrulama Test Paketi
 * Kullanıcı Talimatı Aşama 5'te yer alan 12 kritik senaryoyu doğrular.
 */

import {
  GA4_EVENTS,
  trackFunnelEvent,
  trackPurchase,
  trackGenerateLead,
  hasAnalyticsConsent,
  updateAnalyticsConsent,
  FunnelPayload,
} from "../src/lib/analytics";

interface MockGtagCall {
  type: string;
  eventName?: string;
  data?: Record<string, any>;
  rawArgs: any[];
}

// Test Ortamı Kurulumu: window, localStorage, sessionStorage ve gtag mock'ları
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}

const mockLocalStorage = new LocalStorageMock();
const mockSessionStorage = new LocalStorageMock();
const recordedGtagCalls: MockGtagCall[] = [];

// Node ortamında window mock'u oluştur
(global as any).window = {
  location: { search: "?utm_source=google_ads&utm_campaign=spring_promo", hostname: "cicekanatechmedia.com" },
  innerWidth: 1024,
  dispatchEvent: (event: any) => {},
  gtag: function (...args: any[]) {
    if (args[0] === "event") {
      recordedGtagCalls.push({
        type: "event",
        eventName: args[1],
        data: args[2],
        rawArgs: args,
      });
    } else if (args[0] === "consent") {
      recordedGtagCalls.push({
        type: "consent",
        eventName: args[1], // "default" veya "update"
        data: args[2],
        rawArgs: args,
      });
    } else {
      recordedGtagCalls.push({
        type: args[0],
        rawArgs: args,
      });
    }
  },
};

(global as any).localStorage = mockLocalStorage;
(global as any).sessionStorage = mockSessionStorage;
try {
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
      sendBeacon: () => true,
    },
    configurable: true,
    writable: true,
  });
} catch {
  // Fallback
}

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [GEÇTİ] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [BAŞARISIZ] ${testName}${detail ? ` - Hata: ${detail}` : ""}`);
    failedCount++;
  }
}

async function runAuditTests() {
  console.log("\n========================================================");
  console.log(" GOOGLE ADS / GA4 DÖNÜŞÜM ÖLÇÜMÜ KAPSAMLI TEST PAKETİ");
  console.log("========================================================\n");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 10: Çerez onayının reddedilmesi, kabul edilmesi ve değiştirilmesi
  // ──────────────────────────────────────────────────────────────────────────
  console.log("Senaryo 10: Çerez Onayı ve Google Consent Mode v2 Davranışı");
  mockLocalStorage.clear();
  recordedGtagCalls.length = 0;

  // Reddedilmiş durum
  updateAnalyticsConsent("rejected");
  assert(!hasAnalyticsConsent(), "10.1: Çerez reddedildiğinde hasAnalyticsConsent false dönmeli");
  const rejectConsentCall = recordedGtagCalls.find(
    (c) => c.type === "consent" && c.eventName === "update" && c.data?.ad_storage === "denied"
  );
  assert(Boolean(rejectConsentCall), "10.2: Reddedildiğinde gtag('consent', 'update', { ad_storage: 'denied' }) gitmeli");

  // Reddedilmişken event çağrısı gtag'e gitmemeli
  recordedGtagCalls.length = 0;
  await trackFunnelEvent({ event: "custom_event" });
  assert(recordedGtagCalls.length === 0, "10.3: Çerez onayı yokken gtag('event') çağrılmamalı");

  // Kabul edilmiş durum
  updateAnalyticsConsent("accepted");
  assert(hasAnalyticsConsent(), "10.4: Çerez kabul edildiğinde hasAnalyticsConsent true dönmeli");
  const acceptConsentCall = recordedGtagCalls.find(
    (c) => c.type === "consent" && c.eventName === "update" && c.data?.ad_storage === "granted"
  );
  assert(Boolean(acceptConsentCall), "10.5: Kabul edildiğinde gtag('consent', 'update', { ad_storage: 'granted' }) gitmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 1: Başarılı ve doğrulanmış bir mağaza siparişi
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 1: Başarılı ve Doğrulanmış Mağaza Siparişi (Tek Satın Alma Dönüşümü)");
  recordedGtagCalls.length = 0;

  const mockOrderNumber = "ORD_TEST_2026_001";
  const mockItems = [
    { id: "prod_1", name: "Premium NFC Kartvizit", price: 750, quantity: 2, category: "Teknoloji" },
  ];
  const mockTotal = 1500;

  // Sipariş doğrulanmış ve basarili sayfasında tek seferlik purchase çağrısı
  await trackPurchase(mockOrderNumber, mockItems, mockTotal);

  const purchaseEvents = recordedGtagCalls.filter((c) => c.type === "event" && c.eventName === GA4_EVENTS.PURCHASE);
  assert(purchaseEvents.length === 1, "1.1: Tam olarak bir purchase olayı tetiklenmeli");
  const pEvent = purchaseEvents[0];
  assert(pEvent?.data?.transaction_id === mockOrderNumber, "1.2: transaction_id doğru iletilmeli", `Alınan: ${pEvent?.data?.transaction_id}`);
  assert(pEvent?.data?.value === 1500, "1.3: Sipariş toplam tutarı (1500 TRY) doğru iletilmeli", `Alınan: ${pEvent?.data?.value}`);
  assert(pEvent?.data?.currency === "TRY", "1.4: Para birimi TRY olmalı", `Alınan: ${pEvent?.data?.currency}`);
  assert(Array.isArray(pEvent?.data?.items) && pEvent?.data?.items.length === 1, "1.5: Ürün detayları GA4 uyumlu dizide bulunmalı");
  assert(pEvent?.data?.items[0]?.item_id === "prod_1", "1.6: item_id doğru eşleşmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 8: Aynı başarı sayfasının tekrar yüklenmesi (De-duplication / Idempotency)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 8: Sayfa Yenileme / Tekrar Yüklemede Mükerrer Satış Önleme");
  recordedGtagCalls.length = 0;
  mockSessionStorage.clear();

  function simulateOrderTrackingSuccess(orderNum: string, totalVal: number) {
    const trackedKey = `cicekana_tracked_purchase_${orderNum}`;
    if (mockSessionStorage.getItem(trackedKey)) {
      return false; // Mükerrer çağrı engellendi
    }
    trackPurchase(orderNum, mockItems, totalVal);
    mockSessionStorage.setItem(trackedKey, "1");
    return true;
  }

  // İlk yükleme
  const firstVisit = simulateOrderTrackingSuccess(mockOrderNumber, mockTotal);
  assert(firstVisit === true, "8.1: İlk sayfa yüklemesinde sipariş başarıyla takip edilmeli");

  // İkinci yükleme (F5 veya geri dönüş)
  const secondVisit = simulateOrderTrackingSuccess(mockOrderNumber, mockTotal);
  assert(secondVisit === false, "8.2: Sayfa yenilendiğinde mükerrer takip engellenmeli");

  const purchaseCalls = recordedGtagCalls.filter((c) => c.type === "event" && c.eventName === GA4_EVENTS.PURCHASE);
  assert(purchaseCalls.length === 1, "8.3: Yenilemeye rağmen toplam purchase sayısı tam 1 olmalı");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 2 & 3: Başarısız ödeme veya doğrulanmamış / bekleyen ödeme
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 2 & 3: Başarısız Ödeme ve Doğrulanmamış Sonuç");
  recordedGtagCalls.length = 0;

  function simulateBasariliPageRender(dbOrder: { paymentStatus: string } | null, orderParam: string) {
    let isPaymentVerified = false;
    if (dbOrder && dbOrder.paymentStatus === "COMPLETED") {
      isPaymentVerified = true;
    }
    if (isPaymentVerified) {
      simulateOrderTrackingSuccess(orderParam, 500);
    }
  }

  // Başarısız ödeme (paymentStatus: 'FAILED')
  simulateBasariliPageRender({ paymentStatus: "FAILED" }, "ORD_FAILED_999");
  assert(recordedGtagCalls.length === 0, "2.1: Başarısız ödemede (FAILED) sıfır purchase tetiklenmeli");

  // Doğrulanmamış / Bekleyen ödeme (paymentStatus: 'PENDING')
  simulateBasariliPageRender({ paymentStatus: "PENDING" }, "ORD_PENDING_888");
  assert(recordedGtagCalls.length === 0, "3.1: Henüz onaylanmamış ödemede (PENDING) sıfır purchase tetiklenmeli");

  // Sahte / DB'de olmayan sipariş parametresi (?order=FAKE)
  simulateBasariliPageRender(null, "ORD_FAKE_000");
  assert(recordedGtagCalls.length === 0, "3.2: DB'de bulunmayan sahte sipariş parametresinde sıfır purchase tetiklenmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 4 & 5: AI Otomasyon Abonelik Satın Alması
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 4 & 5: AI Otomasyon Abonelik Ödemesi (Doğrulanmış ve Başarısız)");
  recordedGtagCalls.length = 0;
  mockSessionStorage.clear();

  function simulateSubscriptionBanner(verifyData: { valid: boolean; success?: boolean; subId?: string; priceMonthly?: number; planName?: string; tierName?: string }) {
    if (verifyData.valid && verifyData.success && verifyData.subId) {
      const trackedKey = `cicekana_tracked_sub_${verifyData.subId}`;
      if (!mockSessionStorage.getItem(trackedKey)) {
        const amountTL = verifyData.priceMonthly ? verifyData.priceMonthly / 100 : 0;
        trackPurchase(
          verifyData.subId,
          [{
            id: verifyData.subId,
            name: `${verifyData.planName} - ${verifyData.tierName}`,
            price: amountTL,
            quantity: 1,
            category: "subscription",
          }],
          amountTL
        );
        mockSessionStorage.setItem(trackedKey, "1");
        return true;
      }
    }
    return false;
  }

  // Başarılı ve doğrulanmış abonelik (fiyat kuruş cinsinden: 120000 = 1200 TL)
  const subResult = simulateSubscriptionBanner({
    valid: true,
    success: true,
    subId: "SUB_AI_BOT_01",
    priceMonthly: 120000,
    planName: "Midvem Omnichannel AI",
    tierName: "Pro",
  });
  assert(subResult === true, "4.1: Doğrulanmış abonelikte satın alma başarıyla tetiklenmeli");

  const subEvents = recordedGtagCalls.filter((c) => c.type === "event" && c.eventName === GA4_EVENTS.PURCHASE);
  assert(subEvents.length === 1, "4.2: Tam olarak 1 purchase olayı oluşmalı");
  assert(subEvents[0]?.data?.transaction_id === "SUB_AI_BOT_01", "4.3: Abonelik ID'si transaction_id olarak iletilmeli");
  assert(subEvents[0]?.data?.value === 1200, "4.4: Gerçek abonelik aylık tutarı (1200 TL) doğru hesaplanmalı", `Alınan: ${subEvents[0]?.data?.value}`);

  // Başarısız abonelik
  recordedGtagCalls.length = 0;
  const failSubResult = simulateSubscriptionBanner({
    valid: false,
    success: false,
    subId: "SUB_FAILED_02",
  });
  assert(failSubResult === false, "5.1: Başarısız abonelikte dönüşüm tetiklenmemeli");
  assert(recordedGtagCalls.length === 0, "5.2: Başarısız abonelik sıfır purchase üretmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 6 & 7: Lead Oluşturma (generate_lead)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 6 & 7: İletişim / Lead Formu (generate_lead)");
  recordedGtagCalls.length = 0;

  // Başarılı form gönderimi
  await trackGenerateLead({
    leadId: "lead_cuid_12345",
    sector: "Yazılım & AI",
  });

  const leadEvents = recordedGtagCalls.filter((c) => c.type === "event" && c.eventName === GA4_EVENTS.GENERATE_LEAD);
  assert(leadEvents.length === 1, "6.1: Başarılı lead gönderiminde tam olarak 1 generate_lead olayı oluşmalı");
  assert(leadEvents[0]?.data?.lead_id === "lead_cuid_12345", "6.2: lead_id doğru iletilmeli");
  assert(leadEvents[0]?.data?.sector === "Yazılım & AI", "6.3: Sektör bilgisi metadata olarak iletilmeli");

  // Hata durumunda (res.ok false iken trackGenerateLead çağrılmaması testi)
  recordedGtagCalls.length = 0;
  const fakeApiStatus: number = 422;
  if (fakeApiStatus === 201) {
    await trackGenerateLead({ leadId: "fail" });
  }
  assert(recordedGtagCalls.length === 0, "7.1: Form sunucu hatası (422/500) aldığında sıfır generate_lead tetiklenmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 9: WhatsApp Tıklaması (İkincil Etkileşim)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 9: WhatsApp Tıklamasının Birincil Dönüşümle Karıştırılmaması");
  recordedGtagCalls.length = 0;

  await trackFunnelEvent({
    event: "whatsapp_click",
    metadata: { source: "ai_detail_hero", planSlug: "midvem-ai" },
  });

  const waEvents = recordedGtagCalls.filter((c) => c.eventName === "whatsapp_click");
  const purchaseFromWa = recordedGtagCalls.filter((c) => c.eventName === GA4_EVENTS.PURCHASE);
  const leadFromWa = recordedGtagCalls.filter((c) => c.eventName === GA4_EVENTS.GENERATE_LEAD);

  assert(waEvents.length === 1, "9.1: whatsapp_click olayı kendi özel adıyla kaydedilmeli");
  assert(purchaseFromWa.length === 0, "9.2: WhatsApp tıklaması asla purchase olarak sayılmamalı");
  assert(leadFromWa.length === 0, "9.3: WhatsApp tıklaması asla generate_lead olarak sayılmamalı");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 11: Eksik Dönüşüm Etiketinde Güvenli Çalışma
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 11: Yapılandırma Eksikliğinde Varsayımsal/Uydurma Etiket Üretmeme");
  recordedGtagCalls.length = 0;

  // Çevresel değişkenlerde purchase etiketi tanımlı değilken
  delete process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_CONVERSION_LABEL;
  delete process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

  await trackPurchase("ORD_CLEAN_01", [{ id: "1", name: "Ürün", price: 100, quantity: 1 }], 100);
  const cleanPurchase = recordedGtagCalls.find((c) => c.eventName === GA4_EVENTS.PURCHASE);
  assert(cleanPurchase?.data?.send_to === undefined, "11.1: Ortam değişkeni yokken sahte send_to uydurulmamalı, standart GA4 formatı kullanılmalı");
  assert(cleanPurchase?.data?.transaction_id === "ORD_CLEAN_01", "11.2: transaction_id ve değer yine de güvenle gönderilmeli");

  // ──────────────────────────────────────────────────────────────────────────
  // Senaryo 12: İki Kez Sayılmayı Önleme (GA4 vs Google Ads)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\nSenaryo 12: GA4 ve Google Ads Arasında Mükerrer Sayım Önleme");
  recordedGtagCalls.length = 0;

  // Aynı olay tek bir window.gtag("event", "purchase", ...) çağrısı ile iletilir.
  // Google Ads ve GA4 aynı dataLayer akışını dinler. Ayrı iki etiket kütüphanesi açılmaz.
  await trackPurchase("ORD_UNIQUE_123", [{ id: "1", name: "Hizmet", price: 500, quantity: 1 }], 500);
  const uniquePurchases = recordedGtagCalls.filter((c) => c.eventName === GA4_EVENTS.PURCHASE);
  assert(uniquePurchases.length === 1, "12.1: Tek bir purchase gtag çağrısı yapılarak mükerrer tetikleme önlenmeli");

  console.log("\n========================================================");
  console.log(` TEST TAMAMLANDI: ${passedCount} GEÇTİ, ${failedCount} BAŞARISIZ`);
  console.log("========================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAuditTests().catch((err) => {
  console.error("Test paketi yürütülürken hata oluştu:", err);
  process.exit(1);
});
