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
  Archive,
  ArchiveRestore,
  AlertTriangle,
  CheckSquare,
  Square,
  X,
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
  const [includeArchivedInSearch, setIncludeArchivedInSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");
  const [filterType, setFilterType] = useState<"all" | "corporate_pending">("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Onay modalı (Ödemesi tamamlanıp teslim edilmemiş siparişler için)
  const [archiveConfirmModal, setArchiveConfirmModal] = useState<{
    isOpen: boolean;
    orderIds: string[];
    isBulk: boolean;
    warningMessage: string;
  } | null>(null);

  // Tab sayıları
  const activeOrdersCount = orders.filter((o) => !o.archivedAt).length;
  const archivedOrdersCount = orders.filter((o) => !!o.archivedAt).length;

  // Durum güncelleme (status)
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
        throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${res.status}`);
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

  // Fatura durumu güncelleme
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
        throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${res.status}`);
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

  // ── Arşivleme İşlemleri (Arşivleme ASLA stoğu, ödeme veya sipariş durumunu değiştirmez) ──
  const executeArchive = async (ids: string[], archive: boolean) => {
    setArchiveConfirmModal(null);
    setLoading(ids.length === 1 ? ids[0] : "bulk");
    try {
      if (ids.length === 1) {
        const res = await fetch(`/api/admin/orders/${ids[0]}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: archive }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${res.status}`);
        }
        const now = archive ? new Date() : null;
        setOrders((prev) =>
          prev.map((o) => (o.id === ids[0] ? { ...o, archivedAt: now } : o))
        );
        toast.success(archive ? "Sipariş arşivlendi." : "Sipariş arşivden çıkarıldı.");
      } else {
        const res = await fetch("/api/admin/orders/bulk-archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderIds: ids, archive }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? data?.error ?? `HTTP ${res.status}`);
        }
        const now = archive ? new Date() : null;
        setOrders((prev) =>
          prev.map((o) => (ids.includes(o.id) ? { ...o, archivedAt: now } : o))
        );
        toast.success(
          archive
            ? `${ids.length} sipariş başarıyla arşivlendi.`
            : `${ids.length} sipariş arşivden çıkarıldı.`
        );
      }

      // Seçimleri temizle
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bilinmeyen hata";
      toast.error(`Arşiv işlemi başarısız: ${msg}`);
    } finally {
      setLoading(null);
    }
  };

  // Tekil Arşivleme Butonu Tıklanınca
  const handleArchiveSingle = (order: OrderWithItems) => {
    const isPaidNotDelivered =
      order.paymentStatus === "COMPLETED" && order.status !== "DELIVERED";

    if (isPaidNotDelivered) {
      setArchiveConfirmModal({
        isOpen: true,
        orderIds: [order.id],
        isBulk: false,
        warningMessage: `#${order.orderNumber} numaralı siparişin ödemesi tamamlanmış ancak durumu henüz 'Teslim Edildi' değildir (Mevcut Durum: ${STATUS_MAP[order.status]?.label || order.status}). Yine de bu siparişi arşive taşımak istiyor musunuz?`,
      });
    } else {
      executeArchive([order.id], true);
    }
  };

  // Tekil Arşivden Çıkarma Butonu Tıklanınca
  const handleUnarchiveSingle = (order: OrderWithItems) => {
    executeArchive([order.id], false);
  };

  // Toplu Arşivleme Butonu Tıklanınca
  const handleBulkArchive = () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;

    const paidNotDeliveredOrders = orders.filter(
      (o) => ids.includes(o.id) && o.paymentStatus === "COMPLETED" && o.status !== "DELIVERED"
    );

    if (paidNotDeliveredOrders.length > 0) {
      const numbers = paidNotDeliveredOrders.map((o) => `#${o.orderNumber}`).join(", ");
      setArchiveConfirmModal({
        isOpen: true,
        orderIds: ids,
        isBulk: true,
        warningMessage: `Seçtiğiniz siparişler arasında ödemesi alınmış ancak teslimatı henüz tamamlanmamış sipariş(ler) bulunmaktadır (${numbers}). Yine de seçilen ${ids.length} siparişi arşive taşımak istiyor musunuz?`,
      });
    } else {
      executeArchive(ids, true);
    }
  };

  // Toplu Arşivden Çıkarma Butonu Tıklanınca
  const handleBulkUnarchive = () => {
    const ids = Array.from(selectedOrderIds);
    if (ids.length === 0) return;
    executeArchive(ids, false);
  };

  // ── Filtreleme ve Arama Mantığı ──────────────────────────────────────────
  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.trim().toLowerCase();

    // Arama eşleşmesi
    const matchesSearch =
      !term ||
      o.orderNumber.toLowerCase().includes(term) ||
      (o.guestEmail?.toLowerCase().includes(term) ?? false) ||
      (o.companyName?.toLowerCase().includes(term) ?? false) ||
      (o.taxNumber?.includes(term) ?? false) ||
      (o.guestName?.toLowerCase().includes(term) ?? false);

    if (!matchesSearch) return false;

    // Kurumsal bekleyen filtresi
    if (filterType === "corporate_pending") {
      if (!(o.customerType === "CORPORATE" && o.invoiceStatus === "PENDING")) {
        return false;
      }
    }

    // Arama yapılıyorsa ve "Arşivdekileri de dahil et" seçilmişse hem aktif hem arşiv gösterilir
    if (term && includeArchivedInSearch) {
      return true;
    }

    // Standart sekme filtreleme:
    if (activeTab === "active") {
      return !o.archivedAt;
    } else {
      return !!o.archivedAt;
    }
  });

  const corporatePendingCount = orders.filter(
    (o) =>
      o.customerType === "CORPORATE" &&
      o.invoiceStatus === "PENDING" &&
      (activeTab === "active" ? !o.archivedAt : !!o.archivedAt)
  ).length;

  // Seçim kontrolleri
  const isAllVisibleSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.has(o.id));

  const toggleSelectAll = () => {
    if (isAllVisibleSelected) {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        filteredOrders.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setSelectedOrderIds((prev) => {
        const next = new Set(prev);
        filteredOrders.forEach((o) => next.add(o.id));
        return next;
      });
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* ── Üst Sekmeler: Aktif ve Arşiv (Sipariş Sayıları Dahil) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-corp-border pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("active");
              setSelectedOrderIds(new Set());
            }}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-display text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "active"
                ? "bg-corp-teal text-white shadow-md"
                : "bg-gray-100 dark:bg-white/5 text-corp-charcoal hover:bg-gray-200"
            }`}
          >
            <span>Aktif Siparişler</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === "active"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-corp-charcoal"
              }`}
            >
              {activeOrdersCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("archived");
              setSelectedOrderIds(new Set());
            }}
            className={`min-h-[44px] px-5 py-2.5 rounded-xl font-display text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "archived"
                ? "bg-corp-charcoal text-white shadow-md dark:bg-corp-teal"
                : "bg-gray-100 dark:bg-white/5 text-corp-charcoal hover:bg-gray-200"
            }`}
          >
            <Archive size={16} />
            <span>Arşiv</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                activeTab === "archived"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-corp-charcoal"
              }`}
            >
              {archivedOrdersCount}
            </span>
          </button>
        </div>

        {/* Kurumsal Bekleyen Alt Filtresi */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterType(filterType === "all" ? "corporate_pending" : "all")}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              filterType === "corporate_pending"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            <Building2 size={14} />
            <span>Kurumsal + Bekleyen Fatura</span>
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

      {/* ── Arama ve Arama Kapsamı (Arşivi de kapsayan seçenek) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-corp-surface/50 p-3 rounded-2xl border border-corp-border/60">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" size={16} />
          <input
            type="text"
            placeholder="Sipariş no, e-posta, firma, müşteri ara..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border bg-white focus:outline-none focus:ring-2 focus:ring-corp-teal/20 text-sm min-h-[44px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Arama: Arşivi de kapsayan seçenek */}
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-corp-charcoal select-none py-1 px-2 rounded-xl hover:bg-white/80 transition-colors">
          <input
            type="checkbox"
            checked={includeArchivedInSearch}
            onChange={(e) => setIncludeArchivedInSearch(e.target.checked)}
            className="w-4 h-4 text-corp-teal rounded border-corp-border focus:ring-corp-teal"
          />
          <span className="flex items-center gap-1.5">
            <Archive size={14} className="text-corp-gray" />
            <span>Aramada arşivi de dahil et</span>
          </span>
        </label>
      </div>

      {/* ── Toplu İşlem Çubuğu (Çoklu Seçim Aktifken Görünür) ── */}
      {selectedOrderIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-corp-teal/10 border border-corp-teal/30 rounded-2xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-corp-teal text-white flex items-center justify-center text-xs font-bold">
              {selectedOrderIds.size}
            </span>
            <span className="text-xs font-bold text-corp-charcoal">
              sipariş seçildi
            </span>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "active" ? (
              <button
                type="button"
                onClick={handleBulkArchive}
                disabled={loading === "bulk"}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading === "bulk" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Archive size={14} />
                )}
                <span>Seçilenleri Arşivle</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBulkUnarchive}
                disabled={loading === "bulk"}
                className="min-h-[40px] px-4 py-1.5 rounded-xl bg-corp-teal hover:bg-corp-teal-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading === "bulk" ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ArchiveRestore size={14} />
                )}
                <span>Seçilenleri Arşivden Çıkar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSelectedOrderIds(new Set())}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white border border-corp-border text-corp-gray hover:text-corp-charcoal text-xs font-semibold transition-colors"
            >
              Seçimi Temizle
            </button>
          </div>
        </div>
      )}

      {/* Hata Bildirimi */}
      {updateError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{updateError}</span>
          <button
            onClick={() => setUpdateError(null)}
            className="ml-auto text-red-400 hover:text-red-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {/* ── Masaüstü Tablo Görünümü ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-corp-border bg-white">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4 w-12 text-center">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label="Tümünü seç veya kaldır"
                  className="p-1 rounded hover:bg-corp-surface text-corp-teal transition-colors"
                >
                  {isAllVisibleSelected ? (
                    <CheckSquare size={18} className="text-corp-teal" />
                  ) : (
                    <Square size={18} className="text-corp-gray" />
                  )}
                </button>
              </th>
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
                <td colSpan={8} className="p-12 text-center text-corp-gray">
                  {activeTab === "active"
                    ? "Aktif sipariş bulunamadı."
                    : "Arşivde sipariş bulunamadı."}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                const isCorporate = order.customerType === "CORPORATE";
                const isArchived = Boolean(order.archivedAt);
                const isSelected = selectedOrderIds.has(order.id);
                const invStatus = order.invoiceStatus || "NOT_REQUIRED";
                const invMeta = INVOICE_STATUS_MAP[invStatus] || {
                  label: invStatus,
                  color: "bg-gray-100 text-gray-700",
                };

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50/80 transition-colors ${
                      isSelected ? "bg-corp-teal/5" : ""
                    }`}
                  >
                    {/* Çoklu Seçim Checkbox */}
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleSelectOrder(order.id)}
                        aria-label={`Sipariş #${order.orderNumber} seçimi`}
                        className="p-1 rounded text-corp-teal"
                      >
                        {isSelected ? (
                          <CheckSquare size={18} className="text-corp-teal" />
                        ) : (
                          <Square size={18} className="text-corp-gray/60 hover:text-corp-gray" />
                        )}
                      </button>
                    </td>

                    {/* Sipariş No & Tarih */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-corp-charcoal">#{order.orderNumber}</span>
                          {isArchived && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-corp-charcoal">
                              <Archive size={10} /> Arşivde
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-corp-gray">
                          {new Date(order.createdAt).toLocaleString("tr-TR")}
                        </span>
                      </div>
                    </td>

                    {/* Müşteri Bilgisi */}
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

                    {/* Müşteri Tipi */}
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

                    {/* Tutar */}
                    <td className="p-4 font-display font-bold text-corp-charcoal">
                      {formatTL(order.finalAmount)} TL
                    </td>

                    {/* Sipariş Durumu */}
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

                    {/* Fatura Durumu */}
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

                    {/* İşlemler (Detay + Tekil Arşivle / Arşivden Çıkar) */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Arşivle / Arşivden Çıkar Butonu */}
                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleUnarchiveSingle(order)}
                            disabled={loading === order.id}
                            className="p-2 text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-colors"
                            title="Siparişi Arşivden Çıkar (Aktife Al)"
                            aria-label={`Sipariş #${order.orderNumber} arşivden çıkar`}
                          >
                            <ArchiveRestore size={18} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchiveSingle(order)}
                            disabled={loading === order.id}
                            className="p-2 text-amber-700 hover:bg-amber-100/60 rounded-lg transition-colors"
                            title="Siparişi Arşivle"
                            aria-label={`Sipariş #${order.orderNumber} arşivle`}
                          >
                            <Archive size={18} />
                          </button>
                        )}

                        {/* Detay Görüntüle */}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-all"
                          title="Siparişi Görüntüle"
                          aria-label={`${order.orderNumber} siparişini görüntüle`}
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Mobil Kart Görünümü ── */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-corp-gray italic bg-white rounded-2xl border border-corp-border">
            {activeTab === "active"
              ? "Aktif sipariş bulunamadı."
              : "Arşivde sipariş bulunamadı."}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const isCorporate = order.customerType === "CORPORATE";
            const isArchived = Boolean(order.archivedAt);
            const isSelected = selectedOrderIds.has(order.id);
            const invStatus = order.invoiceStatus || "NOT_REQUIRED";
            const invMeta = INVOICE_STATUS_MAP[invStatus] || {
              label: invStatus,
              color: "bg-gray-100 text-gray-700",
            };

            return (
              <div
                key={order.id}
                className={`bg-white p-4 rounded-2xl border shadow-xs space-y-3 transition-colors ${
                  isSelected ? "border-corp-teal bg-corp-teal/5" : "border-corp-border"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSelectOrder(order.id)}
                      className="p-1 rounded text-corp-teal"
                      aria-label={`Sipariş #${order.orderNumber} seçimi`}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-corp-teal" />
                      ) : (
                        <Square size={18} className="text-corp-gray/60" />
                      )}
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-corp-charcoal text-base">
                          #{order.orderNumber}
                        </span>
                        {isArchived && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-corp-charcoal">
                            <Archive size={10} /> Arşiv
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-corp-gray block mt-0.5">
                        {new Date(order.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
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

                    <div className="flex items-center gap-1.5">
                      {isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleUnarchiveSingle(order)}
                          disabled={loading === order.id}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-corp-teal/10 text-corp-teal hover:bg-corp-teal hover:text-white font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                          <ArchiveRestore size={15} /> Arşivden Çıkar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleArchiveSingle(order)}
                          disabled={loading === order.id}
                          className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                          <Archive size={15} /> Arşivle
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="min-h-[44px] px-3 py-2 rounded-xl bg-gray-100 text-corp-charcoal hover:bg-gray-200 font-semibold text-xs flex items-center gap-1 transition-colors"
                      >
                        <Eye size={15} /> Detay
                      </button>
                    </div>
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

      {/* ── Teslim Edilmemiş Siparişi Arşivleme Onay Modalı ── */}
      {archiveConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-corp-border space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display font-bold text-corp-charcoal text-base">
                  Arşivleme Onayı
                </h3>
                <p className="text-xs text-corp-gray">Teslim edilmemiş sipariş uyarısı</p>
              </div>
            </div>

            <p className="text-sm text-corp-charcoal leading-relaxed bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80">
              {archiveConfirmModal.warningMessage}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setArchiveConfirmModal(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-corp-border text-corp-gray hover:text-corp-charcoal font-semibold text-xs transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => executeArchive(archiveConfirmModal.orderIds, true)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-md"
              >
                Evet, Arşivle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detay Görüntüleme Modalı */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}
    </div>
  );
}
