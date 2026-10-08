"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, Filter, ChevronDown, X, RotateCcw, ArrowUpDown, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { InteractiveCheckout, Product } from "@/components/ui/interactive-checkout";
import { trackViewItemList } from "@/lib/analytics";
import StoreFilterSidebar from "@/components/magaza/StoreFilterSidebar";
import {
  filterProducts,
  deriveStoreFilters,
  type FilterState,
  type SortOption,
} from "@/lib/magaza/filter";

const CATEGORIES = [
  { id: "Tümü", label: "Tüm Koleksiyon" },
  { id: "Medya", label: "Medya & Reklam" },
  { id: "Teknoloji", label: "Teknoloji" },
  { id: "Baski", label: "Kurumsal Kimlik & Baskı" },
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: "recommended", label: "Önerilen Sıralama" },
  { value: "price_asc", label: "Fiyat: Düşükten Yükseğe" },
  { value: "price_desc", label: "Fiyat: Yüksekten Düşüğe" },
  { value: "newest", label: "En Yeni Ürünler" },
];

export default function MagazaClient({ products }: { products: any[]; featuredProducts?: any[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Normalize products to InteractiveCheckout Product interface ─────────
  const storeProductsList: Product[] = useMemo(() => {
    if (products && products.length > 0) {
      return products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || "BASKI",
        image: p.images?.[0] || "/placeholder.webp",
        color: p.subcategory || "Standart Baskı",
        description: p.description,
        slug: p.slug,
        freeShipping: Boolean(p.freeShipping),
        customizationOptions: p.customizationOptions,
        priceMatrix: p.priceMatrix || p.customizationOptions?.priceMatrix,
        variantDimensions: p.variantDimensions || p.customizationOptions?.variantDimensions,
      }));
    }
    return [];
  }, [products]);

  // ── Initialize Filter State from URL Query Parameters ──────────────────
  const initialFilters = useMemo<FilterState>(() => {
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("kategori") || "Tümü";
    const sort = (searchParams.get("sirala") as SortOption) || "recommended";
    const freeShipping = searchParams.get("ucretsiz_kargo") === "1" ? true : undefined;
    const minPrice = searchParams.get("min_fiyat") ? Number(searchParams.get("min_fiyat")) : undefined;
    const maxPrice = searchParams.get("max_fiyat") ? Number(searchParams.get("max_fiyat")) : undefined;

    const dimensions: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith("dim_")) {
        const dimLabel = key.replace("dim_", "");
        dimensions[dimLabel] = value.split(",").filter(Boolean);
      }
    });

    return {
      q,
      category,
      sort,
      freeShipping,
      minPrice,
      maxPrice,
      dimensions: Object.keys(dimensions).length > 0 ? dimensions : undefined,
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.q || "");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(true);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Derived dynamic filter options from products ────────────────────────
  const derivedFilters = useMemo(() => {
    return deriveStoreFilters(storeProductsList, filters);
  }, [storeProductsList, filters]);

  // ── Filter and sort execution ───────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    return filterProducts(storeProductsList, filters);
  }, [storeProductsList, filters]);

  // ── URL Synchronization Helper ──────────────────────────────────────────
  const syncUrlParams = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams();
      if (newFilters.q?.trim()) params.set("q", newFilters.q.trim());
      if (newFilters.category && newFilters.category !== "Tümü") {
        params.set("kategori", newFilters.category);
      }
      if (newFilters.sort && newFilters.sort !== "recommended") {
        params.set("sirala", newFilters.sort);
      }
      if (newFilters.freeShipping) params.set("ucretsiz_kargo", "1");
      if (newFilters.minPrice !== undefined) params.set("min_fiyat", newFilters.minPrice.toString());
      if (newFilters.maxPrice !== undefined) params.set("max_fiyat", newFilters.maxPrice.toString());

      if (newFilters.dimensions) {
        for (const [label, vals] of Object.entries(newFilters.dimensions)) {
          if (vals && vals.length > 0) {
            params.set(`dim_${label}`, vals.join(","));
          }
        }
      }

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  const updateFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    syncUrlParams(newFilters);
  };

  // ── 250ms Debounced search handler ──────────────────────────────────────
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const next = { ...filters, q: val.trim() || undefined };
      updateFilters(next);
    }, 250);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const next = { ...filters, q: undefined };
    updateFilters(next);
  };

  // ── Scroll position restoration on mount ────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPos = sessionStorage.getItem("magaza_scroll_pos");
      if (savedPos) {
        const y = parseInt(savedPos, 10);
        if (!isNaN(y) && y > 0) {
          const timeoutId = setTimeout(() => {
            window.scrollTo({ top: y, behavior: "instant" });
            sessionStorage.removeItem("magaza_scroll_pos");
          }, 60);
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, []);

  // ── Reset all filters ───────────────────────────────────────────────────
  const handleResetFilters = () => {
    setSearchInput("");
    const resetState: FilterState = {
      q: undefined,
      category: "Tümü",
      sort: "recommended",
      freeShipping: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      dimensions: undefined,
    };
    updateFilters(resetState);
  };

  // ── Chip removal helpers ────────────────────────────────────────────────
  const removeDimensionChip = (dimLabel: string, val: string) => {
    const currentDims = { ...(filters.dimensions || {}) };
    if (currentDims[dimLabel]) {
      const filteredVals = currentDims[dimLabel].filter((v) => v !== val);
      if (filteredVals.length > 0) {
        currentDims[dimLabel] = filteredVals;
      } else {
        delete currentDims[dimLabel];
      }
      updateFilters({
        ...filters,
        dimensions: Object.keys(currentDims).length > 0 ? currentDims : undefined,
      });
    }
  };

  const activeChipCount =
    (filters.q ? 1 : 0) +
    (filters.category && filters.category !== "Tümü" ? 1 : 0) +
    (filters.freeShipping ? 1 : 0) +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0) +
    Object.values(filters.dimensions || {}).reduce((sum, arr) => sum + arr.length, 0);

  // ── Analytics ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (filteredProducts && filteredProducts.length > 0) {
      trackViewItemList(
        filteredProducts.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          category: p.category,
        })),
        filters.category || "Tüm Koleksiyon"
      );
    }
  }, [filters.category, filteredProducts]);

  return (
    <div className="bg-corp-surface min-h-screen pb-24">
      {/* Premium Dark Hero Section with Search Input */}
      <section className="relative pt-32 pb-20 overflow-hidden bg-bg-dark">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-bg-dark/90 via-bg-dark/70 to-bg-dark" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-corp-teal/20 rounded-full blur-[120px] pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-auxiliary/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6"
          >
            <span className="w-2 h-2 rounded-full bg-corp-teal animate-pulse" />
            <span className="font-body text-[11px] text-white/80 tracking-widest uppercase font-semibold">
              Interactive Checkout & Mağaza
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-6xl text-white font-bold tracking-tight mb-4"
          >
            Kurumsal <span className="text-transparent bg-clip-text bg-gradient-to-r from-corp-teal to-blue-400">Mağaza</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-body text-base md:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed mb-8"
          >
            İnteraktif sepet paneliyle ürünlerinizi anında inceleyin, sepetinize ekleyin ve saniyeler içinde ödemeye geçin.
          </motion.p>

          {/* 1. Full-Width Debounced Search Bar with Clear Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-2xl mx-auto relative group w-full"
          >
            <div className="absolute inset-0 bg-corp-teal/20 rounded-2xl blur-xl group-hover:bg-corp-teal/30 transition-all duration-500" />
            <div className="relative flex items-center bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-2 min-h-[52px]">
              <Search className="text-white/60 w-5 h-5 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="Örn: Kartvizit, Katalog, Broşür, Kuşe Kağıt..."
                value={searchInput}
                onChange={handleSearchChange}
                className="flex-1 bg-transparent border-none text-white placeholder-white/50 px-4 py-2.5 focus:outline-none text-base w-full"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white mr-2 transition-colors"
                  title="Aramayı temizle"
                >
                  <X size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const next = { ...filters, q: searchInput.trim() || undefined };
                  updateFilters(next);
                }}
                className="bg-corp-teal text-white px-5 py-2.5 rounded-xl font-bold hover:bg-corp-teal-600 transition-colors shadow-md text-sm shrink-0 min-h-[44px]"
              >
                Ara
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Interactive Shop & Filter Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 -mt-6 relative z-20">
        {/* Category & Control Bar */}
        <div className="bg-white dark:bg-corp-charcoal rounded-2xl shadow-sm border border-corp-border dark:border-white/10 p-4 mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Horizontal Category Selector */}
          <div className="flex overflow-x-auto hide-scrollbar w-full md:w-auto gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateFilters({ ...filters, category: cat.id })}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl font-display text-sm font-semibold transition-all duration-200 min-h-[44px] flex items-center ${
                  (filters.category || "Tümü") === cat.id
                    ? "bg-corp-teal text-white shadow-md"
                    : "text-corp-gray dark:text-white/70 hover:text-corp-charcoal dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Controls: Filter Toggle & Sort Dropdown */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsSortOpen((prev) => !prev)}
                className="flex items-center gap-2 text-corp-charcoal dark:text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-corp-border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[44px]"
              >
                <ArrowUpDown size={15} />
                <span className="hidden sm:inline">
                  {SORT_OPTIONS.find((s) => s.value === (filters.sort || "recommended"))?.label}
                </span>
                <span className="sm:hidden">Sırala</span>
                <ChevronDown size={14} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-52 bg-white dark:bg-corp-charcoal rounded-xl shadow-xl border border-corp-border dark:border-white/10 py-1.5 z-40"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          updateFilters({ ...filters, sort: opt.value });
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                          (filters.sort || "recommended") === opt.value
                            ? "text-corp-teal bg-corp-teal/5 font-bold"
                            : "text-corp-charcoal dark:text-white hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Filter Drawer Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 text-corp-charcoal dark:text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-corp-border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[44px]"
            >
              <Filter size={16} />
              <span>Filtrele</span>
              {activeChipCount > 0 && (
                <span className="bg-corp-teal text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {activeChipCount}
                </span>
              )}
            </button>

            {/* Desktop Sidebar Toggle Button */}
            <button
              onClick={() => setShowDesktopSidebar((prev) => !prev)}
              className="hidden lg:flex items-center gap-2 text-corp-charcoal dark:text-white text-sm font-semibold px-4 py-2.5 rounded-xl border border-corp-border dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors min-h-[44px]"
            >
              <Filter size={16} />
              <span>{showDesktopSidebar ? "Filtreleri Gizle" : "Filtreleri Göster"}</span>
            </button>
          </div>
        </div>

        {/* 4. Active Filter Chips & Result Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-corp-charcoal dark:text-white mr-1">
              {filteredProducts.length} ürün bulundu
            </span>

            {/* Active Chips */}
            {filters.q && (
              <span className="inline-flex items-center gap-1.5 bg-corp-teal/10 text-corp-teal text-xs font-semibold px-3 py-1 rounded-full border border-corp-teal/20">
                Arama: "{filters.q}"
                <button
                  onClick={handleClearSearch}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.category && filters.category !== "Tümü" && (
              <span className="inline-flex items-center gap-1.5 bg-corp-teal/10 text-corp-teal text-xs font-semibold px-3 py-1 rounded-full border border-corp-teal/20">
                Kategori: {filters.category}
                <button
                  onClick={() => updateFilters({ ...filters, category: "Tümü" })}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {filters.freeShipping && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
                Ücretsiz Kargo
                <button
                  onClick={() => updateFilters({ ...filters, freeShipping: undefined })}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <span className="inline-flex items-center gap-1.5 bg-corp-teal/10 text-corp-teal text-xs font-semibold px-3 py-1 rounded-full border border-corp-teal/20">
                Fiyat: {filters.minPrice ?? 0} ₺ - {filters.maxPrice ?? "∞"} ₺
                <button
                  onClick={() => updateFilters({ ...filters, minPrice: undefined, maxPrice: undefined })}
                  className="hover:text-red-500 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Dimension Chips */}
            {filters.dimensions &&
              Object.entries(filters.dimensions).map(([dimLabel, vals]) =>
                vals.map((v) => (
                  <span
                    key={`${dimLabel}-${v}`}
                    className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200"
                  >
                    {dimLabel}: {v}
                    <button
                      onClick={() => removeDimensionChip(dimLabel, v)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}

            {activeChipCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-corp-gray hover:text-corp-teal underline font-semibold ml-2 transition-colors"
              >
                Tümünü Temizle
              </button>
            )}
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        <AnimatePresence>
          {isMobileFilterOpen && (
            <StoreFilterSidebar
              derivedFilters={derivedFilters}
              filters={filters}
              onFilterChange={updateFilters}
              onReset={handleResetFilters}
              totalFilteredCount={filteredProducts.length}
              isMobile={true}
              onCloseMobile={() => setIsMobileFilterOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Layout: Sidebar + Product Grid / Empty State */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          {showDesktopSidebar && (
            <div className="hidden lg:block shrink-0">
              <StoreFilterSidebar
                derivedFilters={derivedFilters}
                filters={filters}
                onFilterChange={updateFilters}
                onReset={handleResetFilters}
                totalFilteredCount={filteredProducts.length}
                isMobile={false}
              />
            </div>
          )}

          {/* Product Grid Area or Empty State */}
          <div className="flex-1 w-full min-w-0">
            {filteredProducts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-corp-charcoal rounded-3xl border border-corp-border dark:border-white/10 shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-corp-teal/10 flex items-center justify-center text-corp-teal">
                  <Search size={32} />
                </div>
                <h3 className="font-display text-xl font-bold text-corp-charcoal dark:text-white mb-2">
                  Sonuç Bulunamadı
                </h3>
                <p className="text-sm text-corp-gray dark:text-white/60 max-w-md mx-auto mb-6">
                  Aramanız veya seçtiğiniz filtrelerle eşleşen ürün bulunamadı. Filtreleri temizleyebilir veya popüler kategorilere göz atabilirsiniz.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={handleResetFilters}
                    className="min-h-[44px] px-6 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-sm shadow-md hover:bg-corp-teal-600 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                  {CATEGORIES.filter((c) => c.id !== "Tümü").map((c) => (
                    <button
                      key={c.id}
                      onClick={() =>
                        updateFilters({
                          q: undefined,
                          category: c.id,
                          sort: "recommended",
                          freeShipping: undefined,
                          minPrice: undefined,
                          maxPrice: undefined,
                          dimensions: undefined,
                        })
                      }
                      className="min-h-[44px] px-4 py-2.5 rounded-xl border border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white font-semibold text-xs hover:border-corp-teal transition-colors"
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <InteractiveCheckout products={filteredProducts} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
