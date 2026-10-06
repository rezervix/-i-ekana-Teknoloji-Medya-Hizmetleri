"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, RefreshCw, User, Package, AlertCircle } from "lucide-react";

type Subscription = {
  id: string;
  status: string;
  priceAtPurchase: number;
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  user: { name: string | null; email: string };
  plan: { name: string };
  planTier: { name: string } | null;
};

const statuses = [
  { value: "ALL", label: "Tümü" },
  { value: "ACTIVE", label: "Aktif" },
  { value: "PENDING", label: "Beklemede" },
  { value: "CANCELLED", label: "İptal" },
  { value: "EXPIRED", label: "Süresi dolmuş" },
  { value: "FAILED", label: "Başarısız ödeme" },
];

const labels: Record<string, string> = Object.fromEntries(
  statuses.map((item) => [item.value, item.label])
);

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value / 100);
}

function date(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export default function AdminSubscriptionsClient({
  initialSubscriptions,
}: {
  initialSubscriptions: Subscription[];
}) {
  const [items, setItems] = useState(initialSubscriptions);
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const visible = useMemo(
    () => (filter === "ALL" ? items : items.filter((item) => item.status === filter)),
    [items, filter]
  );

  async function update(id: string, body: { status?: string; extendDays?: number }) {
    setBusy(id);
    setError("");
    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error || "İşlem başarısız");
    else setItems((current) => current.map((item) => (item.id === id ? data : item)));
    setBusy(null);
  }

  return (
    <div className="rounded-2xl border border-corp-border bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-corp-teal">Satış</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-corp-charcoal">Abonelikler</h1>
          <p className="mt-1 text-sm text-corp-gray">Tüm kullanıcıların ürün ve paket abonelikleri.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-corp-gray" />
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full sm:w-auto rounded-xl border border-corp-border px-3 py-2 text-base sm:text-sm bg-white min-h-[44px]"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </p>
      )}

      {/* Desktop Table View */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-xl border border-corp-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead>
            <tr className="border-b border-corp-border bg-corp-surface text-xs uppercase tracking-wider text-corp-gray">
              <th className="p-3">Kullanıcı</th>
              <th className="p-3">Ürün / Paket</th>
              <th className="p-3">Ödenen</th>
              <th className="p-3">Dönem</th>
              <th className="p-3">Durum</th>
              <th className="p-3">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-corp-gray">
                  Kayıt bulunamadı.
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr key={item.id} className="hover:bg-corp-surface/40">
                  <td className="p-3">
                    <p className="font-semibold text-corp-charcoal">{item.user.name || "İsimsiz"}</p>
                    <p className="text-xs text-corp-gray">{item.user.email}</p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{item.plan.name}</p>
                    <p className="text-xs text-corp-teal">{item.planTier?.name || "Paket bilgisi yok"}</p>
                  </td>
                  <td className="p-3 font-semibold">{money(item.priceAtPurchase)}</td>
                  <td className="p-3 text-xs text-corp-gray">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={13} />
                      {date(item.currentPeriodStart)} – {date(item.currentPeriodEnd)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-corp-surface px-2.5 py-1 text-xs font-bold text-corp-teal">
                      {labels[item.status] || item.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {item.status === "ACTIVE" && (
                        <button
                          disabled={busy === item.id}
                          onClick={() => update(item.id, { status: "CANCELLED" })}
                          className="min-h-[36px] rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Durdur
                        </button>
                      )}
                      <button
                        disabled={busy === item.id}
                        onClick={() => update(item.id, { extendDays: 30 })}
                        className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-corp-border px-3 py-1.5 text-xs font-semibold text-corp-teal hover:bg-corp-surface disabled:opacity-50"
                      >
                        <RefreshCw size={12} />
                        30 gün uzat
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="mt-4 md:hidden space-y-3">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-corp-gray bg-white rounded-xl border border-corp-border text-sm">
            Kayıt bulunamadı.
          </div>
        ) : (
          visible.map((item) => (
            <div
              key={item.id}
              className="bg-white p-4 rounded-2xl border border-corp-border shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-corp-charcoal text-base">{item.user.name || "İsimsiz"}</h4>
                  <span className="text-xs text-corp-gray block">{item.user.email}</span>
                </div>
                <span className="rounded-full bg-corp-surface px-2.5 py-0.5 text-xs font-bold text-corp-teal flex-shrink-0">
                  {labels[item.status] || item.status}
                </span>
              </div>

              <div className="p-3 bg-corp-surface/50 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-corp-gray">Paket:</span>
                  <span className="font-semibold text-corp-charcoal">
                    {item.plan.name} {item.planTier ? `(${item.planTier.name})` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-corp-gray">Ödenen:</span>
                  <span className="font-bold text-corp-charcoal">{money(item.priceAtPurchase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-corp-gray">Dönem:</span>
                  <span className="text-corp-gray">
                    {date(item.currentPeriodStart)} – {date(item.currentPeriodEnd)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-corp-border">
                {item.status === "ACTIVE" && (
                  <button
                    disabled={busy === item.id}
                    onClick={() => update(item.id, { status: "CANCELLED" })}
                    className="min-h-[44px] rounded-xl border border-red-200 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Durdur
                  </button>
                )}
                <button
                  disabled={busy === item.id}
                  onClick={() => update(item.id, { extendDays: 30 })}
                  className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-corp-border px-3.5 py-2 text-xs font-semibold text-corp-teal hover:bg-corp-surface disabled:opacity-50"
                >
                  <RefreshCw size={14} />
                  30 gün uzat
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
