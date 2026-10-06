"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Filter, ChevronRight, LifeBuoy, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";

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
  messages: any[];
};

const STATUSES = ["ALL", "open", "in_progress", "resolved", "closed"] as const;
const PRIORITIES = ["ALL", "low", "normal", "high", "urgent"] as const;

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

export default function SupportTicketsClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const filtered = tickets.filter((ticket) => {
    const statusMatch = filterStatus === "ALL" || ticket.status === filterStatus;
    const priorityMatch = filterPriority === "ALL" || ticket.priority === filterPriority;
    const searchMatch =
      !searchQuery ||
      ticket.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && priorityMatch && searchMatch;
  });

  // Sort: open and high priority first
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { open: 0, in_progress: 1, resolved: 2, closed: 3 };
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 99) - (statusOrder[b.status as keyof typeof statusOrder] || 99);
    if (statusDiff !== 0) return statusDiff;
    
    const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 99) - (priorityOrder[b.priority as keyof typeof priorityOrder] || 99);
    if (priorityDiff !== 0) return priorityDiff;
    
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" />
          <input
            type="text"
            placeholder="Müşteri adı, e-posta veya konu ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Tüm Durumlar" : STATUS_META[s]?.label || s}
              </option>
            ))}
          </select>
          
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p === "ALL" ? "Tüm Öncelikler" : PRIORITY_META[p]?.label || p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets table & cards */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Müşteri", "Konu", "Öncelik", "Durum", "Oluşturma", "Son Güncelleme"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                sorted.map((ticket) => {
                  const st = STATUS_META[ticket.status] || { label: ticket.status, color: "#6B7280", icon: null };
                  const pr = PRIORITY_META[ticket.priority] || { label: ticket.priority, color: "#6B7280" };
                  const StatusIcon = st.icon;

                  return (
                    <tr
                      key={ticket.id}
                      onClick={() => router.push(`/admin/customer-portal/support-tickets/${ticket.id}`)}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-body text-[14px] text-corp-charcoal font-semibold">
                            {ticket.user.companyTitle || ticket.user.name || ticket.user.email}
                          </p>
                          <p className="font-body text-[12px] text-corp-gray-light">{ticket.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body text-[13px] text-corp-charcoal">
                        {ticket.subject}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-[11px] font-bold"
                          style={{
                            background: `${pr.color}14`,
                            color: pr.color,
                            border: `1px solid ${pr.color}30`,
                          }}
                        >
                          {pr.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-[11px] font-bold flex items-center gap-1.5 w-fit"
                          style={{
                            background: `${st.color}14`,
                            color: st.color,
                            border: `1px solid ${st.color}30`,
                          }}
                        >
                          {StatusIcon && <StatusIcon size={12} />}
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light whitespace-nowrap">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light whitespace-nowrap">
                        {formatDate(ticket.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-corp-border">
          {sorted.length === 0 ? (
            <div className="p-8 text-center font-body text-[14px] text-corp-gray">
              Kayıt bulunamadı.
            </div>
          ) : (
            sorted.map((ticket) => {
              const st = STATUS_META[ticket.status] || { label: ticket.status, color: "#6B7280", icon: null };
              const pr = PRIORITY_META[ticket.priority] || { label: ticket.priority, color: "#6B7280" };
              const StatusIcon = st.icon;

              return (
                <div
                  key={ticket.id}
                  onClick={() => router.push(`/admin/customer-portal/support-tickets/${ticket.id}`)}
                  className="p-4 space-y-2.5 active:bg-corp-surface/50 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-body text-sm text-corp-charcoal font-bold truncate">
                        {ticket.user.companyTitle || ticket.user.name || ticket.user.email}
                      </p>
                      <p className="font-body text-xs text-corp-gray truncate">{ticket.user.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-2 py-0.5 rounded-full font-body text-[10px] font-bold"
                        style={{
                          background: `${pr.color}14`,
                          color: pr.color,
                          border: `1px solid ${pr.color}30`,
                        }}
                      >
                        {pr.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full font-body text-[10px] font-bold flex items-center gap-1"
                        style={{
                          background: `${st.color}14`,
                          color: st.color,
                          border: `1px solid ${st.color}30`,
                        }}
                      >
                        {StatusIcon && <StatusIcon size={11} />}
                        {st.label}
                      </span>
                    </div>
                  </div>

                  <p className="font-body text-sm text-corp-charcoal font-medium line-clamp-2">
                    {ticket.subject}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-corp-gray pt-1 border-t border-corp-border/50">
                    <span>Oluşturma: {formatDate(ticket.createdAt)}</span>
                    <span>Güncelleme: {formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}