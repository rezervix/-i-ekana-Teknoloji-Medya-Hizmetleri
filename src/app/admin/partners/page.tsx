"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Upload, X, GripVertical } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing.client";
import type { OurFileRouter } from "@/lib/uploadthing.server";

interface Partner {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function AdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({ name: "", logoUrl: "", websiteUrl: "" });

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const res = await fetch("/api/admin/partners?all=true");
      const data = await res.json();
      setPartners(data);
    } catch (error) {
      console.error("Failed to fetch partners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPartner 
        ? `/api/admin/partners/${editingPartner.id}`
        : "/api/admin/partners";
      const method = editingPartner ? "PATCH" : "POST";
      
      const body = editingPartner
        ? { ...formData, displayOrder: editingPartner.displayOrder }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchPartners();
        setShowModal(false);
        setEditingPartner(null);
        setFormData({ name: "", logoUrl: "", websiteUrl: "" });
      }
    } catch (error) {
      console.error("Failed to save partner:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu iş ortağını silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/partners/${id}`, { method: "DELETE" });
      await fetchPartners();
    } catch (error) {
      console.error("Failed to delete partner:", error);
    }
  };

  const handleToggleActive = async (partner: Partner) => {
    try {
      await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !partner.isActive }),
      });
      await fetchPartners();
    } catch (error) {
      console.error("Failed to toggle partner status:", error);
    }
  };

  const openModal = (partner?: Partner) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({ name: partner.name, logoUrl: partner.logoUrl, websiteUrl: partner.websiteUrl || "" });
    } else {
      setEditingPartner(null);
      setFormData({ name: "", logoUrl: "", websiteUrl: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPartner(null);
    setFormData({ name: "", logoUrl: "", websiteUrl: "" });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div className="text-center text-corp-gray">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display text-xl font-bold text-corp-charcoal">Operasyonel İş Ortaklarımız</h2>
        <button 
          onClick={() => openModal()}
          className="bg-corp-teal text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors"
        >
          <Plus size={16} /> Yeni Ekle
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-y border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-4 rounded-tl-lg">Sıra</th>
              <th className="p-4">Logo</th>
              <th className="p-4">İş Ortağı Adı</th>
              <th className="p-4">Web Sitesi</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right rounded-tr-lg">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            {partners.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corp-gray">Henüz kayıt bulunamadı.</td>
              </tr>
            ) : (
              partners.map((partner) => (
                <tr key={partner.id} className="hover:bg-corp-surface/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-corp-gray">
                      <GripVertical size={16} />
                      {partner.displayOrder}
                    </div>
                  </td>
                  <td className="p-4">
                    {partner.logoUrl ? (
                      <img src={partner.logoUrl} alt={partner.name} className="h-8 w-auto object-contain" />
                    ) : (
                      <div className="h-8 w-8 bg-corp-surface rounded flex items-center justify-center text-corp-gray text-xs">
                        Logo Yok
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-corp-charcoal">{partner.name}</td>
                  <td className="p-4">
                    {partner.websiteUrl ? (
                      <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-corp-teal hover:underline text-sm">
                        {partner.websiteUrl}
                      </a>
                    ) : (
                      <span className="text-corp-gray text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(partner)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        partner.isActive 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {partner.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(partner)}
                        className="p-2 hover:bg-corp-surface rounded-lg transition-colors text-corp-gray hover:text-corp-teal"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors text-corp-gray hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-corp-border">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">
                {editingPartner ? "İş Ortağı Düzenle" : "Yeni İş Ortağı Ekle"}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-corp-surface rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">İş Ortağı Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="Örn: AWS"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Logo URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="flex-1 px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                    placeholder="https://..."
                  />
                  <UploadButton<"logoUploader">
                    endpoint="logoUploader"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) {
                        setFormData({ ...formData, logoUrl: res[0].url });
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error);
                    }}
                    className="px-4 py-2 bg-corp-surface border border-corp-border rounded-lg hover:bg-corp-teal hover:text-white hover:border-corp-teal transition-colors"
                  />
                </div>
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo preview" className="mt-2 h-12 w-auto object-contain" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Web Sitesi</label>
                <input
                  type="text"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-corp-border rounded-lg font-medium hover:bg-corp-surface transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-corp-teal text-white rounded-lg font-medium hover:bg-corp-teal-600 transition-colors"
                >
                  {editingPartner ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
