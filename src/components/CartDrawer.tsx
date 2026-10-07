"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useCartStore } from "@/store/useCartStore";
import {
  X,
  Minus,
  Plus,
  ShoppingBag,
  ArrowRight,
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
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { calculateCartTotals } from "@/lib/cart-calculator";
import { STORE_DELIVERY_CONFIG } from "@/config/store.config";
import { trackViewCart, trackRemoveFromCart } from "@/lib/analytics";

export default function CartDrawer() {
  const {
    items,
    savedForLater,
    couponCode,
    isOpen,
    closeDrawer,
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
  const [showSavedSection, setShowSavedSection] = useState(true);
  const [couponFeedback, setCouponFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const { data: session } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync guest cart with server when user logs in
  useEffect(() => {
    if (session?.user) {
      syncWithServer();
    }
  }, [session, syncWithServer]);

  // Synchronize coupon input with store couponCode
  useEffect(() => {
    if (couponCode) {
      setCouponInput(couponCode);
    }
  }, [couponCode]);

  // Faz 5: Ölçüm - Sepet açıldığında view_cart olayını tetikle
  useEffect(() => {
    if (isOpen && items.length > 0) {
      trackViewCart(
        items.map((i) => ({
          id: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          category: i.category,
        })),
        totals.grandTotal
      );
    }
  }, [isOpen]);

  const handleRemoveItem = (item: any) => {
    trackRemoveFromCart({
      id: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
    });
    removeItem(item.id);
  };

  // Comprehensive, centralized calculation via calculateCartTotals
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

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[100]"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-corp-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-corp-teal/10 flex items-center justify-center text-corp-teal">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-corp-charcoal">
                    Sepetim
                  </h2>
                  <span className="text-xs text-corp-gray font-medium">
                    {totals.totalItemCount} ürün
                  </span>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="text-corp-gray hover:text-corp-charcoal transition-colors p-2 hover:bg-corp-surface rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Sepeti kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* 2. Ücretsiz Kargo İlerleme Çubuğu */}
            {items.length > 0 && (
              <div className="px-6 py-3.5 bg-corp-surface/70 border-b border-corp-border">
                <div className="flex items-center justify-between text-xs mb-2 font-medium">
                  {totals.isFreeShipping ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      Tebrikler! Ücretsiz kargo kazandınız 🎉
                    </span>
                  ) : (
                    <span className="text-corp-charcoal flex items-center gap-1.5">
                      <Truck size={15} className="text-corp-teal" />
                      Ücretsiz kargo için{" "}
                      <strong className="text-corp-teal font-bold">
                        {totals.remainingForFreeShipping.toLocaleString("tr-TR")}{" "}
                        TL
                      </strong>{" "}
                      daha ekleyin
                    </span>
                  )}
                  <span className="text-corp-gray text-[11px] font-semibold">
                    %{totals.freeShippingProgress}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-corp-border/80 overflow-hidden">
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
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-corp-gray py-12">
                  <div className="w-16 h-16 rounded-full bg-corp-surface flex items-center justify-center mb-4">
                    <ShoppingBag size={32} className="opacity-40 text-corp-teal" />
                  </div>
                  <h3 className="font-display font-semibold text-corp-charcoal text-base mb-1">
                    Sepetiniz henüz boş
                  </h3>
                  <p className="font-body text-center text-xs text-corp-gray max-w-[220px] mb-6">
                    Mağazamızdaki kurumsal çözümleri ve ürünleri keşfetmeye başlayın.
                  </p>
                  <Link
                    href="/magaza"
                    onClick={closeDrawer}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-corp-teal text-white text-sm font-semibold hover:bg-corp-teal-600 transition-colors shadow-sm"
                  >
                    Ürünleri İncele
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 bg-white rounded-2xl border border-corp-border shadow-xs hover:border-corp-teal/30 transition-all flex gap-3.5"
                    >
                      {/* Image */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 object-contain rounded-xl border border-corp-border bg-corp-surface/30 p-1 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://placehold.co/80x80?text=Görsel";
                        }}
                      />

                      {/* Info & Actions */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-display font-semibold text-corp-charcoal text-sm truncate">
                              {item.name}
                            </h4>
                            <button
                              onClick={() => handleRemoveItem(item)}
                              className="text-corp-gray hover:text-red-500 transition-colors p-1"
                              title="Sepetten Çıkar"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          {item.itemType === "subscription" && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-corp-teal bg-corp-teal/10 px-2 py-0.5 rounded mt-0.5">
                              Aylık Abonelik
                            </span>
                          )}

                          {item.selectedDesignTemplateName && (
                            <span className="inline-block bg-corp-teal/10 text-corp-teal text-[10px] px-2 py-0.5 rounded-full mt-1 font-semibold">
                              Şablon: {item.selectedDesignTemplateName}
                            </span>
                          )}

                          {item.freeShipping && (
                            <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1">
                              Ücretsiz Kargo
                            </span>
                          )}

                          {/* Dimension summaries */}
                          {item.customizationData?.dimensionValues && (
                            <p className="text-[11px] text-corp-gray mt-1 line-clamp-1">
                              {Object.entries(
                                item.customizationData.dimensionValues
                              )
                                .map(([k, v]) => `${v}`)
                                .join(" • ")}
                            </p>
                          )}
                        </div>

                        {/* Quantity & Price Row */}
                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-corp-border/60">
                          {item.itemType === "subscription" ? (
                            <span className="text-xs font-semibold text-corp-gray">
                              1 paket
                            </span>
                          ) : (
                            <div className="flex items-center border border-corp-border rounded-lg overflow-hidden bg-white">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.id,
                                    Math.max(1, item.quantity - 1)
                                  )
                                }
                                className="px-2.5 py-1 text-corp-gray hover:bg-corp-surface transition-colors cursor-pointer"
                                aria-label="Adeti azalt"
                              >
                                <Minus size={13} />
                              </button>
                              <span className="px-2.5 py-0.5 font-body text-xs font-semibold text-corp-charcoal">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="px-2.5 py-1 text-corp-gray hover:bg-corp-surface transition-colors cursor-pointer"
                                aria-label="Adeti artır"
                              >
                                <Plus size={13} />
                              </button>
                            </div>
                          )}

                          <div className="text-right">
                            <span className="font-display font-bold text-corp-charcoal text-sm">
                              {(
                                item.price * item.quantity +
                                (item.extraServices?.reduce(
                                  (sum, s) => sum + s.price,
                                  0
                                ) || 0)
                              ).toLocaleString("tr-TR")}{" "}
                              TL
                            </span>
                          </div>
                        </div>

                        {/* 3. Daha Sonra Al (Favoriye Taşı) Butonu */}
                        <div className="flex items-center justify-end gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => saveForLater(item.id)}
                            className="text-[11px] text-corp-gray hover:text-corp-teal flex items-center gap-1 font-medium transition-colors cursor-pointer"
                          >
                            <Bookmark size={12} />
                            Daha sonra al
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Daha Sonra Alınacaklar (Favoriye Taşınanlar) Bölümü */}
              {savedForLater && savedForLater.length > 0 && (
                <div className="border-t border-corp-border pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowSavedSection(!showSavedSection)}
                    className="flex items-center justify-between w-full text-xs font-bold text-corp-charcoal uppercase tracking-wider mb-3 hover:text-corp-teal transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Bookmark size={14} className="text-corp-teal" />
                      Daha Sonra Alınacaklar ({savedForLater.length})
                    </span>
                    {showSavedSection ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {showSavedSection && (
                    <div className="space-y-2.5">
                      {savedForLater.map((saved) => (
                        <div
                          key={saved.id}
                          className="p-3 bg-corp-surface/50 rounded-xl border border-corp-border/80 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={saved.image}
                              alt={saved.name}
                              className="w-10 h-10 object-contain rounded-lg border border-corp-border bg-white p-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-semibold text-corp-charcoal truncate">
                                {saved.name}
                              </h5>
                              <span className="font-bold text-corp-teal">
                                {saved.price.toLocaleString("tr-TR")} TL
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveToCart(saved.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-corp-teal text-white font-semibold text-[11px] hover:bg-corp-teal-600 transition-colors"
                            >
                              Sepete Ekle
                            </button>
                            <button
                              type="button"
                              onClick={() => removeSavedItem(saved.id)}
                              className="p-1.5 text-corp-gray hover:text-red-500 transition-colors"
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Footer Area */}
            {items.length > 0 && (
              <div className="p-6 bg-white border-t border-corp-border shadow-lg space-y-4">
                {/* 5. Kupon Alanı (Varsayılan olarak kapalı bağlantı) */}
                <div className="border border-corp-border/80 rounded-xl p-3 bg-corp-surface/30">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowCouponAccordion(!showCouponAccordion)}
                      className="text-xs font-semibold text-corp-teal hover:text-corp-teal-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Tag size={14} />
                      {totals.appliedCoupon
                        ? `Kupon: ${totals.appliedCoupon.code} (${totals.appliedCoupon.description})`
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
                      className="mt-2.5 pt-2.5 border-t border-corp-border"
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
                          className={`text-[11px] mt-1.5 font-medium ${
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

                {/* 4. Şeffaf Sepet Özeti (Sürpriz maliyetsiz) */}
                <div className="space-y-2 text-xs font-medium text-corp-gray pt-1">
                  <div className="flex justify-between items-center">
                    <span>Ara Toplam</span>
                    <span className="text-corp-charcoal font-semibold text-sm">
                      {totals.subtotal.toLocaleString("tr-TR")} TL
                    </span>
                  </div>

                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                      <span>Kupon İndirimi</span>
                      <span>
                        -{totals.discountAmount.toLocaleString("tr-TR")} TL
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span>Kargo Ücreti</span>
                    {totals.shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        Ücretsiz Kargo
                      </span>
                    ) : (
                      <span className="text-corp-charcoal font-semibold">
                        {totals.shippingFee.toLocaleString("tr-TR")} TL
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-corp-border">
                    <span className="font-display text-base font-bold text-corp-charcoal">
                      Genel Toplam
                    </span>
                    <div className="text-right">
                      <span className="font-display text-xl font-bold text-corp-teal">
                        {totals.grandTotal.toLocaleString("tr-TR")} TL
                      </span>
                      <p className="text-[10px] text-corp-gray">KDV dahildir</p>
                    </div>
                  </div>
                </div>

                {/* Checkout Button */}
                <Link
                  href="/magaza/odeme"
                  onClick={closeDrawer}
                  className="w-full bg-corp-teal hover:bg-corp-teal-600 active:scale-[0.99] text-white flex items-center justify-center gap-2.5 py-4 rounded-xl font-display font-bold text-base transition-all duration-200 shadow-[0_4px_16px_rgba(10,77,104,0.3)] hover:shadow-[0_6px_22px_rgba(10,77,104,0.4)]"
                >
                  <span>Ödemeye Geç</span>
                  <ArrowRight size={18} />
                </Link>

                {/* 7. Güven Rozetleri */}
                <div className="pt-2 flex items-center justify-between text-[11px] text-corp-gray border-t border-corp-border/60">
                  <span className="flex items-center gap-1" title="256-bit SSL Güvenli Altyapı">
                    <Lock size={12} className="text-corp-teal" /> 256-Bit SSL
                  </span>
                  <span className="flex items-center gap-1" title="14 Gün İçinde Koşulsuz İade">
                    <RotateCcw size={12} className="text-corp-teal" /> 14 Gün İade
                  </span>
                  <span className="flex items-center gap-1" title="E-Fatura & Kurumsal Güvence">
                    <ShieldCheck size={12} className="text-corp-teal" /> Kurumsal Fatura
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
