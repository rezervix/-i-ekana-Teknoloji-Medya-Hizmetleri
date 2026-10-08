"use client";

import React from "react";
import { ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StickyMobileBarProps {
  show: boolean;
  productName: string;
  totalPrice: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  stock?: number | null;
}

export default function StickyMobileBar({
  show,
  productName,
  totalPrice,
  onAddToCart,
  onBuyNow,
  stock,
}: StickyMobileBarProps) {
  if (!show) return null;

  return (
    <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-corp-charcoal/95 backdrop-blur-md border-t border-corp-border dark:border-white/10 p-3 shadow-2xl animate-in slide-in-from-bottom duration-200">
      <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-corp-charcoal dark:text-white truncate">
            {productName}
          </p>
          <p className="font-display text-base font-extrabold text-corp-teal dark:text-teal-300">
            {totalPrice.toLocaleString("tr-TR")} ₺
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="default"
            onClick={onAddToCart}
            disabled={stock === 0}
            className="min-h-[44px] px-4 bg-corp-teal hover:bg-corp-teal-600 text-white font-bold rounded-xl shadow-md text-xs shrink-0 flex items-center gap-1.5"
          >
            <ShoppingBag size={15} />
            <span>Sepete Ekle</span>
          </Button>

          <Button
            size="default"
            variant="outline"
            onClick={onBuyNow}
            disabled={stock === 0}
            className="min-h-[44px] px-3.5 border-corp-teal text-corp-teal hover:bg-corp-teal hover:text-white font-bold rounded-xl text-xs shrink-0"
          >
            <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
