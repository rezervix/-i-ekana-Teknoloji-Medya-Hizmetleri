"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useCartStore } from "@/store/useCartStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { trackViewItem, trackAddToCart, getABVariant } from "@/lib/analytics";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import type {
  ProductCustomizationOptions,
  NewFormatCustomizationOptions,
  PriceMatrixEntry,
  PriceTier,
} from "@/types/product";
import {
  isNewFormat,
  isLegacyVariantsFormat,
  isLegacyOptionsArray,
} from "@/types/product";
import { calculateDetailPrice, findMatchingPriceMatrixEntry } from "@/lib/magaza/detail-calculator";

// Modular Subcomponents
import ProductGallery from "./components/ProductGallery";
import ProductHeader from "./components/ProductHeader";
import ProductStepConfigurator from "./components/ProductStepConfigurator";
import ProductTrustBadges from "./components/ProductTrustBadges";
import ProductTabs from "./components/ProductTabs";
import ProductTemplateLightbox from "./components/ProductTemplateLightbox";
import ProductReviewsSection from "./components/ProductReviewsSection";
import ProductRelatedSection from "./components/ProductRelatedSection";
import StickyMobileBar from "./components/StickyMobileBar";
import ProductReviewModal from "./components/ProductReviewModal";

// ── Helper: Resolve Customization Format ─────────────────────────────────────
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

export default function ProductDetailClient({
  product,
  initialReviews = [],
  relatedProducts = [],
}: {
  product: any;
  initialReviews: any[];
  relatedProducts?: any[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [customizationData, setCustomizationData] = useState<Record<string, any>>({});
  const [variantError, setVariantError] = useState<string | null>(null);

  // Review states
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewName, setReviewName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Mobile sticky bar
  const [showStickyBar, setShowStickyBar] = useState(false);

  // A/B test variant for CTA
  const [ctaVariant, setCtaVariant] = useState<string>("control");

  // 3-Way Design Method State ('upload' | 'photo_to_design' | 'template' | null)
  const [selectedDesignMethod, setSelectedDesignMethod] = useState<
    "upload" | "photo_to_design" | "template" | null
  >(null);

  // Design Templates & Lightbox
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [lightboxTemplate, setLightboxTemplate] = useState<any>(null);

  // Customer Design Files Upload
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: number; url: string }>>([]);
  const [isUploadingDesign, setIsUploadingDesign] = useState(false);

  // Resolve customization format
  const resolved = useMemo(
    () => resolveCustomizationFormat(product.customizationOptions),
    [product.customizationOptions]
  );

  // ── 1. NEW FORMAT: variantDimensions State ─────────────────────────────────
  const [selectedDimensions, setSelectedDimensions] = useState<Record<string, string>>(() => {
    if (resolved.mode !== "new" || !resolved.newOpts) return {};
    const defaults: Record<string, string> = {};
    for (const dim of resolved.newOpts.variantDimensions) {
      if (dim.options.length > 0) {
        defaults[dim.key] = dim.options[0];
      }
    }
    return defaults;
  });

  const matchingEntry = useMemo<PriceMatrixEntry | undefined>(() => {
    if (resolved.mode !== "new" || !resolved.newOpts) return undefined;
    return findMatchingPriceMatrixEntry(resolved.newOpts.priceMatrix, selectedDimensions);
  }, [resolved, selectedDimensions]);

  const newFormatTiers: PriceTier[] = useMemo(() => {
    if (!matchingEntry) return [];
    return matchingEntry.tiers;
  }, [matchingEntry]);

  const [selectedQuantityNew, setSelectedQuantityNew] = useState<number>(0);

  useEffect(() => {
    if (resolved.mode === "new" && newFormatTiers.length > 0) {
      setSelectedQuantityNew(newFormatTiers[0].quantity);
    }
  }, [resolved.mode, newFormatTiers]);

  const selectedTierNew: PriceTier | undefined = useMemo(() => {
    return newFormatTiers.find((t) => t.quantity === selectedQuantityNew) || newFormatTiers[0];
  }, [newFormatTiers, selectedQuantityNew]);

  // ── 2. LEGACY FORMAT: Materials & Quantities ──────────────────────────────
  const legacyVariants = resolved.mode === "legacy_variants" ? (resolved.legacyVariants ?? []) : [];
  const uniqueMaterials = Array.from(
    new Set(legacyVariants.map((v: any) => v.material).filter(Boolean))
  ) as string[];
  const [selectedMaterial, setSelectedMaterial] = useState(uniqueMaterials[0] || "");

  const availableLegacyQuantities = legacyVariants
    .filter((v: any) => !selectedMaterial || v.material === selectedMaterial)
    .sort((a: any, b: any) => a.quantity - b.quantity);

  const [legacyQuantity, setLegacyQuantity] = useState(1);

  useEffect(() => {
    if (resolved.mode === "legacy_variants" && availableLegacyQuantities.length > 0) {
      const match = availableLegacyQuantities.find((v: any) => v.quantity === legacyQuantity);
      if (!match) setLegacyQuantity(availableLegacyQuantities[0].quantity);
    }
  }, [selectedMaterial, resolved.mode, availableLegacyQuantities, legacyQuantity]);

  // ── 3. Price Calculation via Pure Calculator ──────────────────────────────
  const calculationResult = useMemo(() => {
    return calculateDetailPrice({
      mode: resolved.mode,
      selectedDimensions,
      selectedQuantity: resolved.mode === "new" ? selectedQuantityNew : legacyQuantity,
      priceMatrix: resolved.newOpts?.priceMatrix,
      legacyVariants,
      selectedMaterial,
      basePrice: product.price,
      selectedDesignMethod,
      photoToDesignFee: product.photoToDesignFee ?? 500,
    });
  }, [
    resolved.mode,
    resolved.newOpts?.priceMatrix,
    selectedDimensions,
    selectedQuantityNew,
    legacyVariants,
    selectedMaterial,
    legacyQuantity,
    product.price,
    selectedDesignMethod,
    product.photoToDesignFee,
  ]);

  const displayPrice = calculationResult.displayPrice;
  const displayUnitPrice = calculationResult.unitPrice;
  const totalPrice = calculationResult.totalPrice;
  const photoToDesignFee = product.photoToDesignFee ?? 500;

  // ── Analytics, Recently Viewed & Session ──────────────────────────────────
  useEffect(() => {
    const variant = getABVariant("cta_button");
    setCtaVariant(variant);

    if (product?.id) {
      recordRecentlyViewed({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        image: product.images?.[0] || "",
        category: product.category,
      });

      trackViewItem(
        {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
        },
        variant
      );
    }
  }, [product]);

  useEffect(() => {
    if (session?.user?.name) {
      setReviewName(session.user.name);
    }
  }, [session]);

  // Mobile sticky bar visibility monitoring
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 550);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch design templates for this product
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

  // Customer design file upload handler
  const handleUploadDesignFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setIsUploadingDesign(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }
      const res = await fetch("/api/upload/customer-design", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dosyalar yüklenemedi.");
      if (data.files && data.files.length > 0) {
        const newFiles = data.files.map((file: any) => ({
          name: file.name,
          size: file.size,
          url: file.url,
        }));
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} dosya başarıyla yüklendi`);
      }
    } catch (err: any) {
      console.error("[uploadDesignFiles error]", err);
      toast.error(err.message || "Dosya yüklenirken hata oluştu.");
    } finally {
      setIsUploadingDesign(false);
    }
  };

  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validateVariantSelection = (): boolean => {
    if (resolved.mode === "new" && resolved.newOpts) {
      for (const dim of resolved.newOpts.variantDimensions) {
        if (!selectedDimensions[dim.key]) {
          const msg = `Lütfen "${dim.label}" seçeneğini belirleyin.`;
          setVariantError(msg);
          toast.error(msg);
          return false;
        }
      }
      if (!matchingEntry) {
        const msg = "Seçilen varyant kombinasyonu için geçerli bir fiyat bulunamadı.";
        setVariantError(msg);
        toast.error(msg);
        return false;
      }
      if (!selectedTierNew || !selectedTierNew.quantity) {
        const msg = "Lütfen sipariş adedini seçiniz.";
        setVariantError(msg);
        toast.error(msg);
        return false;
      }
    } else if (resolved.mode === "legacy_variants") {
      if (uniqueMaterials.length > 0 && !selectedMaterial) {
        const msg = "Lütfen malzeme türünü seçiniz.";
        setVariantError(msg);
        toast.error(msg);
        return false;
      }
      if (!legacyQuantity) {
        const msg = "Lütfen adet seçiniz.";
        setVariantError(msg);
        toast.error(msg);
        return false;
      }
    }
    setVariantError(null);
    return true;
  };

  // Add to cart handler
  const handleAddToCart = (): boolean => {
    if (product.stock === 0) {
      toast.error("Ürün stokta bulunmamaktadır.");
      return false;
    }

    if (!validateVariantSelection()) {
      return false;
    }

    const extraServices =
      selectedDesignMethod === "photo_to_design"
        ? [
            {
              type: "photo_to_design",
              label: "Fotoğraftan Tasarım Hizmeti",
              price: photoToDesignFee,
            },
          ]
        : undefined;

    const dataWithFiles = {
      ...customizationData,
      uploadedFiles,
      convertToPrint: selectedDesignMethod === "photo_to_design",
    };

    const templateFields =
      selectedDesignMethod === "template" && selectedTemplate
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
        image: product.images?.[0] || "/placeholder.webp",
        category: product.category,
        freeShipping: Boolean(product.freeShipping),
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
        image: product.images?.[0] || "/placeholder.webp",
        category: product.category,
        freeShipping: Boolean(product.freeShipping),
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
        image: product.images?.[0] || "/placeholder.webp",
        category: product.category,
        freeShipping: Boolean(product.freeShipping),
        extraServices,
        customizationData: dataWithFiles,
        ...templateFields,
      });
    }

    toast.success("Ürün sepete eklendi!");

    trackAddToCart(
      {
        id: product.id,
        name: product.name,
        price: displayPrice || product.price,
        quantity: resolved.mode === "none" ? quantity : 1,
        category: product.category,
      },
      ctaVariant
    );

    return true;
  };

  const handleBuyNow = () => {
    const success = handleAddToCart();
    if (success) {
      router.push("/magaza/odeme");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          guestName: reviewName.trim(),
          text: reviewText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Yorum gönderilemedi.");
      toast.success("Yorumunuz alındı, onay sonrası yayınlanacak");
      setReviewText("");
      setIsReviewModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Bir hata oluştu.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 5;

  return (
    <div className="space-y-10">
      {/* ── TOP SECTION: GALLERY + CONFIGURATOR (DESKTOP 2-COL, MOBILE 1-COL) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Gallery (col 1..5/6) */}
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right Column: Header + Steps + Trust (col 6..12) */}
        <div className="lg:col-span-7 flex flex-col">
          {/* 1. Header (Title, Rating, Starting Price, Stock) */}
          <ProductHeader
            product={product}
            avgRating={avgRating}
            reviewCount={reviews.length}
            displayPrice={displayPrice}
            displayUnitPrice={displayUnitPrice}
            onJumpToReviews={() => {
              const el = document.getElementById("reviews");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* 2. Step Configurator Wizard (Steps 1 to 4) */}
          <ProductStepConfigurator
            resolved={resolved}
            selectedDimensions={selectedDimensions}
            onDimensionChange={(key, val) =>
              setSelectedDimensions((prev) => ({ ...prev, [key]: val }))
            }
            newFormatTiers={newFormatTiers}
            selectedQuantityNew={selectedQuantityNew}
            onQuantityNewChange={setSelectedQuantityNew}
            uniqueMaterials={uniqueMaterials}
            selectedMaterial={selectedMaterial}
            onMaterialChange={setSelectedMaterial}
            availableLegacyQuantities={availableLegacyQuantities}
            legacyQuantity={legacyQuantity}
            onLegacyQuantityChange={setLegacyQuantity}
            quantity={quantity}
            onQuantityChange={setQuantity}
            selectedDesignMethod={selectedDesignMethod}
            onDesignMethodChange={setSelectedDesignMethod}
            uploadedFiles={uploadedFiles}
            onUploadDesignFiles={handleUploadDesignFiles}
            isUploadingDesign={isUploadingDesign}
            onRemoveUploadedFile={handleRemoveUploadedFile}
            photoToDesignFee={photoToDesignFee}
            templates={templates}
            selectedNiche={selectedNiche}
            onNicheChange={setSelectedNiche}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onOpenLightbox={(t) => setLightboxTemplate(t)}
            customizationData={customizationData}
            onCustomizationChange={(id, val) =>
              setCustomizationData((prev) => ({ ...prev, [id]: val }))
            }
            displayPrice={displayPrice}
            totalPrice={totalPrice}
            displayUnitPrice={displayUnitPrice}
            variantError={variantError}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            stock={product.stock}
            ctaVariant={ctaVariant}
          />

          {/* 3. Delivery & Trust Badges Strip */}
          <ProductTrustBadges freeShipping={Boolean(product.freeShipping)} />
        </div>
      </div>

      {/* ── TABS SECTION: Özellikler, Kullanım Alanları, Teslimat/İade, SSS ── */}
      <ProductTabs product={product} />

      {/* ── REVIEWS SECTION ────────────────────────────────────────────────── */}
      <ProductReviewsSection
        reviews={reviews}
        avgRating={avgRating}
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
      />

      {/* ── RELATED, RECENTLY VIEWED & RECOMMENDATIONS ─────────────────────── */}
      <ProductRelatedSection
        relatedProducts={relatedProducts}
        currentProductId={product.id}
      />

      {/* ── TEMPLATE LIGHTBOX MODAL ────────────────────────────────────────── */}
      <ProductTemplateLightbox
        isOpen={Boolean(lightboxTemplate)}
        onClose={() => setLightboxTemplate(null)}
        template={lightboxTemplate}
        onSelectTemplate={(t) => {
          setSelectedTemplate(t);
          setSelectedDesignMethod("template");
        }}
        isSelected={selectedTemplate?.id === lightboxTemplate?.id}
      />

      {/* ── REVIEW SUBMISSION MODAL ────────────────────────────────────────── */}
      <ProductReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        rating={reviewRating}
        onRatingChange={setReviewRating}
        name={reviewName}
        onNameChange={setReviewName}
        comment={reviewText}
        onCommentChange={setReviewText}
        onSubmit={handleReviewSubmit}
        isSubmitting={isSubmittingReview}
      />

      {/* ── STICKY MOBILE BAR (44px+ touch targets) ────────────────────────── */}
      <StickyMobileBar
        show={showStickyBar}
        productName={product.name}
        totalPrice={totalPrice}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        stock={product.stock}
      />
    </div>
  );
}
