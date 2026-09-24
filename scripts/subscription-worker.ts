/**
 * Subscription Worker - Otomatik Tahsilat ve Yönetim
 * 
 * Bu script şu işlemleri yapar:
 * 1. Vadesi gelen abonelikler için tahsilat yapar
 * 2. Yenileme hatırlatmaları gönderir
 * 3. Süresi geçmiş PAST_DUE aboneliklerini iptal eder
 * 
 * Kullanım: npx tsx scripts/subscription-worker.ts
 * 
 * Cron job olarak çalıştırmak için:
 * node-cron veya PM2 cron kullanılabilir
 */

import { runRecurringBilling, sendRenewalReminders, cancelPastDueAfterGrace } from "../src/lib/cron/runBilling";
import { logger } from "../src/lib/logger";

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("SUBSCRIPTION WORKER - OTOMATİK TAHSLATAT SİSTEMİ");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const startTime = Date.now();

  try {
    // 1. Yenileme Hatırlatmaları
    console.log("📧 Adım 1: Yenileme hatırlatmaları gönderiliyor...");
    const reminderResult = await sendRenewalReminders();
    console.log(`  ✅ ${reminderResult.count} kullanıcıya hatırlatma gönderildi\n`);

    // 2. Otomatik Tahsilat
    console.log("💳 Adım 2: Otomatik tahsilat yapılıyor...");
    const billingResult = await runRecurringBilling(false);
    console.log(`  ✅ ${billingResult.successCount} başarılı, ${billingResult.failedCount} başarısız`);
    console.log(`  📊 Toplam işlenen: ${billingResult.processed}\n`);

    if (billingResult.failedDetails.length > 0) {
      console.log("  ⚠️ Başarısız tahsilatlar:");
      billingResult.failedDetails.forEach((detail) => {
        console.log(`    - ${detail.userEmail}: ${detail.errorMessageTr}`);
      });
      console.log();
    }

    // 3. Süresi Geçmiş İptaller
    console.log("🗑️  Adım 3: Süresi geçmiş abonelikler iptal ediliyor...");
    const cancelResult = await cancelPastDueAfterGrace();
    console.log(`  ✅ ${cancelResult.canceledCount} abonelik iptal edildi\n`);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ TÜM İŞLEMLER TAMAMLANDI (${duration} saniye)`);
    console.log("═══════════════════════════════════════════════════════════════");

    process.exit(0);
  } catch (error) {
    console.error("❌ KRİTİK HATA:", error);
    logger.error({
      event: "SUBSCRIPTION_WORKER_FATAL_ERROR",
      details: { error: String(error) },
    });
    process.exit(1);
  }
}

// Eğer doğrudan çalıştırılıyorsa
if (require.main === module) {
  main();
}

export { main };
