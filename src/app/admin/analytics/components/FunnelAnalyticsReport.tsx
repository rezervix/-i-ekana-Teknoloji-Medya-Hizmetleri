"use client";

import React, { useState, useEffect } from "react";
import { 
  Filter, Smartphone, Monitor, Tablet, ShoppingCart, 
  ArrowRight, CheckCircle2, TrendingUp, AlertTriangle, 
  Split, Database, Copy, Check, RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface FunnelStep {
  step: string;
  key: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface DeviceStat {
  device: string;
  sessions: number;
  cartSessions: number;
  purchaseSessions: number;
  totalValue: number;
  conversionRate: number;
}

interface ABStat {
  variant: string;
  label: string;
  sessions: number;
  views: number;
  cartAdds: number;
  purchases: number;
  revenue: number;
  cartConversionRate: number;
  purchaseConversionRate: number;
}

interface FunnelData {
  summary: {
    totalSessions: number;
    overallConversionRate: number;
  };
  funnel: FunnelStep[];
  cartAbandonment: {
    totalCartSessions: number;
    purchasedSessions: number;
    abandonedCartSessions: number;
    ratePercent: number;
  };
  deviceBreakdown: DeviceStat[];
  abTesting: ABStat[];
  timestamp: string;
}

export default function FunnelAnalyticsReport() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/funnel");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Funnel verisi çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedQuery(id);
    toast.success("SQL sorgusu panoya kopyalandı!");
    setTimeout(() => setCopiedQuery(null), 2500);
  };

  const abandonmentSqlQuery = `-- Sepeti Terk Oranını Hesaplayan SQL Sorgusu
WITH cart_sessions AS (
  SELECT DISTINCT session_id
  FROM funnel_events
  WHERE event IN ('add_to_cart', 'view_cart')
),
purchased_sessions AS (
  SELECT DISTINCT session_id
  FROM funnel_events
  WHERE event = 'purchase'
)
SELECT 
  COUNT(c.session_id) AS total_cart_sessions,
  COUNT(p.session_id) AS purchased_sessions,
  COUNT(c.session_id) - COUNT(p.session_id) AS abandoned_cart_sessions,
  ROUND(
    ((COUNT(c.session_id) - COUNT(p.session_id))::decimal / NULLIF(COUNT(c.session_id), 0)) * 100, 
    2
  ) AS cart_abandonment_rate_percent
FROM cart_sessions c
LEFT JOIN purchased_sessions p ON c.session_id = p.session_id;`;

  const funnelSqlQuery = `-- Adım Adım Huni (Funnel) Analiz Sorgusu
WITH session_funnel AS (
  SELECT 
    session_id,
    MAX(CASE WHEN event = 'view_item' THEN 1 ELSE 0 END) AS has_view_item,
    MAX(CASE WHEN event IN ('add_to_cart', 'view_cart') THEN 1 ELSE 0 END) AS has_cart,
    MAX(CASE WHEN event = 'begin_checkout' THEN 1 ELSE 0 END) AS has_checkout,
    MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS has_purchase
  FROM funnel_events
  GROUP BY session_id
)
SELECT
  COUNT(*) AS total_sessions,
  SUM(has_view_item) AS step1_view_item,
  SUM(has_cart) AS step2_add_to_cart,
  SUM(has_checkout) AS step3_begin_checkout,
  SUM(has_purchase) AS step4_purchase,
  ROUND((SUM(has_purchase)::decimal / NULLIF(SUM(has_view_item), 0)) * 100, 2) AS overall_conversion_rate_pct
FROM session_funnel;`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-corp-teal/10 text-corp-teal">
              Faz 5: Ölçüm
            </span>
            <h3 className="font-display text-xl font-bold text-corp-charcoal">
              Dönüşüm Hunisi & A/B Test Raporu
            </h3>
          </div>
          <p className="text-sm font-body text-corp-gray mt-1">
            Kendi Neon PostgreSQL veritabanımızdaki <code className="text-corp-teal font-mono">funnel_events</code> tablosundan gerçek zamanlı analiz.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-corp-surface hover:bg-corp-border text-corp-charcoal transition-all disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Verileri Yenile
        </button>
      </div>

      {/* Cart Abandonment & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sepeti Terk Oranı Card */}
        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-corp-gray uppercase tracking-wider">Sepeti Terk Oranı</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-display font-bold text-corp-charcoal">
              %{data?.cartAbandonment?.ratePercent?.toFixed(1) ?? "0.0"}
            </span>
          </div>
          <p className="text-xs text-corp-gray mt-1">
            {data?.cartAbandonment?.abandonedCartSessions ?? 0} sepet satın alınmadan terk edildi ({data?.cartAbandonment?.totalCartSessions ?? 0} sepet oturumu)
          </p>
        </div>

        {/* Toplam Oturum */}
        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-corp-gray uppercase tracking-wider">Takip Edilen Oturum</span>
            <Filter size={18} className="text-corp-teal" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-display font-bold text-corp-charcoal">
              {data?.summary?.totalSessions ?? 0}
            </span>
          </div>
          <p className="text-xs text-corp-gray mt-1">
            Tekil session_id bazında huni aktivitesi
          </p>
        </div>

        {/* Genel Huni Dönüşüm Oranı */}
        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-corp-gray uppercase tracking-wider">Uçtan Uca Dönüşüm</span>
            <TrendingUp size={18} className="text-green-500" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-display font-bold text-corp-charcoal">
              %{data?.summary?.overallConversionRate?.toFixed(2) ?? "0.00"}
            </span>
          </div>
          <p className="text-xs text-corp-gray mt-1">
            Ürün Görüntüleme → Satın Alma başarı oranı
          </p>
        </div>

        {/* Tamamlanan Siparişler */}
        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-corp-gray uppercase tracking-wider">Satın Alma Oturumu</span>
            <CheckCircle2 size={18} className="text-corp-teal" />
          </div>
          <div className="mt-2">
            <span className="text-3xl font-display font-bold text-corp-charcoal">
              {data?.cartAbandonment?.purchasedSessions ?? 0}
            </span>
          </div>
          <p className="text-xs text-corp-gray mt-1">
            Başarıyla tamamlanan purchase olayları
          </p>
        </div>
      </div>

      {/* 1. Adım Adım Huni (Funnel) */}
      <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <h4 className="font-display font-bold text-lg text-corp-charcoal mb-4 flex items-center gap-2">
          <Filter size={18} className="text-corp-teal" />
          Adım Adım Satın Alma Hunisi (Funnel)
        </h4>

        <div className="space-y-4">
          {data?.funnel?.map((step, idx) => {
            const widthPct = Math.max(8, step.conversionRate || (step.count > 0 ? 100 : 0));
            return (
              <div key={step.key} className="p-4 rounded-xl bg-corp-surface border border-corp-border/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-corp-teal text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-display font-semibold text-corp-charcoal text-sm">
                      {step.step}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-corp-charcoal text-base">
                      {step.count} oturum
                    </span>
                    {idx > 0 && (
                      <span className="text-xs text-corp-gray ml-2">
                        (Dönüşüm: %{step.conversionRate} / Terk: %{step.dropoffRate})
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Visual Bar */}
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-corp-teal to-corp-teal-600 transition-all duration-500 rounded-full"
                    style={{ width: `${idx === 0 ? 100 : widthPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: A/B Testi & Cihaz Kırılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* A/B Testi Karşılaştırması */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-lg text-corp-charcoal flex items-center gap-2">
              <Split size={18} className="text-purple-600" />
              A/B Testi: CTA Buton Metni
            </h4>
            <span className="text-xs text-corp-gray">Oturum Bazlı 50/50 Bölüm</span>
          </div>

          <div className="space-y-4">
            {data?.abTesting?.map((v) => (
              <div 
                key={v.variant} 
                className={`p-4 rounded-xl border ${
                  v.variant === "variant_fast" 
                    ? "bg-purple-50/50 border-purple-200" 
                    : "bg-corp-surface border-corp-border"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-display font-bold text-sm text-corp-charcoal">
                    {v.label}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-corp-border text-corp-charcoal">
                    {v.variant}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-corp-border/50 text-center">
                  <div>
                    <span className="text-[11px] text-corp-gray block">Ürün Görünüm</span>
                    <span className="font-bold text-sm text-corp-charcoal">{v.views}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-corp-gray block">Sepete Ekle</span>
                    <span className="font-bold text-sm text-corp-teal">{v.cartAdds}</span>
                    <span className="text-[10px] text-corp-gray block">(%{v.cartConversionRate})</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-corp-gray block">Satın Alma</span>
                    <span className="font-bold text-sm text-green-600">{v.purchases}</span>
                    <span className="text-[10px] text-corp-gray block">(%{v.purchaseConversionRate})</span>
                  </div>
                </div>
              </div>
            ))}

            {(!data?.abTesting || data.abTesting.length === 0) && (
              <p className="text-sm text-corp-gray italic text-center py-4">
                Henüz A/B varyant verisi kaydedilmedi.
              </p>
            )}
          </div>
        </div>

        {/* Cihaz Kırılımı */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-display font-bold text-lg text-corp-charcoal flex items-center gap-2">
              <Monitor size={18} className="text-corp-teal" />
              Cihaz Kırılımı (Device Breakdown)
            </h4>
          </div>

          <div className="space-y-3">
            {data?.deviceBreakdown?.map((d) => {
              const Icon = d.device === "mobile" ? Smartphone : d.device === "tablet" ? Tablet : Monitor;
              return (
                <div key={d.device} className="p-4 rounded-xl bg-corp-surface border border-corp-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-white border border-corp-border text-corp-teal">
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="font-display font-semibold text-sm capitalize text-corp-charcoal block">
                        {d.device === "desktop" ? "Masaüstü (Desktop)" : d.device === "mobile" ? "Mobil (Mobile)" : "Tablet"}
                      </span>
                      <span className="text-xs text-corp-gray">
                        {d.sessions} oturum • {d.cartSessions} sepet
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-sm text-corp-charcoal block">
                      {d.purchaseSessions} Satın Alma
                    </span>
                    <span className="text-xs text-green-600 font-semibold">
                      Dönüşüm: %{d.conversionRate}
                    </span>
                  </div>
                </div>
              );
            })}

            {(!data?.deviceBreakdown || data.deviceBreakdown.length === 0) && (
              <p className="text-sm text-corp-gray italic text-center py-4">
                Henüz cihaz kırılım verisi bulunmamaktadır.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SQL Sorguları Bölümü */}
      <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <h4 className="font-display font-bold text-lg text-corp-charcoal mb-4 flex items-center gap-2">
          <Database size={18} className="text-corp-teal" />
          Kullanıma Hazır SQL Sorguları
        </h4>

        <div className="space-y-4">
          {/* Sorgu 1: Sepeti Terk Oranı */}
          <div className="border border-corp-border rounded-xl overflow-hidden">
            <div className="bg-corp-surface px-4 py-2.5 flex items-center justify-between border-b border-corp-border">
              <span className="font-display font-semibold text-xs text-corp-charcoal">
                1. Sepeti Terk Oranını Hesaplayan SQL Sorgusu
              </span>
              <button
                onClick={() => copyToClipboard(abandonmentSqlQuery, "abandonment")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-corp-border text-xs font-semibold hover:bg-corp-surface text-corp-charcoal"
              >
                {copiedQuery === "abandonment" ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copiedQuery === "abandonment" ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
              {abandonmentSqlQuery}
            </pre>
          </div>

          {/* Sorgu 2: Adım Adım Huni */}
          <div className="border border-corp-border rounded-xl overflow-hidden">
            <div className="bg-corp-surface px-4 py-2.5 flex items-center justify-between border-b border-corp-border">
              <span className="font-display font-semibold text-xs text-corp-charcoal">
                2. Adım Adım Huni (Funnel) Analiz Sorgusu
              </span>
              <button
                onClick={() => copyToClipboard(funnelSqlQuery, "funnel")}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-corp-border text-xs font-semibold hover:bg-corp-surface text-corp-charcoal"
              >
                {copiedQuery === "funnel" ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                {copiedQuery === "funnel" ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-gray-100 text-xs font-mono overflow-x-auto">
              {funnelSqlQuery}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
