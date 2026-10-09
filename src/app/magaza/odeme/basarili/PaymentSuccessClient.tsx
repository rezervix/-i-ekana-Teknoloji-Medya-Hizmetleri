"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  Copy,
  Check,
  ShieldCheck,
  Clock,
  Truck,
  ExternalLink,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface OrderSummary {
  orderNumber: string;
  finalAmount: number;
  status: string;
  createdAt: string | Date;
  guestName?: string | null;
  guestEmail?: string | null;
  shippingAddress?: any;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
}

interface Props {
  orderNumber: string;
  order: OrderSummary | null;
  isAuthenticated: boolean;
}

export default function PaymentSuccessClient({
  orderNumber,
  order,
  isAuthenticated,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopyOrderNumber = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    toast.success("Sipariş numarası panoya kopyalandı!");
    setTimeout(() => setCopied(false), 2500);
  };

  const formattedAmount = order?.finalAmount
    ? order.finalAmount.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " TL"
    : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Top Success Hero Card */}
      <div className="bg-white rounded-3xl border border-corp-border shadow-luxury p-6 sm:p-10 text-center relative overflow-hidden">
        {/* Subtle decorative background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Success Icon */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-50 border border-emerald-200/60 flex items-center justify-center mb-6 shadow-sm">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 sm:w-11 sm:h-11 text-emerald-600 stroke-[2.2]" />
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          <ShieldCheck size={14} className="text-emerald-600" />
          Ödeme Başarıyla Tamamlandı
        </span>

        <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-corp-charcoal tracking-tight mb-3">
          Siparişiniz Alındı!
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
          Ödemeniz PayTR güvenli ödeme altyapısıyla onaylandı. Siparişiniz sisteme kaydedildi ve hazırlık aşamasına iletildi.
        </p>

        {/* Order Number Box */}
        {orderNumber && (
          <div className="bg-corp-surface/70 border border-corp-border rounded-2xl p-4 sm:p-5 max-w-md mx-auto mb-6 flex items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <span className="text-[11px] font-bold text-corp-gray uppercase tracking-wider block">
                Sipariş Numarası
              </span>
              <span className="font-mono font-bold text-base sm:text-lg text-corp-charcoal truncate block">
                #{orderNumber}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyOrderNumber}
              className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white border border-corp-border text-corp-charcoal hover:bg-gray-50 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 cursor-pointer active:scale-95"
              title="Sipariş numarasını kopyala"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy size={14} className="text-corp-gray" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Process Stepper */}
        <div className="pt-4 border-t border-corp-border/80 max-w-lg mx-auto">
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-sm">
                <Check size={14} />
              </div>
              <span className="font-semibold text-corp-charcoal">Ödeme Alındı</span>
              <span className="text-[10px] text-emerald-600 font-medium">Onaylandı</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs mb-1.5 shadow-sm animate-pulse">
                <Clock size={14} />
              </div>
              <span className="font-semibold text-corp-charcoal">Hazırlanıyor</span>
              <span className="text-[10px] text-corp-teal font-medium">Üretim Sırasında</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-corp-gray flex items-center justify-center font-bold text-xs mb-1.5 border border-corp-border">
                <Truck size={14} />
              </div>
              <span className="font-medium text-corp-gray">Kargoya Veriliş</span>
              <span className="text-[10px] text-corp-gray">Beklemede</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      {order && (
        <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 sm:p-8 space-y-5">
          <h2 className="font-display text-lg font-bold text-corp-charcoal flex items-center gap-2 border-b border-corp-border/70 pb-3">
            <Package size={18} className="text-corp-teal" /> Sipariş Detayları
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            {order.guestName && (
              <div className="bg-corp-surface/50 p-3.5 rounded-xl border border-corp-border/60">
                <span className="text-corp-gray text-xs block mb-0.5">Müşteri</span>
                <span className="font-semibold text-corp-charcoal">{order.guestName}</span>
                {order.guestEmail && (
                  <span className="text-corp-gray block text-xs mt-0.5">{order.guestEmail}</span>
                )}
              </div>
            )}

            {formattedAmount && (
              <div className="bg-corp-surface/50 p-3.5 rounded-xl border border-corp-border/60">
                <span className="text-corp-gray text-xs block mb-0.5">Toplam Tutar</span>
                <span className="font-display font-bold text-corp-charcoal text-base">
                  {formattedAmount}
                </span>
                <span className="text-emerald-700 font-semibold block text-[11px] mt-0.5">
                  Kredi Kartı (PayTR Güvenli Ödeme)
                </span>
              </div>
            )}
          </div>

          {/* Items Preview */}
          {order.items && order.items.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-corp-gray uppercase tracking-wider block mb-3">
                Sipariş Edilen Ürünler ({order.items.length})
              </span>
              <div className="divide-y divide-corp-border/60 border border-corp-border/60 rounded-xl overflow-hidden">
                {order.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover border border-corp-border shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-corp-charcoal truncate">{item.name}</p>
                        <p className="text-corp-gray text-xs">Adet: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-corp-charcoal shrink-0">
                      {(item.price * item.quantity).toLocaleString("tr-TR")} TL
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Section */}
      <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 sm:p-8 space-y-4 text-center">
        <h3 className="font-display text-base font-bold text-corp-charcoal">
          Şimdi Ne Yapmak İstersiniz?
        </h3>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          {/* Main Action: Go to Orders / Order Tracking */}
          {isAuthenticated ? (
            <Link
              href="/profile?tab=orders"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-corp-teal text-white font-semibold text-sm hover:bg-corp-teal-600 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Package size={17} />
              <span>Siparişlerime Git</span>
              <ArrowRight size={15} />
            </Link>
          ) : orderNumber ? (
            <Link
              href={`/magaza/siparis/${orderNumber}`}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-corp-teal text-white font-semibold text-sm hover:bg-corp-teal-600 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Package size={17} />
              <span>Siparişi Görüntüle & Takip Et</span>
              <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              href="/profile?tab=orders"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-corp-teal text-white font-semibold text-sm hover:bg-corp-teal-600 transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
            >
              <Package size={17} />
              <span>Siparişlerime Git</span>
              <ArrowRight size={15} />
            </Link>
          )}

          {/* Secondary Action: Keep Shopping */}
          <Link
            href="/magaza"
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-corp-surface hover:bg-gray-200 border border-corp-border text-corp-charcoal font-semibold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ShoppingBag size={17} className="text-corp-teal" />
            <span>Alışverişe Devam Et</span>
          </Link>
        </div>

        {!isAuthenticated && orderNumber && (
          <p className="text-xs text-corp-gray pt-2">
            Sipariş geçmişinize istediğiniz zaman ulaşmak için{" "}
            <Link
              href={`/auth?callbackUrl=${encodeURIComponent(`/profile?tab=orders`)}`}
              className="font-semibold text-corp-teal hover:underline inline-flex items-center gap-0.5"
            >
              giriş yapabilir veya hesap oluşturabilirsiniz
              <ExternalLink size={12} />
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
