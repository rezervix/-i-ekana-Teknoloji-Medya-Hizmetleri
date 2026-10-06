"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Plus, X, Save, Loader2, Download, FileText, Calendar, User, Building2, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Report = {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  pdfUrl: string | null;
  summaryJson: any;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    companyTitle: string | null;
  };
};

export default function PerformanceReportsClient({ initialReports }: { initialReports: Report[] }) {
  const [reports, setReports] = useState(initialReports);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    projectId: "",
    title: "",
    periodStart: "",
    periodEnd: "",
    pdfUrl: "",
    summaryJson: "",
  });

  const [metrics, setMetrics] = useState<{ name: string; value: string }[]>([]);

  const filtered = reports.filter((report) => {
    const searchMatch =
      !searchQuery ||
      report.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.user.companyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const handleAddMetric = () => {
    setMetrics([...metrics, { name: "", value: "" }]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index: number, field: "name" | "value", value: string) => {
    const updated = [...metrics];
    updated[index][field] = value;
    setMetrics(updated);
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.title.trim() || !formData.periodStart || !formData.periodEnd) {
      toast.error("Müşteri, başlık ve dönem tarihleri zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const summaryJson = metrics.length > 0 ? metrics : null;

      const payload = {
        ...formData,
        projectId: formData.projectId || null,
        summaryJson,
      };

      const res = await fetch("/api/admin/customer-portal/performance-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Rapor oluşturulamadı.");
      }

      setReports((prev) => [data.report, ...prev]);
      toast.success("Rapor oluşturuldu.");
      setModalOpen(false);
      setFormData({
        userId: "",
        projectId: "",
        title: "",
        periodStart: "",
        periodEnd: "",
        pdfUrl: "",
        summaryJson: "",
      });
      setMetrics([]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-corp-teal text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 text-sm"
        >
          <Plus size={16} /> Yeni Rapor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" />
        <input
          type="text"
          placeholder="Müşteri adı, rapor başlığı ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
        />
      </div>

      {/* Reports table & cards */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Müşteri", "Rapor Başlığı", "Dönem", "PDF", "Oluşturma"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((report) => (
                  <tr
                    key={report.id}
                    className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-body text-[14px] text-corp-charcoal font-semibold">
                          {report.user.companyTitle || report.user.name || report.user.email}
                        </p>
                        <p className="font-body text-[12px] text-corp-gray-light">{report.user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-body text-[14px] text-corp-charcoal">
                      {report.title}
                    </td>
                    <td className="px-6 py-4 font-body text-[13px] text-corp-gray">
                      {formatDate(report.periodStart)} → {formatDate(report.periodEnd)}
                    </td>
                    <td className="px-6 py-4">
                      {report.pdfUrl ? (
                        <a
                          href={report.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-corp-teal hover:underline flex items-center gap-1 text-sm"
                        >
                          <Download size={14} /> İndir
                        </a>
                      ) : (
                        <span className="text-corp-gray-light text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light">
                      {formatDate(report.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-corp-border">
          {filtered.length === 0 ? (
            <div className="p-8 text-center font-body text-[14px] text-corp-gray">
              Kayıt bulunamadı.
            </div>
          ) : (
            filtered.map((report) => (
              <div key={report.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-corp-charcoal font-bold truncate">
                      {report.user.companyTitle || report.user.name || report.user.email}
                    </p>
                    <p className="font-body text-xs text-corp-gray truncate">{report.user.email}</p>
                  </div>
                  {report.pdfUrl && (
                    <a
                      href={report.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] px-3 py-1 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold shrink-0"
                    >
                      <Download size={13} /> PDF
                    </a>
                  )}
                </div>

                <p className="font-body text-sm text-corp-charcoal font-medium">
                  {report.title}
                </p>

                <div className="flex items-center justify-between text-[11px] text-corp-gray pt-1 border-t border-corp-border/50">
                  <span>Dönem: {formatDate(report.periodStart)} → {formatDate(report.periodEnd)}</span>
                  <span>{formatDate(report.createdAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Report Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Rapor Oluştur</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Müşteri E-posta <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData((f) => ({ ...f, userId: e.target.value }))}
                  placeholder="musteri@ornek.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Rapor Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Ocak 2026 Performans Raporu"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Dönem Başlangıç <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.periodStart}
                    onChange={(e) => setFormData((f) => ({ ...f, periodStart: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Dönem Bitiş <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.periodEnd}
                    onChange={(e) => setFormData((f) => ({ ...f, periodEnd: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  PDF URL
                </label>
                <input
                  type="url"
                  value={formData.pdfUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, pdfUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Metrikler (Opsiyonel)
                </label>
                <div className="space-y-2">
                  {metrics.map((metric, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={metric.name}
                        onChange={(e) => handleMetricChange(index, "name", e.target.value)}
                        placeholder="Metrik adı (örn: Ziyaretler)"
                        className="flex-1 px-3 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                      />
                      <input
                        type="text"
                        value={metric.value}
                        onChange={(e) => handleMetricChange(index, "value", e.target.value)}
                        placeholder="Değer (örn: 1250)"
                        className="w-32 px-3 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveMetric(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={handleAddMetric}
                    className="text-sm text-corp-teal hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Metrik Ekle
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-corp-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Kaydediliyor..." : "Raporu Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}