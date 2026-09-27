"use client";

import React from "react";
import { X, Package, MapPin, CreditCard, Calendar, Truck, ExternalLink, ShieldCheck } from "lucide-react";

interface OrderDetailModalProps {
  order: any;
  onClose: () => void;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Ödeme Bekliyor", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  CONFIRMED: { label: "Onaylandı", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  PROCESSING: { label: "Hazırlanıyor", cls: "bg-purple-100 text-purple-800 border-purple-200" },
  SHIPPED: { label: "Kargoya Verildi", cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  DELIVERED: { label: "Teslim Edildi", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CANCELLED: { label: "İptal Edildi", cls: "bg-red-100 text-red-800 border-red-200" },
};

export default function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  if (!order) return null;

  const statusInfo = statusMap[order.status] || { label: order.status, cls: "bg-gray-100 text-gray-800" };
  const shippingAddress = order.shippingAddress || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-corp-border shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-corp-border flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-corp-teal/10 text-corp-teal flex items-center justify-center">
              <Package size={20} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-corp-charcoal">Sipariş #{order.orderNumber}</h3>
              <p className="text-xs text-corp-gray flex items-center gap-1">
                <Calendar size={12} />
                {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Status & Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-corp-surface border border-corp-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Sipariş Durumu</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.cls}`}>
                {statusInfo.label}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-corp-surface border border-corp-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Ödeme Yöntemi</p>
              <p className="font-semibold text-sm text-corp-charcoal capitalize flex items-center gap-1.5">
                <CreditCard size={14} className="text-corp-teal" />
                {order.paymentMethod === "cc" ? "Kredi / Banka Kartı" : order.paymentMethod || "Kredi Kartı"}
              </p>
              <p className="text-[11px] text-corp-gray mt-0.5 font-medium">Durum: {order.paymentStatus || "Tamamlandı"}</p>
            </div>

            <div className="p-4 rounded-xl bg-corp-surface border border-corp-border">
              <p className="text-[11px] font-bold uppercase tracking-wider text-corp-gray mb-1">Toplam Tutar</p>
              <p className="font-display font-bold text-lg text-corp-charcoal">
                ₺{order.finalAmount.toLocaleString("tr-TR")}
              </p>
            </div>
          </div>

          {/* Kargo Takip Bilgisi (varsa) */}
          {order.trackingNumber && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="text-indigo-600" size={24} />
                <div>
                  <h4 className="font-bold text-sm text-indigo-950">Kargo Takip Bilgisi</h4>
                  <p className="text-xs text-indigo-700">
                    Kargo Firması: <strong>{order.carrier || "Yurtiçi Kargo"}</strong> | Takip No: <strong>{order.trackingNumber}</strong>
                  </p>
                </div>
              </div>
              <a
                href={`https://kargotakip.com/${order.trackingNumber}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
              >
                Kargom Nerede? <ExternalLink size={13} />
              </a>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h4 className="font-display font-bold text-corp-charcoal text-sm mb-3">Sipariş Edilen Ürünler</h4>
            <div className="border border-corp-border rounded-xl overflow-hidden divide-y divide-corp-border">
              {order.items && order.items.length > 0 ? (
                order.items.map((item: any) => {
                  const product = item.product || {};
                  const image = product.images?.[0] || "https://placehold.co/64x64?text=Ürün";
                  return (
                    <div key={item.id} className="p-4 flex items-center gap-4 bg-white hover:bg-gray-50 transition-colors">
                      <img src={image} alt={product.name || "Ürün"} className="w-14 h-14 object-cover rounded-lg border border-corp-border flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h5 className="font-semibold text-sm text-corp-charcoal truncate">{product.name || "Özel Ürün"}</h5>
                        <p className="text-xs text-corp-gray mt-0.5">Birim Fiyat: ₺{item.unitPrice.toLocaleString("tr-TR")} | Adet: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-corp-charcoal">
                          ₺{(item.unitPrice * item.quantity).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="p-4 text-xs text-corp-gray">Ürün detayı bulunamadı.</p>
              )}
            </div>
          </div>

          {/* Delivery Address Details */}
          <div className="p-4 rounded-xl bg-corp-surface border border-corp-border">
            <h4 className="font-display font-bold text-corp-charcoal text-sm mb-2 flex items-center gap-1.5">
              <MapPin size={16} className="text-corp-teal" /> Teslimat Adresi
            </h4>
            <p className="font-semibold text-sm text-corp-charcoal">
              {order.guestName || shippingAddress.name || "Müşteri"}
            </p>
            <p className="text-xs text-corp-gray mt-1 leading-relaxed">
              {shippingAddress.address || "Adres detayı belirtilmedi"} {shippingAddress.city ? `, ${shippingAddress.city}` : ""}
            </p>
            {shippingAddress.phone && (
              <p className="text-xs text-corp-gray mt-1">Telefon: {shippingAddress.phone}</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-corp-border flex justify-end sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-corp-charcoal text-white font-bold text-xs hover:bg-black transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
