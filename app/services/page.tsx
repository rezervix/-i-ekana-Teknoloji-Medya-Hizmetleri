import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Cpu, Film, Server, BrainCircuit, Shield, TrendingUp, ArrowRight, CheckCircle, Rocket } from "lucide-react";

export const metadata: Metadata = {
  title: "Hizmetler — Çiçekana Teknoloji & Medya",
  description: "Kurumsal teknoloji altyapısı, medya prodüksiyonu, yapay zeka otomasyonu, genç girişimci desteği ve stratejik danışmanlık hizmetleri.",
};

const services = [
  {
    slug: "ai-automation",
    icon: BrainCircuit,
    accent: "#0EA5E9",
    title: "Yapay Zeka & Otomasyon",
    shortDesc: "CrewAI agent pipeline'ları, LLM entegrasyonları ve süreç otomasyonu.",
    features: ["LLM & RAG entegrasyon", "CrewAI agent pipeline", "İş akışı otomasyonu", "Veri analitiği & raporlama"],
  },
  {
    slug: "genc-girisimci-destegi",
    icon: Rocket,
    accent: "#E8622A",
    title: "Genç Girişimci Desteği",
    shortDesc: "E-ticaret sitesi, ikas altyapısı, nişe özel ürün operasyonu, depolama ve fulfillment desteği.",
    features: ["Profesyonel ikas e-ticaret sitesi", "Nişe özel ürün & tedarik operasyonu", "Depolama, sipariş ve paketleme", "Fulfillment & kargoya teslimat"],
    badge: "GİRİŞİMCİ ÖZEL",
  },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* Hero */}
      <section className="pt-40 pb-20 bg-white relative overflow-hidden">
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(232,98,42,0.04) 0%, transparent 70%)" }}
        />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Hizmetlerimiz
          </span>
          <h1 className="font-display text-5xl md:text-6xl text-corp-charcoal tracking-tight mb-6 max-w-3xl">
            Kurumsal Ölçekte{" "}
            <span className="text-corp-teal">Entegre Çözümler</span>
          </h1>
          <p className="font-body text-lg text-corp-gray leading-relaxed max-w-2xl">
            Teknoloji, medya ve otomasyon alanlarında uçtan uca hizmet sunuyoruz. Her çözüm, şirketinizin DNA'sına özel tasarlanır.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="pb-28">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((s) => (
              <Link
                key={s.slug}
                href={`/services/${s.slug}`}
                className="corp-service-card group relative flex flex-col gap-6 p-8 rounded-xl border border-corp-border bg-white overflow-hidden"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none"
                  style={{ boxShadow: `inset 0 0 60px ${s.accent}08` }}
                />

                {s.badge && (
                  <span
                    className="absolute top-5 right-5 px-2.5 py-0.5 rounded-full text-[10px] font-body font-bold"
                    style={{ background: `${s.accent}15`, color: s.accent, border: `1px solid ${s.accent}30` }}
                  >
                    {s.badge}
                  </span>
                )}

                <div
                  className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.accent}12`, border: `1px solid ${s.accent}25` }}
                >
                  <s.icon size={22} style={{ color: s.accent }} />
                </div>

                <div className="relative z-10 flex-1">
                  <h2 className="font-display text-xl text-corp-charcoal mb-3 group-hover:text-corp-teal transition-colors duration-200">
                    {s.title}
                  </h2>
                  <p className="font-body text-[14px] text-corp-gray leading-relaxed mb-5">{s.shortDesc}</p>
                  <ul className="flex flex-col gap-2">
                    {s.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 font-body text-[13px] text-corp-gray">
                        <CheckCircle size={13} style={{ color: s.accent }} className="flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative z-10 flex items-center gap-2 font-body text-[13px] font-semibold" style={{ color: s.accent }}>
                  Detayları İncele
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
