import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SocialApplicationForm from "./components/SocialApplicationForm";
import QuickApplicationForm from "./components/QuickApplicationForm";
import CityHeroHeading from "./components/CityHeroHeading";
import {
  ArrowRight,
  CheckCircle,
  Share2,
  TrendingUp,
  BarChart3,
  Video,
  Layers,
  Search,
  ShieldCheck,
  ChevronRight,
  Clock,
  Sparkles,
  HelpCircle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Sosyal Medya & Reklam Danışmanlığı — Çiçekana Teknoloji & Medya",
  description:
    "Markanızın sosyal medya yönetimini, içerik stratejisini ve performans odaklı Meta & Google reklamlarını ölçülebilir kurumsal süreçlerle yönetin. Minimum 15.000 TL aylık hizmet kabulü.",
  alternates: {
    canonical:
      "https://www.cicekanatechmedia.com/services/sosyal-medya-reklam-danismanligi",
  },
  openGraph: {
    title: "Sosyal Medya & Reklam Danışmanlığı — Çiçekana",
    description:
      "Markanızın dijital iletişimini stratejiyle yönetin. Sosyal medya yönetimi, içerik üretimi ve performans odaklı reklam optimizasyonu.",
    url: "https://www.cicekanatechmedia.com/services/sosyal-medya-reklam-danismanligi",
    siteName: "Çiçekana Teknoloji ve Medya",
    locale: "tr_TR",
    type: "website",
  },
};

const scopeItems = [
  {
    icon: Share2,
    title: "Sosyal Medya Stratejisi & Hesap Yönetimi",
    desc: "Marka kimliğinize ve hedef kitlenize uygun iletişim dili, hesap optimizasyonu ve topluluk etkileşimi yönetimi.",
  },
  {
    icon: Layers,
    title: "İçerik Takvimi, Görsel Tasarım & Metin",
    desc: "Aylık editoryal yayın planı, kurumsal görsel tasarımlar, dönüşüm odaklı reklam metinleri ve hikaye kurguları.",
  },
  {
    icon: Video,
    title: "Reels & Kısa Video Kurgusu",
    desc: "Algoritma trendlerine uygun, işletmenizin ürün ve hizmetlerini öne çıkaran dikey video içerik planlaması.",
  },
  {
    icon: TrendingUp,
    title: "Meta Ads (Instagram & Facebook) Danışmanlığı",
    desc: "Dönüşüm hunisi (funnel) mimarisi, doğru hedef kitle segmentasyonu ve ROAS (reklam getirisi) odaklı kampanya yönetimi.",
  },
  {
    icon: Search,
    title: "Google Ads Yönetimi (Arama & Performans)",
    desc: "Satın alma ve hizmet alma niyetindeki arama sorgularını yakalayan Google arama ağı ve remarketing kampanyaları.",
  },
  {
    icon: BarChart3,
    title: "Ölçümleme, Optimizasyon & Performans Raporları",
    desc: "Dönüşüm pikseli kurulumları, A/B testleri, bütçe verimliliği ve şeffaf aylık yönetim raporları.",
  },
];

const serviceGroups = [
  {
    id: "social",
    badge: "GRUP A",
    title: "Sosyal Medya Yönetimi",
    desc: "Markanızın dijital varlığını düzenli, estetik ve güven veren bir kurumsal çizgiye taşımak isteyen işletmeler için.",
    features: [
      "İçerik stratejisi ve marka sesi belirleme",
      "Aylık düzenli yayın takvimi",
      "Tasarım ve içerik koordinasyonu",
      "Aylık performans değerlendirmesi",
    ],
    accent: "#0A4D68",
  },
  {
    id: "ads",
    badge: "GRUP B",
    title: "Reklam Danışmanlığı & Yönetimi",
    desc: "Doğrudan müşteri adayı, web sitesi satışı ve performans odaklı büyüme hedefleyen işletmeler için.",
    features: [
      "Kampanya stratejisi ve huni kurgusu",
      "Hedef kitle ve reklam kreatifi yapısı",
      "Reklam performansının ölçümlenmesi",
      "Haftalık optimizasyon ve şeffaf raporlama",
    ],
    accent: "#E8622A",
  },
  {
    id: "integrated",
    badge: "GRUP C — ENTEGRE",
    title: "Entegre Sosyal Medya & Reklam",
    desc: "İçerik üretimi ile performans reklamlarının tek bir stratejik plan altında sinerjiyle yönetilmesi.",
    features: [
      "Sosyal medya ve reklamların ortak planlanması",
      "Ortak büyüme hedefleri ve ROAS takibi",
      "Kreatiflerin reklamlara doğrudan entegrasyonu",
      "Kapsama uygun bütünleşik raporlama",
    ],
    accent: "#263d4a",
    featured: true,
  },
];

const processSteps = [
  {
    step: "01",
    title: "Başvuru",
    desc: "İşletmenizin hedeflerini, mevcut durumunu ve hizmet bütçesi aralığını öğrenmek için başvuru formunuzu inceleriz.",
  },
  {
    step: "02",
    title: "Değerlendirme",
    desc: "Sektör dinamiklerinizi, rakip analizlerini ve minimum çalışma standartlarımıza uygunluğunu detaylı inceleriz.",
  },
  {
    step: "03",
    title: "Kapsam & Teklif",
    desc: "Başvurunuzun uygun görülmesi durumunda, markanıza özel çalışma kapsamını ve şeffaf hizmet teklifini paylaşırız.",
  },
  {
    step: "04",
    title: "Planlama & Optimizasyon",
    desc: "Anlaşma sağlandığında çalışma takvimi, içerik planı ve ölçümleme altyapısı kurularak süreç başlatılır.",
  },
];

const faqs = [
  {
    q: "Sosyal medya yönetimi hangi hizmetleri kapsar?",
    a: "Sosyal medya yönetimi; markanızın profil düzeni, içerik stratejisi, görsel tasarım üretimi, yayın takvimi, hikaye ve Reels planlaması ile düzenli performans raporlamasını kapsar.",
  },
  {
    q: "Reklam yönetimi ile reklam harcaması aynı şey midir?",
    a: "Hayır, kesinlikle farklı kalemlerdir. Çiçekana'ya ödenen tutar danışmanlık, strateji, kreatif metin, hedef kitle kurgusu ve optimizasyon 'hizmet bedeli'dir. Meta (Facebook/Instagram) veya Google'a kartınızdan ödenen reklam harcaması ise işletmenizin doğrudan reklam mecrasına aktardığı 'medya bütçesi'dir.",
  },
  {
    q: "Aylık 15.000 TL başlangıç bedeli ne anlama gelir?",
    a: "Çiçekana Teknoloji & Medya olarak her müşterimize kıdemli uzman tahsis etmekte ve özel kreatif üretim yapmaktayız. Hizmet kalitemizi koruyabilmek adına aylık ajans hizmet bedellerimiz minimum 15.000 TL'den başlamaktadır. Bu seviyenin altındaki bütçelere kurumsal kabul yapılmamaktadır.",
  },
  {
    q: "Birden fazla sosyal medya platformu yönetilebilir mi?",
    a: "Evet. İşletmenizin hedef kitlesine göre Instagram, Facebook, TikTok, LinkedIn ve YouTube kanalları tek bir strateji altında birlikte veya ayrı ayrı yönetilebilmektedir.",
  },
  {
    q: "Başvuru sonrasında süreç nasıl işler?",
    a: "Formu doldurmanızın ardından danışmanlık ekibimiz mevcut hesaplarınızı ve bilgilerinizi 2 iş günü içinde inceler. Şartları uygun olan işletmelerle telefon veya WhatsApp üzerinden ön görüşme yapılarak resmi çalışma teklifi iletilir.",
  },
  {
    q: "Her başvuru kabul edilir mi?",
    a: "Hayır. Bütçesi asgari hizmet seviyemizin altında kalan, etik/yasal standartlarımıza uymayan veya kapasitemizin üzerinde olan başvurular kabul edilmeyebilir. Başvuru göndermek otomatik bir satın alma veya sözleşme anlamına gelmez.",
  },
];

export default function SocialMediaServicePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sosyal Medya & Reklam Danışmanlığı",
    provider: {
      "@type": "Organization",
      name: "Çiçekana Teknoloji ve Medya Hizmetleri",
      url: "https://www.cicekanatechmedia.com",
    },
    description:
      "Markanızın sosyal medya yönetimini, içerik stratejisini ve Meta & Google reklam çalışmalarını ölçülebilir kurumsal süreçlerle yönetin.",
    offers: {
      "@type": "Offer",
      price: "15000",
      priceCurrency: "TRY",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "15000",
        priceCurrency: "TRY",
        unitText: "MONTH",
      },
    },
    areaServed: "TR",
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: "https://www.cicekanatechmedia.com/homepage",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Hizmetler",
        item: "https://www.cicekanatechmedia.com/services",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Sosyal Medya & Reklam Danışmanlığı",
        item: "https://www.cicekanatechmedia.com/services/sosyal-medya-reklam-danismanligi",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Header />

      {/* ── BREADCRUMB ── */}
      <nav
        aria-label="Breadcrumb"
        className="pt-28 pb-4 border-b border-corp-border/60 bg-[#FAFAFC]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <ol className="flex items-center flex-wrap gap-2 text-[12px] font-body text-corp-gray">
            <li>
              <Link
                href="/homepage"
                className="hover:text-corp-teal transition-colors"
              >
                Ana Sayfa
              </Link>
            </li>
            <li>
              <ChevronRight size={12} className="text-corp-gray-light" />
            </li>
            <li>
              <Link
                href="/services"
                className="hover:text-corp-teal transition-colors"
              >
                Hizmetler
              </Link>
            </li>
            <li>
              <ChevronRight size={12} className="text-corp-gray-light" />
            </li>
            <li className="font-semibold text-corp-charcoal" aria-current="page">
              Sosyal Medya & Reklam Danışmanlığı
            </li>
          </ol>
        </div>
      </nav>

      {/* ── 1. HERO BÖLÜMÜ ── */}
      <section className="pt-12 sm:pt-16 pb-16 sm:pb-24 bg-white relative overflow-hidden">
        {/* Subtle background glow */}
        <div
          className="absolute top-0 right-0 w-[500px] h-[500px] pointer-events-none opacity-60"
          style={{
            background:
              "radial-gradient(ellipse at top right, rgba(38,61,74,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-start">
            {/* ── HERO SOL: BAŞLIK, AÇIKLAMA, 15.000 TL BİLGİSİ VE DETAYLI FORM CTA ── */}
            <div className="lg:col-span-7 space-y-6">
              {/* Category badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-corp-teal-50 text-corp-teal border border-corp-teal/20">
                <Sparkles size={13} />
                <span>KURUMSAL SOSYAL MEDYA & PERFORMANS PAZARLAMA</span>
              </div>

              {/* H1 */}
              <CityHeroHeading />

              {/* Alt mesaj */}
              <p className="font-body text-base sm:text-lg text-corp-gray leading-relaxed font-normal">
                Markanızın dijital iletişimini stratejiyle yönetin. Sosyal medya hesap yönetimi, özgün içerik üretimi, Meta & Google reklam optimizasyonu ve ölçülebilir büyüme süreçlerini tek bir çatı altında planlayın.
              </p>

              {/* Minimum bütçe uyarısı (Hero sol metin dengesi) */}
              <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 rounded-xl bg-[#FAFAFC] border border-corp-border w-full max-w-xl">
                <div className="flex items-center gap-2 text-corp-teal shrink-0 font-semibold text-[13px] font-body">
                  <ShieldCheck size={18} className="text-corp-coral" />
                  <span>Minimum Hizmet Bedeli:</span>
                </div>
                <div className="font-body text-[13px] text-corp-charcoal leading-snug">
                  <strong className="text-corp-charcoal font-bold">15.000 TL / Ay</strong>'dan başlayan bütçelerle nitelikli işletmelere özel danışmanlık.
                </div>
              </div>

              {/* Hero CTA buttons (Uzun başvuru formuna yönlendiren mevcut CTA korunuyor) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <a
                  href="#basvuru-formu"
                  className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-corp-teal text-white font-body font-semibold text-[14px] sm:text-[15px] hover:bg-corp-teal-600 transition-all shadow-[0_4px_16px_rgba(10,77,104,0.22)] hover:-translate-y-0.5"
                >
                  <span>Detaylı Başvuru Formu</span>
                  <ArrowRight size={17} />
                </a>

                <a
                  href="#hizmet-kapsami"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-corp-border font-body font-semibold text-[14px] text-corp-charcoal hover:bg-corp-surface transition-colors"
                >
                  Hizmet Kapsamını İncele
                </a>
              </div>
            </div>

            {/* ── HERO SAĞ: YENİ HIZLI BAŞVURU KARTI (TELEFON + 15K BÜTÇE TEYİDİ) ── */}
            <div className="lg:col-span-5 w-full">
              <QuickApplicationForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. HİZMET KAPSAMI ── */}
      <section id="hizmet-kapsami" className="py-20 bg-[#FAFAFC] border-y border-corp-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="max-w-2xl mb-12">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-2">
              KAPSAMLI YÖNETİM
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-corp-charcoal font-bold tracking-tight mb-3">
              Uçtan Uca Dijital İletişim & Performans Kapsamı
            </h2>
            <p className="font-body text-[14px] sm:text-[15px] text-corp-gray leading-relaxed">
              Yalnızca gönderi paylaşmakla kalmıyor; markanızın ticari hedeflerini büyütecek entegre pazarlama kanallarını işletmenize özel tasarlıyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scopeItems.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-xl border border-corp-border bg-white hover:border-corp-teal/30 hover:shadow-sm transition-all"
              >
                <div className="w-11 h-11 rounded-lg bg-corp-teal-50 border border-corp-teal/10 flex items-center justify-center text-corp-teal mb-4">
                  <item.icon size={20} />
                </div>
                <h3 className="font-display text-[16px] font-bold text-corp-charcoal mb-2">
                  {item.title}
                </h3>
                <p className="font-body text-[13px] text-corp-gray leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. HİZMET SEÇENEKLERİ / GRUPLARI ── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="max-w-2xl mb-12">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-2">
              HİZMET MODELLERİ
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-corp-charcoal font-bold tracking-tight mb-3">
              İşletmenizin İhtiyacına Uygun Çalışma Grupları
            </h2>
            <p className="font-body text-[14px] sm:text-[15px] text-corp-gray leading-relaxed">
              Bu gruplar standart şablon paketler değildir; markanızın ölçeğine ve gereksinimlerine göre net çalışma kapsamı başvurunuz incelendikten sonra belirlenir.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {serviceGroups.map((g) => (
              <div
                key={g.id}
                className={`relative rounded-2xl border p-7 flex flex-col justify-between transition-all ${
                  g.featured
                    ? "border-corp-teal bg-white shadow-lg ring-1 ring-corp-teal/20"
                    : "border-corp-border bg-[#FAFAFC]"
                }`}
              >
                {g.featured && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-body font-bold uppercase tracking-wider bg-corp-teal text-white">
                    ÖNERİLEN ÇÖZÜM
                  </span>
                )}

                <div>
                  <span
                    className="inline-block px-2.5 py-0.5 rounded text-[10px] font-body font-bold uppercase tracking-wider mb-3"
                    style={{ background: `${g.accent}12`, color: g.accent }}
                  >
                    {g.badge}
                  </span>

                  <h3 className="font-display text-xl font-bold text-corp-charcoal mb-2">
                    {g.title}
                  </h3>

                  <p className="font-body text-[13px] text-corp-gray leading-relaxed mb-6">
                    {g.desc}
                  </p>

                  <div className="border-t border-corp-border/80 pt-5 mb-6">
                    <span className="font-body text-[11px] font-bold uppercase tracking-wider text-corp-charcoal block mb-3">
                      Kapsam Başlıkları:
                    </span>
                    <ul className="space-y-2.5">
                      {g.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 font-body text-[13px] text-corp-charcoal"
                        >
                          <CheckCircle
                            size={15}
                            style={{ color: g.accent }}
                            className="shrink-0 mt-0.5"
                          />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-corp-border/80">
                  <a
                    href="#basvuru-formu"
                    className={`w-full py-3 rounded-xl font-body font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-all ${
                      g.featured
                        ? "bg-corp-teal text-white hover:bg-corp-teal-600"
                        : "border border-corp-border bg-white text-corp-charcoal hover:bg-corp-surface"
                    }`}
                  >
                    <span>Bu Kapsam İçin Başvur</span>
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-corp-surface/50 border border-corp-border text-center">
            <p className="font-body text-[12px] text-corp-gray">
              * İşletmenizin sektörel hedeflerine göre net gönderi sıklığı, çekim planı ve reklam hedefleri başvurunun kabulünden sonra karşılıklı mutabakatla belirlenir.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. ÇALIŞMA SÜRECİ ── */}
      <section className="py-20 bg-[#FAFAFC] border-y border-corp-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="max-w-2xl mb-14 text-center sm:text-left">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-2">
              ÇALIŞMA YÖNTEMİMİZ
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-corp-charcoal font-bold tracking-tight mb-3">
              4 Adımlı Hizmet Kabul ve Başlangıç Süreci
            </h2>
            <p className="font-body text-[14px] sm:text-[15px] text-corp-gray leading-relaxed">
              Süreç boyunca şeffaf iletişim ve profesyonel adımlarla ilerleriz. Başvuru göndermek herhangi bir satın alma yükümlülüğü doğurmaz.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((p) => (
              <div
                key={p.step}
                className="relative p-6 rounded-2xl border border-corp-border bg-white"
              >
                <span className="font-display text-2xl font-bold text-corp-teal/40 block mb-3">
                  {p.step}
                </span>
                <h3 className="font-display text-[16px] font-bold text-corp-charcoal mb-2">
                  {p.title}
                </h3>
                <p className="font-body text-[13px] text-corp-gray leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. GÜVEN & SSS BÖLÜMÜ ── */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="text-center mb-12">
            <span className="font-body text-[11px] text-corp-coral tracking-widest uppercase font-semibold block mb-2">
              SIKÇA SORULAN SORULAR
            </span>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl text-corp-charcoal font-bold tracking-tight mb-3">
              Hizmet Standartlarımız ve Merak Edilenler
            </h2>
            <p className="font-body text-[14px] sm:text-[15px] text-corp-gray max-w-xl mx-auto">
              Çalışma modelimiz, bütçe ayrımları ve başvuru süreci hakkında en çok sorulan soruların yanıtları.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-corp-border bg-[#FAFAFC] p-5 sm:p-6"
              >
                <h3 className="font-display text-[15px] sm:text-[16px] font-bold text-corp-charcoal mb-2 flex items-start gap-2.5">
                  <HelpCircle size={18} className="text-corp-teal shrink-0 mt-0.5" />
                  <span>{faq.q}</span>
                </h3>
                <p className="font-body text-[13px] sm:text-[14px] text-corp-gray leading-relaxed pl-7">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FORM ÖNCESİ ZARİF VE DİKKAT ÇEKİCİ FİYAT UYARISI ── */}
      <section className="pt-8 pb-10 bg-[#FAFAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <div className="rounded-2xl border border-corp-teal/30 bg-gradient-to-r from-corp-teal-50 via-white to-corp-teal-50 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-corp-teal text-white flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle size={20} />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-[16px] sm:text-[18px] font-bold text-corp-charcoal">
                  Hizmet Bütçesi ve Reklam Harcaması Bilgilendirmesi
                </h3>
                <p className="font-body text-[13px] sm:text-[14px] text-corp-charcoal leading-relaxed font-medium">
                  Çiçekana Teknoloji & Medya'da aylık hizmet bedelleri, kalite ve çalışma standartlarımız doğrultusunda <strong>15.000 TL</strong>'den başlamaktadır. İşletmenizin ihtiyaçlarına uygun kapsam ve teklif, başvurunuzun değerlendirilmesinden sonra belirlenir.
                </p>
                <p className="font-body text-[12px] sm:text-[13px] text-corp-gray leading-relaxed">
                  Meta ve Google reklam platformlarına ödenecek reklam harcamaları, teklif kapsamında aksi açıkça belirtilmedikçe, <strong>hizmet bedeline dahil değildir</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. BAŞVURU FORMU BÖLÜMÜ ── */}
      <section className="pb-24 bg-[#FAFAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
          <SocialApplicationForm />
        </div>
      </section>

      <Footer />
    </main>
  );
}
