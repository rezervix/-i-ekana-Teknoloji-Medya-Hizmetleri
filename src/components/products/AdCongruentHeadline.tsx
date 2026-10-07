"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ShieldCheck, Zap, Tag } from "lucide-react";

interface AdMessage {
  badge: string;
  headline: string;
  subtext: string;
  gradient: string;
}

export default function AdCongruentHeadline({ productName }: { productName?: string }) {
  const [adMessage, setAdMessage] = useState<AdMessage | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const params = new URLSearchParams(window.location.search);
      const source = (params.get("utm_source") || sessionStorage.getItem("cicekana_utm_source") || "").toLowerCase();
      const campaign = params.get("utm_campaign") || sessionStorage.getItem("cicekana_utm_campaign") || "";
      const term = params.get("utm_term") || "";
      const hasGclid = Boolean(params.get("gclid"));

      // UTM veya reklam tespit edilmediyse gösterme
      if (!source && !campaign && !term && !hasGclid) {
        return;
      }

      // 1. Arama Terimi veya Özel Kampanya
      if (term || campaign) {
        const cleanName = decodeURIComponent(term || campaign).replace(/[-_]/g, " ");
        setAdMessage({
          badge: "Arama Sonucu Özel Teklifi",
          headline: `🎯 "${cleanName}" İçin En Yüksek Baskı Kalitesi & Doğrudan Üretici Fiyatı`,
          subtext: `${productName || "Bu ürün"}, aradığınız kurumsal standartlarda aynı gün üretime alınmaktadır.`,
          gradient: "from-amber-500/15 via-corp-teal/10 to-transparent border-amber-300",
        });
        return;
      }

      // 2. Google Ads
      if (source.includes("google") || hasGclid) {
        setAdMessage({
          badge: "Google Ads Ziyaretçi Ayrıcalığı",
          headline: "🎯 Google Özel Fırsatı: Bugün Sipariş Verin, Aynı Gün Baskı & Ücretsiz Kargo Avantajından Yararlanın!",
          subtext: "Doğrudan üretim merkezimizden aracısız kurumsal fiyat garantisi.",
          gradient: "from-corp-teal/15 via-blue-500/10 to-transparent border-corp-teal/40",
        });
        return;
      }

      // 3. Instagram / Facebook / Meta
      if (source.includes("instagram") || source.includes("facebook") || source.includes("meta")) {
        setAdMessage({
          badge: "Sosyal Medya Kampanyası",
          headline: "✨ Sosyal Medyaya Özel: Ücretsiz Tasarım İncelemesi & Hızlı Kargo Fırsatı!",
          subtext: "Gördüğünüz tasarım kalitesi, yüksek gramajlı materyal ve canlı renk garantisiyle kapınızda.",
          gradient: "from-purple-500/15 via-pink-500/10 to-transparent border-purple-300",
        });
        return;
      }

      // 4. LinkedIn / B2B
      if (source.includes("linkedin") || source.includes("b2b")) {
        setAdMessage({
          badge: "Kurumsal B2B Avantajı",
          headline: "💼 Kurumsal İş Ortaklığı: Kurumsal Fatura, Toplu İndirim ve Numune Desteği",
          subtext: "Şirketinizin marka standartlarına %100 uyumlu profesyonel medya & baskı çözümleri.",
          gradient: "from-blue-600/15 via-corp-teal/10 to-transparent border-blue-400",
        });
        return;
      }

      // Genel UTM varsa
      setAdMessage({
        badge: "Özel Kampanya",
        headline: "⚡ Kampanya Fırsatı: Sepetinizi Hemen Tamamlayın, Doğrudan Üretici İndiriminden Faydalanın!",
        subtext: "Hızlı üretim, kurumsal kalite ve güvenli ödeme garantisi.",
        gradient: "from-corp-teal/15 via-amber-500/10 to-transparent border-corp-teal/40",
      });
    } catch (err) {
      console.warn("[AdCongruentHeadline] UTM read error:", err);
    }
  }, [productName]);

  if (!adMessage) {
    return null;
  }

  return (
    <div className={`mb-6 p-4 sm:p-5 rounded-2xl border bg-gradient-to-r ${adMessage.gradient} shadow-sm animate-in fade-in duration-300`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/90 text-corp-charcoal border border-corp-border/60 shadow-xs">
          <Zap size={12} className="text-amber-500 fill-amber-500" />
          {adMessage.badge}
        </span>
        <span className="text-[11px] font-medium text-corp-gray flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-600" /> En İyi Fiyat Garantisi
        </span>
      </div>
      <h3 className="font-display font-bold text-sm sm:text-base text-corp-charcoal leading-snug">
        {adMessage.headline}
      </h3>
      <p className="font-body text-xs text-corp-gray-dark mt-1 leading-relaxed">
        {adMessage.subtext}
      </p>
    </div>
  );
}
