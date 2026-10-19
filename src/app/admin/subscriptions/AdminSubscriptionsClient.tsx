"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Filter, RefreshCw, AlertCircle, ShieldAlert, CheckCircle2, Clock, XCircle } from "lucide-react";

export type SubscriptionItem = {
  id: string;
  status: string;
  priceAtPurchase: number;
  currentPeriodStart: string | Date;
  currentPeriodEnd: string | Date;
  createdAt?: string | Date;
  cancelledAt?: string | Date | null;
  cancelAtPeriodEnd?: boolean;
  pendingName?: string | null;
  pendingEmail?: string | null;
  pendingPhone?: string | null;
  paytrCustomerCode?: string | null;
  user: { id?: string; name: string | null; email: string; phone?: string | null } | null;
  plan: { id?: string; name: string } | null;
  planTier: { id?: string; name: string } | null;
};

const statuses = [
  { value: "ALL", label: "Tümü" },
  { value: "ACTIVE", label: "Aktif & Tahsil Edildi" },
  { value: "PENDING", label: "Ödeme Bekleniyor (Misafir)" },
  { value: "CANCELLED", label: "İptal Edildi" },
  { value: "EXPIRED", label: "Süresi Dolmuş" },
  { value: "FAILED", label: "Başarısız Ödeme" },
];

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value / 100);
}

function date(value: string | Date) {
  try {
    return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return "—";
  }
}

function getCustomerDisplay(item: SubscriptionItem) {
  const isLinked = Boolean(item.user);
  const name =
    item.user?.name ||
    item.pendingName ||
    (item.pendingPhone ? `Misafir (${item.pendingPhone})` : "Kullanıcı henüz eşleştirilmedi");
  const email = item.user?.email || item.pendingEmail || "—";
  const phone = item.user?.phone || item.pendingPhone || null;

  return { name, email, phone, isLinked };
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Aktif & Tahsil Edildi",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      };
    case "PENDING":
      return {
        label: "Ödeme Bekleniyor",
        className: "bg-amber-50 text-amber-800 border-amber-200",
        icon: Clock,
      };
    case "FAILED":
      return {
        label: "Ödeme Başarısız",
        className: "bg-red-50 text-red-700 border-red-200",
        icon: XCircle,
      };
    case "CANCELLED":
      return {
        label: "İptal Edildi",
        className: "bg-gray-100 text-gray-700 border-gray-200",
        icon: ShieldAlert,
      };
    case "EXPIRED":
      return {
        label: "Süresi Doldu",
        className: "bg-stone-100 text-stone-700 border-stone-200",
        icon: Clock,
      };
    default:
      return {
        label: status,
        className: "bg-corp-surface text-corp-teal border-corp-border",
        icon: Clock,
      };
  }
}

export default function AdminSubscriptionsClient({
  initialSubscriptions,
}: {
  initialSubscriptions: SubscriptionItem[];
}) {
  const [items, setItems] = useState<SubscriptionItem[]>(initialSubscriptions || []);
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
    try {
      const response = await fetch("/api/admin/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "İşlem başarısız");
      } else {
        setItems((current) => current.map((item) => (item.id === id ? data : item)));
      }
    } catch (err: any) {
      setError(err?.message || "Bağlantı hatası oluştu");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border border-corp-border bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-corp-teal">Satış & Lisanslama</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-corp-charcoal">Abonelikler</h1>
          <p className="mt-1 text-sm text-corp-gray">Tüm kullanıcıların ve misafirlerin ürün ve otomasyon paket abonelikleri.</p>
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
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2 border border-red-200">
          <AlertCircle size={16} />
          <span>{error}</span>
        </p>
      )}

      {/* Desktop Table View */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-xl border border-corp-border">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead>
            <tr className="border-b border-corp-border bg-corp-surface text-xs uppercase tracking-wider text-corp-gray">
              <th className="p-3">Kullanıcı / Müşteri</th>
              <th className="p-3">Ürün / Paket</th>
              <th className="p-3">Ödenen</th>
              <th className="p-3">Dönem</th>
              <th className="p-3">Durum & Tahsilat</th>
              <th className="p-3 text-right">İşlem</th>
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
              visible.map((item) => {
                const customer = getCustomerDisplay(item);
                const badge = getStatusBadge(item.status);
                const BadgeIcon = badge.icon;
                const referenceCode = item.paytrCustomerCode || item.id;

                return (
                  <tr key={item.id} className="hover:bg-corp-surface/40 transition-colors">
                    <td className="p-3 align-top">
                      <p className="font-semibold text-corp-charcoal">{customer.name}</p>
                      <p className="text-xs text-corp-gray">{customer.email}</p>
                      {customer.phone && (
                        <p className="text-[11px] text-corp-teal">{customer.phone}</p>
                      )}
                      {!customer.isLinked && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                          Misafir Hesabı (Eşleşmedi)
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <p className="font-semibold text-corp-charcoal">{item.plan?.name || "Belirtilmemiş Paket"}</p>
                      <p className="text-xs text-corp-teal font-medium">{item.planTier?.name || "Paket kademesi yok"}</p>
                      <span className="font-mono text-[10px] text-corp-gray/80 block mt-1" title={referenceCode}>
                        Ref: {referenceCode.length > 22 ? `${referenceCode.slice(0, 20)}...` : referenceCode}
                      </span>
                    </td>
                    <td className="p-3 align-top font-semibold text-corp-charcoal">
                      {money(item.priceAtPurchase)}
                    </td>
                    <td className="p-3 align-top text-xs text-corp-gray">
                      <span className="flex items-center gap-1 font-medium">
                        <CalendarDays size={13} className="text-corp-teal" />
                        {date(item.currentPeriodStart)} – {date(item.currentPeriodEnd)}
                      </span>
                      {item.cancelAtPeriodEnd && (
                        <span className="inline-block mt-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                          Dönem sonu iptal
                        </span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${badge.className}`}>
                        <BadgeIcon size={12} />
                        {badge.label}
                      </span>
                    </td>
                    <td className="p-3 align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {item.status === "ACTIVE" && (
                          <button
                            disabled={busy === item.id}
                            onClick={() => update(item.id, { status: "CANCELLED" })}
                            className="min-h-[36px] rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                          >
                            Durdur
                          </button>
                        )}
                        <button
                          disabled={busy === item.id}
                          onClick={() => update(item.id, { extendDays: 30 })}
                          className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-corp-border px-3 py-1.5 text-xs font-semibold text-corp-teal hover:bg-corp-surface disabled:opacity-50 transition-colors"
                        >
                          <RefreshCw size={12} />
                          30 gün uzat
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

      {/* Mobile Card List */}
      <div className="mt-4 md:hidden space-y-3">
        {visible.length === 0 ? (
          <div className="p-8 text-center text-corp-gray bg-white rounded-xl border border-corp-border text-sm">
            Kayıt bulunamadı.
          </div>
        ) : (
          visible.map((item) => {
            const customer = getCustomerDisplay(item);
            const badge = getStatusBadge(item.status);
            const BadgeIcon = badge.icon;
            const referenceCode = item.paytrCustomerCode || item.id;

            return (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-corp-border shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-corp-charcoal text-base">{customer.name}</h4>
                    <span className="text-xs text-corp-gray block">{customer.email}</span>
                    {customer.phone && (
                      <span className="text-xs text-corp-teal block">{customer.phone}</span>
                    )}
                    {!customer.isLinked && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
                        Misafir Hesabı
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border flex-shrink-0 ${badge.className}`}>
                    <BadgeIcon size={11} />
                    {badge.label}
                  </span>
                </div>

                <div className="p-3 bg-corp-surface/50 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-corp-gray">Paket:</span>
                    <span className="font-semibold text-corp-charcoal text-right">
                      {item.plan?.name || "Belirtilmemiş Paket"} {item.planTier ? `(${item.planTier.name})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-corp-gray">Ödenen:</span>
                    <span className="font-bold text-corp-charcoal">{money(item.priceAtPurchase)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-corp-gray">Dönem:</span>
                    <span className="text-corp-gray font-medium">
                      {date(item.currentPeriodStart)} – {date(item.currentPeriodEnd)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-corp-border/40">
                    <span className="text-corp-gray">Referans:</span>
                    <span className="font-mono text-[10px] text-corp-gray" title={referenceCode}>
                      {referenceCode.length > 20 ? `${referenceCode.slice(0, 18)}...` : referenceCode}
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
            );
          })
        )}
      </div>
    </div>
  );
}
