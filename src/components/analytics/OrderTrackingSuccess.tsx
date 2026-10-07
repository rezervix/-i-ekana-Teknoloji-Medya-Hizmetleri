"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/analytics";
import { useCartStore } from "@/store/useCartStore";

export default function OrderTrackingSuccess({ orderNumber }: { orderNumber: string }) {
  const { items, clearCart } = useCartStore();

  useEffect(() => {
    if (orderNumber) {
      const orderItems = items.map((i) => ({
        id: i.productId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        category: i.category,
      }));
      const total = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

      // Faz 5: purchase olayını tetikle
      trackPurchase(orderNumber, orderItems, total);

      // Başarılı sipariş sonrası sepeti temizle
      clearCart();
    }
  }, [orderNumber]);

  return null;
}
