import { requiresOptions, getCardPriceDisplay } from "../src/lib/magaza/product-card";

console.log("==================================================");
console.log("🧪 PRODUCT CARD UTILITIES (FAZ 1) BİRİM TESTLERİ");
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

// 1. Basit seçenek gerektirmeyen ürün
const simpleProduct = {
  id: "p1",
  name: "Standart Kartvizitlik Kılıf",
  price: 150,
  customizationOptions: null,
};
assert(
  "Seçenek içermeyen ürün için requiresOptions false dönmeli",
  requiresOptions(simpleProduct) === false
);
const simplePrice = getCardPriceDisplay(simpleProduct);
assert(
  "Seçenek içermeyen ürün için standart fiyat dönmeli",
  simplePrice.displayPrice === 150 &&
    simplePrice.isMatrix === false &&
    simplePrice.formattedPrice === "150 ₺" &&
    simplePrice.vatNote === "KDV Dahil"
);

// 2. Yeni format priceMatrix ve variantDimensions içeren ürün
const newFormatProduct = {
  id: "p2",
  name: "Kapı Askısı El İlanı",
  price: 7199,
  customizationOptions: {
    variantDimensions: [
      { key: "ozellik_2", label: "Ebat", options: ["10.5x24 cm"] },
    ],
    priceMatrix: [
      {
        packageId: "164",
        dimensionValues: { ozellik_2: "10.5x24 cm" },
        tiers: [
          { quantity: 1000, salePrice: 7199, unitSalePrice: 7.2, totalCost: 3186, unitCost: 3.18 },
          { quantity: 2000, salePrice: 13899, unitSalePrice: 6.95, totalCost: 6146, unitCost: 3.07 },
        ],
      },
    ],
  },
};
assert(
  "variantDimensions ve priceMatrix içeren ürün için requiresOptions true dönmeli",
  requiresOptions(newFormatProduct) === true
);
const newPrice = getCardPriceDisplay(newFormatProduct);
assert(
  "priceMatrix olan üründe en düşük kademe (1000 adet 7.199 ₺) hesaplanmalı",
  newPrice.displayPrice === 7199 &&
    newPrice.minQuantity === 1000 &&
    newPrice.isMatrix === true &&
    newPrice.startingText === "1.000 adet 7.199 ₺'den başlayan fiyatlarla" &&
    newPrice.vatNote === "KDV Dahil"
);

// 3. Eski format variants içeren ürün
const legacyVariantsProduct = {
  id: "p3",
  name: "Katalog",
  price: 500,
  customizationOptions: {
    variants: [
      { quantity: 100, material: "Kuşe 170g", salePrice: 1200, unitSalePrice: 12 },
      { quantity: 500, material: "Kuşe 170g", salePrice: 4500, unitSalePrice: 9 },
    ],
  },
};
assert(
  "Eski format variants içeren ürün için requiresOptions true dönmeli",
  requiresOptions(legacyVariantsProduct) === true
);
const legacyPrice = getCardPriceDisplay(legacyVariantsProduct);
assert(
  "Eski format variants içeren üründe en düşük kademe fiyatı (1.200 ₺) dönmeli",
  legacyPrice.displayPrice === 1200 &&
    legacyPrice.minQuantity === 100 &&
    legacyPrice.isMatrix === true
);

// 4. Eski format özelleştirme dizisi içeren ürün (ör. metin/baskı dosya yükleme)
const legacyOptionsProduct = {
  id: "p4",
  name: "Kupa Bardak Baskı",
  price: 250,
  customizationOptions: [
    { id: "text", label: "İsim / Metin", type: "text", enabled: true },
    { id: "logo", label: "Logo Yükle", type: "file_upload", enabled: true },
  ],
};
assert(
  "customizationOptions dizisi etkin olan ürün için requiresOptions true dönmeli",
  requiresOptions(legacyOptionsProduct) === true
);

// 5. customizationOptions dizisi var ama hepsi disabled
const disabledOptionsProduct = {
  id: "p5",
  name: "Düz Bloknot",
  price: 80,
  customizationOptions: [
    { id: "text", label: "Yazı", type: "text", enabled: false },
  ],
};
assert(
  "customizationOptions içinde etkin seçenek yoksa requiresOptions false dönmeli",
  requiresOptions(disabledOptionsProduct) === false
);

console.log("\n--------------------------------------------------");
console.log(`Sonuç: ${passed}/${total} test başarılı.`);
if (passed === total) {
  console.log("🎉 TÜM PRODUCT CARD TESTLERİ BAŞARIYLA GEÇTİ!");
} else {
  console.error("🚨 BAZI TESTLER BAŞARISIZ OLDU!");
  process.exit(1);
}
