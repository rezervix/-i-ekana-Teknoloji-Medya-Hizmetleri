'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Headphones, Sparkles } from 'lucide-react';

interface MobileStickyCtaBarProps {
  planName: string;
  startingPrice: number | null;
  startingPriceFormatted: string;
  packageSectionId?: string;
  onSelectRecommendedTier?: () => void;
  recommendedTierName?: string;
}

export default function MobileStickyCtaBar({
  planName,
  startingPrice,
  startingPriceFormatted,
  packageSectionId = 'paketler',
  onSelectRecommendedTier,
  recommendedTierName,
}: MobileStickyCtaBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Kullanıcı ilk 240px'i geçtikten sonra görünür olsun (Hero başlığını gördükten sonra)
      if (window.scrollY > 240) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Hızlı Satın Alma ve Demo Çubuğu"
      className="fixed bottom-0 inset-x-0 z-40 block lg:hidden border-t border-corp-border/80 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] transition-transform duration-300"
    >
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        {/* Sol Taraf: Ürün / Fiyat Özeti */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11px] font-bold text-corp-teal truncate">
            <Sparkles size={11} className="text-corp-coral shrink-0" aria-hidden="true" />
            <span className="truncate">{planName}</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-base font-extrabold text-corp-teal">
              {startingPriceFormatted}
            </span>
            {startingPrice !== null && (
              <span className="text-[10px] text-corp-gray font-normal">/ay&apos;dan</span>
            )}
          </div>
        </div>

        {/* Sağ Taraf: Aksiyon Düğmeleri */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('cicekana:open-chat', {
                    detail: {
                      message: `Merhaba, ${planName} hakkında bilgi almak istiyorum.`,
                    },
                  })
                );
              }
            }}
            aria-label="Müşteri Hizmetleri Canlı Destek"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-corp-teal/30 bg-corp-teal/10 text-corp-teal transition active:scale-95"
          >
            <Headphones size={20} aria-hidden="true" />
          </button>

          {onSelectRecommendedTier && recommendedTierName ? (
            <button
              type="button"
              onClick={onSelectRecommendedTier}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-corp-coral px-4 text-xs font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-95"
            >
              <span>{recommendedTierName} Seç</span>
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          ) : (
            <a
              href={`#${packageSectionId}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-corp-coral px-4 text-xs font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-95"
            >
              <span>Paketleri Gör</span>
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
