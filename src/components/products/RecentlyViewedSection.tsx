"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowRight, ShoppingBag } from "lucide-react";
import { getRecentlyViewed, RecentlyViewedItem } from "@/lib/recently-viewed";

export default function RecentlyViewedSection({ currentSlug }: { currentSlug?: string }) {
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const recent = getRecentlyViewed(currentSlug);
    setItems(recent.slice(0, 6));
  }, [currentSlug]);

  if (!mounted || items.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 pt-12 border-t border-corp-border/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-corp-teal/10 text-corp-teal">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-corp-charcoal">
              Son Baktığın Ürünler
            </h3>
            <p className="text-xs text-corp-gray">Tarayıcınızda en son incelediğiniz tasarımlar</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/magaza/urun/${item.slug}`}
            className="group bg-white rounded-2xl border border-corp-border/70 p-3 hover:border-corp-teal/50 hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-corp-surface mb-2.5 relative">
                <img
                  src={item.image || "https://placehold.co/300x300?text=Ürün"}
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=Ürün";
                  }}
                />
              </div>
              <h4 className="font-display font-semibold text-xs sm:text-sm text-corp-charcoal line-clamp-2 group-hover:text-corp-teal transition-colors">
                {item.name}
              </h4>
            </div>
            <div className="mt-2.5 pt-2 border-t border-corp-border/40 flex items-center justify-between">
              <span className="font-display font-bold text-xs sm:text-sm text-corp-teal">
                {Number(item.price).toLocaleString("tr-TR")} TL
              </span>
              <span className="text-[10px] text-corp-gray group-hover:text-corp-teal flex items-center gap-0.5 font-medium">
                İncele <ArrowRight size={10} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
