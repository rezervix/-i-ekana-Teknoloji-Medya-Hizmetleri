import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FakturaContent from "./FakturaContent";

export const metadata: Metadata = {
  title: "Faktura Muhasebe Destek Sistemi — Komisyonsuz Açık Kaynak Ön Muhasebe | Çiçekana Teknoloji",
  description:
    "Komisyonsuz, kendi sunucunuzda çalışan, sınırsız fatura, ödeme ve müşteri yönetimi sunan açık kaynak ön muhasebe altyapısı. Solo Core ₺10.000, Enterprise Prime ₺20.000 — tek seferlik ömür boyu lisans.",
  openGraph: {
    title: "Faktura — Modern B2B Fatura & Müşteri Portalı",
    description:
      "Kendi altyapınızda güvenli, sınırsız ve işlem maliyetsiz finansal egemenlik. KVKK uyumlu, Docker ile 5 dakikada kurulum.",
    type: "website",
  },
};

export default function FakturaPage() {
  return (
    <main className="min-h-screen bg-[#f0f4f6]">
      <Header />
      <FakturaContent />
      <Footer />
    </main>
  );
}
