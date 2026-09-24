"use client";

import React, { useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

interface AddressModalProps {
  initialAddress?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddressModal({ initialAddress, onClose, onSuccess }: AddressModalProps) {
  const isEditing = Boolean(initialAddress?.id);

  const [formData, setFormData] = useState({
    title: initialAddress?.title || "Ev",
    firstName: initialAddress?.firstName || "",
    lastName: initialAddress?.lastName || "",
    phone: initialAddress?.phone || "",
    city: initialAddress?.city || "",
    district: initialAddress?.district || "",
    addressDetail: initialAddress?.addressDetail || "",
    zipCode: initialAddress?.zipCode || "",
    isDefault: initialAddress?.isDefault ?? false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = isEditing
        ? `/api/profile/addresses/${initialAddress.id}`
        : "/api/profile/addresses";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Adres kaydedilirken bir hata oluştu.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-corp-border shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 border-b border-corp-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-corp-teal/10 text-corp-teal flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <h3 className="font-display font-bold text-lg text-corp-charcoal">
              {isEditing ? "Adresi Düzenle" : "Yeni Adres Ekle"}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-corp-gray hover:text-corp-charcoal transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-lg bg-error/10 border border-error/25 text-error text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Adres Başlığı</label>
            <input
              type="text"
              required
              placeholder="Örn. Ev, İş, Yazlık"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Ad</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Soyad</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Telefon</label>
            <input
              type="tel"
              required
              placeholder="05XXXXXXXXX"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">İl (Şehir)</label>
              <input
                type="text"
                required
                placeholder="Örn. İstanbul"
                value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">İlçe</label>
              <input
                type="text"
                required
                placeholder="Örn. Kadıköy"
                value={formData.district}
                onChange={(e) => setFormData((prev) => ({ ...prev, district: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Açık Adres</label>
            <textarea
              required
              rows={3}
              placeholder="Mahalle, Cadde, Sokak, Bina No, Daire No"
              value={formData.addressDetail}
              onChange={(e) => setFormData((prev) => ({ ...prev, addressDetail: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal text-sm"
            />
          </div>

          <label className="flex items-center gap-2 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
              className="w-4 h-4 text-corp-teal focus:ring-corp-teal rounded"
            />
            <span className="text-xs font-semibold text-corp-charcoal">Varsayılan teslimat adresi olarak ayarla</span>
          </label>

          <div className="pt-4 flex justify-end gap-3 border-t border-corp-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-corp-border text-corp-gray font-bold text-xs hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 flex items-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? "Kaydet" : "Ekle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
