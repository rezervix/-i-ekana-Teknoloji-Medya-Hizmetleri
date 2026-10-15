"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatTryPrice, getStartingPrice, getTierFeatures } from "@/lib/plan-pricing";
import { getPlanIcon } from "@/lib/plan-icons";
import { useCartStore } from "@/store/useCartStore";
import {
  trackViewItem,
  trackAddToCart,
  trackBeginCheckout,
  trackFunnelEvent,
} from "@/lib/analytics";

interface Tier {
  id: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  isRecommended: boolean;
  badge: string | null;
  features: unknown;
  vatNote: string | null;
  renewalNote: string | null;
  buttonText: string | null;
}

interface PlanDetailProps {
  plan: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    heroHeadline: string | null;
    heroSubheadline: string | null;
    primaryCtaLabel: string | null;
    primaryCtaUrl: string | null;
    secondaryCtaLabel: string | null;
    secondaryCtaUrl: string | null;
    imageUrl: string | null;
    heroMockupUrl: string | null;
    heroImageAlt: string | null;
    showStartingPrice: boolean;
    vatNote: string | null;
    category: string | null;
    tagline: string | null;
    whatsappNumber: string | null;
    whatsappTemplate: string | null;
    features: unknown;
    benefits: unknown;
    steps: unknown;
    faqs: unknown;
    demoScreenshots: unknown;
    trustBlocks: unknown;
    disclaimer: string | null;
    tiers: Tier[];
  };
  activeSubscriptions?: Array<{ planTierId: string }>;
  preview?: boolean;
}

function asItems(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is { icon?: string; title: string; description: string; badge?: string } =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof item.title === "string" &&
              typeof item.description === "string"
          )
      )
    : [];
}

function asFaqs(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is { question: string; answer: string } =>
          Boolean(
            item &&
              typeof item === "object" &&
              typeof item.question === "string" &&
              typeof item.answer === "string"
          )
      )
    : [];
}

export default function NewAIAutomationDetail({
  plan,
  activeSubscriptions = [],
  preview = false,
}: PlanDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  // Veri dönüşümleri
  const tiers = plan.tiers || [];
  const startingPrice = getStartingPrice(plan);
  const heroTitle = plan.heroHeadline || plan.name;
  const heroSubtitle = plan.heroSubheadline || plan.shortDescription;
  const planFeatures = getTierFeatures(plan.features);
  const steps = asItems(plan.steps);
  const benefits = asItems(plan.benefits);
  const faqs = asFaqs(plan.faqs);
  const demoScreenshots = Array.isArray(plan.demoScreenshots)
    ? (plan.demoScreenshots as Array<{ url: string; caption?: string; alt?: string }>)
    : [];
  const rawTrustBlocks = Array.isArray(plan.trustBlocks)
    ? (plan.trustBlocks as Array<{ key: string; title: string; text: string; isEnabled?: boolean }>)
    : [];
  const activeTrustBlocks = rawTrustBlocks.filter((b) => b.isEnabled !== false);

  // Standart güven ve itiraz maddeleri (veri yoksa bile sahte rakamsız, şeffaf güvenceler)
  const defaultTrustItems = [
    {
      title: "Verilerimiz ve konuşmalarımız güvende mi?",
      text: "Tüm veri aktarımı 256-bit SSL ve uçtan uca şifrelemeyle korunur. Kurumsal AI modellerimiz KVKK ve gizlilik standartlarına tam uyumludur, müşteri verileriniz üçüncü taraf modelleri eğitmek için kullanılmaz.",
    },
    {
      title: "Taahhüt veya gizli ücret var mı? İstediğim zaman iptal edebilir miyim?",
      text: "Kesinlikle uzun vadeli taahhüt yoktur. Aboneliğinizi profil panelinizden dilediğiniz an tek tıkla iptal edebilirsiniz. İptal durumunda mevcut fatura dönemi sonuna kadar hizmetiniz kesintisiz devam eder.",
    },
    {
      title: "Entegrasyon ve canlıya geçiş ne kadar sürer?",
      text: "Hazır webhook ve API altyapımız sayesinde standart entegrasyonlar 24-48 saat içinde tamamlanır. Kurulum sürecinde teknik ekibimiz tüm testleri gerçekleştirir.",
    },
    {
      title: "Teknik destek ve bakım nasıl sağlanıyor?",
      text: "7/24 otomatik uptime ve performans izleme aktiftir. Bir aksaklık durumunda doğrudan teknik mühendislerimize WhatsApp ve e-posta üzerinden anında ulaşabilirsiniz.",
    },
  ];

  const trustItems = activeTrustBlocks.length > 0
    ? activeTrustBlocks.map((b) => ({ title: b.title, text: b.text }))
    : defaultTrustItems;

  // WhatsApp iletişim URL'si
  const cleanPhone = (plan.whatsappNumber || "905303412156").replace(/[^0-9]/g, "");
  const waText = encodeURIComponent(
    (
      plan.whatsappTemplate ||
      `Merhaba, ${plan.name} hakkında bilgi ve canlı demo almak istiyorum.`
    ).replace("{ürün}", plan.name)
  );
  const waUrl = `https://wa.me/${cleanPhone}?text=${waText}`;

  // State yönetimi
  const [expandedFeatures, setExpandedFeatures] = useState<Record<string, boolean>>({});
  const [showComparisonTable, setShowComparisonTable] = useState(false);
  const [openTrustIndex, setOpenTrustIndex] = useState<number | null>(0);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Analytics: view_item olayı
  useEffect(() => {
    trackViewItem({
      id: plan.id,
      name: plan.name,
      price: startingPrice ? startingPrice / 100 : 0,
      category: plan.category || "AI Otomasyon",
    });
  }, [plan.id, plan.name, startingPrice, plan.category]);

  // Paket seçimi & Sepete Ekleme -> Faz A misafir ödeme akışı
  const handleSelectTier = (tier: Tier) => {
    const priceInTry = tier.priceMonthly / 100;

    trackAddToCart({
      id: tier.id,
      name: `${plan.name} - ${tier.name}`,
      price: priceInTry,
      category: "subscription",
    });

    trackBeginCheckout(
      [
        {
          id: tier.id,
          name: `${plan.name} - ${tier.name}`,
          price: priceInTry,
          quantity: 1,
          category: "subscription",
        },
      ],
      priceInTry
    );

    addItem({
      productId: tier.id,
      itemType: "subscription",
      subscriptionPlanId: plan.id,
      subscriptionTierId: tier.id,
      name: `${plan.name} - ${tier.name}`,
      price: priceInTry,
      quantity: 1,
      image: plan.imageUrl || "https://placehold.co/160x160?text=Plan",
      category: "subscription",
    });

    router.push("/magaza/odeme");
  };

  const toggleFeatureExpansion = (tierId: string) => {
    setExpandedFeatures((prev) => ({ ...prev, [tierId]: !prev[tierId] }));
  };

  const handleWhatsAppClick = (source: string) => {
    trackFunnelEvent({
      event: "whatsapp_click",
      metadata: { source, planSlug: plan.slug, planName: plan.name },
    });
  };

  const displayHeroImage = plan.heroMockupUrl || plan.imageUrl;

  return (
    <div className="min-h-screen bg-bg-soft text-corp-charcoal overflow-x-clip selection:bg-corp-coral-light selection:text-corp-coral">
      {preview && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-white shadow-md">
          ⚠️ Taslak Önizleme Modu (Canlı Değil)
        </div>
      )}

      {/* Yalnızca Ana Site Header */}
      <Header />

      {/* Masaüstünde İnce Çapa Şeridi (Mobilde gizli, ikinci menü hissi yaratmaz) */}
      <div className="hidden md:block sticky top-20 z-30 border-b border-corp-border/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5 text-xs font-semibold text-corp-gray">
          <div className="flex items-center gap-1.5 font-bold text-corp-teal">
            <span>{plan.name}</span>
          </div>
          <nav className="flex items-center gap-6" aria-label="Sayfa bölümleri">
            {steps.length > 0 && (
              <a href="#nasil-calisir" className="hover:text-corp-coral transition-colors">
                Nasıl Çalışır
              </a>
            )}
            {benefits.length > 0 && (
              <a href="#faydalar" className="hover:text-corp-coral transition-colors">
                Faydalar
              </a>
            )}
            {demoScreenshots.length > 0 && (
              <a href="#ekran-goruntuleri" className="hover:text-corp-coral transition-colors">
                Ekranlar
              </a>
            )}
            <a href="#paketler" className="hover:text-corp-coral transition-colors">
              Paketler
            </a>
            <a href="#guven" className="hover:text-corp-coral transition-colors">
              Güven & İtirazlar
            </a>
            {faqs.length > 0 && (
              <a href="#sss" className="hover:text-corp-coral transition-colors">
                SSS
              </a>
            )}
          </nav>
          <a
            href="#paketler"
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg bg-corp-teal px-3 py-1.5 text-xs font-bold text-white transition hover:bg-corp-teal-600"
          >
            Paketleri Gör
          </a>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pt-24 pb-28 sm:px-6 sm:pt-28 md:pb-20 lg:px-8">
        {/* Geri Dönüş Linki */}
        <div className="mb-6">
          <Link
            href="/services/ai-automation"
            className="inline-flex min-h-[48px] items-center gap-2 text-sm font-semibold text-corp-teal hover:text-corp-coral transition-colors"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Tüm AI Otomasyon Hizmetleri
          </Link>
        </div>

        {/* 1. HERO BÖLÜMÜ: Mobilde başlık ve düğmeler görsel ÜSTÜNDE ve ilk ekranda */}
        <section aria-label="Hizmet Tanıtımı" className="mb-14 sm:mb-20">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/* Metin ve Aksiyonlar Alanı */}
            <div className="lg:col-span-7">
              {plan.category && (
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-corp-border bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-corp-teal">
                  <Sparkles size={14} className="text-corp-coral" aria-hidden="true" />
                  <span>{plan.category}</span>
                </div>
              )}

              {/* Sonuç Odaklı Başlık */}
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-corp-teal sm:text-4xl md:text-5xl leading-tight">
                {heroTitle}
              </h1>

              {/* Alt Metin */}
              <p className="mt-4 text-base leading-relaxed text-corp-gray sm:text-lg">
                {heroSubtitle}
              </p>

              {/* Başlayan Fiyat Bandı */}
              {plan.showStartingPrice !== false && startingPrice !== null && (
                <div className="mt-6 flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium text-corp-gray">Başlangıç:</span>
                  <span className="text-2xl font-extrabold text-corp-teal sm:text-3xl">
                    {formatTryPrice(startingPrice)}
                  </span>
                  <span className="text-sm font-normal text-corp-gray">/ay&apos;dan</span>
                  {plan.vatNote && (
                    <span className="text-xs text-corp-gray/80">({plan.vatNote})</span>
                  )}
                </div>
              )}

              {/* 2 Düğme: "Paketleri Gör" + "WhatsApp'tan Demo İste" */}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#paketler"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-corp-coral px-6 text-base font-bold text-white shadow-sm transition hover:bg-corp-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral focus-visible:ring-offset-2 sm:w-auto"
                >
                  Paketleri Gör <ArrowRight size={18} aria-hidden="true" />
                </a>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleWhatsAppClick("hero_demo_cta")}
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 text-base font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 sm:w-auto"
                >
                  <MessageCircle size={18} aria-hidden="true" /> WhatsApp&apos;tan Demo İste
                </a>
              </div>

              {/* Hızlı Güven Sinyalleri */}
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-corp-gray">
                <span className="inline-flex items-center gap-1.5">
                  <Check size={16} className="text-corp-coral" aria-hidden="true" /> Kurulum & Entegrasyon Desteği
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check size={16} className="text-corp-coral" aria-hidden="true" /> Taahhüt Yok · Dilediğinde İptal
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-corp-teal" aria-hidden="true" /> KVKK & Güvenli Altyapı
                </span>
              </div>
            </div>

            {/* Gerçek Ürün Ekranı Görseli (16:10, Mobilde başlık ve düğmelerin altında, LCP için priority) */}
            <div className="lg:col-span-5">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-corp-border bg-white shadow-luxury">
                {displayHeroImage ? (
                  <Image
                    src={displayHeroImage}
                    alt={plan.heroImageAlt || `${plan.name} ekran görüntüsü`}
                    fill
                    priority
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 45vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-corp-teal-50 to-slate-100 p-6 text-center text-corp-teal">
                    <Sparkles size={48} className="mb-2 text-corp-coral" aria-hidden="true" />
                    <span className="text-lg font-bold">{plan.name}</span>
                    <span className="mt-1 text-xs text-corp-gray">Kurumsal AI Otomasyon Modeli</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. NASIL ÇALIŞIR (3-4 Adım) - Veri yoksa gizlenir */}
        {steps.length > 0 && (
          <section id="nasil-calisir" className="mb-14 scroll-mt-28 sm:mb-20">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Kolay Entegrasyon</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
                Nasıl Çalışır?
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
                İşletmenizi yapay zeka hızına taşımak için 3 kolay adım.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="relative flex flex-col rounded-2xl border border-corp-border bg-white p-6 shadow-sm"
                >
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-corp-teal-50 font-display text-xl font-extrabold text-corp-teal">
                    0{idx + 1}
                  </div>
                  <h3 className="font-display text-lg font-bold text-corp-teal">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-corp-gray">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. FAYDALAR (3-6 Kart) - Veri yoksa gizlenir */}
        {benefits.length > 0 && (
          <section id="faydalar" className="mb-14 scroll-mt-28 sm:mb-20">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Katma Değer</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
                İşletmenize Sağladığı Faydalar
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
                Maliyetlerinizi düşürürken operasyonel hızınızı ve müşteri memnuniyetinizi artıran özellikler.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit, idx) => {
                const IconComponent = getPlanIcon(benefit.icon);
                return (
                  <div
                    key={idx}
                    className="flex flex-col rounded-2xl border border-corp-border bg-white p-6 shadow-sm transition hover:border-corp-teal/40 hover:shadow-card-hover"
                  >
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal">
                      <IconComponent size={24} aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-corp-teal">
                      {benefit.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-corp-gray">
                      {benefit.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. ÜRÜN EKRANLARI / DEMO (Varsa 16:10, yoksa gizlenir) */}
        {demoScreenshots.length > 0 && (
          <section id="ekran-goruntuleri" className="mb-14 scroll-mt-28 sm:mb-20">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Gerçek Arayüz</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
                Ürün Ekran Görüntüleri & Canlı Arayüz
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
                Kullanıcı dostu yönetim paneli ve canlı işleyişten ekranlar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {demoScreenshots.map((shot, idx) => (
                <figure
                  key={idx}
                  className="flex flex-col overflow-hidden rounded-2xl border border-corp-border bg-white shadow-sm"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                    <Image
                      src={shot.url}
                      alt={shot.alt || `${plan.name} ekran görüntüsü ${idx + 1}`}
                      fill
                      loading="lazy"
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {shot.caption && (
                    <figcaption className="p-4 text-xs font-medium text-corp-gray border-t border-corp-border/60">
                      {shot.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* 5. PAKETLER BÖLÜMÜ */}
        <section id="paketler" className="mb-14 scroll-mt-28 sm:mb-20">
          <div className="mb-8 text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Şeffaf Fiyatlandırma</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-4xl">
              İşletmenize Uygun Paketi Seçin
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
              Gizli ücret yok, taahhüt yok. Dilediğiniz an tek tıkla iptal edebilirsiniz.
            </p>
          </div>

          {tiers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-corp-border bg-white p-8 text-center">
              <p className="text-corp-gray">Bu hizmet için henüz aktif paket bulunmamaktadır.</p>
            </div>
          ) : (
            <>
              {/* Kartlar: Mobilde Tek Sütun, Masaüstünde Esnek 3 Sütun */}
              <div
                className={`grid grid-cols-1 gap-6 ${
                  tiers.length === 1
                    ? "max-w-md mx-auto"
                    : tiers.length === 2
                    ? "max-w-4xl mx-auto md:grid-cols-2"
                    : "lg:grid-cols-3"
                }`}
              >
                {tiers.map((tier) => {
                  const rawFeatures = getTierFeatures(tier.features);
                  const features = rawFeatures.length > 0 ? rawFeatures : planFeatures;
                  const isExpanded = Boolean(expandedFeatures[tier.id]);
                  const visibleFeatures = isExpanded ? features : features.slice(0, 5);
                  const hasMore = features.length > 5;
                  const isSubscribed = activeSubscriptions.some((s) => s.planTierId === tier.id);
                  const buttonLabel = tier.buttonText || `${tier.name} Aboneliğini Başlat`;

                  return (
                    <div
                      key={tier.id}
                      className={`relative flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition ${
                        tier.isRecommended
                          ? "border-corp-coral ring-2 ring-corp-coral shadow-card-hover"
                          : "border-corp-border"
                      }`}
                    >
                      {tier.isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-corp-coral px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                          {tier.badge || "Önerilen Paket"}
                        </div>
                      )}

                      <div>
                        {/* Paket Adı */}
                        <h3 className="font-display text-2xl font-bold text-corp-teal">
                          {tier.name}
                        </h3>

                        {/* Açıklama */}
                        {tier.description ? (
                          <p className="mt-2 min-h-[44px] text-sm leading-relaxed text-corp-gray">
                            {tier.description}
                          </p>
                        ) : (
                          <div className="min-h-[44px]" />
                        )}

                        {/* Büyük Fiyat */}
                        <div className="mt-4 flex items-baseline gap-1">
                          <span className="font-display text-4xl font-extrabold tracking-tight text-corp-teal sm:text-5xl">
                            {formatTryPrice(tier.priceMonthly)}
                          </span>
                          <span className="text-sm font-semibold text-corp-gray">/ay</span>
                        </div>

                        {/* KDV ve İptal Notu */}
                        <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-corp-gray">
                          <span>{tier.vatNote || plan.vatNote || "+ KDV"}</span>
                          <span>·</span>
                          <span>{tier.renewalNote || "Dilediğiniz zaman iptal"}</span>
                        </div>

                        {/* İlk 4-5 Özellik Listesi */}
                        <div className="mt-6 border-t border-corp-border/60 pt-5">
                          <ul className="space-y-3" aria-label={`${tier.name} özellikleri`}>
                            {visibleFeatures.map((feat, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2.5 text-sm text-corp-charcoal">
                                <Check
                                  size={16}
                                  className="mt-1 shrink-0 text-corp-coral"
                                  aria-hidden="true"
                                />
                                <span className="leading-snug">{feat}</span>
                              </li>
                            ))}
                          </ul>

                          {/* "Tüm özellikleri gör" Açılır/Kapanır Düğmesi */}
                          {hasMore && (
                            <button
                              type="button"
                              onClick={() => toggleFeatureExpansion(tier.id)}
                              aria-expanded={isExpanded}
                              className="mt-4 inline-flex min-h-[48px] items-center gap-1.5 text-xs font-bold text-corp-teal hover:text-corp-coral transition-colors"
                            >
                              {isExpanded
                                ? "Daha az özellik göster"
                                : `Tüm özellikleri gör (+${features.length - 5})`}
                              {isExpanded ? (
                                <ChevronUp size={16} aria-hidden="true" />
                              ) : (
                                <ChevronDown size={16} aria-hidden="true" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Paket Seçim Butonu (Admin'den özel metin, Faz A üyeliksiz akışına gider) */}
                      <div className="mt-8 border-t border-corp-border/60 pt-6">
                        {isSubscribed ? (
                          <Link
                            href="/profile/subscriptions"
                            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-corp-teal px-4 text-sm font-bold text-white transition hover:bg-corp-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-corp-coral"
                          >
                            Aboneliğimi Yönet
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectTier(tier)}
                            className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                              tier.isRecommended
                                ? "bg-corp-coral text-white hover:bg-corp-coral/90 focus-visible:ring-corp-coral"
                                : "bg-corp-teal text-white hover:bg-corp-teal-600 focus-visible:ring-corp-teal"
                            }`}
                          >
                            {buttonLabel} <ArrowRight size={16} aria-hidden="true" />
                          </button>
                        )}

                        <div className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-corp-gray">
                          <Lock size={13} aria-hidden="true" />
                          <span>PayTR 256-Bit SSL Korumalı Güvenli Ödeme</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Açılır "Paketleri Karşılaştır" Tablosu */}
              {tiers.length > 1 && (
                <div className="mt-10">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowComparisonTable((prev) => !prev)}
                      aria-expanded={showComparisonTable}
                      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-corp-border bg-white px-5 py-2.5 text-sm font-bold text-corp-teal hover:border-corp-teal transition shadow-sm"
                    >
                      {showComparisonTable
                        ? "Karşılaştırma Tablosunu Gizle"
                        : "Paketleri Detaylı Karşılaştır"}
                      {showComparisonTable ? (
                        <ChevronUp size={18} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={18} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {showComparisonTable && (
                    <div className="mt-6 overflow-x-auto rounded-2xl border border-corp-border bg-white p-4 shadow-sm">
                      <table className="w-full min-w-[500px] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-corp-border text-xs font-bold uppercase tracking-wider text-corp-gray">
                            <th className="py-3 px-4">Özellik</th>
                            {tiers.map((t) => (
                              <th key={t.id} className="py-3 px-4 text-center">
                                <span className="text-corp-teal font-extrabold">{t.name}</span>
                                <div className="text-[11px] font-normal text-corp-gray mt-0.5">
                                  {formatTryPrice(t.priceMonthly)}/ay
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corp-border/60">
                          {planFeatures.map((feat, fIdx) => (
                            <tr key={fIdx} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-medium text-corp-charcoal">{feat}</td>
                              {tiers.map((t) => {
                                const tFeats = getTierFeatures(t.features);
                                const hasFeat =
                                  tFeats.length === 0 ||
                                  tFeats.some((tf) =>
                                    tf.toLowerCase().includes(feat.toLowerCase())
                                  );
                                return (
                                  <td key={t.id} className="py-3 px-4 text-center">
                                    {hasFeat ? (
                                      <Check
                                        size={18}
                                        className="mx-auto text-emerald-600"
                                        aria-label="Dahil"
                                      />
                                    ) : (
                                      <span className="text-corp-gray/50">—</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* 6. GÜVEN VE İTİRAZLAR (Accordion) */}
        <section id="guven" className="mb-14 scroll-mt-28 sm:mb-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Şeffaf Bilgilendirme</p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
              Güvenlik, Gizlilik ve Sık Sorulan İtirazlar
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
              Aklınızdaki soruların net yanıtları: verileriniz nasıl korunur, iptal koşulları nasıldır?
            </p>
          </div>

          <div className="space-y-3">
            {trustItems.map((item, idx) => {
              const isOpen = openTrustIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-corp-border bg-white overflow-hidden shadow-sm transition"
                >
                  <button
                    type="button"
                    onClick={() => setOpenTrustIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="flex min-h-[48px] w-full items-center justify-between p-5 text-left text-base font-bold text-corp-teal hover:text-corp-coral transition-colors"
                  >
                    <span>{item.title}</span>
                    {isOpen ? (
                      <ChevronUp size={20} className="shrink-0 text-corp-gray" aria-hidden="true" />
                    ) : (
                      <ChevronDown size={20} className="shrink-0 text-corp-gray" aria-hidden="true" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-corp-border/60 p-5 pt-3 text-sm leading-relaxed text-corp-gray bg-slate-50/50">
                      {item.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. SIKÇA SORULAN SORULAR (Accordion) - Veri yoksa gizlenir */}
        {faqs.length > 0 && (
          <section id="sss" className="mb-14 scroll-mt-28 sm:mb-20">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">Merak Edilenler</p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-3xl">
                Sıkça Sorulan Sorular
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-corp-border bg-white overflow-hidden shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex min-h-[48px] w-full items-center justify-between p-5 text-left text-base font-bold text-corp-teal hover:text-corp-coral transition-colors"
                    >
                      <span>{faq.question}</span>
                      {isOpen ? (
                        <ChevronUp size={20} className="shrink-0 text-corp-gray" aria-hidden="true" />
                      ) : (
                        <ChevronDown size={20} className="shrink-0 text-corp-gray" aria-hidden="true" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="border-t border-corp-border/60 p-5 pt-3 text-sm leading-relaxed text-corp-gray bg-slate-50/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 8. SON ÇAĞRI BANDI (Paketler + WhatsApp) */}
        <section
          aria-labelledby="final-cta-heading"
          className="rounded-3xl border border-corp-border bg-corp-teal p-6 text-white shadow-luxury sm:p-10 md:p-12"
        >
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-corp-coral-light">
                Hemen Başlayın
              </p>
              <h2
                id="final-cta-heading"
                className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl"
              >
                {plan.name} ile Süreçlerinizi Otomatize Edin
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/80 sm:text-base">
                İster doğrudan paketinizi seçip başlayın, ister uzman ekibimizle WhatsApp üzerinden canlı demo planlayın.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row shrink-0">
              <a
                href="#paketler"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-corp-coral px-6 text-base font-bold text-white shadow-sm transition hover:bg-corp-coral/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Paketleri Gör <ArrowRight size={18} aria-hidden="true" />
              </a>

              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleWhatsAppClick("final_cta_banner")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <MessageCircle size={18} aria-hidden="true" /> WhatsApp ile Danışın
              </a>
            </div>
          </div>
        </section>

        {plan.disclaimer && (
          <p className="mt-8 text-xs text-center text-corp-gray max-w-3xl mx-auto">
            {plan.disclaimer}
          </p>
        )}
      </main>

      {/* Yalnızca Ana Site Footer */}
      <Footer />

      {/* MOBİL SABİT ALT ÇUBUK: Sayfa açılır açılmaz mobilde görünür */}
      {/* CookieConsent z-[200] olduğundan çakışmaz, çerez bandı çubuğun üstüne çıkar */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-corp-border/80 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,38,56,0.12)] backdrop-blur-md sm:hidden"
        role="region"
        aria-label="Mobil Hızlı Eylemler"
      >
        <div className="flex items-center gap-2.5">
          <a
            href="#paketler"
            className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-corp-coral px-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            Paketleri Gör
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleWhatsAppClick("sticky_mobile_bar")}
            className="flex-1 inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]"
          >
            <MessageCircle size={18} aria-hidden="true" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
