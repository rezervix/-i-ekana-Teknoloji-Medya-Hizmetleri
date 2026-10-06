"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/store/useCartStore";
import { Star, ShoppingBag, ArrowLeft, Check, Plus, Minus, Image as ImageIcon, Upload, Users, X, Eye, FileText, AlertTriangle, Layers, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUploadThing } from "@/lib/uploadthing.client";
import { motion, AnimatePresence } from "framer-motion";
import { SafeImage } from "@/components/ui/SafeImage";
import { useSession } from "next-auth/react";
import type {
  ProductCustomizationOptions,
  NewFormatCustomizationOptions,
  VariantDimension,
  PriceMatrixEntry,
  PriceTier,
} from "@/types/product";
import {
  isNewFormat,
  isLegacyVariantsFormat,
  isLegacyOptionsArray,
} from "@/types/product";

// ─── Yardımcı: customizationOptions'ı normalize eder ─────────────────────────

function resolveCustomizationFormat(raw: any): {
  mode: "new" | "legacy_variants" | "legacy_options" | "none";
  newOpts?: NewFormatCustomizationOptions;
  legacyVariants?: any[];
  legacyOptions?: any[];
} {
  const opts: ProductCustomizationOptions = raw ?? null;

  if (isNewFormat(opts)) {
    return { mode: "new", newOpts: opts };
  }
  if (isLegacyVariantsFormat(opts)) {
    return { mode: "legacy_variants", legacyVariants: opts.variants };
  }
  if (isLegacyOptionsArray(opts)) {
    return { mode: "legacy_options", legacyOptions: opts.filter((o: any) => o.enabled) };
  }
  return { mode: "none" };
}

// ─── Yardımcı: priceMatrix içinde eşleşen entry'yi bul ───────────────────────

function findMatchingEntry(
  priceMatrix: PriceMatrixEntry[],
  selectedDimensions: Record<string, string>
): PriceMatrixEntry | undefined {
  return priceMatrix.find((entry) => {
    return Object.entries(entry.dimensionValues).every(
      ([key, val]) => selectedDimensions[key] === val
    );
  });
}

// ─── Bileşen ─────────────────────────────────────────────────────────────────

export default function ProductDetailClient({
  product,
  initialReviews,
}: {
  product: any;
  initialReviews: any[];
}) {
  const [quantity, setQuantity] = useState(1);
  const [customizationData, setCustomizationData] = useState<Record<string, any>>({});
  const { addItem } = useCartStore();
  const router = useRouter();
  const { data: session } = useSession();

  const [activeImage, setActiveImage] = useState(
    product.images?.[0] || "https://placehold.co/800x800"
  );

  // Review Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Mobile Sticky Bar State
  const [showStickyBar, setShowStickyBar] = useState(false);

  // Populate guest name if user session is active
  useEffect(() => {
    if (session?.user?.name) {
      setReviewName(session.user.name);
    }
  }, [session]);

  // Monitor scroll for mobile sticky bar visibility
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 600) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Simüle canlı izleyici sayısı
  const [viewerCount, setViewerCount] = useState(() =>
    Math.floor(Math.random() * 2900) + 100
  );
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setViewerCount((prev) => {
        const change = Math.floor(Math.random() * 15) - 5;
        return Math.max(100, Math.min(3000, prev + change));
      });
    }, Math.random() * 10000 + 5000);
    return () => clearInterval(updateInterval);
  }, []);

  // Tasarım yöntemi — 3'lü karşılıklı seçim
  // 'upload': kendi tasarımını yükle | 'photo_to_design': fotoğraftan tasarım | 'template': hazır şablon
  const [selectedDesignMethod, setSelectedDesignMethod] = useState<'upload' | 'photo_to_design' | 'template' | null>(null);

  // Tasarım şablonları
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showingBack, setShowingBack] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Tasarım dosyası upload
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; url: string }>>([]);
  const [convertToPrint, setConvertToPrint] = useState(false);

  const { startUpload: uploadDesignFile, isUploading: isUploadingDesign } =
    useUploadThing("designFileUploader", {
      onClientUploadComplete: (res) => {
        if (res && res.length > 0) {
          const newFiles = res.map((file: any) => ({
            name: file.name,
            size: file.size,
            url: file.url,
          }));
          setUploadedFiles((prev) => [...prev, ...newFiles]);
          toast.success(`${res.length} dosya yüklendi`);
        }
      },
      onUploadError: (error) => {
        toast.error("Dosya yükleme hatası: " + error.message);
      },
    });

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const params = new URLSearchParams();
        params.set("productId", product.id);
        if (product.subcategory) {
          params.set("subcategory", product.subcategory);
        }
        const res = await fetch(`/api/design-templates?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.filter((t: any) => t.isActive));
        }
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplates();
  }, [product.id, product.subcategory]);

  useEffect(() => {
    if (templates.length <= 4) return;
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % templates.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [templates.length]);

  const uniqueNiches = Array.from(new Set(templates.flatMap((t) => t.nicheLabels)));
  const filteredTemplates = selectedNiche
    ? templates.filter((t) => t.nicheLabels.includes(selectedNiche))
    : templates;

  const avgRating =
    initialReviews.length > 0
      ? initialReviews.reduce((sum, r) => sum + r.rating, 0) / initialReviews.length
      : 0;

  const handleCustomizationChange = (id: string, value: any) => {
    setCustomizationData((prev) => ({ ...prev, [id]: value }));
  };

  // ── Customization Options Çözümleme ────────────────────────────────────────

  const resolved = useMemo(
    () => resolveCustomizationFormat(product.customizationOptions),
    [product.customizationOptions]
  );

  // ── YENİ FORMAT STATE ───────────────────────────────────────────────────────

  // Seçilen dimension değerleri: { ozellik_8: "Oval Kesim", ozellik_7: "250 gr. Bristol" }
  const [selectedDimensions, setSelectedDimensions] = useState<Record<string, string>>(() => {
    if (resolved.mode !== "new" || !resolved.newOpts) return {};
    // Varsayılan: her dimension'ın ilk seçeneği
    const defaults: Record<string, string> = {};
    for (const dim of resolved.newOpts.variantDimensions) {
      if (dim.options.length > 0) {
        defaults[dim.key] = dim.options[0];
      }
    }
    return defaults;
  });

  // Eşleşen priceMatrix entry'si
  const matchingEntry = useMemo<PriceMatrixEntry | undefined>(() => {
    if (resolved.mode !== "new" || !resolved.newOpts) return undefined;
    return findMatchingEntry(resolved.newOpts.priceMatrix, selectedDimensions);
  }, [resolved, selectedDimensions]);

  // Adet tier listesi (yeni format)
  const newFormatTiers: PriceTier[] = useMemo(() => {
    if (!matchingEntry) return [];
    return matchingEntry.tiers;
  }, [matchingEntry]);

  // Seçilen adet (yeni format)
  const [selectedQuantityNew, setSelectedQuantityNew] = useState<number>(() => {
    return 0; // placeholder; useEffect ile düzenlenir
  });

  // Tier listesi değişince seçili adet sıfırla
  useEffect(() => {
    if (resolved.mode === "new" && newFormatTiers.length > 0) {
      setSelectedQuantityNew(newFormatTiers[0].quantity);
    }
  }, [resolved.mode, newFormatTiers]);

  // Seçili tier (yeni format)
  const selectedTierNew: PriceTier | undefined = useMemo(() => {
    return newFormatTiers.find((t) => t.quantity === selectedQuantityNew) || newFormatTiers[0];
  }, [newFormatTiers, selectedQuantityNew]);

  // ── ESKİ FORMAT STATE (Geriye Dönük) ───────────────────────────────────────

  const legacyVariants = resolved.mode === "legacy_variants" ? (resolved.legacyVariants ?? []) : [];
  const uniqueMaterials = Array.from(
    new Set(legacyVariants.map((v: any) => v.material).filter(Boolean))
  ) as string[];
  const [selectedMaterial, setSelectedMaterial] = useState(uniqueMaterials[0] || "");

  const availableLegacyQuantities = legacyVariants
    .filter((v: any) => !selectedMaterial || v.material === selectedMaterial)
    .sort((a: any, b: any) => a.quantity - b.quantity);

  const [legacyQuantity, setLegacyQuantity] = useState(1);
  React.useEffect(() => {
    if (resolved.mode === "legacy_variants" && availableLegacyQuantities.length > 0) {
      const match = availableLegacyQuantities.find((v: any) => v.quantity === legacyQuantity);
      if (!match) setLegacyQuantity(availableLegacyQuantities[0].quantity);
    }
  }, [selectedMaterial, resolved.mode]);

  const selectedLegacyVariant =
    availableLegacyQuantities.find((v: any) => v.quantity === legacyQuantity) ||
    availableLegacyQuantities[0];

  // ── Gösterilecek Fiyat ─────────────────────────────────────────────────────

  const displayPrice = useMemo(() => {
    if (resolved.mode === "new" && selectedTierNew) {
      return selectedTierNew.salePrice;
    }
    if (resolved.mode === "legacy_variants" && selectedLegacyVariant) {
      return selectedLegacyVariant.salePrice;
    }
    return product.price;
  }, [resolved.mode, selectedTierNew, selectedLegacyVariant, product.price]);

  const displayUnitPrice = useMemo(() => {
    if (resolved.mode === "new" && selectedTierNew) {
      return selectedTierNew.unitSalePrice;
    }
    if (resolved.mode === "legacy_variants" && selectedLegacyVariant) {
      return selectedLegacyVariant.unitSalePrice;
    }
    return undefined;
  }, [resolved.mode, selectedTierNew, selectedLegacyVariant]);

  // ── Sepete Ekle ────────────────────────────────────────────────────────────

  const handleAddToCart = () => {
    const photoToDesignFee = product.photoToDesignFee ?? 500;
    const extraServices = selectedDesignMethod === 'photo_to_design'
      ? [{ type: "photo_to_design", label: "Fotoğraftan Tasarım Hizmeti", price: photoToDesignFee }]
      : undefined;

    const dataWithFiles = {
      ...customizationData,
      uploadedFiles,
      convertToPrint: selectedDesignMethod === 'photo_to_design',
    };

    const templateFields = selectedDesignMethod === 'template' && selectedTemplate
      ? {
          selectedDesignTemplateId: selectedTemplate.id as string,
          selectedDesignTemplateName: (selectedTemplate.product?.name ||
            selectedTemplate.subcategory ||
            "Hazır Tasarım") as string,
        }
      : {};

    if (resolved.mode === "new") {
      addItem({
        productId: product.id,
        name: product.name,
        price: displayPrice,
        quantity: 1,
        image: product.images?.[0] || "https://placehold.co/400x400",
        category: product.category,
        extraServices,
        customizationData: {
          ...dataWithFiles,
          dimensionValues: selectedDimensions,
          selectedQuantity: selectedTierNew?.quantity ?? 0,
          packageId: matchingEntry?.packageId,
          salePrice: displayPrice,
          unitSalePrice: displayUnitPrice,
        },
        ...templateFields,
      });
    } else if (resolved.mode === "legacy_variants") {
      addItem({
        productId: product.id,
        name: product.name,
        price: displayPrice,
        quantity: 1,
        image: product.images?.[0] || "https://placehold.co/400x400",
        category: product.category,
        extraServices,
        customizationData: {
          ...dataWithFiles,
          quantity: legacyQuantity,
          material: selectedMaterial,
        },
        ...templateFields,
      });
    } else {
      addItem({
        productId: product.id,
        name: product.name,
        price: displayPrice,
        quantity,
        image: product.images?.[0] || "https://placehold.co/400x400",
        category: product.category,
        extraServices,
        customizationData: dataWithFiles,
        ...templateFields,
      });
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating: reviewRating,
          guestName: reviewName.trim(),
          text: reviewText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Yorum gönderilemedi.");
      }

      toast.success("Yorumunuz alındı, onay sonrası yayınlanacak");
      setReviewText("");
      setIsReviewModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ── Legacy Options (eski dosya yükleme / text alanları) ───────────────────

  const legacyOptions = resolved.mode === "legacy_options" ? (resolved.legacyOptions ?? []) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 lg:px-16">
      <Link
        href="/magaza"
        className="inline-flex items-center gap-2 text-corp-gray hover:text-corp-teal transition-colors mb-8"
      >
        <ArrowLeft size={16} /> Mağazaya Dön
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <div className="-mx-4 sm:mx-0 space-y-4">
          <div className="aspect-square bg-white sm:rounded-3xl border-y sm:border border-corp-border p-4 sm:p-8 flex items-center justify-center overflow-hidden">
            <SafeImage
              src={activeImage}
              alt={product.name}
              className="w-full h-full object-contain"
              fallback="/placeholder.webp"
            />
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-4 overflow-x-auto hide-scrollbar px-4 sm:px-0">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`w-20 h-20 flex-shrink-0 bg-white rounded-xl border p-2 flex items-center justify-center transition-all ${
                    activeImage === img
                      ? "border-corp-teal ring-2 ring-corp-teal/20"
                      : "border-corp-border hover:border-corp-gray"
                  }`}
                >
                  <SafeImage
                    src={img}
                    alt={`${product.name} ${i}`}
                    className="w-full h-full object-contain"
                    fallback="/placeholder.webp"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Actions */}
        <div className="flex flex-col px-4 sm:px-0">
          {/* 1. Ürün adı (başlık) */}
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-corp-charcoal mb-4">
            {product.name}
          </h1>

          {/* 2. Değerlendirme (yıldız + "X Değerlendirme" linki) */}
          <div className="flex items-center gap-4 mb-4">
            {product.stock === 0 && (
              <span className="bg-corp-gray text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                Stok Dışı
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-corp-charcoal">
                {avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-corp-gray underline cursor-pointer hover:text-corp-teal">
                {initialReviews.length} Değerlendirme
              </span>
            </div>
          </div>

          {/* 3. Live Viewer Count Badge */}
          <div className="flex items-center gap-2 bg-corp-teal/5 border border-corp-teal/20 rounded-full px-4 py-2 mb-4 w-fit">
            <div className="relative">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-sm font-semibold text-corp-teal flex items-center gap-1">
              <Users size={14} />
              {viewerCount} kişi şu an görüntülüyor
            </span>
          </div>

          {/* 4. Fiyat Gösterimi */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="font-display text-3xl font-bold text-corp-teal">
                {displayPrice.toLocaleString("tr-TR")} TL
              </div>
              {product.freeShipping && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/90 dark:border-emerald-800/40 shadow-xs">
                  <Truck size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Ücretsiz Kargo</span>
                </span>
              )}
            </div>
            {product.freeShipping && (
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <span>✓</span> Ücretsiz kargo ile gönderilir
              </p>
            )}
            {displayUnitPrice !== undefined && displayUnitPrice > 0 && (
              <div className="text-sm text-corp-gray mt-1">
                Birim fiyat:{" "}
                <span className="font-semibold text-corp-charcoal">
                  {displayUnitPrice.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  TL
                </span>
              </div>
            )}
          </div>

          <p className="text-corp-gray leading-relaxed mb-8 border-b border-corp-border pb-8">
            {product.description}
          </p>

          {/* ── YENİ FORMAT: Varyant Boyutları + Adet Seçimi ────────────── */}
          {resolved.mode === "new" && resolved.newOpts && (
            <div className="mb-8 bg-corp-surface/50 p-6 rounded-2xl border border-corp-border space-y-5">
              <h3 className="font-display font-semibold text-corp-charcoal">
                Sipariş Seçenekleri
              </h3>

              {/* Her dimension için bir dropdown */}
              {resolved.newOpts.variantDimensions.map((dim: VariantDimension) => (
                <div key={dim.key}>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                    {dim.label}
                  </label>
                  <select
                    id={`dim-${dim.key}`}
                    value={selectedDimensions[dim.key] || ""}
                    onChange={(e) =>
                      setSelectedDimensions((prev) => ({
                        ...prev,
                        [dim.key]: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all bg-white"
                  >
                    {dim.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Adet seçimi (priceMatrix'ten gelen tiers) */}
              {newFormatTiers.length > 0 ? (
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                    Adet
                  </label>
                  <select
                    id="tier-quantity"
                    value={selectedQuantityNew}
                    onChange={(e) => setSelectedQuantityNew(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all bg-white"
                  >
                    {newFormatTiers.map((tier) => (
                      <option key={tier.quantity} value={tier.quantity}>
                        {tier.quantity.toLocaleString("tr-TR")} Adet —{" "}
                        {tier.salePrice.toLocaleString("tr-TR")} TL
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-sm text-corp-gray italic bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  Bu kombinasyon için fiyat bulunamadı. Lütfen farklı bir seçenek deneyin.
                </div>
              )}
            </div>
          )}

          {/* ── ESKİ FORMAT: Malzeme + Adet (Geriye Dönük) ──────────────── */}
          {resolved.mode === "legacy_variants" && legacyVariants.length > 0 && (
            <div className="mb-8 bg-corp-surface/50 p-6 rounded-2xl border border-corp-border space-y-6">
              <h3 className="font-display font-semibold text-corp-charcoal">
                Sipariş Seçenekleri
              </h3>

              {uniqueMaterials.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                    Malzeme Türü
                  </label>
                  <select
                    value={selectedMaterial}
                    onChange={(e) => setSelectedMaterial(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all bg-white"
                  >
                    {uniqueMaterials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                  Adet
                </label>
                <select
                  value={legacyQuantity}
                  onChange={(e) => setLegacyQuantity(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all bg-white"
                >
                  {availableLegacyQuantities.map((v: any) => (
                    <option key={v.quantity} value={v.quantity}>
                      {v.quantity} Adet
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── ESKİ FORMAT: Özelleştirme seçenekleri (enabled options) ──── */}
          {resolved.mode === "legacy_options" && legacyOptions.length > 0 && (
            <div className="mb-8 bg-corp-surface/50 p-6 rounded-2xl border border-corp-border space-y-6">
              <h3 className="font-display font-semibold text-corp-charcoal">
                Ürün Özelleştirme
              </h3>

              {legacyOptions.map((opt: any) => (
                <div key={opt.id}>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                    {opt.label}
                  </label>

                  {opt.type === "text" && (
                    <input
                      type="text"
                      onChange={(e) => handleCustomizationChange(opt.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all"
                      placeholder={`${opt.label} giriniz`}
                    />
                  )}

                  {opt.type === "textarea" && (
                    <textarea
                      rows={3}
                      onChange={(e) => handleCustomizationChange(opt.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all"
                      placeholder={`${opt.label} giriniz`}
                    />
                  )}

                  {opt.type === "color_picker" && (
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        onChange={(e) => handleCustomizationChange(opt.id, e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer border-0 p-0"
                      />
                      <span className="text-sm text-corp-gray uppercase">
                        {customizationData[opt.id] || "#000000"}
                      </span>
                    </div>
                  )}

                  {opt.type === "date" && (
                    <input
                      type="date"
                      onChange={(e) => handleCustomizationChange(opt.id, e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-corp-border focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all"
                    />
                  )}

                  {(opt.type === "image_upload" || opt.type === "file_upload") && (
                    <div className="relative w-full">
                      <input
                        type="file"
                        onChange={(e) =>
                          handleCustomizationChange(opt.id, e.target.files?.[0]?.name)
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="w-full px-4 py-4 rounded-lg border-2 border-dashed border-corp-border flex items-center justify-center gap-3 bg-white hover:border-corp-teal hover:bg-corp-teal/5 transition-all text-corp-gray">
                        {opt.type === "image_upload" ? (
                          <ImageIcon size={20} />
                        ) : (
                          <Upload size={20} />
                        )}
                        <span className="font-semibold">
                          {customizationData[opt.id] || "Dosya Seçin"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add to Cart Area */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-auto">
            {/* Serbest adet sadece variant/tier olmayan ürünlerde */}
            {resolved.mode === "none" && (
              <div className="flex items-center border border-corp-border rounded-xl overflow-hidden bg-white w-full sm:w-auto h-14">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-14 h-full flex items-center justify-center text-corp-gray hover:bg-corp-surface transition-colors"
                >
                  <Minus size={18} />
                </button>
                <span className="w-14 h-full flex items-center justify-center font-body text-lg font-semibold text-corp-charcoal">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-14 h-full flex items-center justify-center text-corp-gray hover:bg-corp-surface transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>
            )}

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || (resolved.mode === "new" && newFormatTiers.length === 0)}
              className="flex-1 h-14 bg-corp-teal text-white flex items-center justify-center gap-3 rounded-xl font-display font-bold text-lg hover:bg-corp-teal-600 transition-all shadow-corp-hover disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <ShoppingBag size={20} />
              {product.stock === 0
                ? "Stokta Yok"
                : resolved.mode === "new" && newFormatTiers.length === 0
                ? "Bu Kombinasyon Mevcut Değil"
                : "Sepete Ekle"}
            </button>
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div className="pt-16 border-t border-corp-border">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-display text-3xl font-bold text-corp-charcoal">
            Müşteri Yorumları
          </h2>
          <button
            onClick={() => setIsReviewModalOpen(true)}
            className="bg-white border border-corp-border text-corp-charcoal px-6 py-3 rounded-lg font-semibold hover:bg-corp-surface transition-colors"
          >
            Yorum Yaz
          </button>
        </div>

        {initialReviews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-corp-border text-corp-gray">
            <Star className="w-12 h-12 text-corp-border mx-auto mb-4" />
            <p>Bu ürün için henüz değerlendirme yapılmamış.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {initialReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white p-6 rounded-2xl border border-corp-border"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= review.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-200 fill-gray-200"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-xs text-corp-gray">
                    {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-bold text-sm text-corp-charcoal">
                    {review.guestName || "İsimsiz Kullanıcı"}
                  </span>
                  {review.isVerifiedPurchase && (
                    <span className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-bold uppercase">
                      <Check size={10} /> Doğrulanmış Alıcı
                    </span>
                  )}
                </div>
                <p className="text-sm text-corp-gray leading-relaxed mb-4">
                  {review.text}
                </p>

                {review.images?.length > 0 && (
                  <div className="flex gap-2">
                    {review.images.map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        alt="Review"
                        className="w-16 h-16 object-cover rounded-lg border border-corp-border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/64x64?text=Görsel+Yok";
                        }}
                      />
                    ))}
                  </div>
                )}

                {review.adminReply && (
                  <div className="mt-4 p-4 bg-corp-surface rounded-xl border-l-2 border-corp-teal">
                    <p className="text-xs font-bold text-corp-charcoal mb-1">
                      Çiçekana Yanıtı:
                    </p>
                    <p className="text-sm text-corp-gray">{review.adminReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Tasarım Seçim Bölümü ─────────────────────────────────────────── */}
      {product.category?.toUpperCase() === "BASKI" && (
        <div className="pt-16 border-t border-corp-border">
          <h2 className="font-display text-3xl font-bold text-corp-charcoal mb-2">
            Tasarım Seçeneği
          </h2>
          <p className="text-corp-gray mb-6">Aşağıdaki üç seçenekten yalnızca birini seçin.</p>

          {/* ── 3-Way Method Selector ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                key: 'upload' as const,
                icon: <Upload className="w-6 h-6" />,
                title: 'Kendi Tasarımımı Yükle',
                desc: 'PDF, AI veya CDR formatında tasarım dosyanızı yükleyin.',
              },
              {
                key: 'photo_to_design' as const,
                icon: <ImageIcon className="w-6 h-6" />,
                title: `Fotoğraftan Tasarım (+${product.photoToDesignFee ?? 500} TL)`,
                desc: 'Elimde sadece görsel var, profesyonel tasarıma dönüştürün.',
              },
              {
                key: 'template' as const,
                icon: <Layers className="w-6 h-6" />,
                title: 'Hazır Şablon Seç',
                desc: 'Ücretsiz hazır tasarımlardan birini seçin.',
              },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  if (selectedDesignMethod === opt.key) {
                    setSelectedDesignMethod(null);
                  } else {
                    setSelectedDesignMethod(opt.key);
                    // Clear incompatible selections
                    if (opt.key !== 'template') {
                      setSelectedTemplate(null);
                      setLightboxOpen(false);
                    }
                    if (opt.key !== 'upload' && opt.key !== 'photo_to_design') {
                      setUploadedFiles([]);
                    }
                  }
                }}
                className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                  selectedDesignMethod === opt.key
                    ? 'border-corp-teal bg-corp-teal/5 shadow-md'
                    : 'border-corp-border bg-white hover:border-corp-teal/40'
                }`}
              >
                {selectedDesignMethod === opt.key && (
                  <div className="absolute top-3 right-3 w-5 h-5 bg-corp-teal rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={`mb-3 ${
                  selectedDesignMethod === opt.key ? 'text-corp-teal' : 'text-corp-gray'
                }`}>{opt.icon}</div>
                <h3 className="font-semibold text-sm text-corp-charcoal mb-1">{opt.title}</h3>
                <p className="text-xs text-corp-gray leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>

          {/* ── Seçim 1: Kendi Tasarımını Yükle ── */}
          <AnimatePresence>
            {selectedDesignMethod === 'upload' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden mb-8"
              >
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Önemli Bilgi</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Lütfen tasarım dosyalarınızı PDF, AI (Adobe Illustrator) veya CDR
                      (CorelDRAW) formatında yükleyin. Maksimum dosya boyutu 32MB&apos;dir.
                    </p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-corp-border rounded-xl p-8 text-center hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer mb-6">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.ai,.cdr,.eps"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      const validExtensions = [".pdf", ".ai", ".cdr", ".eps"];
                      const validFiles = files.filter((file) => {
                        const ext = "." + file.name.split(".").pop()?.toLowerCase();
                        return validExtensions.includes(ext);
                      });
                      if (validFiles.length !== files.length) {
                        toast.error("Sadece PDF, AI, CDR veya EPS dosyaları yüklenebilir.");
                      }
                      if (validFiles.length > 0) {
                        const maxSize = 32 * 1024 * 1024;
                        const oversizedFiles = validFiles.filter((f) => f.size > maxSize);
                        if (oversizedFiles.length > 0) {
                          toast.error("Dosya boyutu 32MB'ı geçemez.");
                          return;
                        }
                        uploadDesignFile(validFiles);
                      }
                    }}
                    className="hidden"
                    id="design-file-upload"
                  />
                  <label htmlFor="design-file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-corp-gray mb-4" />
                    <p className="text-lg font-semibold text-corp-charcoal mb-2">Tasarım Dosyalarını Seçin</p>
                    <p className="text-sm text-corp-gray">PDF, AI, CDR veya EPS formatında • Max 32MB</p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-corp-charcoal">Yüklenen Dosyalar</h3>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-corp-border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-corp-gray" />
                          <div>
                            <p className="text-sm font-semibold text-corp-charcoal">{file.name}</p>
                            <p className="text-xs text-corp-gray">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                            toast.success("Dosya kaldırıldı");
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Seçim 2: Fotoğraftan Tasarım ── */}
          <AnimatePresence>
            {selectedDesignMethod === 'photo_to_design' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden mb-8"
              >
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-4">
                  <p className="text-sm text-blue-700 font-semibold">Fotoğraftan Tasarım Hizmeti seçili (+{product.photoToDesignFee ?? 500} TL)</p>
                  <p className="text-xs text-blue-600 mt-1">Gönderdiğiniz fotoğraftan profesyonel baskıya uygun bir tasarım hazırlıyoruz (300 DPI, CMYK).</p>
                </div>

                <div className="border-2 border-dashed border-corp-border rounded-xl p-6 text-center hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) uploadDesignFile(files);
                    }}
                    className="hidden"
                    id="image-file-upload"
                  />
                  <label htmlFor="image-file-upload" className="cursor-pointer">
                    <ImageIcon className="mx-auto h-8 w-8 text-corp-gray mb-2" />
                    <p className="text-sm text-corp-gray">
                      <span className="font-semibold text-corp-teal">Görsel seçin</span> veya sürükleyip bırakın
                    </p>
                  </label>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h3 className="text-sm font-semibold text-corp-charcoal">Yüklenen Dosyalar</h3>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-corp-border">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-corp-gray" />
                          <div>
                            <p className="text-sm font-semibold text-corp-charcoal">{file.name}</p>
                            <p className="text-xs text-corp-gray">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
                            toast.success("Dosya kaldırıldı");
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Seçim 3: Hazır Şablon ── */}
          <AnimatePresence>
            {selectedDesignMethod === 'template' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden mb-8"
              >
                {templates.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-corp-border text-corp-gray">
                    <Layers className="w-12 h-12 text-corp-border mx-auto mb-4" />
                    <p>Bu ürün için henüz hazır tasarım eklenmemiş.</p>
                  </div>
                ) : (
                  <>
                    {selectedTemplate && (
                      <div className="mb-4 flex items-center gap-3 p-3 bg-corp-teal/5 rounded-xl border border-corp-teal/20">
                        <Check className="w-5 h-5 text-corp-teal flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-corp-teal">Seçilen Tasarım</p>
                          <p className="text-xs text-corp-gray truncate">
                            {selectedTemplate.product?.name || selectedTemplate.subcategory || 'Hazır Tasarım'}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTemplate(null)}
                          className="p-1 text-corp-gray hover:text-red-500 rounded-full transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {uniqueNiches.length > 0 && (
                      <div className="flex items-center gap-3 mb-6 overflow-x-auto pb-2">
                        <button
                          onClick={() => setSelectedNiche(null)}
                          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                            selectedNiche === null
                              ? 'bg-corp-teal text-white shadow-md'
                              : 'bg-white text-corp-gray border border-corp-border hover:border-corp-teal'
                          }`}
                        >
                          Tümü
                        </button>
                        {uniqueNiches.map((niche) => (
                          <button
                            key={niche}
                            onClick={() => setSelectedNiche(niche)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                              selectedNiche === niche
                                ? 'bg-corp-teal text-white shadow-md'
                                : 'bg-white text-corp-gray border border-corp-border hover:border-corp-teal'
                            }`}
                          >
                            {niche}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory">
                      {filteredTemplates.map((template) => {
                        const frontSrc = template.frontImageUrl || template.frontImage;
                        const isSelected = selectedTemplate?.id === template.id;
                        return (
                          <div
                            key={template.id}
                            className={`flex-shrink-0 w-56 sm:w-64 snap-start cursor-pointer group`}
                            onClick={() => {
                              setSelectedTemplate(template);
                              setShowingBack(false);
                              setLightboxOpen(true);
                            }}
                          >
                            <div className={`aspect-[4/3] rounded-2xl overflow-hidden border-2 bg-gray-50 relative transition-all ${
                              isSelected ? 'border-corp-teal shadow-md' : 'border-corp-border'
                            }`}>
                              <img
                                src={frontSrc}
                                alt={template.product?.name || template.subcategory || 'Tasarım'}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://placehold.co/400x300?text=Görsel+Yok";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Eye className="w-8 h-8 text-white" />
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 bg-corp-teal rounded-full flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="mt-2">
                              <h3 className="font-semibold text-corp-charcoal text-sm truncate">
                                {template.product?.name || template.subcategory || 'Tasarım'}
                              </h3>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {template.nicheLabels.slice(0, 2).map((label: string, i: number) => (
                                  <span key={i} className="text-[10px] bg-corp-teal/10 text-corp-teal px-2 py-0.5 rounded-full">
                                    {label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* (Design Templates gallery has been moved into the 3-way selector above) */}

      {/* Template Lightbox */}
      {lightboxOpen && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <X size={32} />
          </button>

          <div className="max-w-4xl w-full">
            <div className="aspect-video rounded-2xl overflow-hidden bg-gray-900 relative">
              <img
                src={
                  showingBack && selectedTemplate.backImage
                    ? selectedTemplate.backImage
                    : selectedTemplate.frontImage
                }
                alt="Template"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://placehold.co/800x450?text=Görsel+Yok";
                }}
              />
              {selectedTemplate.backImage && (
                <button
                  onClick={() => setShowingBack(!showingBack)}
                  className="absolute bottom-4 right-4 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all"
                >
                  {showingBack ? "Ön Yüz" : "Arka Yüz"}
                </button>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {selectedTemplate.product?.name || selectedTemplate.subcategory || 'Hazır Tasarım'}
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedTemplate.nicheLabels.map((label: string, i: number) => (
                    <span
                      key={i}
                      className="text-sm bg-corp-teal/20 text-corp-teal px-3 py-1 rounded-full"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTemplate(selectedTemplate);
                  setLightboxOpen(false);
                  toast.success("Tasarım seçildi!");
                }}
                className="bg-corp-teal text-white px-8 py-3 rounded-xl font-semibold hover:bg-corp-teal-600 transition-all"
              >
                Bu Tasarımı Seç
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sticky Mobile Add to Cart Bar */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-corp-border p-4 flex items-center justify-between gap-4 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={activeImage}
                alt={product.name}
                className="w-12 h-12 object-contain rounded-lg border border-corp-border bg-white flex-shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-corp-charcoal truncate">
                  {product.name}
                </h4>
                <div className="font-display text-base font-bold text-corp-teal">
                  {displayPrice.toLocaleString("tr-TR")} TL
                </div>
              </div>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || (resolved.mode === "new" && newFormatTiers.length === 0)}
              className="bg-corp-teal text-white px-5 py-3 rounded-xl font-display font-bold text-sm hover:bg-corp-teal-600 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shadow-md"
            >
              <ShoppingBag size={16} />
              {product.stock === 0 ? "Stokta Yok" : "Sepete Ekle"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-3xl border border-corp-border p-6 shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-full transition-all"
              >
                <X size={18} />
              </button>

              <h3 className="font-display text-xl font-bold text-corp-charcoal mb-4">
                Değerlendirme Yazın
              </h3>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star Rating Selector */}
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                    Puanınız
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={28}
                          className={
                            star <= reviewRating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-200 fill-gray-200"
                          }
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-corp-gray ml-2">
                      {reviewRating === 5
                        ? "Harika!"
                        : reviewRating === 4
                        ? "Çok İyi"
                        : reviewRating === 3
                        ? "Ortalama"
                        : reviewRating === 2
                        ? "Kötü değil"
                        : "Çok kötü"}
                    </span>
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Adınız / Görünmek İstediğiniz İsim
                  </label>
                  <input
                    type="text"
                    required
                    value={reviewName}
                    onChange={(e) => setReviewName(e.target.value)}
                    placeholder="Örn: Ahmet Yılmaz"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>

                {/* Textarea */}
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Yorumunuz
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Bu ürün hakkındaki deneyimlerinizi paylaşın..."
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="bg-corp-teal text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm flex items-center gap-2"
                  >
                    {isSubmittingReview ? "Gönderiliyor..." : "Yorumu Gönder"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
