'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Sparkles,
  ChevronRight,
  Send,
  HelpCircle,
  Layers,
  PhoneCall,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { trackFunnelEvent } from '@/lib/analytics';

export interface AISalesAssistantWidgetProps {
  planName: string;
  planSlug: string;
  whatsappUrl?: string;
  whatsappNumber?: string | null;
  whatsappTemplate?: string | null;
  startingPriceFormatted?: string;
  scrollTriggerDepth?: number; // Varsayılan: 0.30 (%30 scroll derinliği)
  timeTriggerSeconds?: number; // Varsayılan: 15 (15 saniye sayfada kalma)
}

interface QuickFaqItem {
  question: string;
  answer: string;
}

export default function AISalesAssistantWidget({
  planName,
  planSlug,
  whatsappUrl,
  whatsappNumber = '905303412156',
  whatsappTemplate,
  startingPriceFormatted,
  scrollTriggerDepth = 0.3,
  timeTriggerSeconds = 15,
}: AISalesAssistantWidgetProps) {
  const [isProactiveVisible, setIsProactiveVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const triggerFiredRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Telefon & WhatsApp URL hazırlığı
  const cleanPhone = (whatsappNumber || '905303412156').replace(/[^0-9]/g, '');
  const baseWaUrl =
    whatsappUrl ||
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      whatsappTemplate ||
        `Merhaba, ${planName} hakkında canlı demo ve paket detayları almak istiyorum.`
    )}`;

  // Ürüne özel proaktif mesajlar ve hızlı soru-cevap verisi
  const getProductContext = useCallback(() => {
    switch (planSlug) {
      case 'midvem-musteri-destek-ve-iletisim-sistemi':
        return {
          proactiveMessage:
            '👋 Midvem’in WhatsApp ve Instagram yapay zekâ botunu kendi işletmenizde test etmek ister misiniz?',
          tagline: '7/24 Çok Kanallı Müşteri Desteği & Yapay Zekâ Botu',
          faqs: [
            {
              question: 'Mevcut WhatsApp hattımı değiştirmem gerekir mi?',
              answer:
                'Hayır, mevcut telefon numaranızı koruyarak resmi Meta Cloud API üzerinden 24 saat içinde geçiş yapılır.',
            },
            {
              question: 'Yapay zekâ bilmediği sorularda ne yapar?',
              answer:
                'Sistem tanımlı güven eşiğinin altına indiğinde görüşmeyi otomatik olarak insan temsilcinize devredebilir.',
            },
            {
              question: 'Instagram DM ve web sohbeti de dahil mi?',
              answer:
                'Evet, tek panelden WhatsApp, Instagram DM, Canlı Destek Widget’ı ve e-postaları ortak yönetebilirsiniz.',
            },
          ],
        };
      case 'faktura':
        return {
          proactiveMessage:
            '👋 E-Fatura & muhasebe entegrasyonu hakkında aklınıza takılan soruları 2 dakikada yanıtlayalım!',
          tagline: 'GİB Onaylı Otomatik E-Fatura & E-Arşiv Motoru',
          faqs: [
            {
              question: 'Mevcut muhasebe programıma entegre olur mu?',
              answer:
                'Evet, Paraşüt, Logo, Mikro, BizimHesap gibi popüler ERP ve muhasebe yazılımlarıyla API üzerinden tam entegre çalışır.',
            },
            {
              question: 'GİB e-Arşiv ve e-İrsaliye uyumlu mu?',
              answer:
                'Gelir İdaresi Başkanlığı (GİB) güncel standartları ve yasal saklama süreleriyle %100 uyumludur.',
            },
            {
              question: 'Sipariş anında otomatik fatura kesilir mi?',
              answer:
                'E-ticaret veya web siparişlerinizde onay alındığı saniyede e-fatura kesilip müşteriye otomatik SMS/e-posta iletilir.',
            },
          ],
        };
      case 'scoreform-musteri-deneyimi-itibar-yonetimi':
        return {
          proactiveMessage:
            '👋 Google Haritalar puanınızı ve müşteri memnuniyetinizi yapay zekâ ile katlamaya hazır mısınız?',
          tagline: 'Akıllı QR Anket & İtibar Yönetim Sistemi',
          faqs: [
            {
              question: 'Müşteriler anketlere nasıl katılıyor?',
              answer:
                'Masa üstü temassız QR stantları, sipariş sonrası WhatsApp teşekkür mesajı veya SMS bağlantısı ile 15 saniyede katılırlar.',
            },
            {
              question: 'Olumsuz yorumlar Google’a düşer mi?',
              answer:
                'Akıllı filtreleme sayesinde memnun müşteriler doğrudan Google Haritalar’a yönlendirilirken, olumsuz deneyimler doğrudan işletme yönetimine alarm olarak iletilir.',
            },
            {
              question: 'Çok şubeli işletmeler için uygun mu?',
              answer:
                'Evet, şube ve personel bazında detaylı puanlama, karşılaştırmalı performans raporları tek panelden izlenir.',
            },
          ],
        };
      case 'kuscu-finansal-analiz-piyasa-zekasi-platformu':
        return {
          proactiveMessage:
            '👋 BIST ve VİOP algoritmik piyasa tarama sisteminin canlı demosunu görmek ister misiniz?',
          tagline: 'Algoritmik Piyasa Zekâsı & Hacim Kırılım Alarmları',
          faqs: [
            {
              question: 'Sinyaller ne kadar gecikmeyle gelir?',
              answer:
                'BIST verileri doğrudan sunucu düzeyinde anlık taranır; belirlediğiniz kırılımlar milisaniyeler içinde WhatsApp ve Telegram alarmınıza düşer.',
            },
            {
              question: 'Kendi indikatörlerimi tanımlayabilir miyim?',
              answer:
                'Evet, özel hacim ağırlıklı hareketli ortalamalar, para girişi/çıkışı ve RSI modelleri panelden özelleştirilebilir.',
            },
            {
              question: 'Eğitim ve kullanım kılavuzu veriliyor mu?',
              answer:
                'Aboneliğinizle birlikte strateji dokümantasyonu, video kullanım kılavuzları ve 1-e-1 onboarding seansı dahildir.',
            },
          ],
        };
      case 'microsoft-call-center-ai':
        return {
          proactiveMessage:
            '👋 7/24 sesli yapay zekâ çağrı merkezi demomuzu canlı ortamda test etmek ister misiniz?',
          tagline: 'Microsoft Azure Neural Voice Destekli Sesli AI Asistan',
          faqs: [
            {
              question: 'Ses tonu robotik mi, doğal konuşuyor mu?',
              answer:
                'Microsoft Azure Neural Voice motoru sayesinde duraklamalar, tonlama ve akıcı Türkçe konuşma ile insan doğallığına en yakın deneyimi sunar.',
            },
            {
              question: 'Mevcut santral numaramızı koruyabilir miyiz?',
              answer:
                'Evet, 0850 veya coğrafi numaranızı değiştirmeden bulut ya da fiziksel santralinize doğrudan SIP trunk ile bağlanır.',
            },
            {
              question: 'Aramaları CRM sistemine işler mi?',
              answer:
                'Görüşme sonrasında ses kaydı, konuşma transkripti ve duygu durum analizi CRM veritabanınıza otomatik aktarılır.',
            },
          ],
        };
      default:
        return {
          proactiveMessage: `👋 ${planName} hakkında aklınıza takılan soruları yanıtlayalım veya canlı demo başlatalım!`,
          tagline: `${planName} Kurumsal Çözüm Danışmanı`,
          faqs: [
            {
              question: 'Canlı demo süreci nasıl ilerler?',
              answer:
                'Uzman ekibimiz 10 dakikalık hızlı bir seansla sistemin arayüzünü ve işletmenize özel faydalarını canlı gösterir.',
            },
            {
              question: 'Kurulum ve teknik destek kapsamı nedir?',
              answer:
                'Teknik ekibimiz anahtar teslim kurulum yapar. Abonelik süresince öncelikli SLA desteği dahildir.',
            },
            {
              question: 'Faturalandırma ve ödeme güvenliği nasıl sağlanır?',
              answer:
                'Tüm ödemeler PayTR 3D Secure altyapısıyla korunur, her ay kurumsal e-faturanız otomatik iletilir.',
            },
          ],
        };
    }
  }, [planName, planSlug]);

  const { proactiveMessage, tagline, faqs } = getProductContext();

  // Scroll derinliği ve zamanlayıcı ile nazik tetikleme
  useEffect(() => {
    // Daha önce bu oturumda kapatıldıysa proaktif balonu tekrar açma
    const dismissed = sessionStorage.getItem(`cicekana_ai_asst_dismissed_${planSlug}`);
    if (dismissed === 'true') {
      return;
    }

    const checkTrigger = () => {
      if (triggerFiredRef.current) return;

      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollRatio = docHeight > 0 ? scrollTop / docHeight : 0;

      if (scrollRatio >= scrollTriggerDepth) {
        triggerFiredRef.current = true;
        setIsProactiveVisible(true);
        trackFunnelEvent({
          event: 'ai_assistant_trigger',
          metadata: {
            reason: 'scroll_depth',
            ratio: scrollRatio.toFixed(2),
            planSlug,
            planName,
          },
        });
      }
    };

    // Zamanlayıcı emniyeti: Belirlenen saniye sonra kullanıcı hala sayfadaysa nazikçe hatırlat
    const timer = setTimeout(() => {
      if (!triggerFiredRef.current) {
        triggerFiredRef.current = true;
        setIsProactiveVisible(true);
        trackFunnelEvent({
          event: 'ai_assistant_trigger',
          metadata: {
            reason: 'time_on_page',
            seconds: timeTriggerSeconds,
            planSlug,
            planName,
          },
        });
      }
    }, timeTriggerSeconds * 1000);

    window.addEventListener('scroll', checkTrigger, { passive: true });
    // Sayfa zaten scroll edilmiş durumda açıldıysa kontrol et
    checkTrigger();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', checkTrigger);
    };
  }, [planSlug, planName, scrollTriggerDepth, timeTriggerSeconds]);

  // Escape tuşu ile pencereyi kapatma
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Proaktif balonu nazikçe kapat
  const handleDismissProactive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProactiveVisible(false);
    sessionStorage.setItem(`cicekana_ai_asst_dismissed_${planSlug}`, 'true');
    trackFunnelEvent({
      event: 'ai_assistant_dismiss',
      metadata: { planSlug, planName },
    });
  };

  // Asistan penceresini aç
  const handleOpenAssistant = (source: string) => {
    setIsProactiveVisible(false);
    setIsModalOpen(true);
    setHasInteracted(true);
    trackFunnelEvent({
      event: 'ai_assistant_open',
      metadata: { source, planSlug, planName },
    });
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  };

  // WhatsApp canlı demoya yönlendir
  const handleWhatsAppDemoClick = (source: string) => {
    trackFunnelEvent({
      event: 'ai_assistant_whatsapp_click',
      metadata: { source, planSlug, planName },
    });
    window.open(baseWaUrl, '_blank', 'noopener,noreferrer');
  };

  // Özel soruyu WhatsApp üzerinden gönder
  const handleSendCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    const query = userQuestion.trim();
    const formattedUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
      `Merhaba, ${planName} hakkında bir sorum var: "${query}"`
    )}`;

    trackFunnelEvent({
      event: 'ai_assistant_custom_question',
      metadata: { planSlug, planName, queryLength: query.length },
    });

    setUserQuestion('');
    window.open(formattedUrl, '_blank', 'noopener,noreferrer');
  };

  // Paketler bölümüne pürüzsüz kaydır
  const handleScrollToPackages = () => {
    setIsModalOpen(false);
    trackFunnelEvent({
      event: 'ai_assistant_scroll_pricing',
      metadata: { planSlug, planName },
    });
    const elem = document.getElementById('paketler');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* ─── SAĞ ALT SABİT ALAN: PROAKTİF BALON + TETİKLEYİCİ BUTON ─── */}
      {/* Not: Mobilde MobileStickyCtaBar ile çakışmaması için bottom-24, masaüstünde bottom-6 */}
      <div
        className="fixed z-50 bottom-24 lg:bottom-6 right-4 lg:right-6 flex flex-col items-end pointer-events-none"
        aria-label="Canlı AI Satış Asistanı"
      >
        {/* Proaktif Hatırlatma Baloncuğu */}
        {isProactiveVisible && !isModalOpen && (
          <aside
            role="dialog"
            aria-label="Yapay Zekâ Satış Asistanı Bildirimi"
            className="pointer-events-auto mb-3 max-w-xs sm:max-w-sm rounded-2xl border border-corp-teal/20 bg-white/95 p-3.5 shadow-luxury backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="relative flex h-7 w-7 items-center justify-center rounded-xl bg-corp-teal text-white shadow-xs">
                  <Sparkles size={14} className="text-corp-coral animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-corp-charcoal">Çiçekana AI Danışmanı</h4>
                  <p className="text-[10px] text-emerald-600 font-medium">
                    Çevrimiçi · Canlı Yanıt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismissProactive}
                aria-label="Bildirimi kapat"
                className="rounded-lg p-1 text-corp-gray hover:bg-slate-100 hover:text-corp-charcoal transition"
              >
                <X size={14} />
              </button>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-700 font-normal">
              {proactiveMessage}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleWhatsAppDemoClick('proactive_bubble_demo')}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:from-emerald-700 hover:to-teal-700 transition"
              >
                <MessageCircle size={13} />
                <span>Canlı Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenAssistant('proactive_bubble_open')}
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-corp-teal hover:text-corp-teal transition"
              >
                <span>Soru Sor</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </aside>
        )}

        {/* Ana Yüzen Buton (Floating Action Button) */}
        <button
          type="button"
          onClick={() => handleOpenAssistant('fab_button')}
          aria-expanded={isModalOpen}
          aria-label="Çiçekana Akıllı Satış ve Demo Asistanını Aç"
          className="pointer-events-auto group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-corp-teal to-corp-teal-dark p-3 lg:px-4 lg:py-3 text-white shadow-luxury hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-corp-teal/30"
        >
          {/* Çevrimiçi Nabız Göstergesi */}
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500"></span>
          </span>

          <div className="flex h-6 w-6 items-center justify-center">
            <Bot size={22} className="text-white group-hover:rotate-6 transition-transform" />
          </div>

          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-extrabold tracking-wide leading-none">
              AI Satış Asistanı
            </span>
            <span className="text-[10px] text-corp-coral-light font-medium leading-tight mt-0.5">
              Canlı Demo & Destek
            </span>
          </div>
        </button>
      </div>

      {/* ─── TAM ETKİLEŞİMLİ ASİSTAN MODAL / SHEET PANELİ ─── */}
      {isModalOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-corp-charcoal/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-assistant-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl border border-corp-border/80 bg-white shadow-2xl animate-in slide-in-from-bottom-6 duration-200 overflow-hidden"
          >
            {/* Modal Başlığı */}
            <header className="relative flex items-center justify-between border-b border-corp-border/60 bg-gradient-to-r from-corp-teal to-corp-teal-dark p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-white border border-white/20 shadow-xs">
                  <Bot size={22} className="text-corp-coral" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400"></span>
                  </span>
                </div>
                <div>
                  <h3 id="ai-assistant-modal-title" className="text-sm font-bold leading-tight">
                    Çiçekana Akıllı Satış Asistanı
                  </h3>
                  <p className="text-[11px] text-teal-100 flex items-center gap-1 mt-0.5">
                    <Sparkles size={11} className="text-corp-coral" />
                    <span>{planName} İçin 7/24 Aktif</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Pencereyi Kapat"
                className="rounded-xl p-1.5 text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </header>

            {/* Modal Gövdesi (Kaydırılabilir İçerik) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Karşılama Mesajı */}
              <div className="flex gap-2.5 items-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-corp-teal-50 text-corp-teal">
                  <Bot size={15} />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-slate-100/90 p-3 text-slate-700 leading-relaxed border border-slate-200/50">
                  <p>
                    Merhaba! 👋 Ben <strong>{planName}</strong> çözüm danışmanınız. İşletmeniz için
                    en uygun paketi seçmenize, canlı demo yapmanıza veya aklınızdaki soruları anında
                    yanıtlamaya hazırım.
                  </p>
                  {startingPriceFormatted && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-corp-teal shadow-2xs border border-slate-200">
                      <span>Başlangıç Fiyatı:</span>
                      <strong className="text-corp-charcoal">{startingPriceFormatted}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Hızlı Aksiyon Butonları */}
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-corp-gray">
                  Hızlı İşlemler
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* WhatsApp Canlı Demo */}
                  <button
                    type="button"
                    onClick={() => handleWhatsAppDemoClick('modal_quick_demo')}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 text-left transition hover:bg-emerald-100/70 hover:border-emerald-300"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
                        <MessageCircle size={16} />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-950 text-xs">
                          Canlı Demo Başlat (WhatsApp)
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          Uzmanımız 10 dk içinde sistemin çalışmasını göstersin
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-emerald-700 shrink-0" />
                  </button>

                  {/* Fiyat & Paketleri İncele */}
                  <button
                    type="button"
                    onClick={handleScrollToPackages}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:bg-white hover:border-corp-teal/40"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-corp-teal text-white shadow-2xs">
                        <Layers size={15} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">
                          Paket & Fiyatları Karşılaştır
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Aylık abonelik seçeneklerini ve dahil özellikleri görün
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Sıkça Sorulan Sorular Akordeonu */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-corp-gray">
                  <span>En Çok Merak Edilenler</span>
                  <HelpCircle size={12} />
                </div>

                <div className="space-y-1.5">
                  {faqs.map((faq, index) => {
                    const isOpen = expandedFaqIndex === index;
                    return (
                      <div
                        key={index}
                        className="rounded-2xl border border-slate-200 bg-white transition overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                          aria-expanded={isOpen}
                          className="flex w-full items-center justify-between p-3 text-left font-bold text-slate-800 hover:text-corp-teal"
                        >
                          <span className="text-xs">{faq.question}</span>
                          <ChevronRight
                            size={14}
                            className={`shrink-0 text-slate-400 transition-transform duration-200 ${
                              isOpen ? 'rotate-90 text-corp-teal' : ''
                            }`}
                          />
                        </button>
                        {isOpen && (
                          <div className="px-3 pb-3 pt-1 text-slate-600 text-[11px] leading-relaxed border-t border-slate-100 bg-slate-50/40">
                            {faq.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Güven Güvencesi Rozetleri */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[10px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                  <span>24 Saat İçinde Kurulum</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-corp-teal shrink-0" />
                  <span>PayTR 3D Güvenli Ödeme</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-amber-600 shrink-0" />
                  <span>7/24 Kesintisiz SLA Desteği</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-corp-coral shrink-0" />
                  <span>Taahhütsüz Aylık Abonelik</span>
                </div>
              </div>
            </div>

            {/* Modal Alt Kısmı: Özel Soru Sorma Formu */}
            <footer className="border-t border-corp-border/60 bg-slate-50/80 p-3">
              <form onSubmit={handleSendCustomQuestion} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="Aklınıza takılan soruyu yazın..."
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none focus:border-corp-teal transition shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={!userQuestion.trim()}
                  title="WhatsApp ile Uzmana Sor"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-corp-teal text-white shadow-2xs hover:bg-corp-teal-dark disabled:opacity-40 transition shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                Sorunuz WhatsApp üzerinden uzman danışmanımıza anında iletilir.
              </p>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
