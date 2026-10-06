"use client";

import React, { useState } from "react";
import { Check, X, MessageCircle, Trash2, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

interface ReviewListProps {
  initialReviews: any[];
}

export default function ReviewList({ initialReviews }: ReviewListProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;

    setLoading(id);
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setReviews(reviews.filter((r) => r.id !== id));
        toast.success("Yorum silindi.");
      } else {
        throw new Error("Silme işlemi başarısız.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const approveReview = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved: true }),
      });

      if (res.ok) {
        setReviews(reviews.map(r => r.id === id ? { ...r, isApproved: true } : r));
        toast.success("Yorum onaylandı.");
      }
    } catch (error) {
      toast.error("Onaylama hatası.");
    }
  };

  return (
    <div className="rounded-xl border border-corp-border overflow-hidden bg-white">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-bold">
            <tr>
              <th className="p-4">Ürün</th>
              <th className="p-4">Müşteri</th>
              <th className="p-4">Yorum</th>
              <th className="p-4">Durum</th>
              <th className="p-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-corp-border bg-white text-sm">
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-corp-gray">Yorum bulunamadı.</td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-corp-charcoal">{review.product?.name}</span>
                      <div className="flex items-center gap-0.5 text-yellow-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} fill={i < review.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-corp-gray font-medium">
                    {review.guestName || "Misafir"}
                  </td>
                  <td className="p-4 max-w-xs">
                    <p className="text-corp-charcoal line-clamp-2 italic">"{review.text}"</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      review.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                    }`}>
                      {review.isApproved ? "Yayında" : "Bekliyor"}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {!review.isApproved && (
                        <button 
                          onClick={() => approveReview(review.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                          title="Onayla"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button 
                        onClick={() => toast.info("Yanıt özelliği yakında!")}
                        className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-all"
                        title="Yanıtla"
                      >
                        <MessageCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(review.id)}
                        disabled={loading === review.id}
                        className="p-2 text-corp-gray hover:text-error hover:bg-error/10 rounded-lg transition-all disabled:opacity-50"
                        title="Sil"
                      >
                        {loading === review.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-corp-border">
        {reviews.length === 0 ? (
          <div className="p-8 text-center text-corp-gray text-sm">Yorum bulunamadı.</div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-corp-charcoal text-sm">{review.product?.name}</p>
                  <p className="text-xs text-corp-gray">{review.guestName || "Misafir"}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                  review.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                }`}>
                  {review.isApproved ? "Yayında" : "Bekliyor"}
                </span>
              </div>

              <div className="flex items-center gap-0.5 text-yellow-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                ))}
              </div>

              <p className="text-sm text-corp-charcoal italic bg-corp-surface/50 p-2.5 rounded-lg border border-corp-border/40">
                "{review.text}"
              </p>

              <div className="flex items-center justify-end gap-1 pt-1 border-t border-corp-border/50">
                {!review.isApproved && (
                  <button 
                    onClick={() => approveReview(review.id)}
                    className="min-h-[38px] px-3 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Check size={14} /> Onayla
                  </button>
                )}
                <button 
                  onClick={() => toast.info("Yanıt özelliği yakında!")}
                  className="min-h-[38px] px-3 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                >
                  <MessageCircle size={14} /> Yanıtla
                </button>
                <button 
                  onClick={() => handleDelete(review.id)}
                  disabled={loading === review.id}
                  className="min-h-[38px] px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 font-semibold transition-colors disabled:opacity-50"
                >
                  {loading === review.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
