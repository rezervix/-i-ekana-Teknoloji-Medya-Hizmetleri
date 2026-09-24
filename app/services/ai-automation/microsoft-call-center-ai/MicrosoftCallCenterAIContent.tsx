"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle, Headphones, RefreshCw } from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";

type BillingPeriod = "monthly" | "yearly";

interface AddonState {
  recording: boolean;
  knowledgeBase: boolean;
  sms: boolean;
  customVoice: boolean;
}

export default function MicrosoftCallCenterAIContent() {
  const { addItem } = useCartStore();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [activeTab, setActiveTab] = useState<"arama" | "yapay" | "ozel">("arama");
  const [exchangeRate, setExchangeRate] = useState<number>(35.0);
  const [rateSource, setRateSource] = useState<string>("");
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(true);

  // Otomatik güncellenen canlı döviz kurunu /api/exchange-rate servisinden çek
  useEffect(() => {
    async function fetchRate() {
      try {
        setIsLoadingRate(true);
        const res = await fetch("/api/exchange-rate");
        if (res.ok) {
          const data = await res.json();
          if (data.rate && typeof data.rate === "number") {
            setExchangeRate(data.rate);
            setRateSource(data.source || "");
          }
        }
      } catch (err) {
        console.error("Döviz kuru yüklenirken hata oluştu:", err);
      } finally {
        setIsLoadingRate(false);
      }
    }
    fetchRate();
  }, []);

  // Add-on states for each package
  const [starterAddons, setStarterAddons] = useState<AddonState>({
    recording: false,
    knowledgeBase: false,
    sms: false,
    customVoice: false,
  });

  const [mediumAddons, setMediumAddons] = useState<AddonState>({
    recording: false,
    knowledgeBase: false,
    sms: false,
    customVoice: false,
  });

  const [enterpriseAddons, setEnterpriseAddons] = useState<AddonState>({
    recording: true,
    knowledgeBase: true,
    sms: false,
    customVoice: false,
  });

  const toggleBilling = () => {
    setBillingPeriod((prev) => (prev === "monthly" ? "yearly" : "monthly"));
  };

  const calculateUSDPrice = (baseMonthly: number, baseYearlyMonthly: number, addons: AddonState): number => {
    const isMonthly = billingPeriod === "monthly";
    const baseUSD = isMonthly ? baseMonthly : baseYearlyMonthly * 12;

    let addonUSD = 0;
    if (addons.recording) addonUSD += isMonthly ? 9 : 9 * 12;
    if (addons.knowledgeBase) addonUSD += isMonthly ? 19 : 19 * 12;

    return baseUSD + addonUSD;
  };

  const calculatePriceStr = (baseMonthly: number, baseYearlyMonthly: number, addons: AddonState): string => {
    const totalUSD = calculateUSDPrice(baseMonthly, baseYearlyMonthly, addons);
    return `$${totalUSD.toLocaleString("en-US")}`;
  };

  const handleAddToCart = (
    packageName: "Başlangıç" | "Orta Ölçek",
    productId: string,
    baseMonthlyUSD: number,
    baseYearlyMonthlyUSD: number,
    addons: AddonState
  ) => {
    const isMonthly = billingPeriod === "monthly";
    const baseUSD = isMonthly ? baseMonthlyUSD : baseYearlyMonthlyUSD * 12;
    const baseTL = baseUSD * exchangeRate;

    const extraServices: { type: string; label: string; price: number }[] = [];

    if (addons.recording) {
      const serviceUSD = isMonthly ? 9 : 9 * 12;
      extraServices.push({
        type: "recording",
        label: `Görüşme Kaydı (${isMonthly ? "+$9/ay" : "+$108/yıl"})`,
        price: serviceUSD * exchangeRate,
      });
    }

    if (addons.knowledgeBase) {
      const serviceUSD = isMonthly ? 19 : 19 * 12;
      extraServices.push({
        type: "knowledgeBase",
        label: `Genişletilmiş Bilgi Tabanı (${isMonthly ? "+$19/ay" : "+$228/yıl"})`,
        price: serviceUSD * exchangeRate,
      });
    }

    if (addons.sms) {
      extraServices.push({
        type: "sms",
        label: "SMS Bildirimleri ($0.05/mesaj - Kullanım Bazlı)",
        price: 0,
      });
    }

    const totalUSD = calculateUSDPrice(baseMonthlyUSD, baseYearlyMonthlyUSD, addons);

    addItem({
      productId,
      name: `Microsoft Call Center AI - ${packageName} Paket`,
      price: baseTL,
      quantity: 1,
      image: "https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc",
      category: "Yapay Zeka & Otomasyon",
      extraServices,
      customizationData: {
        "Faturalama Periyodu": isMonthly ? "Aylık" : "Yıllık (%15 İndirimli)",
        "Paket Tutarı (USD)": `$${baseUSD}`,
        "Toplam Tutar (USD)": `$${totalUSD}`,
        "Güncel Döviz Kuru": `1 USD = ${exchangeRate} TL`,
      },
    });

    toast.success(`Microsoft Call Center AI (${packageName} Paket) sepete eklendi!`);
  };

  const handleScrollToPricing = () => {
    document.getElementById("paketler")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleContactForm = () => {
    // Navigate to contact page
    window.location.href = "/contact";
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 md:px-20 w-full pt-20">
      {/* Hero Section */}
      <section className="py-20 grid grid-cols-4 md:grid-cols-12 gap-6 items-center min-h-[80vh]">
        <div className="col-span-4 md:col-span-6 flex flex-col gap-8 z-10">
          <h1 className="text-[40px] md:text-[56px] font-bold leading-[48px] md:leading-[64px] tracking-tight text-[#002638]">
            Hiç Kaçırmayan, Hiç Yorulmayan Dijital Çağrı Asistanınız
          </h1>
          <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#41484c]">
            Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, her dili anlayan ve insan doğallığında konuşan yapay zeka çözümünüz.
          </p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#cde6f4] p-2 rounded shrink-0">
                <span className="text-[#0a3d54]">📅</span>
              </div>
              <span className="text-[16px] text-[#41484c]">
                Mesai dışı kaçan çağrılar → <span className="font-semibold text-[#002638]">7/24 Kesintisiz Yanıt</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#cde6f4] p-2 rounded shrink-0">
                <span className="text-[#0a3d54]">⚡</span>
              </div>
              <span className="text-[16px] text-[#41484c]">
                Uzun bekleme süreleri → <span className="font-semibold text-[#002638]">Anında ve Gecikmesiz Cevap</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[#cde6f4] p-2 rounded shrink-0">
                <span className="text-[#0a3d54]">🌐</span>
              </div>
              <span className="text-[16px] text-[#41484c]">
                Tek dilde sınırlı destek → <span className="font-semibold text-[#002638]">Onlarca Dilde Doğal İletişim</span>
              </span>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={handleScrollToPricing}
              className="bg-[#00b2c9] text-white text-[14px] font-medium rounded px-6 py-3 hover:bg-[#003f48] transition-colors shadow-sm flex items-center gap-2 font-bold"
            >
              Paketleri İncele
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="col-span-4 md:col-span-6 relative h-[400px] md:h-[600px] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(10,61,84,0.08)]">
          <div
            className="bg-cover bg-center w-full h-full absolute inset-0"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc')",
            }}
            aria-label="A futuristic call center interface with a holographic female AI assistant"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#fcf9f8]/80 to-transparent md:hidden" />
        </div>
      </section>

      {/* Combined Features & How it Works Section */}
      <section className="py-20 flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-[40px] md:text-[56px] font-bold leading-[48px] md:leading-[64px] text-[#002638] mb-2">
            Detaylı Özellikler
          </h2>
          <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#41484c] max-w-3xl mx-auto">
            İşletmenizin her ihtiyacına cevap veren kapsamlı ve güçlü altyapı.
          </p>
        </div>

        {/* "How it Works" Strip */}
        <div className="flex flex-row items-center justify-center gap-4 bg-white p-4 rounded-lg shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0] w-fit mx-auto my-4">
          <div className="flex items-center gap-2">
            <span className="text-[32px] text-[#0a3d54]">📞</span>
            <span className="text-[14px] text-[#002638] font-bold">Telefon Çalar</span>
          </div>
          <span className="text-[24px] text-[#72787d]">→</span>
          <div className="flex items-center gap-2">
            <span className="text-[32px] text-[#0a3d54]">🧠</span>
            <span className="text-[14px] text-[#002638] font-bold">Yapay Zeka Anlar</span>
          </div>
          <span className="text-[24px] text-[#72787d]">→</span>
          <div className="flex items-center gap-2">
            <span className="text-[32px] text-[#0a3d54]">✅</span>
            <span className="text-[14px] text-[#002638] font-bold">Sorun Çözülür</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-8 border-b border-[#c1c7cd] mb-4">
          <button
            onClick={() => setActiveTab("arama")}
            className={`pb-2 text-[16px] md:text-[18px] hover:text-[#002638] transition-colors flex items-center gap-2 ${
              activeTab === "arama"
                ? "border-b-2 border-[#002638] text-[#002638] font-semibold"
                : "text-[#41484c]"
            }`}
          >
            <span>📞</span> Arama ve İletişim
          </button>
          <button
            onClick={() => setActiveTab("yapay")}
            className={`pb-2 text-[16px] md:text-[18px] hover:text-[#002638] transition-colors flex items-center gap-2 ${
              activeTab === "yapay"
                ? "border-b-2 border-[#002638] text-[#002638] font-semibold"
                : "text-[#41484c]"
            }`}
          >
            <span>🧠</span> Yapay Zeka
          </button>
          <button
            onClick={() => setActiveTab("ozel")}
            className={`pb-2 text-[16px] md:text-[18px] hover:text-[#002638] transition-colors flex items-center gap-2 ${
              activeTab === "ozel"
                ? "border-b-2 border-[#002638] text-[#002638] font-semibold"
                : "text-[#41484c]"
            }`}
          >
            <span>⚙️</span> Özelleştirme ve Yönetim
          </button>
        </div>

        {/* Tab Content: Arama ve İletişim */}
        {activeTab === "arama" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#4a626d] mb-2 text-[28px]">📞</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Gelen/Giden Aramalar</h4>
              <p className="text-[16px] text-[#41484c]">Hem müşterilerden gelen çağrıları yanıtlar hem de dış aramalar yapabilir.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#4a626d] mb-2 text-[28px]">📡</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Gerçek Zamanlı Akış</h4>
              <p className="text-[16px] text-[#41484c]">Gecikmesiz, kesintisiz ve doğal bir sesli iletişim deneyimi sunar.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#4a626d] mb-2 text-[28px]">💬</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">SMS Desteği (Twilio)</h4>
              <p className="text-[16px] text-[#41484c]">Görüşme sırasında veya sonrasında otomatik bilgilendirme mesajları gönderir.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#4a626d] mb-2 text-[28px]">👥</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">İnsana Aktarım</h4>
              <p className="text-[16px] text-[#41484c]">Karmaşık durumlarda görüşmeyi anında canlı bir temsilciye devreder.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#4a626d] mb-2 text-[28px]">🕐</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">7/24 Kesintisiz Hizmet</h4>
              <p className="text-[16px] text-[#41484c]">Mesai saatleri dışında bile müşterilerinize her an destek sağlar.</p>
            </div>
          </div>
        )}

        {/* Tab Content: Yapay Zeka */}
        {activeTab === "yapay" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#00b2c9] mb-2 text-[28px]">🧠</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">GPT-4.1 Desteği</h4>
              <p className="text-[16px] text-[#41484c]">En gelişmiş dil modeli ile karmaşık diyalogları kolayca yönetir.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#00b2c9] mb-2 text-[28px]">🌐</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Çok Dilli İletişim</h4>
              <p className="text-[16px] text-[#41484c]">Müşteriniz hangi dilde konuşursa konuşsun, anlar ve yanıt verir.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#00b2c9] mb-2 text-[28px]">🎙️</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Özel Ses Seçenekleri</h4>
              <p className="text-[16px] text-[#41484c]">Markanızın kimliğine uygun ses tonunu ve karakterini belirleyin.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#00b2c9] mb-2 text-[28px]">🗄️</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">RAG (Azure AI Search)</h4>
              <p className="text-[16px] text-[#41484c]">Kendi bilgi tabanınızdan güç alarak en doğru ve güncel bilgileri sunar.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#00b2c9] mb-2 text-[28px]">🛡️</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Güvenlik & Jailbreak Koruması</h4>
              <p className="text-[16px] text-[#41484c]">Yapay zekanın sınırların dışına çıkmasını ve manipüle edilmesini engeller.</p>
            </div>
          </div>
        )}

        {/* Tab Content: Özelleştirme ve Yönetim */}
        {activeTab === "ozel" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#002638] mb-2 text-[28px]">📝</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Özelleştirilebilir Komutlar</h4>
              <p className="text-[16px] text-[#41484c]">Botunuzun nasıl davranacağını belirleyen esnek prompt yapılandırması.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#002638] mb-2 text-[28px]">📋</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Görev Tanımlama</h4>
              <p className="text-[16px] text-[#41484c]">Sipariş alma, randevu oluşturma gibi spesifik görevleri öğretin ve atayın.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#002638] mb-2 text-[28px]">🔘</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Özellik Bayrakları (Feature Flags)</h4>
              <p className="text-[16px] text-[#41484c]">Yeni özellikleri güvenle test edin ve anında açıp kapatın.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0]">
              <span className="text-[#002638] mb-2 text-[28px]">📊</span>
              <h4 className="text-[20px] font-semibold text-[#002638] mb-2">Gelişmiş Raporlama</h4>
              <p className="text-[16px] text-[#41484c]">Tüm çağrı metriklerini ve performans verilerini tek ekrandan analiz edin.</p>
            </div>
          </div>
        )}
      </section>

      {/* Pricing Section */}
      <section className="py-20 flex flex-col gap-8" id="paketler">
        <div className="text-center">
          <h2 className="text-[40px] md:text-[56px] font-bold leading-[48px] md:leading-[64px] text-[#002638] mb-2">
            Size Uygun Paketi Seçin
          </h2>
          <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#41484c] max-w-3xl mx-auto">
            İhtiyacınıza uygun paketi seçin, dilediğiniz zaman yükseltin.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 my-4">
          <span className="text-[14px] text-[#41484c]">Aylık</span>
          <button
            onClick={toggleBilling}
            aria-checked={billingPeriod === "yearly"}
            role="switch"
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              billingPeriod === "yearly" ? "bg-[#0a3d54]" : "bg-[#cde6f4]"
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                billingPeriod === "yearly" ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-[14px] text-[#002638] font-bold">Yıllık (%15 indirim)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Package */}
          <div className="bg-white p-8 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0] flex flex-col">
            <h3 className="text-[24px] font-semibold text-[#002638] mb-2">Başlangıç</h3>
            <div className="mb-4">
              <span className="text-[40px] font-bold text-[#002638]">
                {calculatePriceStr(259, 220, starterAddons)}
              </span>
              <span className="text-[#41484c]">
                {billingPeriod === "monthly" ? "/ay" : "/yıl"}
              </span>
              <div className="text-[12px] text-[#72787d] font-medium mt-1">
                ≈ {(calculateUSDPrice(259, 220, starterAddons) * exchangeRate).toLocaleString("tr-TR")} TL
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-4 p-2 bg-[#f6f3f2] rounded">
              <span className="text-[12px] font-bold text-[#002638] mb-1">İsteğe Bağlı Ekle:</span>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={starterAddons.recording}
                  onChange={(e) => setStarterAddons({ ...starterAddons, recording: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]"
                />
                Görüşme Kaydı (+$9/ay)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={starterAddons.knowledgeBase}
                  onChange={(e) => setStarterAddons({ ...starterAddons, knowledgeBase: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]"
                />
                Genişletilmiş Bilgi Tabanı (+$19/ay)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={starterAddons.sms}
                  onChange={(e) => setStarterAddons({ ...starterAddons, sms: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]"
                />
                SMS Bildirimleri ($0.05/mesaj)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#72787d] cursor-not-allowed">
                <input type="checkbox" disabled className="w-4 h-4 rounded border-[#c1c7cd] opacity-50" />
                Özel Ses (Kurumsal Yükseltme)
              </label>
            </div>
            <ul className="flex flex-col gap-2 mb-6 flex-grow">
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> 300 Dakika / Ay
              </li>
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> 1 Eşzamanlı Çağrı
              </li>
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> Standart Destek
              </li>
              <li className="mt-2 text-[12px] text-[#72787d]">Kota üstü dakika: $0.10/dk</li>
            </ul>
            <button
              onClick={() => handleAddToCart("Başlangıç", "microsoft-call-center-ai-starter", 259, 220, starterAddons)}
              className="w-full py-3 px-6 rounded bg-[#ebe7e7] text-[#002638] font-bold hover:bg-[#00b2c9] hover:text-white transition-colors"
            >
              Bu Paketi Seç
            </button>
          </div>

          {/* Medium Package */}
          <div className="bg-[#0a3d54] p-8 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border-2 border-[#002638] flex flex-col relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#002638] text-white px-4 py-1 rounded-full text-[12px] font-bold">
              En Çok Tercih Edilen
            </div>
            <h3 className="text-[24px] font-semibold text-white mb-2">Orta Ölçek</h3>
            <div className="mb-4">
              <span className="text-[40px] font-bold text-white">
                {calculatePriceStr(312, 265, mediumAddons)}
              </span>
              <span className="text-[#7ea8c3]">
                {billingPeriod === "monthly" ? "/ay" : "/yıl"}
              </span>
              <div className="text-[12px] text-[#7ea8c3] font-medium mt-1">
                ≈ {(calculateUSDPrice(312, 265, mediumAddons) * exchangeRate).toLocaleString("tr-TR")} TL
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-4 p-2 bg-[#002638]/10 rounded">
              <span className="text-[12px] font-bold text-white mb-1">İsteğe Bağlı Ekle:</span>
              <label className="flex items-center gap-2 text-[12px] text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediumAddons.recording}
                  onChange={(e) => setMediumAddons({ ...mediumAddons, recording: e.target.checked })}
                  className="w-4 h-4 rounded border-white/30 text-white focus:ring-white"
                />
                Görüşme Kaydı (+$9/ay)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediumAddons.knowledgeBase}
                  onChange={(e) => setMediumAddons({ ...mediumAddons, knowledgeBase: e.target.checked })}
                  className="w-4 h-4 rounded border-white/30 text-white focus:ring-white"
                />
                Genişletilmiş Bilgi Tabanı (+$19/ay)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={mediumAddons.sms}
                  onChange={(e) => setMediumAddons({ ...mediumAddons, sms: e.target.checked })}
                  className="w-4 h-4 rounded border-white/30 text-white focus:ring-white"
                />
                SMS Bildirimleri ($0.05/mesaj)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-white/60 cursor-not-allowed">
                <input type="checkbox" disabled className="w-4 h-4 rounded border-white/30 opacity-50" />
                Özel Ses (Kurumsal Yükseltme)
              </label>
            </div>
            <ul className="flex flex-col gap-2 mb-6 flex-grow">
              <li className="flex items-center gap-2 text-white">
                <CheckCircle size={18} className="text-white" /> 1,000 Dakika / Ay
              </li>
              <li className="flex items-center gap-2 text-white">
                <CheckCircle size={18} className="text-white" /> 3 Eşzamanlı Çağrı
              </li>
              <li className="flex items-center gap-2 text-white">
                <CheckCircle size={18} className="text-white" /> Öncelikli Destek
              </li>
              <li className="mt-2 text-[12px] text-[#7ea8c3]">Kota üstü dakika: $0.08/dk</li>
            </ul>
            <button
              onClick={() => handleAddToCart("Orta Ölçek", "microsoft-call-center-ai-medium", 312, 265, mediumAddons)}
              className="w-full py-3 px-6 rounded bg-white text-[#002638] font-bold hover:bg-[#00b2c9] hover:text-white transition-colors"
            >
              Bu Paketi Seç
            </button>
          </div>

          {/* Enterprise Package */}
          <div className="bg-white p-8 rounded-xl shadow-[0_4px_20px_rgba(10,61,84,0.08)] border border-[#E2E8F0] flex flex-col">
            <h3 className="text-[24px] font-semibold text-[#002638] mb-2">Büyük Ölçek</h3>
            <div className="mb-4">
              <span className="text-[40px] font-bold text-[#002638]">Özel Teklif</span>
            </div>
            <div className="flex flex-col gap-1 mb-4 p-2 bg-[#f6f3f2] rounded">
              <span className="text-[12px] font-bold text-[#002638] mb-1">İsteğe Bağlı Ekle:</span>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input type="checkbox" checked disabled className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]" />
                Görüşme Kaydı (Dahil)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input type="checkbox" checked disabled className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]" />
                Genişletilmiş Bilgi Tabanı (Dahil)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enterpriseAddons.sms}
                  onChange={(e) => setEnterpriseAddons({ ...enterpriseAddons, sms: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]"
                />
                SMS Bildirimleri ($0.05/mesaj)
              </label>
              <label className="flex items-center gap-2 text-[12px] text-[#41484c] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enterpriseAddons.customVoice}
                  onChange={(e) => setEnterpriseAddons({ ...enterpriseAddons, customVoice: e.target.checked })}
                  className="w-4 h-4 rounded border-[#c1c7cd] text-[#002638] focus:ring-[#002638]"
                />
                Özel Ses (Marka Sesi) - Özel Teklif
              </label>
            </div>
            <ul className="flex flex-col gap-2 mb-6 flex-grow">
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> Sınırsız Kapasite
              </li>
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> Özel İşlemci Gücü
              </li>
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> Kurumsal SLA
              </li>
              <li className="flex items-center gap-2 text-[16px] text-[#41484c]">
                <CheckCircle size={18} className="text-[#002638]" /> 7/24 Özel Temsilci
              </li>
            </ul>
            <button
              onClick={handleContactForm}
              className="w-full py-3 px-6 rounded border-2 border-[#002638] text-[#002638] font-bold hover:bg-[#002638] hover:text-white transition-colors"
            >
              Bizimle İletişime Geçin
            </button>
          </div>
        </div>

        <div className="text-center mt-4 flex flex-col items-center gap-1">
          <p className="text-[12px] text-[#72787d] flex items-center justify-center gap-1.5 flex-wrap">
            <span>Tüm fiyatlar USD bazındadır. Otomatik saatlik kur</span>
            <span className="font-semibold text-[#002638] bg-[#cde6f4]/60 px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1">
              {isLoadingRate && <RefreshCw size={10} className="animate-spin" />}
              1 USD = {exchangeRate} TL
            </span>
            <span>ile sepete yansıtılır.</span>
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 mt-8 p-4 bg-[#f6f3f2] rounded-lg">
          <div className="flex items-center gap-2 text-[#41484c] text-[14px]">
            <span>🎙️</span> Görüşme Kaydı
          </div>
          <div className="flex items-center gap-2 text-[#41484c] text-[14px]">
            <span>📚</span> Genişletilmiş Bilgi Tabanı
          </div>
          <div className="flex items-center gap-2 text-[#41484c] text-[14px]">
            <span>💬</span> SMS Bildirimleri
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 flex flex-col items-center justify-center text-center bg-[#ebe7e7] rounded-2xl p-8 mb-20 shadow-[0_4px_20px_rgba(10,61,84,0.08)]">
        <h2 className="text-[40px] md:text-[56px] font-bold leading-[48px] md:leading-[64px] text-[#002638] mb-4">
          Geleceğe Adım Atın
        </h2>
        <p className="text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-[#41484c] mb-8 max-w-2xl">
          İşletmenizin iletişim altyapısını güçlendirmek ve müşteri deneyimini bir üst seviyeye taşımak için bugün uzmanlarımızla görüşün.
        </p>
        <button
          onClick={handleContactForm}
          className="bg-[#00b2c9] text-white text-[16px] font-medium rounded px-8 py-4 hover:bg-[#003f48] transition-colors shadow-sm font-bold flex items-center gap-2"
        >
          Hemen Tanışın
          <Headphones size={20} />
        </button>
      </section>
    </main>
  );
}
