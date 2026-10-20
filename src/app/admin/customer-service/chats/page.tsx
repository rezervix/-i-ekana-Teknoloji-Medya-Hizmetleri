"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Phone,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  Loader2,
  Filter,
  RefreshCw,
  Tag,
  ShieldAlert,
} from "lucide-react";

interface ConversationItem {
  id: string;
  sessionId: string;
  title: string | null;
  status: "ACTIVE" | "HANDED_OVER" | "CLOSED" | "RESOLVED";
  handoverStatus: "NONE" | "REQUESTED" | "PENDING_CONTACT" | "CONTACTED" | "RESOLVED" | "CANCELLED";
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  assignedTo: string | null;
  pageUrl: string | null;
  productId: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  hasHandoverLead: boolean;
  handoverLeadStatus: string | null;
  createdAt: string;
}

interface MessageDetail {
  id: string;
  senderType: "VISITOR" | "BOT" | "AGENT" | "SYSTEM";
  senderName: string | null;
  content: string;
  isHandoverPrompt: boolean;
  tokensUsed: number | null;
  usedDocumentIds: string[];
  evidenceConfidence: number | null;
  createdAt: string;
}

interface HandoverDetail {
  id: string;
  customerPhone: string;
  customerName: string | null;
  customerEmail: string | null;
  unansweredQuestion: string;
  handoverReason: string;
  status: "NEW" | "IN_REVIEW" | "CONTACTED" | "RESOLVED" | "CLOSED";
  agentNotes: string | null;
  assignedAgent: string | null;
  contactedAt: string | null;
  createdAt: string;
}

export default function AdminChatsPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<MessageDetail[]>([]);
  const [handovers, setHandovers] = useState<HandoverDetail[]>([]);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [handoverFilter, setHandoverFilter] = useState("ALL");

  // Agent reply
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Status & Note update
  const [savingNotes, setSavingNotes] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [convStatus, setConvStatus] = useState("ACTIVE");
  const [assignedAgent, setAssignedAgent] = useState("");

  const loadConversations = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter !== "ALL") q.set("status", statusFilter);
      if (handoverFilter !== "ALL") q.set("handoverStatus", handoverFilter);

      const res = await fetch(`/api/admin/customer-service/chats?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setConversations(data.conversations);
        if (data.conversations.length > 0 && !selectedId) {
          setSelectedId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Load conversations error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [statusFilter, handoverFilter]);

  // Load selected conversation detail
  useEffect(() => {
    if (!selectedId) return;

    setDetailLoading(true);
    fetch(`/api/admin/customer-service/chats/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.conversation) {
          setActiveConv(data.conversation);
          setMessages(data.conversation.messages || []);
          setHandovers(data.conversation.handovers || []);
          setInternalNotes(data.conversation.internalNotes || "");
          setConvStatus(data.conversation.status);
          setAssignedAgent(data.conversation.assignedTo || "");
        }
      })
      .catch((err) => console.error("Detail error:", err))
      .finally(() => setDetailLoading(false));

    // Auto-refresh messages every 8 seconds for real-time representative experience
    const interval = setInterval(() => {
      fetch(`/api/admin/customer-service/chats/${selectedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.conversation) {
            setMessages(data.conversation.messages || []);
            setHandovers(data.conversation.handovers || []);
          }
        })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, [selectedId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply || !selectedId) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/customer-service/chats/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => [...prev, data.message]);
        setReplyText("");
      }
    } catch (err) {
      console.error("Send reply error:", err);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatusAndNotes = async () => {
    if (!selectedId || savingNotes) return;

    setSavingNotes(true);
    try {
      const res = await fetch(`/api/admin/customer-service/chats/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: convStatus,
          internalNotes,
          assignedTo: assignedAgent,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setActiveConv((prev: any) => ({
          ...prev,
          status: convStatus,
          internalNotes,
          assignedTo: assignedAgent,
        }));
        loadConversations();
      }
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateHandoverStatus = async (handoverId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/customer-service/handovers/${handoverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setHandovers((prev) =>
          prev.map((h) => (h.id === handoverId ? { ...h, status: newStatus as any } : h))
        );
        loadConversations();
      }
    } catch (err) {
      console.error("Handover update error:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-corp-charcoal">
            Müşteri Hizmetleri & Sohbet Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-corp-gray mt-1">
            Ziyaretçi görüşmelerini, AI asistan yanıtlarını ve temsilci yönlendirme taleplerini inceleyin.
          </p>
        </div>

        <button
          onClick={loadConversations}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-corp-border text-corp-charcoal rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-corp-border rounded-2xl shadow-xs overflow-hidden min-h-[700px]">
        {/* Left Column: List & Filters (5 cols) */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-corp-border flex flex-col">
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-corp-border space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-corp-gray absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadConversations()}
                placeholder="Telefon, isim veya mesaj ara..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 text-xs bg-white border border-corp-border rounded-xl px-2.5 py-1.5 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              >
                <option value="ALL">Tüm Durumlar</option>
                <option value="ACTIVE">Aktif</option>
                <option value="HANDED_OVER">Temsilciye Aktarıldı</option>
                <option value="RESOLVED">Sonuçlandırıldı</option>
                <option value="CLOSED">Kapatıldı</option>
              </select>

              <select
                value={handoverFilter}
                onChange={(e) => setHandoverFilter(e.target.value)}
                className="flex-1 text-xs bg-white border border-corp-border rounded-xl px-2.5 py-1.5 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              >
                <option value="ALL">Tüm Talepler</option>
                <option value="PENDING_CONTACT">Aranması Gerekenler</option>
                <option value="CONTACTED">İletişime Geçildi</option>
                <option value="RESOLVED">Talebi Çözülenler</option>
              </select>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-corp-border/60 max-h-[600px] lg:max-h-[calc(100vh-320px)]">
            {loading ? (
              <div className="p-8 text-center text-xs text-corp-gray flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-corp-teal" />
                Görüşmeler yükleniyor...
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-corp-gray">
                Kriterlere uygun görüşme bulunamadı.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = c.id === selectedId;
                const hasPhone = Boolean(c.customerPhone);

                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3.5 transition-colors flex flex-col gap-1.5 ${
                      isSelected ? "bg-corp-teal/10 border-l-4 border-l-corp-teal" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold text-corp-charcoal truncate">
                        {c.customerName || c.customerPhone || "Misafir Ziyaretçi"}
                      </span>
                      <span className="text-[10px] text-corp-gray flex-shrink-0">
                        {new Date(c.lastMessageAt).toLocaleDateString("tr-TR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    {c.lastMessage && (
                      <p className="text-xs text-corp-gray line-clamp-1">
                        {c.lastMessage}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {hasPhone && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          <Phone className="w-2.5 h-2.5" />
                          {c.customerPhone}
                        </span>
                      )}

                      {c.handoverStatus === "PENDING_CONTACT" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                          Arama Bekliyor
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          c.status === "ACTIVE"
                            ? "bg-blue-50 text-blue-700"
                            : c.status === "RESOLVED"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-purple-50 text-purple-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed View & Action Bar (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-full">
          {detailLoading ? (
            <div className="flex-1 flex items-center justify-center p-12 text-xs text-corp-gray gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-corp-teal" />
              Görüşme ayrıntısı yükleniyor...
            </div>
          ) : !activeConv ? (
            <div className="flex-1 flex items-center justify-center p-12 text-xs text-corp-gray">
              Lütfen soldaki listeden bir görüşme seçiniz.
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Header Info */}
              <div className="p-4 border-b border-corp-border bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-sm font-bold text-corp-charcoal">
                      {activeConv.customerName || "Misafir Ziyaretçi"}
                    </h2>
                    {activeConv.customerPhone && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">
                        <Phone className="w-3 h-3" />
                        {activeConv.customerPhone}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-corp-gray mt-0.5">
                    Oturum: {activeConv.sessionId} • Başlangıç:{" "}
                    {new Date(activeConv.createdAt).toLocaleString("tr-TR")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={convStatus}
                    onChange={(e) => setConvStatus(e.target.value)}
                    className="text-xs bg-white border border-corp-border rounded-xl px-2.5 py-1.5 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="HANDED_OVER">Temsilciye Aktarıldı</option>
                    <option value="RESOLVED">Sonuçlandırıldı</option>
                    <option value="CLOSED">Kapatıldı</option>
                  </select>

                  <button
                    onClick={handleUpdateStatusAndNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    {savingNotes ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </div>

              {/* Handover Alert Card (if lead exists) */}
              {handovers.length > 0 && (
                <div className="m-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      İnsan Müşteri Temsilcisi Yönlendirme Talebi
                    </span>
                    <select
                      value={handovers[0].status}
                      onChange={(e) => handleUpdateHandoverStatus(handovers[0].id, e.target.value)}
                      className="text-xs bg-white border border-amber-300 rounded-lg px-2 py-1 font-semibold text-amber-900 focus:outline-none"
                    >
                      <option value="NEW">YENİ</option>
                      <option value="IN_REVIEW">İNCELENİYOR</option>
                      <option value="CONTACTED">MÜŞTERİYLE İLETİŞİME GEÇİLDİ</option>
                      <option value="RESOLVED">SONUÇLANDIRILDI</option>
                      <option value="CLOSED">KAPATILDI</option>
                    </select>
                  </div>

                  <p className="text-xs text-amber-800">
                    <strong className="font-semibold">Cevaplanamayan Soru / Konu:</strong>{" "}
                    {handovers[0].unansweredQuestion}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-amber-700">
                    <span>
                      <strong>Telefon:</strong> {handovers[0].customerPhone}
                    </span>
                    {handovers[0].contactedAt && (
                      <span>
                        <strong>İletişim Tarihi:</strong>{" "}
                        {new Date(handovers[0].contactedAt).toLocaleString("tr-TR")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Message Transcript Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[380px] bg-slate-50/40 border-b border-corp-border">
                {messages.map((m) => {
                  const isVisitor = m.senderType === "VISITOR";
                  const isBot = m.senderType === "BOT";
                  const isAgent = m.senderType === "AGENT";
                  const isSys = m.senderType === "SYSTEM";

                  if (isSys) {
                    return (
                      <div key={m.id} className="text-center my-1.5">
                        <span className="inline-block px-3 py-1 bg-white border border-corp-border text-corp-gray text-[11px] rounded-full">
                          {m.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-corp-gray">
                        <span className="font-bold">
                          {isVisitor
                            ? "Ziyaretçi"
                            : isBot
                            ? "Google Gemini AI"
                            : isAgent
                            ? `Temsilci (${m.senderName || "Admin"})`
                            : "Sistem"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString("tr-TR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isBot && m.evidenceConfidence !== null && (
                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-sm text-[9px] font-mono">
                            Güven: {Math.round((m.evidenceConfidence || 0) * 100)}%
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                          isVisitor
                            ? "bg-white text-corp-charcoal border border-corp-border rounded-tl-xs"
                            : isAgent
                            ? "bg-purple-600 text-white rounded-tr-xs"
                            : "bg-corp-teal text-white rounded-tr-xs"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Internal Notes & Agent Reply Input */}
              <div className="p-4 bg-white space-y-3">
                {/* Agent direct reply to customer chat */}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Müşteriye doğrudan temsilci mesajı gönderin..."
                    className="flex-1 text-xs bg-slate-50 border border-corp-border rounded-xl px-3.5 py-2.5 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || sendingReply}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Yanıtla
                  </button>
                </form>

                {/* Internal Notes Section */}
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Ekibe özel iç not (müşteriye görünmez)..."
                    className="flex-1 text-xs bg-amber-50/50 border border-amber-200 rounded-xl px-3 py-1.5 text-corp-charcoal placeholder:text-amber-800/40 focus:outline-none focus:ring-1 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateStatusAndNotes}
                    disabled={savingNotes}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-corp-charcoal text-xs font-semibold rounded-xl border border-corp-border transition-colors"
                  >
                    Notu Kaydet
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
