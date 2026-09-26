"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle,
  ShieldCheck,
  Zap,
  DollarSign,
  LayoutDashboard,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type PackageId = "solo-core" | "enterprise-prime";

interface FakturaPackage {
  id: PackageId;
  slug: string;
  name: string;
  tier: string;
  price: number;
  priceLabel: string;
  tagline: string;
  icon: React.ReactNode;
  features: string[];
  extraFeatures?: { label: string; detail: string }[];
  accentColor: string;
  borderClass: string;
  badgeClass: string;
  buttonClass: string;
  recommended?: boolean;
}

// ─── Package Data ─────────────────────────────────────────────────────────────

const PACKAGES: FakturaPackage[] = [
  {
    id: "solo-core",
    slug: "faktura-solo-core",
    name: "Faktura Solo Core",
    tier: "BAŞLANGIÇ LİSANSI",
    price: 10000,
    priceLabel: "₺10.000",
    tagline:
      "Freelancerlar, bağımsız danışmanlar ve tek kişilik işletmeler için kusursuz ve sınırsız fatura platformu.",
    icon: <ShieldCheck size={22} className="text-[#263d4a]" />,
    accentColor: "#263d4a",
    borderClass: "border-[#e1e9ed]",
    badgeClass:
      "bg-[#eef3f6] text-[#263d4a] border border-[#263d4a]/15",
    buttonClass:
      "bg-white border-2 border-[#263d4a]/25 text-[#263d4a] hover:bg-[#263d4a] hover:text-white",
    features: [
      "Sınırsız Fatura ve Fiyat Teklifi Oluşturma",
      "Profesyonel PDF Tasarım ve İçe/Dışa Aktarım Motoru",
      "Manuel Ödeme Takibi ve Kısmi Ödeme Kaydı",
      "Müşteri Rehberi ve İletişim Yönetimi",
      "İşletme Gider ve Vergi Kaydı Takibi",
      "Temel Gelir/Gider Raporları & Analitik",
      "E-Posta ile Otomatik Fatura Gönderimi",
      "Tek Şirket / Tek Marka Desteği",
      "Topluluk Desteği & Standart Güncellemeler",
    ],
  },
  {
    id: "enterprise-prime",
    slug: "faktura-enterprise-prime",
    name: "Faktura Enterprise Prime",
    tier: "KURUMSAL LİSANS",
    price: 20000,
    priceLabel: "₺20.000",
    tagline:
      "Büyüyen işletmeler, ajanslar ve çoklu şirket yöneten profesyonel ekipler için uçtan uca altyapı.",
    icon: <Zap size={22} className="text-[#E8622A]" />,
    accentColor: "#E8622A",
    borderClass: "border-[#E8622A]",
    badgeClass: "bg-[#E8622A] text-white",
    buttonClass:
      "bg-[#E8622A] text-white hover:bg-[#d4541f] shadow-[0_8px_20px_rgba(232,98,42,0.35)]",
    recommended: true,
    features: [
      "Solo Core Paketindeki Her Şey Dahil",
      "Otomatik Tekrarlayan Faturalandırma (Cron & Hatırlatıcılar)",
      "Müşterilere Özel Self-Servis Portal",
      "Çoklu Şirket & Marka Desteği (Sınırsız Alt İşletme)",
      "Ekip Arkadaşı Daveti: Rol Bazlı Yetkilendirme (RBAC)",
      "Gelişmiş Finansal Analitik: Kar/Zarar & Nakit Akış Tahminleri",
      "Modüler Eklenti Pazarı & Özel Eklenti Mimarisi",
      "REST API & Webhook: Dış Sistemlerle Çift Yönlü Senkronizasyon",
      "Özel Sunucuya Anahtar Teslim Kurulum Desteği",
      "Öncelikli VIP Destek & Hızlı Güncelleme Erişimi",
    ],
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Faktura'yı kendi sunucuma kurmak için ileri düzey teknik bilgi gerekir mi?",
    a: "Hayır. Docker Compose dosyamız sayesinde sadece docker compose up -d komutunu çalıştırarak 5 dakikada yayına alabilirsiniz. Ayrıca Enterprise Prime lisans sahiplerine uzman ekibimiz tarafından anahtar teslim kurulum desteği verilmektedir.",
  },
  {
    q: "Verilerim gerçekten tamamen bende mi kalıyor?",
    a: "Kesinlikle evet. Faktura hiçbir harici sunucuya veri göndermez, telemetri veya izleme kodu içermez. Veritabanınız, müşteri bilgileriniz ve fatura PDF dosyalarınız sadece sizin kiraladığınız veya şirketiniz bünyesindeki sunucuda saklanır.",
  },
  {
    q: "Mevcut Excel veya eski muhasebe yazılımlarımdan veri aktarabilir miyim?",
    a: "Evet. Dahili CSV ve JSON içe aktarım sihirbazı ile müşterilerinizi, geçmiş faturalarınızı, vergi oranlarınızı ve ürün kataloglarınızı dakikalar içinde Faktura'ya zahmetsizce aktarabilirsiniz.",
  },
  {
    q: "Lisans politikası ve güncelleme süreci nasıl işler?",
    a: "Satın alınan lisans süresizdir (lifetime). Aylık veya yıllık zorunlu bir abonelik ücreti bulunmaz. Yeni kararlı sürümler ve güvenlik güncellemeleri doğrudan Faktura yönetim panelinizden tek tıkla uygulanabilir.",
  },
  {
    q: "Satın alma sonrası kurulum nasıl başlar?",
    a: "Siparişiniz onaylandıktan sonra ekibimiz 1 iş günü içinde sizinle iletişime geçer. Solo Core kullanıcılarına detaylı kurulum dokümantasyonu ve Docker compose dosyası iletilir. Enterprise Prime kullanıcılarıyla ise canlı ekran paylaşımı eşliğinde anahtar teslim kurulum gerçekleştirilir.",
  },
];

// ─── Value Proposition Cards ──────────────────────────────────────────────────

const VALUE_CARDS = [
  {
    icon: <ShieldCheck size={26} />,
    title: "%100 Veri Sahipliği",
    desc: "Müşteri ve finansal verileriniz yalnızca kendi sunucunuzda (On-Premise veya VPS) barınır. KVKK düzenlemeleriyle tam uyumlu.",
    link: "Self-Hosted Güvenlik",
    accent: "#1A8FB5",
    bg: "bg-[#eef3f6]",
    border: "border-[#e1e9ed]",
    hover: "hover:border-[#1A8FB5]/50",
  },
  {
    icon: <DollarSign size={26} />,
    title: "Sıfır Komisyon & Sınırsız",
    desc: "İşlem başı kesinti yok, aylık fatura kotası yok. Dilediğiniz kadar müşteri, teklif ve finansal işlem kaydını özgürce tutun.",
    link: "Limitsiz Mimari",
    accent: "#E8622A",
    bg: "bg-[#FEF0EA]",
    border: "border-[#E8622A]/20",
    hover: "hover:border-[#E8622A]/50",
  },
  {
    icon: <LayoutDashboard size={26} />,
    title: "Modüler & Özelleştirilebilir",
    desc: "Kendi marka logonuz, özel alan adınız, kurumsal renkleriniz ve açık mimariyle baştan sona işletmenize uyarlayın.",
    link: "Beyaz Etiket (White-Label)",
    accent: "#263d4a",
    bg: "bg-[#eef3f6]",
    border: "border-[#263d4a]/20",
    hover: "hover:border-[#263d4a]/50",
  },
  {
    icon: <Zap size={26} />,
    title: "Yıldırım Hızında PDF",
    desc: "Modern render motoru ile mikrosaniyeler içinde profesyonel vektörel PDF çıktısı oluşturun, tek tıkla müşteriye iletin.",
    link: "Cron & Mail Entegre",
    accent: "#0A4D68",
    bg: "bg-[#eef3f6]",
    border: "border-[#e1e9ed]",
    hover: "hover:border-[#0A4D68]/50",
  },
];

// ─── FAQ Accordion Item ───────────────────────────────────────────────────────

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        open
          ? "bg-white border-[#1A8FB5]/30 shadow-md"
          : "bg-[#f8fafc] border-[#e1e9ed]"
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left select-none"
        aria-expanded={open}
      >
        <span className="font-semibold text-sm sm:text-base text-[#263d4a] leading-snug">
          {q}
        </span>
        {open ? (
          <ChevronUp size={20} className="text-[#1A8FB5] shrink-0" />
        ) : (
          <ChevronDown size={20} className="text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FakturaContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addItem, clearCart } = useCartStore();
  const [processingId, setProcessingId] = useState<PackageId | null>(null);

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isEmailVerified = Boolean((session?.user as any)?.isEmailVerified);

  const handlePurchase = async (pkg: FakturaPackage) => {
    // Guard: must be logged in
    if (!isAuthenticated) {
      toast.info("Satın almak için önce giriş yapmanız gerekiyor.");
      router.push(
        `/auth?callbackUrl=${encodeURIComponent(
          "/services/ai-automation/faktura"
        )}`
      );
      return;
    }

    // Guard: email must be verified (mirrors checkout page logic)
    if (!isEmailVerified) {
      toast.error(
        "Sipariş vermek için e-posta adresinizi doğrulamanız gerekmektedir."
      );
      router.push("/profile");
      return;
    }

    setProcessingId(pkg.id);

    try {
      // Clear cart first — Faktura is a standalone digital license, not mixed with print products
      clearCart();

      addItem({
        productId: pkg.slug,
        name: pkg.name,
        price: pkg.price,
        quantity: 1,
        image: "/images/faktura-dashboard.svg",
        category: "ai-automation",
        customizationData: {
          "Lisans Tipi": pkg.tier,
          "Ürün Adı": pkg.name,
          "Lisans Modeli": "Tek Seferlik Ömür Boyu",
          "Kurulum Tipi": "Self-Hosted / On-Premise",
        },
      });

      toast.success(`${pkg.name} sepete eklendi, ödeme sayfasına yönlendiriliyorsunuz…`);

      // Small delay to let toast render, then navigate
      await new Promise((r) => setTimeout(r, 600));
      router.push("/magaza/odeme");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full bg-[#f0f4f6] font-sans text-[#0b161d]">
      {/* ── SECTION 1: HERO ─────────────────────────────────────────────────── */}
      <section className="relative w-full pt-12 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28 overflow-hidden bg-gradient-to-b from-white via-[#f0f4f6] to-[#f0f4f6]">
        {/* Ambient glows */}
        <div className="absolute -top-32 left-1/4 w-[320px] sm:w-[600px] h-[320px] sm:h-[600px] bg-[#1A8FB5]/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none -z-10" />
        <div className="absolute top-1/3 right-[-10%] w-[280px] sm:w-[520px] h-[280px] sm:h-[520px] bg-[#E8622A]/10 rounded-full blur-[100px] sm:blur-[160px] pointer-events-none -z-10" />

        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Copy */}
            <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#eef3f6] border border-[#1A8FB5]/25 text-[#1A8FB5] text-xs font-bold uppercase tracking-widest self-start">
                <span className="w-2 h-2 rounded-full bg-[#1A8FB5] animate-pulse" />
                AI Ürünlerimiz / Muhasebe
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#263d4a] leading-[1.15]">
                Finansal Süreçlerinizi Özgürleştirin:{" "}
                <span className="bg-gradient-to-r from-[#263d4a] via-[#1A8FB5] to-[#E8622A] bg-clip-text text-transparent">
                  Faktura
                </span>{" "}
                ile Tam Kontrol Elinizde.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Komisyonsuz, kendi sunucunuzda çalışan, sınırsız fatura, ödeme
                ve müşteri yönetimi sunan yeni nesil açık kaynak ön muhasebe
                altyapısı.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() =>
                    document
                      .getElementById("paketler")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 sm:py-4 rounded-lg bg-[#E8622A] text-white font-semibold text-base hover:bg-[#d4541f] transition-all shadow-[0_8px_20px_rgba(232,98,42,0.35)] hover:shadow-[0_10px_24px_rgba(232,98,42,0.45)] group w-full sm:w-auto"
                >
                  Paketleri İnceleyin
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs sm:text-sm text-slate-600 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="text-[#1A8FB5] font-bold">✓</span> %100 Açık Kaynak & Bağımsız
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#1A8FB5] font-bold">✓</span> Sıfır Gizli Ücret & Komisyon
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-[#1A8FB5] font-bold">✓</span> Docker ile 5 Dakikada Kurulum
                </span>
              </div>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="lg:col-span-5 relative w-full">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-[#1A8FB5]/20 to-[#E8622A]/25 rounded-2xl blur-xl opacity-75" />
              <div className="relative rounded-2xl bg-[#0F172A] border border-[#1E293B] p-4 sm:p-5 shadow-2xl text-slate-100 overflow-hidden">
                {/* Window bar */}
                <div className="flex items-center justify-between pb-2 mb-3 bg-[#0A0A0F]/80 rounded px-3 py-2 border border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                    <span className="w-3 h-3 rounded-full bg-[#10b981]" />
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    app.faktura.io/dashboard
                  </span>
                  <span className="text-slate-400 text-xs">🔒</span>
                </div>

                {/* Metric */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#1E293B] border border-white/5 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] uppercase text-slate-400 tracking-wider">
                      Toplam Tahsilat (2025)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
                      ↑ +28.4% bu ay
                    </span>
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    ₺4.289.450,00
                  </div>
                </div>

                {/* Progress bar */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#1E293B] border border-white/5 mb-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#1A8FB5] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1A8FB5]" />
                      Ödenen: %84 (₺3.6M)
                    </span>
                    <span className="text-[#E8622A] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#E8622A]" />
                      Bekleyen: %16 (₺689K)
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[#0A0A0F] overflow-hidden flex border border-white/5">
                    <div className="h-full bg-[#1A8FB5]" style={{ width: "84%" }} />
                    <div className="h-full bg-[#E8622A]" style={{ width: "16%" }} />
                  </div>
                </div>

                {/* Recent invoices */}
                <div className="flex flex-col gap-2">
                  <div className="px-1 font-mono text-[10px] uppercase text-slate-400">
                    Son İşlem Akışı
                  </div>
                  {[
                    { company: "Acme Corp", inv: "INV-2025-0891", amount: "₺14.200,00", status: "Ödendi", statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
                    { company: "Nexus Tech", inv: "INV-2025-0892", amount: "₺8.450,00", status: "Bekliyor", statusColor: "bg-[#E8622A]/20 text-[#E8622A] border-[#E8622A]/30" },
                  ].map((row) => (
                    <div
                      key={row.inv}
                      className="p-2.5 rounded-lg bg-[#1E293B]/70 border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded bg-[#0A4D68]/40 border border-[#1A8FB5]/30 flex items-center justify-center text-[#1A8FB5] shrink-0 text-sm">
                          📄
                        </div>
                        <div className="min-w-0">
                          <div className="font-mono text-xs text-white font-semibold truncate">
                            {row.company}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400">
                            {row.inv}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs text-slate-100">
                          {row.amount}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border font-mono text-[11px] font-bold ${row.statusColor}`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status chip */}
                <div className="mt-3 bg-[#1E293B]/90 border border-[#1A8FB5]/40 shadow-xl px-3 py-1.5 rounded-lg flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#1A8FB5] animate-ping" />
                  <span className="font-mono text-xs text-slate-200 font-medium">
                    ⚡ Otomatik PDF & Webhook Tetiklendi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: WHY FAKTURA ──────────────────────────────────────────── */}
      <section
        id="neden-faktura"
        className="w-full py-16 sm:py-24 bg-white border-y border-[#e1e9ed]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs tracking-[0.2em] uppercase text-[#1A8FB5] mb-2 font-bold font-mono">
              NEDEN FAKTURA?
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#263d4a] mb-3 leading-tight">
              Yüksek Masraflı Ve Hantal Muhasebecilikten Kurtulun
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
              Verilerinizi üçüncü taraf bulutlarda rehin tutmayın. Kendi
              altyapınızda güvenli, sınırsız ve işlem maliyetsiz finansal
              egemenlik.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALUE_CARDS.map((card) => (
              <div
                key={card.title}
                className={`rounded-xl bg-[#f8fafc] border ${card.border} p-6 flex flex-col justify-between ${card.hover} hover:bg-white hover:shadow-lg transition-all group shadow-sm`}
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-lg ${card.bg} border ${card.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    style={{ color: card.accent }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="text-lg text-[#263d4a] mb-2 font-semibold">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="pt-5">
                  <span
                    className="text-xs font-semibold inline-flex items-center gap-1"
                    style={{ color: card.accent }}
                  >
                    {card.link}{" "}
                    <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURES BENTO GRID ─────────────────────────────────── */}
      <section id="ozellikler" className="w-full py-16 sm:py-24 bg-[#f0f4f6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs tracking-[0.2em] uppercase text-[#E8622A] mb-2 font-bold font-mono">
              MODÜLLER & YETENEKLER
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#263d4a] mb-3 leading-tight">
              İşletmenizin İhtiyaç Duyduğu Tüm Ön Muhasebe Gücü
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
              Yalın, yüksek performanslı ve modern finans operasyonları için
              sıfırdan tasarlandı.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Large: Invoice & Quote */}
            <div className="md:col-span-12 lg:col-span-7 rounded-3xl bg-white border border-[#e1e9ed] p-6 sm:p-8 lg:p-10 relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#1A8FB5]/40 transition-all group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#1A8FB5]/10 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />
              <div className="relative z-10 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0f7fa] border border-[#1A8FB5]/20 text-[#1A8FB5] font-mono text-xs mb-4 font-semibold">
                  📄 Çekirdek Faturalandırma
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#263d4a] mb-3 group-hover:text-[#1A8FB5] transition-colors">
                  Fatura & Teklif Yönetimi
                </h3>
                <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                  Çoklu para birimi desteği (TRY, USD, EUR, GBP), özel şablon
                  motoru, tek tıkla tekliften faturaya dönüştürme ve otomatik
                  yüksek çözünürlüklü PDF dışa aktarma yeteneği.
                </p>
              </div>
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 bg-[#f8fafc] border border-[#e1e9ed] rounded-2xl p-4">
                {[
                  { label: "PARA BİRİMİ", value: "TRY / USD / EUR", sub: "Otomatik Kur Çevrimi", color: "text-[#1A8FB5]", dot: "bg-[#1A8FB5]" },
                  { label: "DÖNÜŞÜM HIZI", value: "< 150 ms", sub: "Tek Tıkla Fatura", color: "text-[#263d4a]", dot: "bg-emerald-500" },
                  { label: "ŞABLON SAYISI", value: "6 Özel Tasarım", sub: "CSS ile Tam Hakimiyet", color: "text-[#E8622A]", dot: "bg-[#E8622A]" },
                ].map((tile) => (
                  <div key={tile.label} className="rounded-xl bg-white border border-[#e1e9ed] p-3.5 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                        {tile.label}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${tile.dot}`} />
                    </div>
                    <span className={`font-mono text-base sm:text-lg font-bold ${tile.color}`}>
                      {tile.value}
                    </span>
                    <span className="text-[11px] text-slate-500">{tile.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recurring Invoices */}
            <div className="md:col-span-12 lg:col-span-5 rounded-3xl bg-white border border-[#e1e9ed] p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#E8622A]/40 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#E8622A]/10 via-transparent to-transparent pointer-events-none rounded-tr-3xl" />
              <div className="relative z-10 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF0EA] border border-[#E8622A]/25 text-[#E8622A] font-mono text-xs mb-4 font-semibold">
                  🔄 Abonelik Otomasyonu
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-[#263d4a] mb-2 group-hover:text-[#E8622A] transition-colors">
                  Otomatik Tekrarlayan Faturalar
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Aylık ve yıllık retainer veya düzenli SaaS abonelikleri için
                  cron otomasyonu, otomatik e-posta gönderimi ve gecikme
                  hatırlatıcıları.
                </p>
              </div>
              <div className="relative z-10 p-4 rounded-2xl bg-[#f8fafc] border border-[#e1e9ed] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e1e9ed] shadow-sm flex items-center justify-center text-[#1A8FB5]">
                    📅
                  </div>
                  <div>
                    <div className="font-mono text-xs sm:text-sm text-[#263d4a] font-semibold">
                      Cron Job: Her Ayın 1&apos;i
                    </div>
                    <div className="text-xs text-slate-500">
                      Otomatik PDF & Bildirim
                    </div>
                  </div>
                </div>
                <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold tracking-wider">
                  AKTİF
                </span>
              </div>
            </div>

            {/* Client Portal */}
            <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#e1e9ed] p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#1A8FB5]/40 transition-all group">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#f0f7fa] border border-[#1A8FB5]/25 flex items-center justify-center text-[#1A8FB5] mb-5 group-hover:scale-105 transition-transform text-xl">
                  👤
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#263d4a] mb-2 group-hover:text-[#1A8FB5] transition-colors">
                  Müşterilere Özel Portal
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Müşterilerinizin geçmiş faturalarını şifresiz, güvenli sihirli
                  link (magic-token) ile görüntüleyip PDF indirebildiği self-servis
                  panel.
                </p>
              </div>
              <div className="mt-6 p-3 rounded-xl bg-[#f8fafc] border border-[#e1e9ed] text-xs font-mono text-slate-700 truncate">
                🔗 faktura.io/p/
                <span className="text-[#1A8FB5] font-semibold">tok_99x_acme</span>
              </div>
            </div>

            {/* Multi-Company & RBAC */}
            <div className="md:col-span-6 lg:col-span-4 rounded-3xl bg-white border border-[#e1e9ed] p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#263d4a]/40 transition-all group">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#eef3f6] border border-[#263d4a]/20 flex items-center justify-center text-[#263d4a] mb-5 group-hover:scale-105 transition-transform text-xl">
                  🏢
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#263d4a] mb-2 transition-colors">
                  Çoklu Şirket & Ekip Rolleri
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tek bir kurulumda sınırsız alt işletme veya marka yönetimi.
                  Finans yöneticisi, muhasebeci ve operasyon ekipleri için
                  ayrıntılı yetkilendirme (RBAC).
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-[#f8fafc] border border-[#e1e9ed] text-slate-700 font-mono text-xs font-medium">
                  Holding A.Ş.
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-[#f8fafc] border border-[#e1e9ed] text-slate-700 font-mono text-xs font-medium">
                  Stüdyo Ltd.
                </span>
                <span className="px-2 py-1 rounded-lg bg-[#FEF0EA] border border-[#E8622A]/25 text-[#E8622A] font-semibold font-mono text-xs">
                  +Sınırsız
                </span>
              </div>
            </div>

            {/* Expense & Tax */}
            <div className="md:col-span-12 lg:col-span-4 rounded-3xl bg-white border border-[#e1e9ed] p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl hover:border-[#E8622A]/40 transition-all group">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-[#FEF0EA] border border-[#E8622A]/25 flex items-center justify-center text-[#E8622A] mb-5 group-hover:scale-105 transition-transform text-xl">
                  📊
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#263d4a] mb-2 group-hover:text-[#E8622A] transition-colors">
                  Gider Takibi & KDV Dökümü
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Harcama fişleri yükleme, KDV matrah dökümleri, kar/zarar
                  grafikleri ve anlık nakit akışı raporlaması ile maliyetleri
                  kontrol altına alın.
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between p-3.5 rounded-xl bg-[#f8fafc] border border-[#e1e9ed]">
                <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  NET NAKİT AKIŞI
                </span>
                <span className="font-mono text-sm sm:text-base text-emerald-600 font-bold">
                  +%41.2
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PRICING ──────────────────────────────────────────────── */}
      <section
        id="paketler"
        className="w-full py-16 sm:py-24 bg-white border-y border-[#e1e9ed]"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <span className="text-xs tracking-[0.2em] uppercase text-[#1A8FB5] mb-2 font-bold font-mono">
              ŞEFFAF LİSANSLAMA
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-[2.6rem] font-bold text-[#263d4a] mb-3 leading-tight">
              İşletme Büyüklüğünüze Uygun Faktura Paketi
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl">
              Gizli masraf veya işlem komisyonu yok. Kendi altyapınız için tek
              seferlik, ömür boyu sahip olabileceğiniz lisanslama.
            </p>
          </div>

          {/* Auth notice banner */}
          {!isAuthenticated && (
            <div className="mb-10 p-4 rounded-2xl bg-[#f0f7fa] border border-[#1A8FB5]/30 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
              <div className="flex items-center gap-3">
                <span className="text-[#1A8FB5] text-2xl">🔐</span>
                <p className="text-sm text-[#263d4a] font-medium">
                  Lisans satın almak için{" "}
                  <strong>hesabınıza giriş yapmanız</strong> gerekiyor. Sepetiniz
                  korunacak.
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(
                    `/auth?callbackUrl=${encodeURIComponent(
                      "/services/ai-automation/faktura"
                    )}`
                  )
                }
                className="shrink-0 px-6 py-2.5 rounded-xl bg-[#1A8FB5] text-white font-semibold text-sm hover:bg-[#0A4D68] transition-colors"
              >
                Giriş Yap / Kayıt Ol →
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative rounded-3xl bg-${
                  pkg.recommended ? "white border-2" : "[#f8fafc] border"
                } ${pkg.borderClass} p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-sm transition-all ${
                  pkg.recommended
                    ? "shadow-[0_12px_40px_rgba(232,98,42,0.18)] lg:-translate-y-2"
                    : "hover:shadow-lg"
                }`}
              >
                {pkg.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#E8622A] text-white font-mono text-[11px] font-bold tracking-wider uppercase shadow-md whitespace-nowrap">
                    ÖNERİLEN / BÜTÜNSEL ÇÖZÜM
                  </div>
                )}

                {/* Header */}
                <div>
                  <div className="flex items-center justify-between mb-4 pt-1">
                    <div>
                      <span
                        className={`font-mono text-xs uppercase font-bold ${
                          pkg.recommended ? "text-[#E8622A]" : "text-slate-500"
                        }`}
                      >
                        {pkg.tier}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-bold text-[#263d4a]">
                        {pkg.name}
                      </h3>
                    </div>
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
                        pkg.recommended
                          ? "bg-[#FEF0EA] border border-[#E8622A]/30"
                          : "bg-white border border-[#e1e9ed]"
                      }`}
                    >
                      {pkg.icon}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                    {pkg.tagline}
                  </p>

                  {/* Price block */}
                  <div
                    className={`flex items-baseline gap-2 mb-6 pb-4 rounded-2xl p-4 shadow-sm ${
                      pkg.recommended
                        ? "bg-[#FEF0EA]/50 border border-[#E8622A]/25"
                        : "bg-white border border-[#e1e9ed]"
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl font-extrabold text-[#263d4a]">
                      {pkg.priceLabel}
                    </span>
                    <span className="font-mono text-xs sm:text-sm text-slate-500 font-medium">
                      / Tek Seferlik Ömür Boyu
                    </span>
                  </div>

                  {pkg.recommended && (
                    <div className="font-mono text-xs text-[#1A8FB5] mb-4 uppercase font-bold tracking-wider">
                      Solo Core Paketindeki Her Şey + İlave Olarak:
                    </div>
                  )}

                  {/* Features */}
                  <ul className="flex flex-col gap-3 mb-8">
                    {pkg.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-[#0b161d]"
                      >
                        <CheckCircle
                          size={18}
                          className="shrink-0 mt-px"
                          style={{
                            color: pkg.recommended ? "#E8622A" : "#1A8FB5",
                          }}
                        />
                        <span dangerouslySetInnerHTML={{ __html: feat.replace(/^(Solo Core Paketindeki|Otomatik|Müşterilere|Çoklu|Ekip|Gelişmiş|Modüler|REST|Özel|Öncelikli)(.+)$/, (_, a, b) => `<strong>${a}${b.split(":")[0]}:</strong>${b.split(":")[1] || ""}`) }} />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={processingId === pkg.id}
                  className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm sm:text-base text-center transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${pkg.buttonClass}`}
                >
                  {processingId === pkg.id ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      İşleniyor…
                    </>
                  ) : (
                    <>
                      {pkg.recommended
                        ? "Enterprise Prime Lisansı Al"
                        : "Solo Core ile Başla"}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FAQ ──────────────────────────────────────────────────── */}
      <section id="sss" className="w-full py-16 sm:py-24 bg-white">
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-10 sm:mb-14">
            <span className="text-xs tracking-[0.2em] uppercase text-[#1A8FB5] mb-2 font-bold font-mono">
              AKLINIZDAKİ SORULAR
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[#263d4a] mb-3">
              Sıkça Sorulan Sorular
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Faktura&apos;nın lisanslama, kurulum ve veri güvenliği politikaları
              hakkında merak ettiğiniz her şey.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4">
            {FAQS.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
