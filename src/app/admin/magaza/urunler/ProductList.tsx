"use client";

import React, { useState, useRef, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Search, X, Save, Upload, Image as ImageIcon, XCircle, ChevronDown, ChevronUp, Tag, Truck, Star, ArrowLeft, ArrowRight, CheckSquare, Square, AlertTriangle, Check, Sparkles, Layers, Sliders, Info, Copy, CheckCircle2, RefreshCw, Package } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { VariantDimension, PriceMatrixEntry, PriceTier } from "@/types/product";
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
  isFeatured?: boolean;
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
  slug: "",
  category: "Medya",
  subcategory: "",
  price: "",
  stock: "",
  photoToDesignFee: "",
  freeShipping: false,
  isFeatured: false,
  isActive: true,
  description: "",
  images: [] as string[],
  variantMode: "matrix" as "matrix" | "legacy" | "none",
  variantDimensions: [] as VariantDimension[],
  priceMatrix: [] as PriceMatrixEntry[],
  variants: [] as Array<{ quantity: number; material: string; salePrice: number }>,
};

function generateCartesianCombinations(dimensions: VariantDimension[]): Record<string, string>[] {
  if (dimensions.length === 0) return [];
  return dimensions.reduce<Record<string, string>[]>(
    (acc, dim) => {
      const opts = dim.options && dim.options.length > 0 ? dim.options : ["Standart"];
      const next: Record<string, string>[] = [];
      for (const item of acc) {
        for (const opt of opts) {
          next.push({ ...item, [dim.key]: opt });
        }
      }
      return next;
    },
    [{}]
  );
}

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
  const [activeModalTab, setActiveModalTab] = useState<"general" | "variants">("general");
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // Hangi dimension accordion'u açık
  const [expandedDimIdx, setExpandedDimIdx] = useState<number | null>(null);
  // Yeni boyut ekleme state'leri
  const [showAddDimForm, setShowAddDimForm] = useState(false);
  const [newDimName, setNewDimName] = useState("");
  const [newDimOptions, setNewDimOptions] = useState("");
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
    setShowAddDimForm(false);
    setActiveModalTab("general");
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditTarget(product);
    const opts = product.customizationOptions;

    let variantDimensions: VariantDimension[] = [];
    let priceMatrix: PriceMatrixEntry[] = [];
    let variants: Array<{ quantity: number; material: string; salePrice: number }> = [];
    let variantMode: "matrix" | "legacy" | "none" = "none";

    if (isNewFormat(opts)) {
      variantDimensions = opts.variantDimensions.map((d: VariantDimension) => ({
        ...d,
        options: [...(d.options || [])],
      }));
      priceMatrix = (opts.priceMatrix || []).map((m: PriceMatrixEntry) => ({
        packageId: m.packageId,
        dimensionValues: { ...m.dimensionValues },
        tiers: (m.tiers || []).map((t: PriceTier) => ({ ...t })),
      }));
      variantMode = "matrix";
    } else if (isLegacyVariantsFormat(opts)) {
      variants = opts.variants.map((v: any) => ({
        quantity: v.quantity ?? 0,
        material: v.material ?? "",
        salePrice: v.salePrice ?? 0,
      }));
      variantMode = "legacy";
    }

    setFormData({
      name: product.name,
      slug: product.slug || "",
      category: product.category,
      subcategory: product.subcategory || "",
      price: String(product.price),
      stock: product.stock != null ? String(product.stock) : "",
      photoToDesignFee: product.photoToDesignFee != null ? String(product.photoToDesignFee) : "",
      freeShipping: Boolean(product.freeShipping),
      isFeatured: Boolean(product.isFeatured),
      isActive: product.isActive !== undefined ? Boolean(product.isActive) : true,
      description: product.description || "",
      images: product.images || [],
      variantMode,
      variantDimensions,
      priceMatrix,
      variants,
    });
    setExpandedDimIdx(null);
    setShowAddDimForm(false);
    setActiveModalTab("general");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
    setFormData(EMPTY_FORM);
    setExpandedDimIdx(null);
    setShowAddDimForm(false);
  };

  // Dimension ekleme
  const handleAddDimension = () => {
    const trimmed = newDimName.trim();
    if (!trimmed) {
      toast.error("Lütfen boyut adını girin (Örn: Kağıt Cinsi, Kesim Türü).");
      return;
    }
    const safeKey = `ozellik_${Date.now()}`;
    const opts = newDimOptions
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newDim: VariantDimension = {
      key: safeKey,
      label: trimmed,
      autoDetected: false,
      options: opts.length > 0 ? opts : ["Standart"],
    };

    setFormData((f) => ({
      ...f,
      variantDimensions: [...f.variantDimensions, newDim],
    }));
    setNewDimName("");
    setNewDimOptions("");
    setShowAddDimForm(false);
    toast.success(`"${trimmed}" boyutu başarıyla eklendi.`);
  };

  // Dimension silme
  const handleRemoveDimension = (idx: number) => {
    const dim = formData.variantDimensions[idx];
    if (!dim) return;
    if (!confirm(`"${dim.label}" boyutunu silmek istediğinize emin misiniz?`)) return;
    setFormData((f) => {
      const remainingDims = f.variantDimensions.filter((_, i) => i !== idx);
      // Ayrıca matrix içinden bu key'i temizle
      const updatedMatrix = f.priceMatrix.map((combo) => {
        const newDimVals = { ...combo.dimensionValues };
        delete newDimVals[dim.key];
        return { ...combo, dimensionValues: newDimVals };
      });
      return {
        ...f,
        variantDimensions: remainingDims,
        priceMatrix: updatedMatrix,
      };
    });
    toast.success(`"${dim.label}" boyutu silindi.`);
  };

  // Dimension label değişimi
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

  // Fiyat matrisini boyutlardan otomatik oluştur / güncelle
  const syncMatrixFromDimensions = () => {
    if (formData.variantDimensions.length === 0) {
      toast.error("Önce en az bir varyant boyutu ve seçenek ekleyin.");
      return;
    }
    const allCombos = generateCartesianCombinations(formData.variantDimensions);
    const defaultPrice = parseFloat(formData.price) || 500;

    const newMatrix: PriceMatrixEntry[] = allCombos.map((combo, idx) => {
      // Mevcut kombinasyon eşleşiyorsa koru
      const existing = formData.priceMatrix.find((m) => {
        return Object.entries(combo).every(([k, v]) => m.dimensionValues[k] === v);
      });

      if (existing) {
        return existing;
      }

      return {
        packageId: String(idx + 1),
        dimensionValues: combo,
        tiers: [
          {
            quantity: 1000,
            salePrice: defaultPrice,
            unitSalePrice: defaultPrice > 0 ? parseFloat((defaultPrice / 1000).toFixed(2)) : 0.5,
            totalCost: 0,
            unitCost: 0,
          },
        ],
      };
    });

    setFormData((f) => ({
      ...f,
      priceMatrix: newMatrix,
    }));
    toast.success(`Fiyat matrisi güncellendi: ${newMatrix.length} varyant kombinasyonu hazır.`);
  };

  // Yeni kombinasyon ekle
  const addCustomCombination = () => {
    if (formData.variantDimensions.length === 0) {
      toast.error("Önce en az bir varyant boyutu ekleyin.");
      return;
    }
    const defaultCombo: Record<string, string> = {};
    formData.variantDimensions.forEach((dim) => {
      defaultCombo[dim.key] = dim.options[0] || "Standart";
    });

    const newEntry: PriceMatrixEntry = {
      packageId: String(Date.now()),
      dimensionValues: defaultCombo,
      tiers: [
        {
          quantity: 1000,
          salePrice: parseFloat(formData.price) || 500,
          unitSalePrice: 0.5,
          totalCost: 0,
          unitCost: 0,
        },
      ],
    };

    setFormData((f) => ({
      ...f,
      priceMatrix: [newEntry, ...f.priceMatrix],
    }));
    toast.success("Yeni varyant kombinasyonu eklendi.");
  };

  // Kombinasyon sil
  const removeCombination = (idx: number) => {
    setFormData((f) => ({
      ...f,
      priceMatrix: f.priceMatrix.filter((_, i) => i !== idx),
    }));
    toast.success("Varyant kombinasyonu kaldırıldı.");
  };

  // Kombinasyona adet kademesi ekle
  const addTierToCombination = (comboIdx: number) => {
    setFormData((f) => {
      const matrix = [...f.priceMatrix];
      const combo = { ...matrix[comboIdx] };
      const tiers = [...combo.tiers];
      const lastTier = tiers[tiers.length - 1];
      const nextQuantity = lastTier ? (lastTier.quantity >= 1000 ? lastTier.quantity + 1000 : lastTier.quantity * 2) : 1000;
      const nextPrice = lastTier ? Math.round(lastTier.salePrice * 1.5) : (parseFloat(f.price) || 500);
      combo.tiers = [
        ...tiers,
        {
          quantity: nextQuantity,
          salePrice: nextPrice,
          unitSalePrice: nextQuantity > 0 ? parseFloat((nextPrice / nextQuantity).toFixed(2)) : 0,
          totalCost: 0,
          unitCost: 0,
        },
      ];
      matrix[comboIdx] = combo;
      return { ...f, priceMatrix: matrix };
    });
  };

  // Adet kademesini güncelle
  const updateTier = (
    comboIdx: number,
    tierIdx: number,
    field: "quantity" | "salePrice",
    val: number
  ) => {
    setFormData((f) => {
      const matrix = [...f.priceMatrix];
      const combo = { ...matrix[comboIdx] };
      const tiers = [...combo.tiers];
      const current = { ...tiers[tierIdx], [field]: val };
      if (current.quantity > 0 && current.salePrice > 0) {
        current.unitSalePrice = parseFloat((current.salePrice / current.quantity).toFixed(2));
      }
      tiers[tierIdx] = current;
      combo.tiers = tiers;
      matrix[comboIdx] = combo;
      return { ...f, priceMatrix: matrix };
    });
  };

  // Adet kademesini sil
  const removeTier = (comboIdx: number, tierIdx: number) => {
    setFormData((f) => {
      const matrix = [...f.priceMatrix];
      const combo = { ...matrix[comboIdx] };
      if (combo.tiers.length <= 1) {
        toast.error("Bir kombinasyonun en az bir adet ve fiyat kademesi olmalıdır.");
        return f;
      }
      combo.tiers = combo.tiers.filter((_, i) => i !== tierIdx);
      matrix[comboIdx] = combo;
      return { ...f, priceMatrix: matrix };
    });
  };

  // Otomatik URL Slug üret
  const handleAutoSlug = () => {
    if (!formData.name.trim()) {
      toast.error("Önce ürün adını girin.");
      return;
    }
    const generated = formData.name
      .toLowerCase()
      .trim()
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ı/g, "i")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    setFormData((f) => ({ ...f, slug: generated }));
    toast.success("URL bağlantısı üretildi.");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Ürün adı zorunludur.");
      return;
    }
    setSaving(true);
    try {
      // customizationOptions yeniden oluştur
      let customizationOptions: any = null;
      if (formData.variantMode === "matrix") {
        if (formData.variantDimensions.length > 0) {
          customizationOptions = {
            variantDimensions: formData.variantDimensions,
            priceMatrix: formData.priceMatrix,
          };
        }
      } else if (formData.variantMode === "legacy") {
        if (formData.variants.length > 0) {
          customizationOptions = {
            variants: formData.variants,
          };
        }
      }

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        price: parseFloat(formData.price) || 0,
        stock: formData.stock !== "" ? parseInt(formData.stock) : null,
        photoToDesignFee:
          formData.photoToDesignFee !== "" ? parseFloat(formData.photoToDesignFee) : null,
        freeShipping: Boolean(formData.freeShipping),
        isFeatured: Boolean(formData.isFeatured),
        isActive: Boolean(formData.isActive),
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
        toast.success("Ürün başarıyla güncellendi.");
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
        toast.success("Ürün başarıyla eklendi.");
      }
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!id || typeof id !== "string") {
      toast.error("Geçersiz ürün kimliği.");
      return;
    }
    if (!confirm(`'${name}' ürününü silmek istediğinize emin misiniz?`)) return;
    setLoading(id);
    try {
      // id parametresi hem URL dynamic route hem de Request Body olarak eksiksiz iletilir
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        toast.success(data.message || "Ürün silindi.");
      } else {
        throw new Error(data.error || "Silme işlemi başarısız.");
      }
    } catch (error: any) {
      console.error("[ProductList handleDelete error]:", error);
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-corp-border sticky top-0 bg-white z-20">
              <div className="min-w-0 pr-4">
                <h2 className="font-display text-lg sm:text-xl font-bold text-corp-charcoal truncate">
                  {editTarget ? `Ürünü Düzenle: ${editTarget.name}` : "Yeni Ürün Ekle"}
                </h2>
                <p className="text-xs text-corp-gray hidden sm:block">
                  Ürünün tüm temel bilgilerini, fotoğraflarını ve varyant fiyatlandırmasını yönetin.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="min-h-[44px] min-w-[44px] p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center shrink-0 cursor-pointer"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Tabs Bar */}
            <div className="flex border-b border-corp-border bg-corp-surface/50 px-4 sm:px-6 gap-2 sticky top-[69px] z-10 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveModalTab("general")}
                className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeModalTab === "general"
                    ? "border-corp-teal text-corp-teal bg-white rounded-t-xl shadow-xs"
                    : "border-transparent text-corp-gray hover:text-corp-charcoal"
                }`}
              >
                <Sliders size={16} />
                <span>Genel Bilgiler</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab("variants")}
                className={`py-3 px-4 font-semibold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeModalTab === "variants"
                    ? "border-corp-teal text-corp-teal bg-white rounded-t-xl shadow-xs"
                    : "border-transparent text-corp-gray hover:text-corp-charcoal"
                }`}
              >
                <Layers size={16} />
                <span>Varyant &amp; Fiyat Yönetimi</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-corp-teal/10 text-corp-teal">
                  {formData.variantMode === "matrix"
                    ? `${formData.variantDimensions.length} Boyut • ${formData.priceMatrix.length} Fiyat`
                    : formData.variantMode === "legacy"
                    ? `${formData.variants.length} Varyant`
                    : "Varyantsız"}
                </span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 1: GENEL BİLGİLER */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeModalTab === "general" && (
                <div className="space-y-4">
                  {/* Ürün Adı & Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Ürün Adı <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                        placeholder="Örn: Standart Kartvizit"
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm min-h-[44px]"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-corp-charcoal uppercase tracking-wider">
                          URL Bağlantısı (Slug)
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoSlug}
                          className="text-[11px] font-semibold text-corp-teal hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={11} /> Adtan Oluştur
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData((f) => ({ ...f, slug: e.target.value }))}
                        placeholder="standart-kartvizit"
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm font-mono min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Kategori & Alt Kategori */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Kategori
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white min-h-[44px]"
                      >
                        <option value="Baski">Kurumsal Kimlik &amp; Baskı</option>
                        <option value="Medya">Medya &amp; Reklam</option>
                        <option value="Teknoloji">Teknoloji</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Alt Kategori
                      </label>
                      <input
                        type="text"
                        value={formData.subcategory}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, subcategory: e.target.value }))
                        }
                        placeholder="Örn: Kartvizit, Broşür, Tabela..."
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Fiyat & Stok & Fotoğraftan Tasarım Ücreti */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Taban Fiyat (TL)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData((f) => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Stok <span className="text-corp-gray text-[10px] lowercase">(boş = sınırsız)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock}
                        onChange={(e) => setFormData((f) => ({ ...f, stock: e.target.value }))}
                        placeholder="Sınırsız"
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                        Fotoğraftan Tasarım (TL)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.photoToDesignFee}
                        onChange={(e) =>
                          setFormData((f) => ({ ...f, photoToDesignFee: e.target.value }))
                        }
                        placeholder="500"
                        className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* 3 Status Toggles (Kargo, Vitrin, Yayında) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Ücretsiz Kargo */}
                    <div className="p-3.5 rounded-2xl border border-corp-border bg-corp-surface/40 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-corp-charcoal block">Ücretsiz Kargo</span>
                        <span className="text-[11px] text-corp-gray">Müşteriye kargo bedava</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.freeShipping}
                        onClick={() => setFormData((f) => ({ ...f, freeShipping: !f.freeShipping }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                          formData.freeShipping ? "bg-emerald-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.freeShipping ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Öne Çıkan (Vitrin) */}
                    <div className="p-3.5 rounded-2xl border border-corp-border bg-corp-surface/40 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-corp-charcoal block">Vitrin Ürünü</span>
                        <span className="text-[11px] text-corp-gray">Öne çıkanlarda göster</span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.isFeatured}
                        onClick={() => setFormData((f) => ({ ...f, isFeatured: !f.isFeatured }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                          formData.isFeatured ? "bg-amber-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.isFeatured ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Satışta / Aktif */}
                    <div className="p-3.5 rounded-2xl border border-corp-border bg-corp-surface/40 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-corp-charcoal block">Ürün Durumu</span>
                        <span className="text-[11px] text-corp-gray">
                          {formData.isActive ? "Mağazada Satışta" : "Pasif / Gizli"}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.isActive}
                        onClick={() => setFormData((f) => ({ ...f, isActive: !f.isActive }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                          formData.isActive ? "bg-corp-teal" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            formData.isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                      Ürün Açıklaması
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, description: e.target.value }))
                      }
                      placeholder="Müşterilere gösterilecek detaylı ürün tanıtımı..."
                      className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                    />
                  </div>

                  {/* Görsel Yükleyici */}
                  <div>
                    <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-1.5">
                      Ürün Görselleri
                    </label>
                    <ProductImageUploader
                      images={formData.images}
                      onChange={(newImages) =>
                        setFormData((prev) => ({ ...prev, images: newImages }))
                      }
                      productId={editTarget?.id || "temp"}
                    />
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* TAB 2: VARYANT & FİYAT YÖNETİMİ */}
              {/* ───────────────────────────────────────────────────────────── */}
              {activeModalTab === "variants" && (
                <div className="space-y-6">
                  {/* Varyant Modu Seçimi */}
                  <div>
                    <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-2">
                      Varyant Tipi
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, variantMode: "matrix" }))}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          formData.variantMode === "matrix"
                            ? "border-corp-teal bg-corp-teal/5 ring-2 ring-corp-teal/20"
                            : "border-corp-border hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Tag size={16} className="text-corp-teal" />
                          <span className="font-bold text-xs text-corp-charcoal">
                            Gelişmiş Boyutlu &amp; Matris
                          </span>
                        </div>
                        <p className="text-[11px] text-corp-gray leading-tight">
                          Kağıt, Baskı, Ebat gibi çoklu boyutlar ve adet kademesi fiyatları.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, variantMode: "legacy" }))}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          formData.variantMode === "legacy"
                            ? "border-corp-teal bg-corp-teal/5 ring-2 ring-corp-teal/20"
                            : "border-corp-border hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Sliders size={16} className="text-corp-teal" />
                          <span className="font-bold text-xs text-corp-charcoal">
                            Basit Varyantlar
                          </span>
                        </div>
                        <p className="text-[11px] text-corp-gray leading-tight">
                          Adet, Malzeme / Seçenek ve tekil satış fiyatından oluşan basit liste.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, variantMode: "none" }))}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          formData.variantMode === "none"
                            ? "border-corp-teal bg-corp-teal/5 ring-2 ring-corp-teal/20"
                            : "border-corp-border hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Package size={16} className="text-corp-teal" />
                          <span className="font-bold text-xs text-corp-charcoal">
                            Varyantsız Ürün
                          </span>
                        </div>
                        <p className="text-[11px] text-corp-gray leading-tight">
                          Tekil ürün; müşteri yalnızca ürün taban fiyatıyla satın alır.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* ── GELİŞMİŞ BOYUTLU FORMAT (MATRIX) ── */}
                  {formData.variantMode === "matrix" && (
                    <div className="space-y-6 pt-2">
                      {/* BÖLÜM 1: BOYUTLAR */}
                      <div className="bg-corp-surface/40 p-4 sm:p-5 rounded-2xl border border-corp-border space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Tag size={16} className="text-corp-teal" />
                            <h3 className="font-display font-bold text-sm text-corp-charcoal">
                              1. Varyant Boyutları (Özellik Başlıkları)
                            </h3>
                            <span className="text-xs text-corp-gray">
                              ({formData.variantDimensions.length} Boyut)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowAddDimForm(!showAddDimForm)}
                            className="px-3 py-1.5 rounded-xl bg-corp-teal text-white text-xs font-semibold hover:bg-corp-teal-600 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={14} /> Yeni Boyut Ekle
                          </button>
                        </div>

                        {/* Yeni Boyut Ekleme Formu */}
                        {showAddDimForm && (
                          <div className="p-4 bg-white rounded-xl border border-corp-teal/30 shadow-xs space-y-3 animate-in fade-in duration-150">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-corp-charcoal mb-1">
                                  Boyut Adı (Örn: Kağıt Cinsi, Kesim Türü, Ebat)
                                </label>
                                <input
                                  type="text"
                                  value={newDimName}
                                  onChange={(e) => setNewDimName(e.target.value)}
                                  placeholder="Örn: Kağıt Cinsi"
                                  className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:ring-2 focus:ring-corp-teal/30 min-h-[40px]"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-corp-charcoal mb-1">
                                  Başlangıç Seçenekleri (virgülle ayırın)
                                </label>
                                <input
                                  type="text"
                                  value={newDimOptions}
                                  onChange={(e) => setNewDimOptions(e.target.value)}
                                  placeholder="Örn: 250 gr. Bristol, 350 gr. Kuşe"
                                  className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:ring-2 focus:ring-corp-teal/30 min-h-[40px]"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setShowAddDimForm(false)}
                                className="px-3 py-1.5 text-xs text-corp-gray hover:bg-gray-100 rounded-lg"
                              >
                                İptal
                              </button>
                              <button
                                type="button"
                                onClick={handleAddDimension}
                                className="px-4 py-1.5 bg-corp-teal text-white text-xs font-semibold rounded-lg hover:bg-corp-teal-600 cursor-pointer"
                              >
                                Boyutu Ekle
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Boyutlar Listesi */}
                        {formData.variantDimensions.length === 0 ? (
                          <div className="p-6 bg-white rounded-xl border border-dashed border-corp-border text-center text-xs text-corp-gray">
                            Henüz varyant boyutu tanımlanmadı. Yukarıdaki &quot;Yeni Boyut Ekle&quot; butonuna basarak ilk boyutunuzu ekleyebilirsiniz.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.variantDimensions.map((dim, idx) => (
                              <div
                                key={dim.key}
                                className="border border-corp-border rounded-xl overflow-hidden bg-white shadow-2xs"
                              >
                                <div className="flex items-center justify-between px-4 py-3 bg-corp-surface/50 border-b border-corp-border/60">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[11px] font-mono text-corp-gray bg-white px-2 py-0.5 rounded border border-corp-border shrink-0">
                                      {dim.key}
                                    </span>
                                    <span className="font-bold text-sm text-corp-charcoal truncate">
                                      {dim.label}
                                    </span>
                                    <span className="text-[11px] text-corp-gray shrink-0">
                                      ({dim.options.length} seçenek)
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDimension(idx)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Bu boyutu sil"
                                      aria-label={`${dim.label} boyutunu sil`}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-4 space-y-3 bg-white">
                                  <div>
                                    <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                                      Boyut Etiketi (Müşteriye Gösterilen Başlık)
                                    </label>
                                    <input
                                      type="text"
                                      value={dim.label}
                                      onChange={(e) => updateDimensionLabel(idx, e.target.value)}
                                      placeholder="Boyut adı"
                                      className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:ring-2 focus:ring-corp-teal/30 min-h-[38px]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-corp-charcoal mb-2">
                                      Seçenekler (Tıklayarak silin veya yeni ekleyin)
                                    </label>
                                    <DimensionOptionsEditor
                                      options={dim.options}
                                      onChange={(opts) => updateDimensionOptions(idx, opts)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* BÖLÜM 2: FİYAT MATRİSİ & ADET KADEMELERİ */}
                      <div className="bg-corp-surface/40 p-4 sm:p-5 rounded-2xl border border-corp-border space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <Layers size={16} className="text-corp-teal" />
                              <h3 className="font-display font-bold text-sm text-corp-charcoal">
                                2. Fiyat Matrisi ve Adet Kademeleri
                              </h3>
                              <span className="text-xs text-corp-gray">
                                ({formData.priceMatrix.length} Kombinasyon)
                              </span>
                            </div>
                            <p className="text-[11px] text-corp-gray mt-0.5">
                              Her varyant kombinasyonu için müşteriye sunulacak adet ve fiyatları düzenleyin.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={syncMatrixFromDimensions}
                              className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Boyut seçeneklerinden olası tüm kombinasyonları otomatik üretir"
                            >
                              <Sparkles size={14} className="text-amber-600" />
                              Boyutlardan Otomatik Eşle
                            </button>
                            <button
                              type="button"
                              onClick={addCustomCombination}
                              className="px-3 py-1.5 rounded-xl bg-corp-teal text-white hover:bg-corp-teal-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Plus size={14} /> Kombinasyon Ekle
                            </button>
                          </div>
                        </div>

                        {formData.priceMatrix.length === 0 ? (
                          <div className="p-8 bg-white rounded-xl border border-dashed border-corp-border text-center space-y-3">
                            <Info size={28} className="mx-auto text-corp-teal/60" />
                            <p className="text-xs text-corp-gray max-w-md mx-auto leading-relaxed">
                              Henüz fiyat matrisi kombinasyonu bulunmuyor. Yukarıdaki{" "}
                              <strong>&quot;Boyutlardan Otomatik Eşle&quot;</strong> butonuna basarak eklediğiniz boyut ve seçeneklerden saniyeler içinde tüm fiyat tablosunu oluşturabilirsiniz.
                            </p>
                            <button
                              type="button"
                              onClick={syncMatrixFromDimensions}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-corp-teal text-white text-xs font-semibold rounded-xl hover:bg-corp-teal-600 cursor-pointer"
                            >
                              <Sparkles size={14} /> Otomatik Kombinasyon Üret
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                            {formData.priceMatrix.map((combo, comboIdx) => (
                              <div
                                key={combo.packageId || comboIdx}
                                className="bg-white rounded-2xl border border-corp-border p-4 shadow-xs space-y-3"
                              >
                                {/* Kombinasyon Başlığı & Değerleri */}
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono text-corp-gray bg-gray-100 px-2 py-0.5 rounded font-bold">
                                      #{combo.packageId}
                                    </span>
                                    {Object.entries(combo.dimensionValues || {}).map(([key, val]) => (
                                      <span
                                        key={key}
                                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-corp-teal/10 text-corp-teal border border-corp-teal/20"
                                      >
                                        <span className="text-corp-gray text-[10px] uppercase">{key}:</span>
                                        <span>{val}</span>
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => addTierToCombination(comboIdx)}
                                      className="text-xs font-semibold text-corp-teal hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                      <Plus size={13} /> Adet Kademesi Ekle
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeCombination(comboIdx)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                      title="Bu kombinasyonu sil"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* Adet Kademeleri Tablosu */}
                                <div className="overflow-x-auto rounded-xl border border-corp-border/70">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-corp-surface/60 border-b border-corp-border text-corp-charcoal font-bold">
                                      <tr>
                                        <th className="p-2.5">Adet (Miktar)</th>
                                        <th className="p-2.5">Satış Fiyatı (TL)</th>
                                        <th className="p-2.5">Birim Fiyat</th>
                                        <th className="p-2.5 text-right">İşlem</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-corp-border/50">
                                      {combo.tiers.map((tier, tierIdx) => (
                                        <tr key={tierIdx} className="hover:bg-gray-50/60">
                                          <td className="p-2">
                                            <input
                                              type="number"
                                              min="1"
                                              value={tier.quantity}
                                              onChange={(e) =>
                                                updateTier(
                                                  comboIdx,
                                                  tierIdx,
                                                  "quantity",
                                                  Number(e.target.value)
                                                )
                                              }
                                              className="w-24 sm:w-32 px-2.5 py-1.5 rounded-lg border border-corp-border text-xs font-semibold focus:ring-1 focus:ring-corp-teal"
                                            />
                                          </td>
                                          <td className="p-2">
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={tier.salePrice}
                                              onChange={(e) =>
                                                updateTier(
                                                  comboIdx,
                                                  tierIdx,
                                                  "salePrice",
                                                  Number(e.target.value)
                                                )
                                              }
                                              className="w-28 sm:w-36 px-2.5 py-1.5 rounded-lg border border-corp-border text-xs font-semibold focus:ring-1 focus:ring-corp-teal"
                                            />
                                          </td>
                                          <td className="p-2">
                                            <span className="font-mono text-xs text-corp-gray">
                                              {tier.unitSalePrice
                                                ? `${tier.unitSalePrice.toFixed(2)} TL`
                                                : tier.quantity > 0
                                                ? `${(tier.salePrice / tier.quantity).toFixed(2)} TL`
                                                : "—"}
                                            </span>
                                          </td>
                                          <td className="p-2 text-right">
                                            <button
                                              type="button"
                                              onClick={() => removeTier(comboIdx, tierIdx)}
                                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                              title="Bu kademeyi sil"
                                            >
                                              <XCircle size={15} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── BASİT VARYANT FORMATI ── */}
                  {formData.variantMode === "legacy" && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-corp-charcoal uppercase tracking-wider">
                          Basit Varyant Listesi
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((f) => ({
                              ...f,
                              variants: [
                                ...f.variants,
                                {
                                  quantity: 100,
                                  material: "Standart",
                                  salePrice: parseFloat(f.price) || 500,
                                },
                              ],
                            }));
                          }}
                          className="text-xs font-semibold text-corp-teal hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} /> Varyant Ekle
                        </button>
                      </div>

                      {formData.variants.length === 0 ? (
                        <div className="p-8 text-center text-xs text-corp-gray italic bg-corp-surface/30 rounded-2xl border border-corp-border">
                          Henüz varyant eklenmedi. Yukarıdaki &quot;+ Varyant Ekle&quot; butonuna basarak ekleyebilirsiniz.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {formData.variants.map((variant, index) => (
                            <div
                              key={index}
                              className="flex gap-2 items-center bg-white p-2.5 rounded-xl border border-corp-border shadow-2xs"
                            >
                              <div className="w-24 sm:w-32">
                                <label className="block text-[10px] text-corp-gray font-semibold mb-0.5">
                                  Adet
                                </label>
                                <input
                                  type="number"
                                  value={variant.quantity}
                                  onChange={(e) => {
                                    const newVariants = [...formData.variants];
                                    newVariants[index].quantity = Number(e.target.value);
                                    setFormData((f) => ({ ...f, variants: newVariants }));
                                  }}
                                  placeholder="Adet"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] text-corp-gray font-semibold mb-0.5">
                                  Malzeme / Özellik
                                </label>
                                <input
                                  type="text"
                                  value={variant.material}
                                  onChange={(e) => {
                                    const newVariants = [...formData.variants];
                                    newVariants[index].material = e.target.value;
                                    setFormData((f) => ({ ...f, variants: newVariants }));
                                  }}
                                  placeholder="Malzeme Adı"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs"
                                />
                              </div>
                              <div className="w-28 sm:w-36">
                                <label className="block text-[10px] text-corp-gray font-semibold mb-0.5">
                                  Fiyat (TL)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={variant.salePrice}
                                  onChange={(e) => {
                                    const newVariants = [...formData.variants];
                                    newVariants[index].salePrice = Number(e.target.value);
                                    setFormData((f) => ({ ...f, variants: newVariants }));
                                  }}
                                  placeholder="Fiyat (TL)"
                                  className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs"
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
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg mt-3"
                                title="Sil"
                              >
                                <XCircle size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── VARYANTSIZ FORMAT ── */}
                  {formData.variantMode === "none" && (
                    <div className="p-8 text-center bg-corp-surface/40 rounded-2xl border border-corp-border space-y-2">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                      <h4 className="font-bold text-sm text-corp-charcoal">Varyantsız Tekil Ürün</h4>
                      <p className="text-xs text-corp-gray max-w-md mx-auto leading-relaxed">
                        Bu ürünün alt varyantı veya boyut seçeneği bulunmamaktadır. Siparişler, &quot;Genel Bilgiler&quot; sekmesinde belirlediğiniz <strong>{formData.price || "0"} TL</strong> taban fiyat üzerinden alınacaktır.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-corp-border sticky bottom-0 bg-white z-20">
              <div className="text-xs text-corp-gray hidden sm:block">
                {activeModalTab === "general" ? (
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("variants")}
                    className="text-corp-teal font-semibold hover:underline"
                  >
                    Varyant Yönetimine Geç →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveModalTab("general")}
                    className="text-corp-teal font-semibold hover:underline"
                  >
                    ← Genel Bilgilere Dön
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-xs sm:text-sm flex items-center justify-center cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="min-h-[44px] bg-corp-teal text-white px-6 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-xs sm:text-sm cursor-pointer"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Kaydediliyor..." : editTarget ? "Güncelle ve Kaydet" : "Ürünü Ekle"}
                </button>
              </div>
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
