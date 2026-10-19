"use client";

import { useEffect } from "react";
import { trackPurchase, AnalyticsItem } from "@/lib/analytics";
import { useCartStore } from "@/store/useCartStore";

interface OrderTrackingSuccessProps {
  orderNumber: string;
  finalAmount?: number;
  items?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category?: string;
  }>;
}

export default function OrderTrackingSuccess({
  orderNumber,
  finalAmount: finalAmountProp,
  items: itemsProp,
}: OrderTrackingSuccessProps) {
  const { items: cartItems, clearCart } = useCartStore();

  useEffect(() => {
    if (!orderNumber) return;

    // Mükerrer sayımı önleme (Idempotency / De-duplication)
    const trackedKey = `cicekana_tracked_purchase_${orderNumber}`;
    try {
      if (sessionStorage.getItem(trackedKey)) {
        return;
      }
    } catch {}

    // Sunucu tarafından doğrulanmış sipariş verisi öncelikli
    const resolvedItems: AnalyticsItem[] =
      itemsProp && itemsProp.length > 0
        ? itemsProp.map((i) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price) || 0,
            quantity: i.quantity || 1,
            category: i.category || "Mağaza",
          }))
        : cartItems.map((i) => ({
            id: i.productId,
            name: i.name,
            price: Number(i.price) || 0,
            quantity: i.quantity || 1,
            category: i.category || "Mağaza",
          }));

    const total =
      finalAmountProp !== undefined && Number(finalAmountProp) >= 0
        ? Number(finalAmountProp)
        : cartItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    // Google Ads & GA4: purchase olayını tetikle
    trackPurchase(orderNumber, resolvedItems, total);

    try {
      sessionStorage.setItem(trackedKey, "1");
    } catch {}

    // Başarılı sipariş sonrası sepeti temizle
    clearCart();
  }, [orderNumber, finalAmountProp, itemsProp, clearCart, cartItems]);

  return null;
}
