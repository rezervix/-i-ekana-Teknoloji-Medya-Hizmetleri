"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Send, Save, Loader2, User, Mail, Phone, Building2, MessageSquare, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    companyTitle: string | null;
  };
  messages: {
    id: string;
    senderType: string;
    senderName: string;
    message: string;
    createdAt: Date;
  }[];
};

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Açık", color: "#EF4444", icon: AlertCircle },
  in_progress: { label: "İşlemde", color: "#F59E0B", icon: Clock },
  resolved: { label: "Çözüldü", color: "#10B981", icon: CheckCircle2 },
  closed: { label: "Kapalı", color: "#6B7280", icon: XCircle },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "#6B7280" },
  normal: { label: "Normal", color: "#0A4D68" },
  high: { label: "Yüksek", color: "#F59E0B" },
  urgent: { label: "Acil", color: "#EF4444" },
};

export default function SupportTicketDetailClient({ ticket: initialTicket }: { ticket: Ticket }) {
  const [ticket, setTicket] = useState(initialTicket);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updating, setUpdating] = useState(false);
  const router = useRouter();

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/customer-portal/support-tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Mesaj gönderilemedi.");
      }

      setReplyMessage("");
      setTicket((prev) => ({
        ...prev,
        messages: [...prev.messages, data.message],
        updatedAt: new Date(),
      }));
      toast.success("Mesaj gönderildi.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateTicket = async (updates: { status?: string; priority?: string }) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/customer-portal/support-tickets/${ticket.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Güncelleme başarısız.");
      }

      setTicket(data.ticket);
      toast.success("Destek talebi güncellendi.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const st = STATUS_META[ticket.status] || { label: ticket.status, color: "#6B7280", icon: null };
  const pr = PRIORITY_META[ticket.priority] || { label: ticket.priority, color: "#6B7280" };
  const StatusIcon = st.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-corp-surface text-corp-gray transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-corp-charcoal">Destek Talebi Detayı</h1>
          <p className="text-sm text-corp-gray">
            #{ticket.id.slice(-6)} • {formatDate(ticket.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket info */}
          <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl font-bold text-corp-charcoal">{ticket.subject}</h2>
                <p className="text-sm text-corp-gray mt-1">
                  Son güncelleme: {formatDate(ticket.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <span
                  className="px-3 py-1.5 rounded-full font-body text-[12px] font-bold flex items-center gap-1.5"
                  style={{
                    background: `${pr.color}14`,
                    color: pr.color,
                    border: `1px solid ${pr.color}30`,
                  }}
                >
                  {pr.label}
                </span>
                <span
                  className="px-3 py-1.5 rounded-full font-body text-[12px] font-bold flex items-center gap-1.5"
                  style={{
                    background: `${st.color}14`,
                    color: st.color,
                    border: `1px solid ${st.color}30`,
                  }}
                >
                  {StatusIcon && <StatusIcon size={14} />}
                  {st.label}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-corp-border">
              <div>
                <label className="block text-xs font-bold text-corp-gray uppercase tracking-widest mb-2">
                  Durum
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                  disabled={updating}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white disabled:opacity-50"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_META[s]?.label || s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-corp-gray uppercase tracking-widest mb-2">
                  Öncelik
                </label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                  disabled={updating}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white disabled:opacity-50"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {PRIORITY_META[p]?.label || p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-6">
            <h3 className="font-display text-lg font-bold text-corp-charcoal mb-4 flex items-center gap-2">
              <MessageSquare size={18} className="text-corp-teal" />
              Mesaj Geçmişi
            </h3>

            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {ticket.messages.map((msg) => {
                const isAgency = msg.senderType === "agency";
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isAgency ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        isAgency
                          ? "bg-corp-teal text-white"
                          : "bg-corp-surface border border-corp-border text-corp-charcoal"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">{msg.senderName}</span>
                        <span className="text-[10px] opacity-70">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply form */}
            <form onSubmit={handleSendReply} className="mt-6 pt-6 border-t border-corp-border">
              <label className="block text-xs font-bold text-corp-gray uppercase tracking-widest mb-2">
                Yanıt Yaz
              </label>
              <div className="flex gap-3">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Müşteriye yanıtınızı yazın..."
                  rows={3}
                  className="flex-1 px-4 py-3 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Gönder
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-6">
            <h3 className="font-display text-lg font-bold text-corp-charcoal mb-4 flex items-center gap-2">
              <User size={18} className="text-corp-teal" />
              Müşteri Bilgisi
            </h3>

            <div className="space-y-4">
              {ticket.user.companyTitle && (
                <div className="flex items-start gap-3">
                  <Building2 size={16} className="text-corp-gray mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-corp-gray uppercase tracking-widest">Firma</p>
                    <p className="text-sm font-semibold text-corp-charcoal">{ticket.user.companyTitle}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-3">
                <User size={16} className="text-corp-gray mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">İsim</p>
                  <p className="text-sm font-semibold text-corp-charcoal">{ticket.user.name || "Belirtilmedi"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={16} className="text-corp-gray mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">E-posta</p>
                  <a
                    href={`mailto:${ticket.user.email}`}
                    className="text-sm font-semibold text-corp-teal hover:underline"
                  >
                    {ticket.user.email}
                  </a>
                </div>
              </div>

              {ticket.user.phone && (
                <div className="flex items-start gap-3">
                  <Phone size={16} className="text-corp-gray mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-corp-gray uppercase tracking-widest">Telefon</p>
                    <a
                      href={`tel:${ticket.user.phone}`}
                      className="text-sm font-semibold text-corp-teal hover:underline"
                    >
                      {ticket.user.phone}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-corp-border shadow-corp-card p-6">
            <h3 className="font-display text-lg font-bold text-corp-charcoal mb-4">Hızlı İşlemler</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleUpdateTicket({ status: "resolved" })}
                disabled={updating}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border text-sm font-semibold hover:bg-corp-surface transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 size={16} className="text-emerald-600" />
                Çözüldü Olarak İşaretle
              </button>
              <button
                onClick={() => handleUpdateTicket({ status: "closed" })}
                disabled={updating}
                className="w-full px-4 py-2.5 rounded-lg border border-corp-border text-sm font-semibold hover:bg-corp-surface transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <XCircle size={16} className="text-gray-600" />
                Kapat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}