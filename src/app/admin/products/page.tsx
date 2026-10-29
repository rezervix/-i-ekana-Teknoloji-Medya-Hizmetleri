'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  History,
  ImagePlus,
  Key,
  Loader2,
  Lock,
  MessageCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Monitor,
  Trash2,
  X,
  AlertTriangle,
  Info,
  Sparkles,
  UploadCloud,
  FileText,
  Settings,
  Copy,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { PLAN_ICON_NAMES, getPlanIcon } from '@/lib/plan-icons';
import AiProductEditModal from '@/components/admin/AiProductEditModal';

// ─── TİP TANIMLARI ────────────────────────────────────────────────────────────

type Tier = {
  id?: string;
  name: string;
  description?: string | null;
  priceMonthly: number; // TL cinsinden formda, API'de cent
  badge: string | null;
  isRecommended: boolean;
  vatNote?: string | null;
  renewalNote?: string | null;
  buttonText?: string | null;
  displayOrder: number;
  isActive: boolean;
  features: string[];
  comparisonFeatures?: Array<{ key: string; value?: string; included: boolean }>;
};

type Item = {
  icon?: string;
  title: string;
  description: string;
  order?: number;
  badge?: string;
};

type DemoScreenshot = {
  url: string;
  caption: string;
  alt: string;
  order?: number;
};

type TrustBlock = {
  key: string;
  title: string;
  text: string;
  icon: string;
  isEnabled: boolean;
};

type Faq = {
  question: string;
  answer: string;
  order?: number;
};

type PlanVersion = {
  id: string;
  versionNumber: number;
  title: string | null;
  createdAt: string;
  createdBy: string | null;
};

type Plan = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  cardSummary: string | null;
  category: string | null;
  isListed: boolean;
  isFeatured: boolean;
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt: string | null;
  draftData: any;

  tagline: string | null;
  heroHeadline: string | null;
  heroSubheadline: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  heroMockupUrl: string | null;
  heroImageAlt: string | null;
  showStartingPrice: boolean;
  imageUrl: string | null;

  trustPoints: string[];
  stats: Array<{ value: string; label: string }>;
  benefits: Item[];
  highlights: Item[];
  steps: Item[];
  demoScreenshots: DemoScreenshot[];
  trustBlocks: TrustBlock[];
  comparisonFeatureKeys: Array<{ key: string; label: string; order: number }>;
  faqs: Faq[];

  vatNote: string | null;
  disclaimer: string | null;
  isActive: boolean;
  displayOrder: number;
  updatedAt: string;

  whatsappNumber: string | null;
  whatsappTemplate: string | null;
  isDemoFormActive: boolean;

  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;

  sectionVisibility: {
    hero: boolean;
    benefits: boolean;
    steps: boolean;
    demoScreenshots: boolean;
    pricing: boolean;
    trustBlocks: boolean;
    faqs: boolean;
    whatsappCta: boolean;
  };

  tiers: Tier[];
  versions?: PlanVersion[];
};

// ─── VARSAYILAN ŞABLONLAR ──────────────────────────────────────────────────────

const DEFAULT_TRUST_BLOCKS: TrustBlock[] = [
  {
    key: 'setup_time',
    title: '24 Saat İçinde Kurulum',
    text: 'Ekibimiz tüm teknik entegrasyonu ve yapılandırmayı 24 saat içinde tamamlar, sisteminizi hemen kullanmaya başlarsınız.',
    icon: 'Clock',
    isEnabled: true,
  },
  {
    key: 'support',
    title: 'Kesintisiz Uzman Desteği',
    text: 'Her adımda yanınızda olan dedike müşteri temsilciniz ve 7/24 teknik destek hattımızla işiniz asla aksamaz.',
    icon: 'Headphones',
    isEnabled: true,
  },
  {
    key: 'security',
    title: 'KVKK & Kurumsal Veri Güvenliği',
    text: 'Tüm müşteri verileriniz ve görüşme kayıtlarınız 256-bit SSL şifreleme ve KVKK standartlarında güvenle korunur.',
    icon: 'ShieldCheck',
    isEnabled: true,
  },
  {
    key: 'cancel_policy',
    title: 'Taahhütsüz & Kolay İptal',
    text: 'Yıllık bağlayıcı taahhüt zorunluluğu yoktur; dilediğiniz zaman tek tıkla aboneliğinizi sonlandırabilirsiniz.',
    icon: 'Lock',
    isEnabled: true,
  },
  {
    key: 'pricing_transparency',
    title: 'Şeffaf Yenileme & Sabit Fiyat',
    text: 'Gizli maliyet veya sürpriz kurulum bedeli bulunmaz; her ay şeffaf fatura ile sabit fiyat garantisi sunulur.',
    icon: 'CheckCircle2',
    isEnabled: true,
  },
];

const DEFAULT_SECTION_VISIBILITY = {
  hero: true,
  benefits: true,
  steps: true,
  demoScreenshots: true,
  pricing: true,
  trustBlocks: true,
  faqs: true,
  whatsappCta: true,
};

const emptyTier = (displayOrder = 0): Tier => ({
  name: '',
  description: '',
  priceMonthly: 0,
  badge: '',
  isRecommended: false,
  vatNote: '+ %20 KDV',
  renewalNote: 'Aylık yenilenir, dilediğiniz an tek tıkla iptal edilebilir.',
  buttonText: '',
  displayOrder,
  isActive: true,
  features: [''],
  comparisonFeatures: [],
});

const emptyForm: Plan = {
  id: '',
  name: '',
  slug: '',
  shortDescription: '',
  cardSummary: '',
  category: 'Yapay Zeka & Otomasyon',
  isListed: true,
  isFeatured: false,
  status: 'DRAFT',
  publishedAt: null,
  draftData: null,

  tagline: '',
  heroHeadline: '',
  heroSubheadline: '',
  primaryCtaLabel: 'Paketleri İncele',
  primaryCtaUrl: '#paketler',
  secondaryCtaLabel: '',
  secondaryCtaUrl: '',
  heroMockupUrl: '',
  heroImageAlt: '',
  showStartingPrice: true,
  imageUrl: '',

  trustPoints: [],
  stats: [],
  benefits: [],
  highlights: [],
  steps: [],
  demoScreenshots: [],
  trustBlocks: DEFAULT_TRUST_BLOCKS,
  comparisonFeatureKeys: [],
  faqs: [],

  vatNote: '',
  disclaimer: '',
  isActive: true,
  displayOrder: 0,
  updatedAt: '',

  whatsappNumber: '+90 530 341 21 56',
  whatsappTemplate: 'Merhaba, {ürün} hakkında bilgi ve canlı demo almak istiyorum.',
  isDemoFormActive: false,

  metaTitle: '',
  metaDescription: '',
  ogImageUrl: '',

  sectionVisibility: DEFAULT_SECTION_VISIBILITY,
  tiers: [emptyTier(0)],
};

const slugify = (value: string) =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c)
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ─── YARDIMCI BİLEŞENLER ───────────────────────────────────────────────────────

function FieldHelp({ text, example }: { text: string; example?: string }) {
  return (
    <p className="mt-1 text-xs text-slate-500 leading-relaxed">
      {text}
      {example ? (
        <span className="block text-slate-400 font-mono mt-0.5">Örnek: {example}</span>
      ) : null}
    </p>
  );
}

function CharCounter({ current, max }: { current: number; max: number }) {
  const isOver = current > max;
  return (
    <span
      className={`text-xs font-semibold tabular-nums ${
        isOver
          ? 'text-rose-600 font-bold'
          : current > max * 0.85
            ? 'text-amber-600'
            : 'text-slate-400'
      }`}
    >
      {current}/{max} karakter
      {isOver ? ' (Sınır aşıldı!)' : ''}
    </span>
  );
}

function IconPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const Icon = getPlanIcon(value);
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-corp-teal">
        <Icon size={20} />
      </div>
      <select
        value={value || 'Sparkles'}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-medium text-slate-700 outline-none focus:border-corp-teal focus:ring-1 focus:ring-corp-teal"
      >
        {PLAN_ICON_NAMES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── ANA SAYFA BİLEŞENİ ────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Editör Durumları
  const [editing, setEditing] = useState<Plan | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [form, setForm] = useState<Plan>(emptyForm);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Modallar
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // AI ile Ürün İçe Aktarma Durumları
  const [aiImportModalOpen, setAiImportModalOpen] = useState(false);
  const [aiImportFile, setAiImportFile] = useState<File | null>(null);
  const [aiImportLoading, setAiImportLoading] = useState(false);
  const [aiImportError, setAiImportError] = useState('');
  const [aiImportWarnings, setAiImportWarnings] = useState<string[]>([]);
  const [aiImportDiagnostics, setAiImportDiagnostics] = useState<any | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [copiedDiagId, setCopiedDiagId] = useState(false);

  // Gemini API Anahtarı Yönetimi
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaving, setApiKeySaving] = useState(false);
  const [apiKeySavedSuccess, setApiKeySavedSuccess] = useState(false);
  const [apiKeyTesting, setApiKeyTesting] = useState(false);
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{
    success: boolean;
    message: string;
    discoveredCount?: number;
    activeCount?: number;
  } | null>(null);

  // AI Model & Fallback Ayarları Durumları
  const [aiSettingsModalOpen, setAiSettingsModalOpen] = useState(false);
  const [aiSettingsData, setAiSettingsData] = useState<any>(null);
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false);
  const [aiSettingsSaving, setAiSettingsSaving] = useState(false);
  const [aiSettingsTesting, setAiSettingsTesting] = useState(false);
  const [aiTestResults, setAiTestResults] = useState<any>(null);
  const [aiSettingsSuccess, setAiSettingsSuccess] = useState('');
  const [aiSettingsError, setAiSettingsError] = useState('');
  const [aiEditTargetProduct, setAiEditTargetProduct] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);

  // AI Ayarlarını Sunucudan Çek
  async function loadAiSettings() {
    setAiSettingsLoading(true);
    setAiSettingsError('');
    try {
      const res = await fetch('/api/admin/products/ai-settings');
      const data = await res.json();
      if (res.ok) {
        setAiSettingsData(data);
        if (data.apiKey) {
          setGeminiApiKey(data.apiKey);
          try {
            localStorage.removeItem('admin_gemini_api_key');
          } catch {}
        }
      } else {
        setAiSettingsError(data.error || 'AI ayarları yüklenemedi.');
      }
    } catch {
      setAiSettingsError('Sunucu bağlantısı sırasında hata oluştu.');
    } finally {
      setAiSettingsLoading(false);
    }
  }

  // API Anahtarını Veritabanına ve LocalStorage'a Kaydet
  async function handleSaveApiKey(explicitKey?: string) {
    const keyToSave = (explicitKey !== undefined ? explicitKey : geminiApiKey).trim();
    if (!keyToSave) {
      setApiKeyTestResult({
        success: false,
        message: 'Lütfen bir Google Gemini API anahtarı girin.',
      });
      return;
    }

    setApiKeySaving(true);
    setApiKeySavedSuccess(false);
    setApiKeyTestResult(null);

    try {
      // LocalStorage'a hemen kaydet (istemci tarafı hemen hatırlar)
      try {
        localStorage.removeItem('admin_gemini_api_key');
      } catch {}

      // Veritabanına kaydet
      const res = await fetch('/api/admin/products/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: keyToSave,
          ...(aiSettingsData?.settings || {}),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setApiKeySavedSuccess(true);
        setAiSettingsData((prev: any) => ({
          ...prev,
          keyConfigured: true,
          keyPreview: data.keyPreview,
          keySource: 'DATABASE',
          apiKey: keyToSave,
          settings: data.settings || prev?.settings,
        }));
        setTimeout(() => setApiKeySavedSuccess(false), 4000);
      } else {
        setApiKeyTestResult({
          success: false,
          message: data.error || 'API anahtarı veritabanına kaydedilemedi.',
        });
      }
    } catch {
      setApiKeyTestResult({
        success: false,
        message: 'Sunucuya bağlanırken hata oluştu.',
      });
    } finally {
      setApiKeySaving(false);
    }
  }

  // Canlı Model ve Bağlantı Testi (Özel veya Kayıtlı Key ile)
  async function handleTestApiKey(explicitKey?: string) {
    const keyToTest = (explicitKey !== undefined ? explicitKey : geminiApiKey).trim();
    setApiKeyTesting(true);
    setApiKeyTestResult(null);

    try {
      const res = await fetch('/api/admin/products/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (data.success) {
        const activeCount = data.results?.filter((r: any) => r.status === 'ACTIVE').length || 0;
        setApiKeyTestResult({
          success: true,
          message: `Bağlantı başarılı! Google Gemini API aktif (${activeCount} doğrulanmış model hazır).`,
          discoveredCount: data.discoveredModelsCount,
          activeCount,
        });
        setAiTestResults(data);
      } else {
        const firstErr =
          data.results?.find((r: any) => r.errorSummary)?.errorSummary ||
          data.error ||
          'API anahtarı doğrulanamadı veya yetkisiz.';
        setApiKeyTestResult({
          success: false,
          message: firstErr,
        });
      }
    } catch {
      setApiKeyTestResult({
        success: false,
        message: 'Bağlantı testi sırasında sunucuya erişilemedi.',
      });
    } finally {
      setApiKeyTesting(false);
    }
  }

  // AI Ayarlarını Kaydet
  async function saveAiSettings() {
    if (!aiSettingsData?.settings) return;
    setAiSettingsSaving(true);
    setAiSettingsSuccess('');
    setAiSettingsError('');
    try {
      const res = await fetch('/api/admin/products/ai-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...aiSettingsData.settings,
          apiKey: geminiApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiSettingsSuccess('AI model ve fallback ayarları başarıyla kaydedildi.');
        setAiSettingsData((prev: any) => ({
          ...prev,
          settings: data.settings,
          keyConfigured: data.keyConfigured,
          keyPreview: data.keyPreview,
        }));
        setTimeout(() => setAiSettingsSuccess(''), 4000);
      } else {
        setAiSettingsError(data.error || 'Ayarlar kaydedilemedi.');
      }
    } catch {
      setAiSettingsError('Bağlantı hatası oluştu.');
    } finally {
      setAiSettingsSaving(false);
    }
  }

  // Canlı Model ve Bağlantı Testi
  async function testAiConnection() {
    setAiSettingsTesting(true);
    setAiTestResults(null);
    setAiSettingsError('');
    try {
      const res = await fetch('/api/admin/products/ai-settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKey.trim() || undefined }),
      });
      const data = await res.json();
      setAiTestResults(data);
    } catch {
      setAiSettingsError('Bağlantı testi sırasında hata oluştu.');
    } finally {
      setAiSettingsTesting(false);
    }
  }

  // Verileri Yükle
  async function loadPlans() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (res.ok) setPlans(data);
      else setError(data.error ?? 'Hizmetler yüklenemedi');
    } catch {
      setError('Bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
    try {
      localStorage.removeItem('admin_gemini_api_key');
    } catch {}
    void loadAiSettings();
  }, []);

  // AI ile Dokümandan Ürün Oluştur
  async function handleAiImport() {
    if (!aiImportFile || aiImportLoading) {
      if (!aiImportFile) setAiImportError('Lütfen analiz edilecek bir doküman dosyası seçin.');
      return;
    }

    setAiImportLoading(true);
    setAiImportError('');
    setAiImportWarnings([]);
    setAiImportDiagnostics(null);
    setShowTechnicalDetails(false);

    try {
      const data = new FormData();
      data.append('file', aiImportFile);
      if (geminiApiKey.trim()) {
        data.append('apiKey', geminiApiKey.trim());
      }

      const res = await fetch('/api/admin/products/ai-import', {
        method: 'POST',
        body: data,
      });

      const result = await res.json();

      if (!res.ok) {
        setAiImportError(result.error || 'Doküman analizi başarısız oldu.');
        if (result.diagnostics) {
          setAiImportDiagnostics(result.diagnostics);
        }
        setAiImportLoading(false);
        return;
      }

      if (result.plan) {
        // AI çıktısını forma aktar
        setForm({
          ...emptyForm,
          ...result.plan,
          // İş Kuralı: Fiyat ve Logo alanlarını kesinlikle manuel bırak (0 / '')
          priceMonthly: 0,
          imageUrl: '',
          heroMockupUrl: '',
        });
        setEditing(null); // Yeni kayıt
        setSlugManuallyEdited(true);
        setActiveTab('general');
        setIsEditorOpen(true);
        setAiImportModalOpen(false);

        if (result.diagnostics?.status === 'FALLBACK_SUCCESS') {
          setSuccessMsg(
            `AI doküman analizi tamamlandı! Birincil model yanıt vermediğinden akıllı fallback '${result.diagnostics.resolvedModel}' modelini kullandı. Form alanları başarıyla dolduruldu.`
          );
        } else {
          setSuccessMsg(
            'AI doküman analizi tamamlandı! Ürün bilgileri form alanlarına yerleştirildi. Logo görselini yükleyip fiyat paketlerini manuel olarak belirledikten sonra kaydedebilirsiniz.'
          );
        }

        if (result.warnings && result.warnings.length > 0) {
          setAiImportWarnings(result.warnings);
        }
      }
    } catch (err: any) {
      setAiImportError('Sunucu bağlantısı sırasında bir hata oluştu.');
      setAiImportDiagnostics({
        category: 'UNKNOWN',
        userExplanation: 'Sunucuya ulaşılamadı veya ağ bağlantısı koptu.',
        suggestedAction: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
        technicalDetail: err?.message || 'Ağ bağlantı hatası',
        attempts: [],
        durationTotalMs: 0,
      });
    } finally {
      setAiImportLoading(false);
    }
  }

  // Form Güncelleme
  const update = <K extends keyof Plan>(key: K, value: Plan[K]) => {
    setForm((curr) => ({ ...curr, [key]: value }));
  };

  const updateSectionVisibility = (key: keyof Plan['sectionVisibility'], val: boolean) => {
    setForm((curr) => ({
      ...curr,
      sectionVisibility: { ...curr.sectionVisibility, [key]: val },
    }));
  };

  // Yeni veya Düzenleme Modu Aç
  function openForm(plan?: Plan) {
    if (plan) {
      setEditing(plan);
      // Eğer yayınlanmamış taslak (draftData) varsa onu forma yükle
      const sourceData =
        plan.draftData && typeof plan.draftData === 'object'
          ? { ...plan, ...plan.draftData }
          : plan;

      setForm({
        ...emptyForm,
        ...sourceData,
        id: plan.id,
        name: sourceData.name || plan.name,
        slug: sourceData.slug || plan.slug,
        cardSummary: sourceData.cardSummary ?? '',
        category: sourceData.category ?? 'Yapay Zeka & Otomasyon',
        tagline: sourceData.tagline ?? '',
        heroHeadline: sourceData.heroHeadline ?? '',
        heroSubheadline: sourceData.heroSubheadline ?? '',
        primaryCtaLabel: sourceData.primaryCtaLabel ?? 'Paketleri İncele',
        primaryCtaUrl: sourceData.primaryCtaUrl ?? '#paketler',
        secondaryCtaLabel: sourceData.secondaryCtaLabel ?? '',
        secondaryCtaUrl: sourceData.secondaryCtaUrl ?? '',
        heroMockupUrl: sourceData.heroMockupUrl ?? '',
        heroImageAlt: sourceData.heroImageAlt ?? '',
        imageUrl: sourceData.imageUrl ?? '',
        vatNote: sourceData.vatNote ?? '',
        disclaimer: sourceData.disclaimer ?? '',
        whatsappNumber: sourceData.whatsappNumber ?? '+90 530 341 21 56',
        whatsappTemplate:
          sourceData.whatsappTemplate ??
          'Merhaba, {ürün} hakkında bilgi ve canlı demo almak istiyorum.',
        metaTitle: sourceData.metaTitle ?? '',
        metaDescription: sourceData.metaDescription ?? '',
        ogImageUrl: sourceData.ogImageUrl ?? '',
        trustPoints: Array.isArray(sourceData.trustPoints) ? sourceData.trustPoints : [],
        stats: Array.isArray(sourceData.stats) ? sourceData.stats : [],
        benefits: Array.isArray(sourceData.benefits) ? sourceData.benefits : [],
        highlights: Array.isArray(sourceData.highlights) ? sourceData.highlights : [],
        steps: Array.isArray(sourceData.steps) ? sourceData.steps : [],
        demoScreenshots: Array.isArray(sourceData.demoScreenshots)
          ? sourceData.demoScreenshots
          : [],
        trustBlocks:
          Array.isArray(sourceData.trustBlocks) && sourceData.trustBlocks.length > 0
            ? sourceData.trustBlocks
            : DEFAULT_TRUST_BLOCKS,
        comparisonFeatureKeys: Array.isArray(sourceData.comparisonFeatureKeys)
          ? sourceData.comparisonFeatureKeys
          : [],
        faqs: Array.isArray(sourceData.faqs) ? sourceData.faqs : [],
        sectionVisibility: {
          ...DEFAULT_SECTION_VISIBILITY,
          ...(sourceData.sectionVisibility || {}),
        },
        tiers: sourceData.tiers?.map((t: any) => ({
          ...t,
          priceMonthly: t.priceMonthly > 1000 ? t.priceMonthly / 100 : t.priceMonthly,
          description: t.description ?? '',
          badge: t.badge ?? '',
          vatNote: t.vatNote ?? '+ %20 KDV',
          renewalNote:
            t.renewalNote ?? 'Aylık yenilenir, dilediğiniz an tek tıkla iptal edilebilir.',
          buttonText: t.buttonText ?? '',
          features: Array.isArray(t.features) ? t.features : [],
          comparisonFeatures: Array.isArray(t.comparisonFeatures) ? t.comparisonFeatures : [],
        })) ?? [emptyTier(0)],
      });
      setSlugManuallyEdited(true);
    } else {
      setEditing(null);
      setForm(emptyForm);
      setSlugManuallyEdited(false);
    }
    setActiveTab('general');
    setIsEditorOpen(true);
    setError('');
    setSuccessMsg('');
  }

  // Görsel Yükleme (Sharp ile WebP'ye dönüştürür ve optimize eder)
  async function uploadImage(file: File, targetField: string, callback?: (url: string) => void) {
    if (!file.type.startsWith('image/')) {
      setError('Lütfen geçerli bir görsel dosyası seçin (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Görsel boyutu en fazla 5 MB olabilir.');
      return;
    }
    setUploadingField(targetField);
    setError('');

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/plans/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Görsel yüklenemedi');

      if (callback) {
        callback(data.url);
      } else {
        update(targetField as any, data.url);
      }
      setSuccessMsg('Görsel başarıyla optimize edilip yüklendi!');
    } catch (err: any) {
      setError(err.message || 'Görsel yüklenirken bir hata oluştu.');
    } finally {
      setUploadingField(null);
    }
  }

  // Taslak Olarak Kaydet (Canlı sayfayı bozmaz)
  async function saveDraft() {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        saveAsDraft: true,
        tiers: form.tiers.map((t, i) => ({
          ...t,
          priceMonthly: Number(t.priceMonthly),
          displayOrder: i,
          buttonText: t.buttonText || `${t.name} Aboneliğini Başlat`,
        })),
      };

      const url = editing ? `/api/admin/plans/${editing.id}` : '/api/admin/plans';
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Taslak kaydedilemedi');

      setSuccessMsg('Taslak değişiklikler güvenle kaydedildi! Henüz canlıya alınmadı.');
      await loadPlans();
      if (!editing && data.id) {
        setEditing(data);
      }
    } catch (err: any) {
      setError(err.message || 'Taslak kaydetme hatası');
    } finally {
      setSaving(false);
    }
  }

  // Canlıda Yayınla (Değişiklikleri aktarır, snapshot kaydeder)
  async function publishPlan() {
    setError('');
    setPublishing(true);

    // Temel doğrulamalar
    if (!form.name.trim()) {
      setError('Hizmet adı zorunludur.');
      setPublishing(false);
      return;
    }
    if (form.benefits.length > 0 && form.benefits.length < 3) {
      setError('Fayda kartları eklenecekse en az 3 adet girilmelidir.');
      setPublishing(false);
      return;
    }
    if (form.steps.length > 0 && form.steps.length < 3) {
      setError('Nasıl çalışır adımları eklenecekse en az 3 adım girilmelidir.');
      setPublishing(false);
      return;
    }

    try {
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        status: 'PUBLISHED',
        saveAsDraft: false,
        tiers: form.tiers.map((t, i) => ({
          ...t,
          priceMonthly: Number(t.priceMonthly),
          displayOrder: i,
          buttonText: t.buttonText || `${t.name} Aboneliğini Başlat`,
        })),
      };

      const url = editing ? `/api/admin/plans/${editing.id}` : '/api/admin/plans';
      const method = editing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Yayınlama başarısız oldu');

      setSuccessMsg('Tebrikler! Hizmet başarıyla YAYINLANDI ve yeni bir sürüm kaydı oluşturuldu.');
      await loadPlans();
      if (!editing && data.id) {
        setEditing(data);
      }
    } catch (err: any) {
      setError(err.message || 'Yayınlama hatası');
    } finally {
      setPublishing(false);
    }
  }

  // Sürümleri Getir
  async function openVersionHistory() {
    if (!editing) return;
    setLoadingVersions(true);
    setHistoryOpen(true);
    try {
      const res = await fetch(`/api/admin/plans/${editing.id}/versions`);
      const data = await res.json();
      if (res.ok) setVersions(data);
    } catch {
      setError('Sürüm geçmişi alınamadı');
    } finally {
      setLoadingVersions(false);
    }
  }

  // Sürüme Geri Dön (Rollback)
  async function rollbackToVersion(versionId: string) {
    if (!editing) return;
    if (
      !confirm(
        'Bu sürüme geri dönmek istediğinize emin misiniz? Form içeriği o sürüme geri çekilecektir.'
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/plans/${editing.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Geri dönülemedi');

      setHistoryOpen(false);
      setSuccessMsg(
        data.message || "Sürüm başarıyla yüklendi! Lütfen kontrol edip Yayınla'ya basınız."
      );
      openForm(data.plan);
    } catch (err: any) {
      setError(err.message || 'Geri yükleme hatası');
    }
  }

  // Hizmet Sil
  async function removePlan() {
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/admin/plans/${confirmDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hizmet silinemedi');

      setConfirmDelete(null);
      await loadPlans();
    } catch (err: any) {
      setError(err.message || 'Silme hatası');
    }
  }

  // Filtrelenmiş liste
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchesSearch = `${p.name} ${p.slug} ${p.category || ''}`
        .toLocaleLowerCase('tr-TR')
        .includes(query.toLocaleLowerCase('tr-TR'));
      if (!matchesSearch) return false;
      if (filterStatus === 'PUBLISHED') return p.status === 'PUBLISHED' && !p.draftData;
      if (filterStatus === 'DRAFT') return p.status === 'DRAFT' || Boolean(p.draftData);
      return true;
    });
  }, [plans, query, filterStatus]);

  // ─── LİSTE EKRANI ────────────────────────────────────────────────────────────

  if (!isEditorOpen) {
    return (
      <div className="flex flex-col gap-6">
        {/* Üst Başlık & Eylemler */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={14} /> Admin Paneline Dön
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-corp-charcoal">
              AI Otomasyon Hizmetleri
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Yapay zeka abonelik sayfalarının tüm içeriğini, paketlerini ve SEO ayarlarını buradan
              yönetin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAiSettingsModalOpen(true);
                void loadAiSettings();
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
              title="Gemini Model ve Otomatik Fallback Yapılandırması"
            >
              <Settings size={16} className="text-slate-500" />
              <span>AI Model Ayarları</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAiImportModalOpen(true);
                setAiImportError('');
                setAiImportFile(null);
                setAiImportDiagnostics(null);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-corp-teal/30 bg-corp-teal/10 px-5 text-sm font-bold text-corp-teal transition hover:bg-corp-teal/20"
            >
              <Sparkles size={18} /> AI ile Ürün Oluştur
            </button>
            <button
              onClick={() => openForm()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-corp-teal px-5 text-sm font-bold text-white shadow-sm transition hover:bg-corp-teal/90"
            >
              <Plus size={18} /> Yeni AI Hizmeti Ekle
            </button>
          </div>
        </header>

        {error && (
          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <span>{error}</span>
            <button onClick={() => setError('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Filtre & Arama */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterStatus === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tümü ({plans.length})
            </button>
            <button
              onClick={() => setFilterStatus('PUBLISHED')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterStatus === 'PUBLISHED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Yayında ({plans.filter((p) => p.status === 'PUBLISHED' && !p.draftData).length})
            </button>
            <button
              onClick={() => setFilterStatus('DRAFT')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterStatus === 'DRAFT'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Taslak / Değişiklik ({plans.filter((p) => p.status === 'DRAFT' || p.draftData).length}
              )
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Hizmet adı veya slug ara..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm outline-none transition focus:border-corp-teal focus:bg-white"
            />
          </div>
        </div>

        {/* Hizmet Listesi Tablosu */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Hizmet Adı & Kategori</th>
                  <th className="px-5 py-3.5">Yayın Durumu</th>
                  <th className="px-5 py-3.5">Listeleme</th>
                  <th className="px-5 py-3.5">Paket Sayısı</th>
                  <th className="px-5 py-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 animate-spin text-corp-teal" size={24} />
                      Hizmetler yükleniyor...
                    </td>
                  </tr>
                ) : filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      Hiç AI hizmeti bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => {
                    const hasPendingDraft = Boolean(plan.draftData);
                    return (
                      <tr key={plan.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4">
                          <div className="font-bold text-corp-charcoal">{plan.name}</div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span className="font-mono text-slate-500">/{plan.slug}</span>
                            {plan.category ? (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 font-medium">
                                {plan.category}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {hasPendingDraft ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Taslak Değişiklik Var
                            </span>
                          ) : plan.status === 'PUBLISHED' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Yayında
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                              Taslak (Yayında Değil)
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`text-xs font-medium ${plan.isListed ? 'text-emerald-700' : 'text-slate-400'}`}
                          >
                            {plan.isListed ? 'Listede Açık' : 'Listede Gizli'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 font-medium">
                          {plan.tiers?.length ?? 0} Paket
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/services/ai-automation/${plan.slug}?preview=1`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                              <Eye size={13} /> İncele
                            </Link>
                            <button
                              onClick={() => openForm(plan)}
                              className="inline-flex items-center gap-1 rounded-lg bg-corp-teal-50 px-3 py-1.5 text-xs font-bold text-corp-teal transition hover:bg-corp-teal hover:text-white"
                            >
                              Düzenle
                            </button>
                            <button
                              onClick={() =>
                                setAiEditTargetProduct({
                                  id: plan.id,
                                  name: plan.name,
                                  slug: plan.slug,
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-600 hover:text-white"
                              title="Seçili ürünü ve paketlerini AI İle Düzenle"
                            >
                              <Sparkles size={13} /> AI İle Düzenle
                            </button>
                            <button
                              onClick={() => setConfirmDelete(plan)}
                              className="inline-flex items-center gap-1 rounded-lg p-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                              title="Sil"
                            >
                              <Trash2 size={15} />
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
        </section>

        {/* Silme Onay Modalı */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-900">
                Bu AI Hizmetini Silmek İstiyor musunuz?
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                “<strong>{confirmDelete.name}</strong>” ve buna bağlı fiyat paketleri kalıcı olarak
                silinecektir.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => void removePlan()}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI ile Ürün İçe Aktarma Modalı */}
        {aiImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 md:p-6 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="relative flex flex-col w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sabit Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-7 py-4 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-corp-teal/20 to-corp-teal/5 text-corp-teal shadow-2xs">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      AI ile Ürün Oluştur
                    </h2>
                    <p className="text-xs text-slate-500">
                      Doküman yükleyin, Gemini AI form alanlarını akıllı fallback ile doldursun.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiSettingsModalOpen(true);
                      void loadAiSettings();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                    title="Model ve Fallback Ayarları"
                  >
                    <Settings size={14} className="text-slate-500" />
                    <span className="hidden sm:inline">Model Ayarları</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!aiImportLoading) {
                        setAiImportModalOpen(false);
                        setAiImportError('');
                        setAiImportFile(null);
                        setAiImportDiagnostics(null);
                      }
                    }}
                    disabled={aiImportLoading}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 transition"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scroll Edilebilir Gövde */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4 overscroll-contain text-slate-700">
                {/* 1. API Anahtarı Yönetim Kartı */}
                <div
                  className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                    aiImportDiagnostics?.category === 'AUTH_GLOBAL' ||
                    aiImportError.toLowerCase().includes('suspended')
                      ? 'border-rose-300 bg-rose-50/50 shadow-xs'
                      : geminiApiKey
                        ? 'border-emerald-200/90 bg-emerald-50/30'
                        : 'border-amber-300 bg-amber-50/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-xl text-white ${
                          aiImportDiagnostics?.category === 'AUTH_GLOBAL' ||
                          aiImportError.toLowerCase().includes('suspended')
                            ? 'bg-rose-600'
                            : geminiApiKey
                              ? 'bg-emerald-600'
                              : 'bg-amber-500'
                        }`}
                      >
                        <Key size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-900">
                        Google Gemini API Anahtarı
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {aiImportDiagnostics?.category === 'AUTH_GLOBAL' ||
                      aiImportError.toLowerCase().includes('suspended') ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800">
                          <AlertTriangle size={11} /> Anahtar Askıya Alındı / Geçersiz
                        </span>
                      ) : geminiApiKey ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} /> Kayıtlı ve Hazır
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                          <AlertTriangle size={11} /> API Anahtarı Gerekli
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                    AI ile ürün oluşturmak için kendi Google Gemini API anahtarınızı girin. Girilen
                    anahtar veritabanında güvenle saklanır, sistem tarafından hatırlanır ve dilediğiniz zaman güncellenebilir.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={geminiApiKey}
                        onChange={(e) => {
                          setGeminiApiKey(e.target.value);
                          setApiKeyTestResult(null);
                        }}
                        placeholder="AIzaSy... (Google Gemini API Anahtarınızı buraya girin)"
                        className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:border-corp-teal focus:ring-1 focus:ring-corp-teal outline-none transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                        title={showApiKey ? 'Gizle' : 'Göster'}
                      >
                        {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => void handleSaveApiKey()}
                        disabled={apiKeySaving || !geminiApiKey.trim()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
                      >
                        {apiKeySaving ? (
                          <Loader2 size={13} className="animate-spin text-corp-teal" />
                        ) : (
                          <Save size={13} />
                        )}
                        <span>{apiKeySavedSuccess ? 'Kaydedildi!' : 'Kaydet'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleTestApiKey()}
                        disabled={apiKeyTesting || !geminiApiKey.trim()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
                        title="Bağlantıyı ve modelleri Google API üzerinden canlı test et"
                      >
                        {apiKeyTesting ? (
                          <Loader2 size={13} className="animate-spin text-corp-teal" />
                        ) : (
                          <RefreshCw size={13} className="text-corp-teal" />
                        )}
                        <span>Test Et</span>
                      </button>
                    </div>
                  </div>

                  {/* Yardım Linki & Bilgilendirme */}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-corp-teal hover:underline"
                    >
                      <span>Google AI Studio&apos;dan Ücretsiz API Anahtarı Alın</span>
                      <ExternalLink size={12} />
                    </a>
                    {aiSettingsData?.keyPreview && (
                      <span className="font-mono text-slate-500 text-[10px]">
                        Veritabanı Önizleme: {aiSettingsData.keyPreview}
                      </span>
                    )}
                  </div>

                  {/* Canlı Test ve Kayıt Geri Bildirimleri */}
                  {apiKeySavedSuccess && (
                    <div className="mt-2.5 rounded-xl bg-emerald-100/80 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900 flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                      <span>API anahtarı veritabanına başarıyla kaydedildi ve hatırlandı.</span>
                    </div>
                  )}

                  {apiKeyTestResult && (
                    <div
                      className={`mt-2.5 rounded-xl border px-3 py-2 text-xs font-medium flex items-start gap-2 animate-in fade-in ${
                        apiKeyTestResult.success
                          ? 'bg-emerald-100/80 border-emerald-200 text-emerald-900'
                          : 'bg-rose-100/90 border-rose-300 text-rose-950'
                      }`}
                    >
                      {apiKeyTestResult.success ? (
                        <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div className="leading-snug">{apiKeyTestResult.message}</div>
                    </div>
                  )}
                </div>

                {/* 2. Bilgilendirme Kutusu */}
                <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-xs text-teal-900 flex items-start gap-3">
                  <Info size={18} className="text-corp-teal shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-corp-charcoal">
                      Otomatik Doldurulacak Alanlar:
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      Ürün adı, slug, özet, hero başlığı, faydalar, adımlar, öne çıkan özellikler,
                      SSS ve SEO etiketleri.
                    </p>
                    <p className="font-semibold text-corp-teal pt-1">
                      ⚠️ Logo ve ticari fiyat alanları iş kuralı gereği boş bırakılacak, kaydetmeden
                      önce manuel girilecektir.
                    </p>
                  </div>
                </div>

                {/* 3. Doküman Yükleme Alanı */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setAiImportFile(e.dataTransfer.files[0]);
                      setAiImportError('');
                      setAiImportDiagnostics(null);
                    }
                  }}
                  className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    aiImportFile
                      ? 'border-corp-teal bg-teal-50/30'
                      : 'border-slate-300 hover:border-corp-teal bg-slate-50/60'
                  }`}
                >
                  <input
                    type="file"
                    id="ai-doc-upload"
                    accept=".pdf,.txt,.md,.json,application/pdf,text/plain,text/markdown,application/json"
                    disabled={aiImportLoading}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAiImportFile(e.target.files[0]);
                        setAiImportError('');
                        setAiImportDiagnostics(null);
                      }
                    }}
                    className="hidden"
                  />

                  {aiImportFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-corp-teal text-white shadow-md">
                        <FileText size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-800">{aiImportFile.name}</div>
                      <div className="text-xs text-slate-400">
                        {(aiImportFile.size / 1024).toFixed(1)} KB •{' '}
                        {aiImportFile.type || 'Doküman'}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiImportFile(null);
                          setAiImportDiagnostics(null);
                        }}
                        disabled={aiImportLoading}
                        className="mt-2 text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Farklı bir dosya seç
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="ai-doc-upload"
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                        <UploadCloud size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-700">
                        Dokümanı buraya sürükleyin veya{' '}
                        <span className="text-corp-teal underline">gözatın</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        PDF, TXT, MD veya JSON (Maksimum 10 MB)
                      </div>
                    </label>
                  )}
                </div>

                {/* Yükleme Durumu */}
                {aiImportLoading && (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5 text-center space-y-2">
                    <Loader2 size={26} className="animate-spin text-corp-teal mx-auto" />
                    <p className="text-xs font-bold text-corp-charcoal">
                      Doküman Gemini AI tarafından analiz ediliyor...
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Üst seviye model deneniyor; kota veya yoğunluk halinde otomatik fallback
                      devreye girecektir. Lütfen bekleyin.
                    </p>
                  </div>
                )}

                {/* Ayrıntılı Hata Teşhis Paneli */}
                {aiImportError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 text-xs text-rose-950 space-y-3.5 shadow-2xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              Analiz Başarısız Oldu
                            </span>
                            {aiImportDiagnostics?.category && (
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  aiImportDiagnostics.category === 'AUTH_GLOBAL'
                                    ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                    : aiImportDiagnostics.category === 'QUOTA_EXHAUSTED'
                                      ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                      : aiImportDiagnostics.category === 'SERVICE_TEMPORARY'
                                        ? 'bg-orange-200 text-orange-900 border border-orange-300'
                                        : 'bg-slate-200 text-slate-800 border border-slate-300'
                                }`}
                              >
                                {aiImportDiagnostics.category === 'AUTH_GLOBAL' &&
                                  '🔑 API Anahtarı / Yetki'}
                                {aiImportDiagnostics.category === 'AUTH_MODEL_PERMISSION' &&
                                  '🔒 Model Erişim İzni'}
                                {aiImportDiagnostics.category === 'QUOTA_EXHAUSTED' &&
                                  '⏳ Model Kota Sınırı'}
                                {aiImportDiagnostics.category === 'MODEL_UNAVAILABLE' &&
                                  '🚫 Model Bulunamadı'}
                                {aiImportDiagnostics.category === 'SERVICE_TEMPORARY' &&
                                  '⚡ Servis Yoğunluğu (503)'}
                                {aiImportDiagnostics.category === 'TIMEOUT' && '⏱️ Zaman Aşımı'}
                                {aiImportDiagnostics.category === 'INVALID_INPUT' &&
                                  '📄 Doküman Hatası'}
                                {aiImportDiagnostics.category === 'UNKNOWN' && '⚠️ Sistem Teşhisi'}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-slate-700 font-medium leading-relaxed">
                            {aiImportDiagnostics?.userExplanation || aiImportError}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Somut Çözüm Adımı (Ne Yapmalısınız?) */}
                    {aiImportDiagnostics?.suggestedAction && (
                      <div className="rounded-xl border border-rose-200/80 bg-white/90 p-3 text-slate-700 space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                          <span>💡 Ne Yapmalısınız?</span>
                        </div>
                        <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-600">
                          {aiImportDiagnostics.suggestedAction}
                        </p>
                      </div>
                    )}

                    {/* Denenen Modeller ve Sıralama Geçmişi */}
                    {aiImportDiagnostics?.attempts && aiImportDiagnostics.attempts.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-bold text-slate-800">
                          Denenen Modeller ve Sonuçları ({aiImportDiagnostics.attempts.length}{' '}
                          deneme):
                        </div>
                        <div className="space-y-1">
                          {aiImportDiagnostics.attempts.map((att: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-1.5 border border-rose-100 text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-slate-500 font-bold">
                                  {idx + 1}.
                                </span>
                                <span className="font-semibold text-slate-800">{att.model}</span>
                                {att.durationMs ? (
                                  <span className="text-slate-400">
                                    ({(att.durationMs / 1000).toFixed(1)} sn)
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                    att.status === 'SUCCESS'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : att.httpStatus === 429
                                        ? 'bg-amber-100 text-amber-800'
                                        : att.httpStatus === 503
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {att.status === 'SUCCESS'
                                    ? 'BAŞARILI'
                                    : `HTTP ${att.httpStatus || 'HATA'}`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Genişletilebilir Teknik Ayrıntılar */}
                    <div className="border-t border-rose-200/60 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
                      >
                        {showTechnicalDetails
                          ? 'Teknik ayrıntıları gizle'
                          : 'Teknik ayrıntıları ve teşhis kodunu göster'}
                      </button>

                      {showTechnicalDetails && (
                        <div className="mt-2 space-y-2 rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-300">
                          {aiImportDiagnostics?.diagnosticId && (
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <span>
                                Teşhis Kodu:{' '}
                                <strong className="text-corp-teal">
                                  {aiImportDiagnostics.diagnosticId}
                                </strong>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  void navigator.clipboard.writeText(
                                    aiImportDiagnostics.diagnosticId
                                  );
                                  setCopiedDiagId(true);
                                  setTimeout(() => setCopiedDiagId(false), 2000);
                                }}
                                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200 hover:bg-slate-700"
                              >
                                <Copy size={11} /> {copiedDiagId ? 'Kopyalandı!' : 'Kodu Kopyala'}
                              </button>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-400">Teknik Detay: </span>
                            <span className="text-amber-300">
                              {aiImportDiagnostics?.technicalDetail || aiImportError}
                            </span>
                          </div>
                          {aiImportDiagnostics?.durationTotalMs ? (
                            <div>
                              <span className="text-slate-400">Toplam İşlem Süresi: </span>
                              <span>
                                {(aiImportDiagnostics.durationTotalMs / 1000).toFixed(2)} saniye
                              </span>
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-500 pt-1">
                            Bu teşhis kodu sunucu loglarında izlenebilir ve API anahtarınız güvenlik
                            amacıyla hiçbir yerde görüntülenmez.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sabit Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 sm:px-7 py-3.5 bg-slate-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAiSettingsModalOpen(true);
                    void loadAiSettings();
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                >
                  <Sliders size={14} /> AI Model Sıralaması ve Ayarları
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAiImportModalOpen(false);
                      setAiImportError('');
                      setAiImportFile(null);
                      setAiImportDiagnostics(null);
                    }}
                    disabled={aiImportLoading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                  >
                    Kapat
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleAiImport()}
                    disabled={!aiImportFile || aiImportLoading || !geminiApiKey.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-corp-teal px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-corp-teal/90 disabled:opacity-50 transition-all"
                  >
                    {aiImportLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Analiz Ediliyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Dokümanı Analiz Et ve Formu Doldur</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── AI MODEL & FALLBACK AYARLARI MODALI ───────────────────────── */}
        {aiSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 md:p-6 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="relative flex flex-col w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sabit Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-7 py-4 bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 shadow-2xs">
                    <Settings size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      AI Model ve Fallback Yapılandırması
                    </h2>
                    <p className="text-xs text-slate-500">
                      Google Gemini modellerini, API anahtarını ve fallback kurallarını yönetin.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAiSettingsModalOpen(false)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {aiSettingsLoading ? (
                <div className="py-16 text-center text-slate-500">
                  <Loader2 size={26} className="animate-spin mx-auto text-corp-teal mb-2" />
                  AI yapılandırması yükleniyor...
                </div>
              ) : (
                /* Scroll Edilebilir Gövde */
                <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5 overscroll-contain text-slate-700">
                  {/* API Anahtarı Yönetimi */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-xl text-white ${
                            geminiApiKey ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        >
                          <Key size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            Google Gemini API Anahtarı
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {aiSettingsData?.keySource
                              ? `Aktif Kaynak: ${aiSettingsData.keySource} (${aiSettingsData?.keyPreview || 'Yok'})`
                              : 'Veritabanında kayıtlı anahtar'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleTestApiKey()}
                        disabled={apiKeyTesting || !geminiApiKey.trim()}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        {apiKeyTesting ? (
                          <>
                            <Loader2 size={13} className="animate-spin text-corp-teal" />
                            <span>Test Ediliyor...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={13} className="text-corp-teal" />
                            <span>Bağlantıyı Test Et</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <div className="relative flex-1">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={geminiApiKey}
                          onChange={(e) => {
                            setGeminiApiKey(e.target.value);
                            setApiKeyTestResult(null);
                          }}
                          placeholder="AIzaSy... (API Anahtarınızı yapıştırın)"
                          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-10 text-xs font-mono text-slate-800 focus:border-corp-teal focus:ring-1 focus:ring-corp-teal outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                          title={showApiKey ? 'Gizle' : 'Göster'}
                        >
                          {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSaveApiKey()}
                        disabled={apiKeySaving || !geminiApiKey.trim()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50 transition"
                      >
                        {apiKeySaving ? (
                          <Loader2 size={13} className="animate-spin text-corp-teal" />
                        ) : (
                          <Save size={13} />
                        )}
                        <span>{apiKeySavedSuccess ? 'Kaydedildi!' : 'Kaydet'}</span>
                      </button>
                    </div>

                    {apiKeySavedSuccess && (
                      <div className="rounded-xl bg-emerald-100/80 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                        <span>API anahtarı başarıyla güncellendi.</span>
                      </div>
                    )}

                    {apiKeyTestResult && (
                      <div
                        className={`rounded-xl border px-3 py-2 text-xs font-medium flex items-start gap-2 ${
                          apiKeyTestResult.success
                            ? 'bg-emerald-100/80 border-emerald-200 text-emerald-900'
                            : 'bg-rose-100/90 border-rose-300 text-rose-950'
                        }`}
                      >
                        {apiKeyTestResult.success ? (
                          <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="leading-snug">{apiKeyTestResult.message}</div>
                      </div>
                    )}
                  </div>

                  {/* Canlı Test Sonuçları */}
                  {aiTestResults && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Canlı Model Test Raporu (Google API):</span>
                        <span className="font-mono text-[11px] text-slate-500 font-normal">
                          {aiTestResults.discoveredModelsCount} model keşfedildi
                        </span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 pt-1">
                        {aiTestResults.results?.map((res: any) => (
                          <div
                            key={res.model}
                            className="flex items-center justify-between rounded-xl bg-white border border-slate-200/80 p-2.5"
                          >
                            <div>
                              <div className="font-bold text-slate-800">{res.model}</div>
                              <div className="text-[10px] text-slate-400">
                                {res.status === 'ACTIVE'
                                  ? `${res.latencyMs} ms yanıt süresi`
                                  : res.errorSummary?.slice(0, 45) || 'Erişilemedi'}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                res.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : res.status === 'HIGH_DEMAND'
                                    ? 'bg-orange-100 text-orange-800'
                                    : res.status === 'QUOTA_EXCEEDED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {res.status === 'ACTIVE' ? 'AKTİF' : res.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bildirimler */}
                  {aiSettingsSuccess && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} /> {aiSettingsSuccess}
                    </div>
                  )}
                  {aiSettingsError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-center gap-2">
                      <AlertTriangle size={16} /> {aiSettingsError}
                    </div>
                  )}

                  {/* Form Ayarları */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Varsayılan Birincil Model
                      </label>
                      <select
                        value={aiSettingsData?.settings?.defaultModel || 'gemini-3.5-flash'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAiSettingsData((prev: any) => ({
                            ...prev,
                            settings: { ...prev.settings, defaultModel: val },
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-corp-teal"
                      >
                        {aiSettingsData?.availableModels?.map((m: string) => (
                          <option key={m} value={m}>
                            {m} {m === 'gemini-3.5-flash' ? '(Önerilen Üst Model)' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Analiz ilk olarak bu model ile başlatılır.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Azami Model Denemesi
                      </label>
                      <select
                        value={aiSettingsData?.settings?.maxAttempts || 3}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAiSettingsData((prev: any) => ({
                            ...prev,
                            settings: { ...prev.settings, maxAttempts: val },
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-corp-teal"
                      >
                        <option value={1}>1 Model (Fallback Yok)</option>
                        <option value={2}>2 Model</option>
                        <option value={3}>3 Model (Önerilen)</option>
                        <option value={4}>4 Model</option>
                        <option value={5}>5 Model (Tüm Liste)</option>
                      </select>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Bir işlemde en fazla kaç alternatif denensin.
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        İşlem Zaman Aşımı Bütçesi
                      </label>
                      <select
                        value={aiSettingsData?.settings?.timeoutSeconds || 45}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setAiSettingsData((prev: any) => ({
                            ...prev,
                            settings: { ...prev.settings, timeoutSeconds: val },
                          }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-medium text-slate-800 outline-none focus:border-corp-teal"
                      >
                        <option value={20}>20 Saniye (Hızlı)</option>
                        <option value={30}>30 Saniye</option>
                        <option value={45}>45 Saniye (Önerilen)</option>
                        <option value={60}>60 Saniye (Büyük Dokümanlar)</option>
                      </select>
                    </div>

                    <div className="flex flex-col justify-center">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/60">
                        <div>
                          <div className="text-xs font-bold text-slate-800">Otomatik Fallback</div>
                          <div className="text-[11px] text-slate-500">
                            Kota ve yoğunlukta alt modele geç
                          </div>
                        </div>
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={Boolean(aiSettingsData?.settings?.autoFallbackEnabled ?? true)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAiSettingsData((prev: any) => ({
                                ...prev,
                                settings: { ...prev.settings, autoFallbackEnabled: checked },
                              }));
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-corp-teal" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Model Öncelik Sıralaması */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-2">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>Aktif Fallback Sıralaması:</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Kademeli geçiş mantığı
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {aiSettingsData?.settings?.modelPriority?.map((m: string, idx: number) => (
                        <div
                          key={m}
                          className="flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs"
                        >
                          <span className="text-corp-teal font-bold">{idx + 1}.</span>
                          <span>{m}</span>
                          {idx === 0 && (
                            <span className="text-[9px] text-corp-teal font-bold">(Birincil)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Son Analiz Raporu Özeti */}
                  {aiSettingsData?.lastDiagnostic && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-1.5">
                      <div className="font-bold text-slate-800 flex items-center justify-between">
                        <span>Son Analiz Teşhis Kaydı:</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(aiSettingsData.lastDiagnostic.timestamp).toLocaleString(
                            'tr-TR'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] pt-1">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            aiSettingsData.lastDiagnostic.status.includes('SUCCESS')
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {aiSettingsData.lastDiagnostic.status}
                        </span>
                        <span className="text-slate-600">
                          Kullanılan Model:{' '}
                          <strong className="text-slate-800">
                            {aiSettingsData.lastDiagnostic.resolvedModel ||
                              aiSettingsData.lastDiagnostic.primaryModel}
                          </strong>
                        </span>
                        <span className="text-slate-500 font-mono text-[10px]">
                          ({aiSettingsData.lastDiagnostic.diagnosticId})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sabit Footer */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-5 sm:px-7 py-3.5 bg-slate-50/90 shrink-0">
                <button
                  type="button"
                  onClick={() => setAiSettingsModalOpen(false)}
                  disabled={aiSettingsSaving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={() => void saveAiSettings()}
                  disabled={aiSettingsSaving || !aiSettingsData}
                  className="inline-flex items-center gap-2 rounded-xl bg-corp-teal px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-corp-teal/90 disabled:opacity-50 transition"
                >
                  {aiSettingsSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Ayarları Kaydet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI İle Düzenle Modalı (Liste Görünümü) */}
        {aiEditTargetProduct && (
          <AiProductEditModal
            isOpen={Boolean(aiEditTargetProduct)}
            onClose={() => setAiEditTargetProduct(null)}
            product={aiEditTargetProduct}
            onProductUpdated={(updatedPlan) => {
              void loadPlans();
              if (editing && updatedPlan && editing.id === updatedPlan.id) {
                openForm(updatedPlan);
              }
              setSuccessMsg(
                `"${aiEditTargetProduct.name}" ürünü ve paketleri AI İle Düzenle üzerinden başarıyla güncellendi.`
              );
            }}
          />
        )}
      </div>
    );
  }

  // ─── EDİTÖR EKRANI ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Sabit Üst Başlık & Hızlı Aksiyon Barı */}
      <header className="sticky top-0 z-40 -mx-4 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditorOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            title="Geri"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-corp-charcoal truncate max-w-md">
                {editing ? form.name || 'İsimsiz Hizmet' : 'Yeni AI Hizmeti'}
              </h1>
              {form.draftData ? (
                <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                  Taslak Değişiklikler
                </span>
              ) : form.status === 'PUBLISHED' ? (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  Yayında
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600">
                  Taslak
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono">
              /services/ai-automation/{form.slug || 'slug'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editing && (
            <>
              <button
                type="button"
                onClick={() =>
                  setAiEditTargetProduct({
                    id: editing.id,
                    name: form.name || editing.name,
                    slug: form.slug || editing.slug,
                  })
                }
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-500"
              >
                <Sparkles size={14} /> AI İle Düzenle
              </button>
              <button
                type="button"
                onClick={() => void openVersionHistory()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <History size={14} /> Sürüm Geçmişi (Son 5)
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Eye size={14} /> Canlı Önizle
          </button>

          <button
            type="button"
            onClick={() => void saveDraft()}
            disabled={saving || publishing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Taslağı Kaydet
          </button>

          <button
            type="button"
            onClick={() => void publishPlan()}
            disabled={saving || publishing}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-corp-teal px-5 text-xs font-bold text-white shadow-sm transition hover:bg-corp-teal/90 disabled:opacity-50"
          >
            {publishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Yayınla (Canlıya Al)
          </button>
        </div>
      </header>

      {/* Bildirim Mesajları */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* AI İçe Aktarma Uyarıları (ör. çakışan slug düzeltmesi) */}
      {aiImportWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
          <div className="font-bold flex items-center gap-1.5 mb-1.5 text-amber-800">
            <AlertTriangle size={15} /> AI İçe Aktarma Notları:
          </div>
          <ul className="list-disc list-inside space-y-1">
            {aiImportWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sekmeler (Tabs) */}
      <nav className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm scrollbar-none">
        {[
          { id: 'general', label: 'Genel Bilgiler' },
          { id: 'hero', label: 'Hero & Giriş' },
          { id: 'benefits', label: 'Fayda Kartları' },
          { id: 'steps', label: 'Nasıl Çalışır' },
          { id: 'screenshots', label: 'Demo & Görseller' },
          { id: 'pricing', label: 'Paketler & Fiyat' },
          { id: 'trust', label: 'Güven Blokları' },
          { id: 'faqs', label: 'SSS' },
          { id: 'whatsapp', label: 'WhatsApp & Demo' },
          { id: 'seo', label: 'SEO & Paylaşım' },
          { id: 'visibility', label: 'Bölüm Ayarları' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'bg-corp-teal text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ─── TAB 1: GENEL BİLGİLER ────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800">Genel Hizmet Bilgileri</h2>
            <p className="text-xs text-slate-500">
              Hizmetin temel tanımlamaları ve liste sayfasındaki kart görünümü.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Hizmet Adı *</label>
              <input
                type="text"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => {
                  update('name', e.target.value);
                  if (!slugManuallyEdited) update('slug', slugify(e.target.value));
                }}
                placeholder="Örn: Microsoft Call Center AI"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Müşteriye gösterilen resmi hizmet başlığı." />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">URL Slug *</label>
              <input
                type="text"
                required
                maxLength={140}
                value={form.slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  update('slug', slugify(e.target.value));
                }}
                placeholder="Örn: microsoft-call-center-ai"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-mono outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Sayfa adresi. Yalnızca küçük harf, rakam ve tire içerebilir." />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Liste Kartı İçin Kısa Özet (Max 120 Karakter) *
                </label>
                <CharCounter current={form.cardSummary?.length || 0} max={120} />
              </div>
              <textarea
                maxLength={120}
                rows={2}
                value={form.cardSummary || ''}
                onChange={(e) => update('cardSummary', e.target.value)}
                placeholder="Örn: Müşterilerinizin telefonlarını 7/24 bekletmeden karşılayan, insan doğallığında konuşan yapay zeka."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Tüm hizmetler listesinde kart üzerinde görünecek özlü, dikkat çekici cümle." />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Kategori / Etiket</label>
              <input
                type="text"
                maxLength={80}
                value={form.category || ''}
                onChange={(e) => update('category', e.target.value)}
                placeholder="Örn: AI Çağrı Merkezi, Finans & Analiz, Müşteri Deneyimi"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Hizmetin ait olduğu uzmanlık alanı veya rozet etiketi." />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Liste Sırası (Öncelik)</label>
              <input
                type="number"
                min="0"
                value={form.displayOrder}
                onChange={(e) => update('displayOrder', Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Daha küçük sayılar listede daha önce gösterilir (0 en üst)." />
            </div>

            <div className="flex items-center gap-6 pt-2 sm:col-span-2">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isListed}
                  onChange={(e) => update('isListed', e.target.checked)}
                  className="h-4 w-4 rounded text-corp-teal"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Tüm Hizmetler Sayfasında Göster (Listede Açık)
                </span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => update('isFeatured', e.target.checked)}
                  className="h-4 w-4 rounded text-corp-teal"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Öne Çıkan Hizmet (Vurgula)
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 2: HERO & GİRİŞ BÖLÜMÜ ─────────────────────────────────── */}
      {activeTab === 'hero' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Hero & Karşılama Bölümü</h2>
              <p className="text-xs text-slate-500">
                Sayfanın en üstünde ziyaretçiyi karşılayan ana vitrin alanı.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.hero}
                onChange={(e) => updateSectionVisibility('hero', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Hero Bölümünü Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Sonuç Odaklı Ana Başlık (Max 70 Karakter) *
                </label>
                <CharCounter current={form.heroHeadline?.length || 0} max={70} />
              </div>
              <input
                type="text"
                maxLength={70}
                value={form.heroHeadline || ''}
                onChange={(e) => update('heroHeadline', e.target.value)}
                placeholder="Örn: Telefonları 7/24 Kaçırmayın, Satışlarınızı Katlayın"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Ziyaretçiyi yakalayan net, fayda ve sonuç odaklı ana manşet." />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Hero Alt Açıklama Metni (Max 160 Karakter) *
                </label>
                <CharCounter current={form.heroSubheadline?.length || 0} max={160} />
              </div>
              <textarea
                maxLength={160}
                rows={2}
                value={form.heroSubheadline || ''}
                onChange={(e) => update('heroSubheadline', e.target.value)}
                placeholder="Örn: Gelen çağrıları anında yanıtlayan, randevu oluşturan ve CRM entegrasyonuyla tüm veriyi işleyen yeni nesil sesli yapay zeka."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
              <FieldHelp text="Ana başlığın hemen altındaki 1-2 cümlelik açıklama." />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Birincil Düğme Metni</label>
              <input
                type="text"
                value={form.primaryCtaLabel || ''}
                onChange={(e) => update('primaryCtaLabel', e.target.value)}
                placeholder="Varsayılan: Paketleri İncele"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Birincil Düğme Bağlantısı</label>
              <input
                type="text"
                value={form.primaryCtaUrl || ''}
                onChange={(e) => update('primaryCtaUrl', e.target.value)}
                placeholder="Varsayılan: #paketler"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                İkincil Düğme Metni (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={form.secondaryCtaLabel || ''}
                onChange={(e) => update('secondaryCtaLabel', e.target.value)}
                placeholder="Örn: Canlı Demo Talep Et"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                İkincil Düğme Bağlantısı (İsteğe Bağlı)
              </label>
              <input
                type="text"
                value={form.secondaryCtaUrl || ''}
                onChange={(e) => update('secondaryCtaUrl', e.target.value)}
                placeholder="Örn: https://wa.me/905303412156 veya #demo"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-corp-teal"
              />
            </div>

            {/* Hero Görseli & Yükleme */}
            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
              <label className="text-xs font-bold text-slate-700">Hero Ürün / Mockup Görseli</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                {form.heroMockupUrl ? (
                  <div className="relative h-28 w-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Image
                      src={form.heroMockupUrl}
                      alt="Hero Önizleme"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}
                <div className="flex-1 space-y-2">
                  <input
                    type="url"
                    value={form.heroMockupUrl || ''}
                    onChange={(e) => update('heroMockupUrl', e.target.value)}
                    placeholder="Görsel URL'si yapıştırın veya doğrudan yükleyin"
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-slate-800">
                      <ImagePlus size={14} />
                      {uploadingField === 'heroMockupUrl'
                        ? 'Optimize Ediliyor...'
                        : 'Yeni Görsel Yükle (Max 5MB)'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={uploadingField === 'heroMockupUrl'}
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          void uploadImage(e.target.files[0], 'heroMockupUrl')
                        }
                      />
                    </label>
                    {form.heroMockupUrl && (
                      <button
                        type="button"
                        onClick={() => update('heroMockupUrl', '')}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Görseli Kaldır
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className="text-xs font-bold text-slate-700">
                  Hero Görseli Alt Metni (SEO & Erişilebilirlik)
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={form.heroImageAlt || ''}
                  onChange={(e) => update('heroImageAlt', e.target.value)}
                  placeholder="Örn: Microsoft Call Center AI çağrı yönetim arayüzü"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                />
              </div>
            </div>

            {/* Logo & Başlayan Fiyat Toggle */}
            <div>
              <label className="text-xs font-bold text-slate-700">
                Hizmet Logosu / İkonu (URL)
              </label>
              <input
                type="url"
                value={form.imageUrl || ''}
                onChange={(e) => update('imageUrl', e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.showStartingPrice}
                  onChange={(e) => update('showStartingPrice', e.target.checked)}
                  className="h-4 w-4 rounded text-corp-teal"
                />
                <span className="text-sm font-semibold text-slate-700">
                  '.../ay'dan Başlayan Fiyatlarla' Metnini Göster
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 3: FAYDA KARTLARI (3 - 6 ADET) ─────────────────────────── */}
      {activeTab === 'benefits' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Fayda Kartları</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {form.benefits.length} / 6 Kart
                </span>
              </div>
              <p className="text-xs text-slate-500">
                En az 3, en fazla 6 adet kart ekleyebilirsiniz. Her kart 1 cümlelik net bir avantaj
                anlatmalıdır.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.benefits}
                onChange={(e) => updateSectionVisibility('benefits', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Bölümü Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.benefits.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-corp-teal">
                    Fayda #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'benefits',
                        form.benefits.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">İkon Seçin</label>
                  <div className="mt-1">
                    <IconPicker
                      value={item.icon}
                      onChange={(icon) =>
                        update(
                          'benefits',
                          form.benefits.map((b, i) => (i === index ? { ...b, icon } : b))
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Başlık (Max 80 Karakter)
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={item.title}
                    onChange={(e) =>
                      update(
                        'benefits',
                        form.benefits.map((b, i) =>
                          i === index ? { ...b, title: e.target.value } : b
                        )
                      )
                    }
                    placeholder="Örn: %100 Yanıtlama Oranı"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-600">
                      1 Cümle Açıklama (Max 160 Karakter)
                    </label>
                    <CharCounter current={item.description.length} max={160} />
                  </div>
                  <textarea
                    maxLength={160}
                    rows={2}
                    value={item.description}
                    onChange={(e) =>
                      update(
                        'benefits',
                        form.benefits.map((b, i) =>
                          i === index ? { ...b, description: e.target.value } : b
                        )
                      )
                    }
                    placeholder="Örn: Eşzamanlı yüzlerce çağrıyı tek bir saniye bekletmeden karşılayarak müşteri memnuniyetini zirveye çıkarın."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {form.benefits.length < 6 && (
            <button
              type="button"
              onClick={() =>
                update('benefits', [
                  ...form.benefits,
                  { icon: 'Sparkles', title: '', description: '', order: form.benefits.length },
                ])
              }
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-corp-teal hover:bg-slate-50"
            >
              <Plus size={16} /> Yeni Fayda Kartı Ekle
            </button>
          )}
        </section>
      )}

      {/* ─── TAB 4: NASIL ÇALIŞIR ADIMLARI (3 - 4 ADET) ─────────────────── */}
      {activeTab === 'steps' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">Nasıl Çalışır Adımları</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {form.steps.length} / 4 Adım
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Müşterinin satın almadan sonuca giden 3-4 adımlık net süreci.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.steps}
                onChange={(e) => updateSectionVisibility('steps', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Bölümü Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {form.steps.map((step, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-corp-teal">
                    Adım #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'steps',
                        form.steps.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Adım Başlığı (Max 80 Karakter)
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={step.title}
                    onChange={(e) =>
                      update(
                        'steps',
                        form.steps.map((s, i) =>
                          i === index ? { ...s, title: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Örn: 1. Paket Seçimi & Kayıt"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Açıklama (1-2 Cümle)</label>
                  <textarea
                    maxLength={300}
                    rows={2}
                    value={step.description}
                    onChange={(e) =>
                      update(
                        'steps',
                        form.steps.map((s, i) =>
                          i === index ? { ...s, description: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Örn: İhtiyacınıza uygun paketi belirleyin, güvenli ödeme ile aboneliğinizi başlatın."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {form.steps.length < 4 && (
            <button
              type="button"
              onClick={() =>
                update('steps', [
                  ...form.steps,
                  { title: '', description: '', order: form.steps.length },
                ])
              }
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-corp-teal hover:bg-slate-50"
            >
              <Plus size={16} /> Yeni Adım Ekle
            </button>
          )}
        </section>
      )}

      {/* ─── TAB 5: DEMO & EKRAN GÖRÜNTÜLERİ (0 - 6 ADET) ──────────────── */}
      {activeTab === 'screenshots' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-800">
                  Ürün Ekran Görüntüleri & Demo
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                  {form.demoScreenshots.length} / 6 Görsel
                </span>
              </div>
              <p className="text-xs text-slate-500">
                0 ile 6 arasında ekran görüntüsü ekleyebilirsiniz. Eğer görsel eklemezseniz bu bölüm
                sayfada otomatik olarak gizlenir.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.demoScreenshots}
                onChange={(e) => updateSectionVisibility('demoScreenshots', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Bölümü Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.demoScreenshots.map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-corp-teal">
                    Görsel #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'demoScreenshots',
                        form.demoScreenshots.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>

                {item.url ? (
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <Image
                      src={item.url}
                      alt="Önizleme"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div>
                  <label className="text-xs font-bold text-slate-600">Görsel URL veya Yükle</label>
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) =>
                      update(
                        'demoScreenshots',
                        form.demoScreenshots.map((s, i) =>
                          i === index ? { ...s, url: e.target.value } : s
                        )
                      )
                    }
                    placeholder="https://..."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800">
                    <ImagePlus size={13} />
                    {uploadingField === `demo_${index}` ? 'Yükleniyor...' : 'Dosyadan Yükle'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingField === `demo_${index}`}
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        void uploadImage(e.target.files[0], `demo_${index}`, (url) => {
                          update(
                            'demoScreenshots',
                            form.demoScreenshots.map((s, i) => (i === index ? { ...s, url } : s))
                          );
                        })
                      }
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Açıklama / Alt Başlık (Max 160 Karakter)
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={item.caption}
                    onChange={(e) =>
                      update(
                        'demoScreenshots',
                        form.demoScreenshots.map((s, i) =>
                          i === index ? { ...s, caption: e.target.value } : s
                        )
                      )
                    }
                    placeholder="Örn: Gerçek zamanlı arama analiz paneli"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          {form.demoScreenshots.length < 6 && (
            <button
              type="button"
              onClick={() =>
                update('demoScreenshots', [
                  ...form.demoScreenshots,
                  { url: '', caption: '', alt: '', order: form.demoScreenshots.length },
                ])
              }
              className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-corp-teal hover:bg-slate-50"
            >
              <Plus size={16} /> Yeni Demo Görseli Ekle
            </button>
          )}
        </section>
      )}

      {/* ─── TAB 6: FİYAT PAKETLERİ (TIERS) ─────────────────────────────── */}
      {activeTab === 'pricing' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Fiyatlandırma & Paketler</h2>
              <p className="text-xs text-slate-500">
                Müşterinin satın alabileceği aylık abonelik paketleri ve özellikleri.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.pricing}
                onChange={(e) => updateSectionVisibility('pricing', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">
                Fiyatlandırma Bölümünü Göster
              </span>
            </label>
          </div>

          {/* Paket Kartları */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {form.tiers.map((tier, index) => (
              <div
                key={tier.id || index}
                className={`flex flex-col gap-4 rounded-2xl border p-5 transition ${
                  tier.isRecommended
                    ? 'border-corp-teal ring-2 ring-corp-teal/20 bg-slate-50/50'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-corp-teal">
                    Paket #{index + 1}
                  </span>
                  {form.tiers.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          'tiers',
                          form.tiers.filter((_, i) => i !== index)
                        )
                      }
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Paketi Sil
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Paket Adı *</label>
                  <input
                    type="text"
                    required
                    value={tier.name}
                    onChange={(e) =>
                      update(
                        'tiers',
                        form.tiers.map((t, i) => (i === index ? { ...t, name: e.target.value } : t))
                      )
                    }
                    placeholder="Örn: Başlangıç Paketi"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-bold outline-none focus:border-corp-teal"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700">Aylık Fiyat (TL) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={tier.priceMonthly || ''}
                      onChange={(e) =>
                        update(
                          'tiers',
                          form.tiers.map((t, i) =>
                            i === index ? { ...t, priceMonthly: Number(e.target.value) } : t
                          )
                        )
                      }
                      placeholder="Örn: 5000"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm font-extrabold text-corp-teal outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700">Rozet Metni</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={tier.badge || ''}
                      onChange={(e) =>
                        update(
                          'tiers',
                          form.tiers.map((t, i) =>
                            i === index ? { ...t, badge: e.target.value } : t
                          )
                        )
                      }
                      placeholder="Örn: En Popüler"
                      className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tier.isRecommended}
                    onChange={(e) =>
                      update(
                        'tiers',
                        form.tiers.map((t, i) => ({
                          ...t,
                          isRecommended: i === index ? e.target.checked : false,
                        }))
                      )
                    }
                    className="h-4 w-4 rounded text-corp-teal"
                  />
                  <span className="text-xs font-bold text-slate-700">
                    Bu Paketi 'Önerilen' Olarak Vurgula
                  </span>
                </label>

                <div>
                  <label className="text-xs font-bold text-slate-700">KDV Notu</label>
                  <input
                    type="text"
                    value={tier.vatNote || ''}
                    onChange={(e) =>
                      update(
                        'tiers',
                        form.tiers.map((t, i) =>
                          i === index ? { ...t, vatNote: e.target.value } : t
                        )
                      )
                    }
                    placeholder="Örn: + %20 KDV"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Yenileme / İptal Notu</label>
                  <input
                    type="text"
                    value={tier.renewalNote || ''}
                    onChange={(e) =>
                      update(
                        'tiers',
                        form.tiers.map((t, i) =>
                          i === index ? { ...t, renewalNote: e.target.value } : t
                        )
                      )
                    }
                    placeholder="Örn: Dilediğiniz zaman tek tıkla iptal"
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Buton Metni</label>
                  <input
                    type="text"
                    value={tier.buttonText || ''}
                    onChange={(e) =>
                      update(
                        'tiers',
                        form.tiers.map((t, i) =>
                          i === index ? { ...t, buttonText: e.target.value } : t
                        )
                      )
                    }
                    placeholder={`Varsayılan: ${tier.name || 'Paket'} Aboneliğini Başlat`}
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none"
                  />
                </div>

                {/* Paket Özellikleri */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="text-xs font-bold text-slate-700">
                    Paket Özellik Maddeleri
                  </label>
                  <div className="mt-2 space-y-2">
                    {tier.features.map((feat, fi) => (
                      <div key={fi} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) =>
                            update(
                              'tiers',
                              form.tiers.map((t, i) =>
                                i === index
                                  ? {
                                      ...t,
                                      features: t.features.map((f, j) =>
                                        j === fi ? e.target.value : f
                                      ),
                                    }
                                  : t
                              )
                            )
                          }
                          placeholder="Örn: Aylık 1.000 Dakika Çağrı"
                          className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            update(
                              'tiers',
                              form.tiers.map((t, i) =>
                                i === index
                                  ? { ...t, features: t.features.filter((_, j) => j !== fi) }
                                  : t
                              )
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        update(
                          'tiers',
                          form.tiers.map((t, i) =>
                            i === index ? { ...t, features: [...t.features, ''] } : t
                          )
                        )
                      }
                      className="text-xs font-bold text-corp-teal hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <Plus size={14} /> Özellik Ekle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => update('tiers', [...form.tiers, emptyTier(form.tiers.length)])}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-corp-teal hover:bg-slate-50"
          >
            <Plus size={16} /> Yeni Paket Ekle
          </button>
        </section>
      )}

      {/* ─── TAB 7: GÜVEN VE İTİRAZ BLOKLARI ─────────────────────────────── */}
      {activeTab === 'trust' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Güven ve İtiraz Blokları</h2>
              <p className="text-xs text-slate-500">
                Müşterilerin satın alma öncesi kafasındaki soru işaretlerini (kurulum süresi,
                destek, veri güvenliği, iptal/iade, yenileme) gideren bloklar.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.trustBlocks}
                onChange={(e) => updateSectionVisibility('trustBlocks', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Bölümü Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {form.trustBlocks.map((block, index) => (
              <div
                key={block.key}
                className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
                  block.isEnabled
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50/50 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Blok #{index + 1}
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={block.isEnabled}
                      onChange={(e) =>
                        update(
                          'trustBlocks',
                          form.trustBlocks.map((b, i) =>
                            i === index ? { ...b, isEnabled: e.target.checked } : b
                          )
                        )
                      }
                      className="h-4 w-4 rounded text-corp-teal"
                    />
                    <span className="text-xs font-bold text-slate-700">Aktif</span>
                  </label>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Başlık</label>
                  <input
                    type="text"
                    value={block.title}
                    onChange={(e) =>
                      update(
                        'trustBlocks',
                        form.trustBlocks.map((b, i) =>
                          i === index ? { ...b, title: e.target.value } : b
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Açıklama Metni</label>
                  <textarea
                    rows={3}
                    value={block.text}
                    onChange={(e) =>
                      update(
                        'trustBlocks',
                        form.trustBlocks.map((b, i) =>
                          i === index ? { ...b, text: e.target.value } : b
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2 text-xs outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── TAB 8: SIKÇA SORULAN SORULAR (SSS) ─────────────────────────── */}
      {activeTab === 'faqs' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Sıkça Sorulan Sorular (SSS)</h2>
              <p className="text-xs text-slate-500">
                Müşterilerin aklındaki soruları yanıtlayan soru-cevap listesi.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.faqs}
                onChange={(e) => updateSectionVisibility('faqs', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">Bölümü Göster</span>
            </label>
          </div>

          <div className="space-y-4">
            {form.faqs.map((faq, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-corp-teal">
                    Soru #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        'faqs',
                        form.faqs.filter((_, i) => i !== index)
                      )
                    }
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Soru *</label>
                  <input
                    type="text"
                    required
                    value={faq.question}
                    onChange={(e) =>
                      update(
                        'faqs',
                        form.faqs.map((f, i) =>
                          i === index ? { ...f, question: e.target.value } : f
                        )
                      )
                    }
                    placeholder="Örn: Kurulum için teknik ekibe ihtiyacım var mı?"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Cevap *</label>
                  <textarea
                    rows={3}
                    required
                    value={faq.answer}
                    onChange={(e) =>
                      update(
                        'faqs',
                        form.faqs.map((f, i) =>
                          i === index ? { ...f, answer: e.target.value } : f
                        )
                      )
                    }
                    placeholder="Örn: Hayır, tüm teknik entegrasyonu Çiçekana ekibi 24 saat içinde anahtar teslim tamamlar."
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              update('faqs', [...form.faqs, { question: '', answer: '', order: form.faqs.length }])
            }
            className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-corp-teal hover:bg-slate-50"
          >
            <Plus size={16} /> Yeni Soru Ekle
          </button>
        </section>
      )}

      {/* ─── TAB 9: WHATSAPP & DEMO ───────────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Demo & WhatsApp İletişimi</h2>
              <p className="text-xs text-slate-500">
                Müşterinin tek tıkla canlı demo veya bilgi alabileceği iletişim alanı.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.sectionVisibility.whatsappCta}
                onChange={(e) => updateSectionVisibility('whatsappCta', e.target.checked)}
                className="h-4 w-4 rounded text-corp-teal"
              />
              <span className="text-xs font-bold text-slate-700">WhatsApp Butonunu Göster</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-slate-700">WhatsApp Telefon Numarası</label>
              <input
                type="text"
                value={form.whatsappNumber || ''}
                onChange={(e) => update('whatsappNumber', e.target.value)}
                placeholder="+90 530 341 21 56"
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-semibold outline-none"
              />
              <FieldHelp text="Müşterinin yönlendirileceği WhatsApp hattı." />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                Ön Metin Şablonu ({'{ürün}'} yer tutucusu)
              </label>
              <input
                type="text"
                value={form.whatsappTemplate || ''}
                onChange={(e) => update('whatsappTemplate', e.target.value)}
                placeholder="Merhaba, {ürün} hakkında bilgi ve canlı demo almak istiyorum."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
              />
              <FieldHelp text="{ürün} yazan yere otomatik olarak bu hizmetin adı yerleştirilecektir." />
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isDemoFormActive}
                  onChange={(e) => update('isDemoFormActive', e.target.checked)}
                  className="h-4 w-4 rounded text-corp-teal"
                />
                <span className="text-sm font-semibold text-slate-700">
                  Demo Talep Formu Açık (Sayfada gösterilsin)
                </span>
              </label>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 10: SEO & PAYLAŞIM ───────────────────────────────────────── */}
      {activeTab === 'seo' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800">
              Arama Motoru (SEO) & Sosyal Medya
            </h2>
            <p className="text-xs text-slate-500">
              Google arama sonuçlarında ve sosyal medyada paylaşılınca çıkacak bilgiler.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">SEO Başlığı (Meta Title)</label>
                <CharCounter current={form.metaTitle?.length || 0} max={80} />
              </div>
              <input
                type="text"
                maxLength={80}
                value={form.metaTitle || ''}
                onChange={(e) => update('metaTitle', e.target.value)}
                placeholder={`${form.name || 'Hizmet Adı'} | Çiçekana Teknoloji`}
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
              />
              <FieldHelp text="Google sekmesinde ve arama sonuçlarında görünen başlık." />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  SEO Açıklaması (Meta Description)
                </label>
                <CharCounter current={form.metaDescription?.length || 0} max={160} />
              </div>
              <textarea
                maxLength={160}
                rows={2}
                value={form.metaDescription || ''}
                onChange={(e) => update('metaDescription', e.target.value)}
                placeholder="Google snippet ve arama sonuçlarında görünen açıklama."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">
                Sosyal Medya Paylaşım Görseli (OG Image)
              </label>
              <input
                type="url"
                value={form.ogImageUrl || ''}
                onChange={(e) => update('ogImageUrl', e.target.value)}
                placeholder="https://..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none"
              />
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <Check size={16} /> Canonical URL Doğrulanmıştır
              </div>
              <p className="mt-1 font-mono text-xs text-emerald-700">
                https://www.cicekanatechmedia.com/services/ai-automation/{form.slug || 'slug'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Arama motorlarında yinelenen içerik oluşmaması için kanonik URL otomatik olarak
                resmi alan adımıza sabitlenmiştir.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── TAB 11: BÖLÜM GÖRÜNÜRLÜKLERİ ───────────────────────────────── */}
      {activeTab === 'visibility' && (
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800">
              Sayfa Bölüm Görünürlük Anahtarları
            </h2>
            <p className="text-xs text-slate-500">
              Sayfada hangi bölümlerin görüneceğini tek tek Açık / Kapalı yapabilirsiniz.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                key: 'hero',
                label: 'Hero (Başlangıç) Bölümü',
                desc: 'Ana başlık, butonlar ve ürün görseli',
              },
              { key: 'benefits', label: 'Fayda Kartları', desc: '3-6 adet ikonlu fayda kartı' },
              {
                key: 'steps',
                label: 'Nasıl Çalışır Adımları',
                desc: 'Başlangıç ve kurulum adımları',
              },
              {
                key: 'demoScreenshots',
                label: 'Demo & Ekran Görüntüleri',
                desc: 'Arayüz ekran görüntüleri (0 ise zaten gizlenir)',
              },
              {
                key: 'pricing',
                label: 'Fiyat Paketleri',
                desc: 'Abonelik paketleri ve satın alma butonları',
              },
              {
                key: 'trustBlocks',
                label: 'Güven ve İtiraz Blokları',
                desc: 'Kurulum, destek, güvenlik, iptal ve yenileme maddeleri',
              },
              {
                key: 'faqs',
                label: 'Sıkça Sorulan Sorular',
                desc: 'Merak edilen sorular akordeonu',
              },
              {
                key: 'whatsappCta',
                label: 'WhatsApp & Canlı Destek Butonu',
                desc: 'WhatsApp doğrudan iletişim kutusu',
              },
            ].map((sec) => (
              <div
                key={sec.key}
                className="flex items-center justify-between rounded-2xl border border-slate-200 p-4 bg-slate-50/50"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{sec.label}</p>
                  <p className="text-xs text-slate-500">{sec.desc}</p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={form.sectionVisibility[sec.key as keyof Plan['sectionVisibility']]}
                    onChange={(e) =>
                      updateSectionVisibility(
                        sec.key as keyof Plan['sectionVisibility'],
                        e.target.checked
                      )
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-corp-teal" />
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── CANLI ÖNİZLEME MODALI (MOBİL & MASAÜSTÜ SİMÜLATÖRÜ) ──────────── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-t-2xl bg-slate-900 px-6 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold">Sayfa Önizlemesi: {form.name || form.slug}</span>
              <span className="rounded-full bg-amber-500/20 text-amber-300 px-2.5 py-0.5 text-xs font-semibold">
                Taslak Görünüm
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Cihaz Seçici */}
              <div className="flex items-center rounded-xl bg-slate-800 p-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    previewDevice === 'desktop'
                      ? 'bg-corp-teal text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor size={14} /> Masaüstü
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    previewDevice === 'mobile'
                      ? 'bg-corp-teal text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone size={14} /> Mobil (375px)
                </button>
              </div>

              <Link
                href={`/services/ai-automation/${form.slug}?preview=1`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <ExternalLink size={13} /> Yeni Sekmede Aç
              </Link>

              <button
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto rounded-b-2xl bg-slate-950 p-4 flex items-center justify-center">
            <div
              className={`h-full transition-all duration-300 overflow-hidden rounded-2xl bg-white shadow-2xl ${
                previewDevice === 'mobile'
                  ? 'w-[375px] border-8 border-slate-800'
                  : 'w-full max-w-6xl'
              }`}
            >
              <iframe
                src={`/services/ai-automation/${form.slug}?preview=1`}
                title="Canlı Önizleme"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── SÜRÜM GEÇMİŞİ MODALI (SON 5 SÜRÜM & GERİ DÖNÜŞ) ────────────── */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sürüm Geçmişi (Son 5 Sürüm)</h2>
                <p className="text-xs text-slate-500">
                  Her yayınlamada otomatik yedek alınır. İstediğiniz bir sürüme tek tıkla geri
                  dönebilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setHistoryOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {loadingVersions ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 animate-spin text-corp-teal" size={20} />
                  Sürümler yükleniyor...
                </div>
              ) : versions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  Henüz kayıtlı bir sürüm geçmişi bulunmuyor.
                </div>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">
                        {ver.title || `Sürüm ${ver.versionNumber}`}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {new Date(ver.createdAt).toLocaleString('tr-TR')} •{' '}
                        {ver.createdBy || 'Admin'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void rollbackToVersion(ver.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-corp-teal hover:bg-corp-teal hover:text-white transition"
                    >
                      <RefreshCw size={13} /> Bu Sürüme Geri Dön
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI İle Düzenle Modalı (Editör Penceresi İçi) */}
      {aiEditTargetProduct && (
        <AiProductEditModal
          isOpen={Boolean(aiEditTargetProduct)}
          onClose={() => setAiEditTargetProduct(null)}
          product={aiEditTargetProduct}
          onProductUpdated={(updatedPlan) => {
            void loadPlans();
            if (updatedPlan && editing && editing.id === updatedPlan.id) {
              openForm(updatedPlan);
            }
            setSuccessMsg(
              `"${aiEditTargetProduct.name}" ürünü ve paketleri AI İle Düzenle üzerinden başarıyla güncellendi.`
            );
          }}
        />
      )}
    </div>
  );
}
