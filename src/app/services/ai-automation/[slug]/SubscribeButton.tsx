"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/useCartStore";

export default function SubscribeButton({ planId, planTierId, planName, tierName, price, image }: { planId: string; planTierId?: string; planName: string; tierName: string; price: number; image?: string | null }) {
  const { status } = useSession();
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function subscribe() {
    if (status === "loading") return;
    if (status !== "authenticated") {
      void signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    addItem({ productId: planTierId || planId, itemType: "subscription", subscriptionPlanId: planId, subscriptionTierId: planTierId, name: `${planName} - ${tierName}`, price, quantity: 1, image: image || "https://placehold.co/160x160?text=Plan", category: "subscription" });
    router.push("/magaza/odeme");
  }

  async function legacySubscribe() {
    if (status === "loading") return;
    if (status !== "authenticated") {
      await signIn(undefined, { callbackUrl: window.location.href });
      return;
    }
    setLoading(true);
    setError("");
    try {
      const createResponse = await fetch("/api/subscriptions/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId, planTierId }) });
      const created = await createResponse.json();
      if (created.alreadySubscribed) { router.push("/profile/subscriptions"); return; }
      if (!createResponse.ok || !created.subscriptionId) throw new Error(created.message || "Abonelik başlatılamadı.");
      const tokenResponse = await fetch("/api/paytr/get-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: created.subscriptionId }) });
      const token = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !token.token) {
        if (tokenResponse.status === 422) {
          throw new Error(token.message || "Profil telefon numaranız eksik. Profilim > Hesap Bilgileri bölümünden ekleyip tekrar deneyin.");
        }
        throw new Error(token.message || `Ödeme başlatılamadı (${tokenResponse.status}).`);
      }
      if (window.self !== window.top) { window.open(`https://www.paytr.com/odeme/guvenli/${token.token}`, "_blank", "noopener,noreferrer"); } else { window.location.href = `https://www.paytr.com/odeme/guvenli/${token.token}`; }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ödeme başlatılamadı.");
      setLoading(false);
    }
  }

  return <div className="flex flex-col gap-3"><Button size="lg" onClick={subscribe} disabled={loading || status === "loading"}>{loading ? "Sepete ekleniyor…" : "Sepete Ekle"}</Button>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}</div>;
}
