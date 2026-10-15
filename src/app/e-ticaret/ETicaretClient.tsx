"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  Search,
  Smartphone,
  MessageCircle,
  Info,
  Star,
  ChevronDown,
  ChevronUp,
  Rocket,
  Check,
  CreditCard,
  Phone,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import { DEFAULT_ETICARET_CMS, type ETicaretCMSData } from "@/types/ecommerce-cms";

// Dynamic Icon Map for highlights
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  ShoppingCart,
  TrendingUp,
  Search,
  MessageCircle,
  Smartphone,
  Zap,
  Shield,
  Rocket,
  CheckCircle,
  Star,
  Phone,
};

function Tooltip({ content }: { content: string }) {
  return (
    <div className="group relative inline-block ml-1.5 align-middle">
      <Info size={14} className="text-corp-gray cursor-help hover:text-corp-teal transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[280px] p-3 bg-gray-900 text-white text-[12px] leading-relaxed rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

const itemVariant: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};
const containerVariant: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

function FAQItem({ faq }: { faq: { id: string; q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-300"
      style={{
        borderColor: open ? "rgba(10,77,104,0.4)" : "#E8E8EE",
        background: open ? "rgba(10,77,104,0.03)" : "#FFF",
      }}
    >
      <button
        className="w-full flex items-center justify-between gap-4 p-6 text-left cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <span className="font-body text-[15px] font-semibold text-corp-charcoal">{faq.q}</span>
        {open ? (
          <ChevronUp size={18} className="text-corp-teal flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-corp-gray flex-shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-6 pb-6 font-body text-[14px] text-corp-gray leading-relaxed border-t border-corp-border pt-4">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ETicaretClientProps {
  initialCmsData?: ETicaretCMSData;
}

export default function ETicaretClient({ initialCmsData }: ETicaretClientProps) {
  const cms = initialCmsData || DEFAULT_ETICARET_CMS;
  const { addItem, openDrawer } = useCartStore();

  const handlePurchase = (pkg: ETicaretCMSData["packages"][0]) => {
    const rawNumber = Number(pkg.yearlyTotal.replace(/[^0-9]/g, "")) || 65000;
    addItem({
      productId: `e-ticaret-${pkg.id}`,
      slug: `e-ticaret-${pkg.id}`,
      name: `E-Ticaret ${pkg.name}`,
      price: rawNumber,
      quantity: 1,
      image: "https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=80",
      category: "Teknoloji",
      freeShipping: true,
      extraServices: [
        {
          type: "setup",
          label: "Kurulum ve Yayına Alma WhatsApp Desteği 7/24",
          price: 0,
        },
      ],
    });
    toast.success(`${pkg.name} sepetinize eklendi!`, {
      description: "Ödemenizi güvenle tamamlayabilir veya sepetinizi inceleyebilirsiniz.",
    });
    openDrawer();
  };

  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-white">
        <div
          className="absolute top-0 right-0 w-[600px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(232,98,42,0.04) 0%, transparent 70%)" }}
        />

        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div variants={containerVariant} initial="hidden" animate="visible" className="max-w-4xl mx-auto text-center">
            <motion.div variants={itemVariant}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body text-[11px] font-semibold tracking-widest uppercase text-corp-teal bg-corp-teal-50 border border-corp-teal/20 mb-6">
                {cms.hero.badge}
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariant}
              className="font-display font-bold text-corp-charcoal leading-[1.08] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.4rem, 4.5vw, 4rem)" }}
            >
              {cms.hero.titleRegular}
              <span className="text-corp-teal">{cms.hero.titleHighlight1}</span>
              {cms.hero.titleMiddle}
              <span className="text-corp-coral">{cms.hero.titleHighlight2}</span>
            </motion.h1>

            <motion.p
              variants={itemVariant}
              className="font-body text-[18px] text-corp-gray leading-[1.75] max-w-2xl mx-auto mb-10"
            >
              {cms.hero.description}
            </motion.p>

            <motion.div variants={itemVariant} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={cms.hero.primaryCtaLink || "#paketler"}
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[16px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-corp-coral/25"
              >
                {cms.hero.primaryCtaText || "Hemen Başla"}
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
              {cms.hero.secondaryCtaText && (
                <a
                  href={cms.hero.secondaryCtaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-md font-body font-semibold text-[15px] text-corp-charcoal border border-corp-border hover:bg-corp-surface transition-all duration-200"
                >
                  <MessageCircle size={16} className="text-corp-teal" />
                  {cms.hero.secondaryCtaText}
                </a>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-8 bg-corp-surface border-y border-corp-border">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-teal mb-1">
                {cms.socialProof.stat1Value}
              </span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider text-center">
                {cms.socialProof.stat1Label}
              </span>
            </div>
            <div className="hidden md:block w-px h-10 bg-corp-border"></div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-charcoal mb-1">
                {cms.socialProof.stat2Value}
              </span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider text-center">
                {cms.socialProof.stat2Label}
              </span>
            </div>
            <div className="hidden md:block w-px h-10 bg-corp-border"></div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-coral mb-1">
                {cms.socialProof.stat3Value}
              </span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider text-center">
                {cms.socialProof.stat3Label}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS (WHAT DO YOU GET) ── */}
      <section className="py-24 bg-white">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-16">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
              Özellikler
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">
              {cms.highlights.sectionTitle}
            </h2>
            <p className="font-body text-[17px] text-corp-gray max-w-2xl mx-auto">
              {cms.highlights.sectionSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cms.highlights.items.map((h) => {
              const IconComp = ICON_MAP[h.iconName] || ShoppingCart;
              return (
                <div
                  key={h.id || h.label}
                  className="corp-service-card bg-white rounded-2xl border border-corp-border p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-all"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: `${h.color}12`, border: `1px solid ${h.color}25` }}
                  >
                    <IconComp size={26} style={{ color: h.color }} />
                  </div>
                  <div>
                    <h3 className="font-display text-[20px] font-bold text-corp-charcoal mb-2">{h.label}</h3>
                    <p className="font-body text-[14.5px] text-corp-gray leading-relaxed">{h.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── BONUS CALLOUT ── */}
      {cms.bonusCallout?.enabled && (
        <section className="py-8 bg-[#fef3c7] border-y border-[#f59e0b]/20">
          <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
            <Star size={28} className="text-[#d97706] flex-shrink-0" fill="#d97706" />
            <p className="font-body text-[15px] text-[#92400e]">
              <strong className="font-bold text-[#78350f] text-[16px] mr-1">{cms.bonusCallout.title}</strong>
              {cms.bonusCallout.description}
            </p>
          </div>
        </section>
      )}

      {/* ── PRICING PACKAGES ── */}
      <section
        id="paketler"
        className="py-24 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #ffffff 100%)" }}
      >
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />

        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 relative">
          <div className="text-center mb-16">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
              Yatırımınızın Karşılığı
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">
              Şeffaf, Net ve Kazandıran Paketler
            </h2>
            <p className="font-body text-[17px] text-corp-gray max-w-2xl mx-auto">
              Vade farksız taksit imkanlarıyla işinizi büyütürken nakit akışınızı koruyun. Online sipariş verebilir veya danışmanımızla görüşebilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {cms.packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${
                  pkg.featured
                    ? "scale-[1.03] shadow-corp-hover z-10 border-corp-coral/40"
                    : "shadow-corp-card z-0 mt-4 lg:mt-0 border-corp-border"
                }`}
                style={{
                  background: pkg.featured ? "rgba(232,98,42,0.04)" : "#FFFFFF",
                }}
              >
                {pkg.featured && (
                  <div
                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full font-body text-[11px] font-bold text-white whitespace-nowrap shadow-sm"
                    style={{ background: "linear-gradient(135deg, #E8622A, #f59e0b)" }}
                  >
                    ⭐ En Popüler
                  </div>
                )}

                <div className="mb-4">
                  <span
                    className="font-body text-[13px] font-bold tracking-widest uppercase block mb-3"
                    style={{ color: pkg.accent }}
                  >
                    {pkg.name}
                  </span>

                  {/* Strikethrough price */}
                  {pkg.crossedOut && (
                    <div className="font-body text-[15px] font-medium text-corp-gray line-through mb-1">
                      ₺{pkg.crossedOut}
                    </div>
                  )}

                  {/* Monthly price */}
                  <div className="flex items-end gap-1 mb-1">
                    <span className="font-display text-4xl lg:text-5xl text-corp-charcoal font-bold leading-none">
                      ₺{pkg.monthly}
                    </span>
                    <span className="font-body text-[16px] font-bold text-corp-charcoal mb-1">/ ay</span>
                  </div>

                  {/* Yearly total */}
                  <p className="font-body text-[14px] text-corp-gray font-medium mb-4">
                    ₺{pkg.yearlyTotal} yıllık toplam
                  </p>

                  {/* Installment Badge */}
                  {pkg.installment && (
                    <div
                      className="inline-block px-3 py-1.5 rounded-md font-body text-[12px] font-bold mb-4"
                      style={{ background: `${pkg.accent}15`, color: pkg.accent }}
                    >
                      {pkg.installment}
                    </div>
                  )}
                </div>

                {/* Purchase Button - Adds to cart & triggers checkout loop */}
                <div className="flex flex-col gap-2 mb-6">
                  <button
                    onClick={() => handlePurchase(pkg)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-body font-bold text-[15px] transition-all hover:-translate-y-0.5 cursor-pointer shadow-md"
                    style={
                      pkg.featured
                        ? {
                            background: "linear-gradient(135deg, #E8622A, #f59e0b)",
                            color: "white",
                            boxShadow: "0 8px 30px rgba(232,98,42,0.3)",
                          }
                        : {
                            background: `${pkg.accent}15`,
                            color: pkg.accent,
                            border: `1.5px solid ${pkg.accent}40`,
                          }
                    }
                  >
                    <ShoppingCart size={17} />
                    Paketi Satın Al <ArrowRight size={16} />
                  </button>

                  <a
                    href={`https://wa.me/905303412156?text=${encodeURIComponent(
                      `Merhaba, ${pkg.name} hakkında bilgi ve canlı demo almak istiyorum.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full text-center py-2 text-xs font-semibold text-corp-gray hover:text-corp-teal transition-colors"
                  >
                    💬 WhatsApp ile Satış Temsilcisine Sor
                  </a>
                </div>

                {pkg.bonus && (
                  <div className="mb-6 p-4 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 flex items-start gap-3">
                    <Star size={18} className="text-[#f59e0b] flex-shrink-0 mt-0.5" fill="#f59e0b" />
                    <p className="font-body text-[13px] font-semibold text-corp-charcoal leading-relaxed">
                      {pkg.bonus}
                    </p>
                  </div>
                )}

                <ul className="flex flex-col gap-3.5 flex-1">
                  {pkg.features.map((f, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2.5 font-body text-[13.5px] ${
                        f.bold ? "font-bold text-corp-charcoal" : "text-corp-gray"
                      }`}
                    >
                      <CheckCircle size={16} style={{ color: pkg.accent }} className="flex-shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        {f.name}
                        {f.tooltip && <Tooltip content={f.tooltip} />}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SSS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-14">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
              SSS
            </span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight">
              Sıkça Sorulan Sorular
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {cms.faqs.map((f) => (
              <FAQItem key={f.id} faq={f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-24 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A4D68 0%, #083D52 100%)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(232,98,42,0.12) 0%, transparent 60%)" }}
        />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 relative text-center">
          <h2
            className="font-display font-bold text-white leading-tight mb-6"
            style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)" }}
          >
            {cms.finalCta.titleLine1}
            <br className="hidden md:block" />{" "}
            <span className="text-corp-coral">{cms.finalCta.titleHighlight}</span>
          </h2>
          <p className="font-body text-[18px] text-white/80 leading-relaxed max-w-2xl mx-auto mb-10">
            {cms.finalCta.description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={cms.finalCta.primaryBtnLink || "#paketler"}
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[16px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-corp-coral/30"
            >
              {cms.finalCta.primaryBtnText || "Paketini Seç, Başla"}
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href={`tel:${cms.finalCta.salesRepPhone || "+905303412156"}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-md font-body font-semibold text-[15px] text-white border border-white/30 hover:border-white/60 hover:bg-white/10 transition-all duration-200"
            >
              <Phone size={16} />
              {cms.finalCta.salesRepBtnText || "Satış Temsilcisiyle Görüş"}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
