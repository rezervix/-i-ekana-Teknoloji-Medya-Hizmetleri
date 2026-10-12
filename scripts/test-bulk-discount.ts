import { calculateDetailPrice } from "../src/lib/magaza/detail-calculator";
import type { PriceMatrixEntry, LegacyVariant } from "../src/types/product";

console.log("==================================================");
console.log("🧪 TOPLU VARYANT İNDİRİMİ VE HESAPLAMA TESTLERİ");
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

// 1. Orijinal Price Matrix
const originalMatrix: PriceMatrixEntry[] = [
  {
    packageId: "1",
    dimensionValues: {
      kagit: "350 gr. Kuşe",
      kesim: "Düz Kesim",
    },
    tiers: [
      { quantity: 1000, salePrice: 1500, unitSalePrice: 1.5, totalCost: 600, unitCost: 0.6 },
      { quantity: 2000, salePrice: 2800, unitSalePrice: 1.4, totalCost: 1100, unitCost: 0.55 },
      { quantity: 5000, salePrice: 6500, unitSalePrice: 1.3, totalCost: 2500, unitCost: 0.5 },
    ],
  },
  {
    packageId: "2",
    dimensionValues: {
      kagit: "350 gr. Kuşe",
      kesim: "Oval Kesim",
    },
    tiers: [
      { quantity: 1000, salePrice: 1800, unitSalePrice: 1.8, totalCost: 700, unitCost: 0.7 },
      { quantity: 2000, salePrice: 3400, unitSalePrice: 1.7, totalCost: 1300, unitCost: 0.65 },
    ],
  },
];

// İndirim uygulama fonksiyonu (API ve Frontend'deki mantığın birebir karşılığı)
function applyDiscountToMatrix(
  matrix: PriceMatrixEntry[],
  type: "DISCOUNT_AMOUNT" | "DISCOUNT_PERCENT" | "INCREASE_AMOUNT" | "SET_FIXED",
  value: number,
  minPrice: number = 0
): PriceMatrixEntry[] {
  return matrix.map((entry) => ({
    ...entry,
    tiers: entry.tiers.map((tier) => {
      let newPrice = tier.salePrice;
      if (type === "DISCOUNT_AMOUNT") newPrice = tier.salePrice - value;
      else if (type === "DISCOUNT_PERCENT") newPrice = tier.salePrice * (1 - value / 100);
      else if (type === "INCREASE_AMOUNT") newPrice = tier.salePrice + value;
      else if (type === "SET_FIXED") newPrice = value;

      newPrice = Math.max(minPrice, parseFloat(newPrice.toFixed(2)));
      const unitPrice = tier.quantity > 0 ? parseFloat((newPrice / tier.quantity).toFixed(2)) : 0;

      return {
        ...tier,
        salePrice: newPrice,
        unitSalePrice: unitPrice,
      };
    }),
  }));
}

// TEST 1: Tek girdi ile 500 TL Sabit İndirim Uygulama
const discounted500 = applyDiscountToMatrix(originalMatrix, "DISCOUNT_AMOUNT", 500);

assert(
  "Tüm kombinasyonlar korundu (2 kombinasyon)",
  discounted500.length === 2
);

assert(
  "Kombinasyon 1, 1000 Adet: 1500 TL -> 1000 TL (-500 TL)",
  discounted500[0].tiers[0].salePrice === 1000 &&
  discounted500[0].tiers[0].unitSalePrice === 1.0
);

assert(
  "Kombinasyon 1, 2000 Adet: 2800 TL -> 2300 TL (-500 TL)",
  discounted500[0].tiers[1].salePrice === 2300 &&
  discounted500[0].tiers[1].unitSalePrice === 1.15
);

assert(
  "Kombinasyon 1, 5000 Adet: 6500 TL -> 6000 TL (-500 TL)",
  discounted500[0].tiers[2].salePrice === 6000 &&
  discounted500[0].tiers[2].unitSalePrice === 1.2
);

assert(
  "Kombinasyon 2, 1000 Adet: 1800 TL -> 1300 TL (-500 TL)",
  discounted500[1].tiers[0].salePrice === 1300 &&
  discounted500[1].tiers[0].unitSalePrice === 1.3
);

assert(
  "Kombinasyon 2, 2000 Adet: 3400 TL -> 2900 TL (-500 TL)",
  discounted500[1].tiers[1].salePrice === 2900 &&
  discounted500[1].tiers[1].unitSalePrice === 1.45
);

// TEST 2: İndirimli Fiyatın Vitrin / Sepet Motoru (calculateDetailPrice) Tarafından Doğru Hesaplanması
const detailResult = calculateDetailPrice({
  mode: "new",
  priceMatrix: discounted500,
  selectedDimensions: {
    kagit: "350 gr. Kuşe",
    kesim: "Düz Kesim",
  },
  selectedQuantity: 1000,
  basePrice: 1000,
  selectedDesignMethod: "upload",
});

assert(
  "calculateDetailPrice indirimli 1000 TL fiyatı doğru çekti",
  detailResult.isValid === true && detailResult.displayPrice === 1000 && detailResult.totalPrice === 1000
);

// TEST 3: Minimum Fiyat Sınırı Koruması (Fiyat 0'ın altına düşemez)
const smallPriceMatrix: PriceMatrixEntry[] = [
  {
    packageId: "low",
    dimensionValues: { tip: "Tek" },
    tiers: [{ quantity: 1, salePrice: 300, unitSalePrice: 300, totalCost: 100, unitCost: 100 }],
  },
];
const boundedDiscount = applyDiscountToMatrix(smallPriceMatrix, "DISCOUNT_AMOUNT", 500, 0);

assert(
  "300 TL olan ürüne 500 TL indirim yapıldığında eksiye düşmez, minimum 0 TL olur",
  boundedDiscount[0].tiers[0].salePrice === 0
);

// TEST 4: Yüzde %20 İndirimi
const percentDiscount = applyDiscountToMatrix(originalMatrix, "DISCOUNT_PERCENT", 20);
assert(
  "%20 indirim sonrası 1500 TL -> 1200 TL olur",
  percentDiscount[0].tiers[0].salePrice === 1200
);

// TEST 5: İndirimi Geri Alma / Fiyat Artışı (+500 TL)
const reverted = applyDiscountToMatrix(discounted500, "INCREASE_AMOUNT", 500);
assert(
  "+500 TL artış sonrası fiyat tekrar 1500 TL'ye döner",
  reverted[0].tiers[0].salePrice === 1500
);

console.log(`\n==================================================`);
console.log(`📊 TEST SONUCU: ${passed}/${total} BAŞARILI`);
console.log(`==================================================`);
if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
