"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";

type Subscription = { id: string; status: string; price_snapshot: number; current_period_end: string; user: { name: string | null; email: string }; plan: { name: string } | null; product: { name: string } | null };

const statuses = ["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING", "EXPIRED"];

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/subscriptions");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Abonelikler yüklenemedi.");
      setSubscriptions(data.subscriptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abonelikler yüklenemedi.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const response = await fetch("/api/admin/subscriptions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    if (!response.ok) { setError("Durum güncellenemedi."); return; }
    setSubscriptions((current) => current.map((subscription) => subscription.id === id ? { ...subscription, status } : subscription));
  };

  return <main className="min-h-screen bg-corp-surface px-6 py-10 md:px-12">
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div><Link href="/admin" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-corp-teal hover:underline"><ArrowLeft size={16} /> Admin paneline dön</Link><div className="mb-2 flex items-center gap-2 text-corp-teal"><ShieldCheck size={18} /><span className="text-xs font-bold uppercase tracking-[0.2em]">Yönetim / Abonelikler</span></div><h1 className="font-display text-3xl font-bold text-corp-charcoal">Abonelikler</h1><p className="mt-2 text-sm text-corp-gray">Müşteri aboneliklerini ve ödeme durumlarını yönetin.</p></div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-corp-border bg-white px-4 py-2 text-sm font-semibold text-corp-charcoal hover:bg-corp-surface"><RefreshCw size={16} /> Yenile</button>
      </header>
      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-corp-border bg-white shadow-sm">
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-corp-surface text-xs uppercase tracking-wider text-corp-gray"><tr><th className="px-5 py-4">Müşteri</th><th className="px-5 py-4">Ürün / Plan</th><th className="px-5 py-4">Tutar</th><th className="px-5 py-4">Dönem Sonu</th><th className="px-5 py-4">Durum</th></tr></thead><tbody className="divide-y divide-corp-border">{loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-corp-gray">Yükleniyor...</td></tr> : subscriptions.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-corp-gray">Kayıtlı abonelik bulunamadı.</td></tr> : subscriptions.map((subscription) => <tr key={subscription.id} className="hover:bg-corp-surface/50"><td className="px-5 py-4"><div className="font-semibold text-corp-charcoal">{subscription.user.name || "İsimsiz müşteri"}</div><div className="text-xs text-corp-gray">{subscription.user.email}</div></td><td className="px-5 py-4"><div className="font-medium text-corp-charcoal">{subscription.product?.name || "—"}</div><div className="text-xs text-corp-gray">{subscription.plan?.name || "Özel plan"}</div></td><td className="px-5 py-4 font-semibold text-corp-charcoal">₺{subscription.price_snapshot.toLocaleString("tr-TR")}</td><td className="px-5 py-4 text-corp-gray">{new Date(subscription.current_period_end).toLocaleDateString("tr-TR")}</td><td className="px-5 py-4"><select value={subscription.status} onChange={(event) => updateStatus(subscription.id, event.target.value)} className="rounded-lg border border-corp-border bg-white px-3 py-2 text-xs font-semibold text-corp-charcoal">{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></td></tr>)}</tbody></table></div>
      </div>
    </div>
  </main>;
}
