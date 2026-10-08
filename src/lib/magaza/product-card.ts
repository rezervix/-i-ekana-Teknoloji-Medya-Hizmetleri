/**
 * Helper utilities for Store Product Cards
 * Handles options detection, price matrix calculation, and formatting.
 */

import {
  isNewFormat,
  isLegacyVariantsFormat,
  isLegacyOptionsArray,
  type PriceTier,
} from "@/types/product";

export interface CardPriceInfo {
  displayPrice: number;
  formattedPrice: string;
  startingText: string | null;
  minQuantity: number | null;
  unitPrice: number | null;
  isMatrix: boolean;
  vatNote: string;
}

/**
 * Determines whether a product requires user customization / option selection
 * before it can be added to the cart.
 *
 * Returns TRUE if:
 * - New format: variantDimensions exists with at least 1 option, or priceMatrix has entries
 * - Legacy format: variants array with entries
 * - Legacy customization options array: has any enabled customization fields
 *
 * Returns FALSE for simple standalone products without variants or required customization.
 */
export function requiresOptions(product: any): boolean {
  if (!product) return false;

  const rawOpts = product.customizationOptions ?? null;

  // 1. Direct fields if flattened
  if (Array.isArray(product.variantDimensions) && product.variantDimensions.length > 0) {
    return true;
  }
  if (Array.isArray(product.priceMatrix) && product.priceMatrix.length > 0) {
    return true;
  }

  // 2. New format inside customizationOptions
  if (isNewFormat(rawOpts)) {
    const hasDimensions =
      Array.isArray(rawOpts.variantDimensions) && rawOpts.variantDimensions.length > 0;
    const hasMatrix =
      Array.isArray(rawOpts.priceMatrix) && rawOpts.priceMatrix.length > 0;
    if (hasDimensions || hasMatrix) {
      return true;
    }
  }

  // 3. Legacy variants format
  if (isLegacyVariantsFormat(rawOpts)) {
    if (Array.isArray(rawOpts.variants) && rawOpts.variants.length > 0) {
      return true;
    }
  }

  // 4. Legacy customization options array (text, photo, date, etc.)
  if (isLegacyOptionsArray(rawOpts)) {
    const activeOptions = rawOpts.filter((opt: any) => opt && opt.enabled !== false);
    if (activeOptions.length > 0) {
      return true;
    }
  }

  // 5. Check if raw customizationOptions is a non-empty object with variant keys
  if (rawOpts && typeof rawOpts === "object" && !Array.isArray(rawOpts)) {
    if (
      Array.isArray(rawOpts.variantDimensions) &&
      rawOpts.variantDimensions.length > 0
    ) {
      return true;
    }
    if (Array.isArray(rawOpts.priceMatrix) && rawOpts.priceMatrix.length > 0) {
      return true;
    }
    if (Array.isArray(rawOpts.variants) && rawOpts.variants.length > 0) {
      return true;
    }
  }

  return false;
}

/**
 * Calculates and formats price information for a store product card.
 * If priceMatrix is populated, derives starting price and quantity from the lowest tier.
 * Otherwise, falls back to product.price.
 * All prices are formatted in TRY with "KDV Dahil".
 */
export function getCardPriceDisplay(product: any): CardPriceInfo {
  const vatNote = "KDV Dahil";

  if (!product) {
    return {
      displayPrice: 0,
      formattedPrice: "0 ₺",
      startingText: null,
      minQuantity: null,
      unitPrice: null,
      isMatrix: false,
      vatNote,
    };
  }

  // Extract priceMatrix if available
  const matrix =
    product.priceMatrix ||
    product.customizationOptions?.priceMatrix ||
    null;

  if (Array.isArray(matrix) && matrix.length > 0) {
    // Collect all tiers across all package combinations
    const allTiers: PriceTier[] = [];
    for (const entry of matrix) {
      if (Array.isArray(entry.tiers)) {
        for (const tier of entry.tiers) {
          if (typeof tier.salePrice === "number" && tier.salePrice > 0) {
            allTiers.push(tier);
          }
        }
      }
    }

    if (allTiers.length > 0) {
      // Find tier with minimum salePrice
      let minTier = allTiers[0];
      for (const t of allTiers) {
        if (t.salePrice < minTier.salePrice) {
          minTier = t;
        }
      }

      const displayPrice = minTier.salePrice;
      const formattedPrice = `${displayPrice.toLocaleString("tr-TR")} ₺`;
      const minQuantity = minTier.quantity;
      const unitPrice = minTier.unitSalePrice ?? null;
      const startingText = `${minQuantity.toLocaleString("tr-TR")} adet ${formattedPrice}'den başlayan fiyatlarla`;

      return {
        displayPrice,
        formattedPrice,
        startingText,
        minQuantity,
        unitPrice,
        isMatrix: true,
        vatNote,
      };
    }
  }

  // Legacy variants fallback
  const legacyVariants =
    product.variants ||
    product.customizationOptions?.variants ||
    null;

  if (Array.isArray(legacyVariants) && legacyVariants.length > 0) {
    let minVariant = legacyVariants[0];
    for (const v of legacyVariants) {
      if (typeof v.salePrice === "number" && v.salePrice < (minVariant.salePrice || Infinity)) {
        minVariant = v;
      }
    }

    if (minVariant && typeof minVariant.salePrice === "number") {
      const displayPrice = minVariant.salePrice;
      const formattedPrice = `${displayPrice.toLocaleString("tr-TR")} ₺`;
      const minQuantity = minVariant.quantity || null;
      const startingText = minQuantity
        ? `${minQuantity.toLocaleString("tr-TR")} adet ${formattedPrice}'den başlayan fiyatlarla`
        : `${formattedPrice}'den başlayan fiyatlarla`;

      return {
        displayPrice,
        formattedPrice,
        startingText,
        minQuantity,
        unitPrice: minVariant.unitSalePrice ?? null,
        isMatrix: true,
        vatNote,
      };
    }
  }

  // Standard fallback
  const displayPrice = Number(product.price) || 0;
  const formattedPrice = `${displayPrice.toLocaleString("tr-TR")} ₺`;

  return {
    displayPrice,
    formattedPrice,
    startingText: null,
    minQuantity: null,
    unitPrice: null,
    isMatrix: false,
    vatNote,
  };
}
