"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  ShoppingCart,
  Users,
  CreditCard,
  AlertCircle,
  HelpCircle,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Smartphone,
  Monitor,
  Copy,
  Check,
  Building2,
  UserCheck,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

// ─── TİPLER ──────────────────────────────────────────────────────────────────

interface AnalyticsPayload {
  success: boolean;
  filter: {
    preset: string;
    label: string;
    start: string;
    end: string;
    isSingleDay: boolean;
    compare: boolean;
    includeTest: boolean;
  };
  summary: {
    revenue: number;
    totalOrdersCount: number;
    confirmedOrdersCount: number;
    pendingOrdersCount: number;
    cancelledOrdersCount: number;
    aov: number;
    visitors: number;
    conversionRate: number;
  };
  comparison: {
    prevLabel: string;
    revenueChange: { percent: number; direction: "up" | "down" | "neutral"; formatted: string };
    ordersChange: { percent: number; direction: "up" | "down" | "neutral"; formatted: string };
    visitorsChange: { percent: number; direction: "up" | "down" | "neutral"; formatted: string };
  } | null;
  timeTrends: Array<{ label: string; ciro: number; siparis: number }>;
  journey: {
    steps: Array<{
      stepName: string;
      key: string;
      count: number;
      percentOfTotal: number;
      dropoffPercent: number;
    }>;
    comment: string;
  };
  topSellingProducts: Array<{ name: string; quantity: number; revenue: number }>;
  opportunityProducts: Array<{ id: string; name: string; views: number; soldCount: number; price: number }>;
  trafficSources: Array<{ label: string; orders: number; revenue: number; visits: number }>;
  customerProfile: {
    individualCount: number;
    corporateCount: number;
    topCities: Array<{ city: string; count: number }>;
    deviceBreakdown: Array<{ device: string; sessions: number; percent: number }>;
  };
  paymentAndDiscounts: {
    couponUsedCount: number;
    totalDiscountGiven: number;
    paymentMethods: Array<{ name: string; count: number; percent: number }>;
    failedOrdersCount: number;
    recentFailedOrders: Array<{ orderNumber: string; amount: number; reason: string; date: string }>;
  };
  cartAbandonment: {
    abandonedCount: number;
    abandonedTotalValue: number;
    recoveredCount: number;
    recoveredTotalValue: number;
    recoveryRatePercent: number;
    topAbandonedProducts: Array<{ name: string; count: number }>;
    recentAbandoned: Array<{
      id: string;
      date: string;
      totalAmount: number;
      itemCount: number;
      converted: boolean;
      allowMarketing: boolean;
      customerName: string;
      email: string;
      phone: string | null;
    }>;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    customerType: string;
    guestName: string | null;
    amount: number;
    source: string;
    city: string;
    createdAt: string;
  }>;
}

// ─── YARDIMCI BİLEŞENLER ─────────────────────────────────────────────────────

function TooltipHelp({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center ml-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-slate-400 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-100"
        title="Bilgi"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2.5 bg-slate-900 text-slate-100 text-xs rounded-lg shadow-xl z-50 pointer-events-none leading-relaxed border border-slate-700">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

function AccuracyBadge({ type }: { type: "exact" | "approx" }) {
  if (type === "exact") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        Kesin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      <Sparkles className="w-3 h-3 text-amber-600" />
      Yaklaşık
    </span>
  );
}

function ComparisonBadge({
  change,
}: {
  change?: { percent: number; direction: "up" | "down" | "neutral"; formatted: string };
}) {
  if (!change) return null;
  if (change.direction === "up") {
    return (
      <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
        <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
        {change.formatted}
      </span>
    );
  }
  if (change.direction === "down") {
    return (
      <span className="inline-flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
        <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
        {change.formatted}
      </span>
    );
  }
  return <span className="text-xs text-slate-500 font-medium">Değişim yok</span>;
}

// ─── ANA BİLEŞEN ─────────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrlSuffix, setCopiedUrlSuffix] = useState(false);

  // Filtre durumları
  const currentPreset = searchParams?.get("range") || "last_30_days";
  const customStart = searchParams?.get("start") || "";
  const customEnd = searchParams?.get("end") || "";
  const compare = searchParams?.get("compare") === "true";
  const includeTest = searchParams?.get("includeTest") === "true";

  const [localStart, setLocalStart] = useState(customStart);
  const [localEnd, setLocalEnd] = useState(customEnd);

  // Veri yükleme
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (currentPreset) q.set("range", currentPreset);
      if (customStart) q.set("start", customStart);
      if (customEnd) q.set("end", customEnd);
      if (compare) q.set("compare", "true");
      if (includeTest) q.set("includeTest", "true");

      const res = await fetch(`/api/admin/analytics?${q.toString()}`);
      if (!res.ok) {
        throw new Error("Analitik verileri yüklenemedi. Lütfen tekrar deneyin.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentPreset, customStart, customEnd, compare, includeTest]);

  // Filtre değiştirme
  const updateFilter = (newParams: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      Object.entries(newParams).forEach(([k, v]) => {
        if (v === null || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      });
      router.push(`/admin/analytics?${params.toString()}`);
    });
  };

  const handleCopySuffix = () => {
    navigator.clipboard.writeText(
      "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={creative}&utm_term={keyword}"
    );
    setCopiedUrlSuffix(true);
    setTimeout(() => setCopiedUrlSuffix(false), 2500);
  };

  const handleExportCsv = () => {
    const q = new URLSearchParams();
    if (currentPreset) q.set("range", currentPreset);
    if (customStart) q.set("start", customStart);
    if (customEnd) q.set("end", customEnd);
    if (includeTest) q.set("includeTest", "true");
    window.location.href = `/api/admin/analytics/export?${q.toString()}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-8 font-sans antialiased text-slate-800">
      {/* ─── BAŞLIK VE TARİH FİLTRESİ ÇUBUĞU ───────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Mağaza Performansı ve Satış Analizi
              </h1>
              <a
                href="/admin/analytics-eski"
                className="text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 px-2.5 py-1 rounded-md transition-colors"
                title="Eski teknik görünüme geç"
              >
                Eski Ekranı Aç
              </a>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Sade Türkçe ile mağaza cirosu, ziyaretçiler, satın alma adımları ve müşteri eğilimleri.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
              title="Excel uyumlu CSV formatında indir"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Excel / CSV Olarak İndir
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              title="Yenile"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-teal-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Tarih Butonları */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "today", label: "Bugün" },
              { id: "yesterday", label: "Dün" },
              { id: "last_7_days", label: "Son 7 Gün" },
              { id: "last_30_days", label: "Son 30 Gün" },
              { id: "this_month", label: "Bu Ay" },
              { id: "last_month", label: "Geçen Ay" },
              { id: "custom", label: "Özel Aralık" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  if (btn.id === "custom") {
                    updateFilter({ range: "custom" });
                  } else {
                    updateFilter({ range: btn.id, start: null, end: null });
                  }
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  currentPreset === btn.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            {/* Karşılaştırma Seçeneği */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={compare}
                onChange={(e) => updateFilter({ compare: e.target.checked ? "true" : null })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span>Önceki dönemle karşılaştır</span>
            </label>

            {/* Test Siparişleri Seçeneği */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => updateFilter({ includeTest: e.target.checked ? "true" : null })}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span title="Test e-postaları ve [TEST] notu olan kayıtları dahil eder">
                Test siparişlerini göster
              </span>
            </label>
          </div>
        </div>

        {/* Özel Aralık Seçimi Takvimi */}
        {currentPreset === "custom" && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-medium text-slate-700 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Tarih Seç:
            </span>
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
            />
            <span className="text-slate-400">—</span>
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-slate-800 bg-white"
            />
            <button
              onClick={() => updateFilter({ start: localStart, end: localEnd })}
              className="px-3 py-1.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Uygula
            </button>
            <span className="text-slate-400 text-[11px]">
              (Tek gün seçmek için başlangıç ve bitişi aynı gün yapabilirsiniz)
            </span>
          </div>
        )}
      </div>

      {/* ─── HATA VEYA YÜKLENİYOR İSKELETİ ───────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-8 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-48 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {data && (
        <>
          {/* ─── BÖLÜM 1: ÖZET KARTLARI ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Toplam Ciro */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  Toplam Ciro
                  <TooltipHelp text="Ödemesi onaylanmış ve teslimat sürecindeki siparişlerin KDV dahil toplam tutarıdır. İptal ve bekleyenler dahil edilmez." />
                </span>
                <AccuracyBadge type="exact" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                  ₺{data.summary.revenue.toLocaleString("tr-TR")}
                </span>
                {compare && <ComparisonBadge change={data.comparison?.revenueChange} />}
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.confirmedOrdersCount > 0
                  ? `${data.summary.confirmedOrdersCount} onaylı siparişten elde edilen net ciro`
                  : "Bu aralıkta henüz onaylanmış ciro yok"}
              </p>
            </div>

            {/* 2. Sipariş Sayısı */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  Sipariş Sayısı
                  <TooltipHelp text="Seçili dönemde mağazaya verilen tüm siparişlerin (onaylı, bekleyen, iptal) kesin toplam adedidir." />
                </span>
                <AccuracyBadge type="exact" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {data.summary.totalOrdersCount}
                </span>
                {compare && <ComparisonBadge change={data.comparison?.ordersChange} />}
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.confirmedOrdersCount} Onaylı · {data.summary.pendingOrdersCount} Bekleyen ·{" "}
                {data.summary.cancelledOrdersCount} İptal
              </p>
            </div>

            {/* 3. Ortalama Sipariş Tutarı */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  Ortalama Sipariş Tutarı
                  <TooltipHelp text="Onaylı sipariş başına kasaya giren ortalama sepet bedelidir (Toplam Ciro / Onaylı Sipariş)." />
                </span>
                <AccuracyBadge type="exact" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                  ₺{data.summary.aov.toLocaleString("tr-TR")}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.confirmedOrdersCount > 0
                  ? "Onaylı sipariş başına düşen ortalama tutar"
                  : "Onaylı sipariş oluştuğunda hesaplanır"}
              </p>
            </div>

            {/* 4. İptal / Başarısız Sipariş */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  İptal / Başarısız Sipariş
                  <TooltipHelp text="Ödeme sayfasında müşterinin vazgeçtiği, banka tarafından reddedilen veya iptal edilen sipariş adetleridir." />
                </span>
                <AccuracyBadge type="exact" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-rose-600">
                  {data.summary.cancelledOrdersCount}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.cancelledOrdersCount > 0
                  ? "Kasaya girmeyen, ödemesi tamamlanmamış işlemler"
                  : "Bu aralıkta iptal edilen sipariş yok"}
              </p>
            </div>

            {/* 5. Ziyaretçi (Yaklaşık) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  Ziyaretçi
                  <TooltipHelp text="Mağazanıza giren tekil ziyaret oturumu sayısıdır. Çerez onayına ve tarayıcı durumuna bağlı yaklaşık değerdir." />
                </span>
                <AccuracyBadge type="approx" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {data.summary.visitors.toLocaleString("tr-TR")}
                </span>
                {compare && <ComparisonBadge change={data.comparison?.visitorsChange} />}
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.visitors > 0
                  ? "Tarayıcı oturumlarına dayalı tekil ziyaret"
                  : "Bu aralıkta kayıtlı ziyaretçi yok"}
              </p>
            </div>

            {/* 6. Satın Alanların Oranı (Yaklaşık) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-2 hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center">
                  Satın Alanların Oranı
                  <TooltipHelp text="Mağazayı ziyaret eden her 100 kişiden kaçının satın alma adımına ulaştığını gösterir." />
                </span>
                <AccuracyBadge type="approx" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-teal-600">
                  %{data.summary.conversionRate}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {data.summary.visitors > 0
                  ? "Ziyaret başına sipariş tamamlama başarısı"
                  : "Ziyaretçi verisi oluşunca hesaplanır"}
              </p>
            </div>
          </div>

          {/* ─── BÖLÜM 2: ZAMAN İÇİNDE CİRO VE SİPARİŞ GRAFİĞİ ──────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  Zaman İçinde Satış Trendi
                  <TooltipHelp text="Seçilen tarih aralığında gün gün (tek gün ise saat saat) elde edilen ciro ve sipariş adedini gösterir." />
                </h2>
                <p className="text-xs text-slate-500">
                  {data.filter.isSingleDay
                    ? "Günün 24 saati boyunca saatlik dağılım"
                    : `${data.filter.label} boyunca günlük dağılım`}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-teal-500" />
                  Ciro (TL)
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  Sipariş (Adet)
                </span>
              </div>
            </div>

            {data.timeTrends.length > 0 ? (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCiro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorSiparis" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `₺${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                              <p className="font-semibold text-slate-300">{item.label}</p>
                              <p className="text-teal-400 font-bold">
                                Ciro: ₺{Number(item.ciro).toLocaleString("tr-TR")}
                              </p>
                              <p className="text-indigo-300 font-medium">Sipariş: {item.siparis} Adet</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ciro"
                      stroke="#0d9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="urlColorCiro"
                    />
                    <Area
                      type="monotone"
                      dataKey="siparis"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="urlColorSiparis"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Bu aralıkta veri yok</div>
            )}
          </div>

          {/* ─── BÖLÜM 3: SATIN ALMA YOLCULUĞU (FUNNEL) ──────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900 flex items-center">
                  Satın Alma Yolculuğu
                  <TooltipHelp text="Ziyaretçinin siteye girip sırasıyla ürüne bakması, sepete atması, ödemeye geçmesi ve siparişi tamamlaması sürecidir. Hangi adımda kaç kişinin ayrıldığını gösterir." />
                </h2>
                <AccuracyBadge type="approx" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ziyaretçilerin adım adım elenme ve satın alma aşamalarına geçiş oranları
              </p>
            </div>

            {/* 4 Adım Göstergesi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.journey.steps.map((step, idx) => (
                <div
                  key={step.key}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2 relative"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {idx + 1}. {step.stepName}
                    </span>
                    <span className="font-bold text-slate-900">{step.count} kişi</span>
                  </div>

                  {/* İlerleme Çubuğu */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-teal-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, step.percentOfTotal))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-teal-700 font-medium">Geçiş: %{step.percentOfTotal}</span>
                    {idx > 0 && step.dropoffPercent > 0 && (
                      <span className="text-rose-600 font-medium">Vazgeçen: %{step.dropoffPercent}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Otomatik Akıllı Türkçe Yorum */}
            <div className="p-4 bg-teal-50/60 border border-teal-200/80 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-teal-900">Otomatik Durum Değerlendirmesi:</p>
                <p className="text-xs text-teal-800 mt-0.5 leading-relaxed">{data.journey.comment}</p>
              </div>
            </div>
          </div>

          {/* ─── BÖLÜM 4: ÇOK SATANLAR & ÇOK BAKILIP SATILMAYANLAR ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Çok Satanlar */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  En Çok Satan Ürünler
                  <TooltipHelp text="Seçili dönemde ödemesi tamamlanmış siparişlerde en çok adet satan ürünlerdir." />
                </h3>
                <AccuracyBadge type="exact" />
              </div>

              {data.topSellingProducts.length > 0 ? (
                <div className="space-y-3">
                  {data.topSellingProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="font-medium text-slate-800 line-clamp-1">{p.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-slate-900">{p.quantity} Adet</p>
                        <p className="text-[11px] text-slate-500">₺{p.revenue.toLocaleString("tr-TR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Bu aralıkta onaylanmış satış yok
                </div>
              )}
            </div>

            {/* Çok Bakılıp Satılmayanlar (Fırsat Ürünleri) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  Çok Bakılıp Satılmayanlar (Fırsat Ürünleri)
                  <TooltipHelp text="Ziyaretçilerin ürün sayfasına çok girdiği ancak sepete atmadığı veya satın almadığı ürünlerdir. Fiyat veya görsel iyileştirmesi için ipucu verir." />
                </h3>
                <AccuracyBadge type="approx" />
              </div>

              {data.opportunityProducts.length > 0 ? (
                <div className="space-y-3">
                  {data.opportunityProducts.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div>
                        <p className="font-medium text-slate-800 line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {p.views} Görüntülenme · Satış: {p.soldCount} Adet
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          İnceleme Önerisi
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  Bu aralıkta fırsat ürünü verisi yok
                </div>
              )}
            </div>
          </div>

          {/* ─── BÖLÜM 5: SİPARİŞLER NEREDEN GELİYOR (TRAFİK & GOOGLE ADS) ────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  Siparişler Nereden Geliyor?
                  <TooltipHelp text="Ziyaretçilerin mağazanıza hangi reklam veya web sitesinden ulaştığını ve hangi kanaldan kaç sipariş geldiğini gösterir." />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  İlk temas (first-touch) UTM ve referans kaynakları dağılımı
                </p>
              </div>
              <AccuracyBadge type="exact" />
            </div>

            {/* Kaynak Kartları */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {data.trafficSources.map((src, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">{src.label}</p>
                  <p className="text-lg font-extrabold text-slate-900">{src.orders} Sipariş</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>₺{src.revenue.toLocaleString("tr-TR")}</span>
                    <span>{src.visits} Ziyaret</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Google Ads Son URL Soneki Bilgilendirme Kutusu */}
            <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  Google Ads Kampanyanıza Eklemeniz Gereken "Son URL Soneki"
                </span>
                <button
                  type="button"
                  onClick={handleCopySuffix}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-white text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors shadow-sm"
                >
                  {copiedUrlSuffix ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Kopyalandı!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Kopyala
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Google Ads panelinde <strong>Kampanya Ayarları → Kampanya URL Seçenekleri → Son URL Soneki</strong> kutusuna aşağıdaki metni yapıştırarak reklam kaynaklı tüm siparişleri otomatik takip edebilirsiniz:
              </p>
              <div className="p-2 bg-white rounded-lg border border-indigo-200 text-xs font-mono text-indigo-950 select-all overflow-x-auto">
                utm_source=google&utm_medium=cpc&utm_campaign=&#123;campaignid&#125;&utm_content=&#123;creative&#125;&utm_term=&#123;keyword&#125;
              </div>
            </div>
          </div>

          {/* ─── BÖLÜM 6: MÜŞTERİ PROFİLİ & CİHAZLAR ──────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Müşteri Tipi: Bireysel vs Kurumsal */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                Müşteri Tipi Dağılımı
                <TooltipHelp text="Sipariş veren müşterilerin şahıs mı yoksa fatura talep eden kurumsal şirket mi olduğunu gösterir." />
              </h3>

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-teal-600" />
                    <span className="font-medium text-slate-800">Bireysel Müşteri</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {data.customerProfile.individualCount} Sipariş
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-slate-800">Kurumsal Müşteri</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {data.customerProfile.corporateCount} Sipariş
                  </span>
                </div>
              </div>
            </div>

            {/* İlk 10 Şehir */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                En Çok Sipariş Veren Şehirler
                <TooltipHelp text="Teslimat adresine göre en çok sipariş alınan illeri sıralar." />
              </h3>

              {data.customerProfile.topCities.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {data.customerProfile.topCities.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-slate-700 font-medium">
                        {idx + 1}. {c.city}
                      </span>
                      <span className="font-bold text-slate-900">{c.count} Sipariş</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">Şehir verisi yok</div>
              )}
            </div>

            {/* Cihaz Dağılımı: Telefon vs Bilgisayar */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                Telefon / Bilgisayar Oranı
                <TooltipHelp text="Ziyaretçilerin mağazanıza cep telefonundan mı yoksa bilgisayardan mı girdiğini gösterir." />
              </h3>

              {data.customerProfile.deviceBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {data.customerProfile.deviceBreakdown.map((dev, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 flex items-center gap-1.5">
                          {dev.device === "Telefon" ? (
                            <Smartphone className="w-4 h-4 text-teal-600" />
                          ) : (
                            <Monitor className="w-4 h-4 text-indigo-600" />
                          )}
                          {dev.device}
                        </span>
                        <span className="font-bold text-slate-900">%{dev.percent}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-slate-700 h-full rounded-full"
                          style={{ width: `${dev.percent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 text-right">{dev.sessions} Ziyaret</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">Cihaz verisi yok</div>
              )}
            </div>
          </div>

          {/* ─── BÖLÜM 7: KUPON, ÖDEME YÖNTEMLERİ VE BAŞARISIZ ÖDEMELER ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kupon Kullanımı */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                Kupon & İndirim Kullanımı
                <TooltipHelp text="Müşterilerin siparişlerinde kullandığı promosyon kuponları ve sağlanan toplam indirim bedelidir." />
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <p className="text-2xl font-bold text-slate-900">
                  {data.paymentAndDiscounts.couponUsedCount} Sipariş
                </p>
                <p className="text-xs text-slate-600">
                  Toplam İndirim:{" "}
                  <strong className="text-slate-900">
                    ₺{data.paymentAndDiscounts.totalDiscountGiven.toLocaleString("tr-TR")}
                  </strong>
                </p>
              </div>
            </div>

            {/* Ödeme Yöntemi Dağılımı */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center">
                Ödeme Yöntemi Dağılımı
                <TooltipHelp text="Kredi kartı veya Havale/EFT ile tamamlanan siparişlerin oranıdır." />
              </h3>
              <div className="space-y-2 text-xs">
                {data.paymentAndDiscounts.paymentMethods.length > 0 ? (
                  data.paymentAndDiscounts.paymentMethods.map((pm, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100"
                    >
                      <span className="font-medium text-slate-700">{pm.name}</span>
                      <span className="font-bold text-slate-900">
                        {pm.count} ({pm.percent}%)
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 py-4 text-center">Ödeme verisi yok</p>
                )}
              </div>
            </div>

            {/* Başarısız Ödemeler */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center">
                  Başarısız Ödemeler
                  <TooltipHelp text="Ödeme adımında banka veya kullanıcı kaynaklı tamamlanamayan siparişlerin nedenleridir." />
                </h3>
                <span className="text-xs font-bold text-rose-600">
                  {data.paymentAndDiscounts.failedOrdersCount} Adet
                </span>
              </div>
              {data.paymentAndDiscounts.recentFailedOrders.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
                  {data.paymentAndDiscounts.recentFailedOrders.map((f, idx) => (
                    <div key={idx} className="p-2 bg-rose-50/50 rounded-lg border border-rose-100 space-y-0.5">
                      <div className="flex items-center justify-between font-semibold text-rose-900">
                        <span>{f.orderNumber}</span>
                        <span>₺{f.amount}</span>
                      </div>
                      <p className="text-[11px] text-rose-700 line-clamp-1">{f.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 py-4 text-center text-xs">Başarısız ödeme yok</p>
              )}
            </div>
          </div>

          {/* ─── BÖLÜM 8: TERK EDİLEN SEPETLER ──────────────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  Terk Edilen Sepetler & Geri Kazanım
                  <TooltipHelp text="Müşterinin sepete ürün ekledikten sonra satın almadan siteden ayrıldığı durumdur. İletişim izni veren müşterilere hatırlatma yapılabilir." />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sepette kalan ürünler ve geri dönen müşteriler
                </p>
              </div>
              <AccuracyBadge type="exact" />
            </div>

            {/* İstatistik Kutuları */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500">Terk Edilen Sepet</p>
                <p className="text-2xl font-bold text-slate-900">
                  {data.cartAbandonment.abandonedCount} Adet
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500">Sepette Kalan Tutar</p>
                <p className="text-2xl font-bold text-slate-900">
                  ₺{data.cartAbandonment.abandonedTotalValue.toLocaleString("tr-TR")}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500">Kurtarılan Sepet</p>
                <p className="text-2xl font-bold text-teal-600">
                  {data.cartAbandonment.recoveredCount} Adet
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-xs text-slate-500">Geri Kazanım Başarısı</p>
                <p className="text-2xl font-bold text-teal-600">
                  %{data.cartAbandonment.recoveryRatePercent}
                </p>
              </div>
            </div>

            {/* Terk Edilen Sepetler Listesi */}
            {data.cartAbandonment.recentAbandoned.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">Müşteri</th>
                      <th className="p-3">İletişim</th>
                      <th className="p-3">Sepet Tutarı</th>
                      <th className="p-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.cartAbandonment.recentAbandoned.map((cart) => (
                      <tr key={cart.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-slate-500">
                          {new Date(cart.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="p-3 font-medium text-slate-800">{cart.customerName}</td>
                        <td className="p-3 text-slate-600">
                          {cart.allowMarketing ? (
                            <span className="font-mono text-slate-700">{cart.email}</span>
                          ) : (
                            <span className="text-slate-400 italic">[İletişim İzni Yok - Gizlendi]</span>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          ₺{cart.totalAmount.toLocaleString("tr-TR")}
                        </td>
                        <td className="p-3">
                          {cart.converted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Kurtarıldı
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Bekliyor
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Bu aralıkta terk edilmiş sepet kaydı yok
              </div>
            )}
          </div>

          {/* ─── BÖLÜM 9: SON SİPARİŞLER TABLOSU ─────────────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center">
                  Seçili Dönemin Siparişleri
                  <TooltipHelp text="Filtrelenen zaman aralığında sisteme düşen en son siparişlerin dökümüdür." />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tutar, durum, müşteri tipi ve trafik kaynağı
                </p>
              </div>
              <AccuracyBadge type="exact" />
            </div>

            {data.recentOrders.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Sipariş No</th>
                      <th className="p-3">Tarih</th>
                      <th className="p-3">Müşteri</th>
                      <th className="p-3">Şehir</th>
                      <th className="p-3">Kaynak</th>
                      <th className="p-3">Tutar</th>
                      <th className="p-3">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{o.orderNumber}</td>
                        <td className="p-3 text-slate-500">
                          {new Date(o.createdAt).toLocaleString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3 text-slate-800">
                          {o.guestName || "Müşteri"}
                          <span className="ml-1 text-[10px] text-slate-400">
                            ({o.customerType === "CORPORATE" ? "Kurumsal" : "Bireysel"})
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{o.city}</td>
                        <td className="p-3 text-slate-500 max-w-[140px] truncate" title={o.source}>
                          {o.source}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          ₺{o.amount.toLocaleString("tr-TR")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              o.status === "DELIVERED" || o.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : o.status === "CANCELLED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {o.status === "DELIVERED"
                              ? "Teslim Edildi"
                              : o.status === "CONFIRMED"
                              ? "Onaylandı"
                              : o.status === "CANCELLED"
                              ? "İptal"
                              : "Beklemede"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Bu aralıkta kayıtlı sipariş bulunmuyor
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
