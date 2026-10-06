"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Plus, X, Save, Loader2, Download, Receipt, Calendar, User, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Invoice = {
  id: string;
  userId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  issueDate: Date;
  dueDate: Date;
  pdfUrl: string | null;
  relatedProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    companyTitle: string | null;
  };
};

const STATUSES = ["ALL", "paid", "pending", "overdue"] as const;

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  paid: { label: "Ödendi", color: "#10B981", icon: CheckCircle2 },
  pending: { label: "Bekliyor", color: "#F59E0B", icon: Clock },
  overdue: { label: "Gecikmiş", color: "#EF4444", icon: AlertCircle },
};

export default function ClientInvoicesClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    invoiceNumber: "",
    amount: "",
    currency: "TRY",
    status: "pending",
    issueDate: "",
    dueDate: "",
    pdfUrl: "",
    relatedProjectId: "",
  });

  const filtered = invoices.filter((invoice) => {
    const statusMatch = filterStatus === "ALL" || invoice.status === filterStatus;
    const searchMatch =
      !searchQuery ||
      invoice.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.user.companyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.invoiceNumber.trim() || !formData.amount || !formData.issueDate || !formData.dueDate) {
      toast.error("Müşteri, fatura numarası, tutar ve tarihler zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        relatedProjectId: formData.relatedProjectId || null,
      };

      const res = await fetch("/api/admin/customer-portal/client-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Fatura oluşturulamadı.");
      }

      setInvoices((prev) => [data.invoice, ...prev]);
      toast.success("Fatura oluşturuldu.");
      setModalOpen(false);
      setFormData({
        userId: "",
        invoiceNumber: "",
        amount: "",
        currency: "TRY",
        status: "pending",
        issueDate: "",
        dueDate: "",
        pdfUrl: "",
        relatedProjectId: "",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/customer-portal/client-invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Güncelleme başarısız.");
      }

      const data = await res.json();
      if (data.success) {
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? data.invoice : inv)));
        toast.success("Fatura durumu güncellendi.");
      }
    } catch (error: any) {
      toast.error(error.message);
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
          <Plus size={16} /> Yeni Fatura
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" />
          <input
            type="text"
            placeholder="Müşteri adı, fatura numarası ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "Tüm Durumlar" : STATUS_META[s]?.label || s}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices table & cards */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Müşteri", "Fatura No", "Tutar", "Durum", "Vade Tarihi", "Ödeme Tarihi", "İşlemler"].map((h) => (
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
                  <td colSpan={7} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((invoice) => {
                  const st = STATUS_META[invoice.status] || { label: invoice.status, color: "#6B7280", icon: null };
                  const StatusIcon = st.icon;

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-body text-[14px] text-corp-charcoal font-semibold">
                            {invoice.user.companyTitle || invoice.user.name || invoice.user.email}
                          </p>
                          <p className="font-body text-[12px] text-corp-gray-light">{invoice.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body text-[14px] text-corp-charcoal font-semibold">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 font-body text-[14px] text-corp-charcoal font-semibold">
                        {invoice.currency} {parseFloat(invoice.amount as any).toLocaleString("tr-TR")}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-[11px] font-bold flex items-center gap-1.5 w-fit"
                          style={{
                            background: `${st.color}14`,
                            color: st.color,
                            border: `1px solid ${st.color}30`,
                          }}
                        >
                          {StatusIcon && <StatusIcon size={12} />}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light">
                        {invoice.status === "paid" ? formatDate(invoice.updatedAt) : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded transition-colors"
                              title="PDF İndir"
                            >
                              <Download size={16} />
                            </a>
                          )}
                          {invoice.status !== "paid" && (
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, "paid")}
                              className="p-2 text-corp-gray hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Ödendi Olarak İşaretle"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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
            filtered.map((invoice) => {
              const st = STATUS_META[invoice.status] || { label: invoice.status, color: "#6B7280", icon: null };
              const StatusIcon = st.icon;

              return (
                <div key={invoice.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body text-sm text-corp-charcoal font-bold truncate">
                        {invoice.user.companyTitle || invoice.user.name || invoice.user.email}
                      </p>
                      <p className="font-body text-xs text-corp-gray truncate">{invoice.user.email}</p>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full font-body text-[10px] font-bold flex items-center gap-1 shrink-0"
                      style={{
                        background: `${st.color}14`,
                        color: st.color,
                        border: `1px solid ${st.color}30`,
                      }}
                    >
                      {StatusIcon && <StatusIcon size={11} />}
                      {st.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-corp-border/50">
                    <span className="text-corp-gray font-mono">{invoice.invoiceNumber}</span>
                    <span className="font-bold text-corp-charcoal text-sm">
                      {invoice.currency} {parseFloat(invoice.amount as any).toLocaleString("tr-TR")}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-corp-gray">
                    <span>Vade: {formatDate(invoice.dueDate)}</span>
                    {invoice.status === "paid" && (
                      <span className="text-emerald-600 font-medium">Ödendi: {formatDate(invoice.updatedAt)}</span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-corp-border/50">
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[40px] px-3 py-1.5 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Download size={14} /> PDF
                      </a>
                    )}
                    {invoice.status !== "paid" && (
                      <button
                        onClick={() => handleUpdateStatus(invoice.id, "paid")}
                        className="min-h-[40px] px-3 py-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                      >
                        <CheckCircle2 size={14} /> Ödendi İşaretle
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Fatura Oluştur</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Fatura Numarası <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData((f) => ({ ...f, invoiceNumber: e.target.value }))}
                    placeholder="FTR-2026-001"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Tutar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="1000.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Para Birimi</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((f) => ({ ...f, currency: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    {STATUSES.filter((s) => s !== "ALL").map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s]?.label || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Kesim Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={(e) => setFormData((f) => ({ ...f, issueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Vade Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dueDate}
                    onChange={(e) => setFormData((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">PDF URL</label>
                <input
                  type="url"
                  value={formData.pdfUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, pdfUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">İlişkili Proje ID</label>
                <input
                  type="text"
                  value={formData.relatedProjectId}
                  onChange={(e) => setFormData((f) => ({ ...f, relatedProjectId: e.target.value }))}
                  placeholder="Proje ID (opsiyonel)"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
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
                  {saving ? "Kaydediliyor..." : "Faturayı Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}