"use client";

import React from "react";
import { X, FileText, ImageIcon, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { OrderWithItems } from "./types";
import OrderCustomizationDisplay from "@/components/orders/OrderCustomizationDisplay";

interface OrderDetailModalProps {
  order: OrderWithItems;
  onClose: () => void;
}

// ── Safe number formatter — never crashes on null/undefined ──────────────────
function formatTL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0";
  return value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Safe date formatter ───────────────────────────────────────────────────────
function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h3 className="font-bold text-corp-charcoal">Sipariş Detayları</h3>
              <p className="text-sm text-corp-gray">#{order.orderNumber ?? "—"}</p>
            </div>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center"
              aria-label="Kapat"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(92vh-80px)]">
            <div className="space-y-6">
              {/* ── Customer Info ──────────────────────────────────────── */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-corp-charcoal mb-3">Müşteri Bilgileri</h4>
                {(() => {
                  const addr = (order.shippingAddress && typeof order.shippingAddress === "object"
                    ? order.shippingAddress
                    : {}) as Record<string, unknown>;
                  const phone = (addr.phone as string) || (addr.phoneNumber as string) || null;

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                        <div>
                          <span className="text-corp-gray">Ad Soyad:</span>
                          <span className="ml-2 font-medium">{order.guestName || "Misafir"}</span>
                        </div>
                        <div>
                          <span className="text-corp-gray">E-posta:</span>
                          <span className="ml-2 font-medium break-all">{order.guestEmail || "-"}</span>
                        </div>
                        {phone && (
                          <div>
                            <span className="text-corp-gray">Telefon:</span>
                            <span className="ml-2 font-medium">{phone}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-corp-gray">Sipariş Tarihi:</span>
                          <span className="ml-2 font-medium">{formatDate(order.createdAt)}</span>
                        </div>
                        <div>
                          <span className="text-corp-gray">Ödeme Yöntemi:</span>
                          <span className="ml-2 font-medium">{order.paymentMethod || "-"}</span>
                        </div>
                      </div>

                      {/* Corporate / Invoice details */}
                      {order.customerType === "CORPORATE" ? (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-xs uppercase tracking-wider text-corp-charcoal">
                              Kurumsal Fatura Bilgileri
                            </h5>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                order.invoiceStatus === "SENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {order.invoiceStatus === "SENT"
                                ? "Fatura Gönderildi"
                                : "Fatura Bekliyor"}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-corp-gray text-xs">Firma Unvanı:</span>
                              <p className="font-medium text-corp-charcoal">{order.companyName || "-"}</p>
                            </div>
                            <div>
                              <span className="text-corp-gray text-xs">Vergi Dairesi / No:</span>
                              <p className="font-medium text-corp-charcoal">
                                {order.taxOffice || "-"} / {order.taxNumber || "-"}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-corp-gray text-xs">Fatura Adresi:</span>
                              <p className="font-medium text-corp-charcoal mt-0.5">
                                {(() => {
                                  const bAddr = order.billingAddress as any;
                                  if (!bAddr) return "Belirtilmemiş";
                                  if (typeof bAddr === "string") return bAddr;
                                  return [bAddr.address || bAddr.addressDetail, bAddr.district, bAddr.city]
                                    .filter(Boolean)
                                    .join(", ") || "Belirtilmemiş";
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-corp-gray flex items-center justify-between">
                          <span>Müşteri Tipi: <strong>Bireysel</strong></span>
                          <span>Fatura Durumu: <strong>Gerekmiyor</strong></span>
                        </div>
                      )}

                      {order.shippingAddress && typeof order.shippingAddress === "object" && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-corp-gray text-sm">Teslimat Adresi:</span>
                          <p className="text-sm font-medium mt-1">
                            {[addr.address, addr.city, addr.district, addr.postalCode]
                              .filter(Boolean)
                              .join(", ") || "Adres bilgisi girilmemiş"}
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* ── Order Items ────────────────────────────────────────── */}
              <div>
                <h4 className="font-semibold text-corp-charcoal mb-3">Sipariş Kalemleri</h4>

                {(!order.items || order.items.length === 0) ? (
                  <div className="text-center py-8 text-corp-gray text-sm bg-gray-50 rounded-xl">
                    Bu siparişte ürün bulunamadı.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {order.items.map((item) => {
                      // ✅ FIX: safe access — product may be null if it was hard-deleted
                      const productName = item.product?.name ?? "Silinmiş ürün";
                      const productImage = item.product?.images?.[0] ?? null;

                      return (
                        <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start gap-4">
                            {/* Product thumbnail */}
                            <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                              {productImage ? (
                                <img
                                  src={productImage}
                                  alt={productName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "https://placehold.co/100x100?text=Görsel+Yok";
                                  }}
                                />
                              ) : (
                                <Package size={24} className="text-gray-400" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h5 className="font-semibold text-corp-charcoal">{productName}</h5>
                              <p className="text-sm text-corp-gray">
                                Adet: {item.quantity} × {formatTL(item.unitPrice)} TL
                              </p>

                              {/* ── Selected Template ────────────────────── */}
                              {item.selectedTemplate && (
                                <div className="mt-3 p-3 bg-corp-teal/10 rounded-lg border border-corp-teal/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ImageIcon size={14} className="text-corp-teal" />
                                    <span className="text-xs font-semibold text-corp-teal">Seçilen Tasarım</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {item.selectedTemplate.frontImage && (
                                      <img
                                        src={item.selectedTemplate.frontImage}
                                        alt="Tasarım şablonu"
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                                        onError={(e) => {
                                          (e.target as HTMLImageElement).src =
                                            "https://placehold.co/48x48?text=Görsel+Yok";
                                        }}
                                      />
                                    )}
                                    <div>
                                      {/* ✅ FIX: selectedTemplate.product?.name — nested product nullable */}
                                      <p className="text-xs font-medium text-corp-charcoal">
                                        {item.selectedTemplate.product?.name ?? "Bilinmeyen şablon ürünü"}
                                      </p>
                                      {item.selectedTemplate.nicheLabels?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {item.selectedTemplate.nicheLabels.slice(0, 2).map(
                                            (label: string, i: number) => (
                                              <span
                                                key={i}
                                                className="text-[10px] bg-corp-teal/20 text-corp-teal px-2 py-0.5 rounded-full"
                                              >
                                                {label}
                                              </span>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ── Customization & Uploaded Design Files ── */}
                              <OrderCustomizationDisplay
                                customizationData={item.customizationData}
                                isAdmin={true}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Totals ─────────────────────────────────────────────── */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-corp-gray">Ara Toplam:</span>
                  <span className="font-medium">{formatTL(order.totalAmount)} TL</span>
                </div>
                {(order.discountAmount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm mb-2 text-green-600">
                    <span>İndirim:</span>
                    <span className="font-medium">-{formatTL(order.discountAmount)} TL</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-corp-charcoal">
                  <span>Toplam:</span>
                  <span>{formatTL(order.finalAmount)} TL</span>
                </div>
              </div>

              {/* ── Notes ──────────────────────────────────────────────── */}
              {order.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-700 mb-1">Sipariş Notu</p>
                  <p className="text-sm text-yellow-800">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
