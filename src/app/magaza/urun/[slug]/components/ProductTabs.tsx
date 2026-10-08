"use client";

import React, { useState } from "react";
import { ChevronDown, FileText, HelpCircle, Truck, Compass } from "lucide-react";
import { STORE_CONFIG } from "@/config/store";

interface ProductTabsProps {
  product: any;
}

interface TabItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function ProductTabs({ product }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("features");
  const [openMobileAccordions, setOpenMobileAccordions] = useState<Record<string, boolean>>({
    features: true,
  });

  const toggleAccordion = (id: string) => {
    setOpenMobileAccordions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const tabs: TabItem[] = [];

  // 1. Özellikler
  const rawFeatures =
    product.features ||
    product.customizationOptions?.features ||
    null;

  if (rawFeatures || product.description) {
    tabs.push({
      id: "features",
      title: "Ürün Özellikleri",
      icon: <FileText size={16} />,
      content: (
        <div className="space-y-3 text-sm text-corp-charcoal dark:text-white/80 leading-relaxed">
          {product.description && (
            <p className="text-corp-gray dark:text-white/70">{product.description}</p>
          )}
          {Array.isArray(rawFeatures) ? (
            <ul className="list-disc list-inside space-y-1.5 pt-2">
              {rawFeatures.map((feat: any, idx: number) => (
                <li key={idx}>
                  {typeof feat === "string" ? feat : feat.title || feat.name || JSON.stringify(feat)}
                </li>
              ))}
            </ul>
          ) : typeof rawFeatures === "string" ? (
            <div dangerouslySetInnerHTML={{ __html: rawFeatures }} />
          ) : null}
        </div>
      ),
    });
  }

  // 2. Kullanım Alanları
  const rawUseCases =
    product.useCases ||
    product.customizationOptions?.useCases ||
    null;

  if (rawUseCases) {
    tabs.push({
      id: "useCases",
      title: "Kullanım Alanları",
      icon: <Compass size={16} />,
      content: (
        <div className="space-y-2 text-sm text-corp-charcoal dark:text-white/80 leading-relaxed">
          {Array.isArray(rawUseCases) ? (
            <ul className="list-disc list-inside space-y-1.5">
              {rawUseCases.map((uc: any, idx: number) => (
                <li key={idx}>
                  {typeof uc === "string" ? uc : uc.title || uc.name || JSON.stringify(uc)}
                </li>
              ))}
            </ul>
          ) : typeof rawUseCases === "string" ? (
            <div dangerouslySetInnerHTML={{ __html: rawUseCases }} />
          ) : null}
        </div>
      ),
    });
  }

  // 3. Teslimat ve İade
  tabs.push({
    id: "delivery",
    title: "Teslimat ve İade",
    icon: <Truck size={16} />,
    content: (
      <div className="space-y-3 text-sm text-corp-gray dark:text-white/70 leading-relaxed">
        <p>
          <strong className="text-corp-charcoal dark:text-white">Üretim & Kargolama:</strong>{" "}
          Sipariş onayınız ve baskı dosyası kontrolünün ardından ürününüz{" "}
          {STORE_CONFIG.productionEstimateText.toLowerCase()} aşamasından geçerek kargo firmasına teslim edilir.
        </p>
        <p>
          <strong className="text-corp-charcoal dark:text-white">Kargo Ücreti:</strong>{" "}
          {STORE_CONFIG.freeShippingThreshold} ₺ ve üzeri siparişlerde kargo bedavadır. Eşik altı siparişlerde standart sabit kargo ücreti{" "}
          {STORE_CONFIG.standardShippingFee} ₺'dir.
        </p>
        <p>
          <strong className="text-corp-charcoal dark:text-white">İade Koşulları:</strong>{" "}
          {STORE_CONFIG.returnPolicyText}
        </p>
      </div>
    ),
  });

  // 4. Sık Sorulan Sorular (SSS)
  const rawFaqs =
    product.faq ||
    product.faqs ||
    product.customizationOptions?.faq ||
    product.customizationOptions?.faqs ||
    null;

  if (rawFaqs && Array.isArray(rawFaqs) && rawFaqs.length > 0) {
    tabs.push({
      id: "faq",
      title: "Sık Sorulan Sorular",
      icon: <HelpCircle size={16} />,
      content: (
        <div className="space-y-4">
          {rawFaqs.map((item: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-corp-surface/50 dark:bg-white/5 border border-corp-border/60 dark:border-white/10"
            >
              <h4 className="font-bold text-xs text-corp-charcoal dark:text-white mb-1">
                {item.question || item.q || `Soru ${idx + 1}`}
              </h4>
              <p className="text-xs text-corp-gray dark:text-white/70 leading-relaxed">
                {item.answer || item.a}
              </p>
            </div>
          ))}
        </div>
      ),
    });
  }

  if (tabs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-corp-charcoal rounded-3xl border border-corp-border dark:border-white/10 p-6 sm:p-8 shadow-sm my-8">
      {/* Desktop Tabs Header */}
      <div className="hidden sm:flex border-b border-corp-border dark:border-white/10 gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-sm font-bold flex items-center gap-2 transition-all relative min-h-[44px] ${
                isActive
                  ? "text-corp-teal dark:text-teal-300"
                  : "text-corp-gray dark:text-white/60 hover:text-corp-charcoal dark:hover:text-white"
              }`}
            >
              {tab.icon}
              <span>{tab.title}</span>
              {isActive && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-corp-teal rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop Tab Body */}
      <div className="hidden sm:block pt-6">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>

      {/* Mobile Accordion */}
      <div className="sm:hidden space-y-3">
        {tabs.map((tab) => {
          const isOpen = Boolean(openMobileAccordions[tab.id]);
          return (
            <div
              key={tab.id}
              className="rounded-2xl border border-corp-border dark:border-white/10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleAccordion(tab.id)}
                className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between text-left font-bold text-xs text-corp-charcoal dark:text-white bg-corp-surface/30 dark:bg-white/5"
              >
                <span className="flex items-center gap-2">
                  {tab.icon}
                  <span>{tab.title}</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 text-corp-gray ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isOpen && <div className="p-4 pt-2 border-t border-corp-border/40">{tab.content}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
