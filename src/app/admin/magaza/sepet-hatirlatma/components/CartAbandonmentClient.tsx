"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Search, Loader2, AlertCircle, Send, Eye,
  CheckCircle2, X, RefreshCw, Calendar, Sparkles, Mail, User
} from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartLog {
  id: string;
  userId: string | null;
  sessionId: string | null;
  email?: string | null;
  customerName?: string | null;
  cartSnapshot?: any; // Prisma alanı: products/items array içerir
  cartData?: any; // eski ad (geriye dönük)
  reminderCount: number;
  emailSentAt: string | null;
  converted: boolean;
  convertedAt: string | null;
  createdAt: string;
}

export default function CartAbandonmentClient() {
  const [logs, setLogs] = useState<CartLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals / details state
  const [selectedLog, setSelectedLog] = useState<CartLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [actionId, setActionId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/cart-abandonment");
      if (!res.ok) throw new Error("Sepet verileri yüklenirken hata oluştu.");
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : []);
    } catch (err: any) {
      setError(err.message || "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendReminder = async (id: string) => {
    setActionId(id);
    setSuccessMsg(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cart-abandonment/${id}/remind`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "E-posta gönderilemedi.");
      setSuccessMsg("Hatırlatma e-postası başarıyla gönderildi.");
      
      // Update local state
      setLogs(prev => prev.map(log => 
        log.id === id 
          ? { ...log, reminderCount: log.reminderCount + 1, emailSentAt: new Date().toISOString() }
          : log
      ));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const filteredLogs = logs.filter(log => {
    const userStr = log.userId || log.sessionId || "misafir";
    return userStr.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-corp-charcoal flex items-center gap-2">
            <ShoppingCart className="text-corp-teal" /> Sepet Hatırlatma & Abandonment
          </h2>
          <p className="text-sm font-body text-corp-gray mt-1">
            Müşterilerinizin sepette bıraktığı ürünleri takip edin, sepet dönüşüm oranını artırmak için hatırlatma e-postaları gönderin.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="p-2 border border-corp-border hover:bg-corp-surface rounded-xl transition-colors text-corp-gray flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Yenile
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2">
          <CheckCircle2 size={18} />
          <span className="text-sm font-semibold text-green-800">{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle size={18} />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-corp-border shadow-sm flex items-center gap-3">
        <Search className="text-corp-gray-light" size={18} />
        <input
          type="text"
          placeholder="Session ID veya Kullanıcı ID ile sepet ara..."
          className="w-full font-body text-sm text-corp-charcoal placeholder-corp-gray-light outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table List */}
      <div className="bg-white rounded-2xl border border-corp-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-corp-gray">
            <Loader2 className="animate-spin text-corp-teal mb-3" size={28} />
            <span>Kayıtlar yükleniyor...</span>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Müşteri / Oturum ID</th>
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Gönderilen Hatırlatma</th>
                    <th className="p-4">Son Gönderim</th>
                    <th className="p-4">Dönüşüm</th>
                    <th className="p-4 text-right pr-6">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-corp-gray font-body">
                        Henüz sepet terk etme kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-corp-surface/30 transition-colors font-body">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-corp-charcoal text-sm truncate max-w-[200px]">
                              {log.userId || "Misafir Kullanıcı"}
                            </span>
                            <span className="text-[10px] text-corp-gray">Session: {log.sessionId}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-corp-gray">
                          {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </td>
                        <td className="p-4 text-sm text-corp-charcoal">
                          {log.reminderCount} kez
                        </td>
                        <td className="p-4 text-xs text-corp-gray">
                          {log.emailSentAt ? new Date(log.emailSentAt).toLocaleString("tr-TR") : "Gönderilmedi"}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            log.converted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}>
                            {log.converted ? "Satın Aldı" : "Sepette Bekliyor"}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedLog(log);
                                setIsDetailOpen(true);
                              }}
                              className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded-lg transition-colors"
                              title="Sepet İçeriğini Gör"
                            >
                              <Eye size={16} />
                            </button>
                            {!log.converted && (
                              <button
                                disabled={actionId === log.id}
                                onClick={() => handleSendReminder(log.id)}
                                className="bg-corp-teal text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-corp-teal-600 disabled:opacity-50 transition-colors"
                              >
                                {actionId === log.id ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <Send size={12} />
                                )}
                                Hatırlat
                              </button>
                            )}
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
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-corp-gray font-body text-sm">
                  Henüz sepet terk etme kaydı bulunamadı.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2.5 font-body">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-semibold text-corp-charcoal text-sm truncate block">
                          {log.userId || "Misafir Kullanıcı"}
                        </span>
                        <span className="text-[10px] text-corp-gray font-mono truncate block">
                          Session: {log.sessionId}
                        </span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        log.converted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {log.converted ? "Satın Aldı" : "Sepette Bekliyor"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-corp-gray">
                      <span>Hatırlatma: {log.reminderCount} kez</span>
                      <span>{new Date(log.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-corp-border/50">
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setIsDetailOpen(true);
                        }}
                        className="min-h-[38px] px-3 text-xs text-corp-teal bg-corp-teal/10 hover:bg-corp-teal/20 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                      >
                        <Eye size={14} /> İçerik
                      </button>
                      {!log.converted && (
                        <button
                          disabled={actionId === log.id}
                          onClick={() => handleSendReminder(log.id)}
                          className="min-h-[38px] bg-corp-teal text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-corp-teal-600 disabled:opacity-50 transition-colors"
                        >
                          {actionId === log.id ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <Send size={12} />
                          )}
                          Hatırlat
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal - Details */}
      {isDetailOpen && selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-corp-border max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-luxury max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg font-bold text-corp-charcoal">Terk Edilmiş Sepet İçeriği</h3>
                <p className="text-xs text-corp-gray font-body truncate max-w-xs">Session: {selectedLog.sessionId}</p>
              </div>
              <button 
                onClick={() => { setIsDetailOpen(false); setSelectedLog(null); }}
                className="p-2 rounded-lg hover:bg-corp-surface text-corp-gray min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart products list */}
            <div className="border border-corp-border rounded-xl p-3 bg-corp-surface space-y-3 font-body">
              <h4 className="text-xs font-bold text-corp-charcoal uppercase tracking-wider">Sepetteki Ürünler</h4>
              <div className="divide-y divide-corp-border max-h-60 overflow-y-auto">
                {(() => {
                  try {
                    const raw = selectedLog.cartSnapshot ?? selectedLog.cartData;
                    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
                    
                    const items: CartItem[] = data?.items || data?.products || [];
                    if (items.length === 0) {
                      return <p className="text-xs text-corp-gray py-2">Sepet içeriği boş veya okunamadı.</p>;
                    }
                    return items.map((item, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-corp-border rounded flex items-center justify-center">
                            <ShoppingCart size={14} className="text-corp-gray" />
                          </div>
                          <div>
                            <p className="font-semibold text-corp-charcoal">{item.name}</p>
                            <p className="text-[10px] text-corp-gray">Adet: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-corp-teal">₺{(item.price * item.quantity).toLocaleString("tr-TR")}</p>
                      </div>
                    ));
                  } catch (e) {
                    return <p className="text-xs text-corp-gray py-2">Sepet verisi çözümlenemedi.</p>;
                  }
                })()}
              </div>
            </div>

            {/* Log Metadata */}
            <div className="bg-corp-surface rounded-xl p-4 text-xs font-body text-corp-gray space-y-2 border border-corp-border">
              <div className="flex justify-between">
                <span>Oluşturulma Tarihi:</span>
                <span className="font-semibold text-corp-charcoal">{new Date(selectedLog.createdAt).toLocaleString("tr-TR")}</span>
              </div>
              <div className="flex justify-between">
                <span>Gönderilen E-posta Sayısı:</span>
                <span className="font-semibold text-corp-charcoal">{selectedLog.reminderCount} kez</span>
              </div>
              <div className="flex justify-between">
                <span>Son Hatırlatma Zamanı:</span>
                <span className="font-semibold text-corp-charcoal">
                  {selectedLog.emailSentAt ? new Date(selectedLog.emailSentAt).toLocaleString("tr-TR") : "Gönderilmedi"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dönüşüm Durumu:</span>
                <span className={`font-semibold ${selectedLog.converted ? "text-green-600" : "text-gray-500"}`}>
                  {selectedLog.converted ? "Tamamlandı (Satın Alındı)" : "Bekliyor"}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsDetailOpen(false); setSelectedLog(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors font-semibold text-sm"
              >
                Kapat
              </button>
              {!selectedLog.converted && (
                <button
                  disabled={actionId === selectedLog.id}
                  onClick={() => {
                    handleSendReminder(selectedLog.id);
                    setIsDetailOpen(false);
                    setSelectedLog(null);
                  }}
                  className="flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionId === selectedLog.id ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  Hatırlatma Gönder
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
