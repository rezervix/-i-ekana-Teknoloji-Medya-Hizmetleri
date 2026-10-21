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
  MessageCircleQuestion,
  Layers,
  Edit,
  Tag,
  Clock,
  ArrowRight,
  ExternalLink,
  Cpu,
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

interface KnowledgeQAItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  productId: string | null;
  variations: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UnansweredLogItem {
  id: string;
  question: string;
  conversationId: string | null;
  matchedScore: number | null;
  candidateDocId: string | null;
  confidence: number | null;
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "IGNORED";
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminKnowledgeBasePage() {
  const [activeTab, setActiveTab] = useState<"docs" | "qas" | "unanswered" | "test">("docs");

  // Documents state
  const [documents, setDocuments] = useState<KnowledgeDocItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docSearch, setDocSearch] = useState("");
  const [docStatusFilter, setDocStatusFilter] = useState("ALL");

  // Q&A state
  const [qas, setQas] = useState<KnowledgeQAItem[]>([]);
  const [qasLoading, setQasLoading] = useState(false);
  const [qaSearch, setQaSearch] = useState("");
  const [qaCategoryFilter, setQaCategoryFilter] = useState("ALL");

  // Unanswered logs state
  const [unansweredLogs, setUnansweredLogs] = useState<UnansweredLogItem[]>([]);
  const [unansweredCounts, setUnansweredCounts] = useState<Record<string, number>>({});
  const [unansweredLoading, setUnansweredLoading] = useState(false);
  const [unansweredStatusFilter, setUnansweredStatusFilter] = useState("ALL");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Genel");
  const [uploadProductId, setUploadProductId] = useState("");
  const [uploadProductType, setUploadProductType] = useState("general");
  const [uploadDirectText, setUploadDirectText] = useState("");
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Q&A modal state (Create / Edit)
  const [showQAModal, setShowQAModal] = useState(false);
  const [qaEditId, setQaEditId] = useState<string | null>(null);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaCategory, setQaCategory] = useState("Genel");
  const [qaProductId, setQaProductId] = useState("");
  const [qaVariations, setQaVariations] = useState<string[]>([]);
  const [newVariationInput, setNewVariationInput] = useState("");
  const [qaSaving, setQaSaving] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Test bench state
  const [testQuestion, setTestQuestion] = useState("");
  const [testProductId, setTestProductId] = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Re-index state
  const [reindexing, setReindexing] = useState(false);
  const [reindexMessage, setReindexMessage] = useState<string | null>(null);

  // Evaluation & Metrics state
  const [evalStats, setEvalStats] = useState<any | null>(null);
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]);
  const [selectedVerdict, setSelectedVerdict] = useState<string>("CORRECT");
  const [evalAdminNotes, setEvalAdminNotes] = useState<string>("");
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalSuccessMsg, setEvalSuccessMsg] = useState<string | null>(null);
  const [addVariationLoading, setAddVariationLoading] = useState(false);
  const [addVariationMsg, setAddVariationMsg] = useState<string | null>(null);

  // Load Documents
  const loadDocuments = async () => {
    setDocsLoading(true);
    try {
      const q = new URLSearchParams();
      if (docSearch) q.set("search", docSearch);
      if (docStatusFilter !== "ALL") q.set("status", docStatusFilter);

      const res = await fetch(`/api/admin/customer-service/knowledge-base?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error("Load docs error:", err);
    } finally {
      setDocsLoading(false);
    }
  };

  // Load Q&As
  const loadQAs = async () => {
    setQasLoading(true);
    try {
      const q = new URLSearchParams();
      if (qaSearch) q.set("search", qaSearch);
      if (qaCategoryFilter !== "ALL") q.set("category", qaCategoryFilter);

      const res = await fetch(`/api/admin/customer-service/knowledge-base/qa?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setQas(data.qas);
      }
    } catch (err) {
      console.error("Load QAs error:", err);
    } finally {
      setQasLoading(false);
    }
  };

  // Load Unanswered logs
  const loadUnansweredLogs = async () => {
    setUnansweredLoading(true);
    try {
      const q = new URLSearchParams();
      if (unansweredStatusFilter !== "ALL") q.set("status", unansweredStatusFilter);

      const res = await fetch(`/api/admin/customer-service/knowledge-base/unanswered?${q.toString()}`);
      const data = await res.json();
      if (data.success) {
        setUnansweredLogs(data.logs);
        setUnansweredCounts(data.statusCounts || {});
      }
    } catch (err) {
      console.error("Load unanswered error:", err);
    } finally {
      setUnansweredLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "docs") loadDocuments();
    if (activeTab === "qas") loadQAs();
    if (activeTab === "unanswered") loadUnansweredLogs();
    if (activeTab === "test") loadEvaluations();
  }, [activeTab, docStatusFilter, qaCategoryFilter, unansweredStatusFilter]);

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

  const handleToggleDocStatus = async (id: string, currentStatus: string) => {
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
    if (!confirm("Bu dokümanı ve tüm indeks parçalarını silmek istediğinize emin misiniz?")) return;

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

  // Q&A Handlers
  const handleOpenCreateQA = (presetQuestion?: string) => {
    setQaEditId(null);
    setQaQuestion(presetQuestion || "");
    setQaAnswer("");
    setQaCategory("Genel");
    setQaProductId("");
    setQaVariations([]);
    setNewVariationInput("");
    setQaError(null);
    setShowQAModal(true);
  };

  const handleOpenEditQA = (item: KnowledgeQAItem) => {
    setQaEditId(item.id);
    setQaQuestion(item.question);
    setQaAnswer(item.answer);
    setQaCategory(item.category || "Genel");
    setQaProductId(item.productId || "");
    setQaVariations(item.variations || []);
    setNewVariationInput("");
    setQaError(null);
    setShowQAModal(true);
  };

  const handleAddVariation = () => {
    const trimmed = newVariationInput.trim();
    if (trimmed && !qaVariations.includes(trimmed)) {
      setQaVariations([...qaVariations, trimmed]);
      setNewVariationInput("");
    }
  };

  const handleRemoveVariation = (indexToRemove: number) => {
    setQaVariations(qaVariations.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuestion.trim() || !qaAnswer.trim() || qaSaving) return;

    setQaSaving(true);
    setQaError(null);

    try {
      const url = qaEditId
        ? `/api/admin/customer-service/knowledge-base/qa/${qaEditId}`
        : `/api/admin/customer-service/knowledge-base/qa`;
      const method = qaEditId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: qaQuestion,
          answer: qaAnswer,
          category: qaCategory,
          productId: qaProductId || undefined,
          variations: qaVariations,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Soru-cevap kaydedilemedi.");
      }

      setShowQAModal(false);
      loadQAs();
    } catch (err: any) {
      setQaError(err.message || "Kaydetme sırasında bir hata oluştu.");
    } finally {
      setQaSaving(false);
    }
  };

  const handleDeleteQA = async (id: string) => {
    if (!confirm("Bu soru-cevap kaydını silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/qa/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setQas((prev) => prev.filter((q) => q.id !== id));
      }
    } catch (err) {
      console.error("Delete QA error:", err);
    }
  };

  const handleToggleQAActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/qa/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) {
        setQas((prev) =>
          prev.map((q) => (q.id === id ? { ...q, isActive: !currentActive } : q))
        );
      }
    } catch (err) {
      console.error("Toggle QA active error:", err);
    }
  };

  // Unanswered logs handlers
  const handleUpdateLogStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/unanswered`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setUnansweredLogs((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: newStatus as any } : l))
        );
      }
    } catch (err) {
      console.error("Update log status error:", err);
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customer-service/knowledge-base/unanswered?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setUnansweredLogs((prev) => prev.filter((l) => l.id !== id));
      }
    } catch (err) {
      console.error("Delete log error:", err);
    }
  };

  // Re-index cache handler
  const handleReindex = async () => {
    setReindexing(true);
    setReindexMessage(null);
    try {
      const res = await fetch("/api/admin/customer-service/knowledge-base/reindex", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setReindexMessage(
          `İndeks yenilendi: ${data.stats.activeDocuments} Aktif Doküman (${data.stats.activeChunks} Parça), ${data.stats.activeQAs} Soru-Cevap hazır.`
        );
        setTimeout(() => setReindexMessage(null), 5000);
      }
    } catch (err) {
      console.error("Reindex error:", err);
    } finally {
      setReindexing(false);
    }
  };

  // Test bench handler
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

  // Load evaluations history & stats
  const loadEvaluations = async () => {
    try {
      const res = await fetch("/api/admin/customer-service/knowledge-base/test/evaluate");
      const data = await res.json();
      if (data.success) {
        setEvalStats(data.stats);
        setEvaluationsList(data.evaluations || []);
      }
    } catch (err) {
      console.error("Load evaluations error:", err);
    }
  };

  // Save admin evaluation
  const handleSaveEvaluation = async (verdict: string) => {
    if (!testResult) return;
    setEvalSaving(true);
    setEvalSuccessMsg(null);
    try {
      const res = await fetch("/api/admin/customer-service/knowledge-base/test/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: testResult.question,
          normalizedQuery: testResult.normalizedQuery,
          detectedIntent: testResult.detectedIntent,
          answer: testResult.generatedReply,
          verdict,
          adminNotes: evalAdminNotes,
          confidence: testResult.verification?.confidence,
          confidenceLevel: testResult.verification?.confidenceLevel,
          latencyMs: testResult.latencyMs,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVerdict(verdict);
        setEvalSuccessMsg("Değerlendirmeniz başarıyla kaydedildi.");
        loadEvaluations();
        setTimeout(() => setEvalSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error("Save evaluation error:", err);
    } finally {
      setEvalSaving(false);
    }
  };

  // Add tested question directly as a variation to the matched QA
  const handleAddVariationFromTest = async (qaId: string) => {
    if (!testResult?.question) return;
    setAddVariationLoading(true);
    setAddVariationMsg(null);
    try {
      const getRes = await fetch(`/api/admin/customer-service/knowledge-base/qa/${qaId}`);
      const getData = await getRes.json();
      if (!getData.success || !getData.qa) throw new Error("Soru-cevap kaydı bulunamadı.");

      const existingVariations = Array.isArray(getData.qa.variations) ? getData.qa.variations : [];
      if (!existingVariations.includes(testResult.question)) {
        existingVariations.push(testResult.question);
        const updateRes = await fetch(`/api/admin/customer-service/knowledge-base/qa/${qaId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variations: existingVariations }),
        });
        const updateData = await updateRes.json();
        if (!updateData.success) throw new Error("Varyasyon eklenemedi.");
        setAddVariationMsg(`"${testResult.question}" başarıyla bu kaydın alternatif soru varyasyonlarına eklendi!`);
        loadQAs();
        setTimeout(() => setAddVariationMsg(null), 5000);
      } else {
        setAddVariationMsg("Bu soru zaten varyasyonlar arasında mevcut.");
        setTimeout(() => setAddVariationMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || "Varyasyon eklenirken hata oluştu.");
    } finally {
      setAddVariationLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-corp-charcoal">
              Müşteri Hizmetleri & Bilgi Bankası Motoru
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Cpu className="w-3 h-3 text-emerald-600" />
              100% Yerel & Deterministik
            </span>
          </div>
          <p className="text-xs sm:text-sm text-corp-gray mt-1">
            Harici yapay zekâ API'lerine ihtiyaç duymadan, onaylı dokümanlar, SSS varyasyonları ve ürün verileri üzerinden anlık ve güvenli yanıt üretir.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-corp-charcoal rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Arama indeksini ve bellek önbelleğini yeniler"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reindexing ? "animate-spin" : ""}`} />
            {reindexing ? "Yenileniyor..." : "İndeksi Yenile"}
          </button>

          {activeTab === "docs" ? (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Doküman Ekle
            </button>
          ) : activeTab === "qas" ? (
            <button
              onClick={() => handleOpenCreateQA()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Soru-Cevap Ekle
            </button>
          ) : null}
        </div>
      </div>

      {/* Global Toast Message */}
      {reindexMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          {reindexMessage}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-corp-border gap-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("docs")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap relative ${
            activeTab === "docs"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          Onaylı Dokümanlar ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab("qas")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap flex items-center gap-1.5 relative ${
            activeTab === "qas"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          <Layers className="w-4 h-4 text-corp-teal" />
          Soru-Cevap & Varyasyonlar ({qas.length})
        </button>

        <button
          onClick={() => setActiveTab("unanswered")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap flex items-center gap-1.5 relative ${
            activeTab === "unanswered"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          <MessageCircleQuestion className="w-4 h-4 text-amber-500" />
          Yanıtsız Sorular Havuzu
          {unansweredCounts.PENDING ? (
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
              {unansweredCounts.PENDING}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveTab("test")}
          className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide transition-colors whitespace-nowrap flex items-center gap-1.5 relative ${
            activeTab === "test"
              ? "text-corp-teal border-b-2 border-corp-teal font-display"
              : "text-corp-gray hover:text-corp-charcoal"
          }`}
        >
          <Sparkles className="w-4 h-4 text-corp-teal" />
          Bilgi Bankasını Test Et
        </button>
      </div>

      {/* Tab 1: Documents Management */}
      {activeTab === "docs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-corp-gray absolute left-3 top-3" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadDocuments()}
                placeholder="Doküman adı, dosya veya kategori ara..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              />
            </div>

            <select
              value={docStatusFilter}
              onChange={(e) => setDocStatusFilter(e.target.value)}
              className="text-xs bg-white border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
            >
              <option value="ALL">Tüm Durumlar</option>
              <option value="ACTIVE">Aktif (Cevaplarda Kullanılır)</option>
              <option value="DRAFT">Taslak (İncelemede)</option>
              <option value="DISABLED">Devre Dışı</option>
            </select>
          </div>

          <div className="bg-white border border-corp-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-corp-border text-corp-gray font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Doküman / Başlık</th>
                    <th className="px-4 py-3.5">Kategori / Ürün</th>
                    <th className="px-4 py-3.5">İndeks Parçası</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Tarih</th>
                    <th className="px-4 py-3.5 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {docsLoading ? (
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
                          <div>{new Date(doc.createdAt).toLocaleDateString("tr-TR")}</div>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleDocStatus(doc.id, doc.status)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                doc.status === "ACTIVE"
                                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
                              }`}
                            >
                              {doc.status === "ACTIVE" ? "Devre Dışı" : "Aktif Et"}
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

      {/* Tab 2: Q&A and Question Variations */}
      {activeTab === "qas" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-corp-gray absolute left-3 top-3" />
              <input
                type="text"
                value={qaSearch}
                onChange={(e) => setQaSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadQAs()}
                placeholder="Soru, cevap veya varyasyon ara..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
              />
            </div>

            <select
              value={qaCategoryFilter}
              onChange={(e) => setQaCategoryFilter(e.target.value)}
              className="text-xs bg-white border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
            >
              <option value="ALL">Tüm Kategoriler</option>
              <option value="Midvem">Midvem</option>
              <option value="Alom">Alom Call Center</option>
              <option value="e-Studio">e-Studio Fotoğrafçılık</option>
              <option value="Postify">Postify Sosyal Medya</option>
              <option value="Web & Yazılım">Web & Yazılım</option>
              <option value="Baskı & Matbaa">Baskı & Matbaa</option>
              <option value="Genel">Genel</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {qasLoading ? (
              <div className="p-8 text-center text-corp-gray bg-white rounded-2xl border border-corp-border">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-corp-teal mb-2" />
                Soru-cevap kayıtları yükleniyor...
              </div>
            ) : qas.length === 0 ? (
              <div className="p-8 text-center text-corp-gray bg-white rounded-2xl border border-corp-border">
                Henüz kayıtlı soru-cevap bulunamadı. Yeni bir kayıt ekleyerek başlayabilirsiniz.
              </div>
            ) : (
              qas.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white border rounded-2xl p-4 shadow-xs transition-colors space-y-2.5 ${
                    item.isActive ? "border-corp-border hover:border-corp-teal/50" : "border-slate-200 opacity-60 bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-corp-teal/10 text-corp-teal text-[11px] font-semibold rounded-md">
                          {item.category}
                        </span>
                        {!item.isActive && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-md">
                            Devre Dışı
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-xs sm:text-sm text-corp-charcoal">
                        {item.question}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleQAActive(item.id, item.isActive)}
                        className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                          item.isActive
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {item.isActive ? "Pasif Yap" : "Aktif Et"}
                      </button>

                      <button
                        onClick={() => handleOpenEditQA(item)}
                        className="p-1.5 text-corp-gray hover:text-corp-charcoal hover:bg-slate-100 rounded-lg transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteQA(item.id)}
                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-corp-charcoal leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-3 rounded-xl border border-corp-border/40">
                    {item.answer}
                  </p>

                  {item.variations && item.variations.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-corp-gray flex items-center gap-1">
                        <Tag className="w-3 h-3 text-corp-teal" /> Alternatif Soru Varyasyonları ({item.variations.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.variations.map((v, vIdx) => (
                          <span
                            key={vIdx}
                            className="inline-block px-2.5 py-1 bg-white border border-corp-border text-corp-charcoal text-[11px] rounded-lg"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Unanswered Questions Log */}
      {activeTab === "unanswered" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={unansweredStatusFilter}
              onChange={(e) => setUnansweredStatusFilter(e.target.value)}
              className="text-xs bg-white border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
            >
              <option value="ALL">Tüm Durumlar ({unansweredLogs.length})</option>
              <option value="PENDING">Bekleyen Sorular ({unansweredCounts.PENDING || 0})</option>
              <option value="REVIEWED">İncelendi ({unansweredCounts.REVIEWED || 0})</option>
              <option value="RESOLVED">Çözüldü / Soru-Cevaba Eklendi ({unansweredCounts.RESOLVED || 0})</option>
            </select>
          </div>

          <div className="bg-white border border-corp-border rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-corp-border text-corp-gray font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Müşterinin Sorduğu Soru</th>
                    <th className="px-4 py-3.5">En Yüksek Skor / Güven</th>
                    <th className="px-4 py-3.5">Durum</th>
                    <th className="px-4 py-3.5">Tarih</th>
                    <th className="px-4 py-3.5 text-right">Aksiyonlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border">
                  {unansweredLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-corp-gray">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-corp-teal mb-2" />
                        Yanıtsız sorular yükleniyor...
                      </td>
                    </tr>
                  ) : unansweredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-corp-gray">
                        Harika! Şu anda cevapsız kalmış soru kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    unansweredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-semibold text-corp-charcoal max-w-md">
                          {log.question}
                        </td>

                        <td className="px-4 py-3.5 text-corp-gray">
                          {log.confidence !== null ? `%${Math.round(log.confidence * 100)}` : "-"}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              log.status === "PENDING"
                                ? "bg-amber-100 text-amber-800"
                                : log.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {log.status === "PENDING"
                              ? "İnceleme Bekliyor"
                              : log.status === "RESOLVED"
                              ? "Çözüldü"
                              : "İncelendi"}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-corp-gray text-[11px]">
                          {new Date(log.createdAt).toLocaleString("tr-TR")}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                handleOpenCreateQA(log.question);
                                handleUpdateLogStatus(log.id, "RESOLVED");
                              }}
                              className="px-2.5 py-1 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-lg text-xs font-semibold transition-colors"
                              title="Bu sorudan yeni bir Soru-Cevap kaydı oluştur"
                            >
                              Soru-Cevaba Dönüştür
                            </button>

                            <button
                              onClick={() => handleUpdateLogStatus(log.id, "REVIEWED")}
                              className="p-1.5 text-corp-gray hover:text-corp-charcoal hover:bg-slate-100 rounded-lg"
                              title="İncelendi olarak işaretle"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </button>

                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              title="Kayıttan Sil"
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

      {/* Tab 4: Interactive Test Bench */}
      {activeTab === "test" && (
        <div className="space-y-6">
          {/* Quality Metrics Summary Cards */}
          {evalStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-corp-border rounded-xl p-3.5 shadow-xs">
                <span className="text-[11px] font-semibold text-corp-gray uppercase tracking-wider block">
                  Değerlendirilen Soru
                </span>
                <span className="text-xl font-bold font-display text-corp-charcoal mt-1 block">
                  {evalStats.totalEvaluated}
                </span>
                <span className="text-[10px] text-corp-gray">Yönetici inceleme sayısı</span>
              </div>

              <div className="bg-white border border-corp-border rounded-xl p-3.5 shadow-xs">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                  Doğruluk Oranı
                </span>
                <span className="text-xl font-bold font-display text-emerald-600 mt-1 block">
                  %{evalStats.accuracyRate}
                </span>
                <span className="text-[10px] text-emerald-800">
                  {evalStats.accurateCount} Doğru • {evalStats.partialCount} Kısmi
                </span>
              </div>

              <div className="bg-white border border-corp-border rounded-xl p-3.5 shadow-xs">
                <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
                  İyileştirme Gereken
                </span>
                <span className="text-xl font-bold font-display text-amber-600 mt-1 block">
                  {evalStats.inaccurateCount}
                </span>
                <span className="text-[10px] text-amber-800">Hatalı / Eksik / Uzun</span>
              </div>

              <div className="bg-white border border-corp-border rounded-xl p-3.5 shadow-xs">
                <span className="text-[11px] font-semibold text-corp-teal uppercase tracking-wider block">
                  Harici AI Bağımlılığı
                </span>
                <span className="text-xl font-bold font-display text-corp-teal mt-1 block">
                  0 (SIFIR)
                </span>
                <span className="text-[10px] text-corp-gray">100% Yerel Deterministik</span>
              </div>
            </div>
          )}

          <div className="bg-white border border-corp-border rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-display text-corp-charcoal flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-corp-teal" />
                  Deterministik Müşteri Yanıt Motoru Test Tezgahı
                </h2>
                <p className="text-xs text-corp-gray mt-1">
                  Gerçekçi veya zorlu bir müşteri sorusu yazarak sistemin Türkçe NLU katmanını, niyet tahminini, doküman parçalama ve kanıt doğrulama mekanizmasını test edin.
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                100% Sıfır Harici API Çağrısı
              </div>
            </div>

            <form onSubmit={handleRunTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                  Test Edilecek Müşteri Sorusu:
                </label>
                <textarea
                  value={testQuestion}
                  onChange={(e) => setTestQuestion(e.target.value)}
                  rows={3}
                  placeholder="Örn: Yahu bizim dükkanda elemanlar WhatsApp'a bakmaktan çıldırdı, Instagram ayrı bi yerde çalıyor. Bunları tek ekranda toplayacaz dediniz de, mesajlar birbirine girip çorbaya dönmesin sonra? Nasıl anlıcaz kimin hangisinden yazdığını?"
                  required
                  className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl p-3 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-corp-gray">
                  * NLU normalizasyonu, eş anlamlı sözlüğü, niyet analizi ve semantik doküman parçaları taranır.
                </span>

                <button
                  type="submit"
                  disabled={testRunning || !testQuestion.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                >
                  {testRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Analiz Ediliyor...
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
                {/* NLU Diagnostics Banner */}
                <div className="bg-white border border-corp-border rounded-xl p-3.5 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-corp-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-corp-gray">Tahmin Edilen Konu / Niyet:</span>
                      <span className="px-2 py-0.5 bg-corp-teal/10 text-corp-teal text-[11px] font-bold rounded-md">
                        {testResult.detectedSubject || "Genel"}
                      </span>
                      {testResult.detectedIntent && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded">
                          {testResult.detectedIntent}
                        </span>
                      )}
                    </div>

                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-mono rounded">
                      Gecikme: {testResult.latencyMs}ms
                    </span>
                  </div>

                  <div className="text-[11px] text-corp-gray flex flex-wrap gap-x-4 gap-y-1">
                    <span>
                      <strong>Normalleştirilmiş Sorgu:</strong> "{testResult.normalizedQuery || testResult.question}"
                    </span>
                    <span>
                      <strong>Hesaplanan Güven:</strong> %{Math.round((testResult.verification?.confidence || 0) * 100)} ({testResult.verification?.confidenceLevel})
                    </span>
                    <span>
                      <strong>Harici AI API:</strong> 0 (Sıfır Çağrı)
                    </span>
                  </div>
                </div>

                {/* Verdict Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    testResult.verification.confidenceLevel === "HIGH"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : testResult.verification.confidenceLevel === "MEDIUM"
                      ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-slate-100 border-slate-300 text-slate-800"
                  }`}
                >
                  {testResult.verification.confidenceLevel === "HIGH" ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider">
                      {testResult.verification.confidenceLevel === "HIGH"
                        ? "Yüksek Güven — Doğrulanmış ve Kanıtlı Yanıt"
                        : testResult.verification.confidenceLevel === "MEDIUM"
                        ? "Orta Güven — Kısmi Bilgi & Kontrollü Yanıt"
                        : "Düşük Güven — Güvenli Açıklama & Fallback"}
                    </h3>
                    <p className="text-xs">{testResult.verification.reason}</p>
                    {testResult.uncertaintyNotes && (
                      <p className="text-xs text-amber-800 font-medium mt-1">
                        ⚠️ Belirsizlik Uyarısı: {testResult.uncertaintyNotes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Generated Reply Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-corp-charcoal">
                      Müşteriye Sunulacak Nihai Yanıt:
                    </h4>
                    <span className="text-[10px] text-corp-gray">
                      (Kaynak dokümanın başlığı ve ham numaralandırması müşteriye aktarılmaz)
                    </span>
                  </div>
                  <div className="p-4 bg-white border border-corp-border rounded-xl text-xs text-corp-charcoal leading-relaxed whitespace-pre-wrap font-sans shadow-xs">
                    {testResult.generatedReply}
                  </div>
                </div>

                {/* Matched Q&A */}
                {testResult.matchedQA && testResult.matchedQA.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-corp-charcoal">
                        Eşleşen Onaylı Soru-Cevap Kaydı:
                      </h4>
                      <button
                        onClick={() => handleAddVariationFromTest(testResult.matchedQA[0].id)}
                        disabled={addVariationLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-corp-teal/10 hover:bg-corp-teal/20 text-corp-teal rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                        title="Bu test sorusunu kalıcı olarak bu kaydın soru varyasyonlarına ekler"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Bu Soruyu Varyasyon Olarak Ekle
                      </button>
                    </div>

                    {addVariationMsg && (
                      <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg border border-emerald-200">
                        {addVariationMsg}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {testResult.matchedQA.map((qa: any, idx: number) => (
                        <div
                          key={idx}
                          className="bg-white border border-corp-border rounded-lg p-2.5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-semibold text-corp-charcoal">{qa.question}</span>
                            {qa.matchedVariation && (
                              <span className="ml-2 text-[11px] text-corp-teal font-medium">
                                (Eşleşen Varyasyon: "{qa.matchedVariation}")
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-corp-teal font-bold text-xs">Skor: {qa.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Document Chunks */}
                {testResult.matchedDocuments && testResult.matchedDocuments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-corp-charcoal mb-2">
                      Kullanılan Onaylı Doküman Parçaları ({testResult.matchedDocuments.length}):
                    </h4>
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
                  </div>
                )}

                {/* Admin Feedback & Evaluation Controls (Stage 7.2) */}
                <div className="bg-white border border-corp-border rounded-xl p-4 space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-corp-charcoal flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-corp-teal" />
                      Yönetici Yanıt Kalitesi Değerlendirmesi:
                    </h4>
                    <span className="text-[11px] text-corp-gray">
                      Bu değerlendirme sistemin doğruluğunu ölçmek için kaydedilir
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "CORRECT", label: "✅ Doğru Yanıt", bg: "hover:bg-emerald-50 hover:text-emerald-800" },
                      { key: "PARTIAL", label: "⚠️ Kısmen Doğru", bg: "hover:bg-amber-50 hover:text-amber-800" },
                      { key: "INCORRECT", label: "❌ Yanlış Yanıt", bg: "hover:bg-red-50 hover:text-red-800" },
                      { key: "IRRELEVANT", label: "🚫 Soruyla İlgisiz", bg: "hover:bg-purple-50 hover:text-purple-800" },
                      { key: "TOO_LONG", label: "📏 Gereğinden Uzun", bg: "hover:bg-blue-50 hover:text-blue-800" },
                      { key: "MISSING_INFO", label: "❓ Eksik Bilgi", bg: "hover:bg-orange-50 hover:text-orange-800" },
                      { key: "UNVERIFIED_CLAIM", label: "⚠️ Kaynakta Olmayan İddia", bg: "hover:bg-rose-50 hover:text-rose-800" },
                      { key: "WRONG_PRODUCT", label: "🏷️ Yanlış Ürün/Hizmet", bg: "hover:bg-slate-100" },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => setSelectedVerdict(btn.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          selectedVerdict === btn.key
                            ? "bg-corp-teal text-white border-corp-teal shadow-xs"
                            : `bg-slate-50 border-slate-200 text-corp-charcoal ${btn.bg}`
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={evalAdminNotes}
                      onChange={(e) => setEvalAdminNotes(e.target.value)}
                      placeholder="İsteğe bağlı yönetici notu (Örn: Cevap net ve kanıtla uyumlu, gereksiz başlık yok)..."
                      className="flex-1 text-xs bg-slate-50 border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-corp-teal"
                    />
                    <button
                      type="button"
                      disabled={evalSaving}
                      onClick={() => handleSaveEvaluation(selectedVerdict)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {evalSaving ? "Kaydediliyor..." : "Değerlendirmeyi Kaydet"}
                    </button>
                  </div>

                  {evalSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      {evalSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recent Evaluations History */}
          {evaluationsList && evaluationsList.length > 0 && (
            <div className="bg-white border border-corp-border rounded-2xl shadow-xs overflow-hidden">
              <div className="p-4 border-b border-corp-border bg-slate-50/50 flex items-center justify-between">
                <h3 className="font-display font-bold text-xs text-corp-charcoal flex items-center gap-2">
                  <Clock className="w-4 h-4 text-corp-teal" />
                  Son Yönetici Değerlendirmeleri ({evaluationsList.length})
                </h3>
                <span className="text-[11px] text-corp-gray">Kabul testleri ve kalite geçmişi</span>
              </div>

              <div className="divide-y divide-corp-border text-xs max-h-96 overflow-y-auto">
                {evaluationsList.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-corp-charcoal">
                        "{item.question}"
                      </span>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.verdict === "CORRECT"
                              ? "bg-emerald-100 text-emerald-800"
                              : item.verdict === "PARTIAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.verdict === "CORRECT"
                            ? "Doğru Yanıt"
                            : item.verdict === "PARTIAL"
                            ? "Kısmen Doğru"
                            : item.verdict}
                        </span>
                        <span className="text-[10px] text-corp-gray">
                          {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-corp-gray line-clamp-2 bg-slate-50 p-2 rounded-lg border border-corp-border/40">
                      {item.answer}
                    </p>

                    {item.adminNotes && (
                      <p className="text-[10px] text-corp-charcoal font-medium">
                        <strong>Not:</strong> {item.adminNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
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
                    <option value="Alom">Alom Çağrı Merkezi</option>
                    <option value="e-Studio">e-Studio Fotoğrafçılık</option>
                    <option value="Postify">Postify Sosyal Medya</option>
                    <option value="Web & Yazılım">Web & Yazılım</option>
                    <option value="Baskı & Matbaa">Baskı & Matbaa</option>
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
                  Hemen aktif et (Asistan bu bilgiyi aramalarda hemen kullanmaya başlasın)
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

      {/* Q&A Create / Edit Modal */}
      {showQAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-corp-border pb-3">
              <h3 className="font-display font-bold text-sm text-corp-charcoal">
                {qaEditId ? "Soru-Cevap Kaydını Düzenle" : "Yeni Soru-Cevap & Varyasyon Ekle"}
              </h3>
              <button onClick={() => setShowQAModal(false)} className="text-corp-gray hover:text-corp-charcoal">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQA} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                  Temel / Resmi Soru:
                </label>
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="Örn: Shopify siparişlerini sohbet ekranında görebiliyor muyuz?"
                  required
                  className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                  Doğrulanmış Resmi Yanıt:
                </label>
                <textarea
                  value={qaAnswer}
                  onChange={(e) => setQaAnswer(e.target.value)}
                  rows={4}
                  placeholder="Müşteriye verilecek eksiksiz ve kurumsal cevap metni..."
                  required
                  className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl p-3 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                    Kategori:
                  </label>
                  <select
                    value={qaCategory}
                    onChange={(e) => setQaCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-2.5 py-2 text-corp-charcoal"
                  >
                    <option value="Genel">Genel</option>
                    <option value="Midvem">Midvem AI</option>
                    <option value="Alom">Alom Çağrı Merkezi</option>
                    <option value="e-Studio">e-Studio Fotoğrafçılık</option>
                    <option value="Postify">Postify Sosyal Medya</option>
                    <option value="Web & Yazılım">Web & Yazılım</option>
                    <option value="Baskı & Matbaa">Baskı & Matbaa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal mb-1">
                    İlgili Ürün ID (İsteğe bağlı):
                  </label>
                  <input
                    type="text"
                    value={qaProductId}
                    onChange={(e) => setQaProductId(e.target.value)}
                    placeholder="Örn: midvem, alom"
                    className="w-full text-xs bg-slate-50 border border-corp-border rounded-xl px-2.5 py-2 text-corp-charcoal"
                  />
                </div>
              </div>

              {/* Dynamic Variations System */}
              <div className="space-y-2 pt-2 border-t border-corp-border">
                <label className="block text-xs font-semibold text-corp-charcoal">
                  Soru Varyasyonları (Müşterinin bu soruyu sorabileceği farklı cümleler):
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVariationInput}
                    onChange={(e) => setNewVariationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddVariation();
                      }
                    }}
                    placeholder="Alternatif bir soru yazıp 'Ekle'ye tıklayın..."
                    className="flex-1 text-xs bg-slate-50 border border-corp-border rounded-xl px-3 py-2 text-corp-charcoal focus:outline-none focus:ring-1 focus:ring-corp-teal"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariation}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-corp-charcoal text-xs font-semibold rounded-xl"
                  >
                    Ekle
                  </button>
                </div>

                {qaVariations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {qaVariations.map((v, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-corp-teal/10 border border-corp-teal/20 text-corp-teal rounded-lg text-xs"
                      >
                        {v}
                        <button
                          type="button"
                          onClick={() => handleRemoveVariation(idx)}
                          className="text-corp-teal hover:text-red-600 font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {qaError && (
                <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                  {qaError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQAModal(false)}
                  className="px-4 py-2 border border-corp-border text-corp-charcoal rounded-xl text-xs font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={qaSaving || !qaQuestion.trim() || !qaAnswer.trim()}
                  className="px-4 py-2 bg-corp-teal hover:bg-corp-teal-dark text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {qaSaving ? "Kaydediliyor..." : "Kaydet"}
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
