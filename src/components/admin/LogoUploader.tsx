"use client";

import React, { useState, useRef, useCallback } from "react";
import { UploadCloud, Image as ImageIcon, Loader2, X, RefreshCw, CheckCircle2, Link as LinkIcon, Eye } from "lucide-react";
import { toast } from "sonner";

interface LogoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function LogoUploader({ value, onChange, className = "" }: LogoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewBg, setPreviewBg] = useState<"checker" | "white">("checker");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = useCallback(
    async (file: File) => {
      // 1. Client-side validation
      const maxBytes = 5 * 1024 * 1024; // 5 MB
      if (file.size > maxBytes) {
        toast.error(`Dosya boyutu çok büyük: ${(file.size / (1024 * 1024)).toFixed(2)} MB. Maksimum 5 MB yüklenebilir.`);
        return;
      }

      const validMimes = [
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp",
        "image/svg+xml",
      ];
      const validExtensions = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

      if (!validMimes.includes(file.type) && !validExtensions.includes(ext)) {
        toast.error("Geçersiz dosya formatı. Yalnızca PNG, WebP, JPG veya SVG logo dosyaları yükleyebilirsiniz.");
        return;
      }

      setIsUploading(true);
      const loadingToast = toast.loading("Logo optimize ediliyor ve yükleniyor...");

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/clients/upload-logo", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Logo yüklenemedi.");
        }

        toast.success("Logo başarıyla yüklendi ve optimize edildi!", { id: loadingToast });
        onChange(data.url);
      } catch (err: any) {
        console.error("[LogoUploader] Yükleme hatası:", err);
        toast.error(err.message || "Görsel yüklenirken bir hata oluştu.", { id: loadingToast });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileProcess(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {value ? (
        // Preview State
        <div className="border border-corp-border rounded-xl p-4 bg-white space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs text-corp-gray font-medium pb-2 border-b border-corp-border/60">
            <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
              <CheckCircle2 size={14} /> Logo Yüklendi
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-corp-gray/80">Önizleme zemini:</span>
              <button
                type="button"
                onClick={() => setPreviewBg("checker")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  previewBg === "checker"
                    ? "bg-corp-teal text-white font-semibold"
                    : "bg-corp-surface text-corp-gray hover:text-corp-charcoal"
                }`}
                title="Şeffaflık ızgarası"
              >
                Şeffaf
              </button>
              <button
                type="button"
                onClick={() => setPreviewBg("white")}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  previewBg === "white"
                    ? "bg-corp-teal text-white font-semibold"
                    : "bg-corp-surface text-corp-gray hover:text-corp-charcoal"
                }`}
                title="Beyaz zemin"
              >
                Beyaz
              </button>
            </div>
          </div>

          {/* Logo Display Canvas */}
          <div
            className={`relative w-full h-32 rounded-lg border border-corp-border/80 flex items-center justify-center p-4 transition-all overflow-hidden ${
              previewBg === "white"
                ? "bg-white"
                : "bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%),linear-gradient(-45deg,#f0f0f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f0f0f0_75%),linear-gradient(-45deg,transparent_75%,#f0f0f0_75%)] bg-[size:16px_16px] bg-[position:0_0,0_8px,8px_-8px,-8px_0px]"
            }`}
          >
            <img
              src={value}
              alt="Logo Önizleme"
              className="max-h-20 max-w-[85%] object-contain mix-blend-multiply select-none"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-xs text-corp-teal font-semibold flex items-center gap-1.5 hover:underline disabled:opacity-50"
            >
              <RefreshCw size={13} className={isUploading ? "animate-spin" : ""} />
              Yeni Dosya Seç
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={handleRemove}
              className="text-xs text-red-600 font-semibold flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              <X size={14} /> Logoyu Kaldır
            </button>
          </div>
        </div>
      ) : (
        // Dropzone State
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 select-none ${
            isDragging
              ? "border-corp-teal bg-corp-teal-50/70 scale-[0.99]"
              : "border-corp-border hover:border-corp-teal/50 hover:bg-corp-surface/50 bg-white"
          } ${isUploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {isUploading ? (
            <div className="py-4 space-y-2">
              <Loader2 size={32} className="animate-spin text-corp-teal mx-auto" />
              <p className="text-xs font-semibold text-corp-charcoal">Logo işleniyor ve yükleniyor...</p>
              <p className="text-[11px] text-corp-gray">WebP formatına dönüştürülüyor</p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="w-12 h-12 rounded-full bg-corp-teal-50 text-corp-teal mx-auto flex items-center justify-center transition-transform group-hover:scale-110">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-corp-charcoal">
                  Dosyayı buraya sürükleyip bırakın
                </p>
                <p className="text-xs text-corp-gray mt-0.5">
                  veya bilgisayarınızdan dosya seçmek için tıklayın
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-[11px] text-corp-gray">
                <span className="bg-corp-surface px-2 py-0.5 rounded text-corp-charcoal font-medium">PNG</span>
                <span className="bg-corp-surface px-2 py-0.5 rounded text-corp-charcoal font-medium">WebP</span>
                <span className="bg-corp-surface px-2 py-0.5 rounded text-corp-charcoal font-medium">JPG</span>
                <span className="bg-corp-surface px-2 py-0.5 rounded text-corp-charcoal font-medium">SVG</span>
                <span>• Maks. 5 MB</span>
              </div>
              <p className="text-[11px] text-corp-gray/80 italic pt-1">
                Tasarım uyumu için şeffaf veya beyaz zeminli marka logoları desteklenir.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Manual URL input fallback toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-corp-gray hover:text-corp-teal transition-colors flex items-center gap-1"
        >
          <LinkIcon size={12} />
          {showUrlInput ? "URL girişini gizle" : "Veya harici URL ile belirt"}
        </button>

        {showUrlInput && (
          <div className="mt-2">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://... veya /uploads/..."
              className="w-full text-xs px-3 py-2 border border-corp-border rounded-lg focus:outline-none focus:ring-2 focus:ring-corp-teal/20 focus:border-corp-teal bg-white"
            />
          </div>
        )}
      </div>
    </div>
  );
}
