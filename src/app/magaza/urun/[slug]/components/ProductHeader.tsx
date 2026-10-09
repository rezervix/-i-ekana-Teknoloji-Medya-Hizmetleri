"use client";

import React, { useState, useEffect } from "react";
import { Star, Truck, Users } from "lucide-react";
import AdCongruentHeadline from "@/components/products/AdCongruentHeadline";
import { STORE_CONFIG } from "@/config/store";

interface ProductHeaderProps {
  product: any;
  avgRating: number;
  reviewCount: number;
  displayPrice: number;
  displayUnitPrice?: number;
  compareAtPrice?: number;
  onJumpToReviews?: () => void;
}

export default function ProductHeader({
  product,
  avgRating,
  reviewCount,
  displayPrice,
  displayUnitPrice,
  compareAtPrice = 0,
  onJumpToReviews,
}: ProductHeaderProps) {
  // Live viewer count simulation
  const [viewerCount, setViewerCount] = useState(() =>
    Math.floor(Math.random() * 2900) + 100
  );

  useEffect(() => {
    const updateInterval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.floor(Math.random() * 15) - 5;
        return Math.max(100, Math.min(3000, prev + change));
      });
    }, Math.random() * 10000 + 5000);
    return () => clearInterval(updateInterval);
  }, []);

  const hasDiscount = compareAtPrice > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - displayPrice) / compareAtPrice) * 100)
    : 0;

  return (
    <div className="space-y-4 mb-6">
      {/* UTM Dynamic Headline */}
      <AdCongruentHeadline productName={product.name} />

      {/* Product Title (h1) */}
      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-corp-charcoal tracking-tight">
        {product.name}
      </h1>

      {/* Rating & Review (Only shown if reviews exist) */}
      {reviewCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-200 dark:border-amber-800/40">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <span className="text-sm font-bold text-corp-charcoal dark:text-white">
              {avgRating.toFixed(1)}
            </span>
          </div>
          <button
            onClick={onJumpToReviews}
            className="text-xs text-corp-gray hover:text-corp-teal underline cursor-pointer font-medium transition-colors"
          >
            {reviewCount} Değerlendirme
          </button>
        </div>
      )}

      {/* Stock Status & Live Viewer Badges */}
      <div className="flex flex-wrap items-center gap-2.5">
        {product.stock === 0 ? (
          <div className="inline-flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border border-gray-200 dark:border-white/10">
            <span>Stok Dışı</span>
          </div>
        ) : typeof product.stock === "number" &&
          product.stock > 0 &&
          product.stock <= 5 ? (
          <div className="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Son {product.stock} adet stokta kaldı!</span>
          </div>
        ) : null}

        <div className="inline-flex items-center gap-2 bg-corp-teal/5 dark:bg-teal-950/30 border border-corp-teal/20 rounded-full px-3.5 py-1.5">
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />
          </div>
          <span className="text-xs font-semibold text-corp-teal dark:text-teal-300 flex items-center gap-1">
            <Users size={13} />
            {viewerCount} kişi görüntülüyor
          </span>
        </div>
      </div>

      {/* Price Presentation */}
      <div className="pt-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display text-3xl sm:text-4xl font-extrabold text-corp-teal dark:text-teal-300">
            {displayPrice.toLocaleString("tr-TR")} ₺
          </span>
          {hasDiscount && (
            <>
              <span className="line-through text-corp-gray text-lg font-normal">
                {compareAtPrice.toLocaleString("tr-TR")} ₺
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                %{discountPercent} İndirim
              </span>
            </>
          )}
          <span className="inline-block text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md border border-emerald-200">
            {STORE_CONFIG.vatNote}
          </span>
          {product.freeShipping && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 shadow-xs">
              <Truck size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Ücretsiz Kargo</span>
            </span>
          )}
        </div>

        {displayUnitPrice !== undefined && displayUnitPrice > 0 && (
          <p className="text-xs text-corp-gray dark:text-white/60 mt-1">
            Birim Fiyat:{" "}
            <span className="font-semibold text-corp-charcoal dark:text-white">
              {displayUnitPrice.toLocaleString("tr-TR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              ₺
            </span>
          </p>
        )}
      </div>

      {/* Short Description */}
      {product.description && (
        <p className="text-sm text-slate-700 leading-relaxed border-b border-corp-border pb-5">
          {product.description}
        </p>
      )}
    </div>
  );
}
