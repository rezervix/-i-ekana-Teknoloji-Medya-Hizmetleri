"use client";

import React, { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LocalUploadButtonProps<TEndpoint = string> {
  endpoint?: TEndpoint | string;
  onClientUploadComplete?: (res: Array<{ url: string; name?: string; size?: number }>) => void;
  onUploadError?: (error: Error) => void;
  className?: string;
  buttonText?: string;
}

export function LocalUploadButton<TEndpoint = string>({
  onClientUploadComplete,
  onUploadError,
  className = "",
  buttonText = "Görsel Yükle",
}: LocalUploadButtonProps<TEndpoint>) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Dosya boyutu 5 MB sınırını aşıyor.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/products/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Görsel yüklenemedi.");
      }

      toast.success("Görsel başarıyla yüklendi");
      if (onClientUploadComplete) {
        onClientUploadComplete([
          { url: data.url, name: file.name, size: file.size },
        ]);
      }
    } catch (err: any) {
      console.error("[LocalUploadButton error]", err);
      toast.error(err.message || "Görsel yüklenirken hata oluştu.");
      if (onUploadError) onUploadError(err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={`inline-block ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 bg-corp-teal hover:bg-corp-teal/90 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-50"
      >
        {uploading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            <span>Yükleniyor...</span>
          </>
        ) : (
          <>
            <Upload size={14} />
            <span>{buttonText}</span>
          </>
        )}
      </button>
    </div>
  );
}

export const UploadButton = LocalUploadButton;
