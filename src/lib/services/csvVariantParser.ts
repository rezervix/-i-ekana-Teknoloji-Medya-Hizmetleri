/**
 * csvVariantParser.ts
 *
 * CSV satır gruplarını (aynı "Ürün Adı" altındaki tüm satırlar) alıp
 * yeni customizationOptions formatına (variantDimensions + priceMatrix) dönüştürür.
 *
 * Sorumluluklar:
 * - Türkçe sayı formatı normalize etme ("1.120,00" → 1120.0)
 * - Dinamik Özellik_N sütunlarını tespit etme
 * - packageId bazında gruplama
 * - variantLabelDetector ile label tahmin etme
 * - applyAutoProfitToVariant ile fiyat hesaplama
 */

import { getProfitMargin, applyRounding } from "@/lib/services/calculationService";
import { detectDimensionLabel } from "@/lib/services/variantLabelDetector";
import type {
  NewFormatCustomizationOptions,
  PriceMatrixEntry,
  PriceTier,
  VariantDimension,
} from "@/types/product";

// ─── Türkçe Sayı Normalizer ────────────────────────────────────────────────────

/**
 * Türkçe formatındaki sayı string'ini JavaScript float'a çevirir.
 *
 * Kurallar:
 *  - Nokta (.) binlik ayraçtır → silinir
 *  - Virgül (,) ondalık ayraçtır → noktaya çevrilir
 *
 * Örnekler:
 *  "1.120,00"  → 1120.0
 *  "637,00"    → 637.0
 *  "0,637"     → 0.637
 *  "1120"      → 1120.0
 *  ""          → 0.0
 */
export function parseTurkishNumber(raw: string | undefined | null): number {
  if (raw === undefined || raw === null || String(raw).trim() === "") return 0;
  const normalized = String(raw)
    .trim()
    .replace(/\./g, "")   // binlik noktaları sil
    .replace(",", ".");    // ondalık virgülü noktaya çevir
  const result = parseFloat(normalized);
  return isNaN(result) ? 0 : result;
}

// ─── Kâr Marjı Hesaplama ──────────────────────────────────────────────────────

interface RawTierInput {
  totalCost: number;
  unitCost: number;
}

interface ComputedTier extends RawTierInput {
  salePrice: number;
  unitSalePrice: number;
}

function applyAutoProfitToTier(tier: RawTierInput): ComputedTier {
  const { totalCost, unitCost } = tier;

  // Toplam satış fiyatı
  const karOrani = getProfitMargin(totalCost);
  const calculatedPrice = totalCost + (totalCost * karOrani) / 100;
  const salePrice = applyRounding(calculatedPrice, "99");

  // Birim satış fiyatı
  const unitProfitRate = getProfitMargin(unitCost);
  const unitCalculatedPrice = unitCost + (unitCost * unitProfitRate) / 100;
  let unitSalePrice: number;
  if (unitCost < 10) {
    unitSalePrice = Number(unitCalculatedPrice.toFixed(2));
  } else {
    unitSalePrice = applyRounding(unitCalculatedPrice, "99");
  }

  return { ...tier, salePrice, unitSalePrice };
}

// ─── Özellik_N Tespiti ────────────────────────────────────────────────────────

/**
 * CSV satır objesinin anahtarlarından "Özellik_N" pattern'indeki sütunları bulur.
 * Sonucu sayısal N değerine göre sıralar (asc).
 *
 * Örnek: ["Özellik_2", "Özellik_7", "Özellik_8", "Özellik_9"]
 */
export function detectOzellikColumns(row: Record<string, any>): string[] {
  const cols = Object.keys(row).filter((k) => /^Özellik_\d+$/i.test(k));
  cols.sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10);
    const nb = parseInt(b.replace(/\D/g, ""), 10);
    return na - nb;
  });
  return cols;
}

/**
 * Özellik_N sütun adından stabil key üretir.
 * "Özellik_8" → "ozellik_8"
 */
export function columnToKey(column: string): string {
  return column
    .toLowerCase()
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c");
}

// ─── Ana Parser ───────────────────────────────────────────────────────────────

/**
 * Aynı ürüne ait CSV satırlarını parse ederek yeni customizationOptions formatını üretir.
 *
 * @param rows - Aynı "Ürün Adı" altındaki tüm CSV satırları
 * @returns NewFormatCustomizationOptions — variantDimensions + priceMatrix
 */
export function parseCsvRowsToCustomizationOptions(
  rows: Record<string, any>[]
): NewFormatCustomizationOptions {
  if (rows.length === 0) {
    return { variantDimensions: [], priceMatrix: [] };
  }

  // 1. Özellik_N sütunlarını tespit et (ilk satırdan)
  const ozellikCols = detectOzellikColumns(rows[0]);

  // 2. Her sütun için benzersiz değerleri derle
  const colValues: Record<string, string[]> = {};
  for (const col of ozellikCols) {
    const vals = rows
      .map((r) => String(r[col] || "").trim())
      .filter(Boolean);
    colValues[col] = vals;
  }

  // 3. variantDimensions oluştur
  const variantDimensions: VariantDimension[] = ozellikCols.map((col, idx) => {
    const key = columnToKey(col);
    const { label, autoDetected } = detectDimensionLabel(
      colValues[col],
      idx + 1
    );
    const options = Array.from(new Set(colValues[col]));
    return { key, label, autoDetected, options };
  });

  // 4. packageId bazında gruplama
  //    Her benzersiz packageId → bir PriceMatrixEntry
  const packageMap = new Map<string, Record<string, any>[]>();

  for (const row of rows) {
    const pkgId = String(row.packageId || row.PackageId || "default").trim();
    if (!packageMap.has(pkgId)) {
      packageMap.set(pkgId, []);
    }
    packageMap.get(pkgId)!.push(row);
  }

  // 5. Her packageId grubu için PriceMatrixEntry üret
  const priceMatrix: PriceMatrixEntry[] = [];

  for (const [packageId, pkgRows] of packageMap.entries()) {
    // dimensionValues: bu packageId'nin Özellik_N değerleri
    // (grubun ilk satırından al — aynı packageId içinde tüm satırlar aynı Özellik değerlerine sahip)
    const firstRow = pkgRows[0];
    const dimensionValues: Record<string, string> = {};
    for (const col of ozellikCols) {
      const key = columnToKey(col);
      const val = String(firstRow[col] || "").trim();
      if (val) {
        dimensionValues[key] = val;
      }
    }

    // tiers: her satır farklı bir Adet kademesi
    const tiers: PriceTier[] = pkgRows
      .map((r) => {
        const quantity =
          r.Adet !== undefined && r.Adet !== ""
            ? parseInt(String(r.Adet), 10)
            : 1;

        const totalCost = parseTurkishNumber(r["Fiyat KDV Hariç (TL)"]);
        const unitCost = parseTurkishNumber(r["Birim KDV Hariç (TL)"]);

        const computed = applyAutoProfitToTier({ totalCost, unitCost });
        return {
          quantity,
          totalCost: computed.totalCost,
          unitCost: computed.unitCost,
          salePrice: computed.salePrice,
          unitSalePrice: computed.unitSalePrice,
        } as PriceTier;
      })
      .filter((t) => !isNaN(t.quantity) && t.quantity > 0)
      .sort((a, b) => a.quantity - b.quantity);

    if (tiers.length > 0) {
      priceMatrix.push({ packageId, dimensionValues, tiers });
    }
  }

  return { variantDimensions, priceMatrix };
}

/**
 * Yeni formatın ilk anlamlı salePrice değerini döndürür.
 * (Product.price alanını doldurmak için kullanılır)
 *
 * Öncelik: 1000 adetlik tier → yoksa ilk tier → yoksa 0
 */
export function extractBasePrice(
  opts: NewFormatCustomizationOptions
): number {
  if (opts.priceMatrix.length === 0) return 0;

  const firstEntry = opts.priceMatrix[0];
  const tier1000 = firstEntry.tiers.find((t) => t.quantity === 1000);
  if (tier1000) return tier1000.salePrice;

  return firstEntry.tiers[0]?.salePrice ?? 0;
}
