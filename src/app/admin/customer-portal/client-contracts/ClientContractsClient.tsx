"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Plus, X, Save, Loader2, Download, FileText, Calendar, User, Building2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Contract = {
  id: string;
  userId: string;
  title: string;
  fileUrl: string;
  status: string;
  signedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    companyTitle: string | null;
  };
};

const STATUSES = ["ALL", "draft", "sent", "signed"] as const;

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: "Taslak", color: "#6B7280", icon: FileText },
  sent: { label: "Gönderildi", color: "#F59E0B", icon: Clock },
  signed: { label: "İmzalandı", color: "#10B981", icon: CheckCircle2 },
};

export default function ClientContractsClient({ initialContracts }: { initialContracts: Contract[] }) {
  const [contracts, setContracts] = useState(initialContracts);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    userId: "",
    title: "",
    fileUrl: "",
    status: "draft",
  });

  const filtered = contracts.filter((contract) => {
    const statusMatch = filterStatus === "ALL" || contract.status === filterStatus;
    const searchMatch =
      !searchQuery ||
      contract.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.user.companyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.title.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.title.trim() || !formData.fileUrl.trim()) {
      toast.error("Müşteri, başlık ve dosya URL zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/customer-portal/client-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Sözleşme oluşturulamadı.");
      }

      setContracts((prev) => [data.contract, ...prev]);
      toast.success("Sözleşme oluşturuldu.");
      setModalOpen(false);
      setFormData({
        userId: "",
        title: "",
        fileUrl: "",
        status: "draft",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/customer-portal/client-contracts/${id}`, {
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
        setContracts((prev) => prev.map((contract) => (contract.id === id ? data.contract : contract)));
        toast.success("Sözleşme durumu güncellendi.");
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
          <Plus size={16} /> Yeni Sözleşme
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" />
          <input
            type="text"
            placeholder="Müşteri adı, sözleşme başlığı ara..."
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

      {/* Contracts table */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Müşteri", "Sözleşme Başlığı", "Durum", "İmza Tarihi", "Oluşturma", "İşlemler"].map((h) => (
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
                  <td colSpan={6} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((contract) => {
                  const st = STATUS_META[contract.status] || { label: contract.status, color: "#6B7280", icon: null };
                  const StatusIcon = st.icon;

                  return (
                    <tr
                      key={contract.id}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-body text-[14px] text-corp-charcoal font-semibold">
                            {contract.user.companyTitle || contract.user.name || contract.user.email}
                          </p>
                          <p className="font-body text-[12px] text-corp-gray-light">{contract.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body text-[14px] text-corp-charcoal">
                        {contract.title}
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
                        {contract.signedAt ? formatDate(contract.signedAt) : "-"}
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light">
                        {formatDate(contract.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={contract.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded transition-colors"
                            title="Dosyayı İndir"
                          >
                            <Download size={16} />
                          </a>
                          {contract.status !== "signed" && (
                            <button
                              onClick={() => handleUpdateStatus(contract.id, "signed")}
                              className="p-2 text-corp-gray hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="İmzalandı Olarak İşaretle"
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
      </div>

      {/* Create Contract Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Sözleşme Oluştur</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4">
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
                  Sözleşme Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: 2026 Hizmet Sözleşmesi"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Dosya URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={formData.fileUrl}
                  onChange={(e) => setFormData((f) => ({ ...f, fileUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
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
                  {saving ? "Kaydediliyor..." : "Sözleşmeyi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}