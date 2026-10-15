import React from "react";
import { prisma } from "@/lib/prisma";
import { ShoppingBag, ArrowLeft, Filter, RefreshCw } from "lucide-react";
import Link from "next/link";
import OrderList from "../magaza/siparisler/OrderList";
import OrdersErrorBoundary from "../magaza/siparisler/OrdersErrorBoundary";
import type { OrderWithItems } from "../magaza/siparisler/types";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sipariş Yönetimi — Çiçekana Admin",
  description: "Tüm e-ticaret ve mağaza siparişlerini görüntüleyin, filtreleyin ve yönetin.",
};

async function fetchOrders(): Promise<OrderWithItems[]> {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: true,
          selectedTemplate: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });
  return rows as unknown as OrderWithItems[];
}

export default async function AdminOrdersPage() {
  let orders: OrderWithItems[] = [];
  let fetchError: string | null = null;

  try {
    orders = await fetchOrders();
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("[AdminOrders] Sipariş listesi çekilirken hata:", error);
  }

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === "COMPLETED")
    .reduce((sum, o) => sum + (o.finalAmount || 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.status === "PENDING").length;
  const completedOrdersCount = orders.filter((o) => o.status === "DELIVERED" || o.status === "CONFIRMED").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20 shadow-sm">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">
              Sipariş Yönetim Merkezi
            </h1>
            <p className="text-sm text-corp-gray">
              E-Ticaret ve mağaza siparişlerini gerçek zamanlı takip edin, filtreleyin ve sipariş durumlarını güncelleyin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/magaza/urunler"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-corp-border bg-white text-xs font-semibold text-corp-charcoal hover:bg-corp-surface transition-all"
          >
            Ürün Kataloğuna Git
          </Link>
          <Link
            href="/admin/content/e-ticaret"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-all shadow-sm"
          >
            e-Ticaret Sayfasını Yönet
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <p className="text-xs font-semibold text-corp-gray uppercase tracking-wider">Toplam Sipariş</p>
          <p className="font-display text-2xl font-bold text-corp-charcoal mt-1.5">{orders.length}</p>
          <span className="text-[11px] text-corp-teal font-medium">Kayıtlı tüm işlemler</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <p className="text-xs font-semibold text-corp-gray uppercase tracking-wider">Bekleyen Siparişler</p>
          <p className="font-display text-2xl font-bold text-amber-600 mt-1.5">{pendingOrdersCount}</p>
          <span className="text-[11px] text-amber-700 font-medium">Ödeme / Onay bekleyen</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <p className="text-xs font-semibold text-corp-gray uppercase tracking-wider">Teslim / Onaylanan</p>
          <p className="font-display text-2xl font-bold text-emerald-600 mt-1.5">{completedOrdersCount}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Başarıyla işlenen</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-corp-border shadow-sm">
          <p className="text-xs font-semibold text-corp-gray uppercase tracking-wider">Tahsil Edilen Ciro</p>
          <p className="font-display text-2xl font-bold text-corp-teal mt-1.5">
            ₺{totalRevenue.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-corp-gray font-medium">Tamamlanan ödemeler</span>
        </div>
      </div>

      {/* Main Order Table Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-corp-border shadow-luxury overflow-hidden p-4 sm:p-6">
        {fetchError ? (
          <div className="p-12 text-center text-red-600 bg-red-50 rounded-xl">
            <p className="font-semibold">Siparişler yüklenemedi</p>
            <p className="text-sm mt-1 text-red-500">{fetchError}</p>
          </div>
        ) : (
          <OrdersErrorBoundary>
            <OrderList initialOrders={orders} />
          </OrdersErrorBoundary>
        )}
      </div>
    </div>
  );
}
