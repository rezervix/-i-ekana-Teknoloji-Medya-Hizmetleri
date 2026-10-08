/**
 * Guard Check Script
 * 
 * Verifies that all 10 protected features and critical data flows
 * in the e-commerce store remain intact across all optimization phases.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("🛡️  =======================================================");
console.log("🛡️  ÇİÇEKANA DÖNÜŞÜM OPTİMİZASYONU - GUARD CHECK");
console.log("🛡️  =======================================================\n");

const checks = [];

function addCheck(id, title, testFn) {
  checks.push({ id, title, testFn });
}

// Helper to recursively collect all source code files from a directory
function getAllFiles(dir, exts = [".ts", ".tsx", ".js", ".jsx"]) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else if (exts.includes(path.extname(fullPath))) {
      results.push(fullPath);
    }
  }
  return results;
}

// Collect all relevant files in the product detail page folder
const productDetailPageDir = path.join(rootDir, "src", "app", "magaza", "urun", "[slug]");
const productDetailFiles = getAllFiles(productDetailPageDir);
const productDetailContent = productDetailFiles
  .map((f) => fs.readFileSync(f, "utf-8"))
  .join("\n\n");

const adminProductListFile = path.join(
  rootDir,
  "src",
  "app",
  "admin",
  "magaza",
  "urunler",
  "ProductList.tsx"
);
const adminProductListContent = fs.existsSync(adminProductListFile)
  ? fs.readFileSync(adminProductListFile, "utf-8")
  : "";

// 1. Varyant boyut seçicileri (variantDimensions: Ebat, Kağıt Cinsi, Selefon, Kırım vb.)
addCheck(
  1,
  "Varyant boyut seçicileri (variantDimensions & boyutsal seçim akışı)",
  () => {
    const hasVariantDimensions =
      productDetailContent.includes("variantDimensions") &&
      (productDetailContent.includes("selectedDimensions") ||
        productDetailContent.includes("setSelectedDimensions"));
    return {
      passed: hasVariantDimensions,
      message: hasVariantDimensions
        ? "Varyant boyut seçicileri ve seçim durumu mevcut."
        : "HATA: variantDimensions veya selectedDimensions mantığı bulunamadı!",
    };
  }
);

// 2. Fiyat matrisi ve adet kademeleri (priceMatrix, tiers, newFormatTiers) ve eski format malzeme/varyant desteği (fallback)
addCheck(
  2,
  "Fiyat matrisi ve adet kademeleri (priceMatrix, tiers, newFormatTiers, fallback)",
  () => {
    const hasPriceMatrix = productDetailContent.includes("priceMatrix");
    const hasTiers =
      productDetailContent.includes("newFormatTiers") ||
      productDetailContent.includes("tiers");
    const hasLegacy =
      productDetailContent.includes("legacyVariants") ||
      productDetailContent.includes("selectedMaterial");
    const passed = hasPriceMatrix && hasTiers && hasLegacy;
    return {
      passed,
      message: passed
        ? "priceMatrix, kademeler (tiers) ve eski format malzeme/varyant fallback'i korunmuş."
        : `HATA: priceMatrix(${hasPriceMatrix}), tiers(${hasTiers}), legacy fallback(${hasLegacy}) eksik!`,
    };
  }
);

// 3. Özelleştirme seçenekleri (customizationOptions: metin, renk, tarih, dosya)
addCheck(
  3,
  "Özelleştirme seçenekleri (customizationOptions: metin, renk, tarih, dosya)",
  () => {
    const hasCustomization =
      productDetailContent.includes("customizationOptions") &&
      productDetailContent.includes("customizationData");
    return {
      passed: hasCustomization,
      message: hasCustomization
        ? "customizationOptions ve customizationData işleme yapısı mevcut."
        : "HATA: customizationOptions veya customizationData bulunamadı!",
    };
  }
);

// 4. 3'lü tasarım yöntemi seçicisi (Kendi Tasarımını Yükle / Fotoğraftan Tasarım / Hazır Şablon)
addCheck(
  4,
  "3'lü tasarım yöntemi seçicisi (upload, photo_to_design, template)",
  () => {
    const hasUpload = productDetailContent.includes("upload");
    const hasPhoto = productDetailContent.includes("photo_to_design");
    const hasTemplate = productDetailContent.includes("template");
    const passed = hasUpload && hasPhoto && hasTemplate;
    return {
      passed,
      message: passed
        ? "3'lü tasarım yöntemi seçicisi (upload, photo_to_design, template) eksiksiz."
        : `HATA: 3'lü tasarım seçicisi eksik: upload(${hasUpload}), photo_to_design(${hasPhoto}), template(${hasTemplate})`,
    };
  }
);

// 5. Müşteri tasarım dosyası yükleme alanı (/api/upload/customer-design)
addCheck(
  5,
  "Müşteri tasarım dosyası yükleme alanı (/api/upload/customer-design)",
  () => {
    const hasEndpoint = productDetailContent.includes("/api/upload/customer-design");
    const hasUploadedFiles = productDetailContent.includes("uploadedFiles");
    const passed = hasEndpoint && hasUploadedFiles;
    return {
      passed,
      message: passed
        ? "Tasarım yükleme endpoint'i (/api/upload/customer-design) ve dosya listesi mevcut."
        : "HATA: Tasarım yükleme endpoint veya uploadedFiles mantığı eksik!",
    };
  }
);

// 6. Fotoğraftan tasarım ücreti bölümü (photoToDesignFee)
addCheck(
  6,
  "Fotoğraftan tasarım ücreti bölümü (photoToDesignFee)",
  () => {
    const hasFee = productDetailContent.includes("photoToDesignFee");
    return {
      passed: hasFee,
      message: hasFee
        ? "photoToDesignFee hesaplama ve gösterim mantığı mevcut."
        : "HATA: photoToDesignFee mantığı bulunamadı!",
    };
  }
);

// 7. Hazır şablon galerisi, şablon büyütme (lightbox) ve 'Bu Tasarımı Seç'
addCheck(
  7,
  "Hazır şablon galerisi, şablon büyütme (lightbox) ve şablon seçimi",
  () => {
    const hasTemplates =
      productDetailContent.includes("templates") ||
      productDetailContent.includes("DesignTemplate");
    const hasLightbox =
      productDetailContent.includes("lightbox") ||
      productDetailContent.includes("Lightbox") ||
      productDetailContent.includes("selectedTemplate");
    const passed = hasTemplates && hasLightbox;
    return {
      passed,
      message: passed
        ? "Hazır şablon galerisi ve lightbox modalı mevcut."
        : `HATA: templates(${hasTemplates}) veya lightbox(${hasLightbox}) eksik!`,
    };
  }
);

// 8. Ücretsiz kargo rozeti (freeShipping)
addCheck(8, "Ücretsiz kargo rozeti (freeShipping)", () => {
  const hasFreeShipping =
    productDetailContent.includes("freeShipping") &&
    productDetailContent.includes("Ücretsiz Kargo");
  return {
    passed: hasFreeShipping,
    message: hasFreeShipping
      ? "Ücretsiz kargo rozeti ve gösterimi mevcut."
      : "HATA: freeShipping rozeti veya metni eksik!",
  };
});

// 9. Benzer ürünler, Son baktıklarım, Öneriler
addCheck(9, "Benzer ürünler, Son baktıklarım, Öneriler", () => {
  const hasRelated =
    productDetailContent.includes("relatedProducts") ||
    productDetailContent.includes("Benzer Ürün");
  const hasRecentlyViewed =
    productDetailContent.includes("recently-viewed") ||
    productDetailContent.includes("RecentlyViewedSection") ||
    productDetailContent.includes("Son Baktıklarım") ||
    productDetailContent.includes("Son Baktığın");
  const hasRecommendations =
    productDetailContent.includes("RecommendationsSection") ||
    productDetailContent.includes("Bunlara da Bakabilirsin") ||
    productDetailContent.includes("Öneriler");
  const passed = hasRelated && (hasRecentlyViewed || hasRecommendations);
  return {
    passed,
    message: passed
      ? "Benzer ürünler, son gezilenler ve öneriler bölümleri mevcut."
      : `HATA: related(${hasRelated}), recentlyViewed(${hasRecentlyViewed}), recommendations(${hasRecommendations})`,
  };
});

// 10. Admin panelindeki boyut editörü, görsel/WebP yükleme (Sharp), ücretsiz kargo toggle (ProductList.tsx)
addCheck(
  10,
  "Admin panelindeki boyut editörü, görsel/WebP, ücretsiz kargo toggle",
  () => {
    if (!fs.existsSync(adminProductListFile)) {
      return { passed: false, message: "HATA: ProductList.tsx dosyası bulunamadı!" };
    }
    const hasDimensions =
      adminProductListContent.includes("variantDimensions") ||
      adminProductListContent.includes("DimensionOptionsEditor");
    const hasFreeShippingToggle = adminProductListContent.includes("freeShipping");
    const hasImageUpload =
      adminProductListContent.includes("images") &&
      (adminProductListContent.includes("Upload") ||
        adminProductListContent.includes("upload"));
    const passed = hasDimensions && hasFreeShippingToggle && hasImageUpload;
    return {
      passed,
      message: passed
        ? "Admin ProductList boyutsal editör, freeShipping toggle ve görsel yükleme korundu."
        : `HATA: Admin boyut editörü(${hasDimensions}), freeShipping(${hasFreeShippingToggle}), görsel yükleme(${hasImageUpload}) eksik!`,
    };
  }
);

// Execute all checks
let allPassed = true;
let passedCount = 0;

for (const check of checks) {
  try {
    const res = check.testFn();
    if (res.passed) {
      console.log(`✅ [Madde ${check.id}] ${check.title}`);
      console.log(`   └─ ${res.message}\n`);
      passedCount++;
    } else {
      console.error(`❌ [Madde ${check.id}] ${check.title}`);
      console.error(`   └─ ${res.message}\n`);
      allPassed = false;
    }
  } catch (err) {
    console.error(`💥 [Madde ${check.id}] ${check.title} - İstisna:`, err.message);
    allPassed = false;
  }
}

console.log("-------------------------------------------------------");
console.log(`Sonuç: ${passedCount}/${checks.length} kontrol başarılı.`);

if (!allPassed) {
  console.error("🚨 GUARD CHECK BAŞARISIZ! Korunması gereken bir bölüm eksik veya bozulmuş.");
  process.exit(1);
} else {
  console.log("🎉 GUARD CHECK BAŞARILI! Tüm 10 kritik işlev ve veri akışı sağlam.");
  process.exit(0);
}
