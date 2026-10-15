"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, MessageCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatStartingPrice } from "@/lib/plan-pricing";
import { trackViewItemList, trackFunnelEvent } from "@/lib/analytics";

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
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Kategorileri dinamik olarak çıkar
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
    if (selectedCategory === "ALL") return plans;
    return plans.filter((p) => p.category?.trim() === selectedCategory);
  }, [plans, selectedCategory]);

  // GA4 & Analytics: view_item_list olayı
  useEffect(() => {
    if (plans.length > 0) {
      const items = plans.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.tiers?.[0]?.priceMonthly ? p.tiers[0].priceMonthly / 100 : 0,
        category: p.category || "AI Otomasyon",
      }));
      trackViewItemList(items, "AI Otomasyon Hizmetleri Listesi");
    }
  }, [plans]);

  const handleWhatsAppConsultation = () => {
    trackFunnelEvent({
      event: "whatsapp_click",
      metadata: { source: "ai_list_consultation_banner" },
    });
  };

  return (
    <div className="min-h-screen bg-bg-soft text-corp-charcoal overflow-x-clip selection:bg-corp-coral-light selection:text-corp-coral">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-16 sm:px-6 sm:pt-28 md:py-20 lg:px-8">
        {/* Kısa Hero: Başlık + Tek Cümle */}
        <section className="mb-8 md:mb-12">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-corp-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-corp-teal">
            <span>Kurumsal AI Çözümleri</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-corp-teal sm:text-4xl md:text-5xl">
            AI Otomasyon Hizmetlerimiz
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-corp-gray sm:text-lg">
            İş süreçlerinizi 7/24 kesintisiz çalıştıran, ölçeklenebilir ve güvenli kurumsal yapay zeka sistemleri.
          </p>

          {/* Yatay Kaydırılabilir Kategori Çipleri (Mobilde kaydırılabilir, masaüstünde esnek) */}
          {categories.length > 0 && (
            <div
              className="mt-6 -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 pt-1 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0"
              role="tablist"
              aria-label="Hizmet Kategorileri"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === "ALL"}
                onClick={() => setSelectedCategory("ALL")}
                className={`inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                  selectedCategory === "ALL"
                    ? "bg-corp-teal text-white shadow-sm"
                    : "border border-corp-border bg-white text-corp-gray hover:border-corp-teal hover:text-corp-teal"
                }`}
              >
                Tüm Hizmetler ({plans.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`inline-flex min-h-[48px] shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] ${
                    selectedCategory === cat
                      ? "bg-corp-teal text-white shadow-sm"
                      : "border border-corp-border bg-white text-corp-gray hover:border-corp-teal hover:text-corp-teal"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Kart Izgarası: Mobil 1, Tablet 2, Masaüstü 3 Sütun */}
        <section aria-label="AI Hizmet Kartları">
          {filteredPlans.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-corp-border bg-white p-8 text-center shadow-sm">
              <Bot className="mb-3 text-corp-gray" size={40} />
              <h2 className="text-lg font-bold text-corp-teal">Bu kategoride henüz hizmet bulunmuyor</h2>
              <p className="mt-1 text-sm text-corp-gray">Tüm hizmetleri görüntülemek için filtreyi temizleyin.</p>
              <button
                type="button"
                onClick={() => setSelectedCategory("ALL")}
                className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-corp-teal px-5 text-sm font-bold text-white transition hover:bg-corp-teal/90"
              >
                Tüm Hizmetleri Göster
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => {
                const singleSentence = plan.cardSummary?.trim() || plan.shortDescription?.trim() || plan.name;
                const startingPriceText = formatStartingPrice(plan);
                const displayImage = plan.heroMockupUrl || plan.imageUrl;

                return (
                  <article
                    key={plan.id}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-corp-border bg-white shadow-sm transition hover:border-corp-teal/40 hover:shadow-card-hover"
                  >
                    {/* Görsel: 16:10 En-Boy Oranı, Lazy Loaded */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                      {displayImage ? (
                        <Image
                          src={displayImage}
                          alt={`${plan.name} görseli`}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition duration-300 group-hover:scale-105"
                          loading="lazy"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-corp-teal-50 text-corp-teal">
                          <Bot size={44} />
                        </div>
                      )}
                      {plan.category ? (
                        <span className="absolute left-3 top-3 z-10 rounded-lg bg-corp-charcoal/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
                          {plan.category}
                        </span>
                      ) : null}
                    </div>

                    {/* Kart Gövdesi */}
                    <div className="flex flex-1 flex-col justify-between p-5 sm:p-6">
                      <div>
                        <h2 className="font-display text-xl font-bold tracking-tight text-corp-teal group-hover:text-corp-coral transition-colors">
                          <Link href={`/services/ai-automation/${plan.slug}`} className="focus-visible:outline-none">
                            <span className="absolute inset-0 z-10" aria-hidden="true" />
                            {plan.name}
                          </Link>
                        </h2>
                        {/* TEK Cümle Fayda */}
                        <p className="mt-2.5 text-sm leading-relaxed text-corp-gray line-clamp-2">
                          {singleSentence}
                        </p>
                      </div>

                      <div className="mt-6 border-t border-corp-border/60 pt-4">
                        <div className="mb-3">
                          <span className="text-xs font-medium text-corp-gray">Başlangıç Fiyatı</span>
                          <div className="text-lg font-bold text-corp-teal sm:text-xl">
                            {startingPriceText}
                            {startingPriceText !== "Fiyat bilgisi için iletişime geçin" && (
                              <span className="ml-1 text-xs font-normal text-corp-gray">/ay</span>
                            )}
                          </div>
                        </div>

                        {/* Tek Düğme: İncele */}
                        <div
                          aria-hidden="true"
                          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-corp-teal px-4 text-sm font-bold text-white transition group-hover:bg-corp-teal-600 pointer-events-none"
                        >
                          İncele <ArrowRight size={16} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Altta "Hangisini seçeceğinizi bilmiyor musunuz?" Bandı */}
        <section
          aria-labelledby="consultation-banner-title"
          className="mt-14 rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-6 shadow-sm sm:p-8 md:p-10"
        >
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <MessageCircle size={14} aria-hidden="true" /> Canlı Danışmanlık
              </div>
              <h2
                id="consultation-banner-title"
                className="font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl"
              >
                Hangisini seçeceğinizi bilmiyor musunuz?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
                İşletmenizin hacmine, çağrı yoğunluğuna veya veri yapısına en uygun AI modelini birlikte belirleyelim. Uzman ekibimiz 10 dakika içinde işletmenize özel yol haritası sunsun.
              </p>
            </div>

            <div className="w-full shrink-0 sm:w-auto">
              <Link
                href="https://wa.me/905303412156?text=Merhaba%2C%20i%C5%9Fletmem%20i%C3%A7in%20hangi%20AI%20otomasyon%20hizmetini%20se%C3%A7mem%20gerekti%C4%9Fi%20konusunda%20dan%C4%B1%C5%9Fmak%20istiyorum."
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppConsultation}
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
              >
                <MessageCircle size={18} aria-hidden="true" />
                WhatsApp ile Danışın
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
