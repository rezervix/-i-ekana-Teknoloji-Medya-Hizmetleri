"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  ArrowRight, MapPin, Clock, FileText, Users, Star,
  ChevronDown, ChevronUp, CheckCircle, Zap, TrendingUp, Shield, AlertCircle
} from "lucide-react";

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};
const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const packages = [
  {
    id: "3ay",
    name: "3 Aylık",
    total: "111.000",
    installmentAmount: "37.000",
    installmentCount: 3,
    interest: "%0 faiz",
    featured: false,
    accent: "#06B6D4",
  },
  {
    id: "6ay",
    name: "6 Aylık",
    total: "225.000",
    installmentAmount: "37.500",
    installmentCount: 6,
    interest: "%0 faiz",
    featured: false,
    accent: "#0A4D68",
  },
  {
    id: "12ay",
    name: "12 Aylık",
    total: "495.000",
    installmentAmount: "55.000",
    installmentCount: 9,
    interest: "%0 faiz",
    featured: true,
    accent: "#E8622A",
  },
];

const features = [
  { icon: Clock, label: "Günde 6 Saat", sub: "Mardin sokaklarında aktif dolaşım", color: "#0EA5E9" },
  { icon: MapPin, label: "Haftada 4 Gün", sub: "Tutarlı ve sürekli marka görünürlüğü", color: "#0A4D68" },
  { icon: FileText, label: "1.000 Broşür/Ay", sub: "El ilanı veya afiş dağıtımı dahil", color: "#E8622A" },
  { icon: Users, label: "Turizm Ortaklığı", sub: "Turistlerin yoğun olduğu noktalara erişim", color: "#10B981" },
];

const whyUs = [
  {
    icon: Star,
    title: "Turizm Şirketi Ortaklığı",
    desc: "Mardin'deki turizm şirketleriyle kurduğumuz özel ortaklık sayesinde turistlerin en yoğun olduğu cadde ve meydanları tespit ediyor, tablamızı tam o noktalara yönlendiriyoruz. Bu ayrıcalığa başka hiçbir rakip sahip değil.",
    accent: "#E8622A",
  },
  {
    icon: MapPin,
    title: "Şehrin Kalbinde Hareket",
    desc: "Gezgin Tabela sabit durmuyor. Mardin'in en işlek caddelerini, tarihi alanlarını ve turist güzergahlarını gezerek markanızı binlerce kişiye ulaştırıyor.",
    accent: "#0A4D68",
  },
  {
    icon: TrendingUp,
    title: "Ölçülebilir Erişim",
    desc: "Aylık 1.000 broşür dağıtımı ve 6 saatlik günlük aktif varlıkla markanız görünür olmaya devam eder. Yayın raporu her ay tarafınıza iletilir.",
    accent: "#0EA5E9",
  },
  {
    icon: Shield,
    title: "Kanıtlanmış Yerel Otorite",
    desc: "Mardin'i tanıyoruz. Hangi mahallenin, hangi saatte, hangi kitlelere ev sahipliği yaptığını biliyor; buna göre hareket ediyoruz.",
    accent: "#10B981",
  },
];

const faqs = [
  {
    id: "f1",
    q: "Tabela hangi bölgelerde dolaşıyor?",
    a: "Mardin'in turistik merkezi, tarihi çarşılar, otel bölgeleri ve turizm şirketlerimizin yönlendirdiği yoğun noktalarda aktif olarak dolaşmaktadır.",
  },
  {
    id: "f2",
    q: "Broşürlerimi nasıl teslim ediyorum?",
    a: "Tasarım desteği sunuyoruz. Hazır dosyanızı gönderin veya ekibimiz sizin için tasarlasın — baskı ve dağıtım tamamen bizde.",
  },
  {
    id: "f3",
    q: "Sözleşme süresi ne zaman başlar?",
    a: "Ödemenizin onaylanmasının ardından 5 iş günü içinde hizmet başlar. Başlangıç tarihinizi sizinle birlikte planlıyoruz.",
  },
  {
    id: "f4",
    q: "Aylık raporlama var mı?",
    a: "Evet. Her ay rotalar, geçilen noktalar ve dağıtılan broşür adedi hakkında raporlama alırsınız.",
  },
  {
    id: "f5",
    q: "Bölgemde kaç slot kaldı?",
    a: "Mardin'de her ilçe için sınırlı sayıda aktif slot tutuyoruz. Aynı bölgede birden fazla rakip işletmeyle çalışmıyoruz.",
  },
  {
    id: "f6",
    q: "12 aylık pakette neden 9 taksit var?",
    a: "12 aylık pakette %0 faizle 9 taksit imkanı sunuyoruz. Yıllık taahhütle avantajlı fiyat + esnek ödeme bir arada.",
  },
];

function PkgCard({ pkg }: { pkg: typeof packages[0] }) {
  return (
    <div
      className={`relative flex flex-col p-8 rounded-2xl border transition-all duration-300 ${pkg.featured ? "scale-[1.03] shadow-corp-hover" : "shadow-corp-card"}`}
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
          ⭐ En İyi Değer — Önerilen
        </div>
      )}

      <div className="mb-2">
        <span className="font-body text-[11px] font-bold tracking-widest uppercase block mb-3" style={{ color: pkg.accent }}>
          {pkg.name}
        </span>

        {/* Taksit tutarı — büyük ve ön plana çıkan */}
        <div className="flex items-end gap-2 mb-1">
          <span className="font-display text-4xl text-corp-charcoal font-bold">₺{pkg.installmentAmount}</span>
          <span
            className="mb-1 px-2 py-0.5 rounded-md font-body text-[12px] font-bold"
            style={{ background: `${pkg.accent}15`, color: pkg.accent }}
          >
            ×{pkg.installmentCount}
          </span>
        </div>

        {/* Toplam fiyat — küçük ve soluk */}
        <p className="font-body text-[12px] text-corp-gray-light">
          Toplam ₺{pkg.total} · {pkg.interest}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5 my-6 flex-1">
        {["Günde 6 saat aktif dolaşım", "Haftada 4 gün sokak görünürlüğü", "1.000 broşür/afiş dağıtımı", "Turizm odaklı konum optimizasyonu", "Aylık raporlama"].map((f) => (
          <li key={f} className="flex items-center gap-2.5 font-body text-[13px] text-corp-gray">
            <CheckCircle size={14} style={{ color: pkg.accent }} className="flex-shrink-0" />
            {f}
          </li>
        ))}
        {pkg.featured && (
          <li className="flex items-center gap-2.5 font-body text-[13px] font-semibold" style={{ color: pkg.accent }}>
            <CheckCircle size={14} style={{ color: pkg.accent }} className="flex-shrink-0" />
            Öncelikli turizm rotası erişimi
          </li>
        )}
      </ul>

      <a
        href="https://wa.me/90XXXXXXXXXX?text=Gezgin%20Tabela%20hizmetini%20sat%C4%B1n%20almak%20istiyorum"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 py-4 rounded-xl font-body font-bold text-[14px] transition-all hover:-translate-y-0.5"
        style={
          pkg.featured
            ? { background: "linear-gradient(135deg, #E8622A, #f59e0b)", color: "white", boxShadow: "0 8px 30px rgba(232,98,42,0.3)" }
            : { background: `${pkg.accent}12`, color: pkg.accent, border: `1px solid ${pkg.accent}30` }
        }
      >
        Hemen Satın Al <ArrowRight size={15} />
      </a>
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

export default function GerillaPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />

      {/* ── HERO ── */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-white">
        <div className="absolute top-0 right-0 w-[600px] h-[500px] pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, rgba(232,98,42,0.07) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-96 h-96 pointer-events-none" style={{ background: "radial-gradient(ellipse at bottom left, rgba(10,77,104,0.05) 0%, transparent 70%)" }} />

        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <motion.div variants={container} initial="hidden" animate="visible" className="max-w-4xl">
            <motion.div variants={item}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body text-[11px] font-semibold tracking-widest uppercase text-corp-coral bg-corp-coral-light border border-corp-coral/20 mb-6">
                Gerilla Pazarlama — Mardin
              </span>
            </motion.div>

            <motion.h1 variants={item} className="font-display font-bold text-corp-charcoal leading-[1.08] tracking-tight mb-6" style={{ fontSize: "clamp(2.4rem, 4.5vw, 3.8rem)" }}>
              Mardin Sokaklarında{" "}
              <span className="text-corp-teal">Markanız</span>{" "}
              Turist Gözlerinin{" "}
              <span className="text-corp-coral">Tam Önünde</span>
            </motion.h1>

            <motion.p variants={item} className="font-body text-[18px] text-corp-gray leading-[1.75] max-w-2xl mb-8">
              Gezgin Tabela, turizm şirketlerimizin verisiyle turistlerin en çok takıldığı noktalara gidiyor. Günde 6 saat, haftada 4 gün — markanız Mardin'in kalbinde.
            </motion.p>

            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4">
              <a
                href="#paketler"
                className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[15px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5"
                style={{ boxShadow: "0 6px 28px rgba(232,98,42,0.3)" }}
              >
                Hemen Satın Al <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#nedir"
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-md font-body font-semibold text-[14px] text-corp-teal bg-white border border-corp-teal hover:bg-corp-teal-50 transition-all duration-200 hover:-translate-y-0.5"
              >
                Daha Fazla Bilgi
              </a>
            </motion.div>

            <motion.div variants={item} className="flex flex-wrap gap-4 mt-8">
              {[["6 Saat/Gün", "Aktif dolaşım"], ["4 Gün/Hafta", "Sürekli görünürlük"], ["1.000 Broşür/Ay", "Dahil"]].map(([v, l]) => (
                <div key={v} className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-corp-surface border border-corp-border">
                  <span className="font-display font-bold text-corp-teal text-[15px]">{v}</span>
                  <span className="font-body text-[12px] text-corp-gray font-medium">{l}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
        <div className="h-px bg-corp-border mt-24" />
      </section>

      {/* ── NE'DIR ── */}
      <section id="nedir" className="py-24 bg-corp-surface">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Hizmet</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">Gezgin Tabela Nedir?</h2>
            <p className="font-body text-[17px] text-corp-gray leading-relaxed">
              Mardin sokaklarında fiziksel olarak hareket eden mobil reklam tabelası. Sabit bir pano değil — şehrin kalabalık noktalarını, tarihi güzergahları ve turist akınının yoğun olduğu meydanları gezen, sizin markanızı orada sergileyen canlı bir reklam aracı.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.label} className="corp-service-card bg-white rounded-xl border border-corp-border p-7 flex flex-col gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}>
                  <f.icon size={22} style={{ color: f.color }} />
                </div>
                <div>
                  <div className="font-display text-[18px] font-bold text-corp-charcoal mb-1">{f.label}</div>
                  <p className="font-body text-[13px] text-corp-gray leading-relaxed">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEDEN BİZ ── */}
      <section id="neden-biz" className="py-24 bg-white">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="max-w-2xl mb-14">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Neden Biz?</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-5">
              Rakiplerimizin Sahip{" "}
              <span className="text-corp-teal">Olmadığı Avantaj</span>
            </h2>
            <p className="font-body text-[17px] text-corp-gray leading-relaxed">
              Turizm şirketleriyle kurduğumuz veri ortaklığı, Mardin'deki hiçbir sokak reklam aracında yok. Biz sadece geziyoruz değil — <strong className="text-corp-charcoal">nereye gideceğimizi biliyoruz.</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {whyUs.map((w) => (
              <div key={w.title} className="corp-service-card relative flex gap-6 p-8 rounded-xl border border-corp-border bg-white overflow-hidden">
                <div className="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center" style={{ background: `${w.accent}10`, border: `1px solid ${w.accent}25` }}>
                  <w.icon size={22} style={{ color: w.accent }} />
                </div>
                <div>
                  <h3 className="font-display text-[20px] font-bold text-corp-charcoal mb-2">{w.title}</h3>
                  <p className="font-body text-[14px] text-corp-gray leading-relaxed">{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── URGENCY BANNER ── */}
      <section className="py-6 bg-corp-teal">
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-white flex-shrink-0" />
            <p className="font-body text-[14px] font-semibold text-white">
              <strong>Dikkat:</strong> Mardin genelinde her ilçe için yalnızca <strong>3 aktif slot</strong> tutuyoruz. Aynı bölgede rakibinize verilmeden önce yerinizi alın.
            </p>
          </div>
          <a
            href="#paketler"
            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-2.5 rounded-md font-body font-bold text-[13px] text-corp-teal bg-white hover:bg-corp-teal-50 transition-all"
          >
            Slotumu Ayır <ArrowRight size={14} />
          </a>
        </div>
      </section>

      {/* ── PAKETLER ── */}
      <section id="paketler" className="py-24 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #F5F6FA 0%, #ffffff 100%)" }}>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(10,77,104,0.05) 0%, transparent 70%)" }} />
        <div className="max-w-8xl mx-auto px-6 md:px-10 lg:px-16 relative">
          <div className="text-center mb-14">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-4">Fiyatlandırma</span>
            <h2 className="font-display text-4xl md:text-5xl text-corp-charcoal tracking-tight mb-4">Paket Seçin, Hemen Başlayın</h2>
            <p className="font-body text-[17px] text-corp-gray max-w-xl mx-auto">Tüm paketlerde %0 faizli taksit imkanı. Satın aldığınız an sayaç başlar.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {packages.map((pkg) => <PkgCard key={pkg.id} pkg={pkg} />)}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {[["✓ %0 Faiz", "Tüm paketlerde"], ["✓ Anlaşmalı Bölge", "Rakibinize verilmez"], ["✓ Aylık Rapor", "Şeffaf takip"]].map(([t, s]) => (
              <div key={t} className="flex items-center gap-2 font-body text-[13px] text-corp-gray">
                <span className="font-semibold text-corp-teal">{t}</span> — {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SSS ── */}
      <section id="sss" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 md:px-10 lg:px-16">
          <div className="text-center mb-12">
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
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-body text-[11px] font-semibold tracking-widest uppercase text-white/70 border border-white/20 mb-6">
            <Zap size={12} className="text-corp-coral" /> Son 3 Slot
          </span>
          <h2 className="font-display font-bold text-white leading-tight mb-5" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            Mardin'de Rakibiniz Sizi Geçmeden{" "}
            <br className="hidden md:block" />
            <span className="text-corp-coral">Yerinizi Alın</span>
          </h2>
          <p className="font-body text-[17px] text-white/75 leading-relaxed max-w-xl mx-auto mb-10">
            Turizm şirketlerimiz sezon takvimini hazırlıyor. Yoğun sezonda tabelanızın doğru yerde, doğru zamanda olması için şimdi karar verin.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#paketler"
              className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-md font-body font-bold text-[15px] text-white bg-corp-coral hover:brightness-110 transition-all duration-200 hover:-translate-y-0.5"
              style={{ boxShadow: "0 8px 30px rgba(232,98,42,0.4)" }}
            >
              Hemen Satın Al <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a
              href="tel:+90XXXXXXXXXX"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-md font-body font-semibold text-[14px] text-white border border-white/30 hover:border-white/60 hover:bg-white/10 transition-all duration-200"
            >
              Bizi Ara
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
