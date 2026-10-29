'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Upload,
  FileText,
  Trash2,
  Key,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  Save,
  Loader2,
  Info,
  Layers,
  Cpu,
} from 'lucide-react';

interface SafeKeyItem {
  id: string;
  name: string;
  maskedPreview: string;
  role: 'PRIMARY' | 'BACKUP' | 'PRODUCT_EDIT';
  purpose: 'BOTH' | 'CHATBOT' | 'PRODUCT_EDIT';
  projectTag: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'INVALID' | 'COOLDOWN';
  accessibleModelsCount: number;
  source: 'DB_VAULT' | 'ENV';
}

interface DiscoveredModelItem {
  technicalName: string;
  displayName: string;
  version: string;
  description: string;
  supportedGenerationMethods: string[];
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportsTextGeneration: boolean;
  supportsDocumentInput: boolean;
  supportsImageInput: boolean;
  supportsStructuredJson: boolean;
  isSuitableForChat: boolean;
  isSuitableForProductEdit: boolean;
  suitabilityReason: string;
  stabilityTier:
    | 'STABLE_FLAGSHIP'
    | 'STABLE_FAST'
    | 'STABLE_OTHER'
    | 'PREVIEW_EXPERIMENTAL'
    | 'LEGACY'
    | 'UNSUPPORTED_FOR_TEXT';
  priorityRank: number;
}

interface DiffChangeItem {
  changeId: string;
  category: 'PRODUCT_FIELD' | 'TIER_UPDATE' | 'TIER_ADD' | 'TIER_REMOVE';
  tierIndex: number | null;
  tierName: string | null;
  fieldKey: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  oldValueFormatted: string;
  newValueFormatted: string;
  source: string;
  approvedByDefault: boolean;
}

interface AiProposalData {
  productId: string;
  productName: string;
  productSlug: string;
  expectedUpdatedAt: string;
  usedModel: string;
  usedKeyName: string;
  usedKeyMasked: string;
  summaryExplanation: string;
  warnings: string[];
  currentSnapshot: any;
  proposedSnapshot: any;
  changes: DiffChangeItem[];
}

interface AiProductEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    slug: string;
  };
  onProductUpdated: (updatedPlan: any) => void;
}

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.txt',
  '.md',
  '.csv',
  '.docx',
  '.xlsx',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
];
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 10;

export default function AiProductEditModal({
  isOpen,
  onClose,
  product,
  onProductUpdated,
}: AiProductEditModalProps) {
  // Step state: 'form' -> 'preview'
  const [step, setStep] = useState<'form' | 'preview'>('form');

  // Prompt & Files
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  // API Key selection
  const [savedKeys, setSavedKeys] = useState<SafeKeyItem[]>([]);
  const [keyMode, setKeyMode] = useState<'saved' | 'new'>('saved');
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [rawApiKey, setRawApiKey] = useState<string>('');
  const [showRawKey, setShowRawKey] = useState(false);
  const [newKeyPersistence, setNewKeyPersistence] = useState<'transient' | 'save'>('transient');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyProjectTag, setNewKeyProjectTag] = useState('product-edit-project');

  // Models
  const [models, setModels] = useState<DiscoveredModelItem[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [showUnsupportedModels, setShowUnsupportedModels] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  // Proposal & Diff Preview
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictDetected, setConflictDetected] = useState(false);
  const [proposal, setProposal] = useState<AiProposalData | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  const loadKeysAndCatalog = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai/keys', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        const keyList: SafeKeyItem[] = Array.isArray(data.keys) ? data.keys : [];
        setSavedKeys(keyList);
        if (keyList.length > 0) {
          setKeyMode('saved');
          const preferred =
            keyList.find((k) => k.isActive && k.status === 'ACTIVE') || keyList[0];
          setSelectedKeyId((prev) => prev || preferred.id);
        } else {
          setKeyMode('new');
        }

        const cat: DiscoveredModelItem[] = Array.isArray(data.catalog) ? data.catalog : [];
        if (cat.length > 0) {
          setModels(cat);
          const firstSuitable = cat.find((m) => m.isSuitableForProductEdit);
          if (firstSuitable) {
            setSelectedModel((prev) => prev || firstSuitable.technicalName);
          }
        }
      }
    } catch {
      // Ignore initial load error
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setConflictDetected(false);
      loadKeysAndCatalog();
    }
  }, [isOpen, loadKeysAndCatalog]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const combined = [...files];
    for (const f of selected) {
      if (combined.length >= MAX_FILES) {
        setFileError(`En fazla ${MAX_FILES} dosya ekleyebilirsiniz.`);
        break;
      }
      const extIdx = f.name.lastIndexOf('.');
      const ext = extIdx !== -1 ? f.name.slice(extIdx).toLowerCase() : '';
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(
          `'${f.name}' desteklenmeyen dosya biçiminde. İzin verilenler: ${ALLOWED_EXTENSIONS.join(', ')}`
        );
        continue;
      }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setFileError(
          `'${f.name}' dosya boyutu çok büyük (${(f.size / (1024 * 1024)).toFixed(1)} MB > Maks. ${MAX_FILE_SIZE_MB} MB).`
        );
        continue;
      }
      if (!combined.some((existing) => existing.name === f.name && existing.size === f.size)) {
        combined.push(f);
      }
    }
    setFiles(combined);
    e.target.value = '';
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setFileError(null);
  };

  const handleRefreshModels = async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const payload: Record<string, string> = {};
      if (keyMode === 'new') {
        if (!rawApiKey.trim()) {
          setModelError('Modelleri listelemek için önce yeni Google API anahtarınızı girin.');
          setLoadingModels(false);
          return;
        }
        payload.rawApiKey = rawApiKey.trim();
      } else {
        if (!selectedKeyId) {
          setModelError('Lütfen listeden kayıtlı bir API anahtarı seçin veya yeni anahtar girin.');
          setLoadingModels(false);
          return;
        }
        payload.keyId = selectedKeyId;
      }

      const res = await fetch('/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setModelError(data.error || 'Model listesi alınamadı.');
        return;
      }

      const fetchedModels: DiscoveredModelItem[] = Array.isArray(data.models) ? data.models : [];
      setModels(fetchedModels);
      const bestModel = fetchedModels.find((m) => m.isSuitableForProductEdit);
      if (bestModel) {
        setSelectedModel(bestModel.technicalName);
      }
    } catch (err: any) {
      setModelError(err?.message || 'Modeller yenilenirken bağlantı hatası oluştu.');
    } finally {
      setLoadingModels(false);
    }
  };

  const handleGenerateProposal = async () => {
    setErrorMsg(null);
    setConflictDetected(false);

    if (!prompt.trim() || prompt.trim().length < 3) {
      setErrorMsg('Lütfen ürünün nasıl güncellenmesini istediğinizi açıklayan bir prompt yazın.');
      return;
    }

    if (keyMode === 'new' && !rawApiKey.trim()) {
      setErrorMsg('Lütfen geçerli bir Google API Anahtarı girin veya kayıtlı anahtar kullanın.');
      return;
    }

    if (keyMode === 'saved' && !selectedKeyId) {
      setErrorMsg('Lütfen kayıtlı bir API Anahtarı seçin veya "Yeni API Key gir" seçeneğine geçin.');
      return;
    }

    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append('prompt', prompt.trim());
      formData.append('keyMode', keyMode);
      if (keyMode === 'saved') {
        formData.append('savedKeyId', selectedKeyId);
      } else {
        formData.append('rawApiKey', rawApiKey.trim());
        formData.append('saveNewKey', newKeyPersistence === 'save' ? 'true' : 'false');
        if (newKeyName.trim()) formData.append('newKeyName', newKeyName.trim());
        if (newKeyProjectTag.trim()) formData.append('newKeyProjectTag', newKeyProjectTag.trim());
      }
      if (selectedModel) {
        formData.append('selectedModel', selectedModel);
      }
      for (const f of files) {
        formData.append('files', f);
      }

      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/ai-edit`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || data.errorMessage || 'Değişiklik önerisi oluşturulamadı.');
        return;
      }

      // Clear raw key from state if it was saved to vault and refresh saved keys
      if (data.savedNewKey) {
        await loadKeysAndCatalog();
        setKeyMode('saved');
        setSelectedKeyId(data.savedNewKey.id);
        setRawApiKey('');
      }

      setProposal(data);
      const defaultChecked = new Set<string>(
        (data.changes || [])
          .filter((c: DiffChangeItem) => c.approvedByDefault)
          .map((c: DiffChangeItem) => c.changeId)
      );
      setApprovedIds(defaultChecked);
      setStep('preview');
    } catch (err: any) {
      setErrorMsg(err?.message || 'İstek sırasında beklenmeyen bir hata oluştu.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApplyChanges = async (forceOverwrite = false) => {
    if (!proposal) return;
    if (approvedIds.size === 0) {
      setErrorMsg('Kaydetmek için en az bir değişikliği onaylamalısınız.');
      return;
    }

    setApplying(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}/ai-apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedUpdatedAt: proposal.expectedUpdatedAt,
          forceOverwrite,
          proposedSnapshot: proposal.proposedSnapshot,
          approvedChangeIds: Array.from(approvedIds),
          promptSummary: prompt.trim().slice(0, 160),
          usedModel: proposal.usedModel,
        }),
      });

      const data = await res.json();
      if (res.status === 409 && data.conflictDetected) {
        setConflictDetected(true);
        setErrorMsg(data.error);
        return;
      }

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Değişiklikler kaydedilirken hata oluştu.');
        return;
      }

      onProductUpdated(data.updatedPlan);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Kaydetme işlemi sırasında bağlantı hatası oluştu.');
    } finally {
      setApplying(false);
    }
  };

  const toggleApproveId = (changeId: string) => {
    setApprovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(changeId)) {
        next.delete(changeId);
      } else {
        next.add(changeId);
      }
      return next;
    });
  };

  const suitableModels = models.filter((m) => m.isSuitableForProductEdit);
  const unsuitableModels = models.filter((m) => !m.isSuitableForProductEdit);

  const getTierBadgeLabel = (tier: DiscoveredModelItem['stabilityTier']) => {
    switch (tier) {
      case 'STABLE_FLAGSHIP':
        return '1. Öncelik: Güçlü & Kararlı';
      case 'STABLE_FAST':
        return '2. Öncelik: Hızlı & Kararlı';
      case 'STABLE_OTHER':
        return '3. Öncelik: Kararlı';
      case 'PREVIEW_EXPERIMENTAL':
        return '4. Öncelik: Preview / Deneysel';
      case 'LEGACY':
        return '5. Öncelik: Legacy / Eski Sürüm';
      default:
        return 'Metin/JSON Üretimine Uygun Değil';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-indigo-500/30 bg-slate-900 text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">AI İle Düzenle</h2>
                <span className="rounded-full bg-indigo-500/20 border border-indigo-400/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                  Ürün: {product.name}
                </span>
                <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-400">
                  ID: {product.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                İşlem: Yalnızca <strong>{product.name}</strong> ({`/${product.slug}`}) ürün ve paket bilgilerini yapay zekâ ile güvenli güncelleme
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-300">İşlem Uyarısı</p>
                <p className="mt-0.5">{errorMsg}</p>
                {conflictDetected && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApplyChanges(true)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                    >
                      Yine de Üzerine Yaz ve Kaydet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConflictDetected(false);
                        setStep('form');
                      }}
                      className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Öneriyi Yeniden Oluştur
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'form' ? (
            <>
              {/* 3.1. Scope Assurance Banner */}
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-4 py-3 text-xs text-emerald-200 flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <div>
                  <strong>Tekil Ürün Koruması Aktif:</strong> Yapay zekâ yalnızca seçili{' '}
                  <span className="underline font-semibold">{product.name}</span> ürünü üzerinde
                  değişiklik önerisi oluşturur. Talimatınızda belirtilmeyen alanlar, fiyatlar ve
                  satın alma bağlantıları korunur; değişiklikler siz onaylayana kadar kaydedilmez.
                </div>
              </div>

              {/* 3.2. Natural Language Prompt Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-slate-200">
                    1. Düzenleme Talimatı (Prompt) <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-xs text-slate-400">{prompt.length} karakter</span>
                </div>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Örn: Eklediğim dosyadaki yeni bilgilere göre bu ürünün bütün paketlerini güncelle. Her paketin özelliklerini, kullanım limitlerini ve fiyatını ilgili alanlara yerleştir. Belgede belirtilmeyen mevcut bilgileri değiştirme."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/90 p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt(
                        'Eklediğim dosyadaki yeni bilgilere göre bu ürünün bütün paketlerini güncelle. Her paketin özelliklerini, kullanım limitlerini ve fiyatını ilgili alanlara yerleştir. Belgede belirtilmeyen mevcut bilgileri değiştirme.'
                      )
                    }
                    className="rounded-lg border border-slate-700/80 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    + Örnek: Belgedeki paket, limit ve fiyatları uygula
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPrompt(
                        'Bu ürünün paketlerinde bulunan kullanım / dakika limitlerini güncelle. Ürün açıklamasını, mevcut fiyatları ve satın alma bağlantılarını değiştirme.'
                      )
                    }
                    className="rounded-lg border border-slate-700/80 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
                  >
                    + Örnek: Yalnızca paket limitlerini güncelle (fiyata dokunma)
                  </button>
                </div>
              </div>

              {/* 3.3. Optional File Upload */}
              <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-200">
                      2. Kaynak Dosya Yükle (İsteğe Bağlı)
                    </label>
                    <p className="text-xs text-slate-400">
                      Kabul edilen türler: PDF, DOCX, XLSX, CSV, TXT, MD, JSON, PNG, JPG, WEBP (Maks.{' '}
                      {MAX_FILES} dosya, dosya başına {MAX_FILE_SIZE_MB} MB)
                    </p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition">
                    <Upload className="h-4 w-4" />
                    <span>Dosya Seç</span>
                    <input
                      type="file"
                      multiple
                      accept={ALLOWED_EXTENSIONS.join(',')}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {fileError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {fileError}
                  </p>
                )}

                {files.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="h-4 w-4 text-indigo-400 shrink-0" />
                          <span className="truncate font-medium text-slate-200">{f.name}</span>
                          <span className="text-slate-500 shrink-0">
                            ({(f.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-slate-400 hover:text-rose-400 p-1"
                          title="Dosyayı Kaldır"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3.4. Google API Key Selection */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Key className="h-4 w-4 text-amber-400" />
                    3. Google Gemini API Anahtarı Seçimi
                  </label>
                  <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setKeyMode('saved')}
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        keyMode === 'saved'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Kayıtlı Anahtar Kullan ({savedKeys.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeyMode('new')}
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        keyMode === 'new'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Yeni API Key Gir
                    </button>
                  </div>
                </div>

                {keyMode === 'saved' ? (
                  savedKeys.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedKeyId}
                        onChange={(e) => setSelectedKeyId(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                      >
                        {savedKeys.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name} — [{k.maskedPreview}] — Durum: {k.status} (
                            {k.role === 'PRIMARY'
                              ? 'Ana Anahtar'
                              : k.role === 'PRODUCT_EDIT'
                                ? 'Ürün Düzenleme'
                                : 'Yedek Anahtar'}
                            )
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400">
                        Merkezi şifreli anahtar deposundaki (AES-256-GCM) anahtarlar maskelenmiş olarak
                        gösterilir; tam anahtar değeri asla tarayıcıya gönderilmez.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-200 flex items-center justify-between">
                      <span>Henüz kayıtlı bir API anahtarı bulunmuyor.</span>
                      <button
                        type="button"
                        onClick={() => setKeyMode('new')}
                        className="rounded bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 hover:bg-amber-500/30"
                      >
                        Yeni Anahtar Gir →
                      </button>
                    </div>
                  )
                ) : (
                  <div className="space-y-3 pt-1">
                    <div className="relative">
                      <input
                        type={showRawKey ? 'text' : 'password'}
                        value={rawApiKey}
                        onChange={(e) => setRawApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        autoComplete="off"
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 pl-3.5 pr-10 py-2.5 text-sm font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRawKey((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title={showRawKey ? 'Gizle' : 'Göster'}
                      >
                        {showRawKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label
                        className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                          newKeyPersistence === 'transient'
                            ? 'border-indigo-500 bg-indigo-950/30 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="keyPersistence"
                          checked={newKeyPersistence === 'transient'}
                          onChange={() => setNewKeyPersistence('transient')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-semibold">Yalnızca bu işlemde kullan</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Anahtar veritabanına kaydedilmez; işlem bittiğinde bellekten silinir.
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition ${
                          newKeyPersistence === 'save'
                            ? 'border-indigo-500 bg-indigo-950/30 text-white'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="keyPersistence"
                          checked={newKeyPersistence === 'save'}
                          onChange={() => setNewKeyPersistence('save')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-semibold">
                            Güvenli şekilde kaydet ve daha sonra yeniden kullan
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            AES-256-GCM ile şifrelenerek merkezi anahtar deposuna eklenir (Chatbot ana anahtarını değiştirmez).
                          </div>
                        </div>
                      </label>
                    </div>

                    {newKeyPersistence === 'save' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Anahtar İçin Açıklayıcı İsim (İsteğe Bağlı)
                          </label>
                          <input
                            type="text"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                            placeholder={`Örn: ${product.name} Ürün Düzenleme Anahtarı`}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-1">
                            Google Cloud Proje Etiketi (Kota Grubu)
                          </label>
                          <input
                            type="text"
                            value={newKeyProjectTag}
                            onChange={(e) => setNewKeyProjectTag(e.target.value)}
                            placeholder="Örn: project-urun-yonetimi"
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 3.5. Dynamic Model Discovery & Selection */}
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-indigo-400" />
                      4. Yapay Zekâ Model Seçimi
                    </label>
                    <p className="text-xs text-slate-400">
                      Seçilen API anahtarının erişebildiği tüm modeller sayfalı olarak gerçek Gemini API&apos;den çekilir ve yeteneklerine göre sıralanır.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshModels}
                    disabled={loadingModels}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 disabled:opacity-50 transition"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
                    <span>{loadingModels ? 'Modeller Keşfediliyor...' : 'Modelleri Yenile'}</span>
                  </button>
                </div>

                {modelError && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                    {modelError}
                  </div>
                )}

                <div className="space-y-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    {suitableModels.length > 0 ? (
                      suitableModels.map((m) => (
                        <option key={m.technicalName} value={m.technicalName}>
                          {m.displayName} ({m.technicalName}) — [{getTierBadgeLabel(m.stabilityTier)}] — Sürüm: {m.version}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="gemini-2.5-flash">
                          Gemini 2.5 Flash (gemini-2.5-flash) — [1. Öncelik: Güçlü & Kararlı]
                        </option>
                        <option value="gemini-2.5-pro">
                          Gemini 2.5 Pro (gemini-2.5-pro) — [1. Öncelik: Güçlü & Kararlı]
                        </option>
                        <option value="gemini-2.0-flash">
                          Gemini 2.0 Flash (gemini-2.0-flash) — [2. Öncelik: Hızlı & Kararlı]
                        </option>
                        <option value="gemini-2.0-flash-lite">
                          Gemini 2.0 Flash Lite (gemini-2.0-flash-lite) — [2. Öncelik: Hızlı & Kararlı]
                        </option>
                      </>
                    )}
                  </select>

                  {/* Selected model metadata details */}
                  {(() => {
                    const currentM = models.find((m) => m.technicalName === selectedModel);
                    if (!currentM) return null;
                    return (
                      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-semibold text-indigo-300">
                            {currentM.displayName}{' '}
                            <code className="text-slate-400">({currentM.technicalName})</code>
                          </span>
                          <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] text-indigo-300 font-medium">
                            {getTierBadgeLabel(currentM.stabilityTier)}
                          </span>
                        </div>
                        <p className="text-slate-300">{currentM.suitabilityReason}</p>
                        <div className="flex flex-wrap gap-3 pt-1 text-[11px] text-slate-400">
                          <span>Sürüm: {currentM.version}</span>
                          <span>Girdi Limiti: {currentM.inputTokenLimit.toLocaleString('tr-TR')} token</span>
                          <span>Çıktı Limiti: {currentM.outputTokenLimit.toLocaleString('tr-TR')} token</span>
                          <span>
                            Belge/Görsel: {currentM.supportsDocumentInput ? 'Destekliyor ✓' : 'Sınırlı'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {unsuitableModels.length > 0 && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowUnsupportedModels((prev) => !prev)}
                        className="text-xs text-slate-400 hover:text-slate-200 underline"
                      >
                        {showUnsupportedModels
                          ? 'Metin/Ürün düzenleme için uygun olmayan modelleri gizle'
                          : `Bu işlemde kullanılamayan diğer erişilebilir modelleri göster (${unsuitableModels.length} model)`}
                      </button>
                      {showUnsupportedModels && (
                        <div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/60 p-2.5 space-y-1.5 text-[11px]">
                          {unsuitableModels.map((um) => (
                            <div
                              key={um.technicalName}
                              className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-1 last:border-0"
                            >
                              <div>
                                <span className="font-mono text-slate-300">{um.technicalName}</span>{' '}
                                <span className="text-slate-500">({um.displayName})</span>
                              </div>
                              <span className="text-amber-400/90 text-right">
                                {um.suitabilityReason}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* STEP 2: DIFF PREVIEW & FIELD-LEVEL APPROVAL */
            proposal && (
              <div className="space-y-5">
                {/* Summary Banner */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <h3 className="font-bold text-white text-sm">
                        Değişiklik Önerisi Hazır — Ön İzleme ve Onay
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="rounded bg-slate-800 px-2 py-0.5">
                        Model: <strong>{proposal.usedModel}</strong>
                      </span>
                      <span className="rounded bg-slate-800 px-2 py-0.5">
                        Anahtar: <strong>{proposal.usedKeyName}</strong> ({proposal.usedKeyMasked})
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-200">{proposal.summaryExplanation}</p>
                </div>

                {/* Warnings if any */}
                {proposal.warnings && proposal.warnings.length > 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-1 text-xs text-amber-200">
                    <div className="font-semibold flex items-center gap-1.5">
                      <Info className="h-4 w-4 text-amber-400" />
                      Koruma ve Doğrulama Notları:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      {proposal.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Diff Table */}
                {proposal.changes.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center space-y-2">
                    <Layers className="h-8 w-8 text-slate-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-200">
                      Mevcut ürün verisi ile önerilen veri arasında fark bulunmadı.
                    </p>
                    <p className="text-xs text-slate-400">
                      Promptunuzu detaylandırarak yeniden düzenleme isteyebilirsiniz.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">
                        Toplam {proposal.changes.length} değişiklik önerildi ({approvedIds.size}{' '}
                        tanesi uygulanmak üzere seçili)
                      </span>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() =>
                            setApprovedIds(new Set(proposal.changes.map((c) => c.changeId)))
                          }
                          className="text-indigo-400 hover:underline"
                        >
                          Tümünü Seç
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          type="button"
                          onClick={() => setApprovedIds(new Set())}
                          className="text-slate-400 hover:underline"
                        >
                          Seçimi Temizle
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {proposal.changes.map((change) => {
                        const isChecked = approvedIds.has(change.changeId);
                        return (
                          <div
                            key={change.changeId}
                            className={`rounded-xl border transition p-4 ${
                              isChecked
                                ? 'border-indigo-500/40 bg-slate-950/80'
                                : 'border-slate-800 bg-slate-950/30 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleApproveId(change.changeId)}
                                  className="h-4 w-4 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="font-semibold text-sm text-white">
                                  {change.label}
                                </span>
                              </label>
                              <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] text-slate-300">
                                Kaynak: {change.source}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="rounded-lg border border-rose-500/20 bg-rose-950/15 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-300/80 mb-1">
                                  Eski Değer (Mevcut)
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-slate-300 leading-relaxed">
                                  {change.oldValueFormatted}
                                </pre>
                              </div>

                              <div className="rounded-lg border border-emerald-500/25 bg-emerald-950/15 p-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/90 mb-1 flex items-center gap-1">
                                  <ArrowRight className="h-3 w-3" />
                                  Önerilen Yeni Değer
                                </div>
                                <pre className="whitespace-pre-wrap font-sans text-emerald-100 leading-relaxed">
                                  {change.newValueFormatted}
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-800 bg-slate-950 px-6 py-4 flex-wrap">
          {step === 'form' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={generating}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleGenerateProposal}
                disabled={generating || !prompt.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Değişiklik Önerisi Oluşturuluyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Değişiklikleri Oluştur</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={applying}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={applying}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Düzenlemeyi Yeniden İste</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleApplyChanges(false)}
                disabled={applying || approvedIds.size === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 disabled:opacity-50 transition"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Kaydediliyor...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Değişiklikleri Kaydet ({approvedIds.size})</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

