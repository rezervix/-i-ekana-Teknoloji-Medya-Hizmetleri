'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Headphones,
  RefreshCw,
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { toast } from 'sonner';

type BillingPeriod = 'monthly' | 'yearly';

interface AddonState {
  recording: boolean;
  knowledgeBase: boolean;
  sms: boolean;
  customVoice: boolean;
}

export default function MicrosoftCallCenterAIContent() {
  const { addItem } = useCartStore();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [activeTab, setActiveTab] = useState<'arama' | 'yapay' | 'ozel'>('arama');
  const [exchangeRate, setExchangeRate] = useState<number>(35.0);
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(true);

  // Otomatik güncellenen canlı döviz kurunu /api/exchange-rate servisinden çek
  useEffect(() => {
    async function fetchRate() {
      try {
        setIsLoadingRate(true);
        const res = await fetch('/api/exchange-rate');
        if (res.ok) {
          const data = await res.json();
          if (data.rate && typeof data.rate === 'number') {
            setExchangeRate(data.rate);
          }
        }
      } catch (err) {
        console.error('Döviz kuru yüklenirken hata oluştu:', err);
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

  const calculateUSDPrice = (
    baseMonthly: number,
    baseYearlyMonthly: number,
    addons: AddonState
  ): number => {
    const isMonthly = billingPeriod === 'monthly';
    const baseUSD = isMonthly ? baseMonthly : baseYearlyMonthly * 12;

    let addonUSD = 0;
    if (addons.recording) addonUSD += isMonthly ? 9 : 9 * 12;
    if (addons.knowledgeBase) addonUSD += isMonthly ? 19 : 19 * 12;

    return baseUSD + addonUSD;
  };

  const calculatePriceStr = (
    baseMonthly: number,
    baseYearlyMonthly: number,
    addons: AddonState
  ): string => {
    const totalUSD = calculateUSDPrice(baseMonthly, baseYearlyMonthly, addons);
    return `$${totalUSD.toLocaleString('en-US')}`;
  };

  const handleAddToCart = (
    packageName: 'Başlangıç' | 'Orta Ölçek',
    productId: string,
    baseMonthlyUSD: number,
    baseYearlyMonthlyUSD: number,
    addons: AddonState
  ) => {
    const isMonthly = billingPeriod === 'monthly';
    const baseUSD = isMonthly ? baseMonthlyUSD : baseYearlyMonthlyUSD * 12;
    const baseTL = baseUSD * exchangeRate;

    const extraServices: { type: string; label: string; price: number }[] = [];

    if (addons.recording) {
      const serviceUSD = isMonthly ? 9 : 9 * 12;
      extraServices.push({
        type: 'recording',
        label: `Görüşme Kaydı (${isMonthly ? '+$9/ay' : '+$108/yıl'})`,
        price: serviceUSD * exchangeRate,
      });
    }

    if (addons.knowledgeBase) {
      const serviceUSD = isMonthly ? 19 : 19 * 12;
      extraServices.push({
        type: 'knowledgeBase',
        label: `Genişletilmiş Bilgi Tabanı (${isMonthly ? '+$19/ay' : '+$228/yıl'})`,
        price: serviceUSD * exchangeRate,
      });
    }

    if (addons.sms) {
      extraServices.push({
        type: 'sms',
        label: 'SMS Bildirimleri ($0.05/mesaj - Kullanım Bazlı)',
        price: 0,
      });
    }

    const totalUSD = calculateUSDPrice(baseMonthlyUSD, baseYearlyMonthlyUSD, addons);

    addItem({
      productId,
      name: `Microsoft Call Center AI - ${packageName} Paket`,
      price: baseTL,
      quantity: 1,
      image:
        'https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc',
      category: 'Yapay Zeka & Otomasyon',
      extraServices,
      customizationData: {
        'Faturalama Periyodu': isMonthly ? 'Aylık' : 'Yıllık (%15 İndirimli)',
        'Paket Tutarı (USD)': `$${baseUSD}`,
        'Toplam Tutar (USD)': `$${totalUSD}`,
        'Güncel Döviz Kuru': `1 USD = ${exchangeRate} TL`,
      },
    });

    toast.success(`Microsoft Call Center AI (${packageName} Paket) sepete eklendi!`);
  };

  const handleScrollToPricing = () => {
    document.getElementById('paketler')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleContactForm = () => {
    window.location.href = '/contact';
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-28 pb-20 sm:px-6 sm:pt-32 md:pb-24 lg:px-8 text-corp-charcoal">
      {/* Üst Geri Dönüş Linki */}
      <div className="mb-6">
        <Link
          href="/services/ai-automation"
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-corp-teal hover:text-corp-coral transition-colors"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Tüm AI Otomasyon Hizmetleri
        </Link>
      </div>

      {/* Hero Section */}
      <section className="mb-16 sm:mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-corp-border bg-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-corp-teal shadow-xs w-fit">
            <Sparkles size={14} className="text-corp-coral" aria-hidden="true" />
            <span>Microsoft Azure Destekli Sesli Yapay Zekâ</span>
          </div>

          <h1 className="font-display text-3xl font-extrabold tracking-tight text-corp-teal sm:text-4xl md:text-5xl lg:text-6xl leading-[1.15]">
            Hiç Kaçırmayan, Hiç Yorulmayan Dijital Çağrı Asistanınız
          </h1>

          <p className="text-base leading-relaxed text-corp-gray sm:text-lg">
            Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, 50+ dili anlayan ve insan
            doğallığında akıcı konuşan kurumsal sesli yapay zekâ çağrı merkezi çözümü.
          </p>

          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/70 bg-white p-3.5 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal font-bold">
                📅
              </div>
              <span className="text-sm sm:text-base text-corp-charcoal">
                Mesai dışı kaçan çağrılar →{' '}
                <strong className="font-bold text-corp-teal">7/24 Kesintisiz Yanıt</strong>
              </span>
            </div>
            <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/70 bg-white p-3.5 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal font-bold">
                ⚡
              </div>
              <span className="text-sm sm:text-base text-corp-charcoal">
                Uzun bekleme süreleri →{' '}
                <strong className="font-bold text-corp-teal">Anında ve Gecikmesiz Cevap</strong>
              </span>
            </div>
            <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/70 bg-white p-3.5 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal font-bold">
                🌐
              </div>
              <span className="text-sm sm:text-base text-corp-charcoal">
                Tek dilde sınırlı destek →{' '}
                <strong className="font-bold text-corp-teal">Onlarca Dilde Doğal İletişim</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleScrollToPricing}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-corp-coral px-6 text-base font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-[0.98]"
            >
              <span>Paketleri & Dövizli Fiyatları Gör</span>
              <ArrowRight size={18} />
            </button>
            <a
              href="https://wa.me/905303412156?text=Merhaba,%20Microsoft%20Call%20Center%20AI%20hakkında%20canlı%20sesli%20demo%20almak%20istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 text-base font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
            >
              <MessageCircle size={18} />
              <span>Canlı Sesli Demo İste</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-5 relative h-[360px] sm:h-[460px] lg:h-[540px] rounded-3xl overflow-hidden border border-corp-border shadow-luxury">
          <div
            className="bg-cover bg-center w-full h-full absolute inset-0 transition-transform duration-700 hover:scale-105"
            style={{
              backgroundImage:
                "url('https://lh3.googleusercontent.com/aida/AP1WRLtwjo07E7CzloG9pCW_xpOKwn94Yi-YcPPYN_dnXT28elr3fvHToI92GFUuJ9O_8CZD9w1XBnwGrJKNnrSFavOWvSgf8bccEcdGGyOvXe5LHJU1NOpiU_WChHugcHrtMsslIu3U30PKWBfERb3kcEDtFuf_x7JWKgSJiBheEt6hNcSXMwgxub0jTZbMK8yjiTwo8geMfPYp1LsrQbM2xk5P3jXmUalgOighJbk69vpzEUkGDtqQCpVB8Xc')",
            }}
            aria-label="Microsoft Call Center AI Arayüzü"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-corp-teal/60 via-transparent to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <span className="inline-block rounded-full bg-corp-coral px-3 py-0.5 text-xs font-bold uppercase tracking-wide">
              Gerçek Zamanlı AI
            </span>
            <p className="mt-1 text-sm font-semibold">Gecikmesiz sesli diyalog ve Türkçe NLP</p>
          </div>
        </div>
      </section>

      {/* Nasıl Çalışır & Detaylı Özellikler */}
      <section className="mb-16 sm:mb-24">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">
            Akıllı Altyapı
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-4xl">
            Sistem Nasıl İşler?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
            Müşterileriniz aradığında insan doğallığında karşılayan 3 adımlı sesli zekâ.
          </p>
        </div>

        {/* 3 Adımlı Akış Şeridi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
          <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/80 bg-white p-4 shadow-xs">
            <span className="text-3xl">📞</span>
            <div>
              <div className="text-xs font-bold uppercase text-corp-coral">Adım 1</div>
              <div className="text-sm font-bold text-corp-teal">Telefon Anında Çalar</div>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/80 bg-white p-4 shadow-xs">
            <span className="text-3xl">🧠</span>
            <div>
              <div className="text-xs font-bold uppercase text-corp-coral">Adım 2</div>
              <div className="text-sm font-bold text-corp-teal">Yapay Zekâ Anlar & Yanıtlar</div>
            </div>
          </div>
          <div className="flex items-center gap-3.5 rounded-2xl border border-corp-border/80 bg-white p-4 shadow-xs">
            <span className="text-3xl">✅</span>
            <div>
              <div className="text-xs font-bold uppercase text-corp-coral">Adım 3</div>
              <div className="text-sm font-bold text-corp-teal">Sorun Çözülür & SMS Gider</div>
            </div>
          </div>
        </div>

        {/* Sekmeler */}
        <div className="flex justify-center gap-2 sm:gap-6 border-b border-corp-border mb-8 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('arama')}
            className={`pb-3 text-sm sm:text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'arama'
                ? 'border-b-2 border-corp-teal text-corp-teal'
                : 'text-corp-gray hover:text-corp-teal'
            }`}
          >
            <span>📞</span> Arama & İletişim
          </button>
          <button
            onClick={() => setActiveTab('yapay')}
            className={`pb-3 text-sm sm:text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'yapay'
                ? 'border-b-2 border-corp-teal text-corp-teal'
                : 'text-corp-gray hover:text-corp-teal'
            }`}
          >
            <span>🧠</span> Yapay Zekâ Modelleri
          </button>
          <button
            onClick={() => setActiveTab('ozel')}
            className={`pb-3 text-sm sm:text-base font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ozel'
                ? 'border-b-2 border-corp-teal text-corp-teal'
                : 'text-corp-gray hover:text-corp-teal'
            }`}
          >
            <span>⚙️</span> Özelleştirme & CRM
          </button>
        </div>

        {/* Tab İçerikleri */}
        {activeTab === 'arama' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">📞</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Gelen ve Giden Aramalar</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Hem müşterilerden gelen çağrıları karşılar hem de randevu hatırlatma veya sipariş
                onayı için dış aramalar yapabilir.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">📡</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Gerçek Zamanlı Akış</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Azure Voice altyapısıyla milisaniyeler düzeyinde gecikmesiz ve kesintisiz insan
                doğallığında konuşma.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">💬</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">SMS Desteği & Bildirim</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Görüşme sırasında veya hemen ardından müşteri telefonuna otomatik takip linki ve
                onay mesajı gönderir.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'yapay' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">🤖</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">GPT-4o Tabanlı Zekâ</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Şirketinizin bilgi tabanıyla eğitilmiş, karmaşık müşteri sorularını anlayan ve doğru
                yönlendiren gelişmiş LLM motoru.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">🌍</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Çok Dilli İletişim</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Türkçe, İngilizce, Almanca, Arapça ve 50+ dilde arayanın dilini anında algılayıp
                aynı dilde yanıt verme yeteneği.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">📊</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Duygu & Niyet Analizi</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Müşterinin ses tonundan ve kelimelerinden memnuniyet veya aciliyet durumunu tespit
                edip önceliklendirme yapar.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ozel' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">🎙️</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Özel Marka Sesi</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                İşletmenizin kurumsal kimliğine uygun kadın veya erkek ses tonu, hız ve tonlama
                özelleştirmesi.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">🔗</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">CRM & Webhook Bağlantısı</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Arama sonuçlarını, müşteri bilgilerini ve görüşme özetlerini mevcut CRM veya veri
                tabanınıza anında yazar.
              </p>
            </div>
            <div className="rounded-3xl border border-corp-border/80 bg-white p-6 shadow-xs">
              <span className="text-3xl mb-2 block">🛡️</span>
              <h3 className="text-lg font-bold text-corp-teal mb-1">Kurumsal Güvenlik & SLA</h3>
              <p className="text-sm text-corp-gray leading-relaxed">
                Microsoft Azure güvenli bulut altyapısı, %99.9 kesintisiz çalışma garantisi ve uçtan
                uca şifreleme.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* FİYATLANDIRMA & PAKETLER BÖLÜMÜ */}
      <section id="paketler" className="mb-16 sm:mb-24 scroll-mt-28">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-corp-coral">
            Şeffaf Fiyatlandırma
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-corp-teal sm:text-4xl">
            Microsoft Call Center AI Paketleri
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-corp-gray sm:text-base">
            Canlı döviz kuru ile hesaplanan, gizli ücret barındırmayan modüler paketler.
          </p>

          {/* Aylık / Yıllık Seçici */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-corp-border bg-white p-1.5 shadow-xs">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition ${
                billingPeriod === 'monthly'
                  ? 'bg-corp-teal text-white shadow-xs'
                  : 'text-corp-gray hover:text-corp-teal'
              }`}
            >
              Aylık Faturalama
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`rounded-full px-5 py-2 text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${
                billingPeriod === 'yearly'
                  ? 'bg-corp-teal text-white shadow-xs'
                  : 'text-corp-gray hover:text-corp-teal'
              }`}
            >
              <span>Yıllık Faturalama</span>
              <span className="rounded-full bg-corp-coral px-2 py-0.5 text-[10px] text-white font-extrabold">
                %15 Tasarruf
              </span>
            </button>
          </div>
        </div>

        {/* 3 Sütunlu Paket Kartları */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
          {/* 1. Başlangıç Paketi */}
          <div className="rounded-3xl border border-corp-border/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:border-corp-teal/40 transition">
            <div>
              <h3 className="font-display text-2xl font-bold text-corp-teal">Başlangıç Paketi</h3>
              <p className="text-xs text-corp-gray mt-1">Küçük ve orta ölçekli işletmeler için</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl sm:text-5xl font-extrabold text-corp-teal">
                  {calculatePriceStr(149, 126, starterAddons)}
                </span>
                <span className="text-sm font-semibold text-corp-gray">
                  /{billingPeriod === 'monthly' ? 'ay' : 'yıl'}
                </span>
              </div>
              <div className="text-xs text-corp-gray mt-1">
                ≈{' '}
                {Math.round(
                  calculateUSDPrice(149, 126, starterAddons) * exchangeRate
                ).toLocaleString('tr-TR')}{' '}
                TL (Kura Göre)
              </div>

              {/* Addon Seçiciler */}
              <div className="mt-6 rounded-2xl bg-bg-soft p-4 border border-corp-border/60 space-y-2">
                <span className="block text-xs font-bold text-corp-teal uppercase tracking-wider mb-1">
                  İsteğe Bağlı Eklentiler:
                </span>
                <label className="flex items-center gap-2 text-xs text-corp-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={starterAddons.recording}
                    onChange={(e) =>
                      setStarterAddons({ ...starterAddons, recording: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal"
                  />
                  <span>Görüşme Kaydı (+$9/ay)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-corp-charcoal cursor-pointer">
                  <input
                    type="checkbox"
                    checked={starterAddons.knowledgeBase}
                    onChange={(e) =>
                      setStarterAddons({ ...starterAddons, knowledgeBase: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal"
                  />
                  <span>Genişletilmiş Bilgi Tabanı (+$19/ay)</span>
                </label>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-corp-charcoal">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>300 Dakika Görüşme / Ay</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>1 Eşzamanlı Çağrı Karşılama</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>Standart Destek</span>
                </li>
                <li className="text-xs text-corp-gray pt-1">Kota üstü dakika: $0.10/dk</li>
              </ul>
            </div>

            <button
              onClick={() =>
                handleAddToCart(
                  'Başlangıç',
                  'microsoft-call-center-ai-starter',
                  149,
                  126,
                  starterAddons
                )
              }
              className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-corp-teal px-4 text-sm font-bold text-white shadow-sm transition hover:bg-corp-teal/90 active:scale-[0.98]"
            >
              <span>Başlangıç Paketini Sepete Ekle</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* 2. Orta Ölçek Paketi (Önerilen) */}
          <div className="rounded-3xl border-2 border-corp-coral bg-corp-teal p-6 sm:p-8 shadow-card-hover flex flex-col justify-between text-white relative lg:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-corp-coral px-4 py-1 text-xs font-extrabold uppercase tracking-wide text-white shadow-xs">
              En Çok Tercih Edilen
            </div>

            <div>
              <h3 className="font-display text-2xl font-bold text-white">Orta Ölçek Paketi</h3>
              <p className="text-xs text-white/80 mt-1">Yoğun çağrı alan işletmeler için ideal</p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl sm:text-5xl font-extrabold text-white">
                  {calculatePriceStr(312, 265, mediumAddons)}
                </span>
                <span className="text-sm font-semibold text-white/80">
                  /{billingPeriod === 'monthly' ? 'ay' : 'yıl'}
                </span>
              </div>
              <div className="text-xs text-white/80 mt-1">
                ≈{' '}
                {Math.round(
                  calculateUSDPrice(312, 265, mediumAddons) * exchangeRate
                ).toLocaleString('tr-TR')}{' '}
                TL (Kura Göre)
              </div>

              {/* Addon Seçiciler */}
              <div className="mt-6 rounded-2xl bg-white/10 p-4 border border-white/20 space-y-2 text-white">
                <span className="block text-xs font-bold uppercase tracking-wider mb-1 text-corp-coral-light">
                  İsteğe Bağlı Eklentiler:
                </span>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediumAddons.recording}
                    onChange={(e) =>
                      setMediumAddons({ ...mediumAddons, recording: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-white/40 text-corp-coral focus:ring-corp-coral"
                  />
                  <span>Görüşme Kaydı (+$9/ay)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediumAddons.knowledgeBase}
                    onChange={(e) =>
                      setMediumAddons({ ...mediumAddons, knowledgeBase: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-white/40 text-corp-coral focus:ring-corp-coral"
                  />
                  <span>Genişletilmiş Bilgi Tabanı (+$19/ay)</span>
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mediumAddons.sms}
                    onChange={(e) => setMediumAddons({ ...mediumAddons, sms: e.target.checked })}
                    className="h-4 w-4 rounded border-white/40 text-corp-coral focus:ring-corp-coral"
                  />
                  <span>SMS Bildirimleri ($0.05/mesaj)</span>
                </label>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-white">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-corp-coral-light shrink-0" />
                  <span>1.000 Dakika Görüşme / Ay</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-corp-coral-light shrink-0" />
                  <span>3 Eşzamanlı Çağrı Karşılama</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-corp-coral-light shrink-0" />
                  <span>Öncelikli Teknik Destek</span>
                </li>
                <li className="text-xs text-white/70 pt-1">Kota üstü dakika: $0.08/dk</li>
              </ul>
            </div>

            <button
              onClick={() =>
                handleAddToCart(
                  'Orta Ölçek',
                  'microsoft-call-center-ai-medium',
                  312,
                  265,
                  mediumAddons
                )
              }
              className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-corp-coral px-4 text-sm font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-[0.98]"
            >
              <span>Orta Ölçek Paketini Sepete Ekle</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* 3. Büyük Ölçek / Kurumsal Teklif */}
          <div className="rounded-3xl border border-corp-border/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between hover:border-corp-teal/40 transition">
            <div>
              <h3 className="font-display text-2xl font-bold text-corp-teal">Büyük Ölçek</h3>
              <p className="text-xs text-corp-gray mt-1">
                Özel SLA ve yüksek hacimli kurumlar için
              </p>

              <div className="mt-5">
                <span className="font-display text-3xl sm:text-4xl font-extrabold text-corp-teal">
                  Özel Teklif
                </span>
                <span className="block text-xs text-corp-gray mt-1">
                  İhtiyacınıza göre ölçeklenir
                </span>
              </div>

              <div className="mt-6 rounded-2xl bg-bg-soft p-4 border border-corp-border/60 space-y-2">
                <span className="block text-xs font-bold text-corp-teal uppercase tracking-wider mb-1">
                  Kapsam:
                </span>
                <div className="text-xs text-corp-charcoal flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span>Görüşme Kaydı (Dahil)</span>
                </div>
                <div className="text-xs text-corp-charcoal flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span>Genişletilmiş Bilgi Tabanı (Dahil)</span>
                </div>
                <div className="text-xs text-corp-charcoal flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span>Özel Marka Sesi Modelleme</span>
                </div>
              </div>

              <ul className="mt-6 space-y-2.5 text-sm text-corp-charcoal">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>Sınırsız Çağrı & Eşzamanlı Hat</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>Özel İşlemci & Azure Dedicated GPU</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>%99.9 Kurumsal SLA Garantisi</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <span>7/24 Dedike Müşteri Yöneticisi</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleContactForm}
              className="mt-8 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-corp-teal bg-white px-4 text-sm font-bold text-corp-teal shadow-xs transition hover:bg-corp-teal-50 active:scale-[0.98]"
            >
              <span>Kurumsal Teklif İsteyin</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Kur Bilgilendirmesi */}
        <div className="mt-6 text-center text-xs text-corp-gray flex items-center justify-center gap-2">
          <span>Tüm paketler USD bazında hesaplanır;</span>
          <span className="font-bold text-corp-teal bg-corp-teal-50 border border-corp-border px-2 py-0.5 rounded-md inline-flex items-center gap-1">
            {isLoadingRate && <RefreshCw size={10} className="animate-spin" />}1 USD ={' '}
            {exchangeRate} TL
          </span>
          <span>kuru ile sepete ve faturaya aktarılır.</span>
        </div>
      </section>

      {/* Alt Çağrı Bandı */}
      <section
        aria-label="Kurumsal Sesli AI Başlangıç"
        className="rounded-3xl bg-gradient-corp px-6 py-10 text-white shadow-luxury sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14"
      >
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
            Sesli Yapay Zekâya Geçiş
          </span>
          <h2 className="mt-3 font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
            Telefon Çağrılarınızı Geleceğin Teknolojisine Emanet Edin
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-white/80">
            Uzmanlarımız mevcut santral ve PBX altyapınızı inceleyerek 48 saat içinde özel bir sesli
            demo numarası hazırlasın.
          </p>
        </div>
        <div className="mt-6 lg:mt-0 flex shrink-0 flex-col sm:flex-row gap-3">
          <button
            onClick={handleContactForm}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-corp-coral px-6 text-sm font-bold text-white shadow-sm transition hover:bg-corp-coral/90 active:scale-[0.98]"
          >
            <span>Hemen Tanışın</span>
            <Headphones size={18} />
          </button>
          <a
            href="https://wa.me/905303412156?text=Merhaba,%20Microsoft%20Call%20Center%20AI%20hakkında%20detaylı%20bilgi%20ve%20kurulum%20danışmanlığı%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-bold text-white transition hover:bg-white/20 active:scale-[0.98]"
          >
            <MessageCircle size={18} />
            <span>WhatsApp ile Danışın</span>
          </a>
        </div>
      </section>
    </div>
  );
}
