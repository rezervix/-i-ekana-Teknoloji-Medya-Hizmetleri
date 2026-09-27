import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Ürünlerimiz - Çiçekana Teknoloji & Medya",
  description: "Kurumsal iş süreçlerinizi optimize eden, ölçeklenebilir ve güvenli yapay zeka çözümlerini keşfedin.",
};

export default function AIAutomationPage() {
  return (
    <main className="min-h-screen bg-[#fcf9f8]">
      <Header />

      <main className="max-w-[1280px] mx-auto px-4 md:px-20 py-20">
        {/* Breadcrumb & Header */}
        <header className="mb-8">
          <Link
            className="inline-flex items-center gap-2 text-[#41484c] hover:text-[#002638] transition-colors text-[14px] mb-4"
            href="/homepage"
          >
            <ArrowLeft size={16} /> Ana Sayfa
          </Link>
          <div className="inline-block px-3 py-1 bg-[#f6f3f2] text-[#003f48] text-[12px] rounded uppercase tracking-wider mb-4 border border-[#c1c7cd]">
            ÜRÜNLERİMİZ
          </div>
          <h1 className="text-[40px] md:text-[56px] font-semibold leading-[48px] md:leading-[64px] text-[#002638] mb-2 md:w-3/4 tracking-tight">
            AI Ürünlerimiz
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#41484c] md:w-2/3">
            Kurumsal iş süreçlerinizi optimize eden, ölçeklenebilir ve güvenli yapay zeka çözümlerini keşfedin.
          </p>
        </header>

        {/* Product Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Card 1 - Microsoft Call Center AI */}
          <div className="flex flex-col bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <div className="mb-6 h-24 w-40">
              <img
                alt="Microsoft Logo"
                className="w-full h-full object-contain"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBGy0FrpKiXXH5mdjuLuAbv1FKM4HuhTOllbkt1h6x3RpzKjmh4aO5ii4ol-Y8CXHoshT9ixNvWGlInTPGmg8WnVz1ppMK8zoHmlsdgQ7TSCTa34XjODxU92x4v6QMMuoOYBCG9AKFOP89vlAPo0ns8ArHsj_O3HehmTDuzxsMN4k2UCkdaiC0zGZ958f8q5c08QrdFPA3F4mbtBdEeMW8-Yj5YpLGAXajHTr6q7Nn-AL80Hp8r4RnS"
              />
            </div>
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] mb-3">Microsoft Call Center AI</h3>
            <p className="text-[16px] leading-[24px] text-[#41484c] mb-8 flex-grow">
              Microsoft Call Center AI, işletmenizin müşteri hizmetlerini kolaylaştıran ve modernleştiren bir çözümdür. Müşterilerinizle telefon veya mesaj yoluyla yapılan görüşmeleri otomatik olarak yöneterek 7 gün 24 saat kesintisiz ve hızlı destek sunmanızı sağlar. Teknik karmaşıklığı ortadan kaldıran bu sistem sayesinde, müşterileriniz her zaman muhatap bulabilir ve sorunlarına hızlıca çözüm alabilirler.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-[#00b2c9] text-[14px] font-medium hover:text-[#002638] transition-colors mt-auto group"
              href="/services/ai-automation/microsoft-call-center-ai"
            >
              Ürünü İncele <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Product Card 2 - Faktura */}
          <div className="flex flex-col bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <div className="mb-6 h-24 w-40 flex items-center">
              <div className="flex flex-col gap-1">
                <span className="text-[28px] font-bold text-[#263d4a] tracking-tight leading-none">
                  faktura
                </span>
                <span className="text-[11px] font-semibold text-[#1A8FB5] tracking-widest uppercase leading-none">
                  muhasebe sistemi
                </span>
              </div>
            </div>
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] mb-3">
              Faktura Muhasebe Destek Sistemi
            </h3>
            <p className="text-[16px] leading-[24px] text-[#41484c] mb-8 flex-grow">
              Komisyonsuz, kendi sunucunuzda çalışan, sınırsız fatura, ödeme ve müşteri yönetimi sunan açık kaynak ön muhasebe altyapısı. KVKK uyumlu, Docker ile 5 dakikada kurulum.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-[#00b2c9] text-[14px] font-medium hover:text-[#002638] transition-colors mt-auto group"
              href="/services/ai-automation/faktura"
            >
              Ürünü İncele <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>


          {/* Product Card 3 - Midvem */}
          <div className="flex flex-col bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <div className="mb-6 h-24 w-40 flex items-center">
              <div className="flex flex-col gap-1">
                <span className="text-[28px] font-bold text-[#263d4a] tracking-tight leading-none">
                  midvem
                </span>
                <span className="text-[11px] font-semibold text-[#E8622A] tracking-widest uppercase leading-none">
                  müşteri iletişimi
                </span>
              </div>
            </div>
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] mb-3">
              Midvem Müşteri Destek ve İletişim Sistemi
            </h3>
            <p className="text-[16px] leading-[24px] text-[#41484c] mb-8 flex-grow">
              WhatsApp, Instagram, Canlı Destek ve E-postaları tek merkezde birleştiren, yapay zeka taslaklarıyla yanıt sürelerini %70 kısaltan KOBİ müşteri iletişim platformu.
            </p>
            <Link
              className="inline-flex items-center gap-2 text-[#00b2c9] text-[14px] font-medium hover:text-[#002638] transition-colors mt-auto group"
              href="/services/ai-automation/midvem"
            >
              Ürünü İncele <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Product Card 4 - Kuşçu Finansal Yapay Zeka */}
          <div className="flex flex-col bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <div className="mb-6 h-24 w-40 flex items-center">
              <div className="flex flex-col gap-1">
                <span className="text-[28px] font-bold text-[#0f172a] tracking-tight leading-none">kuşçu</span>
                <span className="text-[11px] font-semibold text-[#2563eb] tracking-widest uppercase leading-none">finansal yapay zeka</span>
              </div>
            </div>
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] mb-3">Kuşçu Finansal Yapay Zeka</h3>
            <p className="text-[16px] leading-[24px] text-[#41484c] mb-8 flex-grow">BIST, KAP, finansal haberler ve piyasa sinyallerini yapay zeka ile analiz eden finansal akıl ve tahminleme platformu.</p>
            <Link className="inline-flex items-center gap-2 text-[#00b2c9] text-[14px] font-medium hover:text-[#002638] transition-colors mt-auto group" href="/services/ai-automation/kuscu">
              Ürünü İncele <ArrowRight data-icon="inline-end" className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Product Card 5 - Coming Soon */}
          <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] opacity-60">Çok Yakında</h3>
          </div>

          {/* Product Card 5 - Coming Soon */}
          <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] opacity-60">Çok Yakında</h3>
          </div>

          {/* Product Card 6 - Coming Soon */}
          <div className="flex flex-col items-center justify-center bg-white p-8 rounded-xl border border-[#c1c7cd]/50 shadow-sm hover:shadow-[0px_4px_20px_rgba(10,61,84,0.08)] transition-all duration-300 relative min-h-[480px]">
            <h3 className="text-[24px] font-semibold leading-[32px] text-[#002638] opacity-60">Çok Yakında</h3>
          </div>
        </div>
      </main>

      <Footer />
    </main>
  );
}
