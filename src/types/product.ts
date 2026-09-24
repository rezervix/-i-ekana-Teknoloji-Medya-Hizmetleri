/**
 * Ürün varyant sistemi için TypeScript interface'leri.
 *
 * YENİ FORMAT (CSV'den içe aktarılan ürünler):
 *   customizationOptions.variantDimensions + priceMatrix
 *
 * ESKİ FORMAT (geriye dönük uyumluluk):
 *   customizationOptions.variants  →  [{quantity, material, salePrice, ...}]
 *   customizationOptions Array     →  [{id, label, type, enabled, ...}]
 */

// ─── Yeni Format ──────────────────────────────────────────────────────────────

/**
 * Bir varyant boyutu (örn. Kesim Türü, Kağıt Cinsi, Selefon Türü).
 * Her boyut bir "Özellik_N" CSV sütununa karşılık gelir.
 */
export interface VariantDimension {
  /** CSV sütun adından türetilen stabil anahtar (örn. "ozellik_8") */
  key: string;
  /** Gösterilen etiket (örn. "Kesim Türü") */
  label: string;
  /**
   * Etiket otomatik tahmin edildiyse true, admin değiştirdiyse false.
   * Admin panelinde autoDetected=true ise açık renk placeholder gösterilir.
   */
  autoDetected: boolean;
  /** Bu boyuttaki tüm olası değerler (CSV'den derlenir) */
  options: string[];
}

/** Tek bir adet kademesi için fiyat bilgisi */
export interface PriceTier {
  quantity: number;
  /** Ham maliyet — KDV hariç toplam (TL) */
  totalCost: number;
  /** Ham birim maliyet — KDV hariç birim (TL) */
  unitCost: number;
  /** Hesaplanmış satış fiyatı (kar marjı + yuvarlama uygulanmış) */
  salePrice: number;
  /** Hesaplanmış birim satış fiyatı */
  unitSalePrice: number;
}

/**
 * Belirli bir varyant kombinasyonuna (packageId) ait fiyat matrisi satırı.
 * dimensionValues: hangi Özellik_N değerleri bu kombinasyonu oluşturuyor.
 */
export interface PriceMatrixEntry {
  packageId: string;
  /** { ozellik_8: "Oval Kesim", ozellik_7: "250 gr. Bristol", ... } */
  dimensionValues: Record<string, string>;
  tiers: PriceTier[];
}

/** Yeni format customizationOptions yapısı */
export interface NewFormatCustomizationOptions {
  variantDimensions: VariantDimension[];
  priceMatrix: PriceMatrixEntry[];
}

// ─── Eski Formatlar (Geriye Dönük Uyumluluk) ─────────────────────────────────

/** Eski CSV import formatındaki variant satırı */
export interface LegacyVariant {
  quantity: number;
  material?: string;
  unitCost?: number;
  totalCost?: number;
  salePrice: number;
  unitSalePrice?: number;
}

/** Eski customizationOptions — variants dizisi içeren obje */
export interface LegacyVariantsOptions {
  id?: string;
  label?: string;
  type?: string;
  enabled?: boolean;
  variantAttributes?: Record<string, string>;
  variants: LegacyVariant[];
}

/** Eski customizationOptions — tek seçenek objesi (array elemanı) */
export interface LegacyOptionItem {
  id: string;
  label: string;
  type: "text" | "textarea" | "color_picker" | "date" | "image_upload" | "file_upload";
  enabled: boolean;
}

/** customizationOptions için birleşik tip */
export type ProductCustomizationOptions =
  | NewFormatCustomizationOptions
  | LegacyVariantsOptions
  | LegacyOptionItem[]
  | null;

// ─── Type Guard'lar ────────────────────────────────────────────────────────────

export function isNewFormat(
  opts: ProductCustomizationOptions
): opts is NewFormatCustomizationOptions {
  return (
    opts !== null &&
    !Array.isArray(opts) &&
    "variantDimensions" in opts &&
    Array.isArray((opts as NewFormatCustomizationOptions).variantDimensions)
  );
}

export function isLegacyVariantsFormat(
  opts: ProductCustomizationOptions
): opts is LegacyVariantsOptions {
  return (
    opts !== null &&
    !Array.isArray(opts) &&
    !("variantDimensions" in opts) &&
    "variants" in opts &&
    Array.isArray((opts as LegacyVariantsOptions).variants)
  );
}

export function isLegacyOptionsArray(
  opts: ProductCustomizationOptions
): opts is LegacyOptionItem[] {
  return Array.isArray(opts);
}

// ─── CartItem Uzantısı ────────────────────────────────────────────────────────

/** Sepete eklenirken oluşturulan varyant seçim kaydı */
export interface VariantSelection {
  /** Seçilen dimension değerleri { ozellik_8: "Oval Kesim", ... } */
  dimensionValues: Record<string, string>;
  /** Seçilen adet miktarı */
  selectedQuantity: number;
  /** Seçilen packageId */
  packageId?: string;
  /** Hesaplanmış satış fiyatı (anlık snapshot) */
  salePrice: number;
  /** Birim satış fiyatı */
  unitSalePrice?: number;
}
