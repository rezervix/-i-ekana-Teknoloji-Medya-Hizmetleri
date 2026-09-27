"use client";

import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Upload, X, GripVertical } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing.client";
import type { OurFileRouter } from "@/lib/uploadthing.server";

interface Service {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  shortDesc: string | null;
  revealImage1: string | null;
  revealImage2: string | null;
  displayOrder: number;
  isActive: boolean;
  status: string;
}

export default function AdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ 
    name: "", 
    slug: "", 
    iconName: "Zap",
    shortDesc: "",
    revealImage1: "", 
    revealImage2: "" 
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/admin/services?all=true");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Failed to fetch services:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingService 
        ? `/api/admin/services/${editingService.id}`
        : "/api/admin/services";
      const method = editingService ? "PATCH" : "POST";
      
      const body = editingService
        ? { ...formData, displayOrder: editingService.displayOrder }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchServices();
        setShowModal(false);
        setEditingService(null);
        setFormData({ name: "", slug: "", iconName: "Zap", shortDesc: "", revealImage1: "", revealImage2: "" });
      }
    } catch (error) {
      console.error("Failed to save service:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu hizmeti silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
      await fetchServices();
    } catch (error) {
      console.error("Failed to delete service:", error);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await fetch(`/api/admin/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      await fetchServices();
    } catch (error) {
      console.error("Failed to toggle service status:", error);
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({ 
        name: service.name, 
        slug: service.slug, 
        iconName: service.iconName,
        shortDesc: service.shortDesc || "",
        revealImage1: service.revealImage1 || "", 
        revealImage2: service.revealImage2 || "" 
      });
    } else {
      setEditingService(null);
      setFormData({ name: "", slug: "", iconName: "Zap", shortDesc: "", revealImage1: "", revealImage2: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    setFormData({ name: "", slug: "", iconName: "Zap", shortDesc: "", revealImage1: "", revealImage2: "" });
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
        <h2 className="font-display text-xl font-bold text-corp-charcoal">Hizmet Yönetimi (Reveal Images)</h2>
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
              <th className="p-4">Hizmet Adı</th>
              <th className="p-4">Slug</th>
              <th className="p-4">Görseller</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right rounded-tr-lg">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            {services.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corp-gray">Henüz kayıt bulunamadı.</td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id} className="hover:bg-corp-surface/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-corp-gray">
                      <GripVertical size={16} />
                      {service.displayOrder}
                    </div>
                  </td>
                  <td className="p-4 font-medium text-corp-charcoal">{service.name}</td>
                  <td className="p-4">
                    <span className="text-corp-gray text-sm font-mono">{service.slug}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {service.revealImage1 && (
                        <img src={service.revealImage1} alt="Görsel 1" className="h-8 w-8 object-cover rounded" />
                      )}
                      {service.revealImage2 && (
                        <img src={service.revealImage2} alt="Görsel 2" className="h-8 w-8 object-cover rounded" />
                      )}
                      {!service.revealImage1 && !service.revealImage2 && (
                        <span className="text-corp-gray text-xs">Görsel yok</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        service.isActive 
                          ? "bg-green-100 text-green-700" 
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {service.isActive ? "Aktif" : "Pasif"}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openModal(service)}
                        className="p-2 hover:bg-corp-surface rounded-lg transition-colors text-corp-gray hover:text-corp-teal"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-corp-border sticky top-0 bg-white">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">
                {editingService ? "Hizmet Düzenle" : "Yeni Hizmet Ekle"}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-corp-surface rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Hizmet Adı *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="Örn: Yapay Zeka & Otomasyon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="yapay-zeka-otomasyon"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Kısa Açıklama</label>
                <textarea
                  value={formData.shortDesc}
                  onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                  className="w-full px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                  placeholder="Hizmetin kısa açıklaması..."
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Görsel 1 URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.revealImage1}
                    onChange={(e) => setFormData({ ...formData, revealImage1: e.target.value })}
                    className="flex-1 px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                    placeholder="https://..."
                  />
                  <UploadButton<OurFileRouter>
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) {
                        setFormData({ ...formData, revealImage1: res[0].url });
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error);
                    }}
                  >
                    {({ onClick }) => (
                      <button
                        type="button"
                        onClick={onClick}
                        className="px-4 py-2 bg-corp-surface border border-corp-border rounded-lg hover:bg-corp-teal hover:text-white hover:border-corp-teal transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                      </button>
                    )}
                  </UploadButton>
                </div>
                {formData.revealImage1 && (
                  <img src={formData.revealImage1} alt="Görsel 1 preview" className="mt-2 h-12 w-auto object-contain" />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-corp-gray mb-2">Görsel 2 URL *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.revealImage2}
                    onChange={(e) => setFormData({ ...formData, revealImage2: e.target.value })}
                    className="flex-1 px-4 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal"
                    placeholder="https://..."
                  />
                  <UploadButton<OurFileRouter>
                    endpoint="imageUploader"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]?.url) {
                        setFormData({ ...formData, revealImage2: res[0].url });
                      }
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error);
                    }}
                  >
                    {({ onClick }) => (
                      <button
                        type="button"
                        onClick={onClick}
                        className="px-4 py-2 bg-corp-surface border border-corp-border rounded-lg hover:bg-corp-teal hover:text-white hover:border-corp-teal transition-colors flex items-center gap-2"
                      >
                        <Upload size={16} />
                      </button>
                    )}
                  </UploadButton>
                </div>
                {formData.revealImage2 && (
                  <img src={formData.revealImage2} alt="Görsel 2 preview" className="mt-2 h-12 w-auto object-contain" />
                )}
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
                  {editingService ? "Güncelle" : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
