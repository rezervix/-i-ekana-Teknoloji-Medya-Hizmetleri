"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, X, GripVertical } from "lucide-react";
import { LogoUploader } from "@/components/admin/LogoUploader";
import { toast } from "sonner";

interface Client {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl: string | null;
  displayOrder: number;
  isActive: boolean;
}

export default function AdminPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", logoUrl: "", websiteUrl: "" });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/admin/clients?all=true");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Lütfen marka adını giriniz.");
      return;
    }
    if (!formData.logoUrl) {
      toast.error("Lütfen bir marka logosu yükleyiniz.");
      return;
    }

    try {
      const url = editingClient 
        ? `/api/admin/clients/${editingClient.id}`
        : "/api/admin/clients";
      const method = editingClient ? "PATCH" : "POST";
      
      const body = editingClient
        ? { ...formData, displayOrder: editingClient.displayOrder }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "İşlem sırasında bir hata oluştu.");
      }

      toast.success(editingClient ? "Marka başarıyla güncellendi." : "Yeni marka eklendi.");
      await fetchClients();
      setShowModal(false);
      setEditingClient(null);
      setFormData({ name: "", logoUrl: "", websiteUrl: "" });
    } catch (error: any) {
      console.error("Failed to save client:", error);
      toast.error(error.message || "Marka kaydedilirken bir hata oluştu.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu markayı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
      await fetchClients();
    } catch (error) {
      console.error("Failed to delete client:", error);
    }
  };

  const handleToggleActive = async (client: Client) => {
    try {
      await fetch(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !client.isActive }),
      });
      await fetchClients();
    } catch (error) {
      console.error("Failed to toggle client status:", error);
    }
  };

  const openModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, logoUrl: client.logoUrl, websiteUrl: client.websiteUrl || "" });
    } else {
      setEditingClient(null);
      setFormData({ name: "", logoUrl: "", websiteUrl: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClient(null);
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
        <h2 className="font-display text-xl font-bold text-corp-charcoal">Birlikte Çalıştığımız Markalar</h2>
        <button 
          onClick={() => openModal()}
          className="bg-corp-teal text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors"
        >
          <Plus size={16} /> Yeni Ekle
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-y border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="p-4 rounded-tl-lg">Sıra</th>
              <th className="p-4">Logo</th>
              <th className="p-4">Marka Adı</th>
              <th className="p-4">Web Sitesi</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right rounded-tr-lg">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corp-gray">Henüz kayıt bulunamadı.</td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-corp-surface/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-corp-gray">
                      <GripVertical size={16} />
                      {client.displayOrder}
                    </div>
                  </td>
                  <td className="p-4">
                    {client.logoUrl ? (
                      <div className="h-10 w-24 bg-white border border-corp-border/80 rounded-lg p-1.5 flex items-center justify-center shadow-xs">
                        <img src={client.logoUrl} alt={client.name} className="max-h-7 max-w-full object-contain mix-blend-multiply" />
                      </div>
                    ) : (
                      <div className="h-10 w-24 bg-corp-surface rounded-lg flex items-center justify-center text-corp-gray text-xs">
                        Logo Yok
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium text-corp-charcoal">{client.name}</td>
                  <td className="p-4">
                    {client.websiteUrl ? (
                      <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-corp-teal hover:underline text-sm">
                        {client.websiteUrl}
                      </a>
                    ) : (
                      <span className="text-corp-gray text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(client)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        client.isActive 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {client.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(client)}
                        className="p-2 hover:bg-corp-surface rounded-lg transition-colors text-corp-gray hover:text-corp-teal"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(client.id)}
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

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-corp-border">
        {clients.length === 0 ? (
          <div className="p-8 text-center text-corp-gray text-sm">Henüz kayıt bulunamadı.</div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="py-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  {client.logoUrl ? (
                    <div className="h-12 w-16 bg-white rounded-lg border border-corp-border/80 p-1 flex items-center justify-center shrink-0 shadow-xs">
                      <img src={client.logoUrl} alt={client.name} className="max-h-9 max-w-full object-contain mix-blend-multiply" />
                    </div>
                  ) : (
                    <div className="h-12 w-16 bg-corp-surface rounded-lg flex items-center justify-center text-corp-gray text-[10px] shrink-0 border border-corp-border">
                      Logo
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-corp-gray font-mono">#{client.displayOrder}</span>
                      <p className="font-semibold text-corp-charcoal text-sm truncate">{client.name}</p>
                    </div>
                    {client.websiteUrl && (
                      <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-corp-teal truncate block mt-0.5">
                        {client.websiteUrl}
                      </a>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(client)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 transition-colors ${
                    client.isActive 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {client.isActive ? "Aktif" : "Pasif"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-1 pt-1 border-t border-corp-border/50">
                <button
                  onClick={() => openModal(client)}
                  className="min-h-[38px] px-3 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                >
                  <Edit size={14} /> Düzenle
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="min-h-[38px] px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                >
                  <Trash2 size={14} /> Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-corp-border sticky top-0 bg-white z-10">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">
                {editingClient ? "Marka Düzenle" : "Yeni Marka Ekle"}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-corp-surface rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Marka Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="Örn: Microsoft"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-charcoal mb-1.5">
                  Marka Logosu <span className="text-red-500">*</span>
                </label>
                <LogoUploader
                  value={formData.logoUrl}
                  onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                />
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
                  {editingClient ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
