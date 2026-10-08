/**
 * Pure calculation functions for Product Detail Page
 * Handles variant dimension matching, price matrix tier selection,
 * legacy fallback, and photo-to-design fee calculation.
 */

import type {
  PriceMatrixEntry,
  PriceTier,
  LegacyVariant,
  VariantDimension,
} from "@/types/product";

export interface DetailCalculationInput {
  mode: "new" | "legacy_variants" | "legacy_options" | "none";
  selectedDimensions?: Record<string, string>;
  selectedQuantity?: number;
  priceMatrix?: PriceMatrixEntry[];
  legacyVariants?: LegacyVariant[];
  selectedMaterial?: string;
  basePrice: number;
  selectedDesignMethod?: "upload" | "photo_to_design" | "template" | null;
  photoToDesignFee?: number | null;
}

export interface DetailCalculationResult {
  matchedEntry?: PriceMatrixEntry;
  availableTiers: PriceTier[];
  selectedTier?: PriceTier;
  displayPrice: number;
  unitPrice?: number;
  designFee: number;
  totalPrice: number;
  isValid: boolean;
  error?: string;
}

/**
 * Finds the matching priceMatrix entry based on selected dimension values.
 */
export function findMatchingPriceMatrixEntry(
  priceMatrix: PriceMatrixEntry[] | undefined,
  selectedDimensions: Record<string, string> | undefined
): PriceMatrixEntry | undefined {
  if (!priceMatrix || !selectedDimensions) return undefined;

  return priceMatrix.find((entry) => {
    return Object.entries(entry.dimensionValues).every(
      ([key, val]) => selectedDimensions[key] === val
    );
  });
}

/**
 * Pure calculation function for product detail pricing.
 */
export function calculateDetailPrice(
  input: DetailCalculationInput
): DetailCalculationResult {
  const {
    mode,
    selectedDimensions = {},
    selectedQuantity = 0,
    priceMatrix = [],
    legacyVariants = [],
    selectedMaterial = "",
    basePrice,
    selectedDesignMethod = null,
    photoToDesignFee = 500,
  } = input;

  const effectivePhotoFee =
    selectedDesignMethod === "photo_to_design" ? (photoToDesignFee ?? 500) : 0;

  // 1. YENİ FORMAT (priceMatrix + variantDimensions)
  if (mode === "new" && priceMatrix.length > 0) {
    const matchedEntry = findMatchingPriceMatrixEntry(priceMatrix, selectedDimensions);
    const availableTiers = matchedEntry?.tiers || [];

    if (!matchedEntry) {
      return {
        matchedEntry: undefined,
        availableTiers: [],
        displayPrice: basePrice,
        designFee: effectivePhotoFee,
        totalPrice: basePrice + effectivePhotoFee,
        isValid: false,
        error: "Seçilen varyant kombinasyonu için geçerli bir fiyat bulunamadı.",
      };
    }

    const selectedTier =
      availableTiers.find((t) => t.quantity === selectedQuantity) || availableTiers[0];

    const displayPrice = selectedTier?.salePrice ?? basePrice;
    const unitPrice = selectedTier?.unitSalePrice;
    const totalPrice = displayPrice + effectivePhotoFee;

    return {
      matchedEntry,
      availableTiers,
      selectedTier,
      displayPrice,
      unitPrice,
      designFee: effectivePhotoFee,
      totalPrice,
      isValid: true,
    };
  }

  // 2. ESKİ FORMAT (legacyVariants)
  if (mode === "legacy_variants" && legacyVariants.length > 0) {
    const availableForMaterial = legacyVariants.filter(
      (v) => !selectedMaterial || v.material === selectedMaterial
    );

    const matchedVariant =
      availableForMaterial.find((v) => v.quantity === selectedQuantity) ||
      availableForMaterial[0] ||
      legacyVariants[0];

    const displayPrice = matchedVariant?.salePrice ?? basePrice;
    const unitPrice = matchedVariant?.unitSalePrice;
    const totalPrice = displayPrice + effectivePhotoFee;

    return {
      availableTiers: [],
      displayPrice,
      unitPrice,
      designFee: effectivePhotoFee,
      totalPrice,
      isValid: true,
    };
  }

  // 3. STANDART / NO VARIANTS
  const displayPrice = basePrice;
  const totalPrice = displayPrice + effectivePhotoFee;

  return {
    availableTiers: [],
    displayPrice,
    designFee: effectivePhotoFee,
    totalPrice,
    isValid: true,
  };
}
