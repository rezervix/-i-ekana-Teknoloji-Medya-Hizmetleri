import {
  filterProducts,
  deriveStoreFilters,
  normalizeTurkishText,
} from "../src/lib/magaza/filter";

console.log("==================================================");
console.log("🧪 STORE FILTER ENGINE (FAZ 2) BİRİM TESTLERİ");
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

// Mock datasets for testing
const mockProducts = [
  {
    id: "p1",
    name: "Kapı Askısı El İlanı",
    category: "Baski",
    price: 7199,
    freeShipping: false,
    createdAt: "2026-01-10T00:00:00Z",
    isFeatured: true,
    variantDimensions: [
      { label: "Kağıt Cinsi", options: ["350 gr. Kuşe", "700 gr. Kuşe"] },
      { label: "Ebat", options: ["10.5x24 cm"] },
    ],
  },
  {
    id: "p2",
    name: "Özel Tasarım Kartvizit",
    category: "Baski",
    price: 450,
    freeShipping: true,
    createdAt: "2026-02-15T00:00:00Z",
    isFeatured: false,
    variantDimensions: [
      { label: "Kağıt Cinsi", options: ["350 gr. Kuşe"] },
    ],
  },
  {
    id: "p3",
    name: "Sosyal Medya Yönetim Paketi",
    category: "Medya",
    price: 3500,
    freeShipping: true,
    createdAt: "2026-03-01T00:00:00Z",
    isFeatured: false,
  },
  {
    id: "p4",
    name: "E-Ticaret Entegrasyon Yazılımı",
    category: "Teknoloji",
    price: 12000,
    freeShipping: true,
    createdAt: "2026-01-01T00:00:00Z",
    isFeatured: false,
  },
];

// 1. Türkçe karakter normalizasyonu testleri
assert(
  "normalizeTurkishText 'Kapı İlanı' -> 'kapi ilani'",
  normalizeTurkishText("Kapı İlanı") === "kapi ilani"
);
assert(
  "normalizeTurkishText 'Şölen Çözüm Güneş' -> 'solen cozum gunes'",
  normalizeTurkishText("Şölen Çözüm Güneş") === "solen cozum gunes"
);

// 2. Türkçe duyarsız arama
const searchResults1 = filterProducts(mockProducts, { q: "kapi askisi" });
assert(
  "Arama 'kapi askisi' -> 'Kapı Askısı El İlanı' bulundu",
  searchResults1.length === 1 && searchResults1[0].id === "p1"
);

const searchResults2 = filterProducts(mockProducts, { q: "kuse" });
assert(
  "Arama 'kuse' -> Kuşe kağıt içeren varyantlı ürünler bulundu (2 ürün)",
  searchResults2.length === 2
);

// 3. Kategori filtresi
const categoryResults = filterProducts(mockProducts, { category: "Medya" });
assert(
  "Kategori filtresi 'Medya' -> 1 ürün döndü",
  categoryResults.length === 1 && categoryResults[0].id === "p3"
);

// 4. Ücretsiz kargo filtresi
const shippingResults = filterProducts(mockProducts, { freeShipping: true });
assert(
  "Ücretsiz kargo filtresi -> 3 ürün döndü",
  shippingResults.length === 3 && shippingResults.every((p) => p.freeShipping)
);

// 5. Fiyat aralığı filtresi
const priceRangeResults = filterProducts(mockProducts, { minPrice: 1000, maxPrice: 8000 });
assert(
  "Fiyat aralığı 1.000 TL - 8.000 TL -> 2 ürün (p1: 7199, p3: 3500)",
  priceRangeResults.length === 2
);

// 6. Boyutsal filtre (variantDimensions)
const dimensionResults = filterProducts(mockProducts, {
  dimensions: { "Kağıt Cinsi": ["700 gr. Kuşe"] },
});
assert(
  "Varyant boyutu '700 gr. Kuşe' filtresi -> 1 ürün (p1)",
  dimensionResults.length === 1 && dimensionResults[0].id === "p1"
);

// 7. Çoklu kombine filtre
const multiFilterResults = filterProducts(mockProducts, {
  category: "Baski",
  freeShipping: true,
  maxPrice: 1000,
});
assert(
  "Çoklu filtre (Baskı + Ücretsiz Kargo + Max 1000 TL) -> 1 ürün (p2)",
  multiFilterResults.length === 1 && multiFilterResults[0].id === "p2"
);

// 8. Sıfır sonuç durumu
const zeroResults = filterProducts(mockProducts, { q: "olmayan-kelime-xyz" });
assert(
  "Eşleşmeyen arama -> 0 sonuç döndü",
  zeroResults.length === 0
);

// 9. Sıralama testleri
const ascSorted = filterProducts(mockProducts, { sort: "price_asc" });
assert(
  "Fiyat artan sıralama doğru çalışıyor",
  ascSorted[0].price === 450 && ascSorted[ascSorted.length - 1].price === 12000
);

const descSorted = filterProducts(mockProducts, { sort: "price_desc" });
assert(
  "Fiyat azalan sıralama doğru çalışıyor",
  descSorted[0].price === 12000 && descSorted[descSorted.length - 1].price === 450
);

// 10. Filtre türetme (deriveStoreFilters)
const derived = deriveStoreFilters(mockProducts);
assert(
  "deriveStoreFilters kategorileri, min/max fiyatı ve varyant gruplarını hesapladı",
  derived.categories.length === 4 &&
    derived.minPrice === 450 &&
    derived.maxPrice === 12000 &&
    derived.dimensionGroups.some((g) => g.label === "Kağıt Cinsi")
);

console.log("\n--------------------------------------------------");
console.log(`Sonuç: ${passed}/${total} test başarılı.`);
if (passed === total) {
  console.log("🎉 TÜM FİLTRE VE ARAMA TESTLERİ BAŞARIYLA GEÇTİ!");
} else {
  console.error("🚨 BAZI TESTLER BAŞARISIZ OLDU!");
  process.exit(1);
}
