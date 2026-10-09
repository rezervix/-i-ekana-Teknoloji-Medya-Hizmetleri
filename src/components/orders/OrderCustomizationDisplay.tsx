"use client";

import React, { useState } from "react";
import {
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Layers,
  FileCheck,
  Eye,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export interface ParsedUploadedFile {
  url: string;
  name: string;
  size?: number;
  extension: string;
}

interface OrderCustomizationDisplayProps {
  customizationData: any;
  className?: string;
  isAdmin?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return "";
  const k = 1024;
  const sizes = ["Bayt", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(filenameOrUrl: string): string {
  try {
    const clean = filenameOrUrl.split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length > 1) {
      return parts.pop()?.toLowerCase() || "";
    }
  } catch {
    // fallback
  }
  return "";
}

function cleanFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const basename = pathname.split("/").pop() || "tasarim-dosyasi";
    const decoded = decodeURIComponent(basename);
    // Remove UUID prefix if present: e.g. "3e5c3d58-00af-43b7-b991-6b6f0756a0ed-"
    return decoded.replace(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-/, "");
  } catch {
    return "tasarim-dosyasi";
  }
}

export function parseUploadedFiles(raw: any): ParsedUploadedFile[] {
  if (!raw) return [];

  const results: ParsedUploadedFile[] = [];

  const processItem = (item: any, fallbackName?: string) => {
    if (!item) return;

    if (typeof item === "string") {
      const trimmed = item.trim();
      // Check if item is a JSON string
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach((p) => processItem(p));
            return;
          } else if (typeof parsed === "object") {
            processItem(parsed);
            return;
          }
        } catch {
          // If JSON.parse fails, try extracting URLs via regex
        }
      }

      // Check for URL in string
      const urlMatches = trimmed.match(/https?:\/\/[^\s"',)]+/g);
      if (urlMatches && urlMatches.length > 0) {
        urlMatches.forEach((url) => {
          const ext = getFileExtension(url);
          const name = fallbackName || cleanFilenameFromUrl(url);
          results.push({ url, name, extension: ext });
        });
        return;
      }
    }

    if (typeof item === "object") {
      const url = item.url || item.fileUrl || item.downloadUrl || item.link;
      if (url && typeof url === "string") {
        const ext = getFileExtension(item.name || url);
        const name = item.name || fallbackName || cleanFilenameFromUrl(url);
        results.push({
          url,
          name,
          size: typeof item.size === "number" ? item.size : undefined,
          extension: ext,
        });
      }
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach((r) => processItem(r));
  } else {
    processItem(raw);
  }

  // Deduplicate by URL
  const uniqueMap = new Map<string, ParsedUploadedFile>();
  for (const f of results) {
    if (!uniqueMap.has(f.url)) {
      uniqueMap.set(f.url, f);
    }
  }

  return Array.from(uniqueMap.values());
}

export default function OrderCustomizationDisplay({
  customizationData,
  className = "",
  isAdmin = false,
}: OrderCustomizationDisplayProps) {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!customizationData || typeof customizationData !== "object") {
    return null;
  }

  // 1. Extract uploaded files
  const rawUploadedFiles =
    customizationData.uploadedFiles ||
    customizationData.uploadedFile ||
    customizationData.files ||
    customizationData.designFiles ||
    customizationData.fileUrl ||
    customizationData.file;

  const uploadedFiles = parseUploadedFiles(rawUploadedFiles);

  // 2. Extract dimension / option values
  let dimensionValues: Record<string, any> = {};
  if (customizationData.dimensionValues) {
    if (typeof customizationData.dimensionValues === "string") {
      try {
        dimensionValues = JSON.parse(customizationData.dimensionValues);
      } catch {
        dimensionValues = { Secim: customizationData.dimensionValues };
      }
    } else if (typeof customizationData.dimensionValues === "object") {
      dimensionValues = customizationData.dimensionValues;
    }
  }

  // 3. Extract quantity
  const selectedQuantity = customizationData.selectedQuantity || customizationData.quantity;

  // 4. Extract convert to print
  const convertToPrint = Boolean(customizationData.convertToPrint);

  // 5. Extract other custom fields
  const internalKeys = new Set([
    "uploadedFiles",
    "uploadedFile",
    "files",
    "designFiles",
    "fileUrl",
    "file",
    "dimensionValues",
    "selectedQuantity",
    "quantity",
    "convertToPrint",
    "packageId",
    "salePrice",
    "unitSalePrice",
    "extraServices",
    "selectedTemplate",
    "selectedDesignTemplateId",
    "selectedDesignTemplateName",
  ]);

  const otherFields = Object.entries(customizationData).filter(
    ([k, v]) => !internalKeys.has(k) && v !== null && v !== undefined && v !== ""
  );

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      toast.success("Dosya bağlantısı panoya kopyalandı.");
      setTimeout(() => setCopiedUrl(null), 2500);
    } catch {
      toast.error("Bağlantı kopyalanamadı.");
    }
  };

  const handleDownload = (file: ParsedUploadedFile) => {
    const a = document.createElement("a");
    a.href = file.url;
    a.download = file.name || "tasarim-dosyasi";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasAnyContent =
    uploadedFiles.length > 0 ||
    Object.keys(dimensionValues).length > 0 ||
    selectedQuantity ||
    convertToPrint ||
    otherFields.length > 0;

  if (!hasAnyContent) {
    return null;
  }

  return (
    <div className={`mt-3 space-y-3 ${className}`}>
      {/* ── 1. Müşterinin Yüklediği Tasarım Dosyaları (ÖNCELİKLİ BÖLÜM) ── */}
      {uploadedFiles.length > 0 && (
        <div className="rounded-2xl border-2 border-corp-teal/30 bg-gradient-to-br from-corp-teal/5 to-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-corp-teal text-white shadow-xs">
                <FileCheck size={16} />
              </span>
              <div>
                <h6 className="font-display font-bold text-xs text-corp-charcoal">
                  Müşteri Tasarım Dosyası ({uploadedFiles.length})
                </h6>
                <p className="text-[10px] text-corp-gray font-medium">
                  {isAdmin
                    ? "Müşterinin baskı için yüklediği orijinal tasarım dosyası"
                    : "Siparişiniz için sisteme yüklediğiniz tasarım dosyası"}
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Yüklendi
            </span>
          </div>

          <div className="space-y-2">
            {uploadedFiles.map((file, idx) => {
              const isImg = ["jpg", "jpeg", "png", "webp", "svg"].includes(file.extension);
              const isPdf = file.extension === "pdf";

              return (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-corp-border/80 shadow-xs hover:border-corp-teal/50 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail or File Type Badge */}
                    <div className="w-10 h-10 rounded-lg bg-corp-surface border border-corp-border/60 flex items-center justify-center flex-shrink-0 text-corp-charcoal overflow-hidden font-bold text-[11px] uppercase">
                      {isImg ? (
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : isPdf ? (
                        <span className="text-red-600 bg-red-50 w-full h-full flex items-center justify-center font-bold text-[11px]">
                          PDF
                        </span>
                      ) : (
                        <span className="text-corp-teal bg-corp-teal/10 w-full h-full flex items-center justify-center font-bold text-[10px]">
                          {file.extension ? file.extension.toUpperCase().slice(0, 4) : "DOSYA"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="text-xs font-bold text-corp-charcoal truncate"
                        title={file.name}
                      >
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-corp-gray">
                        {file.size ? <span>{formatBytes(file.size)}</span> : null}
                        {file.extension && (
                          <span className="uppercase font-mono font-semibold px-1 py-0.2 rounded bg-gray-100 text-gray-700 text-[9px]">
                            {file.extension}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-xs"
                      title="Tarayıcıda Aç / Görüntüle"
                    >
                      <Eye size={13} />
                      <span>Görüntüle</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-corp-border bg-gray-50 hover:bg-gray-100 text-corp-charcoal font-bold text-xs transition-colors"
                      title="Dosyayı İndir"
                    >
                      <Download size={13} />
                      <span className="hidden sm:inline">İndir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(file.url)}
                      className="p-1.5 rounded-lg border border-corp-border bg-gray-50 hover:bg-gray-100 text-corp-gray hover:text-corp-charcoal transition-colors"
                      title="Bağlantıyı Kopyala"
                    >
                      {copiedUrl === file.url ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 2. Fotoğraftan Çizim Hizmeti Rozeti ── */}
      {convertToPrint && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
          <Sparkles size={16} className="text-amber-600 flex-shrink-0" />
          <span>Fotoğraftan Profesyonel Vektörel Baskı Çizim Hizmeti Talep Edildi</span>
        </div>
      )}

      {/* ── 3. Baskı Özellikleri & Seçenekler ── */}
      {(Object.keys(dimensionValues).length > 0 || selectedQuantity || otherFields.length > 0) && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-corp-charcoal mb-2">
            <Layers size={14} className="text-corp-teal" />
            <span>Seçilen Baskı & Ürün Özellikleri</span>
          </div>

          {/* Quantity Badge */}
          {selectedQuantity && (
            <div className="flex items-center justify-between text-xs py-1 border-b border-gray-200/70">
              <span className="text-corp-gray font-medium">Baskı Adedi:</span>
              <span className="font-bold text-corp-charcoal bg-white px-2 py-0.5 rounded border border-gray-200">
                {typeof selectedQuantity === "number"
                  ? selectedQuantity.toLocaleString("tr-TR")
                  : selectedQuantity}{" "}
                Adet
              </span>
            </div>
          )}

          {/* Dimension options */}
          {Object.entries(dimensionValues).map(([key, val]) => {
            const label = key
              .replace(/^ozellik_/, "Özellik ")
              .replace(/_/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase());

            return (
              <div
                key={key}
                className="flex items-center justify-between text-xs py-1 border-b border-gray-200/50 last:border-none"
              >
                <span className="text-corp-gray font-medium">{label}:</span>
                <span className="font-semibold text-corp-charcoal text-right">
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            );
          })}

          {/* Extra fields */}
          {otherFields.map(([key, val]) => (
            <div
              key={key}
              className="flex items-center justify-between text-xs py-1 border-b border-gray-200/50 last:border-none"
            >
              <span className="text-corp-gray font-medium capitalize">
                {key.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}:
              </span>
              <span className="font-semibold text-corp-charcoal text-right">
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
