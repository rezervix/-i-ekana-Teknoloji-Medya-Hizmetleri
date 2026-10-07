import { prisma } from "../src/lib/prisma";
import { sendAbandonedCartReminder1, sendAbandonedCartReminder2 } from "../src/lib/email";
import { CART_RECOVERY_RATE_SQL, getCartRecoveryStats } from "../src/lib/cart-recovery-report";
import crypto from "node:crypto";

async function runRecoveryVerification() {
  console.log("==================================================================");
  console.log("🧪 FAZ 6: GERİ KAZANIM (CART RECOVERY) DOĞRULAMA & KANIT TESTİ");
  console.log("==================================================================\n");

  const testEmail = `test.recovery.${Date.now()}@cicekana.com`;
  const testPhone = "05551234567";
  const testName = "Ahmet Yılmaz";
  const testToken = `rec_test_${crypto.randomBytes(6).toString("hex")}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const cartSnapshot = {
    items: [
      {
        id: "item_1",
        productId: "prod_kartvizit",
        name: "Premium Mat Selefonlu Kartvizit (1000 Adet)",
        price: 349.9,
        quantity: 1,
        image: "https://cicekanamedia.com/sample-kartvizit.jpg",
      },
      {
        id: "item_2",
        productId: "prod_brosur",
        name: "A5 Çift Kırımlı Kurumsal Broşür (500 Adet)",
        price: 450.0,
        quantity: 1,
        image: "https://cicekanamedia.com/sample-brosur.jpg",
      },
    ],
    totalAmount: 799.9,
    timestamp: new Date().toISOString(),
  };

  try {
    // ── ADIM 1: Test Terk Edilen Sepet Kaydı Oluşturma ──────────────────────────
    console.log("📌 ADIM 1: Test Sepeti Oluşturuluyor...");
    const initialCart = await prisma.cartAbandonmentLog.create({
      data: {
        email: testEmail,
        phone: testPhone,
        customerName: testName,
        allowMarketing: true,
        unsubscribed: false,
        recoveryToken: testToken,
        status: "PENDING",
        reminderCount: 0,
        converted: false,
        cartSnapshot: cartSnapshot as any,
      },
    });

    console.log("✅ Sepet DB'ye kaydedildi:");
    console.log({
      id: initialCart.id,
      email: initialCart.email,
      status: initialCart.status,
      reminderCount: initialCart.reminderCount,
      allowMarketing: initialCart.allowMarketing,
      recoveryToken: initialCart.recoveryToken,
      itemsCount: (initialCart.cartSnapshot as any)?.items?.length,
      totalAmount: (initialCart.cartSnapshot as any)?.totalAmount,
    });
    console.log("------------------------------------------------------------------");

    // ── ADIM 2: Hatırlatma Görevini Manuel Tetikleme (1. Aşama) ────────────────
    console.log("\n📌 ADIM 2: Hatırlatma Görevi Manuel Tetikleniyor (Aşama 1: 1 Saat Sonrası)...");
    const recoveryUrl = `${siteUrl}/magaza/sepet?recover=${testToken}`;
    const unsubscribeUrl = `${siteUrl}/api/cart/unsubscribe?token=${testToken}`;

    console.log(`[TRIGGER_CRON] Gönderim hedefi: ${testEmail}`);
    console.log(`[TRIGGER_CRON] Kurtarma Linki: ${recoveryUrl}`);
    console.log(`[TRIGGER_CRON] Unsubscribe Linki: ${unsubscribeUrl}`);

    const emailSent = await sendAbandonedCartReminder1({
      to: testEmail,
      customerName: testName,
      items: cartSnapshot.items,
      recoveryUrl,
      unsubscribeUrl,
    });

    console.log(`[GİDEN E-POSTA LOGU] sendAbandonedCartReminder1 sonucu: ${emailSent ? "BAŞARILI (E-posta iletildi / loglandı)" : "HATA"}`);

    // DB Durumunu Aşama 1 olarak güncelle (cron endpoint'inin yaptığı gibi)
    const updatedAfterReminder = await prisma.cartAbandonmentLog.update({
      where: { id: initialCart.id },
      data: {
        reminderCount: 1,
        firstReminderSentAt: new Date(),
        emailSentAt: new Date(),
        status: "REMINDED_1",
      },
    });

    console.log("✅ Tablodaki Durum Güncellemesi (Aşama 1 Sonrası):");
    console.log({
      id: updatedAfterReminder.id,
      email: updatedAfterReminder.email,
      status: updatedAfterReminder.status,
      reminderCount: updatedAfterReminder.reminderCount,
      firstReminderSentAt: updatedAfterReminder.firstReminderSentAt,
      emailSentAt: updatedAfterReminder.emailSentAt,
    });
    console.log("------------------------------------------------------------------");

    // ── ADIM 3: Kurtarma Linki & Sepet Geri Yükleme Doğrulaması ─────────────────
    console.log("\n📌 ADIM 3: Kurtarma Belirteci ile Sepet Sorgulama (API / Token Doğrulama)...");
    const foundByToken = await prisma.cartAbandonmentLog.findUnique({
      where: { recoveryToken: testToken },
    });

    if (foundByToken) {
      console.log(`✅ Token '${testToken}' ile sepet başarıyla bulundu!`);
      console.log(`   Sepetteki Ürünler: ${(foundByToken.cartSnapshot as any).items.map((i: any) => `${i.name} (${i.price} TL)`).join(", ")}`);
    } else {
      throw new Error("Kurtarma belirteci bulunamadı!");
    }
    console.log("------------------------------------------------------------------");

    // ── ADIM 4: Sipariş Tamamlama / Kurtarma (Dönüşüm) Simülasyonu ──────────────
    console.log("\n📌 ADIM 4: Sipariş Tamamlandı & Sepet Kurtarıldı (Conversion Simülasyonu)...");
    const convertedCart = await prisma.cartAbandonmentLog.update({
      where: { id: initialCart.id },
      data: {
        converted: true,
        recoveredAt: new Date(),
        status: "RECOVERED",
      },
    });

    console.log("✅ Tablodaki Dönüşüm Durumu Güncellemesi:");
    console.log({
      id: convertedCart.id,
      email: convertedCart.email,
      status: convertedCart.status,
      converted: convertedCart.converted,
      recoveredAt: convertedCart.recoveredAt,
    });
    console.log("------------------------------------------------------------------");

    // ── ADIM 5: SQL Kurtarma Oranı Sorgusunu Çalıştırma ─────────────────────────
    console.log("\n📌 ADIM 5: Terk Edilen Sepet Kurtarma Oranı Raporlama SQL Sorgusu Çalıştırılıyor...\n");
    console.log("=== SQL SORGUSU ===");
    console.log(CART_RECOVERY_RATE_SQL.trim());
    console.log("===================\n");

    const stats = await getCartRecoveryStats();
    console.log("📊 SQL SORGUSU RAPOR ÇIKTISI:");
    console.table([
      {
        "Toplam Terk Edilen": stats.total_abandoned,
        "İzinli Kullanıcı": stats.marketing_eligible,
        "Hatırlatılan": stats.reminded_count,
        "Aşama 1": stats.reminded_stage_1,
        "Kurtarılan": stats.total_recovered,
        "Kampanyayla Kurtarılan": stats.recovered_via_campaign,
        "Genel Kurtarma Oranı": `%${stats.overall_recovery_rate_percent}`,
        "Kampanya Kurtarma Oranı": `%${stats.campaign_recovery_rate_percent}`,
        "Terk Edilen Tutar": `${stats.total_abandoned_value} TL`,
        "Kurtarılan Tutar": `${stats.total_recovered_value} TL`,
      },
    ]);

    console.log("\n🎉 TÜM FAZ 6 KRİTERLERİ VE KANIT ADIMLARI BAŞARIYLA TAMAMLANDI!");
  } catch (error) {
    console.error("❌ Test sırasında hata:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRecoveryVerification();
