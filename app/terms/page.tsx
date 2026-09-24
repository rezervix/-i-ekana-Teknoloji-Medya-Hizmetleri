import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Kullanım Koşulları — Çiçekana",
  description: "Çiçekana Teknoloji ve Medya hizmet kullanım koşulları.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <section className="pt-40 pb-28">
        <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16">
          <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">
            Yasal
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-10">
            Kullanım Koşulları
          </h1>
          <div className="prose prose-lg max-w-none
            prose-headings:font-display prose-headings:text-corp-charcoal prose-headings:tracking-tight
            prose-p:text-corp-gray prose-p:font-body prose-p:leading-relaxed
            prose-strong:text-corp-charcoal
            prose-a:text-corp-teal prose-a:no-underline hover:prose-a:underline
            prose-ul:text-corp-gray prose-li:text-corp-gray
            prose-hr:border-corp-border">
            <p><strong>Son güncelleme:</strong> 9 Nisan 2026</p>
            <h2>1. Kabul</h2>
            <p>Bu web sitesini kullanarak aşağıdaki koşulları kabul etmiş sayılırsınız. Koşulları kabul etmiyorsanız siteyi kullanmayınız.</p>
            <h2>2. Hizmet Tanımı</h2>
            <p>Çiçekana Teknoloji ve Medya Hizmetleri, kurumsal teknoloji danışmanlığı, medya prodüksiyonu ve strateji hizmetleri sunmaktadır.</p>
            <h2>3. Fikri Mülkiyet</h2>
            <p>Bu web sitesindeki tüm içerik — metinler, görseller, logolar, tasarımlar ve yazılım — Çiçekana'nın mülkiyetindedir. İzinsiz kopyalanamaz, dağıtılamaz veya ticarileştirilemez.</p>
            <h2>4. Sorumluluk Sınırlaması</h2>
            <p>Web sitesinin kullanımından doğabilecek doğrudan veya dolaylı zararlar için Çiçekana sorumlu tutulamaz. İçerik bilgilendirme amaçlı olup profesyonel danışmanlık yerine geçmez.</p>
            <h2>5. Hizmet Sözleşmeleri</h2>
            <p>Müşteri ile imzalanan ayrı hizmet sözleşmeleri bu genel koşulların önünde tutulur. Sözleşme anlaşmazlıklarında Türk Hukuku geçerlidir ve İstanbul mahkemeleri yetkilidir.</p>
            <h2>6. Değişiklikler</h2>
            <p>Bu koşullar önceden bildirim yapılmaksızın değiştirilebilir. Güncel versiyonu düzenli olarak incelemeniz önerilir.</p>
            <h2>7. İletişim</h2>
            <p>Sorularınız için: <a href="mailto:legal@cicekanatechmedia.com">legal@cicekanatechmedia.com</a></p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
