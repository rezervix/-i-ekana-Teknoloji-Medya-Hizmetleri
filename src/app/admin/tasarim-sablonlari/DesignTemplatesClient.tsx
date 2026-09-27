"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Search, X, Save, Upload, Image as ImageIcon, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing.client";

interface DesignTemplate {
  id: string;
  productId: string | null;
  subcategory: string | null;
  nicheLabels: string[];
  frontImage: string | null;
  backImage: string | null;
  frontImageUrl: string | null;
  backImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    category: string;
  } | null;
}

interface Product {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
}

interface DesignTemplatesClientProps {
  initialTemplates: DesignTemplate[];
  products: Product[];
}

const EMPTY_FORM = {
  productId: "",
  subcategory: "",
  nicheLabels: [] as string[],
  frontImage: "",
  backImage: "",
  frontImageUrl: "",
  backImageUrl: "",
  isActive: true,
};

export default function DesignTemplatesClient({ initialTemplates, products }: DesignTemplatesClientProps) {
  const [templates, setTemplates] = useState<DesignTemplate[]>(initialTemplates);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DesignTemplate | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [nicheInput, setNicheInput] = useState("");
  const [uploadingTarget, setUploadingTarget] = useState<"front" | "back" | null>(null);

  // Extract unique subcategories from products list
  const subcategories = Array.from(
    new Set(products.map((p) => p.subcategory).filter(Boolean))
  ) as string[];

  const { startUpload, isUploading } = useUploadThing("templateImageUploader", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const url = res[0].url;
        if (uploadingTarget === "front") {
          setFormData((f) => ({ ...f, frontImage: url, frontImageUrl: url }));
          toast.success("Ön görsel yüklendi");
        } else if (uploadingTarget === "back") {
          setFormData((f) => ({ ...f, backImage: url, backImageUrl: url }));
          toast.success("Arka görsel yüklendi");
        }
        setUploadingTarget(null);
      }
    },
    onUploadError: (error) => {
      toast.error("Görsel yükleme hatası: " + error.message);
      setUploadingTarget(null);
    },
  });

  const openNewModal = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setModalOpen(true);
    setUploadingTarget(null);
  };

  const openEditModal = (template: DesignTemplate) => {
    setEditTarget(template);
    setFormData({
      productId: template.productId || "",
      subcategory: template.subcategory || "",
      nicheLabels: template.nicheLabels,
      frontImage: template.frontImage || template.frontImageUrl || "",
      backImage: template.backImage || template.backImageUrl || "",
      frontImageUrl: template.frontImageUrl || template.frontImage || "",
      backImageUrl: template.backImageUrl || template.backImage || "",
      isActive: template.isActive,
    });
    setModalOpen(true);
    setUploadingTarget(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setNicheInput("");
    setUploadingTarget(null);
  };

  const handleSave = async () => {
    if (!formData.productId && !formData.subcategory) {
      toast.error("Lütfen bir Ürün veya Alt Kategori seçin.");
      return;
    }
    const frontImg = formData.frontImageUrl || formData.frontImage;
    if (!frontImg) {
      toast.error("Ön görsel zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        productId: formData.productId || null,
        subcategory: formData.subcategory || null,
        nicheLabels: formData.nicheLabels,
        frontImage: frontImg,
        backImage: formData.backImageUrl || formData.backImage || null,
        frontImageUrl: formData.frontImageUrl || frontImg,
        backImageUrl: formData.backImageUrl || formData.backImage || null,
        isActive: formData.isActive,
      };

      if (editTarget) {
        const res = await fetch(`/api/admin/design-templates/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Güncelleme başarısız.");
        }
        const updated = await res.json();
        setTemplates((prev) =>
          prev.map((t) => (t.id === editTarget.id ? updated : t))
        );
        toast.success("Şablon güncellendi.");
      } else {
        const res = await fetch("/api/admin/design-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Ekleme başarısız.");
        }
        const created = await res.json();
        setTemplates((prev) => [created, ...prev]);
        toast.success("Şablon eklendi.");
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' şablonunu silmek istediğinize emin misiniz?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/design-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        toast.success("Şablon silindi.");
      } else {
        const data = await res.json();
        throw new Error(data.error || "Silme işlemi başarısız.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const addNicheLabel = () => {
    if (nicheInput.trim()) {
      setFormData((f) => ({
        ...f,
        nicheLabels: [...f.nicheLabels, nicheInput.trim()],
      }));
      setNicheInput("");
    }
  };

  const removeNicheLabel = (index: number) => {
    setFormData((f) => ({
      ...f,
      nicheLabels: f.nicheLabels.filter((_, i) => i !== index),
    }));
  };

  const filteredTemplates = templates.filter(
    (t) =>
      (t.product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.subcategory || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.nicheLabels.some((label) => label.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-corp-charcoal">Tasarım Şablonları</h1>
          <p className="text-corp-gray mt-1">Ürünler veya alt kategoriler için tasarım şablonlarını yönetin</p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-corp-teal text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95"
        >
          <Plus size={20} /> Yeni Şablon
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-corp-border p-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" size={18} />
          <input
            type="text"
            placeholder="Şablon veya alt kategori ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/20"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredTemplates.map((template) => {
          const displayName = template.product?.name || `${template.subcategory} (Alt Kategori)`;
          const displayCategory = template.product?.category || "Baski";
          const frontImgSrc = template.frontImageUrl || template.frontImage || "";
          
          return (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-corp-border overflow-hidden hover:shadow-lg transition-all group"
            >
              <div className="aspect-[4/3] bg-gray-50 relative">
                <img
                  src={frontImgSrc}
                  alt={displayName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Görsel+Yok";
                  }}
                />
                {!template.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">Pasif</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-corp-charcoal mb-1 truncate">{displayName}</h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {template.nicheLabels.slice(0, 2).map((label, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-corp-teal/10 text-corp-teal px-2 py-0.5 rounded-full"
                    >
                      {label}
                    </span>
                  ))}
                  {template.nicheLabels.length > 2 && (
                    <span className="text-[10px] text-corp-gray">+{template.nicheLabels.length - 2}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-corp-gray">{displayCategory}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(template)}
                      className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-all"
                      title="Düzenle"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id, displayName)}
                      disabled={loading === template.id}
                      className="p-2 text-corp-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                      title="Sil"
                    >
                      {loading === template.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-corp-border">
          <ImageIcon className="w-16 h-16 text-corp-border mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-corp-charcoal mb-2">Şablon Bulunamadı</h3>
          <p className="text-corp-gray">Henüz tasarım şablonu eklenmemiş.</p>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">
                {editTarget ? "Şablonu Düzenle" : "Yeni Şablon Ekle"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Ürün Seçimi
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((f) => ({ ...f, productId: val, subcategory: val ? "" : f.subcategory }));
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option value="">Ürün seçin (opsiyonel)</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Alt Kategori Seçimi
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={subcategories.includes(formData.subcategory) ? formData.subcategory : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((f) => ({ ...f, subcategory: val, productId: val ? "" : f.productId }));
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                    >
                      <option value="">Alt kategori seçin (opsiyonel)</option>
                      {subcategories.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Veya yeni yazın..."
                      value={!subcategories.includes(formData.subcategory) ? formData.subcategory : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((f) => ({ ...f, subcategory: val, productId: val ? "" : f.productId }));
                      }}
                      className="w-32 px-3 py-2 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">Niche Etiketleri</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addNicheLabel())}
                    placeholder="Etiket girin ve Enter'a basın"
                    className="flex-1 px-4 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addNicheLabel}
                    className="px-4 py-2 bg-corp-teal text-white rounded-lg font-semibold hover:bg-corp-teal-600 transition-all"
                  >
                    Ekle
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.nicheLabels.map((label, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-corp-teal/10 text-corp-teal px-3 py-1 rounded-full text-sm"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeNicheLabel(index)}
                        className="hover:text-red-500"
                      >
                        <XCircle size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                  Ön Görsel <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-corp-border rounded-xl p-6 text-center hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingTarget("front");
                        startUpload([file]);
                      }
                    }}
                    className="hidden"
                    id="front-image-upload"
                  />
                  <label htmlFor="front-image-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-corp-gray mb-2" />
                    <p className="text-sm text-corp-gray">
                      <span className="font-semibold text-corp-teal">Ön görsel seçin</span>
                    </p>
                  </label>
                </div>
                {(formData.frontImageUrl || formData.frontImage) && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-corp-border">
                    <img 
                      src={formData.frontImageUrl || formData.frontImage} 
                      alt="Ön görsel" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Görsel+Yok";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, frontImage: "", frontImageUrl: "" }))}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-2">Arka Görsel</label>
                <div className="border-2 border-dashed border-corp-border rounded-xl p-6 text-center hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadingTarget("back");
                        startUpload([file]);
                      }
                    }}
                    className="hidden"
                    id="back-image-upload"
                  />
                  <label htmlFor="back-image-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-corp-gray mb-2" />
                    <p className="text-sm text-corp-gray">
                      <span className="font-semibold text-corp-teal">Arka görsel seçin</span> (opsiyonel)
                    </p>
                  </label>
                </div>
                {(formData.backImageUrl || formData.backImage) && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-corp-border">
                    <img 
                      src={formData.backImageUrl || formData.backImage} 
                      alt="Arka görsel" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Görsel+Yok";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, backImage: "", backImageUrl: "" }))}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((f) => ({ ...f, isActive: e.target.checked }))}
                    className="w-5 h-5 rounded border-corp-border text-corp-teal focus:ring-corp-teal"
                  />
                  <span className="text-sm font-semibold text-corp-charcoal">Aktif</span>
                </label>
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
                disabled={saving || isUploading}
                className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
              >
                {saving || isUploading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {isUploading ? "Görsel Yükleniyor..." : saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
