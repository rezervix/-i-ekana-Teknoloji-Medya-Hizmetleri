"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { upload } from "@vercel/blob/client";
import {
  Upload,
  X,
  Star,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export const MAX_PRODUCT_IMAGES = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CONCURRENT_UPLOADS = 3;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
  uploadedUrl?: string;
}

interface ProductImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  productId?: string;
}

/**
 * İstemci tarafında görsel optimizasyonu:
 * - Uzun kenarı maks 2400px'e ölçekler
 * - WebP (kalite 0.85) veya JPEG olarak sıkıştırır
 * - EXIF yönünü korur
 * - Hata durumunda orijinal dosyayı döner
 */
async function compressImageClientSide(file: File): Promise<Blob | File> {
  // SVG veya dosya çok küçükse sıkıştırmaya gerek yok
  if (file.type === "image/svg+xml" || file.size < 150 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 2400;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d", { alpha: false });

        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size < file.size) {
              resolve(blob);
            } else if (blob) {
              resolve(blob);
            } else {
              // Fallback to JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  resolve(jpegBlob || file);
                },
                "image/jpeg",
                0.85
              );
            }
          },
          "image/webp",
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch {
      resolve(file);
    }
  });
}

function mapUploadError(err: any): string {
  const msg = String(err?.message || "").toLowerCase();
  if (msg.includes("413") || msg.includes("too large") || msg.includes("maximumsize")) {
    return "Dosya boyutu çok büyük (Maksimum 10 MB).";
  }
  if (msg.includes("content type") || msg.includes("format") || msg.includes("allowedcontenttypes")) {
    return "Desteklenmeyen dosya formatı. Sadece JPG, PNG, WebP ve AVIF yüklenebilir.";
  }
  if (msg.includes("blob_read_write_token") || msg.includes("token")) {
    return "Depolama belirteci eksik veya geçersiz. Lütfen sistem yöneticisiyle görüşün.";
  }
  if (msg.includes("unauthorized") || msg.includes("yetkisiz") || msg.includes("401") || msg.includes("403")) {
    return "Yetkisiz erişim. Oturumunuzun süresi dolmuş olabilir.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("bağlantı")) {
    return "Bağlantı hatası oluştu, lütfen internetinizi kontrol edip tekrar deneyin.";
  }
  return "Görsel yüklenirken bir hata oluştu. Lütfen tekrar deneyin.";
}

export default function ProductImageUploader({
  images,
  onChange,
  productId = "temp",
}: ProductImageUploaderProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadsCount = useRef(0);

  // Drag over handlers
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

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Process selected files
  const handleFilesSelected = (files: File[]) => {
    const currentTotal = images.length + queue.filter((q) => q.status !== "error").length;
    const remainingSlots = MAX_PRODUCT_IMAGES - currentTotal;

    if (remainingSlots <= 0) {
      toast.error(`Ürün başına en fazla ${MAX_PRODUCT_IMAGES} görsel eklenebilir.`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.warning(
        `Maksimum ${MAX_PRODUCT_IMAGES} sınırından dolayı yalnızca ilk ${remainingSlots} dosya seçildi.`
      );
    }

    const newQueueItems: UploadQueueItem[] = [];

    for (const file of filesToProcess) {
      // Validate format
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isValidExt = ["jpg", "jpeg", "png", "webp", "avif"].includes(ext || "");
      const isValidMime = ALLOWED_MIME_TYPES.has(file.type);

      if (!isValidExt && !isValidMime) {
        toast.error(`"${file.name}" desteklenmeyen format. Yalnızca JPG, PNG, WebP ve AVIF yüklenebilir.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`"${file.name}" boyutu 10 MB sınırını aşıyor.`);
        continue;
      }

      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const previewUrl = URL.createObjectURL(file);

      newQueueItems.push({
        id,
        file,
        previewUrl,
        progress: 0,
        status: "pending",
      });
    }

    if (newQueueItems.length > 0) {
      setQueue((prev) => [...prev, ...newQueueItems]);
    }
  };

  // Perform upload with 2 retries (exponential backoff)
  const uploadWithRetry = async (
    item: UploadQueueItem,
    attempt: number = 0
  ): Promise<string> => {
    try {
      // Step 1: Compress on client side
      const processedBlob = await compressImageClientSide(item.file);
      const ext = item.file.name.split(".").pop()?.toLowerCase() || "webp";
      const cleanFileName = item.file.name
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-");
      const uploadName = `${cleanFileName}.${ext}`;

      // Step 2: Upload directly to Vercel Blob
      const blob = await upload(uploadName, processedBlob, {
        access: "public",
        handleUploadUrl: "/api/admin/products/upload-token",
        clientPayload: JSON.stringify({ productId }),
        onUploadProgress: ({ percentage }) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, progress: Math.round(percentage) } : q
            )
          );
        },
      });

      return blob.url;
    } catch (err: any) {
      if (attempt < 2) {
        // Exponential backoff retry: 500ms, 1500ms
        const delay = attempt === 0 ? 500 : 1500;
        await new Promise((r) => setTimeout(r, delay));
        return uploadWithRetry(item, attempt + 1);
      }
      throw err;
    }
  };

  // Queue runner effect
  const runNextInQueue = useCallback(async () => {
    if (activeUploadsCount.current >= MAX_CONCURRENT_UPLOADS) return;

    // Find next pending item
    setQueue((currentQueue) => {
      const nextItemIndex = currentQueue.findIndex((q) => q.status === "pending");
      if (nextItemIndex === -1) return currentQueue;

      const nextItem = currentQueue[nextItemIndex];
      activeUploadsCount.current += 1;

      // Start upload asynchronously
      (async () => {
        try {
          const url = await uploadWithRetry(nextItem);

          // Upload succeeded
          setQueue((prev) =>
            prev.map((q) =>
              q.id === nextItem.id
                ? { ...q, status: "success", progress: 100, uploadedUrl: url }
                : q
            )
          );

          // Add to product images
          onChange([...images, url]);
          toast.success("Görsel başarıyla yüklendi");
        } catch (err: any) {
          console.error("[upload error]", err);
          const friendlyMessage = mapUploadError(err);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === nextItem.id
                ? { ...q, status: "error", errorMessage: friendlyMessage }
                : q
            )
          );
          toast.error(friendlyMessage);
        } finally {
          activeUploadsCount.current = Math.max(0, activeUploadsCount.current - 1);
        }
      })();

      // Mark status as uploading
      const updatedQueue = [...currentQueue];
      updatedQueue[nextItemIndex] = { ...nextItem, status: "uploading", progress: 5 };
      return updatedQueue;
    });
  }, [images, onChange, productId]);

  useEffect(() => {
    const hasPending = queue.some((q) => q.status === "pending");
    if (hasPending && activeUploadsCount.current < MAX_CONCURRENT_UPLOADS) {
      runNextInQueue();
    }
  }, [queue, runNextInQueue]);

  // Clean up successful queue items after 1.5 seconds
  useEffect(() => {
    const successfulItems = queue.filter((q) => q.status === "success");
    if (successfulItems.length > 0) {
      const timer = setTimeout(() => {
        setQueue((prev) => prev.filter((q) => q.status !== "success"));
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [queue]);

  const handleRetry = (id: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, status: "pending", progress: 0, errorMessage: undefined } : q
      )
    );
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const nextImages = images.filter((_, i) => i !== indexToRemove);
    onChange(nextImages);
    toast.success("Görsel kaldırıldı");
  };

  const handleSetPrimary = (indexToPrimary: number) => {
    if (indexToPrimary === 0) return;
    const nextImages = [...images];
    const [selected] = nextImages.splice(indexToPrimary, 1);
    nextImages.unshift(selected);
    onChange(nextImages);
    toast.success("Kapak görseli olarak belirlendi");
  };

  const handleMoveImage = (fromIndex: number, direction: "left" | "right") => {
    const nextImages = [...images];
    const targetIndex = direction === "left" ? fromIndex - 1 : fromIndex + 1;
    if (targetIndex < 0 || targetIndex >= nextImages.length) return;
    const temp = nextImages[fromIndex];
    nextImages[fromIndex] = nextImages[targetIndex];
    nextImages[targetIndex] = temp;
    onChange(nextImages);
  };

  const isUploadingAny = queue.some((q) => q.status === "uploading" || q.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-corp-charcoal">
            Ürün Görselleri ({images.length}/{MAX_PRODUCT_IMAGES})
          </label>
          <span className="text-xs text-corp-gray">
            İlk görsel vitrinde ana görsel (kapak) olarak görünür
          </span>
        </div>
        {images.length > 0 && (
          <span className="text-xs font-semibold text-corp-teal bg-corp-teal-50 px-2.5 py-1 rounded-full border border-corp-teal/20">
            {images.length} adet görsel yüklü
          </span>
        )}
      </div>

      {/* Sürükle Bırak / Yükleme Alanı */}
      {images.length < MAX_PRODUCT_IMAGES && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer relative ${
            isDragging
              ? "border-corp-teal bg-corp-teal/10 scale-[1.01]"
              : "border-corp-border hover:border-corp-teal hover:bg-corp-teal/5 bg-corp-surface/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={handleFileInputChange}
            className="hidden"
            id="multi-image-file-input"
          />

          <div className="flex flex-col items-center justify-center pointer-events-none">
            <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-corp-charcoal">
              <span className="text-corp-teal underline mr-1">Görselleri seçin</span>
              veya buraya sürükleyip bırakın
            </p>
            <p className="text-xs text-corp-gray mt-1 max-w-sm">
              Doğrudan Vercel Blob depolama altyapısına yüklenir (Maks. 10 MB, tek seferde çoklu yükleme, otomatik optimizasyon)
            </p>
          </div>
        </div>
      )}

      {/* Yükleme Sırası (Queue) Durum Kartları */}
      {queue.length > 0 && (
        <div className="space-y-2 bg-corp-surface/50 p-3 rounded-2xl border border-corp-border">
          <p className="text-xs font-bold uppercase tracking-wider text-corp-gray px-1">
            Yükleme Durumu ({queue.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-corp-border shadow-xs"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                  {item.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-corp-charcoal truncate">
                    {item.file.name}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-corp-gray mt-0.5">
                    <span>
                      {item.status === "pending" && "Bekliyor..."}
                      {item.status === "uploading" && `Yükleniyor: %${item.progress}`}
                      {item.status === "success" && "Yüklendi"}
                      {item.status === "error" && "Başarısız"}
                    </span>
                    <span>{(item.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>

                  {item.status === "uploading" && (
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="bg-corp-teal h-full rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}

                  {item.status === "error" && (
                    <p className="text-[10px] text-error font-medium mt-1 truncate">
                      {item.errorMessage || "Yükleme hatası"}
                    </p>
                  )}
                </div>

                <div className="flex-shrink-0 flex items-center gap-1">
                  {item.status === "error" && (
                    <button
                      type="button"
                      onClick={() => handleRetry(item.id)}
                      className="p-1.5 text-corp-teal hover:bg-corp-teal/10 rounded-lg transition-colors"
                      title="Tekrar dene"
                    >
                      <RefreshCw size={14} />
                    </button>
                  )}
                  {item.status === "success" && (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveQueueItem(item.id)}
                    className="p-1.5 text-corp-gray hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    title="Kaldır"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yüklenmiş Görseller Tablosu / Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((url, index) => {
            const isCover = index === 0;

            return (
              <div
                key={`${url}-${index}`}
                className={`relative group aspect-square rounded-2xl overflow-hidden border transition-all ${
                  isCover
                    ? "border-corp-teal ring-2 ring-corp-teal/30 shadow-md"
                    : "border-corp-border hover:border-corp-teal/60 bg-white"
                }`}
              >
                <img
                  src={url}
                  alt={`Ürün görseli ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/200x200?text=Gorsel+Yuklenemedi";
                  }}
                />

                {/* Ana Görsel (Kapak) Rozeti */}
                {isCover ? (
                  <div className="absolute top-2 left-2 bg-corp-teal text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Star size={10} className="fill-white" />
                    Kapak Görseli
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(index)}
                    className="absolute top-2 left-2 bg-black/60 hover:bg-corp-teal text-white text-[10px] font-semibold px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 flex items-center gap-1 shadow-sm"
                    title="Bu görseli ana kapak yap"
                  >
                    <Star size={10} />
                    Kapak Yap
                  </button>
                )}

                {/* Sıra Numarası Rozeti */}
                <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md z-10">
                  #{index + 1}
                </span>

                {/* Hover Kontrolleri */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  {/* Sola Taşı */}
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, "left")}
                      className="p-1.5 bg-white/90 hover:bg-white text-corp-charcoal rounded-lg shadow-sm transition-colors"
                      title="Sola / Öne taşı"
                    >
                      <ArrowLeft size={13} />
                    </button>
                  )}

                  {/* Sil */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="p-1.5 bg-white/90 hover:bg-white text-error rounded-lg shadow-sm transition-colors"
                    title="Görseli sil"
                  >
                    <X size={13} />
                  </button>

                  {/* Sağa Taşı */}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveImage(index, "right")}
                      className="p-1.5 bg-white/90 hover:bg-white text-corp-charcoal rounded-lg shadow-sm transition-colors"
                      title="Sağa / Arkaya taşı"
                    >
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
