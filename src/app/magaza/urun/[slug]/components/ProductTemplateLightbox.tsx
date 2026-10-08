"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Check, RotateCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface ProductTemplateLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  template: any;
  onSelectTemplate: (template: any) => void;
  isSelected: boolean;
}

export default function ProductTemplateLightbox({
  isOpen,
  onClose,
  template,
  onSelectTemplate,
  isSelected,
}: ProductTemplateLightboxProps) {
  const [showingBack, setShowingBack] = useState(false);

  if (!isOpen || !template) return null;

  const frontUrl = template.frontImageUrl || template.frontImage;
  const backUrl = template.backImageUrl || template.backImage;
  const activeUrl = showingBack && backUrl ? backUrl : frontUrl || "/placeholder.webp";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="relative max-w-2xl w-full bg-white dark:bg-corp-charcoal rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-4 border-b border-corp-border dark:border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-sm text-corp-charcoal dark:text-white">
                {template.product?.name || template.subcategory || "Hazır Tasarım Şablonu"}
              </h3>
              {template.nicheLabels && (
                <div className="flex gap-1 mt-1">
                  {template.nicheLabels.map((n: string) => (
                    <span
                      key={n}
                      className="text-[10px] bg-corp-teal/10 text-corp-teal font-semibold px-2 py-0.5 rounded-full"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-corp-gray hover:text-corp-charcoal min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Image Display */}
          <div className="relative flex-1 aspect-[4/3] w-full bg-gray-50 dark:bg-black/20 p-4">
            <Image
              src={activeUrl}
              alt="Şablon Önizleme"
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t border-corp-border dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-corp-surface/50 dark:bg-white/5">
            {backUrl ? (
              <button
                type="button"
                onClick={() => setShowingBack((prev) => !prev)}
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-corp-border text-xs font-semibold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-white/10 text-corp-charcoal dark:text-white"
              >
                <RotateCw size={14} />
                <span>{showingBack ? "Ön Yüzü Göster" : "Arka Yüzü Göster"}</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => {
                onSelectTemplate(template);
                onClose();
              }}
              className={`min-h-[44px] px-5 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                isSelected
                  ? "bg-emerald-600 text-white"
                  : "bg-corp-teal text-white hover:bg-corp-teal-600"
              }`}
            >
              {isSelected ? <Check size={16} /> : null}
              <span>{isSelected ? "Bu Tasarım Seçildi" : "Bu Tasarımı Seç"}</span>
            </button>
          </div>
        </div>
      </div>
    </AnimatePresence>
  );
}
