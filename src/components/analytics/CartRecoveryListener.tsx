"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import { trackFunnelEvent } from "@/lib/analytics";

/**
 * Faz 6: Terk Edilen Sepet Kurtarma Dinleyicisi
 * E-postadan gelen bağlantılarda (?recover=rec_xyz) sepeti dolu olarak geri açar
 * ve varsa kuponu (?coupon=KAZANIM10) otomatik uygular.
 */
export default function CartRecoveryListener() {
  const searchParams = useSearchParams();
  const hasRecoveredRef = useRef(false);
  const { openDrawer, setCouponCode } = useCartStore();

  useEffect(() => {
    const recoverToken = searchParams?.get("recover");
    const couponParam = searchParams?.get("coupon");

    if (recoverToken && !hasRecoveredRef.current) {
      hasRecoveredRef.current = true;

      fetch(`/api/cart/recover?token=${encodeURIComponent(recoverToken)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.cartSnapshot?.items?.length > 0) {
            const items = data.cartSnapshot.items;

            // Zustand cart store'una ürünleri yükle
            useCartStore.setState({ items });

            const appliedCoupon = couponParam || data.couponCode;
            if (appliedCoupon) {
              setCouponCode(appliedCoupon);
            }

            // Sepet çekmecesini otomatik aç
            openDrawer();

            toast.success(
              `Hoş geldiniz! Sepetiniz (${items.length} ürün) geri yüklendi.${
                appliedCoupon ? ` ${appliedCoupon} kuponu uygulandı!` : ""
              }`,
              { duration: 5000 }
            );

            // Geri kazanım funnel etkinliğini kaydet
            trackFunnelEvent({
              event: "cart_recovered",
              metadata: {
                recoveryToken: recoverToken,
                coupon: appliedCoupon,
                itemCount: items.length,
              },
            });
          }
        })
        .catch((err) => {
          console.warn("[CartRecoveryListener] Kurtarma hatası:", err);
        });
    }
  }, [searchParams, openDrawer, setCouponCode]);

  return null;
}
