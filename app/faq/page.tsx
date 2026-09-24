"use client";

import React, { useEffect, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FALLBACK_FAQS = [
  { id: "1", category: "Genel", question: "Çiçekana hangi sektörlere hizmet veriyor?", answer: "Finans, üretim, perakende, lojistik, sağlık ve eğitim başta olmak üzere tüm kurumsal sektörlere hizmet veriyoruz.", displayOrder: 0, isActive: true },
  { id: "2", category: "Fiyatlandırma", question: "Minimum proje büyüklüğü nedir?", answer: "Starter paketi ile 25 kişiye kadar şirketlerle çalışıyoruz. Proje bazlı da çalışabiliyoruz.", displayOrder: 1, isActive: true },
  { id: "3", category: "Süreç", question: "Proje süreci nasıl işliyor?", answer: "Stratejik görüşme → ihtiyaç analizi → teklif → onay → uygulama → devir teslim adımlarından oluşur. Ortalama 2-12 hafta.", displayOrder: 2, isActive: true },
  { id: "4", category: "Destek", question: "Proje bittikten sonra destek veriyor musunuz?", answer: "Evet. Growth ve Enterprise planlarında SLA garantili destek dahildir. Starter için ayrıca anlaşma yapılabilir.", displayOrder: 3, isActive: true },
  { id: "5", category: "Genel", question: "KVKK uyumluluk danışmanlığı da veriyor musunuz?", answer: "Evet. Siber güvenlik hizmetimizin içinde KVKK & GDPR uyumluluk danışmanlığı ve belgelendirme desteği yer almaktadır.", displayOrder: 4, isActive: true },
];

const CATEGORIES = ["Tümü", "Genel", "Fiyatlandırma", "Süreç", "Destek"];
const CATEGORY_COLORS: Record<string, string> = {
  Genel: "#0EA5E9", Fiyatlandırma: "#7C3AED", Süreç: "#F59E0B", Destek: "#10B981",
};

interface FAQ { id: string; category: string; question: string; answer: string; }

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>(FALLBACK_FAQS);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((data: FAQ[]) => { if (Array.isArray(data) && data.length > 0) setFaqs(data); })
      .catch(() => {});
  }, []);

  const filtered = activeCategory === "Tümü" ? faqs : faqs.filter((f) => f.category === activeCategory);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">SSS</span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6">
            Sıkça Sorulan{" "}
            <span className="text-corp-teal">Sorular</span>
          </h1>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mt-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="px-4 py-2 rounded-xl font-body text-[13px] font-semibold transition-all duration-200"
                style={{
                  background: activeCategory === cat ? "#0A4D68" : "#F5F6FA",
                  color: activeCategory === cat ? "white" : "#6B7280",
                  border: `1px solid ${activeCategory === cat ? "transparent" : "#E8E8EE"}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ list */}
      <section className="pb-28">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex flex-col gap-3">
            {filtered.map((faq) => {
              const isOpen = openId === faq.id;
              const accent = CATEGORY_COLORS[faq.category] || "#0EA5E9";
              return (
                <div
                  key={faq.id}
                  className="rounded-xl border overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: isOpen ? `${accent}40` : "#E8E8EE",
                    background: isOpen ? `${accent}05` : "#FFFFFF",
                  }}
                >
                  <button
                    className="w-full flex items-center justify-between gap-4 p-6 text-left"
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-0.5 rounded-full font-body text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${accent}15`, color: accent }}
                      >
                        {faq.category}
                      </span>
                      <h2 className="font-body text-[15px] font-semibold text-corp-charcoal text-left">
                        {faq.question}
                      </h2>
                    </div>
                    {isOpen
                      ? <ChevronUp size={18} style={{ color: accent }} className="flex-shrink-0" />
                      : <ChevronDown size={18} className="text-corp-gray flex-shrink-0" />
                    }
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <p className="px-6 pb-6 font-body text-[14px] text-corp-gray leading-relaxed border-t border-corp-border pt-4">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
