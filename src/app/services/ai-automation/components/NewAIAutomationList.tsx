'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Headphones,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { formatStartingPrice } from '@/lib/plan-pricing';
import { trackViewItemList, trackFunnelEvent } from '@/lib/analytics';

interface PlanItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  cardSummary: string | null;
  category: string | null;
  imageUrl: string | null;
  heroMockupUrl?: string | null;
  tiers: Array<{ priceMonthly: number; isActive: boolean }>;
}

export default function NewAIAutomationList({ plans }: { plans: PlanItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Kategorileri dinamik olarak veritabanı planlarından çıkar
  const categories = useMemo(() => {
    const set = new Set<string>();
    plans.forEach((p) => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [plans]);

  // Filtrelenmiş hizmetler
  const filteredPlans = useMemo(() => {
    if (selectedCategory === 'ALL') return plans;
    return plans.filter((p) => p.category?.trim() === selectedCategory);
  }, [plans, selectedCategory]);

  // GA4 & Analytics: view_item_list olayı
  useEffect(() => {
    if (plans.length > 0) {
      const items = plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.tiers?.[0]?.priceMonthly ? p.tiers[0].priceMonthly / 100 : 0,
        category: p.category || 'AI Otomasyon',
      }));
      trackViewItemList(items, 'AI Otomasyon Hizmetleri Listesi');
    }
  }, [plans]);

  return (
    <div className="min-h-screen bg-bg-soft text-corp-charcoal overflow-x-clip selection:bg-corp-coral-light selection:text-corp-coral">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 pt-28 pb-16 sm:px-6 sm:pt-32 md:py-24 lg:px-8">
        {/* Üst Navigasyon & Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/homepage"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-corp-teal hover:text-corp-coral transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Ana Sayfa
          </Link>
        </div>

        {/* Hero Bölümü: Değer Önerisi & Kurumsal Güvence */}
        <header className="mb-10 lg:mb-14">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-corp-teal sm:text-4xl md:text-5xl lg:text-6xl leading-[1.15]">
            İşletmenizi 7/24 Kesintisiz Büyüten Kurumsal AI Sistemleri
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-corp-gray sm:text-lg lg:text-xl">
            Müşteri desteğinden finans yönetimine, itibar takibinden sesli çağrı merkezine kadar tüm
            süreçlerinizi insan hatasından arındırın, otomatikleştirin ve ölçeklendirin.
          </p>

          {/* Hızlı Güven Rozetleri */}
          <div className="mt-6 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm font-semibold text-corp-gray">
            <span className="flex items-center gap-1.5 text-corp-teal">
              <ShieldCheck size={16} className="text-emerald-600" /> 256-bit SSL & PayTR Koruması
            </span>
            <span className="flex items-center gap-1.5 text-corp-teal">
              <CheckCircle2 size={16} className="text-corp-coral" /> Dilediğiniz An İptal
              (Taahhütsüz)
            </span>
            <span className="flex items-center gap-1.5 text-corp-teal">
              <Zap size={16} className="text-amber-500" /> 24-48 Saatte Hızlı Canlıya Geçiş
            </span>
          </div>

          {/* Yatay Kategori Çipleri */}
          <div
            className="mt-8 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0"
            role="tablist"
            aria-label="Hizmet Kategorileri"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'ALL'}
              onClick={() => setSelectedCategory('ALL')}
              className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition active:scale-[0.98] ${
                selectedCategory === 'ALL'
                  ? 'bg-corp-teal text-white shadow-sm'
                  : 'border border-corp-border bg-white text-corp-gray hover:border-corp-teal hover:text-corp-teal'
              }`}
            >
              Tüm Çözümler ({plans.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition active:scale-[0.98] ${
                  selectedCategory === cat
                    ? 'bg-corp-teal text-white shadow-sm'
                    : 'border border-corp-border bg-white text-corp-gray hover:border-corp-teal hover:text-corp-teal'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Ürün & Hizmet Kartları Izgarası */}
        <section aria-label="AI Hizmet ve Ürün Kartları">
          <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {/* DİNAMİK VERİTABANI PLANLARI (Microsoft Call Center AI, Midvem, Faktura, ScoreForm, Kuşçu vb.) */}
            {filteredPlans.map((plan) => {
              const singleSentence =
                plan.cardSummary?.trim() || plan.shortDescription?.trim() || plan.name;
              const startingPriceText = formatStartingPrice(plan);
              const displayImage = plan.heroMockupUrl || plan.imageUrl;
              const isCallCenter = plan.slug === 'microsoft-call-center-ai';

              return (
                <article
                  key={plan.id}
                  className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-card-hover ${
                    isCallCenter
                      ? 'border-[#00b2c9]/40 hover:border-corp-teal'
                      : 'border-corp-border/80 hover:border-corp-teal/50'
                  }`}
                >
                  {/* Görsel / Mockup / İkon Alanı */}
                  <div className="relative mb-5 flex h-48 w-full items-center justify-center overflow-hidden rounded-2xl bg-bg-soft">
                    {displayImage ? (
                      <Image
                        src={displayImage}
                        alt={`${plan.name} arayüz görseli`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : isCallCenter ? (
                      <Headphones
                        size={54}
                        className="text-[#00b2c9] transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <Bot
                        size={54}
                        className="text-corp-teal transition-transform duration-300 group-hover:scale-110"
                      />
                    )}
                    {plan.category && (
                      <span
                        className={`absolute top-3 left-3 rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide shadow-xs ${
                          isCallCenter
                            ? 'bg-corp-coral text-white'
                            : 'bg-corp-teal-50 border border-corp-border text-corp-teal'
                        }`}
                      >
                        {isCallCenter ? 'Öne Çıkan Sesli AI' : plan.category}
                      </span>
                    )}
                  </div>


                  <h2 className="font-display text-2xl font-bold leading-tight text-corp-teal group-hover:text-corp-coral transition-colors">
                    {plan.name}
                  </h2>

                  <p className="mt-2.5 flex-1 text-sm leading-relaxed text-corp-gray">
                    {singleSentence}
                  </p>

                  {/* Fiyat Gösterimi */}
                  <div className="mt-5 border-t border-corp-border/60 pt-4">
                    <div className="text-xs font-semibold text-corp-gray uppercase tracking-wider">
                      Başlangıç Fiyatı
                    </div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-corp-teal">
                        {startingPriceText}
                      </span>
                      {startingPriceText.includes('₺') && (
                        <span className="text-xs text-corp-gray">/ay</span>
                      )}
                    </div>
                    <p className="text-[11px] text-corp-gray mt-0.5">
                      {plan.tiers.length > 0
                        ? `${plan.tiers.length} farklı paket seçeneği · Taahhütsüz`
                        : 'Kurumsal teklif modeli'}
                    </p>
                  </div>

                  {/* Aksiyon Butonları */}
                  <div className="mt-5 flex flex-col gap-2">
                    <Link
                      href={`/services/ai-automation/${plan.slug}`}
                      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-corp-teal px-4 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-corp-teal/90 active:scale-[0.98]"
                    >
                      <span>
                        {isCallCenter ? 'Çözümü & Paketleri İncele' : 'Paketleri & Özellikleri Gör'}
                      </span>
                      <ArrowRight size={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          window.dispatchEvent(
                            new CustomEvent('cicekana:open-chat', {
                              detail: {
                                message: `Merhaba, ${plan.name} hakkında detaylı bilgi ve canlı demo almak istiyorum.`,
                              },
                            })
                          );
                        }
                      }}
                      className="inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl border border-corp-teal/30 bg-corp-teal/5 px-3 text-xs font-bold text-corp-teal transition hover:bg-corp-teal/10 active:scale-[0.98]"
                    >
                      <Headphones size={15} />
                      <span>Canlı Demo İste</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
