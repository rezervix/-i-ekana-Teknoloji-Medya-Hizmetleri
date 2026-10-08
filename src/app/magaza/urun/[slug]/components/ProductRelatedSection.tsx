"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Truck } from "lucide-react";
import RecentlyViewedSection from "@/components/products/RecentlyViewedSection";
import RecommendationsSection from "@/components/products/RecommendationsSection";

interface ProductRelatedSectionProps {
  relatedProducts: any[];
  currentProductId: string;
}

export default function ProductRelatedSection({
  relatedProducts,
  currentProductId,
}: ProductRelatedSectionProps) {
  return (
    <div className="space-y-12 my-12">
      {/* 1. Benzer Ürünler (Aynı Kategoriden) */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-corp-charcoal dark:text-white">
              Benzer Ürünler
            </h2>
            <Link
              href="/magaza"
              className="text-xs font-bold text-corp-teal hover:underline flex items-center gap-1"
            >
              <span>Tümünü Gör</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((p) => {
              const img = p.images?.[0] || "/placeholder.webp";
              return (
                <Link
                  key={p.id}
                  href={`/magaza/urun/${p.slug}`}
                  className="group flex flex-col p-3 rounded-2xl bg-white dark:bg-corp-charcoal border border-corp-border dark:border-white/10 hover:border-corp-teal transition-all shadow-xs hover:shadow-md"
                >
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-50 dark:bg-white/5 mb-3">
                    <Image
                      src={img}
                      alt={p.name}
                      fill
                      sizes="220px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {p.freeShipping && (
                      <div className="absolute top-2 right-2">
                        <span className="p-1 rounded-md bg-emerald-600 text-white shadow text-[10px] flex items-center gap-1">
                          <Truck size={10} />
                        </span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-display text-xs sm:text-sm font-bold text-corp-charcoal dark:text-white truncate group-hover:text-corp-teal transition-colors mb-1">
                    {p.name}
                  </h3>
                  <div className="mt-auto pt-2 border-t border-corp-border/40 flex items-baseline justify-between">
                    <span className="font-display text-sm font-extrabold text-corp-teal dark:text-teal-300">
                      {p.price.toLocaleString("tr-TR")} ₺
                    </span>
                    <span className="text-[10px] text-corp-gray">KDV Dahil</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Son Baktığın Ürünler (Browser Storage) */}
      <RecentlyViewedSection />

      {/* 3. Bunlara da Bakabilirsin (Öneriler) */}
      <RecommendationsSection productId={currentProductId} />
    </div>
  );
}
