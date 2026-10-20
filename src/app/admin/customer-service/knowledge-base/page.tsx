"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Upload,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Play,
  Loader2,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

interface KnowledgeDocItem {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  productId: string | null;
  productType: string | null;
  category: string | null;
  status: "DRAFT" | "PROCESSING" | "ACTIVE" | "DISABLED" | "ERROR";
  statusMessage: string | null;
  version: number;
  uploadedBy: string | null;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminKnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"docs" | "test">("docs");
  const [documents, setDocuments] = useState<KnowledgeDocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Genel");
  const [uploadProductId, setUploadProductId] = useState("");
  const [uploadProductType, setUploadProductType] = useState("general");
  const [uploadDirectText, setUploadDirectText] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test bench state
  const [testQuestion, setTestQuestion] = useState("");
  const [testProductId, setTestProductId] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (statusFilter !== "ALL") q.set("status", statusFilter);

      const res = await fetch(`/api/admin/customer-service/knowledge-base?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Load docs error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);

    try {
      if (uploadFile) {
        const formData = new FormData();
        formData.append("file", uploadFile);
        if (uploadTitle) formData.append("title", uploadTitle);
        formData.append("category", uploadCategory);
        if (uploadProductId) formData.append("productId", uploadProductId);
        formData.append("productType", uploadProductType);
        formData.append("activateImmediately", activateImmediately ? "true" : "false");

        const res = await fetch("/api/admin/customer-service/knowledge-base", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Doküman yüklenemedi.");
        }
      } else if (uploadDirectText.trim()) {
        const res = await fetch("/api/admin/customer-service/knowledge-base", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: uploadTitle || "Doğrulanmış Bilgi Notu",
            content: uploadDirectText,
            fileName: "bilgi-notu.md",
            category: uploadCategory,
            productId: uploadProductId || undefined,
            productType: uploadProductType,
            activateImmediately,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "İçerik kaydedilemedi.");
        }
      } else {
        throw new Error("Lütfen bir dosya seçin veya doğrudan metin girin.");
      }

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDirectText("");
      setUploadTitle("");
      loadDocuments();
    } catch (err: any) {
      setUploadError(err.message || "Yükleme sırasında hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === id ? { ...d, status: nextStatus as any } : d))
        );
      }
    } catch (err) {
      console.error("Toggle status error:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Bu dokümanı ve tüm parçalarını silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleOpenPreview = async (id: string) => {
    setPreviewLoading(true);
    setPreviewDoc(null);
    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/${id}`);
      const data = await res.json();
      if (data.success) {
        setPreviewDoc(data.document);
      }
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuestion.trim() || testRunning) return;

    setTestRunning(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch("/api/admin/customer-service/knowledge-base/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: testQuestion,
          productId: testProductId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Test çalıştırılamadı.");
      }

      setTestResult(data);
    } catch (err: any) {
      setTestError(err.message || "Test sırasında hata oluştu.");
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-corp-charcoal">
            Yapay Zekâ Bilgi Bankası & Doküman Yönetimi
          </h1>
          <p className="text-xs sm:text-sm text-corp-gray mt-1">
            Yüklediğiniz onaylı ürün dokümanları (.md, .txt, .pdf, .docx) Gemini asistanı için tek yetkili bilgi kaynağıdır.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Doküman Ekle
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-corp-border gap-6">
        <button
          onClick={() => setActiveTab("docs")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors relative ${
            activeTab === "docs"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          Doküman Listesi ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors flex items-center gap-1.5 relative ${
            activeTab === "test"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          Bilgi Bankasını Test Et
        </button>
      </div>

      {/* Tab 1: Documents Management */}
      {activeTab === "docs" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-corp-gray absolute left-3 top-3" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadDocuments()}
                placeholder="Doküman adı, dosya veya kategori ara..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="ACTIVE">Aktif (Cevaplarda Kullanılır)</option>
              <option value="DRAFT">Taslak (İncelemede)</option>
              <option value="DISABLED">Devre Dışı</option>
            </select>
          </div>

          {/* Documents Table */}
          <div className="bg-white border border-corp-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-corp-border text-corp-gray font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Doküman / Başlık</th>
                    <th className="px-4 py-3.5">Kategori / Ürün</th>
                    <th className="px-4 py-3.5">Parça Sayısı</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Ekleyen / Tarih</th>
                    <th className="px-4 py-3.5 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-corp-gray">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-corp-teal mb-2" />
                        Dokümanlar yükleniyor...
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-corp-gray">
                        Henüz eklenmiş doküman bulunmuyor. Yeni bir doküman ekleyerek başlayabilirsiniz.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-2.5">
                            <FileText className="w-4 h-4 text-corp-teal mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-corp-charcoal">{doc.title}</p>
                              <p className="text-[11px] text-corp-gray">
                                {doc.fileName} • {(doc.fileSize / 1024).toFixed(1)} KB • v{doc.version}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="inline-block px-2.5 py-0.5 bg-slate-100 rounded-md text-[11px] font-medium text-corp-charcoal">
                            {doc.category || "Genel"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-corp-charcoal">
                          {doc.chunkCount} Parça
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              doc.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800"
                                : doc.status === "DRAFT"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {doc.status === "ACTIVE" && <CheckCircle2 className="w-3 h-3" />}
                            {doc.status === "DRAFT" && <AlertCircle className="w-3 h-3" />}
                            {doc.status === "ACTIVE"
                              ? "Aktif"
                              : doc.status === "DRAFT"
                              ? "İnceleme Bekliyor"
                              : "Devre Dışı"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-corp-gray text-[11px]">
                          <div>{doc.uploadedBy || "Admin"}</div>
                          <div>{new Date(doc.createdAt).toLocaleDateString("tr-TR")}</div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleStatus(doc.id, doc.status)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                doc.status === "ACTIVE"
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {doc.status === "ACTIVE" ? "Devre Dışı Bırak" : "Aktif Et"}
                            </button>

                            <button
                              onClick={() => handleOpenPreview(doc.id)}
                              className="p-1.5 text-corp-gray hover:text-corp-charcoal hover:bg-slate-100 rounded-lg transition-colors"
                              title="İçeriği İncele"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteDoc(doc.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Test Bench ("Bilgi Bankasını Test Et") */}
      {activeTab === "test" && (
        <div className="bg-white border border-corp-border rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold font-display text-corp-charcoal flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Bilgi Bankası Sorgu & Kanıt Yeterliliği Test Tezgahı
            </h2>
            <p className="text-xs text-corp-gray mt-1">
              Örnek bir müşteri sorusu yazarak sistemin hangi onaylı dokümanları getirdiğini, yeterli kanıt bulup bulmadığını ve nasıl cevap vereceğini test edin.
            </p>
          </div>

          <form onSubmit={handleRunTest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                Örnek Müşteri Sorusu:
              </label>
              <textarea
                value={testQuestion}
                onChange={(e) => setTestQuestion(e.target.value)}
                rows={3}
                placeholder="Örn: Midvem WhatsApp Business mesajlarını yönetebiliyor mu? veya Baskı teslimatı kaç gün sürüyor?"
                required
                className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl p-3 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-corp-gray">
                * Yalnızca `AKTİF` durumdaki dokümanlar ve doğrulanmış veri modelleri aranır.
              </span>

              <button
                type="submit"
                disabled={testRunning || !testQuestion.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {testRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Test Ediliyor...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" /> Testi Çalıştır
                  </>
                )}
              </button>
            </div>
          </form>

          {testError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-200">
              {testError}
            </div>
          )}

          {/* Test Results Output */}
          {testResult && (
            <div className="border border-corp-border rounded-xl p-5 bg-slate-50/60 space-y-5 animate-in fade-in duration-300">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  testResult.verification.isSufficient
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                {testResult.verification.isSufficient ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider">
                    {testResult.verification.isSufficient
                      ? "Kanıt Yeterli — Güvenli Yanıt Üretildi"
                      : "Kanıt Yetersiz / Bilgi Eksik — Temsilciye Aktarma Tetiklendi"}
                  </h3>
                  <p className="text-xs">{testResult.verification.reason}</p>
                  <p className="text-[11px] opacity-80">
                    Güven Skoru: %{Math.round((testResult.verification.confidence || 0) * 100)} •{" "}
                    Temsilciye Yönlendirme: {testResult.verification.willHandover ? "EVET" : "HAYIR"}
                  </p>
                </div>
              </div>

              {/* Generated Reply Preview */}
              <div>
                <h4 className="text-xs font-bold text-corp-charcoal mb-1">
                  Müşteriye Gösterilecek Yanıt:
                </h4>
                <div className="p-4 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal leading-relaxed whitespace-pre-wrap">
                  {testResult.generatedReply}
                </div>
              </div>

              {/* Matched Document Chunks */}
              <div>
                <h4 className="text-xs font-bold text-corp-charcoal mb-2">
                  Eşleşen Onaylı Doküman Parçaları ({testResult.matchedDocuments.length}):
                </h4>
                {testResult.matchedDocuments.length === 0 ? (
                  <p className="text-xs text-corp-gray italic">
                    Bu soruyla eşleşen aktif doküman parçası bulunamadı.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {testResult.matchedDocuments.map((m: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white border border-corp-border rounded-lg p-3 text-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-corp-gray mb-1">
                          <span className="font-semibold text-corp-teal">{m.documentTitle}</span>
                          <span>Skor: {m.score}</span>
                        </div>
                        <p className="text-corp-charcoal text-[11px] leading-relaxed">{m.snippet}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matched Products */}
              {testResult.verifiedProducts && testResult.verifiedProducts.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-corp-charcoal mb-1">
                    Eşleşen Doğrulanmış Ürünler & Paketler:
                  </h4>
                  <div className="space-y-1.5">
                    {testResult.verifiedProducts.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white border border-corp-border rounded-lg p-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-corp-charcoal">{p.name}</span>
                          <span className="ml-2 text-corp-teal font-semibold">({p.priceFormatted})</span>
                        </div>
                        <span className="text-[11px] text-corp-gray">{p.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-corp-border pb-3">
              <h3 className="font-display font-bold text-sm text-corp-charcoal">
                Yeni Bilgi Dokümanı Ekle
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-corp-gray hover:text-corp-charcoal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                  Doküman Başlığı (İsteğe bağlı)
                </label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Örn: Midvem WhatsApp Bot Özellikleri ve SSS"
                  className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                    Kategori
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-2.5 py-2 text-corp-charcoal"
                  >
                    <option value="Genel">Genel</option>
                    <option value="Midvem">Midvem AI</option>
                    <option value="Sungur">Sungur AI</option>
                    <option value="Sosyal Medya">Sosyal Medya Danışmanlığı</option>
                    <option value="E-Ticaret & Baskı">E-Ticaret & Baskı</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                    Ürün Türü
                  </label>
                  <select
                    value={uploadProductType}
                    onChange={(e) => setUploadProductType(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-2.5 py-2 text-corp-charcoal"
                  >
                    <option value="general">Genel Kurumsal</option>
                    <option value="plan">SaaS / Otomasyon Planı</option>
                    <option value="product">Mağaza Ürünü</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                  Dosya Yükle (.md, .txt, .pdf, .docx):
                </label>
                <input
                  type="file"
                  accept=".md,.txt,.pdf,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-corp-charcoal file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-corp-teal/10 file:text-corp-teal hover:file:bg-corp-teal/20"
                />
              </div>

              <div className="text-center text-[11px] text-corp-gray font-medium">veya doğrudan metin girin:</div>

              <div>
                <textarea
                  value={uploadDirectText}
                  onChange={(e) => setUploadDirectText(e.target.value)}
                  rows={4}
                  placeholder="Markdown veya düz metin dokümantasyonunu buraya yapıştırabilirsiniz..."
                  className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl p-2.5 text-corp-charcoal placeholder:text-gray-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activateCheck"
                  checked={activateImmediately}
                  onChange={(e) => setActivateImmediately(e.target.checked)}
                  className="w-4 h-4 text-corp-teal rounded-sm"
                />
                <label htmlFor="activateCheck" className="text-xs text-corp-charcoal cursor-pointer">
                  Hemen aktif et (Asistan bu bilgiyi hemen kullanmaya başlasın)
                </label>
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {uploadError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-corp-border text-corp-charcoal rounded-xl text-xs font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={uploading || (!uploadFile && !uploadDirectText.trim())}
                  className="px-4 py-2 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {uploading ? "İşleniyor..." : "Yükle ve İşle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-corp-border pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-corp-charcoal">
                  {previewDoc.title}
                </h3>
                <p className="text-[11px] text-corp-gray">
                  {previewDoc.fileName} • {previewDoc.chunks?.length || 0} Parça
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-corp-gray hover:text-corp-charcoal"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs text-corp-charcoal bg-slate-50 p-4 rounded-xl">
              <div>
                <h4 className="font-bold text-corp-teal mb-1">Temizlenmiş Metin İçeriği:</h4>
                <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                  {previewDoc.cleanContent}
                </p>
              </div>

              <div className="pt-3 border-t border-corp-border">
                <h4 className="font-bold text-corp-teal mb-2">Arama İndeksi Parçaları:</h4>
                <div className="space-y-2">
                  {previewDoc.chunks?.map((c: any) => (
                    <div key={c.id} className="bg-white p-2.5 rounded-lg border border-corp-border">
                      <div className="font-mono text-[10px] text-corp-gray mb-1">
                        Parça #{c.chunkIndex + 1} • Anahtar Kelimeler: {c.keywords?.slice(0, 8).join(", ")}
                      </div>
                      <p className="text-[11px] text-corp-charcoal leading-relaxed">{c.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-corp-charcoal text-xs font-semibold rounded-xl"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
