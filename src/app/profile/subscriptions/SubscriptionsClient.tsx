"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, CreditCard, XCircle } from "lucide-react";

type Subscription = {
  id: string; status: string; priceAtPurchase: number; currentPeriodEnd: string | Date; cancelAtPeriodEnd: boolean;
  plan: { name: string; slug: string }; planTier: { name: string } | null;
};

const statusLabels: Record<string, string> = { ACTIVE: "Aktif", PENDING: "Beklemede", CANCELLED: "İptal edildi", EXPIRED: "Süresi doldu", FAILED: "Başarısız ödeme" };
const statusStyles: Record<string, string> = { ACTIVE: "bg-emerald-50 text-emerald-700", PENDING: "bg-amber-50 text-amber-700", CANCELLED: "bg-slate-100 text-slate-600", EXPIRED: "bg-slate-100 text-slate-600", FAILED: "bg-red-50 text-red-700" };

function formatPrice(cents: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100); }
function formatDate(value: string | Date) { return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value)); }

export default function SubscriptionsClient({ initialSubscriptions }: { initialSubscriptions: Subscription[] }) {
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function cancelSubscription(id: string) {
    if (!window.confirm("Bu abonelik dönem sonunda iptal edilsin mi?")) return;
    setCancelling(id); setError("");
    const response = await fetch("/api/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscriptionId: id }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "İşlem gerçekleştirilemedi.");
    else setSubscriptions((items) => items.map((item) => item.id === id ? data : item));
    setCancelling(null);
  }

  return <main className="min-h-screen bg-[#f7f8f8] px-5 py-28 md:px-10"><div className="mx-auto max-w-5xl">
    <Link href="/profile" className="text-sm font-medium text-corp-teal hover:underline">← Profilime dön</Link>
    <div className="mt-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-corp-teal">Hesabım</p><h1 className="mt-2 font-display text-3xl font-bold text-corp-charcoal">Aboneliklerim</h1><p className="mt-2 text-sm text-corp-gray">Ürün ve paket bazındaki aboneliklerinizi yönetin.</p></div><CreditCard className="hidden text-corp-teal md:block" size={34} /></div>
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-8 grid gap-4">{subscriptions.length === 0 ? <div className="rounded-2xl border border-corp-border bg-white p-8 text-center text-corp-gray">Henüz bir aboneliğiniz bulunmuyor.</div> : subscriptions.map((subscription) => <article key={subscription.id} className="rounded-2xl border border-corp-border bg-white p-6 shadow-sm"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold text-corp-charcoal">{subscription.plan.name}</h2><span className="rounded-full bg-corp-surface px-3 py-1 text-xs font-semibold text-corp-teal">{subscription.planTier?.name || "Paket bilgisi yok"}</span></div><p className="mt-3 flex items-center gap-2 text-sm text-corp-gray"><CalendarDays size={15} /> Dönem sonu: {formatDate(subscription.currentPeriodEnd)}</p></div><div className="text-left md:text-right"><p className="text-2xl font-bold text-corp-charcoal">{formatPrice(subscription.priceAtPurchase)}</p><p className="text-xs text-corp-gray">Ödeme anındaki fiyat</p></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-corp-border pt-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusStyles[subscription.status] || statusStyles.EXPIRED}`}>{subscription.status === "ACTIVE" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{statusLabels[subscription.status] || subscription.status}</span>{subscription.status === "ACTIVE" && !subscription.cancelAtPeriodEnd && <button onClick={() => cancelSubscription(subscription.id)} disabled={cancelling === subscription.id} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><XCircle size={15} />{cancelling === subscription.id ? "İşleniyor..." : "Dönem sonunda iptal et"}</button>}{subscription.cancelAtPeriodEnd && <span className="text-sm font-medium text-amber-700">Dönem sonunda iptal edilecek</span>}</div></article>)}</div>
  </div></main>;
}
