"use client";

import React from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { type DerivedFilters, type FilterState } from "@/lib/magaza/filter";

interface StoreFilterSidebarProps {
  derivedFilters: DerivedFilters;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount: number;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export default function StoreFilterSidebar({
  derivedFilters,
  filters,
  onFilterChange,
  onReset,
  totalFilteredCount,
  isMobile = false,
  onCloseMobile,
}: StoreFilterSidebarProps) {
  const { minPrice: globalMin, maxPrice: globalMax, freeShippingCount, dimensionGroups } = derivedFilters;

  const handleFreeShippingToggle = () => {
    onFilterChange({
      ...filters,
      freeShipping: !filters.freeShipping ? true : undefined,
    });
  };

  const handleDimensionToggle = (dimLabel: string, value: string) => {
    const currentDims = { ...(filters.dimensions || {}) };
    const currentList = currentDims[dimLabel] || [];

    let newList: string[];
    if (currentList.includes(value)) {
      newList = currentList.filter((v) => v !== value);
    } else {
      newList = [...currentList, value];
    }

    if (newList.length === 0) {
      delete currentDims[dimLabel];
    } else {
      currentDims[dimLabel] = newList;
    }

    onFilterChange({
      ...filters,
      dimensions: Object.keys(currentDims).length > 0 ? currentDims : undefined,
    });
  };

  const handlePriceChange = (type: "min" | "max", valStr: string) => {
    const val = valStr === "" ? undefined : Number(valStr);
    onFilterChange({
      ...filters,
      [type === "min" ? "minPrice" : "maxPrice"]: val,
    });
  };

  const content = (
    <div className="space-y-6">
      {/* Header for Mobile Drawer */}
      {isMobile && (
        <div className="flex items-center justify-between pb-4 border-b border-corp-border dark:border-white/10">
          <h2 className="font-display font-bold text-lg text-corp-charcoal dark:text-white">
            Filtreler
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="text-xs text-corp-gray hover:text-corp-teal flex items-center gap-1 font-semibold"
            >
              <RotateCcw size={12} /> Temizle
            </button>
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-corp-charcoal dark:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* 1. Ücretsiz Kargo */}
      <div className="pb-5 border-b border-corp-border/60 dark:border-white/10">
        <h3 className="font-display text-sm font-bold text-corp-charcoal dark:text-white mb-3">
          Kargo Seçeneği
        </h3>
        <label className="flex items-center justify-between cursor-pointer p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <span className="flex items-center gap-2.5 text-sm font-medium text-corp-charcoal dark:text-white">
            <input
              type="checkbox"
              checked={Boolean(filters.freeShipping)}
              onChange={handleFreeShippingToggle}
              className="w-4 h-4 rounded text-corp-teal focus:ring-corp-teal border-corp-border"
            />
            Ücretsiz Kargo
          </span>
          <span className="text-xs font-semibold text-corp-gray dark:text-white/50 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
            {freeShippingCount}
          </span>
        </label>
      </div>

      {/* 2. Fiyat Aralığı */}
      <div className="pb-5 border-b border-corp-border/60 dark:border-white/10">
        <h3 className="font-display text-sm font-bold text-corp-charcoal dark:text-white mb-3">
          Fiyat Aralığı (TL)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={`Min (${globalMin} ₺)`}
            value={filters.minPrice ?? ""}
            onChange={(e) => handlePriceChange("min", e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
          />
          <span className="text-corp-gray">-</span>
          <input
            type="number"
            placeholder={`Max (${globalMax} ₺)`}
            value={filters.maxPrice ?? ""}
            onChange={(e) => handlePriceChange("max", e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
          />
        </div>
      </div>

      {/* 3. Gerçek variantDimensions'tan türetilen dinamik filtre grupları */}
      {dimensionGroups.map((group) => {
        const selectedForGroup = filters.dimensions?.[group.label] || [];

        return (
          <div
            key={group.label}
            className="pb-5 border-b border-corp-border/60 dark:border-white/10"
          >
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display text-sm font-bold text-corp-charcoal dark:text-white">
                {group.label}
              </h3>
              {selectedForGroup.length > 0 && (
                <span className="text-[11px] font-bold text-corp-teal">
                  ({selectedForGroup.length} seçili)
                </span>
              )}
            </div>

            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {group.options.map((opt) => {
                const isSelected = selectedForGroup.includes(opt.value);
                const isDisabled = opt.count === 0 && !isSelected;

                return (
                  <label
                    key={opt.value}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isDisabled
                        ? "opacity-40 cursor-not-allowed bg-transparent text-gray-400"
                        : isSelected
                          ? "bg-corp-teal/10 text-corp-teal font-semibold"
                          : "hover:bg-gray-50 dark:hover:bg-white/5 text-corp-charcoal dark:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate pr-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={() => handleDimensionToggle(group.label, opt.value)}
                        className="w-3.5 h-3.5 rounded text-corp-teal focus:ring-corp-teal border-corp-border"
                      />
                      <span className="truncate">{opt.value}</span>
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-corp-teal text-white font-bold"
                          : "bg-gray-100 dark:bg-white/10 text-corp-gray dark:text-white/60"
                      }`}
                    >
                      {opt.count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Desktop Reset Button */}
      {!isMobile && (
        <button
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-corp-border dark:border-white/10 text-xs font-bold text-corp-gray hover:text-corp-teal hover:border-corp-teal transition-colors"
        >
          <RotateCcw size={14} /> Filtreleri Temizle
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-corp-charcoal rounded-t-3xl max-h-[85vh] flex flex-col p-6 shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          <div className="flex-1 overflow-y-auto pb-6">{content}</div>
          {/* Fixed bottom button on mobile: min 44px touch height */}
          <div className="pt-4 border-t border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal">
            <button
              onClick={onCloseMobile}
              className="w-full min-h-[48px] bg-corp-teal hover:bg-corp-teal-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center text-sm"
            >
              Sonuçları Göster ({totalFilteredCount})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-64 shrink-0 bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-corp-border/60 dark:border-white/10">
        <h2 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
          Filtreler
        </h2>
        <span className="text-xs font-semibold text-corp-teal">
          {totalFilteredCount} Ürün
        </span>
      </div>
      {content}
    </aside>
  );
}
