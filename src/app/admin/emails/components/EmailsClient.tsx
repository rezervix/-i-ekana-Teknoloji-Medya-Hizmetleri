"use client";

import React, { useState, useEffect } from "react";
import { 
  Mail, Search, Loader2, AlertCircle, Plus, Send, 
  CheckCircle2, X, Eye, FileText, Calendar, ShieldCheck
} from "lucide-react";

interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  templateId: string | null;
  status: string;
  sentAt: string;
}

export default function EmailsClient() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  
  // Form states
  const [sendForm, setSendForm] = useState({
    recipient: "",
    subject: "",
    body: ""
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails");
      if (!res.ok) throw new Error("E-posta logları yüklenirken hata oluştu.");
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      if (!res.ok) throw new Error("E-posta gönderilemedi.");
      setSuccessMsg("E-posta başarıyla gönderildi ve kaydedildi.");
      setIsSendOpen(false);
      setSendForm({ recipient: "", subject: "", body: "" });
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-corp-charcoal flex items-center gap-2">
            <Mail className="text-corp-teal" /> E-Posta Servisi & Logları
          </h2>
          <p className="text-sm font-body text-corp-gray mt-1">
            Gönderilen sistem e-postalarının geçmişini inceleyin veya manuel olarak e-posta gönderin.
          </p>
        </div>
        <button
          onClick={() => setIsSendOpen(true)}
          className="bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors shadow-sm text-sm"
        >
          <Send size={14} /> Yeni E-Posta Gönder
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-2 animate-in fade-in duration-250">
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
          placeholder="Alıcı adresi veya konu ile ara..."
          className="w-full font-body text-sm text-corp-charcoal placeholder-corp-gray-light outline-none"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-corp-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-corp-gray">
            <Loader2 className="animate-spin text-corp-teal mb-3" size={28} />
            <span>E-posta geçmişi yükleniyor...</span>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="p-4 pl-6">Alıcı (Recipient)</th>
                    <th className="p-4">Konu (Subject)</th>
                    <th className="p-4">Tarih</th>
                    <th className="p-4">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-corp-gray font-body">
                        Henüz e-posta gönderim kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-corp-surface/30 transition-colors">
                        <td className="p-4 pl-6 font-semibold text-sm text-corp-charcoal font-body">
                          {log.recipient}
                        </td>
                        <td className="p-4 text-sm text-corp-gray font-body max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="p-4 text-xs text-corp-gray font-body">
                          {new Date(log.sentAt).toLocaleString("tr-TR")}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            log.status === "sent" ? "bg-green-100 text-green-700" :
                            log.status === "delivered" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            <ShieldCheck size={12} />
                            {log.status === "sent" ? "Gönderildi" :
                             log.status === "delivered" ? "Ulaştı" : "Hata"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-corp-border">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-corp-gray font-body text-sm">
                  Henüz e-posta gönderim kaydı bulunamadı.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm text-corp-charcoal font-body truncate">
                        {log.recipient}
                      </p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        log.status === "sent" ? "bg-green-100 text-green-700" :
                        log.status === "delivered" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        <ShieldCheck size={11} />
                        {log.status === "sent" ? "Gönderildi" :
                         log.status === "delivered" ? "Ulaştı" : "Hata"}
                      </span>
                    </div>

                    <p className="text-xs text-corp-gray font-body line-clamp-2">
                      {log.subject}
                    </p>

                    <div className="text-[11px] text-corp-gray font-body pt-1 border-t border-corp-border/50">
                      {new Date(log.sentAt).toLocaleString("tr-TR")}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal - Send Email */}
      {isSendOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl border border-corp-border max-w-lg w-full p-4 sm:p-6 space-y-4 shadow-luxury max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">Yeni E-Posta Gönder</h3>
              <button
                onClick={() => setIsSendOpen(false)}
                className="p-2 rounded-lg hover:bg-corp-surface text-corp-gray min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4 font-body">
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Alıcı E-Posta</label>
                <input
                  type="email"
                  required
                  placeholder="musteri@sirket.com"
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-corp-teal"
                  value={sendForm.recipient}
                  onChange={(e) => setSendForm({...sendForm, recipient: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Konu</label>
                <input
                  type="text"
                  required
                  placeholder="Hizmet Teklifimiz Hk."
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-corp-teal"
                  value={sendForm.subject}
                  onChange={(e) => setSendForm({...sendForm, subject: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">İçerik (HTML veya Metin)</label>
                <textarea
                  required
                  placeholder="Sayın yetkili, talebiniz üzerine hazırladığımız..."
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-corp-teal h-40 resize-none"
                  value={sendForm.body}
                  onChange={(e) => setSendForm({...sendForm, body: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSendOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface font-semibold text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="animate-spin" size={16} />} Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
