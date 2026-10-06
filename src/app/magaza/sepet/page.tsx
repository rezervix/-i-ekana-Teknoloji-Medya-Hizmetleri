"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  CheckCircle2,
  Bookmark,
  Trash2,
  Tag,
  ShieldCheck,
  RotateCcw,
  Lock,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";
import { calculateCartTotals } from "@/lib/cart-calculator";
import { STORE_DELIVERY_CONFIG } from "@/config/store.config";
import { useSession } from "next-auth/react";

export default function CartPage() {
  const {
    items,
    savedForLater,
    couponCode,
    removeItem,
    updateQuantity,
    saveForLater,
    moveToCart,
    removeSavedItem,
    setCouponCode,
    syncWithServer,
  } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [showCouponAccordion, setShowCouponAccordion] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync with server when user logs in
  useEffect(() => {
    if (session?.user) {
      syncWithServer();
    }
  }, [session, syncWithServer]);

  useEffect(() => {
    if (couponCode) {
      setCouponInput(couponCode);
    }
  }, [couponCode]);

  // Centralized cart calculation
  const totals = useMemo(() => {
    return calculateCartTotals({
      items,
      couponCode,
      customThreshold: STORE_DELIVERY_CONFIG.freeShippingThreshold,
      customShippingFee: STORE_DELIVERY_CONFIG.standardShippingFee,
    });
  }, [items, couponCode]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    const testResult = calculateCartTotals({
      items,
      couponCode: couponInput.trim(),
      customThreshold: STORE_DELIVERY_CONFIG.freeShippingThreshold,
    });

    if (testResult.couponError) {
      setCouponFeedback({ type: "error", message: testResult.couponError });
    } else if (testResult.appliedCoupon) {
      setCouponCode(testResult.appliedCoupon.code);
      setCouponFeedback({
        type: "success",
        message: `${testResult.appliedCoupon.description} başarıyla uygulandı!`,
      });
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode(null);
    setCouponInput("");
    setCouponFeedback({ type: null, message: "" });
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-corp-surface/30 pt-28 pb-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-corp-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-corp-surface/40 to-white pt-24 md:pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-corp-gray mb-6">
          <Link href="/magaza" className="hover:text-corp-teal transition-colors">
            Mağaza
          </Link>
          <span>/</span>
          <span className="text-corp-charcoal font-semibold">Alışveriş Sepeti</span>
        </div>

        {/* Title */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-corp-charcoal tracking-tight">
              Alışveriş Sepetim
            </h1>
            <p className="text-sm text-corp-gray mt-1">
              {totals.totalItemCount > 0
                ? `Sepetinizde ${totals.totalItemCount} adet ürün bulunmaktadır.`
                : "Sepetiniz henüz boş."}
            </p>
          </div>
          <Link
            href="/magaza"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-corp-teal hover:text-corp-teal-600 transition-colors"
          >
            <ArrowLeft size={14} />
            Alışverişe Devam Et
          </Link>
        </div>

        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="bg-white rounded-3xl border border-corp-border p-8 sm:p-16 text-center max-w-xl mx-auto shadow-xs">
            <div className="w-20 h-20 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center mx-auto mb-5">
              <ShoppingBag size={40} />
            </div>
            <h2 className="font-display text-xl font-bold text-corp-charcoal mb-2">
              Sepetinizde ürün bulunmamaktadır
            </h2>
            <p className="text-sm text-corp-gray max-w-sm mx-auto mb-8">
              Çiçekana kurumsal teknoloji ve medya ürünlerini inceleyerek sepetinize ekleyebilirsiniz.
            </p>
            <Link
              href="/magaza"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-corp-teal text-white font-display font-semibold text-sm hover:bg-corp-teal-600 transition-all shadow-md shadow-corp-teal/20"
            >
              <ShoppingBag size={16} />
              Ürünleri Keşfet
            </Link>

            {/* Saved items section even if active cart is empty */}
            {savedForLater && savedForLater.length > 0 && (
              <div className="mt-12 pt-8 border-t border-corp-border text-left">
                <h3 className="font-display text-sm font-bold text-corp-charcoal mb-4 flex items-center gap-2">
                  <Bookmark size={16} className="text-corp-teal" />
                  Daha Sonra Alınacaklar ({savedForLater.length})
                </h3>
                <div className="space-y-3">
                  {savedForLater.map((saved) => (
                    <div
                      key={saved.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-corp-border bg-corp-surface/40"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={saved.image}
                          alt={saved.name}
                          className="w-12 h-12 object-contain rounded-lg border border-corp-border bg-white"
                        />
                        <div>
                          <p className="text-xs font-semibold text-corp-charcoal">
                            {saved.name}
                          </p>
                          <span className="text-xs font-bold text-corp-teal">
                            {saved.price.toLocaleString("tr-TR")} TL
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveToCart(saved.id)}
                          className="px-3 py-1.5 rounded-lg bg-corp-teal text-white text-xs font-semibold hover:bg-corp-teal-600 transition-colors"
                        >
                          Sepete Taşı
                        </button>
                        <button
                          onClick={() => removeSavedItem(saved.id)}
                          className="p-1.5 text-corp-gray hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Active Cart Grid */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items & Free Shipping Progress */}
            <div className="lg:col-span-8 space-y-6">
              {/* 2. Ücretsiz Kargo İlerleme Çubuğu */}
              <div className="bg-white rounded-2xl border border-corp-border p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
                  {totals.isFreeShipping ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      Tebrikler! Ücretsiz kargo eşiğini aştınız 🎉
                    </span>
                  ) : (
                    <span className="text-corp-charcoal flex items-center gap-2">
                      <Truck size={18} className="text-corp-teal" />
                      Ücretsiz kargo için{" "}
                      <strong className="text-corp-teal font-bold">
                        {totals.remainingForFreeShipping.toLocaleString("tr-TR")} TL
                      </strong>{" "}
                      daha ekleyin
                    </span>
                  )}
                  <span className="text-xs font-bold text-corp-gray">
                    %{totals.freeShippingProgress}
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-corp-surface overflow-hidden border border-corp-border/60">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${totals.freeShippingProgress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`h-full rounded-full transition-all ${
                      totals.isFreeShipping
                        ? "bg-emerald-500"
                        : "bg-gradient-to-r from-corp-teal to-blue-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-corp-gray mt-1.5">
                  <span>0 TL</span>
                  <span>Eşik: {totals.freeShippingThreshold} TL</span>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-white rounded-2xl border border-corp-border divide-y divide-corp-border shadow-xs overflow-hidden">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 hover:bg-corp-surface/20 transition-colors"
                  >
                    {/* Item Image */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-corp-border bg-corp-surface/30 p-1.5 shrink-0 flex items-center justify-center">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/96x96?text=Görsel";
                        }}
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-display font-semibold text-corp-charcoal text-base">
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-corp-gray hover:text-red-500 transition-colors p-1"
                            title="Ürünü sil"
                            aria-label="Ürünü sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {item.itemType === "subscription" && (
                          <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-corp-teal bg-corp-teal/10 px-2 py-0.5 rounded mt-1">
                            Aylık Abonelik
                          </span>
                        )}

                        {item.selectedDesignTemplateName && (
                          <span className="inline-block bg-corp-teal/10 text-corp-teal text-[11px] px-2 py-0.5 rounded-full mt-1 font-semibold">
                            Şablon: {item.selectedDesignTemplateName}
                          </span>
                        )}

                        {item.freeShipping && (
                          <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1">
                            Ücretsiz Kargo
                          </span>
                        )}

                        {item.customizationData?.dimensionValues && (
                          <p className="text-xs text-corp-gray mt-1">
                            {Object.entries(item.customizationData.dimensionValues)
                              .map(([k, v]) => `${v}`)
                              .join(" • ")}
                          </p>
                        )}
                      </div>

                      {/* Row: Quantity Controls & Price */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-corp-border/60">
                        <div className="flex items-center gap-3">
                          {/* Quantity Counter */}
                          {item.itemType === "subscription" ? (
                            <span className="text-xs font-semibold text-corp-gray">
                              1 paket
                            </span>
                          ) : (
                            <div className="flex items-center border border-corp-border rounded-lg bg-white overflow-hidden shadow-2xs">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                className="px-3 py-1.5 text-corp-gray hover:bg-corp-surface transition-colors cursor-pointer"
                                aria-label="Adeti azalt"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="px-3.5 py-1 font-body text-xs font-bold text-corp-charcoal">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="px-3 py-1.5 text-corp-gray hover:bg-corp-surface transition-colors cursor-pointer"
                                aria-label="Adeti artır"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          )}

                          {/* 3. Daha Sonra Al (Favoriye Taşı) Butonu */}
                          <button
                            type="button"
                            onClick={() => saveForLater(item.id)}
                            className="text-xs text-corp-gray hover:text-corp-teal flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          >
                            <Bookmark size={13} />
                            Daha sonra al
                          </button>
                        </div>

                        {/* Price Display */}
                        <div className="text-right">
                          <span className="font-display font-bold text-corp-charcoal text-base sm:text-lg">
                            {(
                              item.price * item.quantity +
                              (item.extraServices?.reduce(
                                (sum, s) => sum + s.price,
                                0
                              ) || 0)
                            ).toLocaleString("tr-TR")}{" "}
                            TL
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-[11px] text-corp-gray">
                              Birim: {item.price.toLocaleString("tr-TR")} TL
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Saved For Later Section */}
              {savedForLater && savedForLater.length > 0 && (
                <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-xs">
                  <h3 className="font-display text-sm font-bold text-corp-charcoal mb-4 flex items-center gap-2">
                    <Bookmark size={16} className="text-corp-teal" />
                    Daha Sonra Alınacaklar ({savedForLater.length})
                  </h3>
                  <div className="divide-y divide-corp-border/60">
                    {savedForLater.map((saved) => (
                      <div
                        key={saved.id}
                        className="py-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={saved.image}
                            alt={saved.name}
                            className="w-12 h-12 object-contain rounded-lg border border-corp-border bg-corp-surface/30 p-1 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-corp-charcoal truncate">
                              {saved.name}
                            </h4>
                            <span className="text-xs font-bold text-corp-teal">
                              {saved.price.toLocaleString("tr-TR")} TL
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveToCart(saved.id)}
                            className="px-3 py-1.5 rounded-lg bg-corp-teal text-white text-xs font-semibold hover:bg-corp-teal-600 transition-colors"
                          >
                            Sepete Ekle
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSavedItem(saved.id)}
                            className="p-1.5 text-corp-gray hover:text-red-500 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Order Summary & Coupon */}
            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-28">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-xs space-y-5">
                <h2 className="font-display text-lg font-bold text-corp-charcoal border-b border-corp-border pb-3">
                  Sipariş Özeti
                </h2>

                {/* 5. Kupon Alanı (Varsayılan olarak kapalı bağlantı) */}
                <div className="border border-corp-border/80 rounded-xl p-3.5 bg-corp-surface/30">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCouponAccordion(!showCouponAccordion)}
                      className="text-xs font-semibold text-corp-teal hover:text-corp-teal-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Tag size={14} />
                      {totals.appliedCoupon
                        ? `Kupon: ${totals.appliedCoupon.code}`
                        : "İndirim kodum var"}
                      {showCouponAccordion ? (
                        <ChevronUp size={14} />
                      ) : (
                        <ChevronDown size={14} />
                      )}
                    </button>

                    {totals.appliedCoupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[11px] font-semibold text-red-600 hover:underline"
                      >
                        Kaldır
                      </button>
                    )}
                  </div>

                  {showCouponAccordion && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-corp-border"
                    >
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="Örn: HOSGELDIN10"
                          className="flex-1 px-3 py-2 bg-white border border-corp-border rounded-lg text-xs uppercase focus:outline-none focus:ring-2 focus:ring-corp-teal/40 font-mono"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-corp-charcoal hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Uygula
                        </button>
                      </form>

                      {couponFeedback.message && (
                        <p
                          className={`text-[11px] mt-2 font-medium ${
                            couponFeedback.type === "success"
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {couponFeedback.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* 4. Şeffaf Sepet Özeti (Sürpriz Maliyetsiz) */}
                <div className="space-y-3 text-sm font-medium text-corp-gray pt-1">
                  <div className="flex justify-between items-center">
                    <span>Ara Toplam</span>
                    <span className="text-corp-charcoal font-semibold">
                      {totals.subtotal.toLocaleString("tr-TR")} TL
                    </span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                      <span>Kupon İndirimi ({totals.appliedCoupon?.code})</span>
                      <span>-{totals.discountAmount.toLocaleString("tr-TR")} TL</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Kargo Ücreti</span>
                    {totals.shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        Ücretsiz Kargo
                      </span>
                    ) : (
                      <span className="text-corp-charcoal font-semibold">
                        {totals.shippingFee.toLocaleString("tr-TR")} TL
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-baseline pt-4 border-t border-corp-border">
                    <div>
                      <span className="font-display text-lg font-bold text-corp-charcoal block">
                        Ödenecek Tutar
                      </span>
                      <span className="text-[11px] text-corp-gray">Tüm vergiler dahildir</span>
                    </div>
                    <span className="font-display text-2xl font-extrabold text-corp-teal">
                      {totals.grandTotal.toLocaleString("tr-TR")} TL
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <Link
                  href="/magaza/odeme"
                  className="w-full bg-corp-teal hover:bg-corp-teal-600 active:scale-[0.99] text-white flex items-center justify-center gap-2.5 py-4 rounded-xl font-display font-bold text-base transition-all duration-200 shadow-[0_4px_16px_rgba(10,77,104,0.3)] hover:shadow-[0_6px_22px_rgba(10,77,104,0.4)]"
                >
                  <span>Ödemeye Geç</span>
                  <ArrowRight size={18} />
                </Link>

                {/* 7. Güven Rozetleri */}
                <div className="pt-4 border-t border-corp-border/80 space-y-2.5 text-xs text-corp-gray">
                  <div className="flex items-center gap-2 text-corp-charcoal/80">
                    <Lock size={15} className="text-corp-teal shrink-0" />
                    <span>256-Bit SSL Güvenli Ödeme Altyapısı</span>
                  </div>
                  <div className="flex items-center gap-2 text-corp-charcoal/80">
                    <RotateCcw size={15} className="text-corp-teal shrink-0" />
                    <span>14 Gün Koşulsuz Kolay İade Garantisi</span>
                  </div>
                  <div className="flex items-center gap-2 text-corp-charcoal/80">
                    <ShieldCheck size={15} className="text-corp-teal shrink-0" />
                    <span>Resmi E-Fatura & Kurumsal Güvence</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
