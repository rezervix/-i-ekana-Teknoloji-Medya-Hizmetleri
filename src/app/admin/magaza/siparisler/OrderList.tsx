"use client";

import React, { useState } from "react";
import {
  Eye,
  Loader2,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Search,
  AlertCircle,
  Building2,
  User,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import OrderDetailModal from "./OrderDetailModal";
import type { OrderWithItems } from "./types";

interface OrderListProps {
  initialOrders: OrderWithItems[];
}

const STATUS_MAP: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  PENDING:    { label: "Bekliyor",       color: "bg-yellow-100 text-yellow-700",  icon: Clock },
  CONFIRMED:  { label: "Onaylandı",      color: "bg-blue-100 text-blue-700",      icon: CheckCircle },
  PROCESSING: { label: "Hazırlanıyor",   color: "bg-orange-100 text-orange-700",  icon: Loader2 },
  SHIPPED:    { label: "Kargoda",        color: "bg-purple-100 text-purple-700",  icon: Truck },
  DELIVERED:  { label: "Teslim Edildi",  color: "bg-green-100 text-green-700",    icon: CheckCircle },
  CANCELLED:  { label: "İptal Edildi",   color: "bg-red-100 text-red-700",        icon: XCircle },
};

const INVOICE_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  NOT_REQUIRED: { label: "Gerekmiyor",        color: "bg-gray-100 text-gray-600" },
  PENDING:      { label: "Fatura Bekliyor",   color: "bg-amber-100 text-amber-800" },
  SENT:         { label: "Fatura Gönderildi", color: "bg-emerald-100 text-emerald-800" },
};

function formatTL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "0,00";
  return value.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function OrderList({ initialOrders }: OrderListProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders);
  const [loading, setLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "corporate_pending">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const updateStatus = async (id: string, newStatus: string) => {
    setLoading(id);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, status: newStatus as OrderWithItems["status"] } : o))
      );
      toast.success("Sipariş durumu güncellendi.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
      console.error("[OrderList] Durum güncelleme hatası:", { orderId: id, newStatus, error: msg });
      setUpdateError(msg);
      toast.error(`Güncelleme başarısız: ${msg}`);
    } finally {
      setLoading(null);
    }
  };

  const updateInvoiceStatus = async (id: string, newInvoiceStatus: "NOT_REQUIRED" | "PENDING" | "SENT") => {
    setLoading(id);
    setUpdateError(null);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceStatus: newInvoiceStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === id ? { ...o, invoiceStatus: newInvoiceStatus as any } : o))
      );
      toast.success("Fatura durumu güncellendi.");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
      console.error("[OrderList] Fatura güncelleme hatası:", { orderId: id, newInvoiceStatus, error: msg });
      setUpdateError(msg);
      toast.error(`Fatura durumu güncellenemedi: ${msg}`);
    } finally {
      setLoading(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(term) ||
      (o.guestEmail?.toLowerCase().includes(term) ?? false) ||
      (o.companyName?.toLowerCase().includes(term) ?? false) ||
      (o.taxNumber?.includes(term) ?? false);

    if (!matchesSearch) return false;

    if (filterType === "corporate_pending") {
      return o.customerType === "CORPORATE" && o.invoiceStatus === "PENDING";
    }

    return true;
  });

  const corporatePendingCount = orders.filter(
    (o) => o.customerType === "CORPORATE" && o.invoiceStatus === "PENDING"
  ).length;

  return (
    <div className="space-y-4">
      {/* Controls: Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" size={16} />
          <input
            type="text"
            placeholder="Sipariş no, e-posta, firma ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/20 text-base sm:text-sm min-h-[44px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none pb-1 flex-nowrap sm:flex-wrap">
          <button
            onClick={() => setFilterType("all")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center shrink-0 ${
              filterType === "all"
                ? "bg-corp-teal text-white shadow-sm"
                : "bg-gray-100 text-corp-gray hover:bg-gray-200"
            }`}
          >
            Tümü ({orders.length})
          </button>
          <button
            onClick={() => setFilterType("corporate_pending")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              filterType === "corporate_pending"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <span>Kurumsal + Bekleyen</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                filterType === "corporate_pending"
                  ? "bg-white text-amber-700"
                  : "bg-amber-200 text-amber-900"
              }`}
            >
              {corporatePendingCount}
            </span>
          </button>
        </div>
      </div>

      {/* Inline update error banner */}
      {updateError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{updateError}</span>
          <button
            onClick={() => setUpdateError(null)}
            className="ml-auto text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-corp-border">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Sipariş</th>
              <th className="p-4">Müşteri</th>
              <th className="p-4">Müşteri Tipi</th>
              <th className="p-4">Tutar</th>
              <th className="p-4">Sipariş Durumu</th>
              <th className="p-4">Fatura Durumu</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border bg-white text-sm">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-corp-gray">
                  Sipariş bulunamadı.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isCorporate = order.customerType === "CORPORATE";
                const invStatus = order.invoiceStatus || "NOT_REQUIRED";
                const invMeta = INVOICE_STATUS_MAP[invStatus] || {
                  label: invStatus,
                  color: "bg-gray-100 text-gray-700",
                };

                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-corp-charcoal">#{order.orderNumber}</span>
                        <span className="text-[11px] text-corp-gray">
                          {new Date(order.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-corp-charcoal font-medium">
                          {order.guestName || "Misafir"}
                        </span>
                        <span className="text-[11px] text-corp-gray">
                          {order.guestEmail || "E-posta yok"}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      {isCorporate ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 size={12} /> Kurumsal
                          </span>
                          {order.companyName && (
                            <span
                              className="text-[11px] text-corp-charcoal font-medium max-w-[150px] truncate"
                              title={order.companyName}
                            >
                              {order.companyName}
                            </span>
                          )}
                          {order.taxNumber && (
                            <span className="text-[10px] text-corp-gray">
                              VN: {order.taxNumber}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700">
                          <User size={12} /> Bireysel
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-display font-bold text-corp-charcoal">
                      {formatTL(order.finalAmount)} TL
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          disabled={loading === order.id}
                          onChange={(e) => updateStatus(order.id, e.target.value)}
                          className={`text-[11px] font-bold px-2 py-1 rounded-lg border-none focus:ring-2 focus:ring-corp-teal/50 cursor-pointer ${
                            STATUS_MAP[order.status]?.color ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {Object.entries(STATUS_MAP).map(([val, info]) => (
                            <option key={val} value={val} className="bg-white text-corp-charcoal">
                              {info.label}
                            </option>
                          ))}
                        </select>
                        {loading === order.id && (
                          <Loader2 size={12} className="animate-spin text-corp-teal" />
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${invMeta.color}`}
                        >
                          {invMeta.label}
                        </span>
                        {isCorporate && invStatus !== "SENT" && (
                          <button
                            onClick={() => updateInvoiceStatus(order.id, "SENT")}
                            disabled={loading === order.id}
                            className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold transition-all disabled:opacity-50 shadow-sm"
                            title="Fatura Gönderildi Olarak İşaretle"
                          >
                            <FileCheck size={12} /> Fatura Gönderildi
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-all"
                        title="Siparişi Görüntüle"
                        aria-label={`${order.orderNumber} siparişini görüntüle`}
                      >
                        <Eye size={18} />
                      </button>
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
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-corp-gray italic bg-white rounded-xl border border-corp-border">
            Sipariş bulunamadı.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCorporate = order.customerType === "CORPORATE";
            const invStatus = order.invoiceStatus || "NOT_REQUIRED";
            const invMeta = INVOICE_STATUS_MAP[invStatus] || {
              label: invStatus,
              color: "bg-gray-100 text-gray-700",
            };

            return (
              <div
                key={order.id}
                className="bg-white p-4 rounded-2xl border border-corp-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-corp-charcoal text-base">
                      #{order.orderNumber}
                    </span>
                    <span className="text-[11px] text-corp-gray block mt-0.5">
                      {new Date(order.createdAt).toLocaleString("tr-TR")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-bold text-corp-charcoal text-base block">
                      {formatTL(order.finalAmount)} TL
                    </span>
                    {isCorporate ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 mt-1">
                        <Building2 size={11} /> Kurumsal
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 text-gray-700 mt-1">
                        <User size={11} /> Bireysel
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-corp-gray space-y-0.5 bg-corp-surface/40 p-2.5 rounded-xl border border-corp-border/60">
                  <p className="font-medium text-corp-charcoal">{order.guestName || "Misafir"}</p>
                  <p className="text-[11px]">{order.guestEmail || "E-posta yok"}</p>
                  {isCorporate && order.companyName && (
                    <p className="text-[11px] text-corp-teal font-medium mt-1 truncate">
                      {order.companyName} {order.taxNumber ? `(VN: ${order.taxNumber})` : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold text-corp-gray">Durum:</label>
                    <div className="flex items-center gap-2">
                      <select
                        value={order.status}
                        disabled={loading === order.id}
                        onChange={(e) => updateStatus(order.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-2 rounded-xl min-h-[44px] border border-corp-border/80 cursor-pointer ${
                          STATUS_MAP[order.status]?.color ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {Object.entries(STATUS_MAP).map(([val, info]) => (
                          <option key={val} value={val} className="bg-white text-corp-charcoal">
                            {info.label}
                          </option>
                        ))}
                      </select>
                      {loading === order.id && (
                        <Loader2 size={14} className="animate-spin text-corp-teal" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-corp-border/50">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${invMeta.color}`}>
                      {invMeta.label}
                    </span>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-corp-teal/10 text-corp-teal hover:bg-corp-teal hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Eye size={15} /> Detay Görüntüle
                    </button>
                  </div>

                  {isCorporate && invStatus !== "SENT" && (
                    <button
                      onClick={() => updateInvoiceStatus(order.id, "SENT")}
                      disabled={loading === order.id}
                      className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-all disabled:opacity-50"
                    >
                      <FileCheck size={14} /> Fatura Gönderildi Olarak İşaretle
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
