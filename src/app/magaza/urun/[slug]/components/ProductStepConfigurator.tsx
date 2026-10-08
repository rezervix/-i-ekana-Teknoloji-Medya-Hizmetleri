"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  Check,
  Upload,
  Layers,
  Sparkles,
  Zap,
  ShoppingBag,
  ArrowRight,
  AlertCircle,
  FileText,
  X,
  Eye,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  PriceTier,
  VariantDimension,
} from "@/types/product";

interface ProductStepConfiguratorProps {
  resolved: {
    mode: "new" | "legacy_variants" | "legacy_options" | "none";
    newOpts?: any;
    legacyVariants?: any[];
    legacyOptions?: any[];
  };
  // Step 1: Dimensions
  selectedDimensions: Record<string, string>;
  onDimensionChange: (key: string, value: string) => void;
  // Step 2: Quantities
  newFormatTiers: PriceTier[];
  selectedQuantityNew: number;
  onQuantityNewChange: (qty: number) => void;
  // Legacy format
  uniqueMaterials?: string[];
  selectedMaterial?: string;
  onMaterialChange?: (mat: string) => void;
  availableLegacyQuantities?: any[];
  legacyQuantity?: number;
  onLegacyQuantityChange?: (qty: number) => void;
  // Free quantity
  quantity: number;
  onQuantityChange: (qty: number) => void;
  // Step 3: Design method
  selectedDesignMethod: "upload" | "photo_to_design" | "template" | null;
  onDesignMethodChange: (method: "upload" | "photo_to_design" | "template") => void;
  uploadedFiles: Array<{ name: string; size: number; url: string }>;
  onUploadDesignFiles: (files: File[]) => void;
  isUploadingDesign: boolean;
  onRemoveUploadedFile: (index: number) => void;
  photoToDesignFee: number;
  // Templates
  templates: any[];
  selectedNiche: string | null;
  onNicheChange: (niche: string | null) => void;
  selectedTemplate: any;
  onSelectTemplate: (template: any) => void;
  onOpenLightbox: (template: any) => void;
  // Customization options (legacy)
  customizationData: Record<string, any>;
  onCustomizationChange: (id: string, value: any) => void;
  // Step 4: Checkout
  displayPrice: number;
  totalPrice: number;
  displayUnitPrice?: number;
  variantError: string | null;
  onAddToCart: () => void;
  onBuyNow: () => void;
  stock?: number | null;
  ctaVariant?: string;
}

export default function ProductStepConfigurator({
  resolved,
  selectedDimensions,
  onDimensionChange,
  newFormatTiers,
  selectedQuantityNew,
  onQuantityNewChange,
  uniqueMaterials = [],
  selectedMaterial = "",
  onMaterialChange,
  availableLegacyQuantities = [],
  legacyQuantity = 1,
  onLegacyQuantityChange,
  quantity,
  onQuantityChange,
  selectedDesignMethod,
  onDesignMethodChange,
  uploadedFiles,
  onUploadDesignFiles,
  isUploadingDesign,
  onRemoveUploadedFile,
  photoToDesignFee,
  templates,
  selectedNiche,
  onNicheChange,
  selectedTemplate,
  onSelectTemplate,
  onOpenLightbox,
  customizationData,
  onCustomizationChange,
  displayPrice,
  totalPrice,
  displayUnitPrice,
  variantError,
  onAddToCart,
  onBuyNow,
  stock,
  ctaVariant,
}: ProductStepConfiguratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadDesignFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const uniqueNiches = Array.from(new Set(templates.flatMap((t) => t.nicheLabels || [])));
  const filteredTemplates = selectedNiche
    ? templates.filter((t) => t.nicheLabels?.includes(selectedNiche))
    : templates;

  const legacyOptions =
    resolved.mode === "legacy_options" ? (resolved.legacyOptions ?? []) : [];

  return (
    <div className="space-y-6">
      {/* ── ADIM 1: EBAT VE ÖZELLİK SEÇİMİ ─────────────────────────────────── */}
      <div className="bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-corp-border/60 dark:border-white/10">
          <span className="w-7 h-7 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
            1
          </span>
          <h2 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
            Ebat ve Kağıt Özellikleri
          </h2>
        </div>

        {/* YENİ FORMAT: variantDimensions */}
        {resolved.mode === "new" && resolved.newOpts && (
          <div className="space-y-4">
            {resolved.newOpts.variantDimensions.map((dim: VariantDimension) => (
              <div key={dim.key}>
                <label className="block text-xs font-bold text-corp-charcoal dark:text-white mb-1.5">
                  {dim.label}
                </label>
                <select
                  id={`dim-${dim.key}`}
                  value={selectedDimensions[dim.key] || ""}
                  onChange={(e) => onDimensionChange(dim.key, e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal text-sm text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
                >
                  {dim.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* ESKİ FORMAT: Malzeme Seçimi */}
        {resolved.mode === "legacy_variants" && uniqueMaterials.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-corp-charcoal dark:text-white mb-1.5">
              Malzeme / Kağıt Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              {uniqueMaterials.map((mat) => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => onMaterialChange && onMaterialChange(mat)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                    selectedMaterial === mat
                      ? "border-corp-teal bg-corp-teal/10 text-corp-teal font-bold"
                      : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
                  }`}
                >
                  {mat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Standart ürün veya seçenek yoksa */}
        {resolved.mode === "none" && (
          <p className="text-xs text-corp-gray dark:text-white/60">
            Bu ürün standart özelliklerde hazırlanmaktadır.
          </p>
        )}
      </div>

      {/* ── ADIM 2: ADET SEÇİMİ ────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-corp-border/60 dark:border-white/10">
          <span className="w-7 h-7 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
            2
          </span>
          <h2 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
            Sipariş Adedi
          </h2>
        </div>

        {/* YENİ FORMAT: Price Tiers Grid */}
        {resolved.mode === "new" && newFormatTiers.length > 0 && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {newFormatTiers.map((tier) => {
                const isSelected = selectedQuantityNew === tier.quantity;
                return (
                  <button
                    key={tier.quantity}
                    type="button"
                    onClick={() => onQuantityNewChange(tier.quantity)}
                    className={`min-h-[52px] p-2.5 rounded-xl border text-center transition-all flex flex-col justify-center items-center ${
                      isSelected
                        ? "border-corp-teal bg-corp-teal/10 text-corp-teal ring-2 ring-corp-teal/30 shadow-xs"
                        : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
                    }`}
                  >
                    <span className="font-bold text-sm">
                      {tier.quantity.toLocaleString("tr-TR")} adet
                    </span>
                    <span className="text-[11px] font-semibold text-corp-teal dark:text-teal-300">
                      {tier.salePrice.toLocaleString("tr-TR")} ₺
                    </span>
                    {tier.unitSalePrice && (
                      <span className="text-[10px] text-corp-gray dark:text-white/50">
                        ({tier.unitSalePrice.toFixed(2)} ₺/ad.)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ESKİ FORMAT: Legacy Quantities */}
        {resolved.mode === "legacy_variants" && availableLegacyQuantities.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableLegacyQuantities.map((v: any) => {
              const isSelected = legacyQuantity === v.quantity;
              return (
                <button
                  key={v.quantity}
                  type="button"
                  onClick={() => onLegacyQuantityChange && onLegacyQuantityChange(v.quantity)}
                  className={`min-h-[52px] p-2.5 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "border-corp-teal bg-corp-teal/10 text-corp-teal ring-2 ring-corp-teal/30 font-bold"
                      : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
                  }`}
                >
                  <div className="text-sm">{v.quantity.toLocaleString("tr-TR")} adet</div>
                  <div className="text-xs font-bold text-corp-teal">
                    {v.salePrice.toLocaleString("tr-TR")} ₺
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* STANDART / SERBEST ADET */}
        {resolved.mode === "none" && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-corp-charcoal dark:text-white">Adet:</span>
            <div className="flex items-center border border-corp-border dark:border-white/10 rounded-xl bg-white dark:bg-corp-charcoal p-1">
              <button
                type="button"
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center text-corp-charcoal dark:text-white"
                aria-label="Adeti azalt"
              >
                <Minus size={16} />
              </button>
              <span className="w-12 text-center font-bold text-sm text-corp-charcoal dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(quantity + 1)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center text-corp-charcoal dark:text-white"
                aria-label="Adeti artır"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── ADIM 3: TASARIM YÖNTEMİ SEÇİMİ ─────────────────────────────────── */}
      <div className="bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-corp-border/60 dark:border-white/10">
          <span className="w-7 h-7 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
            3
          </span>
          <h2 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
            Tasarımınızı Belirleyin
          </h2>
        </div>

        {/* 3-Way Method Selector Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {/* Method 1: Upload */}
          <button
            type="button"
            onClick={() => onDesignMethodChange("upload")}
            className={`min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              selectedDesignMethod === "upload"
                ? "border-corp-teal bg-corp-teal/10 text-corp-teal ring-2 ring-corp-teal/30 shadow-xs"
                : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
            }`}
          >
            <div className="p-2 rounded-lg bg-corp-teal/10 text-corp-teal shrink-0">
              <Upload size={18} />
            </div>
            <div>
              <div className="font-bold text-xs">Tasarımım Hazır</div>
              <div className="text-[11px] text-corp-gray dark:text-white/60">Dosya Yükle</div>
            </div>
          </button>

          {/* Method 2: Photo to design */}
          <button
            type="button"
            onClick={() => onDesignMethodChange("photo_to_design")}
            className={`min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              selectedDesignMethod === "photo_to_design"
                ? "border-corp-teal bg-corp-teal/10 text-corp-teal ring-2 ring-corp-teal/30 shadow-xs"
                : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
            }`}
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="font-bold text-xs">Fotoğraftan Tasarım</div>
              <div className="text-[11px] text-corp-gray dark:text-white/60">
                +{photoToDesignFee} ₺ Hizmet Bedeli
              </div>
            </div>
          </button>

          {/* Method 3: Template */}
          <button
            type="button"
            onClick={() => onDesignMethodChange("template")}
            className={`min-h-[52px] p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
              selectedDesignMethod === "template"
                ? "border-corp-teal bg-corp-teal/10 text-corp-teal ring-2 ring-corp-teal/30 shadow-xs"
                : "border-corp-border dark:border-white/10 text-corp-charcoal dark:text-white hover:border-corp-gray"
            }`}
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <div className="font-bold text-xs">Hazır Şablon</div>
              <div className="text-[11px] text-corp-gray dark:text-white/60">Galeriden Seç</div>
            </div>
          </button>
        </div>

        {/* ── Sub-area 1: Kendi Tasarımını Yükle ─────────────────────────── */}
        {selectedDesignMethod === "upload" && (
          <div className="p-4 rounded-xl border border-dashed border-corp-border dark:border-white/20 bg-corp-surface/50 text-center space-y-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              multiple
              accept=".pdf,.ai,.psd,.eps,.jpg,.jpeg,.png,.tiff,.zip,.rar"
              className="hidden"
            />
            <div className="w-10 h-10 mx-auto rounded-full bg-corp-teal/10 flex items-center justify-center text-corp-teal">
              <Upload size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-corp-charcoal dark:text-white">
                Baskı dosyanızı sürükleyin veya seçin
              </p>
              <p className="text-[11px] text-corp-gray dark:text-white/60">
                PDF, AI, PSD, TIFF, PNG, JPG (Maks. 50 MB)
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDesign}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-corp-teal text-white font-semibold text-xs hover:bg-corp-teal-600 transition-colors shadow-xs"
            >
              {isUploadingDesign ? "Yükleniyor..." : "Dosya Seç"}
            </button>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="pt-2 space-y-1.5 text-left">
                {uploadedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-corp-charcoal border border-corp-border text-xs"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-corp-teal shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveUploadedFile(i)}
                      className="p-1 hover:text-red-500 text-corp-gray transition-colors"
                      title="Sil"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sub-area 2: Fotoğraftan Tasarım ─────────────────────────────── */}
        {selectedDesignMethod === "photo_to_design" && (
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-amber-900 dark:text-amber-200">
                  Fotoğraftan Profesyonel Baskı Tasarımı (+{photoToDesignFee} ₺)
                </h4>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-1 leading-relaxed">
                  Kartvizitinizin, broşürünüzün veya logonuzun fotoğrafını yükleyin. Grafik ekibimiz baskıya uygun vektörel formatta yeniden çizip tasarlayacaktır.
                </p>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              multiple
              accept="image/*,.pdf"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDesign}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold text-xs hover:bg-amber-700 transition-colors shadow-xs"
            >
              {isUploadingDesign ? "Yükleniyor..." : "Referans Fotoğraf Yükle"}
            </button>
            {uploadedFiles.length > 0 && (
              <div className="pt-2 space-y-1.5 text-left">
                {uploadedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-corp-charcoal border border-amber-200 text-xs"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-amber-600 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveUploadedFile(i)}
                      className="p-1 hover:text-red-500 text-corp-gray transition-colors"
                      title="Sil"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Sub-area 3: Hazır Şablon Galerisi ──────────────────────────── */}
        {selectedDesignMethod === "template" && (
          <div className="space-y-4">
            {/* Niche selector pills */}
            {uniqueNiches.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => onNicheChange(null)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    selectedNiche === null
                      ? "bg-corp-teal text-white"
                      : "bg-gray-100 dark:bg-white/10 text-corp-charcoal dark:text-white"
                  }`}
                >
                  Tümü
                </button>
                {uniqueNiches.map((niche) => (
                  <button
                    key={niche}
                    type="button"
                    onClick={() => onNicheChange(niche)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                      selectedNiche === niche
                        ? "bg-corp-teal text-white"
                        : "bg-gray-100 dark:bg-white/10 text-corp-charcoal dark:text-white"
                    }`}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            )}

            {/* Template cards grid */}
            {filteredTemplates.length === 0 ? (
              <p className="text-xs text-corp-gray italic py-4 text-center">
                Bu kategoriye ait hazır şablon bulunmuyor. Kendi tasarımınızı yükleyebilirsiniz.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplate?.id === tpl.id;
                  const thumb = tpl.frontImageUrl || tpl.frontImage || "/placeholder.webp";

                  return (
                    <div
                      key={tpl.id}
                      className={`relative rounded-xl border p-2 flex flex-col justify-between transition-all group ${
                        isSelected
                          ? "border-corp-teal ring-2 ring-corp-teal/30 bg-corp-teal/5"
                          : "border-corp-border dark:border-white/10 bg-white dark:bg-corp-charcoal"
                      }`}
                    >
                      <div className="relative aspect-[3/2] w-full rounded-lg overflow-hidden bg-gray-50 mb-2">
                        <Image
                          src={thumb}
                          alt="Tasarım Şablonu"
                          fill
                          sizes="150px"
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => onOpenLightbox(tpl)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity min-h-[44px]"
                          title="Büyüt"
                        >
                          <Eye size={18} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectTemplate(tpl)}
                        className={`w-full min-h-[36px] px-2 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                          isSelected
                            ? "bg-corp-teal text-white"
                            : "bg-gray-100 dark:bg-white/10 text-corp-charcoal dark:text-white hover:bg-corp-teal hover:text-white"
                        }`}
                      >
                        {isSelected ? <Check size={14} /> : null}
                        <span>{isSelected ? "Seçildi" : "Bu Tasarımı Seç"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Legacy Customization Fields (if any text/option fields) */}
        {legacyOptions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-corp-border dark:border-white/10 space-y-3">
            <h4 className="font-bold text-xs text-corp-charcoal dark:text-white">
              Ek Özelleştirme Alanları
            </h4>
            {legacyOptions.map((opt: any) => (
              <div key={opt.id}>
                <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                  {opt.label}
                </label>
                <input
                  type="text"
                  value={customizationData[opt.id] || ""}
                  onChange={(e) => onCustomizationChange(opt.id, e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-corp-border text-xs focus:ring-2 focus:ring-corp-teal"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADIM 4: FİYAT ÖZETİ VE SEPETE EKLE (CTA) ───────────────────────── */}
      <div className="bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-corp-border/60 dark:border-white/10">
          <span className="w-7 h-7 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
            4
          </span>
          <h2 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
            Fiyat Özeti ve Sipariş
          </h2>
        </div>

        {/* Error banner if any */}
        {variantError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{variantError}</span>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-1.5 text-xs text-corp-gray dark:text-white/60">
          <div className="flex justify-between items-center">
            <span>Ürün Baskı Bedeli:</span>
            <span className="font-bold text-corp-charcoal dark:text-white">
              {displayPrice.toLocaleString("tr-TR")} ₺
            </span>
          </div>
          {selectedDesignMethod === "photo_to_design" && (
            <div className="flex justify-between items-center text-amber-600 dark:text-amber-400">
              <span>Fotoğraftan Tasarım Hizmeti:</span>
              <span className="font-bold">+{photoToDesignFee} ₺</span>
            </div>
          )}
          <div className="pt-2 border-t border-corp-border dark:border-white/10 flex justify-between items-baseline">
            <span className="text-sm font-bold text-corp-charcoal dark:text-white">
              Toplam Tutar:
            </span>
            <span className="font-display text-2xl font-extrabold text-corp-teal dark:text-teal-300">
              {totalPrice.toLocaleString("tr-TR")} ₺
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Main CTA: Sepete Ekle */}
          <Button
            size="lg"
            onClick={onAddToCart}
            disabled={stock === 0}
            className="min-h-[48px] w-full gap-2 bg-corp-teal hover:bg-corp-teal-600 text-white font-bold rounded-xl shadow-md text-sm"
          >
            <ShoppingBag size={18} />
            <span>{ctaVariant === "urgent" ? "Hemen Sepete Ekle" : "Sepete Ekle"}</span>
          </Button>

          {/* Secondary CTA: Hemen Al */}
          <Button
            size="lg"
            variant="outline"
            onClick={onBuyNow}
            disabled={stock === 0}
            className="min-h-[48px] w-full gap-2 border-corp-teal text-corp-teal hover:bg-corp-teal hover:text-white font-bold rounded-xl text-sm"
          >
            <span>Hemen Al (Doğrudan Öde)</span>
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
