"use client";

import React from "react";
import { Star, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductReviewsSectionProps {
  reviews: any[];
  avgRating: number;
  onOpenReviewModal: () => void;
}

export default function ProductReviewsSection({
  reviews,
  avgRating,
  onOpenReviewModal,
}: ProductReviewsSectionProps) {
  return (
    <section id="reviews" className="my-12 pt-8 border-t border-corp-border dark:border-white/10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-corp-charcoal dark:text-white">
            Müşteri Değerlendirmeleri
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= Math.round(avgRating) ? "fill-amber-400" : "text-gray-300 dark:text-white/20"}
                />
              ))}
            </div>
            <span className="text-sm font-bold text-corp-charcoal dark:text-white">
              {avgRating > 0 ? avgRating.toFixed(1) : "5.0"}
            </span>
            <span className="text-xs text-corp-gray">({reviews.length} Değerlendirme)</span>
          </div>
        </div>

        <Button
          onClick={onOpenReviewModal}
          className="min-h-[44px] gap-2 bg-corp-teal hover:bg-corp-teal-600 text-white font-bold rounded-xl text-xs px-5 shadow-xs"
        >
          <MessageSquare size={15} />
          <span>Değerlendirme Yaz</span>
        </Button>
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-10 bg-corp-surface/50 dark:bg-white/5 rounded-2xl border border-corp-border/60 dark:border-white/10 text-corp-gray text-xs">
          Bu ürün için henüz değerlendirme yapılmamış. İlk değerlendirmeyi siz yazabilirsiniz!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-2xl bg-white dark:bg-corp-charcoal border border-corp-border dark:border-white/10 shadow-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-corp-charcoal dark:text-white">
                  {rev.guestName || rev.user?.name || "Müşteri"}
                </span>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={12}
                      className={s <= rev.rating ? "fill-amber-400" : "text-gray-200 dark:text-white/20"}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-corp-gray dark:text-white/70 leading-relaxed">
                {rev.comment || rev.text}
              </p>
              {rev.createdAt && (
                <div className="text-[10px] text-corp-gray/60 text-right">
                  {new Date(rev.createdAt).toLocaleDateString("tr-TR")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
