import { calculateDetailPrice, findMatchingPriceMatrixEntry } from "../src/lib/magaza/detail-calculator";
import type { PriceMatrixEntry, LegacyVariant } from "../src/types/product";

console.log("==================================================");
console.log("🧪 PRODUCT DETAIL PRICING ENGINE BİRİM TESTLERİ");
console.log("==================================================\n");

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean, extraInfo?: any) {
  total++;
  if (condition) {
    console.log(`✅ [TEST ${total}] ${description}`);
    passed++;
  } else {
    console.error(`❌ [TEST ${total}] BAŞARISIZ: ${description}`);
    if (extraInfo) console.error("   Detay:", extraInfo);
  }
}

// Mock Price Matrix (Real structure from Broşür / Kapı Askısı)
const samplePriceMatrix: PriceMatrixEntry[] = [
  {
    packageId: "164",
    dimensionValues: {
      ozellik_2: "10.5x24 cm",
      ozellik_7: "350 gr. Kuşe",
      ozellik_9: "Mat Selefon",
    },
    tiers: [
      { quantity: 1000, salePrice: 7199, unitSalePrice: 7.2, totalCost: 3186, unitCost: 3.186 },
      { quantity: 2000, salePrice: 13899, unitSalePrice: 6.95, totalCost: 6146, unitCost: 3.073 },
      { quantity: 5000, salePrice: 31799, unitSalePrice: 6.36, totalCost: 15130, unitCost: 3.026 },
    ],
  },
  {
    packageId: "165",
    dimensionValues: {
      ozellik_2: "10.5x24 cm",
      ozellik_7: "700 gr. Kuşe",
      ozellik_9: "Mat Selefon",
    },
    tiers: [
      { quantity: 1000, salePrice: 7999, unitSalePrice: 8.0, totalCost: 3553, unitCost: 3.553 },
      { quantity: 2000, salePrice: 15599, unitSalePrice: 7.8, totalCost: 6925, unitCost: 3.462 },
    ],
  },
];

// Kombinasyon 1: 350 gr. Kuşe + 1000 Adet (Tasarım Ücretsiz / Kendi Yükledi)
const test1 = calculateDetailPrice({
  mode: "new",
  priceMatrix: samplePriceMatrix,
  selectedDimensions: {
    ozellik_2: "10.5x24 cm",
    ozellik_7: "350 gr. Kuşe",
    ozellik_9: "Mat Selefon",
  },
  selectedQuantity: 1000,
  basePrice: 7199,
  selectedDesignMethod: "upload",
  photoToDesignFee: 500,
});
assert(
  "Kombinasyon 1 (350 gr Kuşe, 1000 adet, Upload): 7.199 ₺, tasarım ücreti 0 ₺, toplam 7.199 ₺",
  test1.isValid === true &&
    test1.displayPrice === 7199 &&
    test1.designFee === 0 &&
    test1.totalPrice === 7199 &&
    test1.unitPrice === 7.2
);

// Kombinasyon 2: 350 gr. Kuşe + 2000 Adet + Fotoğraftan Tasarım Hizmeti (500 TL ek)
const test2 = calculateDetailPrice({
  mode: "new",
  priceMatrix: samplePriceMatrix,
  selectedDimensions: {
    ozellik_2: "10.5x24 cm",
    ozellik_7: "350 gr. Kuşe",
    ozellik_9: "Mat Selefon",
  },
  selectedQuantity: 2000,
  basePrice: 7199,
  selectedDesignMethod: "photo_to_design",
  photoToDesignFee: 500,
});
assert(
  "Kombinasyon 2 (350 gr Kuşe, 2000 adet, Photo-to-design): 13.899 ₺ + 500 ₺ = 14.399 ₺",
  test2.isValid === true &&
    test2.displayPrice === 13899 &&
    test2.designFee === 500 &&
    test2.totalPrice === 14399
);

// Kombinasyon 3: 700 gr. Kuşe + 1000 Adet + Hazır Şablon (Tasarım Ücretsiz)
const test3 = calculateDetailPrice({
  mode: "new",
  priceMatrix: samplePriceMatrix,
  selectedDimensions: {
    ozellik_2: "10.5x24 cm",
    ozellik_7: "700 gr. Kuşe",
    ozellik_9: "Mat Selefon",
  },
  selectedQuantity: 1000,
  basePrice: 7199,
  selectedDesignMethod: "template",
  photoToDesignFee: 500,
});
assert(
  "Kombinasyon 3 (700 gr Kuşe, 1000 adet, Template): 7.999 ₺, tasarım ücreti 0 ₺, toplam 7.999 ₺",
  test3.isValid === true &&
    test3.displayPrice === 7999 &&
    test3.designFee === 0 &&
    test3.totalPrice === 7999
);

// Kombinasyon 4: 700 gr. Kuşe + 2000 Adet + Özel Tasarım Ücreti (750 TL)
const test4 = calculateDetailPrice({
  mode: "new",
  priceMatrix: samplePriceMatrix,
  selectedDimensions: {
    ozellik_2: "10.5x24 cm",
    ozellik_7: "700 gr. Kuşe",
    ozellik_9: "Mat Selefon",
  },
  selectedQuantity: 2000,
  basePrice: 7199,
  selectedDesignMethod: "photo_to_design",
  photoToDesignFee: 750,
});
assert(
  "Kombinasyon 4 (700 gr Kuşe, 2000 adet, Özel 750 TL Ücret): 15.599 ₺ + 750 ₺ = 16.349 ₺",
  test4.isValid === true &&
    test4.displayPrice === 15599 &&
    test4.designFee === 750 &&
    test4.totalPrice === 16349
);

// Kombinasyon 5: Eski format (LegacyVariants) + 500 Adet + Fotoğraftan Tasarım
const legacyVariants: LegacyVariant[] = [
  { quantity: 100, material: "250g Bristol", salePrice: 400, unitSalePrice: 4 },
  { quantity: 500, material: "250g Bristol", salePrice: 1500, unitSalePrice: 3 },
];
const test5 = calculateDetailPrice({
  mode: "legacy_variants",
  legacyVariants,
  selectedMaterial: "250g Bristol",
  selectedQuantity: 500,
  basePrice: 400,
  selectedDesignMethod: "photo_to_design",
  photoToDesignFee: 300,
});
assert(
  "Kombinasyon 5 (Legacy variants fallback, 500 adet, 300 TL ücret): 1.500 ₺ + 300 ₺ = 1.800 ₺",
  test5.isValid === true &&
    test5.displayPrice === 1500 &&
    test5.designFee === 300 &&
    test5.totalPrice === 1800
);

// Kombinasyon 6: Eşleşmeyen matris varyantı hatası
const test6 = calculateDetailPrice({
  mode: "new",
  priceMatrix: samplePriceMatrix,
  selectedDimensions: {
    ozellik_2: "Geçersiz Ebat",
    ozellik_7: "Olmayan Kağıt",
  },
  selectedQuantity: 1000,
  basePrice: 1000,
});
assert(
  "Kombinasyon 6 (Geçersiz varyant): isValid false dönmeli ve hata mesajı üretmeli",
  test6.isValid === false && Boolean(test6.error)
);

console.log("\n--------------------------------------------------");
console.log(`Sonuç: ${passed}/${total} test başarılı.`);
if (passed === total) {
  console.log("🎉 TÜM FİYAT VE TASARIM HESAPLAMA TESTLERİ BAŞARIYLA GEÇTİ!");
} else {
  console.error("🚨 BAZI TESTLER BAŞARISIZ OLDU!");
  process.exit(1);
}
