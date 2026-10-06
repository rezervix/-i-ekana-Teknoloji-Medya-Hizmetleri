import { calculateCartTotals, AVAILABLE_COUPONS } from "../src/lib/cart-calculator";
import { STORE_DELIVERY_CONFIG } from "../src/config/store.config";

interface TestCase {
  name: string;
  run: () => { passed: boolean; message: string; details?: any };
}

console.log("=================================================");
console.log("🧪 ÇİÇEKANA MAĞAZA SEPET HESAPLAMA BİRİM TESTLERİ");
console.log(`📌 Ücretsiz Kargo Eşiği: ${STORE_DELIVERY_CONFIG.freeShippingThreshold} TL`);
console.log(`📌 Standart Kargo Ücreti: ${STORE_DELIVERY_CONFIG.standardShippingFee} TL`);
console.log("=================================================\n");

const tests: TestCase[] = [
  // 1. EŞİK ALTI TESTİ
  {
    name: "1. EŞİK ALTI (150 TL < 350 TL): Kargo ücreti eklenmeli, kalan tutar doğru hesaplanmalı",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 150, quantity: 1 }],
      });

      const passSubtotal = result.subtotal === 150;
      const passShipping = result.shippingFee === 49.9;
      const passNotFree = result.isFreeShipping === false;
      const passRemaining = result.remainingForFreeShipping === 200;
      const passGrandTotal = result.grandTotal === 199.9;

      const passed = passSubtotal && passShipping && passNotFree && passRemaining && passGrandTotal;
      return {
        passed,
        message: passed
          ? `✓ Ara Toplam: ${result.subtotal} TL, Kargo: ${result.shippingFee} TL, Kalan: ${result.remainingForFreeShipping} TL, Genel Toplam: ${result.grandTotal} TL`
          : `✗ Beklenen değerler uyuşmadı: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 2. TAM EŞİK TESTİ
  {
    name: "2. TAM EŞİK (350 TL === 350 TL): Kargo bedava olmalı, kalan tutar 0 olmalı",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 350, quantity: 1 }],
      });

      const passSubtotal = result.subtotal === 350;
      const passShipping = result.shippingFee === 0;
      const passFree = Boolean(result.isFreeShipping);
      const passRemaining = result.remainingForFreeShipping === 0;
      const passGrandTotal = result.grandTotal === 350;

      const passed = passSubtotal && passShipping && passFree && passRemaining && passGrandTotal;
      return {
        passed,
        message: passed
          ? `✓ Ara Toplam: ${result.subtotal} TL, Kargo: 0 TL (Ücretsiz), Kalan: 0 TL, Genel Toplam: ${result.grandTotal} TL`
          : `✗ Beklenen değerler uyuşmadı: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 3. EŞİK ÜSTÜ TESTİ
  {
    name: "3. EŞİK ÜSTÜ (500 TL > 350 TL): Kargo bedava olmalı, genel toplam ara toplama eşit olmalı",
    run: () => {
      const result = calculateCartTotals({
        items: [
          { price: 200, quantity: 2 }, // 400 TL
          { price: 100, quantity: 1 }, // 100 TL
        ],
      });

      const passSubtotal = result.subtotal === 500;
      const passShipping = result.shippingFee === 0;
      const passFree = Boolean(result.isFreeShipping);
      const passRemaining = result.remainingForFreeShipping === 0;
      const passGrandTotal = result.grandTotal === 500;

      const passed = passSubtotal && passShipping && passFree && passRemaining && passGrandTotal;
      return {
        passed,
        message: passed
          ? `✓ Ara Toplam: ${result.subtotal} TL, Kargo: 0 TL (Ücretsiz), Genel Toplam: ${result.grandTotal} TL`
          : `✗ Beklenen değerler uyuşmadı: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 4. KUPON: YÜZDESEL İNDİRİM (%10)
  {
    name: "4. KUPON - YÜZDESEL (HOSGELDIN10: 400 TL sepet için %10 = 40 TL indirim)",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 400, quantity: 1 }],
        couponCode: "HOSGELDIN10",
      });

      const passDiscount = result.discountAmount === 40;
      const passCoupon = result.appliedCoupon?.code === "HOSGELDIN10";
      const passGrandTotal = result.grandTotal === 360; // 400 - 40 + 0 = 360 TL

      const passed = passDiscount && passCoupon && passGrandTotal;
      return {
        passed,
        message: passed
          ? `✓ İndirim: ${result.discountAmount} TL (%10), Kupon: ${result.appliedCoupon?.code}, Genel Toplam: ${result.grandTotal} TL`
          : `✗ Hatalı kupon sonucu: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 5. KUPON: SABİT TUTAR İNDİRİMİ (INDIRIM50: 300 TL sepet için 50 TL indirim)
  {
    name: "5. KUPON - SABİT TUTAR (INDIRIM50: 300 TL sepet için 50 TL indirim)",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 300, quantity: 1 }],
        couponCode: "INDIRIM50",
      });

      const passDiscount = result.discountAmount === 50;
      const passCoupon = result.appliedCoupon?.code === "INDIRIM50";
      const passShipping = result.shippingFee === 49.9; // 300 TL < 350 TL eşik altı
      const passGrandTotal = result.grandTotal === 299.9; // 300 - 50 + 49.9 = 299.9 TL

      const passed = passDiscount && passCoupon && passShipping && passGrandTotal;
      return {
        passed,
        message: passed
          ? `✓ İndirim: 50 TL, Kargo: 49.9 TL, Genel Toplam: ${result.grandTotal} TL (300 - 50 + 49.9)`
          : `✗ Hatalı sabit kupon sonucu: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 6. KUPON: MİNİMUM SEPET TUTARI ALTI (INDIRIM50, min 200 TL; sepet 150 TL)
  {
    name: "6. KUPON - MİNİMUM SEPET KONTROLÜ (INDIRIM50 için 150 TL sepet < 200 TL minBasket)",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 150, quantity: 1 }],
        couponCode: "INDIRIM50",
      });

      const passNoDiscount = result.discountAmount === 0;
      const passNullCoupon = result.appliedCoupon === null;
      const passError = typeof result.couponError === "string" && result.couponError.includes("en az 200 TL");

      const passed = passNoDiscount && passNullCoupon && passError;
      return {
        passed,
        message: passed
          ? `✓ Kupon reddedildi ve hata mesajı döndü: "${result.couponError}"`
          : `✗ Kupon sepet altı kuralı hatalı çalıştı: ${JSON.stringify(result)}`,
        details: result,
      };
    },
  },

  // 7. KUPON: GEÇERSİZ KOD DENEMESİ
  {
    name: "7. KUPON - GEÇERSİZ KOD ('BILINMEYEN_KOD')",
    run: () => {
      const result = calculateCartTotals({
        items: [{ price: 200, quantity: 1 }],
        couponCode: "BILINMEYEN_KOD",
      });

      const passNoDiscount = result.discountAmount === 0;
      const passError = Boolean(result.couponError);

      const passed = passNoDiscount && passError;
      return {
        passed,
        message: passed
          ? `✓ Geçersiz kod tespit edildi: "${result.couponError}"`
          : `✗ Geçersiz kupon tespiti başarısız`,
        details: result,
      };
    },
  },

  // 8. BOŞ SEPET KONTROLÜ
  {
    name: "8. BOŞ SEPET: 0 ürün varken kargo 0, genel toplam 0 olmalı",
    run: () => {
      const result = calculateCartTotals({
        items: [],
      });

      const passed =
        result.subtotal === 0 &&
        result.shippingFee === 0 &&
        result.grandTotal === 0 &&
        result.totalItemCount === 0;

      return {
        passed,
        message: passed
          ? `✓ Boş sepet: Ara Toplam: 0 TL, Kargo: 0 TL, Genel Toplam: 0 TL`
          : `✗ Boş sepet hatalı: ${JSON.stringify(result)}`,
      };
    },
  },
];

let allPassed = true;

for (const t of tests) {
  try {
    const outcome = t.run();
    if (outcome.passed) {
      console.log(`[PASS] ${t.name}`);
      console.log(`       ${outcome.message}\n`);
    } else {
      console.error(`[FAIL] ${t.name}`);
      console.error(`       ${outcome.message}\n`);
      allPassed = false;
    }
  } catch (err: any) {
    console.error(`[ERROR] ${t.name}: ${err.message}\n`);
    allPassed = false;
  }
}

console.log("-------------------------------------------------");
if (allPassed) {
  console.log("🎉 TÜM BİRİM TESTLER BAŞARIYLA GEÇTİ (8/8 PASSED)");
} else {
  console.error("❌ BAZI TESTLER BAŞARISIZ OLDU");
  process.exit(1);
}
console.log("-------------------------------------------------");
