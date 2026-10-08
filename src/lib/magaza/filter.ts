/**
 * Pure filtering and sorting engine for /magaza.
 * Can be run client-side or easily moved to server-side.
 */

import { getCardPriceDisplay } from "./product-card";

export type SortOption = "recommended" | "price_asc" | "price_desc" | "newest";

export interface FilterState {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  freeShipping?: boolean;
  dimensions?: Record<string, string[]>; // e.g. { "Kağıt Cinsi": ["350 gr. Kuşe"] }
  sort?: SortOption;
}

export interface DimensionFilterGroup {
  label: string;
  options: Array<{
    value: string;
    count: number;
    disabled: boolean;
  }>;
}

export interface DerivedFilters {
  categories: Array<{ id: string; label: string; count: number }>;
  minPrice: number;
  maxPrice: number;
  freeShippingCount: number;
  dimensionGroups: DimensionFilterGroup[];
}

/**
 * Normalizes Turkish text for case and diacritic-insensitive comparisons.
 * Converts:
 *  ç -> c, ğ -> g, ı -> i, İ -> i, ö -> o, ş -> s, ü -> u
 * Also handles standard lowercase.
 */
export function normalizeTurkishText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "ı")
    .toLowerCase()
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .trim();
}

/**
 * Gets the effective price of a product for filtering and sorting purposes.
 */
export function getProductEffectivePrice(product: any): number {
  const cardPrice = getCardPriceDisplay(product);
  return cardPrice.displayPrice || product.price || 0;
}

/**
 * Derives available filter options and counts dynamically from the given products list.
 */
export function deriveStoreFilters(
  allProducts: any[],
  currentFilters?: FilterState
): DerivedFilters {
  let minPrice = Infinity;
  let maxPrice = 0;
  let freeShippingCount = 0;

  // Category counts
  const categoryCountMap: Record<string, number> = {};

  // Dimension groups: map of dimension label -> Map of option value -> count
  const dimensionGroupsMap: Record<string, Record<string, number>> = {};

  for (const product of allProducts) {
    const price = getProductEffectivePrice(product);
    if (price < minPrice) minPrice = price;
    if (price > maxPrice) maxPrice = price;

    if (product.freeShipping) {
      freeShippingCount++;
    }

    const cat = product.category || "Diğer";
    categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;

    // Extract variant dimensions
    const dims =
      product.variantDimensions ||
      product.customizationOptions?.variantDimensions ||
      [];

    if (Array.isArray(dims)) {
      for (const dim of dims) {
        if (!dim || !dim.label || !Array.isArray(dim.options)) continue;
        const label = dim.label.trim();
        // Ignore generic placeholders like "Seçenek 4" if not meaningful, but include recognizable specs
        if (!dimensionGroupsMap[label]) {
          dimensionGroupsMap[label] = {};
        }
        for (const opt of dim.options) {
          const optVal = String(opt).trim();
          if (optVal) {
            dimensionGroupsMap[label][optVal] =
              (dimensionGroupsMap[label][optVal] || 0) + 1;
          }
        }
      }
    }
  }

  if (minPrice === Infinity) minPrice = 0;

  const categories = [
    { id: "Tümü", label: "Tüm Koleksiyon", count: allProducts.length },
    ...Object.entries(categoryCountMap).map(([cat, count]) => ({
      id: cat,
      label: cat,
      count,
    })),
  ];

  const dimensionGroups: DimensionFilterGroup[] = Object.entries(
    dimensionGroupsMap
  ).map(([label, optionsMap]) => ({
    label,
    options: Object.entries(optionsMap).map(([value, count]) => ({
      value,
      count,
      disabled: count === 0,
    })),
  }));

  return {
    categories,
    minPrice,
    maxPrice,
    freeShippingCount,
    dimensionGroups,
  };
}

/**
 * Filter and sort products based on FilterState.
 */
export function filterProducts(products: any[], filters: FilterState): any[] {
  if (!products || products.length === 0) return [];

  const normalizedQuery = normalizeTurkishText(filters.q);
  const selectedCategory = filters.category?.trim();
  const isAllCategory =
    !selectedCategory ||
    selectedCategory === "Tümü" ||
    normalizeTurkishText(selectedCategory) === "tumu";

  const filtered = products.filter((p) => {
    // 1. Text search
    if (normalizedQuery) {
      const nameNorm = normalizeTurkishText(p.name);
      const catNorm = normalizeTurkishText(p.category);
      const descNorm = normalizeTurkishText(p.description);
      const subNorm = normalizeTurkishText(p.color || p.subcategory);

      let dimsMatch = false;
      const dims =
        p.variantDimensions ||
        p.customizationOptions?.variantDimensions ||
        [];
      if (Array.isArray(dims)) {
        for (const dim of dims) {
          if (Array.isArray(dim.options)) {
            for (const opt of dim.options) {
              if (normalizeTurkishText(opt).includes(normalizedQuery)) {
                dimsMatch = true;
                break;
              }
            }
          }
          if (dimsMatch) break;
        }
      }

      const matchesText =
        nameNorm.includes(normalizedQuery) ||
        catNorm.includes(normalizedQuery) ||
        descNorm.includes(normalizedQuery) ||
        subNorm.includes(normalizedQuery) ||
        dimsMatch;

      if (!matchesText) return false;
    }

    // 2. Category filter
    if (!isAllCategory) {
      const pCat = normalizeTurkishText(p.category);
      const filterCat = normalizeTurkishText(selectedCategory);
      if (pCat !== filterCat) {
        return false;
      }
    }

    // 3. Free shipping filter
    if (filters.freeShipping && !p.freeShipping) {
      return false;
    }

    // 4. Price range filter
    const effectivePrice = getProductEffectivePrice(p);
    if (filters.minPrice !== undefined && effectivePrice < filters.minPrice) {
      return false;
    }
    if (filters.maxPrice !== undefined && effectivePrice > filters.maxPrice) {
      return false;
    }

    // 5. Dimension filters
    if (filters.dimensions && Object.keys(filters.dimensions).length > 0) {
      const dims =
        p.variantDimensions ||
        p.customizationOptions?.variantDimensions ||
        [];

      for (const [dimLabel, selectedValues] of Object.entries(filters.dimensions)) {
        if (!selectedValues || selectedValues.length === 0) continue;

        // Find dimension in product matching label
        const matchedDim = dims.find(
          (d: any) =>
            normalizeTurkishText(d.label) === normalizeTurkishText(dimLabel)
        );

        if (!matchedDim || !Array.isArray(matchedDim.options)) {
          return false;
        }

        // Product must have at least one of the selected values
        const hasMatchingValue = selectedValues.some((sv) =>
          matchedDim.options.some(
            (opt: string) => normalizeTurkishText(opt) === normalizeTurkishText(sv)
          )
        );

        if (!hasMatchingValue) {
          return false;
        }
      }
    }

    return true;
  });

  // Sorting
  const sort = filters.sort || "recommended";
  const sorted = [...filtered];

  switch (sort) {
    case "price_asc":
      sorted.sort((a, b) => getProductEffectivePrice(a) - getProductEffectivePrice(b));
      break;
    case "price_desc":
      sorted.sort((a, b) => getProductEffectivePrice(b) - getProductEffectivePrice(a));
      break;
    case "newest":
      sorted.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      break;
    case "recommended":
    default:
      // Keep natural order or prioritizes featured
      sorted.sort((a, b) => {
        const featA = a.isFeatured ? 1 : 0;
        const featB = b.isFeatured ? 1 : 0;
        return featB - featA;
      });
      break;
  }

  return sorted;
}
