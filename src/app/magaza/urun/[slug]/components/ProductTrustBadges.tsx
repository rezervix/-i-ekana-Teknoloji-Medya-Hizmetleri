"use client";

import React from "react";
import { Truck, RotateCcw, ShieldCheck, Clock, Palette } from "lucide-react";
import { STORE_CONFIG } from "@/config/store";

interface ProductTrustBadgesProps {
  freeShipping?: boolean;
}

export default function ProductTrustBadges({ freeShipping }: ProductTrustBadgesProps) {
  return (
    <div className="bg-corp-surface/50 dark:bg-white/5 rounded-2xl border border-corp-border dark:border-white/10 p-5 space-y-3.5 my-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Production estimate */}
        {STORE_CONFIG.productionEstimateText && (
          <div className="flex items-start gap-2.5 text-xs text-corp-charcoal dark:text-white">
            <Clock size={16} className="text-corp-teal shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Tahmini Üretim:</span>{" "}
              <span className="text-corp-gray dark:text-white/70">
                {STORE_CONFIG.productionEstimateText}
              </span>
            </div>
          </div>
        )}

        {/* Shipping estimate */}
        {STORE_CONFIG.shippingEstimateText && (
          <div className="flex items-start gap-2.5 text-xs text-corp-charcoal dark:text-white">
            <Truck size={16} className="text-corp-teal shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Teslimat Süresi:</span>{" "}
              <span className="text-corp-gray dark:text-white/70">
                {STORE_CONFIG.shippingEstimateText}
              </span>
            </div>
          </div>
        )}

        {/* Free shipping or threshold */}
        <div className="flex items-start gap-2.5 text-xs text-corp-charcoal dark:text-white">
          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Kargo Koşulu:</span>{" "}
            <span className="text-corp-gray dark:text-white/70">
              {freeShipping
                ? "Bu üründe kargo tamamen ücretsizdir."
                : `${STORE_CONFIG.freeShippingThreshold} ₺ üzeri siparişlerde kargo bedava.`}
            </span>
          </div>
        </div>

        {/* Design support */}
        {STORE_CONFIG.designSupportText && (
          <div className="flex items-start gap-2.5 text-xs text-corp-charcoal dark:text-white">
            <Palette size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Grafik Kontrolü:</span>{" "}
              <span className="text-corp-gray dark:text-white/70">
                {STORE_CONFIG.designSupportText}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Return policy note */}
      {STORE_CONFIG.returnPolicyText && (
        <div className="pt-2 border-t border-corp-border/60 dark:border-white/10 flex items-start gap-2 text-[11px] text-corp-gray dark:text-white/60">
          <RotateCcw size={13} className="shrink-0 mt-0.5" />
          <span>{STORE_CONFIG.returnPolicyText}</span>
        </div>
      )}
    </div>
  );
}
