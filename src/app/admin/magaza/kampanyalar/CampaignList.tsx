"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Percent, X, Save, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Campaign {
  id: string;
  name: string;
  type: string;
  value?: number | null;
  couponCode?: string | null;
  minCartAmount?: number | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
}

interface CampaignListProps {
  initialCampaigns: Campaign[];
}

const EMPTY_FORM = {
  name: "",
  type: "PERCENTAGE",
  value: "",
  couponCode: "",
  minCartAmount: "",
  startsAt: "",
  endsAt: "",
};

export default function CampaignList({ initialCampaigns }: CampaignListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [loading, setLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Kampanya adı zorunludur.");
      return;
    }
    if (!formData.value) {
      toast.error("İndirim değeri zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        value: parseFloat(formData.value) || 0,
        isActive: true,
      };
      if (formData.couponCode.trim()) payload.couponCode = formData.couponCode.trim().toUpperCase();
      if (formData.minCartAmount) payload.minCartAmount = parseFloat(formData.minCartAmount);
      if (formData.startsAt) payload.startsAt = new Date(formData.startsAt).toISOString();
      if (formData.endsAt) payload.endsAt = new Date(formData.endsAt).toISOString();

      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Kayıt başarısız.");
      }

      const created = await res.json();
      setCampaigns((prev) => [created, ...prev]);
      toast.success("Kampanya oluşturuldu.");
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' kampanyasını silmek istediğinize emin misiniz?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        toast.success("Kampanya silindi.");
      } else {
        throw new Error("Silme işlemi başarısız.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentStatus } : c))
        );
        toast.success("Kampanya durumu güncellendi.");
      }
    } catch {
      toast.error("Hata oluştu.");
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Info Banner */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Kampanya Politikası</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Kampanyalar sadece bu panelden manuel olarak oluşturulabilir. Sistem otomatik kampanya atamaz.
              Kupon kodu olmayan kampanyalar sepet tutarına göre otomatik uygulanır.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={openModal}
            className="bg-corp-teal text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Yeni Kampanya
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-corp-border">
          <table className="w-full text-left">
            <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Kampanya Adı</th>
                <th className="p-4">Tip</th>
                <th className="p-4">Değer / Kod</th>
                <th className="p-4">Geçerlilik</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-border bg-white text-sm">
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-corp-gray">
                    Henüz kampanya oluşturulmadı.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                          <Percent size={14} />
                        </div>
                        <span className="font-bold text-corp-charcoal">{campaign.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-corp-gray font-medium">{campaign.type}</td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-corp-charcoal">
                          {campaign.couponCode || "Otomatik"}
                        </span>
                        <span className="text-[10px] text-corp-gray">
                          %{campaign.value} İndirim
                          {campaign.minCartAmount ? ` · Min. ${campaign.minCartAmount} TL` : ""}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-[11px] text-corp-gray">
                      {campaign.startsAt
                        ? new Date(campaign.startsAt).toLocaleDateString("tr-TR")
                        : "—"}{" "}
                      →{" "}
                      {campaign.endsAt
                        ? new Date(campaign.endsAt).toLocaleDateString("tr-TR")
                        : "Süresiz"}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(campaign.id, campaign.isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          campaign.isActive ? "bg-corp-teal" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            campaign.isActive ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(campaign.id, campaign.name)}
                        disabled={loading === campaign.id}
                        className="p-2 text-corp-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      >
                        {loading === campaign.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Campaign Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Kampanya</h2>
              <button
                onClick={closeModal}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Kampanya Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Yaz İndirimi 2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Tip</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((f) => ({ ...f, type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option value="PERCENTAGE">Yüzdesel (%)</option>
                    <option value="FIXED">Sabit Tutar (TL)</option>
                    <option value="CART_THRESHOLD">Sepet Eşiği</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    İndirim Değeri <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.value}
                    onChange={(e) => setFormData((f) => ({ ...f, value: e.target.value }))}
                    placeholder={formData.type === "PERCENTAGE" ? "15 (= %15)" : "100 (TL)"}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Kupon Kodu{" "}
                    <span className="text-corp-gray text-xs">(boş = otomatik)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.couponCode}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))
                    }
                    placeholder="YAZI20"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Min. Sepet Tutarı (TL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minCartAmount}
                    onChange={(e) => setFormData((f) => ({ ...f, minCartAmount: e.target.value }))}
                    placeholder="500"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Başlangıç Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startsAt}
                    onChange={(e) => setFormData((f) => ({ ...f, startsAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endsAt}
                    onChange={(e) => setFormData((f) => ({ ...f, endsAt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-corp-border">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Kaydediliyor..." : "Kampanya Oluştur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
