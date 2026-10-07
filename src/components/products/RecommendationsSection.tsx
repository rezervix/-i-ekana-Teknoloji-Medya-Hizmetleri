"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Star } from "lucide-react";

interface ProductItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  images?: string[];
  category?: string;
  rating?: number;
}

export default function RecommendationsSection({
  productId,
  category,
}: {
  productId?: string;
  category?: string;
}) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const params = new URLSearchParams();
        if (productId) params.set("productId", productId);
        if (category) params.set("category", category);

        const res = await fetch(`/api/products/recommendations?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      } catch (err) {
        console.warn("[RecommendationsSection] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [productId, category]);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-14 pt-10 border-t border-corp-border/80">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-corp-charcoal">
              Bunlara da Bakabilirsin
            </h3>
            <p className="text-xs text-corp-gray">Müşterilerimizin birlikte en çok tercih ettiği ürünler</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => {
          const imgUrl = p.images?.[0] || "https://placehold.co/400x400?text=Ürün";
          return (
            <Link
              key={p.id}
              href={`/magaza/urun/${p.slug}`}
              className="group bg-white rounded-2xl border border-corp-border/70 p-4 hover:border-corp-teal/50 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-corp-surface mb-3 relative">
                  <img
                    src={imgUrl}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/400x400?text=Ürün";
                    }}
                  />
                </div>
                <div className="flex items-center gap-1 text-amber-500 text-xs mb-1 font-semibold">
                  <Star size={13} className="fill-amber-500" />
                  <span>{p.rating || 5}.0</span>
                </div>
                <h4 className="font-display font-bold text-sm text-corp-charcoal line-clamp-2 group-hover:text-corp-teal transition-colors">
                  {p.name}
                </h4>
              </div>
              <div className="mt-3 pt-3 border-t border-corp-border/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-corp-gray block font-body">Fiyat</span>
                  <span className="font-display font-bold text-sm sm:text-base text-corp-teal">
                    {Number(p.price).toLocaleString("tr-TR")} TL
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-corp-teal bg-corp-teal/5 px-2.5 py-1 rounded-lg group-hover:bg-corp-teal group-hover:text-white transition-colors">
                  İncele <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
