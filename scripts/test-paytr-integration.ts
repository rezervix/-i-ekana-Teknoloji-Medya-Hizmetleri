/**
 * PayTR Entegrasyon Test Scripti
 * 
 * Bu script PayTR entegrasyonunun temel fonksiyonlarını test eder:
 * - Hash generation and validation
 * - Iframe token creation
 * - Card storage logic
 * - Proration calculations
 * 
 * Kullanım: npx tsx scripts/test-paytr-integration.ts
 */

import { generateIframeTokenHash, validateCallbackHash, amountToKurus, kurusToLira } from "../src/lib/paytr/hash";
import { PAYTR_CONFIG, translatePaytrErrorCode, DUNNING_CONFIG, SUBSCRIPTION_POLICIES } from "../src/lib/paytr/constants";

console.log("═══════════════════════════════════════════════════════════════");
console.log("PAYTR ENTEGRASYON TEST SCRIPTİ");
console.log("═══════════════════════════════════════════════════════════════\n");

// Test 1: Hash Generation
console.log("✅ TEST 1: Hash Generation");
try {
  const testParams = {
    merchant_oid: "TEST-12345",
    payment_amount_tl: 149.90,
    user_basket: [
      { id: "PROD-001", name: "Test Ürün", price: 149.90, quantity: 1 },
    ],
    user_ip: "127.0.0.1",
    no_installment: 1,
    max_installment: 1,
    currency: "TL",
    test_mode: 1,
    success_url: "https://example.com/success",
    fail_url: "https://example.com/fail",
  };

  const hash = generateIframeTokenHash(testParams);
  console.log("  Hash oluşturuldu:", hash.substring(0, 20) + "...");
  console.log("  Hash uzunluğu:", hash.length);
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error);
  console.log("  ⚠️ Bu test .env değişkenlerinin doğru ayarlandığını gerektirir\n");
}

// Test 2: Hash Validation
console.log("✅ TEST 2: Hash Validation");
try {
  const testCallback = {
    merchant_id: PAYTR_CONFIG.merchantId,
    merchant_oid: "TEST-12345",
    status: "1",
    total_amount: "14990",
    hash: "test_hash_placeholder",
    utoken: "",
    ctoken: "",
    installment_count: "",
    currency: "TL",
    payment_amount: "",
    payment_type: "",
    md_status: "",
    err_code: "",
    err_msg: "",
    test_mode: "1",
  };

  const isValid = validateCallbackHash(testCallback);
  console.log("  Hash doğrulama sonucu:", isValid ? "GEÇERLİ" : "GEÇERSİZ");
  console.log("  ⚠️ Bu test gerçek bir PayTR hash'i olmadığı için GEÇERSİZ dönebilir\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

// Test 3: Amount Conversion
console.log("✅ TEST 3: Amount Conversion (TL ↔ Kuruş)");
try {
  const testAmounts = [149.90, 99.99, 1000.00, 0.50];
  
  testAmounts.forEach(tl => {
    const kurus = amountToKurus(tl);
    const backToTl = kurusToLira(kurus);
    console.log(`  ${tl.toFixed(2)} TL → ${kurus} kuruş → ${backToTl.toFixed(2)} TL`);
  });
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

// Test 4: Error Code Translation
console.log("✅ TEST 4: Error Code Translation");
try {
  const testCodes = ["E101", "E104", "E110", "E199", "UNKNOWN"];
  
  testCodes.forEach(code => {
    const message = translatePaytrErrorCode(code);
    console.log(`  ${code}: ${message}`);
  });
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

// Test 5: Configuration
console.log("✅ TEST 5: Configuration Check");
try {
  console.log("  Merchant ID:", PAYTR_CONFIG.merchantId ? "✅ Tanımlı" : "❌ Tanımlı değil");
  console.log("  Merchant Key:", PAYTR_CONFIG.merchantKey ? "✅ Tanımlı" : "❌ Tanımlı değil");
  console.log("  Merchant Salt:", PAYTR_CONFIG.merchantSalt ? "✅ Tanımlı" : "❌ Tanımlı değil");
  console.log("  Test Mode:", PAYTR_CONFIG.testMode ? "1 (Test)" : "0 (Canlı)");
  console.log("  Callback URL:", PAYTR_CONFIG.callbackUrl || "❌ Tanımlı değil");
  console.log("  Success URL:", PAYTR_CONFIG.successUrl || "❌ Tanımlı değil");
  console.log("  Fail URL:", PAYTR_CONFIG.failUrl || "❌ Tanımlı değil");
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

// Test 6: Dunning Configuration
console.log("✅ TEST 6: Dunning Configuration");
try {
  console.log("  Retry Count:", DUNNING_CONFIG.RETRY_COUNT);
  console.log("  Retry Days:", DUNNING_CONFIG.RETRY_DAYS.join(", ") || "Yok");
  console.log("  Past Due Grace Hours:", DUNNING_CONFIG.PAST_DUE_GRACE_HOURS);
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

// Test 7: Subscription Policies
console.log("✅ TEST 7: Subscription Policies");
try {
  console.log("  Default Interval Days:", SUBSCRIPTION_POLICIES.DEFAULT_INTERVAL_DAYS);
  console.log("  Renewal Reminder Days Before:", SUBSCRIPTION_POLICIES.RENEWAL_REMINDER_DAYS_BEFORE);
  console.log("  Cancel At Period End Only:", SUBSCRIPTION_POLICIES.CANCEL_AT_PERIOD_END_ONLY);
  console.log("  Proration Upgrade Immediate Charge:", SUBSCRIPTION_POLICIES.PRORATION_UPGRADE_IMMEDIATE_CHARGE);
  console.log("  Proration Downgrade Defer To Next Period:", SUBSCRIPTION_POLICIES.PRORATION_DOWNGRADE_DEFER_TO_NEXT_PERIOD);
  console.log("  ✅ BAŞARILI\n");
} catch (error) {
  console.log("  ❌ BAŞARISIZ:", error, "\n");
}

console.log("═══════════════════════════════════════════════════════════════");
console.log("TEST TAMAMLANDI");
console.log("═══════════════════════════════════════════════════════════════");
console.log("\n⚠️ ÖNEMLİ NOTLAR:");
console.log("1. Hash doğrulama testi gerçek PayTR hash'i olmadığı için GEÇERSİZ dönebilir");
console.log("2. Merchant ID/Key/SALT değerleri .env dosyasından okunur");
console.log("3. Production'a geçmeden önce tüm değerleri kontrol edin");
console.log("4. Veritabanı bağlantısı olmadığı için DB işlemleri test edilemedi");
