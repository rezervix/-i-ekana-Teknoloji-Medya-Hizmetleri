"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Clock,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

export default function AdminCustomerServiceAnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/customer-service/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error("Load analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-corp-charcoal">
            Müşteri Hizmetleri & AI Görüşme Analitiği
          </h1>
          <p className="text-xs sm:text-sm text-corp-gray mt-1">
            Ziyaretçi soruları, bilgi açıkları, insan temsilciye aktarım oranları ve dönüşüm metrikleri.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-corp-border text-corp-charcoal rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-corp-gray flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-corp-teal" />
          Analitik verileri hesaplanıyor...
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-xs text-corp-gray">
          Veriler yüklenemedi. Lütfen tekrar deneyiniz.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-corp-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-corp-gray font-medium">Toplam Görüşme</p>
                <h3 className="text-2xl font-bold font-display text-corp-charcoal mt-1">
                  {data.stats.totalConversations}
                </h3>
                <p className="text-[11px] text-corp-gray-light mt-0.5">
                  {data.stats.totalMessages} toplam mesaj
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-corp-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-corp-gray font-medium">Telefon Bırakan Müşteri</p>
                <h3 className="text-2xl font-bold font-display text-corp-charcoal mt-1">
                  {data.stats.handoversWithPhone}
                </h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                  Doğrudan sıcak satış fırsatı
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-corp-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-corp-gray font-medium">Temsilciye Yönlendirme Oranı</p>
                <h3 className="text-2xl font-bold font-display text-corp-charcoal mt-1">
                  %{data.stats.handoverRate}
                </h3>
                <p className="text-[11px] text-corp-gray-light mt-0.5">
                  {data.stats.totalHandovers} yönlendirme kaydı
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-corp-border rounded-2xl p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-corp-gray font-medium">Çözüm / Sonuçlandırma Oranı</p>
                <h3 className="text-2xl font-bold font-display text-corp-charcoal mt-1">
                  %{data.stats.resolutionRate}
                </h3>
                <p className="text-[11px] text-corp-gray-light mt-0.5">
                  {data.stats.resolvedConversations} sonuçlandırılan talep
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Activity Trend (Last 7 Days) */}
          <div className="bg-white border border-corp-border rounded-2xl p-6 shadow-xs">
            <h3 className="font-display font-bold text-sm text-corp-charcoal mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-corp-teal" />
              Son 7 Günlük Sohbet Hacmi
            </h3>

            <div className="grid grid-cols-7 gap-2 pt-4 border-t border-corp-border">
              {data.dailyTrend.map((d: any, idx: number) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className="h-28 w-full bg-slate-100 rounded-lg flex items-end p-1">
                    <div
                      style={{
                        height: `${Math.max(12, Math.min(100, d.count * 15))}%`,
                      }}
                      className="w-full bg-corp-teal rounded-md transition-all duration-300"
                    />
                  </div>
                  <span className="text-[11px] font-bold text-corp-charcoal">{d.count}</span>
                  <span className="text-[10px] text-corp-gray">
                    {new Date(d.date).toLocaleDateString("tr-TR", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Unanswered Questions (Knowledge Gaps) & Handover Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Knowledge Gaps (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-corp-border rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-corp-charcoal flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  Tespit Edilen Bilgi Açıkları & Cevaplanamayan Sorular
                </h3>
                <p className="text-xs text-corp-gray mt-1">
                  Yapay zekânın doğrulanmış kaynak bulamadığı için insan temsilciye aktardığı gerçek müşteri soruları. Bu konuları bilgi bankasına doküman olarak ekleyerek asistanı güçlendirebilirsiniz.
                </p>
              </div>

              {data.unansweredQuestions.length === 0 ? (
                <div className="p-8 text-center text-xs text-corp-gray">
                  Kayıtlı cevaplanamayan soru bulunmuyor.
                </div>
              ) : (
                <div className="divide-y divide-corp-border">
                  {data.unansweredQuestions.map((q: any) => (
                    <div key={q.id} className="py-3 flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-corp-charcoal">{q.question}</p>
                        <div className="flex items-center gap-2 text-[10px] text-corp-gray">
                          {q.relatedProduct && (
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded text-corp-teal font-medium">
                              {q.relatedProduct}
                            </span>
                          )}
                          <span>{new Date(q.createdAt).toLocaleString("tr-TR")}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          q.status === "NEW"
                            ? "bg-red-100 text-red-800"
                            : q.status === "CONTACTED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Handover Status Breakdown (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-corp-border rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-display font-bold text-sm text-corp-charcoal">
                Yönlendirme Durum Dağılımı
              </h3>

              <div className="space-y-3">
                {data.handoverStatusBreakdown.map((item: any) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-3 bg-slate-50 border border-corp-border rounded-xl"
                  >
                    <span className="text-xs font-semibold text-corp-charcoal">
                      {item.status === "NEW"
                        ? "Yeni / Aranacak"
                        : item.status === "IN_REVIEW"
                        ? "İnceleniyor"
                        : item.status === "CONTACTED"
                        ? "Müşteriyle İletişime Geçildi"
                        : item.status === "RESOLVED"
                        ? "Sonuçlandırıldı"
                        : "Kapatıldı"}
                    </span>
                    <span className="text-sm font-bold font-mono text-corp-teal">
                      {item.count}
                    </span>
                  </div>
                ))}

                {data.handoverStatusBreakdown.length === 0 && (
                  <p className="text-xs text-corp-gray text-center py-4">Henüz kayıt yok.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
