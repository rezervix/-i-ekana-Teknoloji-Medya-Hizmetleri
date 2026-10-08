import React from "react";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Home } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ProductNotFound() {
  return (
    <main className="min-h-screen bg-corp-surface pt-28 pb-20 flex flex-col justify-between">
      <Header />
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-corp-teal/10 flex items-center justify-center text-corp-teal mb-6">
          <ShoppingBag size={40} />
        </div>
        <span className="text-xs font-bold text-corp-coral uppercase tracking-widest block mb-2">
          404 — Ürün Bulunamadı
        </span>
        <h1 className="font-display text-3xl font-extrabold text-corp-charcoal dark:text-white mb-3">
          Aradığınız Ürün Mevcut Değil
        </h1>
        <p className="text-sm text-corp-gray max-w-md mx-auto mb-8 leading-relaxed">
          Aradığınız ürün yayından kaldırılmış, bağlantısı değişmiş veya geçici olarak ulaşılamıyor olabilir.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/magaza"
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-corp-teal hover:bg-corp-teal-600 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            <span>Mağazaya Dön</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl border border-corp-border text-corp-charcoal dark:text-white font-semibold text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            <span>Ana Sayfa</span>
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
