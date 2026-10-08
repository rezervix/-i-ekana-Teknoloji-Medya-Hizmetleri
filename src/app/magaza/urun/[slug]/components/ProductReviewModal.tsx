"use client";

import React from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rating: number;
  onRatingChange: (rating: number) => void;
  name: string;
  onNameChange: (name: string) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export default function ProductReviewModal({
  isOpen,
  onClose,
  rating,
  onRatingChange,
  name,
  onNameChange,
  comment,
  onCommentChange,
  onSubmit,
  isSubmitting,
}: ProductReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-white dark:bg-corp-charcoal rounded-3xl p-6 shadow-2xl border border-corp-border dark:border-white/10">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-corp-border/60">
          <h3 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
            Değerlendirme Yaz
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-corp-gray min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Kapat"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-corp-charcoal dark:text-white mb-2">
              Puanınız
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => onRatingChange(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label={`${star} yıldız`}
                >
                  <Star
                    size={26}
                    className={star <= rating ? "fill-amber-400" : "text-gray-300 dark:text-white/20"}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-corp-charcoal dark:text-white mb-1.5">
              Adınız Soyadınız
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Adınız Soyadınız"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal text-xs text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-bold text-corp-charcoal dark:text-white mb-1.5">
              Yorumunuz
            </label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Ürün ve hizmet kalitesi hakkındaki deneyiminiz..."
              className="w-full p-3 rounded-xl border border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal text-xs text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold text-corp-gray hover:bg-gray-100 dark:hover:bg-white/10"
            >
              Vazgeç
            </button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 bg-corp-teal hover:bg-corp-teal-600 text-white font-bold rounded-xl text-xs"
            >
              {isSubmitting ? "Gönderiliyor..." : "Yorumu Yayınla"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
