"use client";

import React, { useState, useEffect } from "react";
import { Receipt,
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  ExternalLink,
  Trash2,
  Edit2,
  Loader2,
  Clock,
  TrendingUp,
  ArrowRight,
  Info,
} from "lucide-react";

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  next_charge_at: string;
  cancel_at_period_end: boolean;
  price_snapshot: number;
  plan: {
    id: string;
    name: string;
    price_monthly_tl: number;
    interval_days: number;
    features: string[];
  };
  product: {
    id: string;
    name: string;
    slug: string;
  };
  savedCard: {
    id: string;
    masked_card_no: string;
    card_brand: string;
    isDefault: boolean;
  };
}

interface PaymentAttempt {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  masked_card_no?: string;
  subscription?: {
    plan?: { name: string };
    product?: { name: string };
  };
}

export default function SubscriptionsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<PaymentAttempt[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [activeView, setActiveView] = useState<"subscriptions" | "payments">("subscriptions");
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [canceling, setCanceling] = useState(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const res = await fetch("/api/profile/subscriptions");
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.data || []);
      }
    } catch (err) {
      console.error("Fetch subscriptions error:", err);
      setMessage({ type: "error", text: "Abonelikler yüklenemedi." });
    } finally {
      setLoadingSubs(false);
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/profile/payments?limit=20");
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (err) {
      console.error("Fetch payments error:", err);
      setMessage({ type: "error", text: "Ödemeler yüklenemedi." });
    } finally {
      setLoadingPayments(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!selectedSub) return;

    setCanceling(true);
    try {
      const res = await fetch(
        `/api/profile/subscriptions/cancel?id=${selectedSub.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cancelAtPeriodEnd,
            reason: cancelReason,
          }),
        }
      );

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setShowCancelModal(false);
        setCancelReason("");
        fetchSubscriptions();
      } else {
        setMessage({ type: "error", text: data.error?.message || "İptal başarısız." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "İptal işlemi başarısız." });
    } finally {
      setCanceling(false);
    }
  };

  const formatDateTr = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string; icon: any }> = {
      ACTIVE: { color: "bg-emerald-100 text-emerald-700", text: "Aktif", icon: CheckCircle2 },
      PAST_DUE: { color: "bg-amber-100 text-amber-700", text: "Ödeme Bekliyor", icon: AlertTriangle },
      CANCELED: { color: "bg-rose-100 text-rose-700", text: "İptal Edildi", icon: XCircle },
      TRIALING: { color: "bg-sky-100 text-sky-700", text: "Deneme", icon: Clock },
      EXPIRED: { color: "bg-gray-100 text-gray-700", text: "Süresi Doldu", icon: XCircle },
    };

    const config = statusMap[status] || { color: "bg-gray-100 text-gray-700", text: status, icon: Info };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon size={12} />
        {config.text}
      </span>
    );
  };

  if (loadingSubs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-corp-teal" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-2 p-1 bg-corp-surface rounded-xl w-fit">
        <button
          onClick={() => {
            setActiveView("subscriptions");
            if (payments.length === 0) fetchPayments();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === "subscriptions"
              ? "bg-white text-corp-charcoal shadow-sm"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          Aboneliklerim
        </button>
        <button
          onClick={() => {
            setActiveView("payments");
            if (payments.length === 0) fetchPayments();
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeView === "payments"
              ? "bg-white text-corp-charcoal shadow-sm"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          Ödeme Geçmişi
        </button>
      </div>

      {activeView === "subscriptions" ? (
        <>
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-corp-border">
              <CreditCard className="mx-auto text-corp-gray mb-4" size={48} />
              <h3 className="font-display font-bold text-lg text-corp-charcoal mb-2">
                Aktif Aboneliğiniz Yok
              </h3>
              <p className="font-body text-sm text-corp-gray mb-6">
                Mağazamızdan abonelikli ürünleri inceleyebilirsiniz.
              </p>
              <a
                href="/magaza"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors"
              >
                Mağazaya Git <ArrowRight size={16} />
              </a>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl border border-corp-border p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-display font-bold text-lg text-corp-charcoal">
                          {sub.plan.name}
                        </h3>
                        {getStatusBadge(sub.status)}
                      </div>
                      <p className="font-body text-sm text-corp-gray">
                        {sub.product.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display font-bold text-2xl text-corp-charcoal">
                        ₺{sub.price_snapshot.toFixed(2)}
                      </p>
                      <p className="font-body text-xs text-corp-gray">
                        / {sub.plan.interval_days} gün
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-corp-border/60">
                    <div>
                      <p className="font-body text-xs text-corp-gray mb-1">Dönem Başlangıcı</p>
                      <p className="font-semibold text-sm text-corp-charcoal">
                        {formatDateTr(sub.current_period_start)}
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-corp-gray mb-1">Dönem Sonu</p>
                      <p className="font-semibold text-sm text-corp-charcoal">
                        {formatDateTr(sub.current_period_end)}
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-corp-gray mb-1">Sonraki Ödeme</p>
                      <p className="font-semibold text-sm text-corp-teal">
                        {formatDateTr(sub.next_charge_at)}
                      </p>
                    </div>
                    <div>
                      <p className="font-body text-xs text-corp-gray mb-1">Kayıtlı Kart</p>
                      <p className="font-mono text-sm text-corp-charcoal">
                        {sub.savedCard?.masked_card_no || "—"}
                      </p>
                    </div>
                  </div>

                  {sub.cancel_at_period_end && (
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="font-body text-sm text-amber-800">
                        <AlertTriangle size={16} className="inline mr-2" />
                        Abonelik dönem sonunda iptal edilecek: {formatDateTr(sub.current_period_end)}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-4 border-t border-corp-border/60">
                    {sub.status === "ACTIVE" && !sub.cancel_at_period_end && (
                      <button
                        onClick={() => {
                          setSelectedSub(sub);
                          setShowCancelModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors text-sm font-medium"
                      >
                        <Trash2 size={16} />
                        İptal Et
                      </button>
                    )}
                    <a
                      href={`/magaza/urun/${sub.product.slug}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors text-sm font-medium"
                    >
                      <ExternalLink size={16} />
                      Ürün Detayı
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {loadingPayments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-corp-teal" size={32} />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-corp-border">
              <Receipt className="mx-auto text-corp-gray mb-4" size={48} />
              <h3 className="font-display font-bold text-lg text-corp-charcoal mb-2">
                Ödeme Geçmişi Yok
              </h3>
              <p className="font-body text-sm text-corp-gray">
                Henüz ödeme işleminiz bulunmuyor.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-corp-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-corp-surface">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-corp-gray uppercase">
                      Tarih
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-corp-gray uppercase">
                      Tutar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-corp-gray uppercase">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-corp-gray uppercase">
                      Kart
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border/60">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-corp-surface/50">
                      <td className="px-6 py-4 text-sm text-corp-charcoal">
                        {formatDateTr(payment.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-corp-charcoal">
                        ₺{payment.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-corp-charcoal">
                        {payment.masked_card_no || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedSub && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-corp-charcoal">
              Aboneliği İptal Et
            </h3>
            <p className="font-body text-sm text-corp-gray">
              <strong>{selectedSub.plan.name}</strong> aboneliğinizi iptal etmek istediğinize emin misiniz?
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-corp-border cursor-pointer hover:bg-corp-surface">
                <input
                  type="radio"
                  checked={cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(true)}
                  className="w-4 h-4 text-corp-teal"
                />
                <div>
                  <p className="font-semibold text-sm text-corp-charcoal">Dönem Sonunda İptal Et</p>
                  <p className="text-xs text-corp-gray">
                    Aboneliğiniz {formatDateTr(selectedSub.current_period_end)} tarihine kadar aktif kalacak.
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-corp-border cursor-pointer hover:bg-corp-surface">
                <input
                  type="radio"
                  checked={!cancelAtPeriodEnd}
                  onChange={() => setCancelAtPeriodEnd(false)}
                  className="w-4 h-4 text-corp-teal"
                />
                <div>
                  <p className="font-semibold text-sm text-corp-charcoal">Anında İptal Et</p>
                  <p className="text-xs text-corp-gray">
                    Aboneliğiniz hemen iptal edilecek, erişim kapanacak.
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-corp-gray mb-1.5">
                İptal Nedeni (İsteğe Bağlı)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-corp-border text-sm"
                placeholder="Neden iptal ediyorsunuz?"
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                disabled={canceling}
                className="flex-1 px-4 py-3 rounded-xl border border-corp-border text-corp-charcoal font-medium hover:bg-corp-surface transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {canceling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    İptal Ediliyor...
                  </>
                ) : (
                  "Onayla"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
