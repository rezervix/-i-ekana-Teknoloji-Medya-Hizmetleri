"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Search, X, Save, Upload, Image as ImageIcon, XCircle, ChevronDown, ChevronUp, Tag, Truck, Star, ArrowLeft, ArrowRight, CheckSquare, Square, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { VariantDimension } from "@/types/product";
import { isNewFormat, isLegacyVariantsFormat } from "@/types/product";
import ProductImageUploader from "@/components/admin/ProductImageUploader";

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  subcategory?: string;
  price: number;
  stock?: number | null;
  isActive: boolean;
  freeShipping?: boolean;
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
  freeShipping: false,
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

  // Toplu seçim ve silme state'leri
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState<"selected" | "all">("selected");
  const [bulkDeleting, setBulkDeleting] = useState(false);

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
      freeShipping: Boolean(product.freeShipping),
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
        freeShipping: Boolean(formData.freeShipping),
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

  const isAllFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

  const isSomeFilteredSelected =
    filteredProducts.some((p) => selectedIds.includes(p.id)) && !isAllFilteredSelected;

  const toggleSelectAll = () => {
    if (isAllFilteredSelected) {
      const filteredIdSet = new Set(filteredProducts.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...filteredProducts.map((p) => p.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const openBulkDeleteConfirm = (mode: "selected" | "all") => {
    if (mode === "selected" && selectedIds.length === 0) {
      toast.error("Lütfen silmek için en az bir ürün seçin.");
      return;
    }
    if (mode === "all" && products.length === 0) {
      toast.error("Silinecek ürün bulunmuyor.");
      return;
    }
    setBulkDeleteMode(mode);
    setBulkDeleteModalOpen(true);
  };

  const executeBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const payload =
        bulkDeleteMode === "all"
          ? { all: true }
          : { ids: selectedIds };

      const res = await fetch("/api/admin/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Toplu silme işlemi başarısız.");
      }

      if (data.deletedIds && data.deletedIds.length > 0) {
        const deletedSet = new Set(data.deletedIds as string[]);
        setProducts((prev) => prev.filter((p) => !deletedSet.has(p.id)));
        setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));
        toast.success(`${data.deletedCount} ürün başarıyla silindi.`);
      }

      if (data.blockedCount > 0) {
        toast.warning(
          `${data.blockedCount} ürün geçmiş sipariş kayıtlarında bulunduğu için silinemedi. Dilerseniz bu ürünleri pasife alabilirsiniz.`,
          { duration: 6000 }
        );
      }

      setBulkDeleteModalOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Silme işlemi sırasında hata oluştu.");
    } finally {
      setBulkDeleting(false);
    }
  };

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
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap">
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => openBulkDeleteConfirm("all")}
                className="px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Tüm kayıtlı ürünleri sil"
              >
                <Trash2 size={14} />
                Tüm Ürünleri Sil
              </button>
            )}
            <button
              onClick={openNewModal}
              className="bg-corp-teal text-white px-5 py-2 rounded-lg font-semibold text-xs md:text-sm flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95"
            >
              <Plus size={16} /> Yeni Ürün Ekle
            </button>
          </div>
        </div>

        {/* Bulk Action Bar - Seçim olduğunda görünür */}
        {selectedIds.length > 0 && (
          <div className="bg-corp-teal-50 border border-corp-teal/30 rounded-xl p-3 md:p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-corp-teal animate-pulse" />
              <span className="font-bold text-corp-charcoal text-sm">
                {selectedIds.length} ürün seçildi
              </span>
              <span className="text-corp-gray text-xs hidden sm:inline">
                ({filteredProducts.length} filtrelenen üründen)
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-lg border border-corp-border bg-white text-xs font-semibold text-corp-charcoal hover:bg-gray-50 transition-colors"
              >
                Seçimi Temizle
              </button>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-lg border border-corp-teal/30 bg-corp-teal/10 text-xs font-semibold text-corp-teal hover:bg-corp-teal/20 transition-colors"
              >
                {isAllFilteredSelected ? "Seçimi Kaldır" : "Filtrelenenlerin Tümünü Seç"}
              </button>
              <button
                type="button"
                onClick={() => openBulkDeleteConfirm("selected")}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
              >
                <Trash2 size={14} />
                Seçilenleri Sil ({selectedIds.length})
              </button>
            </div>
          </div>
        )}

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-corp-border">
          <table className="w-full text-left">
            <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Tüm filtrelenmiş ürünleri seç"
                    checked={isAllFilteredSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeFilteredSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal/30 cursor-pointer accent-corp-teal"
                  />
                </th>
                <th className="p-4">Ürün</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Fiyat</th>
                <th className="p-4">Stok</th>
                <th className="p-4">Kargo</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-border bg-white text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-corp-gray italic">
                    Ürün bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors group ${
                        isSelected ? "bg-corp-teal/10 hover:bg-corp-teal/15" : "hover:bg-corp-teal/5"
                      }`}
                    >
                      <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`${product.name} seç`}
                          checked={isSelected}
                          onChange={() => toggleSelectOne(product.id)}
                          className="w-4 h-4 rounded border-corp-border text-corp-teal focus:ring-corp-teal/30 cursor-pointer accent-corp-teal"
                        />
                      </td>
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
                      {product.freeShipping ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Truck size={12} />
                          <span>Ücretsiz</span>
                        </span>
                      ) : (
                        <span className="text-xs text-corp-gray">Standart</span>
                      )}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center text-corp-gray italic bg-white rounded-xl border border-corp-border">
              Ürün bulunamadı.
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <div
                  key={product.id}
                  className={`bg-white p-4 rounded-2xl border transition-all shadow-xs space-y-3 ${
                    isSelected
                      ? "border-corp-teal ring-2 ring-corp-teal/20 bg-corp-teal/[0.02]"
                      : "border-corp-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`${product.name} seç`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(product.id)}
                        className="w-5 h-5 rounded border-corp-border text-corp-teal focus:ring-corp-teal/30 cursor-pointer accent-corp-teal"
                      />
                    </div>
                    <div className="w-14 h-14 rounded-xl border border-corp-border overflow-hidden bg-gray-50 flex-shrink-0">
                      <img
                        src={product.images[0] || "https://placehold.co/100x100"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/100x100?text=Görsel+Yok";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-corp-charcoal text-sm truncate">
                        {product.name}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase tracking-tight flex-shrink-0">
                        {product.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-corp-gray font-mono block truncate">
                      {product.slug}
                    </span>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="font-display font-bold text-corp-charcoal text-sm">
                        {product.price.toLocaleString("tr-TR")} TL
                      </span>
                      <span className="text-xs text-corp-gray">
                        • Stok: {product.stock != null ? product.stock : "∞"}
                      </span>
                      {product.freeShipping && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Truck size={10} />
                          <span>Ücretsiz Kargo</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-corp-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-corp-gray">Yayında:</span>
                    <button
                      type="button"
                      onClick={() => toggleStatus(product.id, product.isActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        product.isActive ? "bg-corp-teal" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          product.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(product)}
                      className="min-h-[44px] min-w-[44px] p-2.5 text-corp-charcoal bg-gray-100 hover:bg-corp-teal/10 hover:text-corp-teal rounded-xl flex items-center justify-center transition-colors"
                      title="Düzenle"
                      aria-label="Ürünü Düzenle"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={loading === product.id}
                      className="min-h-[44px] min-w-[44px] p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Sil"
                      aria-label="Ürünü Sil"
                    >
                      {loading === product.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
                );
              })
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">
                {editTarget ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
              </h2>
              <button
                onClick={closeModal}
                className="min-h-[44px] min-w-[44px] p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
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
                  className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm"
                />
              </div>

              {/* Kategori & Alt Kategori */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Kategori
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm bg-white min-h-[44px]"
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
                    className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm min-h-[44px]"
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
                    className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm min-h-[44px]"
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
                    className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm min-h-[44px]"
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
                    className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm min-h-[44px]"
                  />
                </div>
              </div>

              {/* Ücretsiz Kargo Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border border-corp-border bg-corp-surface/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 border border-emerald-200/60">
                    <Truck size={18} />
                  </div>
                  <div>
                    <label htmlFor="free-shipping-toggle" className="text-sm font-semibold text-corp-charcoal block cursor-pointer">
                      Ücretsiz Kargo
                    </label>
                    <p className="text-xs text-corp-gray">
                      Açıksa bu ürün için müşteriye ücretsiz kargo gösterilir.
                    </p>
                  </div>
                </div>
                <button
                  id="free-shipping-toggle"
                  type="button"
                  role="switch"
                  aria-checked={formData.freeShipping}
                  onClick={() => setFormData((f) => ({ ...f, freeShipping: !f.freeShipping }))}
                  className={`relative inline-flex h-7 w-12 min-h-[44px] min-w-[44px] items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-corp-teal focus:ring-offset-2 ${
                    formData.freeShipping ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                      formData.freeShipping ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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
                  className="w-full px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-base sm:text-sm resize-none"
                />
              </div>

              {/* Çoklu Görsel Yükleyici (Vercel Blob Client Upload & Concurrency Queue) */}
              <ProductImageUploader
                images={formData.images}
                onChange={(newImages) =>
                  setFormData((prev) => ({ ...prev, images: newImages }))
                }
                productId={editTarget?.id || "temp"}
              />

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
                type="button"
                onClick={closeModal}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm flex items-center justify-center"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="min-h-[44px] bg-corp-teal text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Kaydediliyor..." : editTarget ? "Güncelle" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-corp-border space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-full flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-corp-charcoal">
                  {bulkDeleteMode === "all" ? "Tüm Ürünleri Sil" : "Seçilen Ürünleri Sil"}
                </h3>
                <p className="text-xs text-corp-gray">Bu işlem geri alınamaz</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-800 leading-relaxed">
              {bulkDeleteMode === "all" ? (
                <>
                  Toplam <strong>{products.length}</strong> ürünü kalıcı olarak silmek üzeresiniz.
                  Ürünlere ait görseller ve varyantlar sistemden temizlenecektir.
                </>
              ) : (
                <>
                  Seçtiğiniz <strong>{selectedIds.length}</strong> ürünü kalıcı olarak silmek
                  üzeresiniz. Ürünlere ait görseller ve varyantlar sistemden temizlenecektir.
                </>
              )}
              <span className="text-[11px] text-red-600 font-medium mt-2 block">
                * Geçmiş sipariş kayıtlarında yer alan ürünler veri bütünlüğü için silinemez, korunacaktır.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg border border-corp-border text-xs font-semibold text-corp-charcoal hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={executeBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                {bulkDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Siliniyor...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Evet, Sil (
                    {bulkDeleteMode === "all" ? products.length : selectedIds.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
