'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  X,
  Key,
  Cpu,
  Database,
  Bell,
  Activity,
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
  Play,
  Eye,
  EyeOff,
  Save,
  Loader2,
  RotateCcw,
  Star,
} from 'lucide-react';

interface ChatbotCentralSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab =
  | 'general'
  | 'keys'
  | 'models'
  | 'knowledge'
  | 'notifications'
  | 'diagnostics';

export default function ChatbotCentralSettingsModal({
  isOpen,
  onClose,
}: ChatbotCentralSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Loaded data from /api/admin/customer-service/settings
  const [settings, setSettings] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catalogUpdatedAt, setCatalogUpdatedAt] = useState<string | null>(null);
  const [circuitBreaker, setCircuitBreaker] = useState<any>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  // Add new key state
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyRaw, setNewKeyRaw] = useState('');
  const [showNewKeyRaw, setShowNewKeyRaw] = useState(false);
  const [newKeyRole, setNewKeyRole] = useState<'PRIMARY' | 'BACKUP'>('BACKUP');
  const [newKeyProjectTag, setNewKeyProjectTag] = useState('project-main');
  const [addingKey, setAddingKey] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);

  // Model discovery & live test state
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);
  const [testingModelName, setTestingModelName] = useState<string | null>(null);
  const [modelTestResults, setModelTestResults] = useState<
    Record<string, { success: boolean; latencyMs: number; message: string }>
  >({});
  const [showUnsupportedModels, setShowUnsupportedModels] = useState(false);

  const loadAllSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/customer-service/settings', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setKeys(Array.isArray(data.keys) ? data.keys : []);
        setCatalog(Array.isArray(data.catalog) ? data.catalog : []);
        setCatalogUpdatedAt(data.catalogUpdatedAt || null);
        setCircuitBreaker(data.circuitBreaker || {});
        setRecentEvents(Array.isArray(data.recentEvents) ? data.recentEvents : []);
        setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
        setDiagnostics(data.diagnostics || null);

        // If no primary key exists yet, default new key role to PRIMARY
        const hasPrimary = (data.keys || []).some((k: any) => k.role === 'PRIMARY');
        setNewKeyRole(hasPrimary ? 'BACKUP' : 'PRIMARY');
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Ayarlar yüklenemedi.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Sunucu bağlantı hatası.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      loadAllSettings();
    }
  }, [isOpen, loadAllSettings]);

  if (!isOpen) return null;

  const updateField = (key: string, value: any) => {
    setSettings((prev: any) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/customer-service/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.settings);
        setStatusMessage({
          type: 'success',
          text: 'Merkezi Chatbot ayarları başarıyla kaydedildi ve anında devreye alındı.',
        });
        await loadAllSettings();
      } else {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Ayarlar kaydedilirken bir hata oluştu.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Kaydetme hatası.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Key Vault Actions
  const handleAddKey = async () => {
    if (!newKeyRaw.trim()) {
      setStatusMessage({ type: 'error', text: 'Lütfen eklenecek Google API anahtarını girin.' });
      return;
    }
    setAddingKey(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          name:
            newKeyName.trim() ||
            (newKeyRole === 'PRIMARY' ? 'Ana Chatbot API Anahtarı' : `Yedek Anahtar #${keys.length + 1}`),
          rawApiKey: newKeyRaw.trim(),
          role: newKeyRole,
          purpose: 'BOTH',
          projectTag: newKeyProjectTag.trim() || 'default-project',
          verifyModelsNow: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'API anahtarı doğrulanamadı veya kaydedilemedi.',
        });
        return;
      }
      setNewKeyRaw('');
      setNewKeyName('');
      setStatusMessage({
        type: 'success',
        text: `API anahtarı AES-256-GCM ile şifrelenerek kaydedildi (${data.discoveredModels?.length || 0} model keşfedildi).`,
      });
      await loadAllSettings();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Anahtar eklenirken hata oluştu.' });
    } finally {
      setAddingKey(false);
    }
  };

  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          keyId,
          testModelName: settings?.primaryModel || 'gemini-2.5-flash',
        }),
      });
      const data = await res.json();
      if (data.success) {
        const liveMsg = data.liveGenerationTest
          ? data.liveGenerationTest.success
            ? `Canlı yanıt testi başarılı (${data.liveGenerationTest.latencyMs} ms)`
            : `Model testi uyarısı: ${data.liveGenerationTest.error}`
          : '';
        setStatusMessage({
          type: 'success',
          text: `Anahtar doğrulandı: ${data.models?.length || 0} erişilebilir model bulundu. ${liveMsg}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: data.errorMessage || 'Anahtar testi başarısız oldu.',
        });
      }
      await loadAllSettings();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Test sırasında hata oluştu.' });
    } finally {
      setTestingKeyId(null);
    }
  };

  const handlePromoteToPrimary = async (keyItem: any) => {
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          id: keyItem.id,
          name: keyItem.name,
          role: 'PRIMARY',
          purpose: 'BOTH',
          projectTag: keyItem.projectTag,
          priority: 1,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `"${keyItem.name}" ana chatbot anahtarı olarak ayarlandı.`,
        });
        await loadAllSettings();
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Anahtar rolü güncellenemedi.' });
    }
  };

  const handleToggleKeyActive = async (keyItem: any) => {
    try {
      await fetch('/api/admin/ai/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert',
          id: keyItem.id,
          name: keyItem.name,
          role: keyItem.role,
          purpose: keyItem.purpose,
          projectTag: keyItem.projectTag,
          isActive: !keyItem.isActive,
        }),
      });
      await loadAllSettings();
    } catch {
      // Ignore
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/admin/ai/keys?id=${encodeURIComponent(keyId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatusMessage({ type: 'success', text: 'Anahtar güvenli depodan silindi.' });
        await loadAllSettings();
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Anahtar silinemedi.' });
    }
  };

  const handleMoveKeyPriority = async (index: number, direction: -1 | 1) => {
    const dbKeys = keys.filter((k) => k.source === 'DB_VAULT');
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= dbKeys.length) return;
    const reordered = [...dbKeys];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    await fetch('/api/admin/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reorder',
        orderedKeyIds: reordered.map((k) => k.id),
      }),
    });
    await loadAllSettings();
  };

  const handleResetCooldowns = async () => {
    await fetch('/api/admin/ai/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset_cooldowns' }),
    });
    setStatusMessage({
      type: 'success',
      text: 'Tüm anahtar, proje ve model bekleme süreleri (cooldown) sıfırlandı.',
    });
    await loadAllSettings();
  };

  // Model Discovery & Priority Ordering
  const handleRefreshModelCatalog = async () => {
    setRefreshingCatalog(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Modeller yenilenemedi. Aktif bir API anahtarı olduğundan emin olun.',
        });
        return;
      }
      setCatalog(data.models || []);
      setStatusMessage({
        type: 'success',
        text: `Google Gemini API'den ${data.totalModelsCount} model (${data.pagesFetched} sayfa) başarıyla keşfedildi; ${data.suitableForChatCount} model sohbet için uygun.`,
      });
      await loadAllSettings();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Model keşfi başarısız.' });
    } finally {
      setRefreshingCatalog(false);
    }
  };

  const handleTestSingleModel = async (technicalName: string) => {
    setTestingModelName(technicalName);
    try {
      const res = await fetch('/api/admin/ai/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testModelName: technicalName }),
      });
      const data = await res.json();
      if (data.liveGenerationTest) {
        setModelTestResults((prev) => ({
          ...prev,
          [technicalName]: {
            success: data.liveGenerationTest.success,
            latencyMs: data.liveGenerationTest.latencyMs,
            message: data.liveGenerationTest.success
              ? `Başarılı (${data.liveGenerationTest.latencyMs} ms)`
              : data.liveGenerationTest.error || 'Başarısız',
          },
        }));
      }
    } catch (err: any) {
      setModelTestResults((prev) => ({
        ...prev,
        [technicalName]: {
          success: false,
          latencyMs: 0,
          message: err?.message || 'Bağlantı hatası',
        },
      }));
    } finally {
      setTestingModelName(null);
    }
  };

  const moveModelInPriority = (idx: number, dir: -1 | 1) => {
    if (!settings?.modelPriority) return;
    const list = [...settings.modelPriority];
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    const [item] = list.splice(idx, 1);
    list.splice(target, 0, item);
    updateField('modelPriority', list);
    updateField('primaryModel', list[0]);
  };

  const toggleModelDisabled = (technicalName: string) => {
    if (!settings) return;
    const currentDisabled: string[] = Array.isArray(settings.disabledModels)
      ? settings.disabledModels
      : [];
    if (currentDisabled.includes(technicalName)) {
      updateField(
        'disabledModels',
        currentDisabled.filter((m) => m !== technicalName)
      );
    } else {
      updateField('disabledModels', [...currentDisabled, technicalName]);
    }
  };

  const addModelToPriority = (technicalName: string) => {
    if (!settings) return;
    const currentList: string[] = Array.isArray(settings.modelPriority)
      ? settings.modelPriority
      : [];
    if (!currentList.includes(technicalName)) {
      updateField('modelPriority', [...currentList, technicalName]);
    }
  };

  const removeModelFromPriority = (technicalName: string) => {
    if (!settings) return;
    const currentList: string[] = Array.isArray(settings.modelPriority)
      ? settings.modelPriority
      : [];
    const next = currentList.filter((m) => m !== technicalName);
    updateField('modelPriority', next);
    if (settings.primaryModel === technicalName && next.length > 0) {
      updateField('primaryModel', next[0]);
    }
  };

  const chatSuitableModels = catalog.filter((m) => m.isSuitableForChat);
  const chatUnsuitableModels = catalog.filter((m) => !m.isSuitableForChat);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[94vh] rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold">Merkezi Chatbot ve AI Yönetim Sistemi</h2>
                {settings && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      settings.isEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                    }`}
                  >
                    {settings.isEnabled ? 'Chatbot Aktif' : 'Chatbot Pasif'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                .env bağımsız Ana & Yedek Google API Anahtar Havuzu, Dinamik Model Keşfi, Akıllı Failover, Bilgi Kaynakları ve Bildirimler
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-1 shrink-0">
          {[
            { id: 'general', label: 'Genel Ayarlar', icon: Sliders },
            { id: 'keys', label: `API Anahtarları (${keys.length})`, icon: Key },
            { id: 'models', label: `Model & Öncelik (${chatSuitableModels.length || catalog.length})`, icon: Cpu },
            { id: 'knowledge', label: 'Bilgi Kaynakları', icon: Database },
            { id: 'notifications', label: 'Bildirim Ayarları', icon: Bell },
            { id: 'diagnostics', label: 'Durum ve Tanılama', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-xs font-bold transition ${
                  active
                    ? 'border-teal-600 bg-white text-teal-700 rounded-t-lg shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-t-lg'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Banner */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 rounded-xl border px-4 py-3 text-xs font-medium flex items-center justify-between gap-3 shrink-0 ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading || !settings ? (
            <div className="py-20 text-center text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin mx-auto mb-2 text-teal-600" />
              Merkezi yapılandırma yükleniyor...
            </div>
          ) : (
            <>
              {/* TAB 1: GENEL AYARLAR */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  {/* Active Toggle Card */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Chatbot Çalışma Durumu (Aktif / Pasif)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pasif yapıldığında ziyaretçi mesajları yine kaydedilir ancak yapay zekâ yanıt üretmez; müşteriye temsilci iletişim mesajı gösterilir.
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.isEnabled)}
                        onChange={(e) => updateField('isEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-12 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                    </label>
                  </div>

                  {/* Welcome Message & System Prompt */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Karşılama Mesajı (Sohbet Penceresi Açılış Mesajı)
                      </label>
                      <textarea
                        rows={2}
                        value={settings.welcomeMessage || ''}
                        onChange={(e) => updateField('welcomeMessage', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Temel Sistem Promptu (Kurumsal Rol Tanımı)
                      </label>
                      <textarea
                        rows={3}
                        value={settings.systemPrompt || ''}
                        onChange={(e) => updateField('systemPrompt', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ek Davranış Talimatları
                      </label>
                      <textarea
                        rows={3}
                        value={settings.extraInstructions || ''}
                        onChange={(e) => updateField('extraInstructions', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-600 focus:outline-none"
                      />
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
                        <ShieldCheck className="h-4 w-4 shrink-0" />
                        <span>
                          <strong>Çekirdek Güvenlik Koruması:</strong> Özel talimatlar; `/magaza` yasağını, uydurma fiyat/indirim engelini, ürün detay sayfası fiyat otoritesini ve `/profile` destek yönlendirme kurallarını devre dışı bırakamaz.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Behavioral Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Yanıt Üslubu (Ton)
                      </label>
                      <select
                        value={settings.tone || 'corporate'}
                        onChange={(e) => updateField('tone', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="corporate">Kurumsal, Güven Veren ve Profesyonel</option>
                        <option value="friendly">Samimi, Sıcak ve Yardımsever</option>
                        <option value="concise">Doğrudan, Kısa ve Madde İşaretli</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Dil Davranışı
                      </label>
                      <select
                        value={settings.languageBehavior || 'auto'}
                        onChange={(e) => updateField('languageBehavior', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="auto">Müşteri Dilini Otomatik Algıla (Varsayılan TR)</option>
                        <option value="tr_only">Yalnızca Türkçe Yanıt Ver</option>
                        <option value="tr_en">Türkçe ve İngilizce Destekle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Yanıt Uzunluğu
                      </label>
                      <select
                        value={settings.responseLength || 'medium'}
                        onChange={(e) => updateField('responseLength', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="short">Kısa (2-3 Cümle Özet)</option>
                        <option value="medium">Orta (Dengeli Açıklama)</option>
                        <option value="detailed">Detaylı (Kapsamlı Paket Karşılaştırmalı)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Belirsiz Sorularda Netleştirici Soru Sorma
                      </label>
                      <select
                        value={settings.clarifyingQuestionPolicy || 'proactive'}
                        onChange={(e) => updateField('clarifyingQuestionPolicy', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="proactive">Proaktif (Hangi ürün/paket olduğunu netleştir)</option>
                        <option value="minimal">Minimum (Yalnızca kritik belirsizlikte sor)</option>
                        <option value="disabled">Devre Dışı (Doğrudan genel bilgi ver)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cevabı Bulunamayan Kapsam İçi Sorularda Davranış
                      </label>
                      <select
                        value={settings.unansweredBehavior || 'ask_contact_and_log'}
                        onChange={(e) => updateField('unansweredBehavior', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="ask_contact_and_log">
                          İletişim Bilgisi İste, Cevapsız Sorulara Kaydet ve Ekibe Bildir
                        </option>
                        <option value="polite_decline">
                          Yalnızca Doğrulanmış Bilgileri Paylaş ve Temsilciye Yönlendir
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Satış / Destek Yönlendirme Önceliği
                      </label>
                      <select
                        value={settings.salesPriority || 'balanced'}
                        onChange={(e) => updateField('salesPriority', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="balanced">Dengeli (Bilgi + Satış Yönlendirmesi)</option>
                        <option value="sales_first">Satış Odaklı (Paket & Satın Alma Öncelikli)</option>
                        <option value="support_first">Destek Odaklı (Bilgi & Çözüm Öncelikli)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Model Seçim Politikası
                      </label>
                      <select
                        value={settings.modelSelectionPolicy || 'priority_order'}
                        onChange={(e) => updateField('modelSelectionPolicy', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="priority_order">Belirlenen Model Öncelik Sırasını Takip Et</option>
                        <option value="fastest">En Hızlı Kararlı Modelleri Önceliklendir (Flash)</option>
                        <option value="strongest">En Güçlü Kararlı Modelleri Önceliklendir (Pro/Flash 2.5)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tekil İstek Zaman Aşımı (ms)
                      </label>
                      <input
                        type="number"
                        min={3000}
                        max={60000}
                        step={1000}
                        value={settings.requestTimeoutMs || 15000}
                        onChange={(e) => updateField('requestTimeoutMs', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Toplam Yedek Geçiş Zaman Bütçesi (ms)
                      </label>
                      <input
                        type="number"
                        min={5000}
                        max={90000}
                        step={1000}
                        value={settings.totalTimeoutBudgetMs || 35000}
                        onChange={(e) => updateField('totalTimeoutBudgetMs', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GOOGLE API KEY YÖNETİMİ (ANA & YEDEK ANAHTAR HAVUZU) */}
              {activeTab === 'keys' && (
                <div className="space-y-6">
                  {/* Add New Key Form */}
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Plus className="h-4 w-4 text-teal-600" />
                          Yeni Google Gemini API Anahtarı Ekle (Ana veya Yedek)
                        </h3>
                        <p className="text-xs text-slate-600">
                          Anahtarlar veritabanında <strong>AES-256-GCM</strong> ile şifrelenerek saklanır. Farklı Google Cloud projelerine ait yedek anahtarlar ekleyerek proje bazlı kota aşımında kesintisiz devamlılık sağlayabilirsiniz.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Anahtar Adı
                        </label>
                        <input
                          type="text"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="Örn: Ana Üretim Anahtarı / Yedek Proje B"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Anahtar Rolü
                        </label>
                        <select
                          value={newKeyRole}
                          onChange={(e) => setNewKeyRole(e.target.value as 'PRIMARY' | 'BACKUP')}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
                        >
                          <option value="PRIMARY">Ana API Anahtarı (Birincil)</option>
                          <option value="BACKUP">Yedek API Anahtarı (Failover Havuzu)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Proje Etiketi (Kota Grubu)
                        </label>
                        <input
                          type="text"
                          value={newKeyProjectTag}
                          onChange={(e) => setNewKeyProjectTag(e.target.value)}
                          placeholder="Örn: gcp-project-1"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Google API Key *
                        </label>
                        <div className="relative">
                          <input
                            type={showNewKeyRaw ? 'text' : 'password'}
                            value={newKeyRaw}
                            onChange={(e) => setNewKeyRaw(e.target.value)}
                            placeholder="AIzaSy..."
                            autoComplete="off"
                            className="w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 py-2 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewKeyRaw((p) => !p)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showNewKeyRaw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddKey}
                        disabled={addingKey || !newKeyRaw.trim()}
                        className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50 transition"
                      >
                        {addingKey ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Doğrulanıyor ve Şifreleniyor...</span>
                          </>
                        ) : (
                          <>
                            <Key className="h-3.5 w-3.5" />
                            <span>Anahtarı Doğrula ve Güvenli Depoya Ekle</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Keys List Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">
                        Kayıtlı API Anahtarları (Ana ve Yedek Havuzu)
                      </h3>
                      <button
                        type="button"
                        onClick={handleResetCooldowns}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-teal-600" />
                        <span>Bekleme Sürelerini (Cooldown) Sıfırla</span>
                      </button>
                    </div>

                    {keys.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                        Henüz kayıtlı bir API anahtarı bulunmuyor. Yukarıdaki formdan Ana ve Yedek anahtarlarınızı ekleyebilirsiniz.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                            <tr>
                              <th className="px-3 py-3">Öncelik</th>
                              <th className="px-3 py-3">Anahtar Adı & Maskeli Kimlik</th>
                              <th className="px-3 py-3">Rol & Kaynak</th>
                              <th className="px-3 py-3">Proje Etiketi</th>
                              <th className="px-3 py-3">Durum</th>
                              <th className="px-3 py-3">Erişilebilir Model</th>
                              <th className="px-3 py-3">Son Test</th>
                              <th className="px-3 py-3 text-right">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {keys.map((k, idx) => (
                              <tr key={k.id} className="hover:bg-slate-50/80">
                                <td className="px-3 py-3 font-bold text-slate-700">
                                  <div className="flex items-center gap-1">
                                    <span>#{idx + 1}</span>
                                    {k.source === 'DB_VAULT' && (
                                      <div className="flex flex-col ml-1">
                                        <button
                                          type="button"
                                          onClick={() => handleMoveKeyPriority(idx, -1)}
                                          disabled={idx === 0}
                                          className="text-slate-400 hover:text-slate-800 disabled:opacity-25"
                                          title="Önceliği Artır"
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleMoveKeyPriority(idx, 1)}
                                          disabled={idx >= keys.filter((x) => x.source === 'DB_VAULT').length - 1}
                                          className="text-slate-400 hover:text-slate-800 disabled:opacity-25"
                                          title="Önceliği Azalt"
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <div className="font-bold text-slate-900">{k.name}</div>
                                  <div className="font-mono text-[11px] text-slate-500">
                                    {k.maskedPreview}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      k.role === 'PRIMARY'
                                        ? 'bg-teal-100 text-teal-800'
                                        : k.role === 'PRODUCT_EDIT'
                                          ? 'bg-indigo-100 text-indigo-800'
                                          : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {k.role === 'PRIMARY'
                                      ? '★ ANA ANAHTAR'
                                      : k.role === 'PRODUCT_EDIT'
                                        ? 'ÜRÜN DÜZENLEME'
                                        : 'YEDEK ANAHTAR'}
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {k.source === 'ENV' ? 'Ortam (.env)' : 'Şifreli Kasa (DB)'}
                                  </div>
                                </td>
                                <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                                  {k.projectTag}
                                </td>
                                <td className="px-3 py-3">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                      k.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : k.status === 'COOLDOWN'
                                          ? 'bg-amber-100 text-amber-800'
                                          : k.status === 'INVALID'
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {k.status}
                                  </span>
                                  {k.lastError && (
                                    <div
                                      className="text-[10px] text-rose-600 max-w-[180px] truncate mt-0.5"
                                      title={k.lastError}
                                    >
                                      {k.lastError}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3 font-semibold text-slate-700">
                                  {k.accessibleModelsCount || 0} model
                                </td>
                                <td className="px-3 py-3 text-[11px] text-slate-500">
                                  {k.lastTestAt
                                    ? new Date(k.lastTestAt).toLocaleString('tr-TR')
                                    : 'Henüz test edilmedi'}
                                  {k.lastTestResult && (
                                    <div className="font-semibold text-[10px]">
                                      Sonuç: {k.lastTestResult}
                                    </div>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleTestKey(k.id)}
                                      disabled={testingKeyId === k.id}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                      title="Anahtarı ve modelleri canlı test et"
                                    >
                                      {testingKeyId === k.id ? 'Test...' : 'Test Et'}
                                    </button>
                                    {k.source === 'DB_VAULT' && k.role !== 'PRIMARY' && (
                                      <button
                                        type="button"
                                        onClick={() => handlePromoteToPrimary(k)}
                                        className="rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100"
                                        title="Ana Chatbot Anahtarı Yap"
                                      >
                                        <Star className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {k.source === 'DB_VAULT' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleToggleKeyActive(k)}
                                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                                        >
                                          {k.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteKey(k.id)}
                                          className="rounded-lg p-1 text-rose-600 hover:bg-rose-50"
                                          title="Sil"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: MODEL KEŞFİ, ÖNCELİK SIRASI VE FALLBACK AYARLARI */}
              {activeTab === 'models' && (
                <div className="space-y-6">
                  {/* Top Bar: Primary Model & Refresh */}
                  <div className="flex items-center justify-between flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Dinamik Google Gemini Model Kataloğu ve Öncelik Sırası
                      </h3>
                      <p className="text-xs text-slate-500">
                        Son Katalog Güncellemesi:{' '}
                        {catalogUpdatedAt
                          ? new Date(catalogUpdatedAt).toLocaleString('tr-TR')
                          : 'Henüz keşfedilmedi'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefreshModelCatalog}
                      disabled={refreshingCatalog}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-500 disabled:opacity-50 transition"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingCatalog ? 'animate-spin' : ''}`} />
                      <span>
                        {refreshingCatalog
                          ? 'Tüm Sayfalar Taranıyor...'
                          : 'Modelleri Gemini API’den Yenile'}
                      </span>
                    </button>
                  </div>

                  {/* Generation & Failover Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ana (Birincil) Model
                      </label>
                      <select
                        value={settings.primaryModel || 'gemini-2.5-flash'}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateField('primaryModel', val);
                          const currentList: string[] = Array.isArray(settings.modelPriority)
                            ? settings.modelPriority
                            : [];
                          const without = currentList.filter((m) => m !== val);
                          updateField('modelPriority', [val, ...without]);
                        }}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold"
                      >
                        {(chatSuitableModels.length > 0
                          ? chatSuitableModels
                          : [
                              { technicalName: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' },
                              { technicalName: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro' },
                              { technicalName: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash' },
                              { technicalName: 'gemini-2.0-flash-lite', displayName: 'Gemini 2.0 Flash Lite' },
                            ]
                        ).map((m: any) => (
                          <option key={m.technicalName} value={m.technicalName}>
                            {m.displayName} ({m.technicalName})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Yaratıcılık / Sıcaklık (Temperature: {settings.temperature ?? 0.25})
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={settings.temperature ?? 0.25}
                        onChange={(e) => updateField('temperature', Number(e.target.value))}
                        className="w-full mt-2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Maksimum Çıktı Uzunluğu (Token)
                      </label>
                      <input
                        type="number"
                        min={128}
                        max={8192}
                        step={64}
                        value={settings.maxOutputTokens || 900}
                        onChange={(e) => updateField('maxOutputTokens', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-center gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(settings.autoFallbackEnabled)}
                          onChange={(e) => updateField('autoFallbackEnabled', e.target.checked)}
                          className="h-4 w-4 rounded text-teal-600"
                        />
                        <span>Otomatik Model Yedek Geçişi (Failover)</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(settings.allowBackupKeyFailover)}
                          onChange={(e) => updateField('allowBackupKeyFailover', e.target.checked)}
                          className="h-4 w-4 rounded text-teal-600"
                        />
                        <span>Yedek API Anahtarlarına Otomatik Geçiş</span>
                      </label>
                    </div>
                  </div>

                  {/* Active Priority Chain Ordering */}
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Aktif Model Yedek Geçiş (Failover) Öncelik Zinciri
                    </h4>
                    <div className="space-y-2">
                      {(settings.modelPriority || []).map((modelName: string, idx: number) => (
                        <div
                          key={modelName}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-600 text-white font-bold text-[11px]">
                              {idx + 1}
                            </span>
                            <span className="font-mono font-bold text-slate-900">{modelName}</span>
                            {idx === 0 && (
                              <span className="rounded bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                                Birincil Model
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => moveModelInPriority(idx, -1)}
                              disabled={idx === 0}
                              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              title="Yukarı Taşı"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveModelInPriority(idx, 1)}
                              disabled={idx === (settings.modelPriority?.length || 1) - 1}
                              className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              title="Aşağı Taşı"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeModelFromPriority(modelName)}
                              className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              Zincirden Çıkar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full Discovered Models Catalog Table */}
                  {chatSuitableModels.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Keşfedilen Tüm Uygun Modeller ({chatSuitableModels.length} Model)
                      </h4>
                      <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                            <tr>
                              <th className="px-3 py-2.5">Model Teknik Adı & Görünen Ad</th>
                              <th className="px-3 py-2.5">Öncelik Sınıfı & Sürüm</th>
                              <th className="px-3 py-2.5">Limitler</th>
                              <th className="px-3 py-2.5 text-right">İşlemler</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {chatSuitableModels.map((m) => {
                              const inPriority = (settings.modelPriority || []).includes(
                                m.technicalName
                              );
                              const isDisabled = (settings.disabledModels || []).includes(
                                m.technicalName
                              );
                              const testRes = modelTestResults[m.technicalName];

                              return (
                                <tr key={m.technicalName} className="hover:bg-slate-50">
                                  <td className="px-3 py-2.5">
                                    <div className="font-bold text-slate-900">{m.displayName}</div>
                                    <div className="font-mono text-[11px] text-slate-500">
                                      {m.technicalName}
                                    </div>
                                    {testRes && (
                                      <div
                                        className={`mt-1 text-[10px] font-semibold ${
                                          testRes.success ? 'text-emerald-700' : 'text-rose-600'
                                        }`}
                                      >
                                        Canlı Test: {testRes.message}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                      {m.stabilityTier}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      Sürüm: {m.version}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2.5 text-[11px] text-slate-600">
                                    Girdi: {m.inputTokenLimit?.toLocaleString('tr-TR')} / Çıktı:{' '}
                                    {m.outputTokenLimit?.toLocaleString('tr-TR')}
                                  </td>
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleTestSingleModel(m.technicalName)}
                                        disabled={testingModelName === m.technicalName}
                                        className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                                      >
                                        <Play className="h-3 w-3 text-teal-600" />
                                        <span>
                                          {testingModelName === m.technicalName
                                            ? 'Test...'
                                            : 'Test Et'}
                                        </span>
                                      </button>
                                      {!inPriority && !isDisabled && (
                                        <button
                                          type="button"
                                          onClick={() => addModelToPriority(m.technicalName)}
                                          className="rounded border border-teal-200 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:bg-teal-100"
                                        >
                                          + Zincire Ekle
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => toggleModelDisabled(m.technicalName)}
                                        className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                                          isDisabled
                                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                                            : 'border-slate-200 bg-white text-slate-600'
                                        }`}
                                      >
                                        {isDisabled ? 'Devre Dışı' : 'Aktif'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {chatUnsuitableModels.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowUnsupportedModels((p) => !p)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                      >
                        {showUnsupportedModels
                          ? 'Sohbet için uygun olmayan modelleri gizle'
                          : `Metin/Sohbet üretimi için uygun olmayan diğer modelleri göster (${chatUnsuitableModels.length} model)`}
                      </button>
                      {showUnsupportedModels && (
                        <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5 text-xs">
                          {chatUnsuitableModels.map((um) => (
                            <div
                              key={um.technicalName}
                              className="flex items-center justify-between border-b border-slate-200/70 pb-1 last:border-0"
                            >
                              <span className="font-mono text-slate-700">{um.technicalName}</span>
                              <span className="text-[11px] text-amber-700">
                                {um.suitabilityReason}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BİLGİ KAYNAKLARI AYARLARI */}
              {activeTab === 'knowledge' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Bilgi Tabanı Belgelerini Kullan (Knowledge Base)
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          `/admin/customer-service/knowledge-base` altındaki aktif belgeleri ve soru-cevapları kullanır.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.useKnowledgeBase)}
                        onChange={(e) => updateField('useKnowledgeBase', e.target.checked)}
                        className="h-5 w-5 rounded text-teal-600"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900">
                          Canlı Ürün ve Paket Sayfalarını Kullan (`/admin/products`)
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          AI Otomasyon ürün detay sayfalarındaki güncel paket ve fiyatları doğrudan kaynak alır (`/magaza` hariç).
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(settings.useProductPages)}
                        onChange={(e) => updateField('useProductPages', e.target.checked)}
                        className="h-5 w-5 rounded text-teal-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Ürün Algılama Hassasiyeti
                      </label>
                      <select
                        value={settings.productDetectionSensitivity || 'balanced'}
                        onChange={(e) =>
                          updateField('productDetectionSensitivity', e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium"
                      >
                        <option value="strict">Sıkı (Yalnızca tam ürün adı eşleşmesi)</option>
                        <option value="balanced">Dengeli (Önerilen)</option>
                        <option value="broad">Geniş (Genel katalog sorularında öner)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Maksimum Bilgi Parçası (Top-K Chunk)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={settings.maxRetrievalChunks || 5}
                        onChange={(e) => updateField('maxRetrievalChunks', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Minimum Eşleşme Puanı Eşiği
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={settings.minRelevanceScore ?? 1}
                        onChange={(e) => updateField('minRelevanceScore', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Katalog Önbellek Süresi (Saniye)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={3600}
                        value={settings.cacheTtlSeconds || 120}
                        onChange={(e) => updateField('cacheTtlSeconds', Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.flagSourceConflicts)}
                        onChange={(e) => updateField('flagSourceConflicts', e.target.checked)}
                        className="h-4 w-4 rounded text-teal-600"
                      />
                      <div>
                        <div className="font-bold text-slate-800">
                          Kaynak Çakışmalarında Ürün Detay Sayfasını Otorite Kabul Et
                        </div>
                        <div className="text-slate-500">
                          Bilgi tabanı metni ile ürün sayfası fiyatı çelişirse daima ürün sayfasındaki güncel fiyatı kullanır.
                        </div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.safeContextSanitization)}
                        onChange={(e) => updateField('safeContextSanitization', e.target.checked)}
                        className="h-4 w-4 rounded text-teal-600"
                      />
                      <div>
                        <div className="font-bold text-slate-800">
                          Güvenli Bağlam Temizleme (Prompt Injection Koruması)
                        </div>
                        <div className="text-slate-500">
                          Belgelerden gelen metinleri modele aktarmadan önce zararlı komut kalıplarından arındırır.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 5: BİLDİRİM AYARLARI */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Bildirim Alıcı E-Posta Adresi
                      </label>
                      <input
                        type="email"
                        value={settings.recipientEmail || 'cicekanareklam@gmail.com'}
                        onChange={(e) => updateField('recipientEmail', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Gönderici E-Posta Adresi
                      </label>
                      <input
                        type="email"
                        value={settings.senderEmail || 'cicekanareklam@gmail.com'}
                        onChange={(e) => updateField('senderEmail', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        key: 'notifyOnFirstMessage',
                        title: 'Yeni Müşteri Görüşmesi (İlk Mesaj) Bildirimi',
                        desc: 'Ziyaretçi ilk gerçek mesajını gönderdiğinde konuşma başına 1 kez bildirim gönderilir.',
                      },
                      {
                        key: 'notifyOnUnansweredQuestion',
                        title: 'Cevapsız / Takip Gereken Ürün Sorusu Bildirimi',
                        desc: 'Kapsam içi bir ürün sorusunun yanıtı bilgi kaynaklarında bulunamadığında bildirim gönderilir.',
                      },
                      {
                        key: 'notifyOnContactShared',
                        title: 'Müşteri İletişim Bilgisi Paylaşımı Bildirimi',
                        desc: 'Ziyaretçi sohbet içinde telefon veya e-posta adresini paylaştığında anında bildirilir.',
                      },
                      {
                        key: 'notifyOnSalesOpportunity',
                        title: 'Yeni Satış Fırsatı / Özel Teklif Talebi Bildirimi',
                        desc: 'Yüksek satın alma niyeti veya kurumsal teklif taleplerinde bildirim gönderilir.',
                      },
                      {
                        key: 'notifyOnSupportEscalation',
                        title: 'Teknik Destek / Temsilci Devir Bildirimi',
                        desc: 'Mevcut müşteri teknik destek veya canlı temsilci talep ettiğinde bildirilir.',
                      },
                      {
                        key: 'notifyOnSystemError',
                        title: 'AI Sistem / Model / Anahtar Kesintisi Uyarısı',
                        desc: 'Tüm ana ve yedek API anahtarları hata verdiğinde yöneticiye uyarı e-postası gönderilir.',
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 cursor-pointer"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{item.title}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={Boolean(settings[item.key])}
                          onChange={(e) => updateField(item.key, e.target.checked)}
                          className="h-4 w-4 rounded text-teal-600 mt-0.5"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: DURUM VE TANILAMA (DIAGNOSTICS) */}
              {activeTab === 'diagnostics' && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase text-slate-500">
                        Aktif Ana Anahtar
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {diagnostics?.activePrimaryKey?.name || 'Tanımlanmamış'}
                      </div>
                      <div className="font-mono text-xs text-teal-700 mt-0.5">
                        {diagnostics?.activePrimaryKey?.maskedPreview || '—'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase text-slate-500">
                        Yedek Anahtar Havuzu
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {diagnostics?.activeBackupKeysCount || 0} Aktif /{' '}
                        {diagnostics?.backupKeysCount || 0} Toplam
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Otomatik geçiş: {settings.allowBackupKeyFailover ? 'Açık' : 'Kapalı'}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase text-slate-500">
                        Aktif Birincil Model
                      </div>
                      <div className="text-sm font-bold font-mono text-slate-900 mt-1">
                        {settings.primaryModel}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {diagnostics?.chatSuitableModelsCount || 0} uygun model keşfedildi
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-[11px] font-semibold uppercase text-slate-500">
                        Aktif Bilgi Kaynakları
                      </div>
                      <div className="text-sm font-bold text-slate-900 mt-1">
                        {diagnostics?.activePlansCount || 0} Ürün /{' '}
                        {diagnostics?.knowledgeDocsCount || 0} KB Belgesi
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        E-posta Kaydı: {diagnostics?.recentEmailLogsCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Circuit Breaker Cooldown Status */}
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Devre Kesici (Circuit Breaker) & Cooldown Durumu
                      </h4>
                      <button
                        type="button"
                        onClick={handleResetCooldowns}
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
                        Tüm Kilitleri Temizle
                      </button>
                    </div>
                    {Object.keys(circuitBreaker?.keyCooldowns || {}).length === 0 &&
                    Object.keys(circuitBreaker?.projectCooldowns || {}).length === 0 &&
                    Object.keys(circuitBreaker?.modelCooldowns || {}).length === 0 ? (
                      <p className="text-xs text-emerald-700">
                        ✓ Şu anda bekleme süresinde (cooldown) olan hiçbir anahtar, proje veya model bulunmuyor.
                      </p>
                    ) : (
                      <div className="space-y-1.5 text-xs">
                        {Object.entries(circuitBreaker?.projectCooldowns || {}).map(
                          ([proj, info]: [string, any]) => (
                            <div
                              key={proj}
                              className="rounded bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-900"
                            >
                              <strong>Proje Cooldown ({proj}):</strong> {info.reason} (Bitiş:{' '}
                              {new Date(info.until).toLocaleTimeString('tr-TR')})
                            </div>
                          )
                        )}
                        {Object.entries(circuitBreaker?.modelCooldowns || {}).map(
                          ([mKey, info]: [string, any]) => (
                            <div
                              key={mKey}
                              className="rounded bg-slate-100 border border-slate-200 px-3 py-1.5 text-slate-700"
                            >
                              <strong>Model Cooldown ({mKey}):</strong> {info.reason} (Bitiş:{' '}
                              {new Date(info.until).toLocaleTimeString('tr-TR')})
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recent Failover Events */}
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Son Yedek Geçiş (Failover) ve Tanılama Olayları
                    </h4>
                    {recentEvents.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Henüz kaydedilmiş bir hata veya yedek geçiş olayı bulunmuyor.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                        {recentEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                [{ev.context}] {ev.eventType}
                              </span>{' '}
                              <span className="font-mono text-slate-500">
                                ({ev.keyName} / {ev.modelName})
                              </span>
                              <p className="text-slate-600 mt-0.5">{ev.message}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(ev.timestamp).toLocaleString('tr-TR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent Audit Logs */}
                  <div className="rounded-xl border border-slate-200 p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Güvenlik ve Denetim Kayıtları (Audit Logs)
                    </h4>
                    {auditLogs.length === 0 ? (
                      <p className="text-xs text-slate-500">Henüz denetim kaydı bulunmuyor.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                        {auditLogs.map((log) => (
                          <div
                            key={log.id}
                            className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">{log.action}:</span>{' '}
                              <span className="text-slate-600">{log.details}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {new Date(log.timestamp).toLocaleString('tr-TR')} • {log.actor}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Kapat
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-500 disabled:opacity-50 transition"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Tüm Chatbot Ayarlarını Kaydet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

