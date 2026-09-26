"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import {
  MessageSquare,
  Sparkles,
  Send,
  CheckCircle,
  Check,
  ShieldCheck,
  Zap,
  Eye,
  BarChart3,
  BrainCircuit,
  Cpu,
  Store,
  Rocket,
  Building2,
  Star,
  ChevronDown,
  ChevronUp,
  Lock,
  ArrowRight,
  Tag,
  Clock,
  X,
  Phone,
  Mail,
  Users,
  Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MidvemPackageId = "midvem-baslangic" | "midvem-pro" | "midvem-kurumsal";

interface MidvemPackage {
  id: MidvemPackageId;
  slug: string;
  name: string;
  badge?: string;
  tagline: string;
  price: number;
  priceLabel: string;
  period: string;
  icon: React.ReactNode;
  features: { text: string; included: boolean; bold?: boolean }[];
  isPopular?: boolean;
  buttonClass: string;
}

// ─── Packages Data ────────────────────────────────────────────────────────────

const MIDVEM_PACKAGES: MidvemPackage[] = [
  {
    id: "midvem-baslangic",
    slug: "midvem-baslangic",
    name: "Midvem Başlangıç",
    tagline:
      "Küçük işletmeler ve yeni başlayan e-ticaret siteleri için ideal başlangıç araçları.",
    price: 15000,
    priceLabel: "₺15.000",
    period: "/ ay",
    icon: <Store className="text-[#263d4a]" size={24} />,
    features: [
      { text: "2 Temsilci Kullanıcı Hakkı", included: true },
      { text: "Canlı Destek Web Widget", included: true },
      { text: "Instagram DM Entegrasyonu", included: true },
      { text: "Temel Hızlı Yanıt Makroları", included: true },
      { text: "Resmi WhatsApp API", included: false },
      { text: "Yapay Zeka Taslak Asistanı", included: false },
    ],
    buttonClass:
      "border-2 border-[#263d4a] text-[#263d4a] hover:bg-[#263d4a] hover:text-white",
  },
  {
    id: "midvem-pro",
    slug: "midvem-pro",
    name: "Midvem Pro",
    badge: "Sık Tercih Edilen",
    tagline:
      "WhatsApp & Yapay Zeka desteği ile satışlarını ve müşteri memnuniyetini katlamak isteyen KOBİ'ler.",
    price: 20000,
    priceLabel: "₺20.000",
    period: "/ ay",
    icon: <Rocket className="text-[#E8622A]" size={24} />,
    isPopular: true,
    features: [
      { text: "5 Temsilci Kullanıcı", included: true, bold: true },
      { text: "Resmi WhatsApp Business API", included: true, bold: true },
      { text: "Instagram & Facebook Messenger", included: true, bold: true },
      { text: "Midvem AI Yanıt Asistanı (Sınırsız)", included: true, bold: true },
      { text: "Canlı Ziyaretçi & Sepet Takibi", included: true },
      { text: "E-Ticaret Entegrasyonu (İkas, Shopify vb.)", included: true },
    ],
    buttonClass:
      "bg-[#E8622A] text-white hover:bg-orange-600 shadow-[0_10px_25px_-5px_rgba(232,98,42,0.45)] hover:scale-[1.02]",
  },
  {
    id: "midvem-kurumsal",
    slug: "midvem-kurumsal",
    name: "Midvem Kurumsal",
    tagline:
      "Yüksek hacimli iletişim yöneten, özel SLA ve özel entegrasyon isteyen büyük işletmeler.",
    price: 25000,
    priceLabel: "₺25.000",
    period: "/ ay",
    icon: <Building2 className="text-[#263d4a]" size={24} />,
    features: [
      { text: "Sınırsız Temsilci Kullanıcı", included: true, bold: true },
      { text: "Tüm Kanallar + Özel Telefon/SMS Entegrasyonu", included: true },
      { text: "Özel Eğitilmiş Kurumsal AI Modeli", included: true },
      { text: "Öncelikli 7/24 Özel Müşteri Yöneticisi", included: true },
      { text: "Özel Güvenlik, SSO & IP Kısıtlama", included: true },
      { text: "%99.9 Kesintisiz Çalışma Garantisi (SLA)", included: true },
    ],
    buttonClass:
      "border-2 border-[#263d4a] text-[#263d4a] hover:bg-[#263d4a] hover:text-white",
  },
];

// ─── FAQ Data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "WhatsApp Business API entegrasyonu nasıl gerçekleşir?",
    a: "Meta resmi iş ortağı altyapımız üzerinden telefon numaranız 5 dakika içinde onaylanır. Mevcut numaranızı kaybetmeden veya yeni bir numara tahsis ederek resmi yeşil tikli veya standart WhatsApp Business API'ye anında geçiş yapabilirsiniz.",
  },
  {
    q: "Yapay Zeka (AI) modelimiz şirketimize özel nasıl öğrenir?",
    a: "Midvem AI, web sitenizdeki ürünleri, PDF kataloglarınızı, SSS dokümanlarınızı ve geçmiş müşteri görüşmelerinizi güvenli ortamda indeksler. Şirketinizin üslubunu, fiyat politikasını ve iade/garanti kurallarını öğrenerek temsilcinize saniyeler içinde %98 doğrulukta taslak önerir.",
  },
  {
    q: "E-ticaret platformumuzla (İkas, Shopify, Ticimax vb.) entegre olabilir mi?",
    a: "Evet! Tek tıkla API bağlantısı kurabilirsiniz. Müşteri WhatsApp veya canlı destekten yazdığı anda yan panelde müşterinin sepetindeki ürünleri, toplam harcamasını ve kargo durumunu anlık olarak görebilirsiniz.",
  },
  {
    q: "Abonelik süresi ve taahhüt şartı var mı?",
    a: "Hayır. Midvem hizmetlerinde herhangi bir yıllık bağlayıcı taahhüt veya gizli kurulum ücreti bulunmaz. Hizmetinizi dilediğiniz ay durdurabilir veya bir üst pakete anında yükseltebilirsiniz.",
  },
  {
    q: "Veri güvenliği ve KVKK mevzuatına uyumluluk nasıl sağlanır?",
    a: "Tüm görüşmeler uçtan uca şifrelenir ve KVKK ile GDPR düzenlemelerine tam uyumlu yerli sunucu altyapısında saklanır. Üçüncü şahıslara veya halka açık yapay zeka modellerine veri aktarımı asla yapılmaz.",
  },
];

// ─── Testimonials Data ────────────────────────────────────────────────────────

const REVIEWS = [
  {
    name: "Ömer Barış",
    role: "Kurucu, E-Piyasa Kozmetik",
    initials: "ÖB",
    color: "bg-[#263d4a]",
    comment:
      "WhatsApp ve Instagram mesajlarını tek ekranda görmek ekibimizin üzerindeki devasa yükü aldı. Özellikle AI taslakları sayesinde yanıtlama süremiz 2 dakikanın altına indi.",
  },
  {
    name: "Elif Soydan",
    role: "Operasyon Müdürü, ModaBella",
    initials: "ES",
    color: "bg-[#E8622A]",
    comment:
      "İkas entegrasyonu harika çalışıyor. Müşteri canlı desteğe yazdığı anda hangi ürünün sayfasında olduğunu ve sepet tutarını görebiliyoruz. Satışlarımız belirgin şekilde arttı.",
  },
  {
    name: "Kadir Aydın",
    role: "Genel Müdür, Aydın Ticaret",
    initials: "KA",
    color: "bg-emerald-700",
    comment:
      "Yabancı yazılımlara her ay binlerce dolar ödemekten kurtulduk. Türkçe desteği, yerli KOBİ'lerin dinamiklerine uygunluğu ve WhatsApp entegrasyonu kusursuz.",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MidvemContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { addItem, clearCart } = useCartStore();
  const [processingId, setProcessingId] = useState<MidvemPackageId | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoForm, setDemoForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
  });
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isEmailVerified = Boolean((session?.user as any)?.isEmailVerified);

  const handlePurchase = async (pkg: MidvemPackage) => {
    if (!isAuthenticated) {
      toast.info("Aboneliği başlatmak için lütfen önce giriş yapın.");
      router.push(
        `/auth?callbackUrl=${encodeURIComponent(
          "/services/ai-automation/midvem"
        )}`
      );
      return;
    }

    if (!isEmailVerified) {
      toast.error(
        "Sipariş verebilmek için e-posta adresinizi doğrulamanız gerekmektedir."
      );
      router.push("/profile");
      return;
    }

    setProcessingId(pkg.id);

    try {
      clearCart();

      addItem({
        productId: pkg.slug,
        name: pkg.name,
        price: pkg.price,
        quantity: 1,
        image: "/images/midvem-dashboard.svg",
        category: "ai-automation",
        customizationData: {
          "Paket Adı": pkg.name,
          "Abonelik Modeli": "Aylık Lisans / SaaS",
          "Hizmet": "Müşteri Destek & İletişim Sistemi",
          "Temsilci Limiti":
            pkg.id === "midvem-baslangic"
              ? "2 Temsilci"
              : pkg.id === "midvem-pro"
              ? "5 Temsilci"
              : "Sınırsız Temsilci",
        },
      });

      toast.success(
        `${pkg.name} sepete eklendi! Ödeme sayfasına yönlendiriliyorsunuz…`
      );

      await new Promise((r) => setTimeout(r, 600));
      router.push("/magaza/odeme");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name || !demoForm.phone) {
      toast.error("Lütfen ad ve telefon alanlarını doldurunuz.");
      return;
    }
    setDemoSubmitted(true);
    toast.success("Demo talebiniz alındı! Uzmanımız 15 dakika içinde iletişime geçecektir.");
    setTimeout(() => {
      setDemoModalOpen(false);
      setDemoSubmitted(false);
      setDemoForm({ name: "", phone: "", email: "", company: "" });
    }, 1500);
  };

  return (
    <div className="w-full font-sans text-[#0b161d] selection:bg-[#E8622A] selection:text-white">
      {/* ── SECTION 1: HERO ─────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-32 overflow-hidden bg-[#f0f4f6]">
        {/* Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[600px] h-[340px] sm:h-[600px] bg-gradient-to-tr from-[#E8622A]/15 via-[#1A8FB5]/10 to-transparent rounded-full blur-[80px] sm:blur-[120px] pointer-events-none -z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#e1e9ed] text-[#263d4a] text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#E8622A] animate-pulse" />
              Müşteri İletişim Platformu & AI
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#263d4a] tracking-tight leading-[1.15] mb-6">
              Müşteri İletişiminizi Tek Ekranda Birleştirin,{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#E8622A] via-orange-500 to-amber-500">
                Yapay Zekayla Otomatize Edin.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-[#1a2a33]/80 font-normal leading-relaxed mb-10 max-w-2xl mx-auto">
              WhatsApp, Instagram, Canlı Destek ve E-postalar artık tek
              merkezde. Gelen talepleri akıllı yapay zeka taslaklarıyla saniyeler
              içinde yanıtlayın, kaçan müşteri kalmasın.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col items-center justify-center gap-6 mb-12">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                <button
                  onClick={() =>
                    document
                      .getElementById("paketler")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="w-full sm:w-auto px-9 py-4 rounded-xl bg-[#E8622A] text-white font-bold text-base shadow-[0_10px_25px_-5px_rgba(232,98,42,0.45)] hover:bg-orange-600 transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2 group"
                >
                  <Tag size={18} className="text-yellow-300" />
                  <span>Fiyat ve Paketleri Gör</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>

                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white border border-[#E8E8EE] text-[#263d4a] text-sm font-semibold shadow-sm hover:bg-[#f0f4f6] transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Canlı Demo Talep Et</span>
                </button>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-[#E8E8EE] text-xs font-semibold text-[#263d4a] shadow-sm">
                  <CheckCircle size={14} className="text-emerald-600" /> WhatsApp,
                  Instagram & Web Tek Ekranda
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-[#E8E8EE] text-xs font-semibold text-[#263d4a] shadow-sm">
                  <Zap size={14} className="text-[#E8622A]" /> %70 Zaman Tasarrufu
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-[#E8E8EE] text-xs font-semibold text-[#263d4a] shadow-sm">
                  <Sparkles size={14} className="text-[#E8622A]" /> 2 Dakikada Kolay
                  Kurulum
                </span>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-[#1a2a33]/70 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>Taahhütsüz & Esnek Altyapı</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>Kredi Kartı Gerekmez</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-600" />
                <span>5 Dakikada Hızlı Kurulum</span>
              </div>
            </div>
          </div>

          {/* ── Mockup Window: Glassmorphism Live Dashboard Preview ── */}
          <div className="mt-12 sm:mt-16 relative max-w-6xl mx-auto">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-[#E8622A]/20 via-[#263d4a]/30 to-[#1A8FB5]/30 rounded-3xl blur-2xl opacity-70" />

            <div className="relative rounded-2xl bg-[#0A0A0F] border border-white/10 shadow-2xl overflow-hidden backdrop-blur-2xl">
              {/* Top Window Bar */}
              <div className="h-12 bg-[#0F172A] border-b border-white/10 px-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <div className="ml-3 sm:ml-4 px-3 py-1 rounded-md bg-white/5 border border-white/5 text-[11px] text-gray-400 flex items-center gap-1.5 font-mono">
                    <Lock size={12} className="text-emerald-400" />
                    <span>app.midvem.com/inbox/unified</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Sistem Çevrimiçi (AI Aktif)
                  </span>
                </div>
              </div>

              {/* App Shell Grid */}
              <div className="grid grid-cols-12 min-h-[520px] text-white">
                {/* Mini Navigation Sidebar */}
                <div className="col-span-1 bg-[#0A0A0F] border-r border-white/10 p-3 hidden sm:flex flex-col items-center justify-between">
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <div className="w-9 h-9 rounded-xl bg-[#E8622A] flex items-center justify-center text-white shadow-md">
                      <MessageSquare size={18} />
                    </div>
                    <button className="w-9 h-9 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                      <Layers size={16} />
                    </button>
                    <button className="w-9 h-9 rounded-lg text-gray-400 hover:text-white flex items-center justify-center hover:bg-white/5 transition-all">
                      <Users size={16} />
                    </button>
                    <button className="w-9 h-9 rounded-lg text-gray-400 hover:text-white flex items-center justify-center hover:bg-white/5 transition-all">
                      <BarChart3 size={16} />
                    </button>
                    <button className="w-9 h-9 rounded-lg text-gray-400 hover:text-white flex items-center justify-center hover:bg-white/5 transition-all">
                      <BrainCircuit size={16} className="text-[#E8622A]" />
                    </button>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#263d4a] flex items-center justify-center text-xs font-bold border border-white/20">
                    MV
                  </div>
                </div>

                {/* Message Threads List */}
                <div className="col-span-12 sm:col-span-4 md:col-span-4 bg-[#0F172A]/90 border-r border-white/10 flex flex-col">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        Birleşik Gelen Kutusu
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        12 okunmamış görüşme
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#E8622A] text-white rounded-full">
                      Canlı
                    </span>
                  </div>

                  {/* Channel Filters */}
                  <div className="flex items-center gap-1.5 p-3 border-b border-white/5 overflow-x-auto text-[11px]">
                    <button className="px-2.5 py-1 rounded-md bg-[#E8622A] text-white font-medium">
                      Tümü
                    </button>
                    <button className="px-2.5 py-1 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 flex items-center gap-1">
                      <span className="text-emerald-400">●</span> WhatsApp
                    </button>
                    <button className="px-2.5 py-1 rounded-md bg-white/5 text-gray-300 hover:bg-white/10 flex items-center gap-1">
                      <span className="text-pink-400">●</span> DM
                    </button>
                  </div>

                  {/* Message Rows */}
                  <div className="divide-y divide-white/5 overflow-y-auto max-h-[420px]">
                    {/* Item 1 - Active */}
                    <div className="p-3.5 bg-white/10 border-l-2 border-[#E8622A] transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-white">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          Ahmet Yılmaz (Tekno Mobilya)
                        </span>
                        <span className="text-[10px] text-[#E8622A] font-medium">
                          1 dk önce
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 line-clamp-1">
                        Merhaba, toptan siparişte teslimat süresi ve iskontolarınız nedir?
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded border border-purple-700/40 flex items-center gap-1">
                          <Sparkles size={10} className="text-purple-300" /> AI
                          Taslağı Hazır
                        </span>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="p-3.5 hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-white">
                          <span className="w-2 h-2 rounded-full bg-pink-400" />
                          Selin Kaya (Butik Moda)
                        </span>
                        <span className="text-[10px] text-gray-400">8 dk önce</span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        Kargom bugün yola çıkar mı acaba? Takip numarası alabilir miyim?
                      </p>
                    </div>

                    {/* Item 3 */}
                    <div className="p-3.5 hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-white">
                          <span className="w-2 h-2 rounded-full bg-sky-400" />
                          Burak Demir (Canlı Destek)
                        </span>
                        <span className="text-[10px] text-gray-400">
                          22 dk önce
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">
                        Web sitenizdeki API entegrasyon dökümanına nasıl ulaşırım?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Chat Active View + AI Draft Module */}
                <div className="col-span-12 sm:col-span-7 md:col-span-7 bg-[#1E293B]/80 flex flex-col justify-between p-4 md:p-6 backdrop-blur-md">
                  {/* Chat Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm">
                        AY
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white flex items-center gap-2">
                          Ahmet Yılmaz
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                            WhatsApp Business
                          </span>
                        </h5>
                        <p className="text-xs text-gray-400">
                          Kullanıcı Segmente: KOBİ Satın Alma Yetkilisi
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 hidden md:block">
                      Temsilci: <strong className="text-white">Zeynep D.</strong>
                    </div>
                  </div>

                  {/* Chat Bubbles */}
                  <div className="space-y-4 my-6">
                    {/* Customer message */}
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div className="w-7 h-7 rounded-full bg-emerald-600/40 text-emerald-300 flex items-center justify-center text-xs flex-shrink-0">
                        ✆
                      </div>
                      <div className="p-3.5 rounded-2xl rounded-tl-none bg-white/10 text-gray-100 text-xs leading-relaxed border border-white/5 shadow-sm">
                        Merhaba Zeynep Hanım, şirketimiz için 50 adet masaüstü
                        takım alacağız. Toptan siparişte teslimat süresi ve
                        iskontolarınız nedir acaba?
                      </div>
                    </div>

                    {/* Midvem AI Smart Assistant Card */}
                    <div className="relative p-4 rounded-xl bg-gradient-to-br from-[#0A4D68]/40 via-[#1A8FB5]/20 to-[#E8622A]/10 border border-[#1A8FB5]/40 shadow-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                          <Sparkles size={14} className="text-[#E8622A] animate-spin" />
                          <span>Midvem AI Yanıt Önerisi (Doğruluk: %98)</span>
                        </div>
                        <span className="text-[10px] bg-[#E8622A]/20 text-[#E8622A] px-2 py-0.5 rounded font-semibold">
                          1 Tıkla Gönder
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 leading-normal bg-black/30 p-3 rounded-lg border border-white/5">
                        &quot;Ahmet Bey merhaba! 50 adet üzeri kurumsal siparişlerimizde %18 toptan iskonto uyguluyoruz. Stoklarımız müsait olup 3 iş gününde kargolanabilir. Özel teklif dosyamızı PDF olarak iletmemi ister misiniz?&quot;
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() =>
                            toast.success(
                              "Yapay zeka taslağı müşteriye başarıyla iletildi!"
                            )
                          }
                          className="px-3.5 py-1.5 rounded-lg bg-[#E8622A] hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                        >
                          <Send size={12} />
                          Taslağı Onayla ve Gönder
                        </button>
                        <button
                          onClick={() =>
                            toast.info("Düzenleme modu aktifleştirildi.")
                          }
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-medium transition-colors"
                        >
                          Düzenle
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Message Input Mock */}
                  <div className="pt-3 border-t border-white/10 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Mesajınızı yazın veya AI'dan öneri isteyin..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#E8622A]"
                    />
                    <button
                      onClick={() => toast.info("Mesaj gönderildi")}
                      className="w-10 h-10 rounded-xl bg-[#E8622A] text-white flex items-center justify-center shadow-md hover:bg-orange-600 flex-shrink-0 transition-colors"
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: FEATURES GRID (NEDEN MIDVEM?) ─────────────────────────── */}
      <section
        id="ozellikler"
        className="py-20 sm:py-24 bg-white border-y border-[#E8E8EE] relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f4f6] border border-[#e1e9ed] text-[#263d4a] font-semibold text-xs mb-3">
              <Zap size={14} className="text-[#E8622A]" />
              <span>NEDEN MIDVEM?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#263d4a] tracking-tight mb-4">
              Müşteri Desteğini Gelir Kapısına Dönüştüren Araçlar
            </h2>
            <p className="text-[#1a2a33]/80 text-sm sm:text-base leading-relaxed">
              KOBİ ekipleri için karmaşık panel ve süreçleri ortadan kaldırdık.
              Hızlı, sezgisel ve anında satışa dönüştüren gelişmiş modüller.
            </p>
          </div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Kart 1: Çok Kanallı Ortak Gelen Kutusu */}
            <div className="group relative rounded-2xl bg-[#f0f4f6]/50 p-8 border border-[#E8E8EE] hover:border-[#263d4a] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#263d4a] text-white flex items-center justify-center mb-6 shadow-md group-hover:bg-gradient-to-r group-hover:from-[#263d4a] group-hover:to-[#1A8FB5] transition-all">
                <MessageSquare size={24} className="text-[#E8622A]" />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                Çok Kanallı Ortak Gelen Kutusu
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                WhatsApp Business, Instagram DM, Web Canlı Destek ve E-posta
                kanallarını tek bir akıcı merkezde birleştirin. Sekmeler arasında
                kaybolmaya son.
              </p>
              <div className="pt-4 border-t border-[#E8E8EE]/60 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Tek Ekran
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Ekip Dağıtımı
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Etiketleme
                </span>
              </div>
            </div>

            {/* Kart 2: Yapay Zeka Yanıt Asistanı (Highlighted) */}
            <div className="group relative rounded-2xl bg-gradient-to-b from-white to-[#FEF0EA]/30 p-8 border-2 border-[#E8622A]/40 hover:border-[#E8622A] transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
              <div className="absolute -top-3 left-8 px-3 py-0.5 rounded-full bg-[#E8622A] text-white text-[11px] font-extrabold uppercase tracking-wider shadow-sm">
                AI Motoru
              </div>
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-[#E8622A]/10 text-[#E8622A] flex items-center justify-center font-bold text-xs">
                02
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#E8622A] text-white flex items-center justify-center mb-6 shadow-lg">
                <BrainCircuit size={26} />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                Yapay Zeka Yanıt Asistanı
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                Geçmiş konuşmalarınızı ve ürün kataloğunuzu analiz ederek
                müşterilerin sorularına akıllı, satış odaklı ve kibar yanıt
                taslakları hazırlar.
              </p>
              <div className="pt-4 border-t border-[#E8622A]/20 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Sparkles size={14} className="text-[#E8622A]" /> Otomatik
                  Taslak
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={14} className="text-[#E8622A]" /> 7/24 Bot
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={14} className="text-[#E8622A]" /> Duygu Analizi
                </span>
              </div>
            </div>

            {/* Kart 3: Canlı Ziyaretçi Takibi */}
            <div className="group relative rounded-2xl bg-[#f0f4f6]/50 p-8 border border-[#E8E8EE] hover:border-[#263d4a] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#263d4a] text-white flex items-center justify-center mb-6 shadow-md group-hover:bg-gradient-to-r group-hover:from-[#263d4a] group-hover:to-[#1A8FB5] transition-all">
                <Eye size={24} className="text-[#E8622A]" />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                Canlı Ziyaretçi Takibi
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                Sitenizde gezinmekte olan potansiyel müşterileri anlık görün,
                sepeti terk etmek üzere olanlara proaktif destek mesajı fırlatın.
              </p>
              <div className="pt-4 border-t border-[#E8E8EE]/60 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Sayfa İzleme
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Proaktif Tetik
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Sepet Kurtarma
                </span>
              </div>
            </div>

            {/* Kart 4: Gelişmiş Performans Raporları */}
            <div className="group relative rounded-2xl bg-[#f0f4f6]/50 p-8 border border-[#E8E8EE] hover:border-[#263d4a] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                04
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#263d4a] text-white flex items-center justify-center mb-6 shadow-md group-hover:bg-gradient-to-r group-hover:from-[#263d4a] group-hover:to-[#1A8FB5] transition-all">
                <BarChart3 size={24} className="text-[#E8622A]" />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                Gelişmiş Performans Raporları
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                İlk yanıtlama süresi, müşteri memnuniyet puanı (CSAT) ve personel
                başına düşen çözüm hacmini şeffaf grafiklerle izleyin.
              </p>
              <div className="pt-4 border-t border-[#E8E8EE]/60 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> CSAT Ölçümü
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Hız Analizi
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Excel Dışa
                  Aktar
                </span>
              </div>
            </div>

            {/* Kart 5: Akıllı Makrolar & Otomasyon */}
            <div className="group relative rounded-2xl bg-[#f0f4f6]/50 p-8 border border-[#E8E8EE] hover:border-[#263d4a] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                05
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#263d4a] text-white flex items-center justify-center mb-6 shadow-md group-hover:bg-gradient-to-r group-hover:from-[#263d4a] group-hover:to-[#1A8FB5] transition-all">
                <Zap size={24} className="text-[#E8622A]" />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                Akıllı Makrolar & Otomasyon
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                Sıkça sorulan sorulara tek tıkla zengin yanıtlar verin. Müşteri
                çalışma saatleri dışında yazsa bile anında bilgilendirme gönderin.
              </p>
              <div className="pt-4 border-t border-[#E8E8EE]/60 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Kısayollar
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Mesai Dışı Bot
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Özel Kurallar
                </span>
              </div>
            </div>

            {/* Kart 6: KOBİ Uyumlu Kolay Entegrasyon */}
            <div className="group relative rounded-2xl bg-[#f0f4f6]/50 p-8 border border-[#E8E8EE] hover:border-[#263d4a] transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xs">
                06
              </div>
              <div className="w-14 h-14 rounded-2xl bg-[#263d4a] text-white flex items-center justify-center mb-6 shadow-md group-hover:bg-gradient-to-r group-hover:from-[#263d4a] group-hover:to-[#1A8FB5] transition-all">
                <Cpu size={24} className="text-[#E8622A]" />
              </div>
              <h3 className="font-bold text-xl text-[#263d4a] mb-3">
                E-Ticaret & CRM Entegrasyonu
              </h3>
              <p className="text-[#1a2a33]/80 text-sm leading-relaxed mb-6">
                İkas, Ticimax, Shopify veya WooCommerce altyapınızla 1 tıkla
                eşleşir. Müşterinin son siparişini konuşma esnasında ekranda
                görün.
              </p>
              <div className="pt-4 border-t border-[#E8E8EE]/60 flex items-center gap-3 text-xs font-semibold text-[#263d4a]">
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Sipariş Özeti
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Kolay API
                </span>
                <span className="flex items-center gap-1">
                  <Check size={14} className="text-[#E8622A]" /> Sıfır Kodlama
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PRICING AND PACKAGES ─────────────────────────────────── */}
      <section id="paketler" className="py-20 sm:py-24 bg-[#f0f4f6] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section Heading */}
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#263d4a] tracking-tight mb-4">
              İşletmeniz İçin En Uygun Paketi Seçin
            </h2>
            <p className="text-[#1a2a33]/80 text-sm sm:text-base max-w-xl mx-auto">
              Gizli maliyet yok, sözleşme bağlayıcılığı yok. İhtiyacınıza göre
              başlayın, işletmeniz büyüdükçe yükseltin.
            </p>
          </div>

          {/* Auth Notice if logged out */}
          {!isAuthenticated && (
            <div className="mb-10 p-4 rounded-2xl bg-white border border-[#1A8FB5]/30 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔐</span>
                <p className="text-sm text-[#263d4a] font-medium">
                  Aboneliği başlatmak ve paneli hemen kurmak için{" "}
                  <strong>hesabınıza giriş yapmanız</strong> gerekir.
                </p>
              </div>
              <button
                onClick={() =>
                  router.push(
                    `/auth?callbackUrl=${encodeURIComponent(
                      "/services/ai-automation/midvem"
                    )}`
                  )
                }
                className="shrink-0 px-6 py-2.5 rounded-xl bg-[#263d4a] text-white font-semibold text-sm hover:bg-black transition-colors"
              >
                Giriş Yap / Kayıt Ol →
              </button>
            </div>
          )}

          {/* Pricing 3 Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
            {MIDVEM_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-3xl p-8 md:p-10 flex flex-col justify-between transition-all duration-300 relative ${
                  pkg.isPopular
                    ? "bg-[#263d4a] text-white border-2 border-[#E8622A] shadow-2xl lg:-translate-y-4"
                    : "bg-white text-[#263d4a] border border-[#E8E8EE] shadow-lg hover:border-[#263d4a]/40"
                }`}
              >
                {/* Popular Ribbon */}
                {pkg.isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-[#E8622A] text-white text-xs font-extrabold tracking-wider uppercase shadow-[0_10px_25px_-5px_rgba(232,98,42,0.45)] flex items-center gap-1.5 whitespace-nowrap">
                    <Zap size={14} className="text-yellow-300" />
                    <span>{pkg.badge}</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4 pt-1">
                    <h3
                      className={`font-bold text-2xl ${
                        pkg.isPopular ? "text-white" : "text-[#263d4a]"
                      }`}
                    >
                      {pkg.name}
                    </h3>
                    <span
                      className={`p-2.5 rounded-xl ${
                        pkg.isPopular
                          ? "bg-white/10 text-[#E8622A]"
                          : "bg-[#f0f4f6] text-[#263d4a]"
                      }`}
                    >
                      {pkg.icon}
                    </span>
                  </div>

                  <p
                    className={`text-sm mb-6 leading-relaxed ${
                      pkg.isPopular ? "text-slate-300" : "text-[#1a2a33]/70"
                    }`}
                  >
                    {pkg.tagline}
                  </p>

                  {/* Price */}
                  <div
                    className={`flex items-baseline gap-1 mb-8 pb-6 border-b ${
                      pkg.isPopular ? "border-white/15" : "border-[#E8E8EE]"
                    }`}
                  >
                    <span
                      className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${
                        pkg.isPopular ? "text-white" : "text-[#263d4a]"
                      }`}
                    >
                      {pkg.priceLabel}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        pkg.isPopular ? "text-slate-300" : "text-[#1a2a33]/70"
                      }`}
                    >
                      {pkg.period}
                    </span>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3.5 text-sm mb-8">
                    {pkg.features.map((feat) => (
                      <li
                        key={feat.text}
                        className={`flex items-center gap-3 ${
                          !feat.included
                            ? "text-gray-400 line-through"
                            : pkg.isPopular
                            ? "text-gray-200"
                            : "text-[#1a2a33]"
                        }`}
                      >
                        {feat.included ? (
                          <Check
                            size={16}
                            className={`shrink-0 ${
                              pkg.isPopular
                                ? "text-[#E8622A]"
                                : "text-emerald-600"
                            }`}
                          />
                        ) : (
                          <X size={16} className="text-gray-300 shrink-0" />
                        )}
                        <span className={feat.bold ? "font-bold" : ""}>
                          {feat.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handlePurchase(pkg)}
                  disabled={processingId === pkg.id}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-center transition-all duration-200 flex items-center justify-center gap-2 ${pkg.buttonClass}`}
                >
                  {processingId === pkg.id ? (
                    <>
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      İşleniyor…
                    </>
                  ) : (
                    <>
                      <span>Aboneliği Başlat</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: TESTIMONIALS & SOCIAL PROOF ───────────────────────────── */}
      <section id="referanslar" className="py-20 bg-white border-t border-[#E8E8EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="font-bold text-2xl sm:text-3xl text-[#263d4a] mb-2">
              500+&apos;den Fazla KOBİ Midvem ile Büyüyor
            </h3>
            <p className="text-sm text-[#1a2a33]/70">
              Müşteri geri dönüş süreleri %74 kısaldı, satış dönüşümleri 2.8 kat
              arttı.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REVIEWS.map((rev) => (
              <div
                key={rev.name}
                className="p-6 rounded-2xl bg-[#f0f4f6]/60 border border-[#E8E8EE]/80 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex text-amber-400 mb-3 gap-1">
                    <Star size={16} fill="#fbbf24" stroke="none" />
                    <Star size={16} fill="#fbbf24" stroke="none" />
                    <Star size={16} fill="#fbbf24" stroke="none" />
                    <Star size={16} fill="#fbbf24" stroke="none" />
                    <Star size={16} fill="#fbbf24" stroke="none" />
                  </div>
                  <p className="text-sm text-[#1a2a33] leading-relaxed mb-5">
                    &quot;{rev.comment}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200/60">
                  <div
                    className={`w-9 h-9 rounded-full ${rev.color} text-white font-bold text-xs flex items-center justify-center shrink-0`}
                  >
                    {rev.initials}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#263d4a]">
                      {rev.name}
                    </div>
                    <div className="text-[11px] text-gray-500">{rev.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: FAQ ──────────────────────────────────────────────────── */}
      <section id="sss" className="py-20 bg-[#f0f4f6] border-t border-[#E8E8EE]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs tracking-[0.2em] uppercase text-[#1A8FB5] mb-2 font-bold font-mono">
              MERK EDİLENLER
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#263d4a] mb-3">
              Sıkça Sorulan Sorular
            </h2>
            <p className="text-sm text-[#1a2a33]/70">
              Midvem kurulumu, WhatsApp API entegrasyonu ve yapay zeka özellikleri
              hakkında merak edilen tüm detaylar.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.q}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? "bg-white border-[#1A8FB5]/30 shadow-md"
                      : "bg-white/80 border-[#E8E8EE]"
                  }`}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left select-none"
                    aria-expanded={isOpen}
                  >
                    <span className="font-semibold text-sm sm:text-base text-[#263d4a] leading-snug">
                      {faq.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={20} className="text-[#1A8FB5] shrink-0" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── DEMO REQUEST MODAL ─────────────────────────────────────────────── */}
      {demoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-[#E8E8EE] shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setDemoModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#FEF0EA] text-[#E8622A] flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#263d4a]">
                  Canlı Demo Talep Edin
                </h3>
                <p className="text-xs text-gray-500">
                  Uzmanımız 15 dakika içinde sisteminizi göstersin
                </p>
              </div>
            </div>

            <form onSubmit={handleDemoSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ahmet Yılmaz"
                  value={demoForm.name}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, name: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Telefon Numarası *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0532 000 00 00"
                  value={demoForm.phone}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  E-Posta
                </label>
                <input
                  type="email"
                  placeholder="ahmet@sirketiniz.com"
                  value={demoForm.email}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, email: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Şirket / Marka Adı
                </label>
                <input
                  type="text"
                  placeholder="Tekno Mobilya Ltd."
                  value={demoForm.company}
                  onChange={(e) =>
                    setDemoForm({ ...demoForm, company: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 focus:outline-none focus:border-[#E8622A]"
                />
              </div>

              <button
                type="submit"
                disabled={demoSubmitted}
                className="w-full py-3 px-4 rounded-xl bg-[#E8622A] text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow-md mt-2 flex items-center justify-center gap-2"
              >
                {demoSubmitted ? (
                  <>
                    <CheckCircle size={16} /> Gönderildi
                  </>
                ) : (
                  <>
                    <span>Demoyu Başlat</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
