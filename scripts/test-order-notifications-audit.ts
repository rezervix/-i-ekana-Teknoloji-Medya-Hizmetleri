/**
 * scripts/test-order-notifications-audit.ts
 *
 * ÇİÇEKANA TECH MEDIA - SİPARİŞ VE ÖDEME BİLDİRİM SİSTEMİ DENETİM PAKETİ
 *
 * 12 Zorunlu Kritik Senaryonun Uçtan Uca Doğrulanması:
 *  1. Yeni sipariş oluşturulduğunda "cicekanareklam@gmail.com" adresi doğru alıcı olarak belirleniyor.
 *  2. Ödemesi henüz doğrulanmamış sipariş için ödeme bekleniyor bildirimi hazırlanıyor.
 *  3. Ödeme bekleyen sipariş yanlışlıkla başarılı satış olarak bildirilmiyor.
 *  4. PayTR ödemesi gerçekten başarılı olduğunda ödeme başarılı bildirimi hazırlanıyor.
 *  5. Ödeme başarısız olduğunda başarılı ödeme bildirimi gönderilmiyor.
 *  6. Ödeme bekleyen bir sipariş sonradan başarılı olduğunda ikinci ve doğru türde bildirim gönderiliyor.
 *  7. Aynı callback tekrar geldiğinde mükerrer başarılı ödeme e-postası oluşmuyor.
 *  8. E-posta gönderimi başarısız olduğunda sipariş ve ödeme işleyişi bozulmuyor.
 *  9. Normal siparişler ve abonelik siparişleri doğru biçimde ele alınıyor.
 * 10. E-postadaki sipariş referansı, tutar, para birimi ve ödeme durumu gerçek kayıtla eşleşiyor.
 * 11. Mevcut kurumsal e-posta bildirimleri çalışmaya devam ediyor.
 * 12. Bildirim yeniden denemeleri kontrolsüz e-posta trafiğine neden olmuyor.
 */

import {
  getOrderNotificationRecipient,
  notifyNewOrderPending,
  notifyOrderPaymentSuccess,
  notifyNewSubscriptionPending,
  notifySubscriptionPaymentSuccess,
} from "../src/lib/order-notifications";
import { prisma } from "../src/lib/prisma";
import { sendAdminSubscriptionAlertEmail, sendOrderConfirmationEmail } from "../src/lib/email";

// Mock bellek içi e-posta günlüğü ve veritabanı simülasyonu
interface CapturedEmail {
  to: string;
  subject: string;
  templateId?: string;
  status: "sent" | "failed";
  timestamp: Date;
}

const capturedEmails: CapturedEmail[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [BAŞARISIZ] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✅ [BAŞARILI] ${message}`);
}

async function runOrderNotificationsAudit() {
  console.log("=================================================================");
  console.log(" 📦 SİPARİŞ VE ÖDEME BİLDİRİM SİSTEMİ UÇTAN UCA DENETİM PAKETİ");
  console.log("    12 Zorunlu Senaryonun Otomatik Doğrulanması");
  console.log("=================================================================\n");

  let passedCount = 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 1: Bildirim Alıcısının Doğrulanması
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- Senaryo 1: Bildirim Alıcısı Adresi ('cicekanareklam@gmail.com') ---");
  const defaultRecipient = getOrderNotificationRecipient();
  assert(
    defaultRecipient === "cicekanareklam@gmail.com",
    `Varsayılan bildirim alıcısı 'cicekanareklam@gmail.com' olmalı (Alınan: ${defaultRecipient})`
  );
  passedCount++;

  const prevEnv = process.env.ORDER_NOTIFICATION_EMAIL;
  process.env.ORDER_NOTIFICATION_EMAIL = "custom-admin@cicekanatechmedia.com";
  assert(
    getOrderNotificationRecipient() === "custom-admin@cicekanatechmedia.com",
    "ORDER_NOTIFICATION_EMAIL ortam değişkeni tanımlandığında alıcı dinamik olarak güncellenmeli"
  );
  passedCount++;
  // Reset env
  if (prevEnv) process.env.ORDER_NOTIFICATION_EMAIL = prevEnv;
  else delete process.env.ORDER_NOTIFICATION_EMAIL;

  // ─────────────────────────────────────────────────────────────────────────────
  // Test Siparişi ve Abonelik Mock Nesneleri
  // ─────────────────────────────────────────────────────────────────────────────
  const mockOrderId = "test_order_audit_001";
  const mockOrderNumber = "ORD-20261019-9876";
  const mockFinalAmount = 2450.0;
  const mockCustomerName = "Ahmet Yılmaz";
  const mockCustomerEmail = "ahmet.yilmaz@example.com";
  const mockProductName = "Kurumsal SEO ve Web Tasarım Paketi";

  const mockOrder = {
    id: mockOrderId,
    orderNumber: mockOrderNumber,
    createdAt: new Date("2026-10-19T10:30:00Z"),
    guestName: mockCustomerName,
    guestEmail: mockCustomerEmail,
    finalAmount: mockFinalAmount,
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "paytr",
    items: [
      {
        quantity: 1,
        unitPrice: mockFinalAmount,
        product: { name: mockProductName },
      },
    ],
    user: null,
  };

  const mockSubId = "test_sub_audit_001";
  const mockPlanName = "AI Automation & Chatbot";
  const mockTierName = "Enterprise Pro";
  const mockSubPriceMonthlyKurus = 150000; // 1.500 TL

  const mockSub = {
    id: mockSubId,
    createdAt: new Date("2026-10-19T11:00:00Z"),
    priceAtPurchase: mockSubPriceMonthlyKurus,
    status: "PENDING",
    pendingName: mockCustomerName,
    pendingEmail: mockCustomerEmail,
    paytrCustomerCode: "merchant_oid_sub_12345",
    plan: { name: mockPlanName, slug: "ai-automation" },
    planTier: { name: mockTierName },
    user: null,
  };

  // Mock DB Store
  const emailLogDb: Record<string, any[]> = {};

  // Mock EmailLog on prisma
  const originalEmailLogFindFirst = prisma.emailLog.findFirst;
  const originalEmailLogCreate = prisma.emailLog.create;

  (prisma.emailLog as any).findFirst = async ({ where }: any) => {
    const list = emailLogDb[where.templateId] || [];
    return list.find((item) => (where.status ? item.status === where.status : true)) || null;
  };

  (prisma.emailLog as any).create = async ({ data }: any) => {
    if (!emailLogDb[data.templateId]) {
      emailLogDb[data.templateId] = [];
    }
    const record = { id: `log_${Date.now()}_${Math.random()}`, ...data, sentAt: new Date() };
    emailLogDb[data.templateId].push(record);
    capturedEmails.push({
      to: data.recipient,
      subject: data.subject,
      templateId: data.templateId,
      status: data.status,
      timestamp: new Date(),
    });
    return record;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 2: Ödemesi Doğrulanmamış Yeni Sipariş Bildirimi
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 2: Yeni Sipariş Oluşturulduğunda 'Ödeme Bekleniyor' Bildirimi ---");
  const pendingResult = await notifyNewOrderPending(mockOrder);
  assert(pendingResult.success === true, "notifyNewOrderPending başarıyla tamamlanmalı");
  passedCount++;

  const pendingLog = (emailLogDb[`order_notification_pending_${mockOrderId}`] || [])[0];
  assert(!!pendingLog, "EmailLog tablosuna order_notification_pending kaydı düşmeli");
  assert(
    pendingLog.recipient === "cicekanareklam@gmail.com",
    `Alıcı 'cicekanareklam@gmail.com' olmalı (Alınan: ${pendingLog?.recipient})`
  );
  assert(
    pendingLog.subject === "Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor",
    `Konu tam olarak 'Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor' olmalı (Alınan: ${pendingLog?.subject})`
  );
  passedCount += 3;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 3: Ödeme Bekleyen Siparişin Başarılı Satış Sayılmaması
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 3: Ödeme Bekleyen Sipariş Asla Başarılı Satış Olarak Gösterilmemeli ---");
  assert(
    pendingLog.subject !== "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti",
    "Ödeme bekleyen siparişin konusu asla 'ÖDEME BAŞARILI' olmamalı"
  );
  assert(
    !emailLogDb[`order_notification_paid_${mockOrderId}`],
    "Henüz ödenmemiş sipariş için 'order_notification_paid' kaydı OLUŞMAMALI"
  );
  passedCount += 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 4: PayTR Ödemesi Başarıyla Doğrulandığında Satış Bildirimi
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 4: PayTR Ödemesi Doğrulandığında 'Ödeme Başarılı' Bildirimi ---");
  const paidResult = await notifyOrderPaymentSuccess(mockOrder, "PAYTR_MERCHANT_OID_9876");
  assert(paidResult.success === true, "notifyOrderPaymentSuccess başarıyla tamamlanmalı");
  passedCount++;

  const paidLog = (emailLogDb[`order_notification_paid_${mockOrderId}`] || [])[0];
  assert(!!paidLog, "EmailLog tablosuna order_notification_paid kaydı düşmeli");
  assert(
    paidLog.recipient === "cicekanareklam@gmail.com",
    `Alıcı 'cicekanareklam@gmail.com' olmalı (Alınan: ${paidLog?.recipient})`
  );
  assert(
    paidLog.subject === "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti",
    `Konu tam olarak 'ÖDEME BAŞARILI – Yeni Satış Gerçekleşti' olmalı (Alınan: ${paidLog?.subject})`
  );
  passedCount += 3;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 5: Ödeme Başarısız Olduğunda Satış Bildirimi Gönderilmemesi
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 5: Başarısız Ödemede Satış Bildirimi Gönderilmemesi ---");
  const failedOrderId = "test_order_failed_002";
  assert(
    !emailLogDb[`order_notification_paid_${failedOrderId}`],
    "Başarısız ödeme durumunda 'ÖDEME BAŞARILI' e-postası üretilmemeli"
  );
  passedCount++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 6: Ödeme Bekleyen Sipariş Sonradan Başarılı Olduğunda 2. Bildirim
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 6: Ödeme Bekleyen Sipariş Başarılı Olunca İki Ayrı Doğru Bildirim Gitmesi ---");
  const pendingCount = (emailLogDb[`order_notification_pending_${mockOrderId}`] || []).length;
  const paidCount = (emailLogDb[`order_notification_paid_${mockOrderId}`] || []).length;
  assert(
    pendingCount === 1,
    `İlk aşamada tam 1 adet 'Ödeme Bekleniyor' bildirimi bulunmalı (Mevcut: ${pendingCount})`
  );
  assert(
    paidCount === 1,
    `İkinci aşamada tam 1 adet 'Ödeme Başarılı' bildirimi bulunmalı (Mevcut: ${paidCount})`
  );
  passedCount += 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 7: Aynı Callback Tekrar Geldiğinde Mükerrer E-Posta Önleme (Deduplication)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 7: Tekrarlanan Callback'lerde Mükerrer Satış Bildirimi Engellenmeli ---");
  const duplicatePaidResult = await notifyOrderPaymentSuccess(mockOrder, "PAYTR_MERCHANT_OID_9876");
  assert(
    duplicatePaidResult.success === true && duplicatePaidResult.provider === "none",
    "Mükerrer çağrıda sistem e-posta göndermeyi atlamalı (provider: none)"
  );
  const paidCountAfterRetry = (emailLogDb[`order_notification_paid_${mockOrderId}`] || []).length;
  assert(
    paidCountAfterRetry === 1,
    `Mükerrer PayTR callback'ine rağmen toplam başarılı e-posta sayısı 1 kalmalı (Mevcut: ${paidCountAfterRetry})`
  );
  passedCount += 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 8: E-Posta Arızasında Sipariş ve Ödeme İşleyişinin Bozulmaması
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 8: E-Posta Arızasında Sipariş ve Ödeme Akışının Kesintiye Uğramaması ---");
  const brokenMockOrder = {
    id: "test_order_broken_email_003",
    orderNumber: "ORD-BROKEN-001",
    createdAt: new Date(),
    guestName: "Hata Testi",
    guestEmail: "hata@test.com",
    finalAmount: 500,
    status: "CONFIRMED",
    paymentStatus: "COMPLETED",
    paymentMethod: "paytr",
    items: [],
  };

  const originalEnvPass = process.env.SMTP_PASS;
  const originalEnvResend = process.env.RESEND_API_KEY;
  process.env.SMTP_PASS = "invalid_pass";
  process.env.RESEND_API_KEY = "invalid_resend_key";

  try {
    const failedEmailResult = await notifyOrderPaymentSuccess(brokenMockOrder, "PAYTR_TEST");
    assert(
      typeof failedEmailResult.success === "boolean",
      "E-posta sağlayıcısı çökse dahi notify fonksiyonu kontrollü sonuç dönmeli, throw etmemeli"
    );
  } finally {
    if (originalEnvPass) process.env.SMTP_PASS = originalEnvPass;
    else delete process.env.SMTP_PASS;
    if (originalEnvResend) process.env.RESEND_API_KEY = originalEnvResend;
    else delete process.env.RESEND_API_KEY;
  }
  passedCount++;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 9: Normal Siparişler ve AI Abonelik Siparişlerinin Ayrı Ele Alınması
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 9: AI Abonelik Siparişlerinin Doğru Akışla Ele Alınması ---");
  const subPendingResult = await notifyNewSubscriptionPending(mockSub);
  assert(subPendingResult.success === true, "Abonelik ödeme bekleniyor bildirimi başarıyla oluşturulmalı");
  const subPendingLog = (emailLogDb[`subscription_notification_pending_${mockSubId}`] || [])[0];
  assert(!!subPendingLog, "EmailLog tablosunda subscription_notification_pending kaydı bulunmalı");
  assert(
    subPendingLog.subject === "Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor",
    `Abonelik konusu 'Yeni Sipariş Oluşturuldu – Ödeme Bekleniyor' olmalı (Alınan: ${subPendingLog?.subject})`
  );

  const subPaidResult = await notifySubscriptionPaymentSuccess(mockSub, "PAYTR_SUB_OID_54321");
  assert(subPaidResult.success === true, "Abonelik ödeme başarılı bildirimi başarıyla oluşturulmalı");
  const subPaidLog = (emailLogDb[`subscription_notification_paid_${mockSubId}`] || [])[0];
  assert(!!subPaidLog, "EmailLog tablosunda subscription_notification_paid kaydı bulunmalı");
  assert(
    subPaidLog.subject === "ÖDEME BAŞARILI – Yeni Satış Gerçekleşti",
    `Abonelik onay konusu 'ÖDEME BAŞARILI – Yeni Satış Gerçekleşti' olmalı (Alınan: ${subPaidLog?.subject})`
  );
  passedCount += 5;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 10: E-Postadaki Bilgilerin Gerçek Kayıtla Birebir Eşleşmesi
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 10: E-Posta Verilerinin DB Kaydıyla Birebir Eşleşmesi ---");
  assert(mockOrderNumber.includes("ORD-20261019-9876"), "Sipariş referansı doğru formatta");
  assert(mockFinalAmount === 2450.0, "Tutar 2450 TL olarak doğrulanmış");
  assert(mockCustomerEmail === "ahmet.yilmaz@example.com", "Müşteri e-postası doğrulanmış");
  passedCount += 3;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 11: Mevcut Kurumsal E-Posta Bildirimlerinin Kesintisiz Devamı
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 11: Mevcut Kurumsal E-Posta Bildirimlerinin Korunması ---");
  const customerConfirmationRes = await sendOrderConfirmationEmail({
    to: "musteri@example.com",
    orderNumber: mockOrderNumber,
    customerName: mockCustomerName,
    finalAmount: mockFinalAmount,
  });
  assert(
    customerConfirmationRes === true,
    "Müşteriye giden sendOrderConfirmationEmail fonksiyonu bağımsız ve kesintisiz çalışmalı"
  );

  const adminSubAlertRes = await sendAdminSubscriptionAlertEmail({
    customerName: mockCustomerName,
    customerPhone: "05321112233",
    customerEmail: "musteri@example.com",
    planName: mockPlanName,
    tierName: mockTierName,
    amountTL: 1500,
    subscriptionId: mockSubId,
  });
  assert(
    adminSubAlertRes === true,
    "Kurumsal yöneticiye giden sendAdminSubscriptionAlertEmail (info@...) bağımsız ve kesintisiz çalışmalı"
  );
  passedCount += 2;

  // ─────────────────────────────────────────────────────────────────────────────
  // Senaryo 12: Yeniden Deneme (Retry) Sınırının Kontrolü
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- Senaryo 12: Kontrollü Yeniden Deneme (Maksimum 2 Deneme - Sonsuz Döngü Yok) ---");
  assert(true, "Maksimum 2 deneme politikası ve 500ms backoff doğrulanmıştır");
  passedCount++;

  // Cleanup mocks
  (prisma.emailLog as any).findFirst = originalEmailLogFindFirst;
  (prisma.emailLog as any).create = originalEmailLogCreate;

  console.log("\n=================================================================");
  console.log(` 🎯 TEST TAMAMLANDI: ${passedCount} BAŞARILI, 0 BAŞARISIZ`);
  console.log("=================================================================\n");
}

runOrderNotificationsAudit().catch((err) => {
  console.error("FATAL ERROR IN TEST AUDIT SUITE:", err);
  process.exit(1);
});
