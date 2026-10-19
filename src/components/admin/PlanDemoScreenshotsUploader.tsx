"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  UploadCloud,
  X,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export interface DemoScreenshotItem {
  url: string;
  caption: string;
  alt: string;
  order?: number;
}

interface PlanDemoScreenshotsUploaderProps {
  screenshots: DemoScreenshotItem[];
  onChange: (screenshots: DemoScreenshotItem[]) => void;
  maxScreenshots?: number;
}

interface UploadingQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "uploading" | "success" | "error";
  errorMessage?: string;
}

export default function PlanDemoScreenshotsUploader({
  screenshots,
  onChange,
  maxScreenshots = 8,
}: PlanDemoScreenshotsUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadingQueueItem[]>([]);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [manualUrl, setManualUrl] = useState("");
  const [manualCaption, setManualCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dosyayı sunucuya yükle
  const uploadSingleFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/admin/plans/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Görsel yüklenemedi");
    }

    const data = await res.json();
    return data.url;
  };

  // Birden fazla dosyayı kuyruğa al ve yükle
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileList = Array.from(files);
      const remainingQuota = maxScreenshots - screenshots.length;

      if (remainingQuota <= 0) {
        toast.error(`En fazla ${maxScreenshots} adet demo görseli ekleyebilirsiniz.`);
        return;
      }

      const filesToProcess = fileList.slice(0, remainingQuota);
      if (fileList.length > remainingQuota) {
        toast.warning(
          `Kota sınırı nedeniyle ilk ${remainingQuota} dosya işleme alındı.`
        );
      }

      // Yeni kuyruk öğeleri oluştur
      const newQueueItems: UploadingQueueItem[] = filesToProcess.map((file) => ({
        id: `upload-${Math.random().toString(36).slice(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 10,
        status: "uploading",
      }));

      setUploadQueue((prev) => [...prev, ...newQueueItems]);

      const successfullyUploaded: DemoScreenshotItem[] = [];

      for (const item of newQueueItems) {
        try {
          // İlerleme simülasyonu
          setUploadQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, progress: 45 } : q))
          );

          const uploadedUrl = await uploadSingleFile(item.file);

          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, progress: 100, status: "success" } : q
            )
          );

          successfullyUploaded.push({
            url: uploadedUrl,
            caption: item.file.name.replace(/\.[^/.]+$/, ""),
            alt: item.file.name.replace(/\.[^/.]+$/, ""),
            order: screenshots.length + successfullyUploaded.length,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Yükleme hatası";
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "error", errorMessage: message } : q
            )
          );
          toast.error(`${item.file.name}: ${message}`);
        }
      }

      if (successfullyUploaded.length > 0) {
        onChange([...screenshots, ...successfullyUploaded]);
        toast.success(
          `${successfullyUploaded.length} görsel başarıyla yüklendi ve eklendi.`
        );
      }

      // 3 saniye sonra başarılı kuyruk öğelerini temizle
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((q) => q.status === "uploading" || q.status === "error"));
      }, 3000);
    },
    [maxScreenshots, screenshots, onChange]
  );

  // Sürükle - Bırak Olayları
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  // Sıralama Değiştir (Move Left / Move Right)
  const moveItem = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= screenshots.length) return;

    const copy = [...screenshots];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    onChange(copy);
  };

  // Görseli Sil
  const removeItem = (index: number) => {
    const copy = screenshots.filter((_, i) => i !== index);
    onChange(copy);
    toast.info("Görsel listeden kaldırıldı.");
  };

  // Metin güncelle
  const updateCaption = (index: number, caption: string) => {
    const copy = screenshots.map((item, i) => (i === index ? { ...item, caption } : item));
    onChange(copy);
  };

  const updateAlt = (index: number, alt: string) => {
    const copy = screenshots.map((item, i) => (i === index ? { ...item, alt } : item));
    onChange(copy);
  };

  // Manuel URL Ekle
  const handleAddManualUrl = () => {
    if (!manualUrl.trim()) return;
    if (screenshots.length >= maxScreenshots) {
      toast.error(`En fazla ${maxScreenshots} adet görsel ekleyebilirsiniz.`);
      return;
    }

    const newItem: DemoScreenshotItem = {
      url: manualUrl.trim(),
      caption: manualCaption.trim() || "Arayüz önizlemesi",
      alt: manualCaption.trim() || "Arayüz önizlemesi",
      order: screenshots.length,
    };

    onChange([...screenshots, newItem]);
    setManualUrl("");
    setManualCaption("");
    setShowUrlModal(false);
    toast.success("Görsel bağlantısı eklendi.");
  };

  return (
    <div className="space-y-6">
      {/* Sürükle-Bırak Yükleme Alanı */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
          isDragging
            ? "border-corp-coral bg-corp-coral-light/20 scale-[0.99]"
            : "border-slate-200 bg-slate-50/60 hover:border-corp-teal/50 hover:bg-white"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              void handleFiles(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-corp-teal-50 text-corp-teal transition-transform duration-300 group-hover:scale-110">
          <UploadCloud size={28} />
        </div>

        <h3 className="mt-4 text-sm font-bold text-slate-800">
          Görselleri buraya sürükleyip bırakın veya seçmek için tıklayın
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          PNG, JPEG, WebP veya GIF · Maksimum 10 MB · Otomatik WebP Optimizasyonu
        </p>

        <div className="mt-4 flex items-center gap-3">
          <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs font-bold text-slate-700">
            {screenshots.length} / {maxScreenshots} Görsel
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowUrlModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:border-corp-teal hover:text-corp-teal"
          >
            <LinkIcon size={12} /> Harici URL ile Ekle
          </button>
        </div>
      </div>

      {/* Yükleme Kuyruğu (İlerleme Çubukları) */}
      {uploadQueue.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-700">İşlenen Dosyalar:</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  <Image
                    src={item.previewUrl}
                    alt={item.file.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="truncate text-slate-800">{item.file.name}</span>
                    {item.status === "uploading" && (
                      <span className="text-corp-teal flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> %{item.progress}
                      </span>
                    )}
                    {item.status === "success" && (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Tamam
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-rose-600 flex items-center gap-1">
                        <AlertCircle size={12} /> Hata
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all duration-300 ${
                        item.status === "error"
                          ? "bg-rose-500"
                          : item.status === "success"
                          ? "bg-emerald-500"
                          : "bg-corp-teal"
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mevcut Görseller Izgarası & Düzenleme */}
      {screenshots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Mevcut Demo Görselleri (Sıralanabilir & Düzenlenebilir)
            </h4>
            <span className="text-[11px] text-slate-500">
              Sırayı değiştirmek için yön oklarını kullanabilirsiniz.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {screenshots.map((item, index) => (
              <div
                key={index}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:border-corp-teal/50 hover:shadow-sm"
              >
                {/* Görsel Önizleme */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={item.url}
                    alt={item.alt || `Demo Görseli ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    unoptimized
                  />

                  {/* Sıra Numarası Rozeti */}
                  <div className="absolute top-2.5 left-2.5 rounded-full bg-corp-teal/90 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-extrabold text-white">
                    #{index + 1}
                  </div>

                  {/* Hızlı Aksiyon Araç Çubuğu */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-xl bg-white/90 p-1 shadow-sm backdrop-blur-md">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => moveItem(index, "left")}
                        title="Sola / Yukarı Taşı"
                        className="rounded-lg p-1 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <ArrowLeft size={14} />
                      </button>
                    )}
                    {index < screenshots.length - 1 && (
                      <button
                        type="button"
                        onClick={() => moveItem(index, "right")}
                        title="Sağa / Aşağı Taşı"
                        className="rounded-lg p-1 text-slate-700 hover:bg-slate-200 transition"
                      >
                        <ArrowRight size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      title="Görseli Sil"
                      className="rounded-lg p-1 text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Başlık & Alt Etiket Düzenleme */}
                <div className="p-4 space-y-2.5 border-t border-slate-100 bg-slate-50/40">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">
                      Görsel Alt Yazısı (Caption)
                    </label>
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateCaption(index, e.target.value)}
                      placeholder="Örn: 7/24 Gerçek zamanlı müşteri takip paneli"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none focus:border-corp-teal"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600">
                      Erişilebilirlik Alt Metni (SEO Alt Tag)
                    </label>
                    <input
                      type="text"
                      value={item.alt}
                      onChange={(e) => updateAlt(index, e.target.value)}
                      placeholder="Örn: Midvem çok kanallı gelen kutusu arayüzü"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2 text-xs outline-none focus:border-corp-teal"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manuel URL Ekleme Modalı / Çekmecesi */}
      {showUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-luxury animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-base font-bold text-slate-800">Harici Görsel URL'si Ekle</h4>
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Görsel URL *</label>
                <input
                  type="url"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/... veya https://..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-corp-teal"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Açıklama / Başlık</label>
                <input
                  type="text"
                  value={manualCaption}
                  onChange={(e) => setManualCaption(e.target.value)}
                  placeholder="Örn: Canlı Sepet Takip Arayüzü"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs outline-none focus:border-corp-teal"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUrlModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAddManualUrl}
                disabled={!manualUrl.trim()}
                className="rounded-xl bg-corp-teal px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-corp-teal/90 disabled:opacity-50"
              >
                Görseli Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
