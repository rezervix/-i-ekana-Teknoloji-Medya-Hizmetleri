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

  const filteredOrders = orders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.guestEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative w-full md:w-96 mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" size={16} />
        <input
          type="text"
          placeholder="Sipariş no veya e-posta ara..."
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Inline update error banner */}
      {updateError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{updateError}</span>
          <button
            onClick={() => setUpdateError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            ×
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-corp-border">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Sipariş</th>
              <th className="p-4">Müşteri</th>
              <th className="p-4">Tutar</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border bg-white text-sm">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-corp-gray">
                  Sipariş bulunamadı.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
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
                  {/* ✅ FIX: null-safe toLocaleString */}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
