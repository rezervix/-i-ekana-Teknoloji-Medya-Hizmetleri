"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Save,
  RotateCcw,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sliders,
  HelpCircle,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import Link from "next/link";

interface DynamicContentItem {
  id: string;
  key: string;
  content: string;
  locale: string;
  description: string | null;
  group: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConfiguratorFormState {
  step1Title: string;
  step2Title: string;
  step3Title: string;
  step4Title: string;
  step1TitleKase: string;
  step1TitleTeknoloji: string;
  step1TitleMedya: string;
}

const DEFAULT_FORM_VALUES: ConfiguratorFormState = {
  step1Title: "Ebat ve Kağıt Özellikleri",
  step2Title: "Sipariş Adedi",
  step3Title: "Tasarımınızı Belirleyin",
  step4Title: "Fiyat Özeti ve Sipariş",
  step1TitleKase: "Kaşe ve Mürekkep Özellikleri",
  step1TitleTeknoloji: "Ürün ve Donanım Özellikleri",
  step1TitleMedya: "Hizmet ve Paket Özellikleri",
};

export default function DynamicContentManager() {
  const [activeTab, setActiveTab] = useState<"wizard" | "all">("wizard");
  const [loading, setLoading] = useState(true);
  const [savingWizard, setSavingWizard] = useState(false);
  const [items, setItems] = useState<DynamicContentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");

  // Wizard form state
  const [wizardForm, setWizardForm] = useState<ConfiguratorFormState>(DEFAULT_FORM_VALUES);
  const [wizardErrors, setWizardErrors] = useState<Partial<Record<keyof ConfiguratorFormState, string>>>({});

  // Modal state for custom items
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalForm, setModalForm] = useState<{
    key: string;
    content: string;
    locale: string;
    description: string;
    group: string;
  }>({
    key: "",
    content: "",
    locale: "tr",
    description: "",
    group: "product_configurator",
  });
  const [modalError, setModalError] = useState<string | null>(null);
  const [savingModal, setSavingModal] = useState(false);

  // Verileri API'den yükleme
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/content/dynamic");
      if (!res.ok) {
        throw new Error("Dinamik içerikler getirilemedi.");
      }
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
        mapItemsToWizard(data.items);
      }
    } catch (err: any) {
      toast.error(err.message || "Veriler yüklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // API'den gelen verileri sihirbaz formuna eşleme
  const mapItemsToWizard = (itemList: DynamicContentItem[]) => {
    const map: Record<string, string> = {};
    for (const item of itemList) {
      map[item.key] = item.content;
    }

    setWizardForm({
      step1Title: map["product_configurator.step1_title"] || DEFAULT_FORM_VALUES.step1Title,
      step2Title: map["product_configurator.step2_title"] || DEFAULT_FORM_VALUES.step2Title,
      step3Title: map["product_configurator.step3_title"] || DEFAULT_FORM_VALUES.step3Title,
      step4Title: map["product_configurator.step4_title"] || DEFAULT_FORM_VALUES.step4Title,
      step1TitleKase: map["product_configurator.step1_title_kase"] || DEFAULT_FORM_VALUES.step1TitleKase,
      step1TitleTeknoloji: map["product_configurator.step1_title_teknoloji"] || DEFAULT_FORM_VALUES.step1TitleTeknoloji,
      step1TitleMedya: map["product_configurator.step1_title_medya"] || DEFAULT_FORM_VALUES.step1TitleMedya,
    });
  };

  // Wizard form doğrulama
  const validateWizardForm = (): boolean => {
    const errors: Partial<Record<keyof ConfiguratorFormState, string>> = {};
    if (!wizardForm.step1Title.trim()) errors.step1Title = "1. Adım başlığı boş bırakılamaz.";
    if (!wizardForm.step2Title.trim()) errors.step2Title = "2. Adım başlığı boş bırakılamaz.";
    if (!wizardForm.step3Title.trim()) errors.step3Title = "3. Adım başlığı boş bırakılamaz.";
    if (!wizardForm.step4Title.trim()) errors.step4Title = "4. Adım başlığı boş bırakılamaz.";

    setWizardErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Wizard formunu topluca kaydetme
  const handleSaveWizard = async () => {
    if (!validateWizardForm()) {
      toast.error("Lütfen formdaki eksik alanları düzeltin.");
      return;
    }

    setSavingWizard(true);
    try {
      const payload = {
        items: [
          {
            key: "product_configurator.step1_title",
            content: wizardForm.step1Title.trim(),
            description: "Ürün Yapılandırıcı 1. Adım Başlığı (Varsayılan/Baskı)",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step2_title",
            content: wizardForm.step2Title.trim(),
            description: "Ürün Yapılandırıcı 2. Adım Başlığı",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step3_title",
            content: wizardForm.step3Title.trim(),
            description: "Ürün Yapılandırıcı 3. Adım Başlığı",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step4_title",
            content: wizardForm.step4Title.trim(),
            description: "Ürün Yapılandırıcı 4. Adım Başlığı",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step1_title_kase",
            content: wizardForm.step1TitleKase.trim(),
            description: "Kaşe ve Mühür Ürünleri için 1. Adım Başlığı Override",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step1_title_teknoloji",
            content: wizardForm.step1TitleTeknoloji.trim(),
            description: "Teknoloji Ürünleri için 1. Adım Başlığı Override",
            group: "product_configurator",
          },
          {
            key: "product_configurator.step1_title_medya",
            content: wizardForm.step1TitleMedya.trim(),
            description: "Medya Ürünleri için 1. Adım Başlığı Override",
            group: "product_configurator",
          },
        ],
      };

      const res = await fetch("/api/admin/content/dynamic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Güncelleme başarısız.");
      }

      toast.success("Yapılandırıcı başlıkları başarıyla güncellendi ve önbellek temizlendi!");
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Kaydetme işlemi başarısız.");
    } finally {
      setSavingWizard(false);
    }
  };

  // Varsayılanlara dön
  const handleResetToDefaults = () => {
    if (confirm("Yapılandırıcı başlıklarını varsayılan fabrika ayarlarına döndürmek istediğinize emin misiniz?")) {
      setWizardForm(DEFAULT_FORM_VALUES);
      setWizardErrors({});
      toast.info("Değerler varsayılanlara sıfırlandı. Kalıcı olması için 'Değişiklikleri Kaydet' butonuna basınız.");
    }
  };

  // Modal: Kaydet
  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!modalForm.key.trim()) {
      setModalError("Anahtar (Key) zorunludur.");
      return;
    }
    if (!modalForm.content.trim()) {
      setModalError("İçerik değeri boş olamaz.");
      return;
    }

    setSavingModal(true);
    try {
      const res = await fetch("/api/admin/content/dynamic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "İçerik kaydedilemedi.");
      }

      toast.success(data.message || "İçerik başarıyla kaydedildi.");
      setModalOpen(false);
      await fetchItems();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSavingModal(false);
    }
  };

  // Anahtar Silme
  const handleDeleteItem = async (key: string) => {
    if (!confirm(`'${key}' anahtarını silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/content/dynamic?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Silinemedi.");

      toast.success(data.message || "Kayıt silindi.");
      await fetchItems();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Filtrelenmiş liste
  const filteredItems = items.filter((item) => {
    const matchesGroup = selectedGroup === "all" || item.group === selectedGroup;
    const matchesQuery =
      searchQuery === "" ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesGroup && matchesQuery;
  });

  const availableGroups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />

      {/* Üst Bilgi Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-corp-charcoal p-6 rounded-2xl border border-corp-border dark:border-white/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-corp-teal/10 flex items-center justify-center text-corp-teal">
              <Sliders size={22} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-corp-charcoal dark:text-white">
                Dinamik İçerik & Ayarlar
              </h1>
              <p className="text-xs text-corp-gray dark:text-white/60">
                Mağaza adımları, statik metinler ve tüm sistem anahtarlarını canlı olarak güvenle yönetin.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Butonları */}
        <div className="flex items-center p-1 bg-corp-surface dark:bg-white/5 rounded-xl border border-corp-border/80 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab("wizard")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "wizard"
                ? "bg-white dark:bg-corp-charcoal text-corp-teal shadow-xs font-extrabold"
                : "text-corp-gray hover:text-corp-charcoal dark:hover:text-white"
            }`}
          >
            <Layers size={14} />
            <span>Yapılandırıcı Başlıkları</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "all"
                ? "bg-white dark:bg-corp-charcoal text-corp-teal shadow-xs font-extrabold"
                : "text-corp-gray hover:text-corp-charcoal dark:hover:text-white"
            }`}
          >
            <Sliders size={14} />
            <span>Tüm Dinamik İçerikler ({items.length})</span>
          </button>
        </div>
      </div>

      {/* Yükleniyor Durumu */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border shadow-xs">
          <Loader2 size={32} className="animate-spin text-corp-teal" />
          <p className="text-sm font-semibold text-corp-gray">Dinamik içerikler yükleniyor...</p>
        </div>
      ) : activeTab === "wizard" ? (
        /* ─── TAB 1: ÜRÜN YAPILANDIRICI BAŞLIKLARI ────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol / Ana Form: 2 Kolon */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-corp-charcoal p-6 rounded-2xl border border-corp-border dark:border-white/10 shadow-xs space-y-6">
              <div>
                <h2 className="font-display text-lg font-bold text-corp-charcoal dark:text-white flex items-center gap-2">
                  <span>Genel Adım Başlıkları</span>
                  <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-corp-teal/10 text-corp-teal font-semibold">
                    Mağaza Detay Sayfası
                  </span>
                </h2>
                <p className="text-xs text-corp-gray dark:text-white/60 mt-1">
                  Ürün detay sayfasındaki 4 adımlı yapılandırma sihirbazının (Configurator) başlıklarını belirler.
                </p>
              </div>

              {/* Adım 1: Özellik Seçimi */}
              <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h3 className="font-bold text-sm text-corp-charcoal dark:text-white">
                    1. Adım Başlığı (Varsayılan / Genel)
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Görüntülenecek Başlık Metni
                  </label>
                  <input
                    type="text"
                    value={wizardForm.step1Title}
                    onChange={(e) => setWizardForm({ ...wizardForm, step1Title: e.target.value })}
                    placeholder="Örn: Ebat ve Kağıt Özellikleri"
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal ${
                      wizardErrors.step1Title ? "border-red-500" : "border-corp-border dark:border-white/10"
                    }`}
                  />
                  {wizardErrors.step1Title && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{wizardErrors.step1Title}</p>
                  )}
                  <p className="text-[11px] text-corp-gray dark:text-white/50 mt-1">
                    Özel bir kategori override'ı olmayan standart baskı ürünlerinde bu başlık görünür.
                  </p>
                </div>
              </div>

              {/* Adım 2: Adet Seçimi */}
              <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-sm text-corp-charcoal dark:text-white">
                    2. Adım Başlığı
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Görüntülenecek Başlık Metni
                  </label>
                  <input
                    type="text"
                    value={wizardForm.step2Title}
                    onChange={(e) => setWizardForm({ ...wizardForm, step2Title: e.target.value })}
                    placeholder="Örn: Sipariş Adedi"
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal ${
                      wizardErrors.step2Title ? "border-red-500" : "border-corp-border dark:border-white/10"
                    }`}
                  />
                  {wizardErrors.step2Title && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{wizardErrors.step2Title}</p>
                  )}
                </div>
              </div>

              {/* Adım 3: Tasarım Yöntemi */}
              <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h3 className="font-bold text-sm text-corp-charcoal dark:text-white">
                    3. Adım Başlığı
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Görüntülenecek Başlık Metni
                  </label>
                  <input
                    type="text"
                    value={wizardForm.step3Title}
                    onChange={(e) => setWizardForm({ ...wizardForm, step3Title: e.target.value })}
                    placeholder="Örn: Tasarımınızı Belirleyin"
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal ${
                      wizardErrors.step3Title ? "border-red-500" : "border-corp-border dark:border-white/10"
                    }`}
                  />
                  {wizardErrors.step3Title && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{wizardErrors.step3Title}</p>
                  )}
                </div>
              </div>

              {/* Adım 4: Fiyat Özeti & Sipariş */}
              <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/50 dark:bg-white/[0.02] space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-xs">
                    4
                  </span>
                  <h3 className="font-bold text-sm text-corp-charcoal dark:text-white">
                    4. Adım Başlığı
                  </h3>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Görüntülenecek Başlık Metni
                  </label>
                  <input
                    type="text"
                    value={wizardForm.step4Title}
                    onChange={(e) => setWizardForm({ ...wizardForm, step4Title: e.target.value })}
                    placeholder="Örn: Fiyat Özeti ve Sipariş"
                    className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal ${
                      wizardErrors.step4Title ? "border-red-500" : "border-corp-border dark:border-white/10"
                    }`}
                  />
                  {wizardErrors.step4Title && (
                    <p className="text-xs text-red-500 mt-1 font-medium">{wizardErrors.step4Title}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Kategori & Ürün Grubu Bazlı Override'lar */}
            <div className="bg-white dark:bg-corp-charcoal p-6 rounded-2xl border border-corp-border dark:border-white/10 shadow-xs space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold text-corp-charcoal dark:text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-corp-teal" />
                  <span>Kategoriye Özel 1. Adım Başlıkları (Override)</span>
                </h2>
                <p className="text-xs text-corp-gray dark:text-white/60 mt-1 leading-relaxed">
                  Kaşe, Mühür veya Teknoloji gibi ürünlerde "Kağıt Özellikleri" yerine otomatik olarak buradaki özel başlık gösterilir.
                </p>
              </div>

              <div className="space-y-4">
                {/* Kaşe & Mühür Ürünleri */}
                <div className="p-4 rounded-xl border border-corp-teal/30 bg-corp-teal/[0.03] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-corp-charcoal dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-corp-teal" />
                      Kaşe, Numaratör ve Mühür Ürünleri
                    </label>
                    <span className="text-[10px] font-mono text-corp-teal bg-corp-teal/10 px-2 py-0.5 rounded">
                      numarator-kasesi, kaşe...
                    </span>
                  </div>
                  <input
                    type="text"
                    value={wizardForm.step1TitleKase}
                    onChange={(e) => setWizardForm({ ...wizardForm, step1TitleKase: e.target.value })}
                    placeholder="Örn: Kaşe ve Mürekkep Özellikleri"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-corp-border dark:border-white/10 text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
                  />
                  <p className="text-[11px] text-corp-gray dark:text-white/50">
                    Örn: Numaratör Kaşesi, Otomatik Kaşe vb. ürünlerde 1. adım başlığı olarak uygulanır.
                  </p>
                </div>

                {/* Teknoloji Ürünleri */}
                <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-corp-charcoal dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Teknoloji Kategorisi Ürünleri
                    </label>
                    <span className="text-[10px] font-mono text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded">
                      category = Teknoloji
                    </span>
                  </div>
                  <input
                    type="text"
                    value={wizardForm.step1TitleTeknoloji}
                    onChange={(e) => setWizardForm({ ...wizardForm, step1TitleTeknoloji: e.target.value })}
                    placeholder="Örn: Ürün ve Donanım Özellikleri"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-corp-border dark:border-white/10 text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
                  />
                </div>

                {/* Medya Ürünleri */}
                <div className="p-4 rounded-xl border border-corp-border dark:border-white/10 bg-corp-surface/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-corp-charcoal dark:text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Medya Kategorisi Ürünleri
                    </label>
                    <span className="text-[10px] font-mono text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded">
                      category = Medya
                    </span>
                  </div>
                  <input
                    type="text"
                    value={wizardForm.step1TitleMedya}
                    onChange={(e) => setWizardForm({ ...wizardForm, step1TitleMedya: e.target.value })}
                    placeholder="Örn: Hizmet ve Paket Özellikleri"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-corp-border dark:border-white/10 text-sm bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
                  />
                </div>
              </div>

              {/* Aksiyon Butonları */}
              <div className="pt-4 border-t border-corp-border dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  disabled={savingWizard}
                  className="px-4 py-2.5 rounded-xl border border-corp-border text-xs font-semibold text-corp-gray hover:text-corp-charcoal dark:text-white/60 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <RotateCcw size={14} />
                  <span>Varsayılanlara Sıfırla</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveWizard}
                  disabled={savingWizard}
                  className="px-6 py-2.5 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
                >
                  {savingWizard ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Kaydediliyor...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Değişiklikleri Kaydet ve Yayınla</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Sağ Kolon: Canlı Önizleme & Rehber */}
          <div className="space-y-6">
            {/* Canlı Önizleme Kartı */}
            <div className="bg-white dark:bg-corp-charcoal p-5 rounded-2xl border border-corp-border dark:border-white/10 shadow-xs space-y-4 sticky top-6">
              <div className="flex items-center justify-between pb-3 border-b border-corp-border dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-corp-charcoal dark:text-white">
                    Canlı Önizleme Simülatörü
                  </span>
                </div>
                <Link
                  href="/magaza/urun/numarator-kasesi-s2e5"
                  target="_blank"
                  className="text-[11px] text-corp-teal font-semibold hover:underline flex items-center gap-1"
                >
                  <span>Canlı Sayfayı Aç</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              {/* Kaşe Ürünü İçin Önizleme */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-corp-gray uppercase tracking-wider">
                  Örnek: Numaratör Kaşesi Görünümü
                </span>
                <div className="bg-corp-surface dark:bg-white/5 p-4 rounded-xl border border-corp-border/80 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-corp-border/50">
                    <span className="w-5 h-5 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span className="font-display font-bold text-xs text-corp-charcoal dark:text-white">
                      {wizardForm.step1TitleKase || wizardForm.step1Title}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-corp-charcoal dark:text-white">
                      Mürekkep Rengi Seçiniz
                    </label>
                    <div className="h-8 rounded-lg border border-corp-border bg-white dark:bg-corp-charcoal px-2.5 flex items-center text-xs text-corp-gray">
                      Siyah
                    </div>
                  </div>
                </div>
              </div>

              {/* Standart Baskı Ürünü İçin Önizleme */}
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-corp-gray uppercase tracking-wider">
                  Örnek: Standart Baskı Ürünü Görünümü
                </span>
                <div className="bg-corp-surface dark:bg-white/5 p-4 rounded-xl border border-corp-border/80 space-y-3">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-corp-border/50">
                    <span className="w-5 h-5 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-[10px]">
                      1
                    </span>
                    <span className="font-display font-bold text-xs text-corp-charcoal dark:text-white">
                      {wizardForm.step1Title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pb-2 border-b border-corp-border/50">
                    <span className="w-5 h-5 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-[10px]">
                      2
                    </span>
                    <span className="font-display font-bold text-xs text-corp-charcoal dark:text-white">
                      {wizardForm.step2Title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 pb-2 border-b border-corp-border/50">
                    <span className="w-5 h-5 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-[10px]">
                      3
                    </span>
                    <span className="font-display font-bold text-xs text-corp-charcoal dark:text-white">
                      {wizardForm.step3Title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-[10px]">
                      4
                    </span>
                    <span className="font-display font-bold text-xs text-corp-charcoal dark:text-white">
                      {wizardForm.step4Title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Hiyerarşi Açıklaması */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 text-xs text-blue-800 dark:text-blue-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <HelpCircle size={14} />
                  <span>Başlık Çözümleme Hiyerarşisi</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  1. Ürün Formundaki Özel Başlık (varsa)<br />
                  2. Alt Kategori Eşleşmesi (Kaşe / Numaratör vb.)<br />
                  3. Ana Kategori Ayarı (Teknoloji, Medya vb.)<br />
                  4. Genel Dinamik Başlık (Buradaki varsayılan)<br />
                  5. Kod İçi Fallback Güvencesi
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─── TAB 2: TÜM DİNAMİK İÇERİK KAYITLARI (KEY-VALUE CMS) ────────── */
        <div className="bg-white dark:bg-corp-charcoal p-6 rounded-2xl border border-corp-border dark:border-white/10 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-corp-charcoal dark:text-white">
                Sistem Dinamik İçerik Kayıtları
              </h2>
              <p className="text-xs text-corp-gray dark:text-white/60">
                Veritabanında kayıtlı tüm anahtar-değer (Key-Value) çiftleri.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setModalForm({
                  key: "",
                  content: "",
                  locale: "tr",
                  description: "",
                  group: "product_configurator",
                });
                setModalError(null);
                setModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-colors flex items-center gap-2 shrink-0 shadow-xs"
            >
              <Plus size={16} />
              <span>Yeni Anahtar Ekle</span>
            </button>
          </div>

          {/* Filtre ve Arama Çubuğu */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-corp-gray" />
              <input
                type="text"
                placeholder="Anahtar, içerik veya açıklama ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[40px] pl-10 pr-4 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-corp-surface dark:bg-white/5 text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal"
              />
            </div>

            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-corp-surface dark:bg-white/5 text-corp-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-corp-teal shrink-0"
            >
              <option value="all">Tüm Gruplar</option>
              {availableGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Veri Tablosu */}
          <div className="overflow-x-auto rounded-xl border border-corp-border dark:border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-corp-surface dark:bg-white/5 border-b border-corp-border dark:border-white/10 text-corp-gray uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Anahtar (Key)</th>
                  <th className="p-3.5">Değer (Content)</th>
                  <th className="p-3.5">Grup</th>
                  <th className="p-3.5">Açıklama</th>
                  <th className="p-3.5">Son Güncelleme</th>
                  <th className="p-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-corp-border dark:divide-white/10">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-corp-gray">
                      Arama kriterlerine uygun içerik bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 font-mono text-[11px] font-bold text-corp-teal">
                        {item.key}
                      </td>
                      <td className="p-3.5 font-medium text-corp-charcoal dark:text-white max-w-xs truncate">
                        {item.content}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-white/10 text-corp-charcoal dark:text-white">
                          {item.group}
                        </span>
                      </td>
                      <td className="p-3.5 text-corp-gray dark:text-white/60 max-w-xs truncate">
                        {item.description || "-"}
                      </td>
                      <td className="p-3.5 text-corp-gray dark:text-white/60 text-[11px]">
                        <div>{new Date(item.updatedAt).toLocaleDateString("tr-TR")}</div>
                        {item.updatedBy && <div className="text-[10px] text-corp-teal">{item.updatedBy}</div>}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(true);
                              setModalForm({
                                key: item.key,
                                content: item.content,
                                locale: item.locale || "tr",
                                description: item.description || "",
                                group: item.group || "product_configurator",
                              });
                              setModalError(null);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-corp-gray hover:text-corp-teal hover:bg-corp-teal/10 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.key)}
                            className="p-1.5 rounded-lg text-corp-gray hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
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
      )}

      {/* Modal: Yeni / Düzenle */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-corp-charcoal rounded-2xl border border-corp-border dark:border-white/10 max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-corp-border dark:border-white/10">
              <h3 className="font-display font-bold text-base text-corp-charcoal dark:text-white">
                {isEditing ? "Dinamik İçeriği Düzenle" : "Yeni Dinamik İçerik Ekle"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-corp-gray hover:text-corp-charcoal dark:hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                  Anahtar (Key) *
                </label>
                <input
                  type="text"
                  disabled={isEditing}
                  value={modalForm.key}
                  onChange={(e) => setModalForm({ ...modalForm, key: e.target.value })}
                  placeholder="örn: product_configurator.step1_title_kase"
                  className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs font-mono bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white disabled:opacity-60"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                  İçerik Değeri (Content) *
                </label>
                <textarea
                  rows={3}
                  value={modalForm.content}
                  onChange={(e) => setModalForm({ ...modalForm, content: e.target.value })}
                  placeholder="Görüntülenecek dinamik metin..."
                  className="w-full px-3 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white focus:ring-2 focus:ring-corp-teal"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Grup
                  </label>
                  <input
                    type="text"
                    value={modalForm.group}
                    onChange={(e) => setModalForm({ ...modalForm, group: e.target.value })}
                    placeholder="örn: product_configurator"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                    Dil (Locale)
                  </label>
                  <input
                    type="text"
                    value={modalForm.locale}
                    onChange={(e) => setModalForm({ ...modalForm, locale: e.target.value })}
                    placeholder="tr"
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-corp-charcoal dark:text-white mb-1">
                  Açıklama (Opsiyonel)
                </label>
                <input
                  type="text"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  placeholder="Bu anahtar nerede kullanılıyor?"
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-corp-border dark:border-white/10 text-xs bg-white dark:bg-corp-charcoal text-corp-charcoal dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-corp-border dark:border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-corp-border text-xs font-semibold text-corp-gray hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={savingModal}
                  className="px-5 py-2 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-colors shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {savingModal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>{isEditing ? "Güncelle" : "Kaydet"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
