"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight, CheckCircle, Zap, Shield, AlertCircle, ShoppingCart, TrendingUp, Search, Smartphone, MessageCircle, Info, Star, ChevronDown, ChevronUp
} from "lucide-react";

// Tooltip component
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

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};
const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const packages = [
  {
    id: "gold",
    name: "Gold Paket",
    monthly: "5.417",
    yearlyTotal: "65.000",
    crossedOut: "97.500",
    installment: "Vade Farksız 6 Ay Taksit",
    featured: false,
    accent: "#0A4D68",
    features: [
      { name: "Gelişmiş Sepet Hatırlatma", tooltip: "Sepette ürün bırakma e-postalarını belirli aralıklarla birden fazla kez gönderebilir ve indirim kodu tanımlayabilirsiniz. Bunun yanı sıra SMS ve otomatik kurgularla da indirim kodu ekleyerek müşteri dönüşüm oranını artırabilirsiniz." },
      { name: "Çapraz Satış", tooltip: "Çapraz satış özelliği sayesinde müşterilerinize, ödeme sayfasında dilediğiniz ürünü indirimli veya indirimsiz sunabilirsiniz." },
      { name: "Ürün Paketleme & Kargolama Hizmeti", tooltip: null },
      { name: "Kurulum ve Yayına Alma WhatsApp Desteği 7/24", tooltip: null },
      { name: "Kendi Sanal POS'unuzu Kullanma Seçeneği", tooltip: null },
      { name: "Ürün Yorum Hatırlatma", tooltip: null },
      { name: "Ürün Yorumlarına Cevap Verme", tooltip: null },
      { name: "Ürün Yorumlarında Görsel", tooltip: null },
      { name: "Alan Adı (Domain) Bağlayabilme", tooltip: null },
      { name: "Sınırsız Trafik ve Web Alanı", tooltip: null },
    ],
    bonus: "Ekstra paket olarak Meta Reklam Danışmanlık veya Sosyal Medya Yönetim hizmeti satın alan işletmelere 10.000 TL'lik reklam bütçesi hediye",
  },
  {
    id: "plus",
    name: "Plus Paket",
    monthly: "16.666",
    yearlyTotal: "200.000",
    crossedOut: "300.000",
    installment: "Vade Farksız 9 Ay Taksit",
    featured: true,
    accent: "#E8622A",
    features: [
      { name: "Gold Paketteki Tüm Özellikler", tooltip: null, bold: true },
      { name: "Özelleştirilmiş Arama Sonuçları (SEO)", tooltip: null },
      { name: "WhatsApp ChatBot Desteği", tooltip: "WhatsApp hesabınıza bağlanan ve sizin yerinize müşterileriniz ile 7/24 sohbet eden bir yapay zeka aracı." },
      { name: "Öncelikli Destek Hattı 7/24", tooltip: null },
      { name: "B2B / Toptan Satış", tooltip: null },
      { name: "Mobil Uygulama", tooltip: "Webview Uygulama" },
      { name: "Otomatik Sepet Hatırlatma Bildirimi", tooltip: null },
      { name: "Alan Adı (Domain) Bağlayabilme", tooltip: null },
      { name: "Sınırsız Trafik ve Web Alanı", tooltip: null },
    ],
    bonus: null,
  },
];

const highlights = [
  { icon: ShoppingCart, label: "Sepet Kurtarma", desc: "Terk edilen sepetleri otomatik hatırlatmalarla satışa çevirin, dönüşüm oranınızı katlayın.", color: "#E8622A" },
  { icon: TrendingUp, label: "Çapraz Satış", desc: "Ödeme adımında akıllı ürün önerileriyle sepet tutarını ve kar marjını anında artırın.", color: "#10B981" },
  { icon: Search, label: "Gelişmiş SEO", desc: "Arama motorlarında organik olarak üst sıralara çıkarak reklam maliyetlerinizi düşürün.", color: "#0EA5E9" },
  { icon: MessageCircle, label: "WhatsApp Yapay Zeka", desc: "7/24 çalışan chatbot ile müşterilerinize anında destek sunun ve satışları otomatikleştirin.", color: "#0A4D68" },
  { icon: Smartphone, label: "Mobil Uygulama", desc: "Müşterilerinize özel WebView mobil uygulama ile marka sadakatini ve tekrar satın almayı artırın.", color: "#8B5CF6" },
  { icon: Zap, label: "7/24 Destek", desc: "Kurulumdan yayına kadar her aşamada yanınızdayız, teknik detaylarla zaman kaybetmeyin.", color: "#F59E0B" },
];

const faqs = [
  { id: "f1", q: "Sözleşme süresi ne kadar?", a: "E-ticaret paketlerimiz yıllık olarak fiyatlandırılır ve 12 aylık sözleşme kapsamında sunulur. Taahhüt süreniz boyunca fiyat garantisi altındasınız." },
  { id: "f2", q: "Kendi Sanal POS'umu kullanabilir miyim?", a: "Evet, her iki paketimizde de halihazırda anlaştığınız banka veya ödeme kuruluşunun sanal POS'unu sisteminize kolayca entegre edebilirsiniz." },
  { id: "f3", q: "Mevcut domainimi (alan adımı) taşıyabilir miyim?", a: "Kesinlikle. Sahip olduğunuz alan adını altyapımıza sorunsuz bir şekilde bağlayabilirsiniz. Ekibimiz yönlendirme sürecinde size tam destek sağlar." },
  { id: "f4", q: "Destek taleplerine ne kadar sürede dönüş yapıyorsunuz?", a: "7/24 WhatsApp destek hattımız üzerinden bize ulaşabilirsiniz. Talepleriniz anında işleme alınır. Plus pakette doğrudan öncelikli destek hattına bağlanırsınız." },
  { id: "f5", q: "Hangi e-ticaret altyapısını kullanıyorsunuz?", a: "Tamamen kendi geliştirdiğimiz, yüksek performanslı ve arama motoru dostu özel bir e-ticaret altyapısı kullanıyoruz. Sınırsız trafik ve web alanı ile kesintisiz büyüme garantisi sunuyoruz." },
];

function PkgCard({ pkg }: { pkg: typeof packages[0] }) {
  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${pkg.featured ? "scale-[1.03] shadow-corp-hover z-10" : "shadow-corp-card z-0 mt-4 lg:mt-0"}`}
      style={{
        background: pkg.featured ? "rgba(232,98,42,0.04)" : "#FFFFFF",
        borderColor: pkg.featured ? "rgba(232,98,42,0.35)" : "#E8E8EE",
      }}
    >
      {pkg.featured && (
        <div
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full font-body text-[11px] font-bold text-white whitespace-nowrap"
          style={{ background: "linear-gradient(135deg, #E8622A, #f59e0b)" }}
        >
          ⭐ En Popüler
        </div>
      )}

      <div className="mb-4">
        <span className="font-body text-[13px] font-bold tracking-widest uppercase block mb-3" style={{ color: pkg.accent }}>
          {pkg.name}
        </span>

        {/* Strikethrough price */}
        <div className="font-body text-[15px] font-medium text-corp-gray-light line-through mb-1">
          ₺{pkg.crossedOut}
        </div>

        {/* Monthly price */}
        <div className="flex items-end gap-1 mb-1">
          <span className="font-display text-4xl lg:text-5xl text-corp-charcoal font-bold leading-none">₺{pkg.monthly}</span>
          <span className="font-body text-[16px] font-bold text-corp-charcoal mb-1">/ ay</span>
        </div>

        {/* Yearly total */}
        <p className="font-body text-[14px] text-corp-gray font-medium mb-4">
          ₺{pkg.yearlyTotal} yıllık toplam
        </p>
        
        {/* Installment Badge */}
        <div className="inline-block px-3 py-1.5 rounded-md font-body text-[12px] font-bold mb-4" style={{ background: `${pkg.accent}15`, color: pkg.accent }}>
          {pkg.installment}
        </div>
      </div>

      <a
        href="https://wa.me/90XXXXXXXXXX?text=E-ticaret%20paketi%20sat%C4%B1n%20almak%20istiyorum"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-4 rounded-xl font-body font-bold text-[15px] transition-all hover:-translate-y-0.5 mb-6"
        style={
          pkg.featured
            ? { background: "linear-gradient(135deg, #E8622A, #f59e0b)", color: "white", boxShadow: "0 8px 30px rgba(232,98,42,0.3)" }
            : { background: `${pkg.accent}12`, color: pkg.accent, border: `1px solid ${pkg.accent}30` }
        }
      >
        Hemen Satın Al <ArrowRight size={16} />
      </a>

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
          <li key={i} className={`flex items-start gap-2.5 font-body text-[13.5px] ${('bold' in f && f.bold) ? 'font-bold text-corp-charcoal' : 'text-corp-gray'}`}>
            <CheckCircle size={16} style={{ color: pkg.accent }} className="flex-shrink-0 mt-0.5" />
            <span className="leading-snug">
              {f.name}
              {f.tooltip && <Tooltip content={f.tooltip} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FAQItem({ faq }: { faq: typeof faqs[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-300"
      style={{ borderColor: open ? "rgba(10,77,104,0.4)" : "#E8E8EE", background: open ? "rgba(10,77,104,0.03)" : "#FFF" }}
    >
      <button className="w-full flex items-center justify-between gap-4 p-6 text-left" onClick={() => setOpen(!open)}>
        <span className="font-body text-[15px] font-semibold text-corp-charcoal">{faq.q}</span>
        {open ? <ChevronUp size={18} className="text-corp-teal flex-shrink-0" /> : <ChevronDown size={18} className="text-corp-gray flex-shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="px-6 pb-6 font-body text-[14px] text-corp-gray leading-relaxed border-t border-corp-border pt-4">{faq.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ETicaretPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[600px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(10,77,104,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom left, rgba(232,98,42,0.04) 0%, transparent 70%)" }} />

        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div variants={container} initial="hidden" animate="visible" className="max-w-4xl mx-auto text-center">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body text-[11px] font-semibold tracking-widest uppercase text-corp-teal bg-corp-teal-50 border border-corp-teal/20 mb-6">
                Uçtan Uca Yönetilen E-Ticaret
              </span>
            </motion.div>

            <motion.h1 variants={item} className="font-display font-bold text-corp-charcoal leading-[1.08] tracking-tight mb-6" style={{ fontSize: "clamp(2.4rem, 4.5vw, 4rem)" }}>
              Daha Fazla Satış,{" "}
              <span className="text-corp-teal">Daha Az</span>{" "}
              Terk Edilmiş{" "}
              <span className="text-corp-coral">Sepet</span>
            </motion.h1>

            <motion.p variants={item} className="font-body text-[18px] text-corp-gray leading-[1.75] max-w-2xl mx-auto mb-10">
              İşletmenizi dijitale taşırken teknik detaylarla uğraşmayın. Gelişmiş çapraz satış, yapay zeka entegrasyonu ve sepet kurtarma araçlarıyla satışlarınızı anında artırın.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#paketler"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[16px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5"
                style={{ boxShadow: "0 6px 28px rgba(232,98,42,0.3)" }}
              >
                Hemen Başla <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="py-8 bg-corp-surface border-y border-corp-border">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-teal mb-1">%42</span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider">Ortalama Dönüşüm Artışı</span>
            </div>
            <div className="hidden md:block w-px h-10 bg-corp-border"></div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-charcoal mb-1">250+</span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider">Aktif E-Ticaret Mağazası</span>
            </div>
            <div className="hidden md:block w-px h-10 bg-corp-border"></div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-corp-coral mb-1">%98</span>
              <span className="font-body text-[13px] text-corp-gray font-medium uppercase tracking-wider">Müşteri Memnuniyeti</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT DO YOU GET ── */}
      <section className="py-24 bg-white">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-16">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Özellikler</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">Satışlarınızı Büyütecek Araçlar</h2>
            <p className="font-body text-[17px] text-corp-gray max-w-2xl mx-auto">Sadece bir web sitesi değil, cironuzu katlamak için tasarlanmış tam donanımlı bir satış platformu sunuyoruz.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((h) => (
              <div key={h.label} className="corp-service-card bg-white rounded-2xl border border-corp-border p-8 flex flex-col gap-5 shadow-sm hover:shadow-md transition-all">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${h.color}12`, border: `1px solid ${h.color}25` }}>
                  <h.icon size={26} style={{ color: h.color }} />
                </div>
                <div>
                  <h3 className="font-display text-[20px] font-bold text-corp-charcoal mb-2">{h.label}</h3>
                  <p className="font-body text-[14.5px] text-corp-gray leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BONUS CALLOUT ── */}
      <section className="py-8 bg-[#fef3c7] border-y border-[#f59e0b]/20">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
          <Star size={28} className="text-[#d97706] flex-shrink-0" fill="#d97706" />
          <p className="font-body text-[15px] text-[#92400e]">
            <strong className="font-bold text-[#78350f] text-[16px]">Büyük Fırsat:</strong> Ekstra paket olarak Meta Reklam Danışmanlık veya Sosyal Medya Yönetim hizmeti satın alan tüm işletmelere <strong className="font-bold text-[#78350f]">10.000 TL değerinde reklam bütçesi</strong> anında hediye!
          </p>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="paketler" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #ffffff 100%)" }}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(10,77,104,0.06) 0%, transparent 70%)" }} />
        
        <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-16 relative">
          <div className="text-center mb-16">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Yatırımınızın Karşılığı</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">Şeffaf, Net ve Kazandıran Paketler</h2>
            <p className="font-body text-[17px] text-corp-gray max-w-2xl mx-auto">Vade farksız taksit imkanlarıyla işinizi büyütürken nakit akışınızı koruyun.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto">
            {packages.map((pkg) => <PkgCard key={pkg.id} pkg={pkg} />)}
          </div>
        </div>
      </section>

      {/* ── SSS ── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-14">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">SSS</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight">Sıkça Sorulan Sorular</h2>
          </div>
          <div className="flex flex-col gap-3">
            {faqs.map((f) => <FAQItem key={f.id} faq={f} />)}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0A4D68 0%, #083D52 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(232,98,42,0.12) 0%, transparent 60%)" }} />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 relative text-center">
          <h2 className="font-display font-bold text-white leading-tight mb-6" style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)" }}>
            E-Ticarette Rakiplerinizin<br className="hidden md:block" />{" "}
            <span className="text-corp-coral">Bir Adım Önüne Geçin</span>
          </h2>
          <p className="font-body text-[18px] text-white/80 leading-relaxed max-w-2xl mx-auto mb-10">
            Daha fazla ertelemeyin. Uçtan uca yönetilen profesyonel e-ticaret altyapınızla bugün satışa başlayın ve gelirinizi katlayın.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#paketler"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[16px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5"
              style={{ boxShadow: "0 8px 30px rgba(232,98,42,0.4)" }}
            >
              Paketini Seç, Başla <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="tel:+90XXXXXXXXXX"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-md font-body font-semibold text-[15px] text-white border border-white/30 hover:border-white/60 hover:bg-white/10 transition-all duration-200"
            >
              Satış Temsilcisiyle Görüş
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
