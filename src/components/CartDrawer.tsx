"use client";

import React, { useEffect, useState } from "react";
import { useCartStore } from "@/store/useCartStore";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const AI_AUTOMATION_PRODUCTS = [
  { productId: "faktura-solo-core", name: "Faktura Solo Core", price: 10000, image: "/images/faktura-dashboard.svg", category: "ai-automation" },
  { productId: "faktura-enterprise-prime", name: "Faktura Enterprise Prime", price: 20000, image: "/images/faktura-dashboard.svg", category: "ai-automation" },
  { productId: "midvem-baslangic", name: "Midvem Başlangıç", price: 15000, image: "/images/midvem-dashboard.svg", category: "ai-automation" },
  { productId: "midvem-pro", name: "Midvem Pro", price: 20000, image: "/images/midvem-dashboard.svg", category: "ai-automation" },
  { productId: "midvem-kurumsal", name: "Midvem Kurumsal", price: 25000, image: "/images/midvem-dashboard.svg", category: "ai-automation" },
];

export default function CartDrawer() {
  const { items, isOpen, closeDrawer, removeItem, updateQuantity } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const hasAiAutomationItem = items.some((item) => item.category === "ai-automation");
  const recommendations = hasAiAutomationItem
    ? AI_AUTOMATION_PRODUCTS.filter(
        (product) => !items.some((item) => item.productId === product.productId)
      )
    : [];

  const subtotal = items.reduce((acc, item) => {
    const servicesTotal = item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0;
    return acc + (item.price * item.quantity) + servicesTotal;
  }, 0);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-corp-border">
              <div className="flex items-center gap-3">
                <ShoppingBag className="text-corp-teal" />
                <h2 className="font-display text-xl font-bold text-corp-charcoal">Sepetim</h2>
                <span className="bg-corp-teal text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {items.reduce((acc, i) => acc + i.quantity, 0)}
                </span>
              </div>
              <button onClick={closeDrawer} className="text-corp-gray hover:text-corp-charcoal transition-colors p-2 bg-corp-surface rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-corp-gray">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p className="font-body text-center text-sm">Sepetiniz şu an boş.</p>
                  <button onClick={closeDrawer} className="mt-6 text-corp-teal font-semibold hover:underline">
                    Alışverişe Başla
                  </button>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="flex gap-4 border-b border-corp-border pb-6">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-20 h-20 object-cover rounded-lg border border-corp-border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Görsel+Yok";
                      }}
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h3 className="font-display font-semibold text-corp-charcoal text-sm">{item.name}</h3>
                          {item.selectedDesignTemplateName && (
                            <div className="inline-block bg-corp-teal/10 text-corp-teal text-[10px] px-2 py-0.5 rounded-full mt-1 font-semibold">
                              Şablon: {item.selectedDesignTemplateName}
                            </div>
                          )}
                          {item.customizationData && (
                            <p className="text-xs text-corp-gray mt-1 flex flex-col gap-0.5">
                              {Object.entries(item.customizationData).map(([k, v]) => {
                                if (
                                  k === "uploadedFiles" ||
                                  k === "convertToPrint" ||
                                  k === "selectedQuantity" ||
                                  k === "dimensionValues" ||
                                  k === "packageId" ||
                                  k === "salePrice" ||
                                  k === "unitSalePrice"
                                )
                                  return null;
                                return <span key={k}>{k}: {v as string}</span>;
                              })}
                            </p>
                          )}
                          {item.extraServices && item.extraServices.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-corp-border">
                              {item.extraServices.map((service) => (
                                <div key={service.type} className="text-xs text-corp-teal flex items-center justify-between gap-2">
                                  <span>{service.label}</span>
                                  <span className="font-semibold">+{service.price} TL</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeItem(item.id)} className="text-error/70 hover:text-error transition-colors p-1">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div className="flex items-center border border-corp-border rounded-md overflow-hidden bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="px-2.5 py-1.5 text-corp-gray hover:bg-corp-surface transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="px-3 py-1 font-body text-sm font-semibold text-corp-charcoal">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2.5 py-1.5 text-corp-gray hover:bg-corp-surface transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <span className="font-display font-bold text-corp-charcoal text-sm">
                          {((item.price * item.quantity) + (item.extraServices?.reduce((sum, s) => sum + s.price, 0) || 0)).toLocaleString('tr-TR')} TL
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Cross-Sell Suggestions inside Cart */}
              {items.length > 0 && recommendations.length > 0 && (
                <div className="mt-4 p-4 bg-corp-surface rounded-xl border border-corp-border">
                  <h4 className="font-display font-semibold text-xs text-corp-gray uppercase tracking-widest mb-3">Bunları da beğenebilirsiniz</h4>
                  <div className="flex flex-col gap-2">
                    {recommendations.map((product) => (
                      <div key={product.productId} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-corp-border shadow-sm">
                        <img src={product.image} alt={product.name} className="w-12 h-12 object-cover rounded-md" />
                        <div className="flex-1">
                          <h5 className="font-display font-semibold text-xs text-corp-charcoal">{product.name}</h5>
                          <span className="text-corp-teal font-bold text-xs">{product.price.toLocaleString("tr-TR")} TL</span>
                        </div>
                        <button onClick={() => useCartStore.getState().addItem({ ...product, quantity: 1 })} className="text-xs bg-corp-teal/10 text-corp-teal px-3 py-1.5 rounded-md font-semibold hover:bg-corp-teal/20 transition-colors">
                          Ekle
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 bg-corp-surface border-t border-corp-border">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="İndirim Kodu"
                    className="flex-1 px-4 py-2 border border-corp-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-corp-teal/50"
                  />
                  <button className="px-4 py-2 bg-white border border-corp-border rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                    Uygula
                  </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-body text-corp-gray">Ara Toplam</span>
                  <span className="font-display text-xl font-bold text-corp-charcoal">
                    {subtotal.toLocaleString('tr-TR')} TL
                  </span>
                </div>
                <Link
                  href="/magaza/odeme"
                  onClick={closeDrawer}
                  className="w-full bg-corp-teal text-white flex items-center justify-center gap-2 py-4 rounded-xl font-display font-bold text-lg hover:bg-corp-teal-600 transition-all shadow-corp-hover"
                >
                  Ödemeye Geç <ArrowRight size={20} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
