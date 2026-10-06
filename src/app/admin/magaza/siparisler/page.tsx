import React from "react";
import { prisma } from "@/lib/prisma";
import { ShoppingBag } from "lucide-react";
import OrderList from "./OrderList";
import OrdersErrorBoundary from "./OrdersErrorBoundary";
import type { OrderWithItems } from "./types";

export const dynamic = "force-dynamic";

// ── Data fetching helper ──────────────────────────────────────────────────────
async function fetchOrders(): Promise<OrderWithItems[]> {
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          // ✅ FIX: product was MISSING — caused item.product === undefined in modal
          product: true,
          selectedTemplate: {
            include: {
              // ✅ FIX: nested product inside template was also missing
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });
  // Cast is safe: the include shape matches OrderWithItems exactly
  return rows as unknown as OrderWithItems[];
}

export default async function AdminSiparislerPage() {
  let orders: OrderWithItems[] = [];
  let fetchError: string | null = null;

  try {
    orders = await fetchOrders();
  } catch (error) {
    fetchError = error instanceof Error ? error.message : "Bilinmeyen hata";
    console.error("[AdminSiparisler] Sipariş listesi çekilirken hata:", {
      message: fetchError,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">Sipariş Yönetimi</h1>
            <p className="text-sm text-corp-gray">Gelen siparişleri takip edin, durumlarını güncelleyin ve detayları görün.</p>
          </div>
        </div>
      </div>

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
