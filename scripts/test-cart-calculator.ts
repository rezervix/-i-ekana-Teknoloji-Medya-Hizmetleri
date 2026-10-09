import { calculateCartTotals, AVAILABLE_COUPONS } from '../src/lib/cart-calculator';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('==================================================');
console.log('🧪 CART CALCULATOR (FAZ 5) BİRİM TESTLERİ');
console.log('==================================================\n');

// 1. Eşik Altı (subtotal < 350 TL)
// Örnek: 200 TL'lik tek ürün, freeShipping false
const res1 = calculateCartTotals({
  items: [{ price: 200, quantity: 1, freeShipping: false }],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res1.subtotal === 200, '[TEST 1] Eşik altı ara toplam 200 TL olmalı');
assert(res1.shippingFee === 49.9, '[TEST 1] Eşik altı kargo ücreti 49.9 TL olmalı');
assert(res1.isFreeShipping === false, '[TEST 1] isFreeShipping false olmalı');
assert(res1.remainingForFreeShipping === 150, '[TEST 1] Ücretsiz kargo için kalan 150 TL olmalı');
assert(res1.grandTotal === 249.9, '[TEST 1] Genel toplam 249.9 TL olmalı');

// 2. Tam Eşik (subtotal == 350 TL)
const res2 = calculateCartTotals({
  items: [{ price: 350, quantity: 1, freeShipping: false }],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res2.subtotal === 350, '[TEST 2] Tam eşik ara toplam 350 TL olmalı');
assert(res2.shippingFee === 0, '[TEST 2] Tam eşikte kargo ücreti 0 TL olmalı');
assert(Boolean(res2.isFreeShipping) === true, '[TEST 2] isFreeShipping true olmalı');
assert(res2.remainingForFreeShipping === 0, '[TEST 2] Kalan tutar 0 TL olmalı');
assert(res2.grandTotal === 350, '[TEST 2] Genel toplam 350 TL olmalı');

// 3. Eşik Üstü (subtotal > 350 TL)
const res3 = calculateCartTotals({
  items: [{ price: 1200, quantity: 1, freeShipping: false }],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res3.subtotal === 1200, '[TEST 3] Eşik üstü ara toplam 1200 TL olmalı');
assert(res3.shippingFee === 0, '[TEST 3] Eşik üstünde kargo ücreti 0 TL olmalı');
assert(Boolean(res3.isFreeShipping) === true, '[TEST 3] isFreeShipping true olmalı');
assert(res3.grandTotal === 1200, '[TEST 3] Genel toplam 1200 TL olmalı');

// 4. Ücretsiz Kargo Rozetli Ürün (Eşik altı bile olsa bedava)
const res4 = calculateCartTotals({
  items: [{ price: 150, quantity: 1, freeShipping: true }],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res4.subtotal === 150, '[TEST 4] freeShipping ürünlü ara toplam 150 TL olmalı');
assert(res4.shippingFee === 0, '[TEST 4] freeShipping ürün olduğu için kargo 0 TL olmalı');
assert(Boolean(res4.isFreeShipping) === true, '[TEST 4] isFreeShipping true olmalı');

// 5. Tasarım Ücretli Satır (extraServices / photoToDesignFee)
const res5 = calculateCartTotals({
  items: [
    {
      price: 2499,
      quantity: 1,
      extraServices: [{ type: 'photo_to_design', label: 'Fotoğraftan Tasarım', price: 500 }],
    },
  ],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res5.itemsSubtotal === 2499, '[TEST 5] Ürün ara toplamı 2499 TL olmalı');
assert(res5.designFeesTotal === 500, '[TEST 5] Tasarım ücretleri toplamı 500 TL olmalı');
assert(res5.subtotal === 2999, '[TEST 5] Toplam sepet tutarı 2999 TL olmalı');
assert(res5.shippingFee === 0, '[TEST 5] Eşik aşıldığı için kargo 0 TL olmalı');
assert(res5.grandTotal === 2999, '[TEST 5] Genel toplam 2999 TL olmalı');

// 6. Çoklu Satır (Farklı ürünler + adetler + ekstra hizmet)
const res6 = calculateCartTotals({
  items: [
    { price: 100, quantity: 2, freeShipping: false }, // 200 TL
    { price: 50, quantity: 1, freeShipping: false, extraServices: [{ price: 25 }] }, // 75 TL
  ],
  customThreshold: 350,
  customShippingFee: 49.9,
});
assert(res6.itemsSubtotal === 250, '[TEST 6] Çoklu satır ürünler toplamı 250 TL olmalı');
assert(res6.designFeesTotal === 25, '[TEST 6] Çoklu satır tasarım ücreti 25 TL olmalı');
assert(res6.subtotal === 275, '[TEST 6] Çoklu satır toplam 275 TL olmalı');
assert(res6.shippingFee === 49.9, '[TEST 6] 275 TL < 350 TL olduğu için kargo ücreti 49.9 TL olmalı');
assert(res6.grandTotal === 324.9, '[TEST 6] Çoklu satır genel toplam 324.9 TL olmalı');

// 7. Kupon Varsa: Yüzdelik Kupon (HOSGELDIN10: %10)
const res7 = calculateCartTotals({
  items: [{ price: 1000, quantity: 1 }],
  couponCode: 'HOSGELDIN10',
  customThreshold: 350,
});
assert(res7.subtotal === 1000, '[TEST 7] Kuponlu ara toplam 1000 TL olmalı');
assert(res7.discountAmount === 100, '[TEST 7] %10 indirim 100 TL olmalı');
assert(res7.appliedCoupon?.code === 'HOSGELDIN10', '[TEST 7] HOSGELDIN10 kuponu uygulanmalı');
assert(res7.grandTotal === 900, '[TEST 7] Genel toplam 900 TL olmalı');

// 8. Kupon Varsa: Sabit Kupon ve Minimum Sepet Koşulu (INDIRIM50: 50 TL, minBasket: 200)
// 8a. Min sepet altı -> Hata vermeli
const res8a = calculateCartTotals({
  items: [{ price: 150, quantity: 1 }],
  couponCode: 'INDIRIM50',
  customThreshold: 350,
});
assert(res8a.discountAmount === 0, '[TEST 8a] Min sepet sağlanmadığında indirim 0 olmalı');
assert(Boolean(res8a.couponError), '[TEST 8a] Kupon hata mesajı içermeli');

// 8b. Min sepet üstü -> İndirim uygulanmalı
const res8b = calculateCartTotals({
  items: [{ price: 500, quantity: 1 }],
  couponCode: 'INDIRIM50',
  customThreshold: 350,
});
assert(res8b.discountAmount === 50, '[TEST 8b] 50 TL sabit indirim uygulanmalı');
assert(res8b.grandTotal === 450, '[TEST 8b] Genel toplam 450 TL olmalı');

console.log('\n--------------------------------------------------');
console.log('Sonuç: 9/9 test başarılı.');
console.log('🎉 TÜM SEPET HESAPLAMA TESTLERİ BAŞARIYLA GEÇTİ!\n');
