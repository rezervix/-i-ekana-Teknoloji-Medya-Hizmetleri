"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Loader2, Search, X, Save, Upload, Image as ImageIcon, XCircle, ChevronDown, ChevronUp, Tag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUploadThing } from "@/lib/uploadthing.client";
import type { VariantDimension } from "@/types/product";
import { isNewFormat, isLegacyVariantsFormat } from "@/types/product";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number | null;
  isActive: boolean;
  images: string[];
  description?: string;
  customizationOptions?: any;
  photoToDesignFee?: number | null;
}

interface ProductListProps {
  initialProducts: Product[];
}

const EMPTY_FORM = {
  name: "",
  category: "Medya",
  subcategory: "",
  price: "",
  stock: "",
  photoToDesignFee: "",
  description: "",
  images: [] as string[],
  // Yeni format: variantDimensions düzenlenebilir
  variantDimensions: [] as VariantDimension[],
  // Eski format: basit varyant listesi
  variants: [] as Array<{ quantity: number; material: string; salePrice: number }>,
};

// ─── Chip/Tag Input — tek bir dimension'ın options listesini düzenler ─────────

function DimensionOptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (newOptions: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");

  const addOption = () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;
    if (options.includes(trimmed)) {
      toast.error("Bu seçenek zaten mevcut.");
      return;
    }
    onChange([...options, trimmed]);
    setInputVal("");
  };

  const removeOption = (opt: string) => {
    onChange(options.filter((o) => o !== opt));
  };

  return (
    <div className="space-y-2">
      {/* Mevcut chip'ler */}
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {options.map((opt) => (
          <span
            key={opt}
            className="inline-flex items-center gap-1 bg-corp-teal/10 text-corp-teal text-xs font-semibold px-2.5 py-1 rounded-full"
          >
            {opt}
            <button
              type="button"
              onClick={() => removeOption(opt)}
              className="text-corp-teal/60 hover:text-red-500 transition-colors"
              title={`"${opt}" seçeneğini kaldır`}
            >
              <X size={11} />
            </button>
          </span>
        ))}
        {options.length === 0 && (
          <span className="text-xs text-corp-gray italic">Henüz seçenek yok</span>
        )}
      </div>
      {/* Yeni seçenek ekleme */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addOption();
            }
          }}
          placeholder="Yeni seçenek..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-corp-border text-xs focus:outline-none focus:ring-2 focus:ring-corp-teal/30"
        />
        <button
          type="button"
          onClick={addOption}
          className="px-3 py-1.5 rounded-lg bg-corp-teal text-white text-xs font-semibold hover:bg-corp-teal-600 transition-colors"
        >
          Ekle
        </button>
      </div>
    </div>
  );
}

// ─── Ana Bileşen ─────────────────────────────────────────────────────────────

export default function ProductList({ initialProducts }: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // Hangi dimension accordion'u açık
  const [expandedDimIdx, setExpandedDimIdx] = useState<number | null>(null);
  const router = useRouter();

  const { startUpload, isUploading } = useUploadThing("productImageUploader", {
    onClientUploadComplete: (res) => {
      if (res && res.length > 0) {
        const newUrls = res.map((file: any) => file.ufsUrl || file.url);
        setFormData((f) => ({ ...f, images: [...f.images, ...newUrls] }));
        toast.success(`${res.length} görsel yüklendi`);
      }
    },
    onUploadError: (error) => {
      toast.error("Görsel yükleme hatası: " + error.message);
    },
  });

  const openNewModal = () => {
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setExpandedDimIdx(null);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditTarget(product);
    const opts = product.customizationOptions;

    let variantDimensions: VariantDimension[] = [];
    let variants: Array<{ quantity: number; material: string; salePrice: number }> = [];

    if (isNewFormat(opts)) {
      variantDimensions = opts.variantDimensions.map((d: VariantDimension) => ({ ...d }));
    } else if (isLegacyVariantsFormat(opts)) {
      variants = opts.variants.map((v: any) => ({
        quantity: v.quantity ?? 0,
        material: v.material ?? "",
        salePrice: v.salePrice ?? 0,
      }));
    }

    setFormData({
      name: product.name,
      category: product.category,
      subcategory: product.subcategory || "",
      price: String(product.price),
      stock: product.stock != null ? String(product.stock) : "",
      photoToDesignFee: product.photoToDesignFee != null ? String(product.photoToDesignFee) : "",
      description: product.description || "",
      images: product.images || [],
      variantDimensions,
      variants,
    });
    setExpandedDimIdx(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setExpandedDimIdx(null);
  };

  // Dimension label değişimi → autoDetected = false
  const updateDimensionLabel = (idx: number, label: string) => {
    setFormData((f) => {
      const dims = [...f.variantDimensions];
      dims[idx] = { ...dims[idx], label, autoDetected: false };
      return { ...f, variantDimensions: dims };
    });
  };

  // Dimension options değişimi
  const updateDimensionOptions = (idx: number, options: string[]) => {
    setFormData((f) => {
      const dims = [...f.variantDimensions];
      dims[idx] = { ...dims[idx], options };
      return { ...f, variantDimensions: dims };
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      // customizationOptions yeniden oluştur
      let customizationOptions: any;
      if (formData.variantDimensions.length > 0 && editTarget) {
        // Mevcut priceMatrix'i koru, sadece variantDimensions'ı güncelle
        const existingOpts = editTarget.customizationOptions;
        const existingMatrix = isNewFormat(existingOpts) ? existingOpts.priceMatrix : [];
        customizationOptions = {
          variantDimensions: formData.variantDimensions,
          priceMatrix: existingMatrix,
        };
      } else if (formData.variants.length > 0) {
        customizationOptions = { variants: formData.variants };
      } else {
        customizationOptions = undefined;
      }

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        price: parseFloat(formData.price) || 0,
        stock: formData.stock !== "" ? parseInt(formData.stock) : null,
        photoToDesignFee: formData.photoToDesignFee !== "" ? parseFloat(formData.photoToDesignFee) : null,
        description: formData.description.trim() || undefined,
        images: formData.images,
        customizationOptions,
      };

      if (editTarget) {
        const res = await fetch(`/api/admin/products/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Güncelleme başarısız.");
        }
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === editTarget.id ? { ...p, ...updated } : p))
        );
        toast.success("Ürün güncellendi.");
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || "Ekleme başarısız.");
        }
        const created = await res.json();
        setProducts((prev) => [created, ...prev]);
        toast.success("Ürün eklendi.");
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`'${name}' ürününü silmek istediğinize emin misiniz?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success("Ürün silindi.");
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

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isActive: !currentStatus } : p))
        );
        toast.success("Durum güncellendi.");
      }
    } catch {
      toast.error("Güncelleme hatası.");
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        {/* Filters & Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-corp-surface p-4 rounded-xl border border-corp-border">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" size={16} />
            <input
              type="text"
              placeholder="Ürün veya kategori ara..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={openNewModal}
            className="bg-corp-teal text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> Yeni Ürün Ekle
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-corp-border">
          <table className="w-full text-left">
            <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4">Ürün</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Fiyat</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-border bg-white text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-corp-gray italic">
                    Ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-corp-teal/5 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg border border-corp-border overflow-hidden bg-gray-50 flex-shrink-0">
                          <img
                            src={product.images[0] || "https://placehold.co/100x100"}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/100x100?text=Görsel+Yok";
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-corp-charcoal">{product.name}</span>
                          <span className="text-[11px] text-corp-gray font-mono">
                            {product.slug}
                          </span>
                          {/* Varyant bilgisi göster */}
                          {isNewFormat(product.customizationOptions) && (
                            <span className="text-[10px] text-corp-teal font-semibold mt-0.5">
                              {product.customizationOptions.variantDimensions.length} boyut •{" "}
                              {product.customizationOptions.priceMatrix.length} kombinasyon
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[11px] font-bold uppercase tracking-tight">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-4 font-display font-bold text-corp-charcoal">
                      {product.price.toLocaleString("tr-TR")}{" "}
                      <span className="text-[10px] text-corp-gray">TL</span>
                    </td>
                    <td className="p-4">
                      <span className={`font-medium ${product.stock === 0 ? "text-red-500" : "text-corp-charcoal"}`}>
                        {product.stock != null ? product.stock : "∞"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleStatus(product.id, product.isActive)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          product.isActive ? "bg-corp-teal" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            product.isActive ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-all"
                          title="Düzenle"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, product.name)}
                          disabled={loading === product.id}
                          className="p-2 text-corp-gray hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                          title="Sil"
                        >
                          {loading === product.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">
                {editTarget ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Ürün Adı */}
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Ürün Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Örn: Kurumsal Broşür Tasarımı"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              {/* Kategori & Alt Kategori */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option value="Medya">Medya</option>
                    <option value="Teknoloji">Teknoloji</option>
                    <option value="Baski">Kurumsal Kimlik &amp; Baskı</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Alt Kategori
                  </label>
                  <input
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, subcategory: e.target.value }))
                    }
                    placeholder="Örn: Sosyal Medya"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              {/* Fiyat & Stok & Fotoğraftan Tasarım Ücreti */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Stok <span className="text-corp-gray text-xs">(boş = sınırsız)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))}
                    placeholder="Sınırsız"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Fotoğraftan Tasarım (TL)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.photoToDesignFee}
                    onChange={(e) => setFormData((f) => ({ ...f, photoToDesignFee: e.target.value }))}
                    placeholder="Varsayılan: 500"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              {/* Açıklama */}
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Açıklama
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Ürün açıklaması..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                />
              </div>

              {/* Görseller */}
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                  Ürün Görselleri
                </label>

                <div className="border-2 border-dashed border-corp-border rounded-xl p-6 text-center hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer mb-4">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) startUpload(files);
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-8 w-8 text-corp-gray mb-2" />
                    <p className="text-sm text-corp-gray">
                      <span className="font-semibold text-corp-teal">Dosya seçin</span> veya
                      sürükleyip bırakın
                    </p>
                    <p className="text-xs text-corp-gray mt-1">PNG, JPG, GIF, WebP (max 8MB)</p>
                  </label>
                </div>

                {formData.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-3">
                    {formData.images.map((url, index) => (
                      <div
                        key={index}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-corp-border"
                      >
                        <img
                          src={url}
                          alt={`Görsel ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://placehold.co/100x100?text=Görsel+Yok";
                          }}
                        />
                        <button
                          onClick={() => {
                            setFormData((f) => ({
                              ...f,
                              images: f.images.filter((_, i) => i !== index),
                            }));
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── YENİ FORMAT: Varyant Boyutları (CSV'den gelen ürünlerde görünür) ─ */}
              {formData.variantDimensions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag size={15} className="text-corp-teal" />
                    <span className="text-sm font-semibold text-corp-charcoal">
                      Varyant Boyutları
                    </span>
                    <span className="text-xs text-corp-gray ml-auto">
                      {formData.variantDimensions.length} boyut
                    </span>
                  </div>

                  <div className="space-y-2">
                    {formData.variantDimensions.map((dim, idx) => (
                      <div
                        key={dim.key}
                        className="border border-corp-border rounded-xl overflow-hidden"
                      >
                        {/* Accordion başlığı */}
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDimIdx(expandedDimIdx === idx ? null : idx)
                          }
                          className="w-full flex items-center justify-between px-4 py-3 bg-corp-surface hover:bg-corp-teal/5 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-mono text-corp-gray flex-shrink-0">
                              [{dim.key}]
                            </span>
                            <span className="font-semibold text-sm text-corp-charcoal truncate">
                              {dim.label}
                            </span>
                            {dim.autoDetected && (
                              <span className="flex-shrink-0 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
                                Otomatik
                              </span>
                            )}
                            <span className="flex-shrink-0 text-[10px] text-corp-gray">
                              {dim.options.length} seçenek
                            </span>
                          </div>
                          {expandedDimIdx === idx ? (
                            <ChevronUp size={15} className="text-corp-gray flex-shrink-0" />
                          ) : (
                            <ChevronDown size={15} className="text-corp-gray flex-shrink-0" />
                          )}
                        </button>

                        {/* Accordion içeriği */}
                        {expandedDimIdx === idx && (
                          <div className="px-4 pb-4 pt-3 space-y-3 bg-white">
                            {/* Label düzenleme */}
                            <div>
                              <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                                Etiket (Boyut Adı)
                              </label>
                              <input
                                type="text"
                                value={dim.label}
                                onChange={(e) =>
                                  updateDimensionLabel(idx, e.target.value)
                                }
                                placeholder={
                                  dim.autoDetected
                                    ? "Otomatik tahmin edildi — düzenleyebilirsiniz"
                                    : "Boyut adı"
                                }
                                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-corp-teal/30 ${
                                  dim.autoDetected
                                    ? "border-amber-300 bg-amber-50 placeholder:text-amber-500 text-amber-800"
                                    : "border-corp-border"
                                }`}
                              />
                              {dim.autoDetected && (
                                <p className="text-[10px] text-amber-600 mt-1">
                                  Bu etiket CSV verilerinden otomatik tahmin edildi. Düzenlediğinizde &quot;Otomatik&quot; etiketi kaldırılacak.
                                </p>
                              )}
                            </div>

                            {/* Options düzenleme */}
                            <div>
                              <label className="block text-xs font-semibold text-corp-charcoal mb-2">
                                Seçenekler
                              </label>
                              <DimensionOptionsEditor
                                options={dim.options}
                                onChange={(opts) => updateDimensionOptions(idx, opts)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ESKİ FORMAT: Basit Varyantlar (manual ekleme) ───────────── */}
              {formData.variantDimensions.length === 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-corp-charcoal">
                      Varyantlar
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((f) => ({
                          ...f,
                          variants: [
                            ...f.variants,
                            { quantity: 100, material: "", salePrice: 0 },
                          ],
                        }));
                      }}
                      className="text-xs font-semibold text-corp-teal hover:text-corp-teal-600"
                    >
                      + Varyant Ekle
                    </button>
                  </div>

                  {formData.variants.length === 0 ? (
                    <p className="text-sm text-corp-gray italic">Henüz varyant eklenmedi</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.variants.map((variant, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <input
                              type="number"
                              value={variant.quantity}
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].quantity = Number(e.target.value);
                                setFormData((f) => ({ ...f, variants: newVariants }));
                              }}
                              placeholder="Adet"
                              className="w-full px-3 py-2 rounded-lg border border-corp-border text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="text"
                              value={variant.material}
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].material = e.target.value;
                                setFormData((f) => ({ ...f, variants: newVariants }));
                              }}
                              placeholder="Malzeme"
                              className="w-full px-3 py-2 rounded-lg border border-corp-border text-sm"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="number"
                              value={variant.salePrice}
                              onChange={(e) => {
                                const newVariants = [...formData.variants];
                                newVariants[index].salePrice = Number(e.target.value);
                                setFormData((f) => ({ ...f, variants: newVariants }));
                              }}
                              placeholder="Fiyat (TL)"
                              className="w-full px-3 py-2 rounded-lg border border-corp-border text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((f) => ({
                                ...f,
                                variants: f.variants.filter((_, i) => i !== index),
                              }));
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <XCircle size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-corp-border sticky bottom-0 bg-white rounded-b-3xl">
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
                {saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
