"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, Search, Loader2, AlertCircle, Plus, Edit, Trash2, 
  CheckCircle2, X, Eye, FileSignature, Landmark, Clock
} from "lucide-react";

interface QuoteItem {
  id: string;
  service: string;
  description: string | null;
  price: number;
  quantity: number;
}

interface Quote {
  id: string;
  companyName: string;
  email: string;
  terms: string | null;
  validUntil: string | null;
  status: "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED";
  pdfUrl: string | null;
  sentAt: string | null;
  createdAt: string;
  items: QuoteItem[];
}

export default function QuotesClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals state
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  
  // Form states
  const [statusVal, setStatusVal] = useState<string>("");
  const [notesVal, setNotesVal] = useState<string>("");
  
  // Create quote form state
  const [createForm, setCreateForm] = useState({
    companyName: "",
    email: "",
    terms: "",
    validUntil: "",
    items: [{ service: "", description: "", price: 0, quantity: 1 }]
  });
  
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/quotes");
      if (!res.ok) throw new Error("Teklifler yüklenirken hata oluştu.");
      const data = await res.json();
      setQuotes(data);
    } catch (err: any) {
      setError(err.message || "Hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleUpdateStatusAndNotes = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusVal, notes: notesVal }),
      });
      if (!res.ok) throw new Error("Teklif güncellenemedi.");
      setSuccessMsg("Teklif başarıyla güncellendi.");
      setIsDetailOpen(false);
      setSelectedQuote(null);
      fetchQuotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (!confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Teklif silinemedi.");
      setSuccessMsg("Teklif silindi.");
      fetchQuotes();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) throw new Error("Teklif oluşturulamadı.");
      setSuccessMsg("Teklif başarıyla oluşturuldu.");
      setIsCreateOpen(false);
      setCreateForm({
        companyName: "",
        email: "",
        terms: "",
        validUntil: "",
        items: [{ service: "", description: "", price: 0, quantity: 1 }]
      });
      fetchQuotes();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredQuotes = quotes.filter(q => 
    q.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-corp-charcoal flex items-center gap-2">
            <FileText className="text-corp-teal" /> Teklif Yönetimi
          </h2>
          <p className="text-sm font-body text-corp-gray mt-1">
            Müşterileriniz için teklifler hazırlayın, durumlarını (DRAFT, SENT, ACCEPTED, DECLINED) takip edin ve detaylarını güncelleyin.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-colors shadow-sm text-sm"
        >
          <Plus size={16} /> Yeni Teklif Oluştur
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
          placeholder="Firma adı veya e-posta ile teklif ara..."
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
            <span>Teklifler yükleniyor...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-4 pl-6">Müşteri / Firma</th>
                  <th className="p-4">Son Geçerlilik</th>
                  <th className="p-4">Durum</th>
                  <th className="p-4">Tutar</th>
                  <th className="p-4 text-right pr-6">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corp-border">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-corp-gray font-body">
                      Kayıtlı teklif bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((q) => {
                    const total = q.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                    return (
                      <tr key={q.id} className="hover:bg-corp-surface/30 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="flex flex-col font-body">
                            <span className="font-semibold text-corp-charcoal text-sm">{q.companyName}</span>
                            <span className="text-xs text-corp-gray">{q.email}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-corp-gray font-body">
                          {q.validUntil ? new Date(q.validUntil).toLocaleDateString("tr-TR") : "Belirtilmemiş"}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            q.status === "ACCEPTED" ? "bg-green-100 text-green-700" :
                            q.status === "DECLINED" ? "bg-red-100 text-red-700" :
                            q.status === "SENT" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {q.status === "ACCEPTED" ? "Onaylandı" :
                             q.status === "DECLINED" ? "Reddedildi" :
                             q.status === "SENT" ? "Gönderildi" : "Taslak"}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-sm text-corp-charcoal font-body">
                          ₺{total.toLocaleString("tr-TR")}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedQuote(q);
                                setStatusVal(q.status);
                                setNotesVal(q.terms || "");
                                setIsDetailOpen(true);
                              }}
                              className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded-lg transition-colors"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteQuote(q.id)}
                              className="p-2 text-corp-gray hover:text-error hover:bg-error/5 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
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
        )}
      </div>

      {/* Modal - Detail & Edit Quote Status */}
      {isDetailOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-corp-border max-w-2xl w-full p-6 space-y-4 shadow-luxury animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg font-bold text-corp-charcoal">{selectedQuote.companyName} - Teklif Detayı</h3>
                <p className="text-xs text-corp-gray font-body">{selectedQuote.email}</p>
              </div>
              <button 
                onClick={() => { setIsDetailOpen(false); setSelectedQuote(null); }}
                className="p-1 rounded-lg hover:bg-corp-surface text-corp-gray"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items table */}
            <div className="border border-corp-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm font-body">
                <thead className="bg-corp-surface text-corp-gray text-xs">
                  <tr>
                    <th className="p-3">Hizmet</th>
                    <th className="p-3">Açıklama</th>
                    <th className="p-3 text-right">Adet</th>
                    <th className="p-3 text-right">Fiyat</th>
                    <th className="p-3 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {selectedQuote.items.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3 font-semibold text-corp-charcoal">{item.service}</td>
                      <td className="p-3 text-corp-gray text-xs">{item.description || "-"}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">₺{item.price.toLocaleString("tr-TR")}</td>
                      <td className="p-3 text-right font-semibold">₺{(item.price * item.quantity).toLocaleString("tr-TR")}</td>
                    </tr>
                  ))}
                  <tr className="bg-corp-surface/50 font-semibold">
                    <td colSpan={4} className="p-3 text-right text-corp-gray">Genel Toplam:</td>
                    <td className="p-3 text-right text-corp-teal">
                      ₺{selectedQuote.items.reduce((acc, i) => acc + (i.price * i.quantity), 0).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Teklif Durumu</label>
                <select
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal"
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                >
                  <option value="DRAFT">Taslak (DRAFT)</option>
                  <option value="SENT">Gönderildi (SENT)</option>
                  <option value="ACCEPTED">Onaylandı (ACCEPTED)</option>
                  <option value="DECLINED">Reddedildi (DECLINED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Şartlar / Özel Notlar</label>
                <textarea
                  className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal h-24 resize-none"
                  value={notesVal}
                  onChange={(e) => setNotesVal(e.target.value)}
                  placeholder="Teklif şartları, ödeme planı veya teslim süresi..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsDetailOpen(false); setSelectedQuote(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors font-semibold text-sm"
              >
                Kapat
              </button>
              <button
                onClick={() => handleUpdateStatusAndNotes(selectedQuote.id)}
                disabled={actionLoading}
                className="flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="animate-spin" size={16} />} Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Create Quote */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-corp-border max-w-2xl w-full p-6 space-y-4 shadow-luxury animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-start">
              <h3 className="font-display text-lg font-bold text-corp-charcoal">Yeni Teklif Oluştur</h3>
              <button onClick={() => setIsCreateOpen(false)} className="p-1 rounded-lg hover:bg-corp-surface text-corp-gray">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Müşteri / Firma Adı</label>
                  <input
                    type="text"
                    required
                    placeholder="ABC Pazarlama Ltd."
                    className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal"
                    value={createForm.companyName}
                    onChange={(e) => setCreateForm({...createForm, companyName: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">E-Posta</label>
                  <input
                    type="email"
                    required
                    placeholder="iletisim@abcpazarlama.com"
                    className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Son Geçerlilik Tarihi</label>
                  <input
                    type="date"
                    required
                    className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal"
                    value={createForm.validUntil}
                    onChange={(e) => setCreateForm({...createForm, validUntil: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-gray uppercase mb-1">Şartlar / Koşullar</label>
                  <input
                    type="text"
                    placeholder="Ödeme: %50 peşin, %50 teslimatta."
                    className="w-full bg-white border border-corp-border rounded-xl px-4 py-2.5 font-body text-sm outline-none focus:border-corp-teal"
                    value={createForm.terms}
                    onChange={(e) => setCreateForm({...createForm, terms: e.target.value})}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-corp-charcoal uppercase tracking-wider">Teklif Kalemleri</h4>
                  <button
                    type="button"
                    onClick={() => setCreateForm({
                      ...createForm,
                      items: [...createForm.items, { service: "", description: "", price: 0, quantity: 1 }]
                    })}
                    className="text-xs text-corp-teal font-semibold hover:underline"
                  >
                    + Kalem Ekle
                  </button>
                </div>

                {createForm.items.map((item, idx) => (
                  <div key={idx} className="p-4 bg-corp-surface rounded-xl border border-corp-border space-y-3 relative">
                    {createForm.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const list = [...createForm.items];
                          list.splice(idx, 1);
                          setCreateForm({...createForm, items: list});
                        }}
                        className="absolute top-2 right-2 text-corp-gray hover:text-error text-xs"
                      >
                        Sil
                      </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-corp-gray uppercase mb-1">Hizmet / Ürün</label>
                        <input
                          type="text"
                          required
                          placeholder="Web Geliştirme, Sosyal Medya..."
                          className="w-full bg-white border border-corp-border rounded-lg px-3 py-2 font-body text-xs outline-none focus:border-corp-teal"
                          value={item.service}
                          onChange={(e) => {
                            const list = [...createForm.items];
                            list[idx].service = e.target.value;
                            setCreateForm({...createForm, items: list});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-corp-gray uppercase mb-1">Açıklama</label>
                        <input
                          type="text"
                          placeholder="Kısa hizmet detayı"
                          className="w-full bg-white border border-corp-border rounded-lg px-3 py-2 font-body text-xs outline-none focus:border-corp-teal"
                          value={item.description}
                          onChange={(e) => {
                            const list = [...createForm.items];
                            list[idx].description = e.target.value;
                            setCreateForm({...createForm, items: list});
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-corp-gray uppercase mb-1">Birim Fiyat (TL)</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-white border border-corp-border rounded-lg px-3 py-2 font-body text-xs outline-none focus:border-corp-teal"
                          value={item.price}
                          onChange={(e) => {
                            const list = [...createForm.items];
                            list[idx].price = parseFloat(e.target.value) || 0;
                            setCreateForm({...createForm, items: list});
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-corp-gray uppercase mb-1">Adet</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-white border border-corp-border rounded-lg px-3 py-2 font-body text-xs outline-none focus:border-corp-teal"
                          value={item.quantity}
                          onChange={(e) => {
                            const list = [...createForm.items];
                            list[idx].quantity = parseInt(e.target.value) || 1;
                            setCreateForm({...createForm, items: list});
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border text-corp-charcoal hover:bg-corp-surface transition-colors font-semibold text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 bg-corp-teal text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-corp-teal-600 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {actionLoading && <Loader2 className="animate-spin" size={16} />} Teklifi Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
