import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bölgesel Kısıtlama — Çiçekana Mağaza",
  description: "Mağazamız yalnızca Türkiye içindeki siparişler için hizmet vermektedir.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function StoreRestrictedPage() {
  return (
    <main className="min-h-[75vh] flex items-center justify-center px-4 py-20 bg-corp-surface/50">
      <div className="max-w-md w-full bg-white rounded-2xl border border-corp-border shadow-corp-card p-8 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-6 border border-amber-200">
          <ShieldAlert size={32} />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-corp-surface text-corp-gray text-xs font-semibold uppercase tracking-wider mb-4 border border-corp-border">
          <ShoppingBag size={13} className="text-corp-teal" />
          <span>Bölgesel Teslimat Bildirimi</span>
        </div>

        <h1 className="font-display text-xl font-bold text-corp-charcoal mb-3">
          Hizmet Bölgesi Kısıtlaması
        </h1>

        <p className="font-body text-sm text-corp-gray leading-relaxed mb-5">
          Mağazamız yalnızca <strong>Türkiye</strong> içindeki siparişler için hizmet vermektedir. Yurt dışı adreslere fiziksel teslimat ve satışımız bulunmamaktadır.
        </p>

        <div className="bg-corp-surface/60 rounded-xl p-4 mb-8 border border-corp-border text-left">
          <p className="font-body text-xs text-corp-charcoal font-medium leading-relaxed">
            Our store serves orders within <strong>Türkiye</strong> only. We currently do not process international orders or shipments.
          </p>
        </div>

        <Link
          href="/homepage"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-5 rounded-xl bg-corp-teal hover:bg-corp-teal-600 text-white font-semibold text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <ArrowLeft size={16} />
          Ana Sayfaya Dön / Return to Homepage
        </Link>
      </div>
    </main>
  );
}
