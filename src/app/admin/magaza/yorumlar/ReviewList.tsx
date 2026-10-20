"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  X,
  MessageCircle,
  Trash2,
  Loader2,
  Star,
  Search,
  CheckCircle2,
  Clock,
  Edit2,
  Send,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  slug?: string;
  images?: string[];
}

interface Review {
  id: string;
  productId: string;
  product?: Product | null;
  userId?: string | null;
  guestName?: string | null;
  rating: number;
  text: string;
  images?: string[];
  adminReply?: string | null;
  isVerifiedPurchase?: boolean;
  isApproved: boolean;
  createdAt: string | Date;
}

interface ReviewListProps {
  initialReviews: Review[];
}

const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-violet-100 text-violet-700 border-violet-200",
  "bg-amber-100 text-amber-700 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
];

function getAvatarColor(name?: string | null) {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return "M";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(dateInput?: string | Date | null) {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

const QUICK_TEMPLATES = [
  {
    label: "Teşekkür Ederiz 🙏",
    text: "Değerli yorumunuz ve bizi tercih ettiğiniz için teşekkür ederiz. Güzel günlerde kullanmanızı dileriz!",
  },
  {
    label: "Memnuniyet 😊",
    text: "Ürünümüzden ve hizmetimizden memnun kalmanıza çok sevindik! Her zaman yanınızdayız.",
  },
  {
    label: "Özenli Hazırlık 📦",
    text: "Güzel geri bildiriminiz için teşekkürler! Siparişlerinizi her zaman en yüksek kaliteyle ulaştırmaya devam edeceğiz.",
  },
  {
    label: "Destek & Çözüm 🤝",
    text: "Geri bildiriminiz için teşekkürler. Müşteri deneyimi ekibimiz sizinle en kısa sürede iletişime geçecektir.",
  },
];

export default function ReviewList({ initialReviews }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [loading, setLoading] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "UNREPLIED" | "REPLIED">("ALL");

  // Reply Modal State
  const [activeReviewForReply, setActiveReviewForReply] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [autoApproveOnReply, setAutoApproveOnReply] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const total = reviews.length;
    const pending = reviews.filter((r) => !r.isApproved).length;
    const unreplied = reviews.filter((r) => !r.adminReply).length;
    const replied = reviews.filter((r) => Boolean(r.adminReply)).length;
    const avgRating =
      total > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / total).toFixed(1) : "0.0";
    return { total, pending, unreplied, replied, avgRating };
  }, [reviews]);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Filter by status
      if (filter === "PENDING" && review.isApproved) return false;
      if (filter === "APPROVED" && !review.isApproved) return false;
      if (filter === "UNREPLIED" && review.adminReply) return false;
      if (filter === "REPLIED" && !review.adminReply) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const customerName = (review.guestName || "Misafir").toLowerCase();
        const productName = (review.product?.name || "").toLowerCase();
        const text = (review.text || "").toLowerCase();
        const reply = (review.adminReply || "").toLowerCase();

        return (
          customerName.includes(query) ||
          productName.includes(query) ||
          text.includes(query) ||
          reply.includes(query)
        );
      }

      return true;
    });
  }, [reviews, filter, searchQuery]);

  // Open Reply Modal
  const handleOpenReply = (review: Review) => {
    setActiveReviewForReply(review);
    setReplyText(review.adminReply || "");
    setAutoApproveOnReply(!review.isApproved);
  };

  // Close Reply Modal
  const handleCloseReply = () => {
    setActiveReviewForReply(null);
    setReplyText("");
    setIsSubmittingReply(false);
  };

  // Submit / Save Reply
  const handleSaveReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeReviewForReply) return;

    const trimmed = replyText.trim();
    if (!trimmed) {
      toast.error("Lütfen bir yanıt metni girin veya yanıtı silmek için 'Yanıtı Kaldır' butonunu kullanın.");
      return;
    }

    setIsSubmittingReply(true);
    try {
      const payload: { adminReply: string; isApproved?: boolean } = {
        adminReply: trimmed,
      };
      if (autoApproveOnReply && !activeReviewForReply.isApproved) {
        payload.isApproved = true;
      }

      const res = await fetch(`/api/admin/reviews/${activeReviewForReply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Yanıt kaydedilirken bir hata oluştu.");
      }

      const updatedReview = await res.json();

      setReviews((prev) =>
        prev.map((r) =>
          r.id === activeReviewForReply.id
            ? {
                ...r,
                adminReply: updatedReview.adminReply ?? trimmed,
                isApproved: updatedReview.isApproved ?? (autoApproveOnReply ? true : r.isApproved),
              }
            : r
        )
      );

      toast.success(
        activeReviewForReply.adminReply
          ? "Mağaza yanıtı başarıyla güncellendi."
          : "Mağaza yanıtı kaydedildi ve yayına alındı."
      );
      handleCloseReply();
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız.");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // Delete only the admin reply
  const handleDeleteReply = async (reviewId: string) => {
    if (!confirm("Mağaza yanıtını silmek istediğinize emin misiniz?")) return;

    setLoading(`reply-${reviewId}`);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: "" }),
      });

      if (!res.ok) {
        throw new Error("Yanıt silinemedi.");
      }

      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, adminReply: null } : r))
      );

      if (activeReviewForReply?.id === reviewId) {
        handleCloseReply();
      }

      toast.success("Mağaza yanıtı kaldırıldı.");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız.");
    } finally {
      setLoading(null);
    }
  };

  // Toggle approval
  const handleToggleApprove = async (review: Review) => {
    const nextApproved = !review.isApproved;
    setLoading(`approve-${review.id}`);
    try {
      const res = await fetch(`/api/admin/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: nextApproved }),
      });

      if (!res.ok) {
        throw new Error("Durum güncellenemedi.");
      }

      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, isApproved: nextApproved } : r))
      );

      toast.success(nextApproved ? "Yorum onaylandı ve yayına alındı." : "Yorum yayından kaldırıldı.");
    } catch (error: any) {
      toast.error(error.message || "İşlem başarısız.");
    } finally {
      setLoading(null);
    }
  };

  // Delete review completely
  const handleDelete = async (id: string) => {
    if (!confirm("Bu yorumu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }

    setLoading(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Silme işlemi başarısız.");
      }

      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Yorum başarıyla silindi.");
    } catch (error: any) {
      toast.error(error.message || "Silme hatası.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-corp-surface/50 border border-corp-border/60 rounded-2xl p-4 flex flex-col">
          <span className="text-xs text-corp-gray font-medium">Toplam Yorum</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-corp-charcoal">{stats.total}</span>
            <span className="text-xs text-amber-500 font-semibold flex items-center gap-0.5">
              <Star size={11} fill="currentColor" /> {stats.avgRating}
            </span>
          </div>
        </div>

        <button
          onClick={() => setFilter(filter === "PENDING" ? "ALL" : "PENDING")}
          className={`text-left border rounded-2xl p-4 transition-all ${
            filter === "PENDING"
              ? "bg-amber-50 border-amber-300 ring-2 ring-amber-400/20"
              : "bg-corp-surface/50 border-corp-border/60 hover:bg-amber-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-corp-gray font-medium">Onay Bekleyen</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{stats.pending}</span>
        </button>

        <button
          onClick={() => setFilter(filter === "UNREPLIED" ? "ALL" : "UNREPLIED")}
          className={`text-left border rounded-2xl p-4 transition-all ${
            filter === "UNREPLIED"
              ? "bg-teal-50 border-corp-teal/40 ring-2 ring-corp-teal/20"
              : "bg-corp-surface/50 border-corp-border/60 hover:bg-teal-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-corp-gray font-medium">Yanıt Bekleyen</span>
            <MessageCircle size={14} className="text-corp-teal" />
          </div>
          <span className="text-2xl font-bold text-corp-teal mt-1 block">{stats.unreplied}</span>
        </button>

        <button
          onClick={() => setFilter(filter === "REPLIED" ? "ALL" : "REPLIED")}
          className={`text-left border rounded-2xl p-4 transition-all ${
            filter === "REPLIED"
              ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20"
              : "bg-corp-surface/50 border-corp-border/60 hover:bg-emerald-50/50"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-corp-gray font-medium">Yanıtlandı</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{stats.replied}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-corp-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Müşteri, ürün veya yorum içinde ara..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-corp-surface/60 border border-corp-border/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-corp-teal/30 focus:border-corp-teal transition-all placeholder:text-corp-gray/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === "ALL"
                ? "bg-corp-charcoal text-white shadow-xs"
                : "bg-corp-surface hover:bg-corp-border/40 text-corp-gray"
            }`}
          >
            Tümü ({reviews.length})
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === "PENDING"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100/80"
            }`}
          >
            Bekleyenler ({stats.pending})
          </button>
          <button
            onClick={() => setFilter("UNREPLIED")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === "UNREPLIED"
                ? "bg-corp-teal text-white shadow-xs"
                : "bg-teal-50 text-corp-teal hover:bg-teal-100/80"
            }`}
          >
            Yanıt Bekleyen ({stats.unreplied})
          </button>
          <button
            onClick={() => setFilter("REPLIED")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
              filter === "REPLIED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80"
            }`}
          >
            Yanıtlanan ({stats.replied})
          </button>
        </div>
      </div>

      {/* Main Reviews Container */}
      <div className="rounded-2xl border border-corp-border overflow-hidden bg-white shadow-luxury">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <MessageCircle size={36} className="mx-auto text-corp-gray/40 stroke-1" />
            <p className="font-medium text-corp-charcoal text-sm">Hiç yorum bulunamadı.</p>
            <p className="text-xs text-corp-gray">
              {searchQuery || filter !== "ALL"
                ? "Arama veya filtre kriterlerinize uyan yorum yok."
                : "Henüz mağaza ürünlerine yapılmış bir müşteri yorumu bulunmuyor."}
            </p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="p-4">Müşteri & Tarih</th>
                    <th className="p-4">Ürün & Puan</th>
                    <th className="p-4 max-w-md">Müşteri Yorumu & Yanıt</th>
                    <th className="p-4">Durum</th>
                    <th className="p-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border text-sm">
                  {filteredReviews.map((review) => {
                    const initials = getInitials(review.guestName);
                    const colorClass = getAvatarColor(review.guestName);
                    return (
                      <tr key={review.id} className="hover:bg-gray-50/70 transition-colors align-top">
                        {/* Customer & Date */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-2xs ${colorClass}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-corp-charcoal flex items-center gap-1.5">
                                <span>{review.guestName || "Misafir"}</span>
                                {review.isVerifiedPurchase && (
                                  <span title="Onaylı Alıcı" className="inline-flex items-center">
                                    <ShieldCheck size={13} className="text-emerald-500" />
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-corp-gray">{formatDate(review.createdAt)}</span>
                            </div>
                          </div>
                        </td>

                        {/* Product & Rating */}
                        <td className="p-4">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            {review.product?.slug ? (
                              <Link
                                href={`/magaza/urun/${review.product.slug}`}
                                target="_blank"
                                className="font-semibold text-corp-charcoal hover:text-corp-teal transition-colors text-xs line-clamp-1 inline-flex items-center gap-1"
                              >
                                <span>{review.product?.name}</span>
                                <ExternalLink size={10} className="shrink-0 opacity-60" />
                              </Link>
                            ) : (
                              <span className="font-semibold text-corp-charcoal text-xs line-clamp-1">
                                {review.product?.name || "Bilinmeyen Ürün"}
                              </span>
                            )}
                            <div className="flex items-center gap-0.5 text-amber-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={12}
                                  fill={star <= review.rating ? "currentColor" : "none"}
                                />
                              ))}
                            </div>
                          </div>
                        </td>

                        {/* Review Text & Admin Reply */}
                        <td className="p-4 max-w-md">
                          <div className="space-y-2">
                            <p className="text-corp-charcoal text-xs italic leading-relaxed">
                              "{review.text}"
                            </p>

                            {/* Images if any */}
                            {review.images && review.images.length > 0 && (
                              <div className="flex gap-1.5 pt-1">
                                {review.images.map((img, idx) => (
                                  <a
                                    key={idx}
                                    href={img}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-10 h-10 rounded-lg border border-corp-border overflow-hidden shrink-0 hover:opacity-80"
                                  >
                                    <img src={img} alt="review" className="w-full h-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}

                            {/* Store Reply display */}
                            {review.adminReply && (
                              <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200/60 text-xs">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-corp-teal flex items-center gap-1 text-[11px]">
                                    <MessageCircle size={12} /> Mağaza Yanıtınız
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => handleOpenReply(review)}
                                      className="text-[11px] text-corp-teal hover:underline font-medium inline-flex items-center gap-0.5"
                                    >
                                      <Edit2 size={10} /> Düzenle
                                    </button>
                                    <button
                                      onClick={() => handleDeleteReply(review.id)}
                                      disabled={loading === `reply-${review.id}`}
                                      className="text-[11px] text-red-500 hover:underline font-medium inline-flex items-center gap-0.5"
                                    >
                                      <Trash2 size={10} /> Sil
                                    </button>
                                  </div>
                                </div>
                                <p className="text-corp-charcoal/90 italic text-[11px] leading-relaxed">
                                  "{review.adminReply}"
                                </p>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                review.isApproved
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {review.isApproved ? "Yayında" : "Bekliyor"}
                            </span>
                            {review.adminReply && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700">
                                Yanıtlandı
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleApprove(review)}
                              disabled={loading === `approve-${review.id}`}
                              className={`p-2 rounded-lg transition-all ${
                                review.isApproved
                                  ? "text-corp-gray hover:text-amber-600 hover:bg-amber-50"
                                  : "text-green-600 bg-green-50 hover:bg-green-100"
                              }`}
                              title={review.isApproved ? "Yayından Kaldır" : "Onayla"}
                            >
                              {loading === `approve-${review.id}` ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Check size={15} />
                              )}
                            </button>

                            <button
                              onClick={() => handleOpenReply(review)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                review.adminReply
                                  ? "text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20"
                                  : "text-corp-charcoal bg-gray-100 hover:bg-gray-200"
                              }`}
                              title="Yorumu Yanıtla"
                            >
                              <MessageCircle size={14} />
                              <span>{review.adminReply ? "Düzenle" : "Yanıtla"}</span>
                            </button>

                            <button
                              onClick={() => handleDelete(review.id)}
                              disabled={loading === review.id}
                              className="p-2 text-corp-gray hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                              title="Sil"
                            >
                              {loading === review.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Card View */}
            <div className="lg:hidden divide-y divide-corp-border">
              {filteredReviews.map((review) => {
                const initials = getInitials(review.guestName);
                const colorClass = getAvatarColor(review.guestName);

                return (
                  <div key={review.id} className="p-4 sm:p-5 space-y-3.5">
                    {/* Header: Customer, Avatar, Status & Date */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs uppercase shrink-0 shadow-2xs ${colorClass}`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-corp-charcoal text-sm truncate">
                              {review.guestName || "Misafir"}
                            </span>
                            {review.isVerifiedPurchase && (
                              <span title="Onaylı Müşteri" className="inline-flex items-center shrink-0">
                                <ShieldCheck size={13} className="text-emerald-500" />
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-corp-gray block">{formatDate(review.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            review.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {review.isApproved ? "Yayında" : "Bekliyor"}
                        </span>
                        {review.adminReply && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-semibold bg-teal-100 text-teal-700">
                            Yanıtlandı
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Product & Stars */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-corp-border/40">
                      <div className="min-w-0">
                        <span className="text-[11px] text-corp-gray font-medium uppercase tracking-wide block">
                          Ürün:
                        </span>
                        {review.product?.slug ? (
                          <Link
                            href={`/magaza/urun/${review.product.slug}`}
                            target="_blank"
                            className="font-bold text-corp-charcoal text-xs hover:text-corp-teal transition-colors inline-flex items-center gap-1 truncate"
                          >
                            <span>{review.product?.name}</span>
                            <ExternalLink size={10} className="shrink-0 opacity-60" />
                          </Link>
                        ) : (
                          <span className="font-bold text-corp-charcoal text-xs truncate">
                            {review.product?.name || "Bilinmeyen Ürün"}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={13}
                            fill={star <= review.rating ? "currentColor" : "none"}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Review Comment Box */}
                    <div className="p-3 bg-corp-surface/50 rounded-xl border border-corp-border/60">
                      <p className="text-xs sm:text-sm text-corp-charcoal italic leading-relaxed">
                        "{review.text}"
                      </p>
                    </div>

                    {/* Admin Reply Box if exists */}
                    {review.adminReply && (
                      <div className="p-3 sm:p-3.5 rounded-xl bg-teal-50/80 border border-teal-200/70 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-corp-teal flex items-center gap-1.5 text-xs">
                            <MessageCircle size={13} />
                            <span>Mağaza Yanıtınız</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenReply(review)}
                              className="text-xs text-corp-teal font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              <Edit2 size={11} /> Düzenle
                            </button>
                            <button
                              onClick={() => handleDeleteReply(review.id)}
                              disabled={loading === `reply-${review.id}`}
                              className="text-xs text-red-500 font-semibold hover:underline inline-flex items-center gap-0.5"
                            >
                              <Trash2 size={11} /> Sil
                            </button>
                          </div>
                        </div>
                        <p className="text-corp-charcoal/90 italic text-xs leading-relaxed pl-1">
                          "{review.adminReply}"
                        </p>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-corp-border/50">
                      {!review.isApproved && (
                        <button
                          onClick={() => handleToggleApprove(review)}
                          disabled={loading === `approve-${review.id}`}
                          className="min-h-[38px] px-3 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-xl flex items-center gap-1.5 font-semibold transition-colors border border-green-200"
                        >
                          {loading === `approve-${review.id}` ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          <span>Onayla</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenReply(review)}
                        className={`min-h-[38px] px-3.5 text-xs rounded-xl flex items-center gap-1.5 font-semibold transition-colors ${
                          review.adminReply
                            ? "text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 border border-corp-teal/20"
                            : "text-white bg-corp-teal hover:bg-corp-teal-600 shadow-xs"
                        }`}
                      >
                        <MessageCircle size={14} />
                        <span>{review.adminReply ? "Yanıtı Düzenle" : "Yanıtla"}</span>
                      </button>

                      <button
                        onClick={() => handleDelete(review.id)}
                        disabled={loading === review.id}
                        className="min-h-[38px] px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-xl flex items-center gap-1.5 font-semibold transition-colors border border-red-200 disabled:opacity-50"
                        title="Yorumu Sil"
                      >
                        {loading === review.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {activeReviewForReply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="bg-white rounded-3xl border border-corp-border shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-corp-border flex items-center justify-between bg-corp-surface/40">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20">
                  <MessageCircle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-corp-charcoal text-base">
                    {activeReviewForReply.adminReply ? "Mağaza Yanıtını Düzenle" : "Yoruma Yanıt Ver"}
                  </h3>
                  <p className="text-xs text-corp-gray">Müşteriye ve ürün sayfasına yansıyacak resmi yanıt</p>
                </div>
              </div>
              <button
                onClick={handleCloseReply}
                disabled={isSubmittingReply}
                className="w-8 h-8 rounded-full flex items-center justify-center text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveReply} className="p-5 space-y-4 overflow-y-auto">
              {/* Review Context Preview */}
              <div className="p-3.5 bg-corp-surface/60 rounded-2xl border border-corp-border/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-corp-charcoal">
                      {activeReviewForReply.guestName || "Misafir"}
                    </span>
                    <span className="text-[10px] text-corp-gray">
                      • {formatDate(activeReviewForReply.createdAt)}
                    </span>
                  </div>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={11}
                        fill={s <= activeReviewForReply.rating ? "currentColor" : "none"}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-corp-charcoal/90 italic leading-relaxed">
                  "{activeReviewForReply.text}"
                </p>
                <div className="text-[11px] text-corp-gray">
                  Ürün: <span className="font-medium text-corp-charcoal">{activeReviewForReply.product?.name}</span>
                </div>
              </div>

              {/* Quick Suggestion Templates */}
              <div>
                <label className="text-xs font-semibold text-corp-gray mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-corp-teal" />
                  <span>Hazır Yanıt Şablonları</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReplyText(tmpl.text)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-corp-surface hover:bg-corp-teal/10 hover:text-corp-teal border border-corp-border/70 rounded-lg transition-colors text-corp-charcoal"
                    >
                      {tmpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea for Response */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="adminReplyText" className="text-xs font-bold text-corp-charcoal">
                    Resmi Mağaza Yanıtınız:
                  </label>
                  <span className="text-[11px] text-corp-gray">{replyText.length} karakter</span>
                </div>
                <textarea
                  id="adminReplyText"
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Müşterinize hitaben teşekkür veya açıklama yanıtınızı yazın..."
                  className="w-full p-3 text-xs sm:text-sm bg-white border border-corp-border rounded-xl focus:outline-none focus:ring-2 focus:ring-corp-teal/30 focus:border-corp-teal transition-all placeholder:text-corp-gray/50"
                  autoFocus
                  required
                />
              </div>

              {/* Auto-Approve Checkbox (only if review is currently not approved) */}
              {!activeReviewForReply.isApproved && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoApproveOnReply}
                    onChange={(e) => setAutoApproveOnReply(e.target.checked)}
                    className="mt-0.5 rounded border-amber-300 text-corp-teal focus:ring-corp-teal"
                  />
                  <div>
                    <span className="font-semibold block">Yorumu da otomatik onayla ve yayına al</span>
                    <span className="text-[11px] text-amber-800/80">
                      İşaretlendiğinde müşteri yorumu ve yanıtınız birlikte mağazada görünür olacaktır.
                    </span>
                  </div>
                </label>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-corp-border flex items-center justify-between gap-2">
                <div>
                  {activeReviewForReply.adminReply && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(activeReviewForReply.id)}
                      disabled={isSubmittingReply}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors inline-flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Yanıtı Kaldır</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseReply}
                    disabled={isSubmittingReply}
                    className="px-4 py-2 text-xs font-semibold text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    Vazgeç
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingReply || !replyText.trim()}
                    className="px-5 py-2 text-xs font-bold text-white bg-corp-teal hover:bg-corp-teal-600 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReply ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Kaydediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>{activeReviewForReply.adminReply ? "Güncelle" : "Yanıtı Yayınla"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
