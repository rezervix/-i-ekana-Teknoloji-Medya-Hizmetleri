"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Star,
  Tag,
  DollarSign,
  Phone,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { DEFAULT_ETICARET_CMS, type ETicaretCMSData } from "@/types/ecommerce-cms";

export default function AdminETicaretCMSPage() {
  const [data, setData] = useState<ETicaretCMSData>(DEFAULT_ETICARET_CMS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "stats" | "bonus" | "highlights" | "packages" | "faqs" | "cta">("hero");

  // Fetch current CMS data
  useEffect(() => {
    fetchCMSData();
  }, []);

  const fetchCMSData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/content/e-ticaret");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("CMS veri çekme hatası:", err);
      toast.error("Veriler yüklenirken hata oluştu, varsayılanlar gösteriliyor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/content/e-ticaret", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("e-Ticaret sayfası başarıyla kaydedildi ve canlıya alındı!");
        setData(json.data);
      } else {
        throw new Error(json.error || "Kaydedilemedi");
      }
    } catch (err: any) {
      console.error("Kayıt hatası:", err);
      toast.error(err.message || "Kaydetme sırasında bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Tüm ayarları sistem varsayılanlarına sıfırlamak istediğinize emin misiniz?")) {
      setData(DEFAULT_ETICARET_CMS);
      toast.info("Form varsayılan değerlere döndürüldü. Değişiklikleri uygulamak için 'Kaydet' butonuna basın.");
    }
  };

  // Highlights handlers
  const handleAddHighlight = () => {
    const newItem = {
      id: Date.now().toString(),
      label: "Yeni Özellik",
      desc: "Özellik açıklamasını buraya yazın.",
      color: "#0A4D68",
      iconName: "ShoppingCart",
    };
    setData({
      ...data,
      highlights: {
        ...data.highlights,
        items: [...data.highlights.items, newItem],
      },
    });
  };

  const handleRemoveHighlight = (id: string) => {
    setData({
      ...data,
      highlights: {
        ...data.highlights,
        items: data.highlights.items.filter((item) => item.id !== id),
      },
    });
  };

  // Packages handlers
  const handleAddPackage = () => {
    const newPkg = {
      id: "pkg-" + Date.now().toString(),
      name: "Yeni Paket",
      monthly: "9.900",
      yearlyTotal: "118.800",
      crossedOut: "150.000",
      installment: "Vade Farksız 6 Ay Taksit",
      featured: false,
      accent: "#0A4D68",
      features: [
        { name: "Sınırsız Trafik ve Barındırma", tooltip: null },
        { name: "Gelişmiş Sepet Kurtarma", tooltip: "Otomatik e-posta ve SMS kurguları" },
      ],
      bonus: null,
    };
    setData({
      ...data,
      packages: [...data.packages, newPkg],
    });
  };

  const handleRemovePackage = (index: number) => {
    if (confirm("Bu paketi silmek istediğinize emin misiniz?")) {
      setData({
        ...data,
        packages: data.packages.filter((_, i) => i !== index),
      });
    }
  };

  const handleAddPackageFeature = (pkgIndex: number) => {
    const featureName = prompt("Eklenecek özellik adını giriniz:");
    if (!featureName) return;
    const tooltip = prompt("Opsiyonel: Varsa bilgi ipucu (tooltip) açıklaması giriniz:") || null;

    const updatedPkgs = [...data.packages];
    updatedPkgs[pkgIndex].features.push({
      name: featureName,
      tooltip: tooltip,
    });
    setData({ ...data, packages: updatedPkgs });
  };

  const handleRemovePackageFeature = (pkgIndex: number, featureIndex: number) => {
    const updatedPkgs = [...data.packages];
    updatedPkgs[pkgIndex].features = updatedPkgs[pkgIndex].features.filter((_, fi) => fi !== featureIndex);
    setData({ ...data, packages: updatedPkgs });
  };

  // FAQs handlers
  const handleAddFaq = () => {
    const newFaq = {
      id: "f-" + Date.now().toString(),
      q: "Yeni Soru Başlığı?",
      a: "Detaylı cevabı buraya yazın.",
    };
    setData({
      ...data,
      faqs: [...data.faqs, newFaq],
    });
  };

  const handleRemoveFaq = (id: string) => {
    setData({
      ...data,
      faqs: data.faqs.filter((f) => f.id !== id),
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Loader2 size={32} className="animate-spin text-corp-teal" />
        <p className="text-sm font-medium text-corp-gray">e-Ticaret içerik yöneticisi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center border border-corp-teal/20 shadow-sm">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">
              e-Ticaret Sayfa Yönetimi (CMS)
            </h1>
            <p className="text-sm text-corp-gray">
              e-Ticaret sayfasının tüm vitrin metinlerini, paketlerini, fiyatlarını ve SSS bloklarını dinamik olarak yönetin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/e-ticaret"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-corp-border bg-white text-xs font-semibold text-corp-charcoal hover:bg-corp-surface transition-all"
          >
            <Eye size={14} className="text-corp-teal" />
            Canlı Sayfayı Gör
          </Link>
          <button
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-corp-border bg-white text-xs font-semibold text-corp-gray hover:text-corp-charcoal transition-all"
          >
            <RotateCcw size={14} />
            Varsayılanlar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 active:scale-[0.98] transition-all shadow-md shadow-corp-teal/20 disabled:opacity-50"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Canlıya Alınıyor..." : "Değişiklikleri Yayınla"}
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-corp-border pb-3">
        {[
          { key: "hero", label: "1. Hero & Başlıklar" },
          { key: "stats", label: "2. Sosyal Kanıt & İstatistikler" },
          { key: "bonus", label: "3. Fırsat / Promosyon Barı" },
          { key: "highlights", label: "4. Özellikler & Araçlar" },
          { key: "packages", label: "5. Paketler & Fiyatlandırma" },
          { key: "faqs", label: "6. Sıkça Sorulan Sorular (SSS)" },
          { key: "cta", label: "7. Kapanış CTA Banner" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.key
                ? "bg-corp-charcoal text-white shadow-sm"
                : "bg-white text-corp-gray hover:text-corp-charcoal border border-corp-border/60 hover:bg-corp-surface"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: HERO & BAŞLIKLAR */}
      {activeTab === "hero" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="border-b border-corp-border/60 pb-3">
            <h2 className="font-display font-bold text-lg text-corp-charcoal">Hero Bölümü ve Üst Başlıklar</h2>
            <p className="text-xs text-corp-gray">Sayfanın en üstünde yer alan ana karşılama mesajını ve CTA yönlendirmelerini yapılandırın.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Üst Rozet Metni</label>
              <input
                type="text"
                value={data.hero.badge}
                onChange={(e) => setData({ ...data, hero: { ...data.hero, badge: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Birincil Buton Metni & Hedef</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={data.hero.primaryCtaText}
                  onChange={(e) => setData({ ...data, hero: { ...data.hero, primaryCtaText: e.target.value } })}
                  placeholder="Buton Yazısı"
                  className="px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
                />
                <input
                  type="text"
                  value={data.hero.primaryCtaLink}
                  onChange={(e) => setData({ ...data, hero: { ...data.hero, primaryCtaLink: e.target.value } })}
                  placeholder="Link (ör: #paketler)"
                  className="px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Ana Başlık Parçaları (Canlı Gradyan İçin)</label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <span className="text-[11px] text-corp-gray block mb-1">Giriş Metni</span>
                  <input
                    type="text"
                    value={data.hero.titleRegular}
                    onChange={(e) => setData({ ...data, hero: { ...data.hero, titleRegular: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:border-corp-teal focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-corp-teal font-semibold block mb-1">Teal Vurgulu Metin</span>
                  <input
                    type="text"
                    value={data.hero.titleHighlight1}
                    onChange={(e) => setData({ ...data, hero: { ...data.hero, titleHighlight1: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:border-corp-teal focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-corp-gray block mb-1">Ara Metin</span>
                  <input
                    type="text"
                    value={data.hero.titleMiddle}
                    onChange={(e) => setData({ ...data, hero: { ...data.hero, titleMiddle: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:border-corp-teal focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-corp-coral font-semibold block mb-1">Mercan Vurgulu Metin</span>
                  <input
                    type="text"
                    value={data.hero.titleHighlight2}
                    onChange={(e) => setData({ ...data, hero: { ...data.hero, titleHighlight2: e.target.value } })}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs focus:border-corp-teal focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Açıklama Paragrafı</label>
              <textarea
                rows={3}
                value={data.hero.description}
                onChange={(e) => setData({ ...data, hero: { ...data.hero, description: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STATS */}
      {activeTab === "stats" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="border-b border-corp-border/60 pb-3">
            <h2 className="font-display font-bold text-lg text-corp-charcoal">Sosyal Kanıt & İstatistik Göstergeleri</h2>
            <p className="text-xs text-corp-gray">Hero bölümünün altında yer alan 3 sütunlu güven ve başarı metrikleri.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-4 rounded-xl border border-corp-border/70 bg-corp-surface/50 space-y-3">
              <span className="text-xs font-bold text-corp-teal uppercase tracking-wider">Metrik 1</span>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Değer / Yüzde</label>
                <input
                  type="text"
                  value={data.socialProof.stat1Value}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat1Value: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border font-bold text-lg text-corp-charcoal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Açıklama Etiketi</label>
                <input
                  type="text"
                  value={data.socialProof.stat1Label}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat1Label: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-corp-border/70 bg-corp-surface/50 space-y-3">
              <span className="text-xs font-bold text-corp-charcoal uppercase tracking-wider">Metrik 2</span>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Değer</label>
                <input
                  type="text"
                  value={data.socialProof.stat2Value}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat2Value: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border font-bold text-lg text-corp-charcoal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Açıklama Etiketi</label>
                <input
                  type="text"
                  value={data.socialProof.stat2Label}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat2Label: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-corp-border/70 bg-corp-surface/50 space-y-3">
              <span className="text-xs font-bold text-corp-coral uppercase tracking-wider">Metrik 3</span>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Değer / Yüzde</label>
                <input
                  type="text"
                  value={data.socialProof.stat3Value}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat3Value: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border font-bold text-lg text-corp-charcoal"
                />
              </div>
              <div>
                <label className="block text-[11px] text-corp-gray mb-1">Açıklama Etiketi</label>
                <input
                  type="text"
                  value={data.socialProof.stat3Label}
                  onChange={(e) => setData({ ...data, socialProof: { ...data.socialProof, stat3Label: e.target.value } })}
                  className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BONUS CALLOUT */}
      {activeTab === "bonus" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="border-b border-corp-border/60 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-lg text-corp-charcoal">Fırsat ve Promosyon Çağrısı (Callout)</h2>
              <p className="text-xs text-corp-gray">Sayfa ortasında sarı arkaplanla vurgulanan özel promosyon veya hediye duyurusu.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.bonusCallout.enabled}
                onChange={(e) => setData({ ...data, bonusCallout: { ...data.bonusCallout, enabled: e.target.checked } })}
                className="w-4 h-4 text-corp-teal rounded focus:ring-corp-teal"
              />
              <span className="text-xs font-bold text-corp-charcoal">Yayında Göster</span>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Vurgulu Başlık</label>
              <input
                type="text"
                value={data.bonusCallout.title}
                onChange={(e) => setData({ ...data, bonusCallout: { ...data.bonusCallout, title: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Duyuru ve Teklif Metni</label>
              <textarea
                rows={3}
                value={data.bonusCallout.description}
                onChange={(e) => setData({ ...data, bonusCallout: { ...data.bonusCallout, description: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm focus:border-corp-teal focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HIGHLIGHTS */}
      {activeTab === "highlights" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-corp-border/60 pb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-corp-charcoal">Özellikler ve Satış Araçları</h2>
              <p className="text-xs text-corp-gray">Müşteriye sunulan altyapı yetenekleri (sepet kurtarma, SEO, yapay zeka vb.).</p>
            </div>
            <button
              onClick={handleAddHighlight}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-all self-start sm:self-auto"
            >
              <Plus size={14} /> Yeni Özellik Kartı Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1">Bölüm Başlığı</label>
              <input
                type="text"
                value={data.highlights.sectionTitle}
                onChange={(e) => setData({ ...data, highlights: { ...data.highlights, sectionTitle: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg border border-corp-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1">Bölüm Alt Başlığı</label>
              <input
                type="text"
                value={data.highlights.sectionSubtitle}
                onChange={(e) => setData({ ...data, highlights: { ...data.highlights, sectionSubtitle: e.target.value } })}
                className="w-full px-3 py-2 rounded-lg border border-corp-border text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {data.highlights.items.map((item, index) => (
              <div key={item.id || index} className="p-4 rounded-xl border border-corp-border bg-white shadow-sm space-y-3 relative group">
                <button
                  onClick={() => handleRemoveHighlight(item.id)}
                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50 transition-colors"
                  title="Kartı Sil"
                >
                  <Trash2 size={15} />
                </button>

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => {
                      const updated = [...data.highlights.items];
                      updated[index].color = e.target.value;
                      setData({ ...data, highlights: { ...data.highlights, items: updated } });
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-corp-border"
                  />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => {
                      const updated = [...data.highlights.items];
                      updated[index].label = e.target.value;
                      setData({ ...data, highlights: { ...data.highlights, items: updated } });
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-corp-border font-bold text-xs"
                    placeholder="Başlık"
                  />
                </div>

                <textarea
                  rows={2}
                  value={item.desc}
                  onChange={(e) => {
                    const updated = [...data.highlights.items];
                    updated[index].desc = e.target.value;
                    setData({ ...data, highlights: { ...data.highlights, items: updated } });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs text-corp-gray"
                  placeholder="Açıklama"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: PACKAGES & PRICING */}
      {activeTab === "packages" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-corp-border/60 pb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-corp-charcoal">Fiyatlandırma & Hizmet Paketleri</h2>
              <p className="text-xs text-corp-gray">Gold, Plus veya firmanıza özel e-ticaret paketlerinin fiyat ve özellik matrisini yönetin.</p>
            </div>
            <button
              onClick={handleAddPackage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-all self-start sm:self-auto"
            >
              <Plus size={14} /> Yeni Paket Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.packages.map((pkg, pIndex) => (
              <div
                key={pkg.id || pIndex}
                className={`p-6 rounded-2xl border ${
                  pkg.featured ? "border-corp-coral/50 bg-corp-coral/[0.02]" : "border-corp-border bg-white"
                } shadow-sm space-y-4 relative`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pkg.accent}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].accent = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="w-7 h-7 rounded-lg cursor-pointer border border-corp-border"
                      title="Tema Vurgusu Rengi"
                    />
                    <input
                      type="text"
                      value={pkg.name}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].name = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="font-display font-bold text-base text-corp-charcoal border-b border-dashed border-corp-border pb-0.5 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.featured}
                        onChange={(e) => {
                          const updated = [...data.packages];
                          updated[pIndex].featured = e.target.checked;
                          setData({ ...data, packages: updated });
                        }}
                        className="rounded text-corp-coral"
                      />
                      <span>En Popüler</span>
                    </label>
                    <button
                      onClick={() => handleRemovePackage(pIndex)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Paketi Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] text-corp-gray mb-1">Aylık (₺/ay)</label>
                    <input
                      type="text"
                      value={pkg.monthly}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].monthly = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-corp-gray mb-1">Yıllık Toplam (₺)</label>
                    <input
                      type="text"
                      value={pkg.yearlyTotal}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].yearlyTotal = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-corp-gray mb-1">Çizili Eski Fiyat (₺)</label>
                    <input
                      type="text"
                      value={pkg.crossedOut}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].crossedOut = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs line-through text-corp-gray"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-corp-gray mb-1">Taksit Notu</label>
                    <input
                      type="text"
                      value={pkg.installment}
                      onChange={(e) => {
                        const updated = [...data.packages];
                        updated[pIndex].installment = e.target.value;
                        setData({ ...data, packages: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-corp-border text-xs"
                    />
                  </div>
                </div>

                {/* Features Checklist */}
                <div className="border-t border-corp-border pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-corp-charcoal">Paket Kapsamındaki Özellikler</span>
                    <button
                      onClick={() => handleAddPackageFeature(pIndex)}
                      className="text-[11px] text-corp-teal font-bold hover:underline inline-flex items-center gap-1"
                    >
                      <Plus size={12} /> Özellik Ekle
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {pkg.features.map((feat, fIndex) => (
                      <div key={fIndex} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-corp-surface text-xs">
                        <span className={`truncate flex-1 ${feat.bold ? "font-bold text-corp-charcoal" : "text-corp-gray"}`}>
                          • {feat.name} {feat.tooltip && <span className="text-[10px] text-corp-teal ml-1">({feat.tooltip})</span>}
                        </span>
                        <button
                          onClick={() => handleRemovePackageFeature(pIndex, fIndex)}
                          className="text-red-500 hover:text-red-700 p-0.5"
                          title="Sil"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: FAQS */}
      {activeTab === "faqs" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-corp-border/60 pb-3">
            <div>
              <h2 className="font-display font-bold text-lg text-corp-charcoal">Sıkça Sorulan Sorular (SSS)</h2>
              <p className="text-xs text-corp-gray">Müşterilerin en çok merak ettiği sorular ve detaylı cevapları.</p>
            </div>
            <button
              onClick={handleAddFaq}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-corp-teal text-white text-xs font-bold hover:bg-corp-teal-600 transition-all self-start sm:self-auto"
            >
              <Plus size={14} /> Yeni Soru Ekle
            </button>
          </div>

          <div className="space-y-3">
            {data.faqs.map((faq, index) => (
              <div key={faq.id || index} className="p-4 rounded-xl border border-corp-border bg-corp-surface/30 space-y-2 relative group">
                <button
                  onClick={() => handleRemoveFaq(faq.id)}
                  className="absolute top-3 right-3 text-red-500 hover:text-red-700 p-1"
                  title="Soruyu Sil"
                >
                  <Trash2 size={15} />
                </button>
                <div className="pr-8">
                  <label className="block text-[11px] font-bold text-corp-charcoal mb-1">Soru</label>
                  <input
                    type="text"
                    value={faq.q}
                    onChange={(e) => {
                      const updated = [...data.faqs];
                      updated[index].q = e.target.value;
                      setData({ ...data, faqs: updated });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-corp-gray mb-1">Cevap</label>
                  <textarea
                    rows={2}
                    value={faq.a}
                    onChange={(e) => {
                      const updated = [...data.faqs];
                      updated[index].a = e.target.value;
                      setData({ ...data, faqs: updated });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-corp-border text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: FINAL CTA */}
      {activeTab === "cta" && (
        <div className="bg-white rounded-2xl border border-corp-border p-6 shadow-sm space-y-6">
          <div className="border-b border-corp-border/60 pb-3">
            <h2 className="font-display font-bold text-lg text-corp-charcoal">Kapanış Eyleme Çağrı Bannerı (CTA)</h2>
            <p className="text-xs text-corp-gray">Sayfanın en altındaki büyük koyu renkli kapanış banner'ı ve iletişim butonları.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Başlık Satırı 1</label>
              <input
                type="text"
                value={data.finalCta.titleLine1}
                onChange={(e) => setData({ ...data, finalCta: { ...data.finalCta, titleLine1: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-corp-coral mb-1.5">Vurgulu Başlık Satırı 2</label>
              <input
                type="text"
                value={data.finalCta.titleHighlight}
                onChange={(e) => setData({ ...data, finalCta: { ...data.finalCta, titleHighlight: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Açıklama</label>
              <textarea
                rows={2}
                value={data.finalCta.description}
                onChange={(e) => setData({ ...data, finalCta: { ...data.finalCta, description: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Satış Temsilcisi Buton Yazısı</label>
              <input
                type="text"
                value={data.finalCta.salesRepBtnText}
                onChange={(e) => setData({ ...data, finalCta: { ...data.finalCta, salesRepBtnText: e.target.value } })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-corp-charcoal mb-1.5">Satış Temsilcisi Telefon / WhatsApp Hattı</label>
              <input
                type="text"
                value={data.finalCta.salesRepPhone}
                onChange={(e) => setData({ ...data, finalCta: { ...data.finalCta, salesRepPhone: e.target.value } })}
                placeholder="+905303412156"
                className="w-full px-3.5 py-2.5 rounded-xl border border-corp-border text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
