"use client";

import React, { useRef, useState, useEffect } from "react";
import { UploadCloud, Loader2, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CsvUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Medya");
  const [importProgress, setImportProgress] = useState({ currentRow: 0, totalRows: 0, importedCount: 0, errorCount: 0 });
  const [importResult, setImportResult] = useState<{ success: boolean; totalRows: number; importedCount: number; errorCount: number; errors: Array<{ row: number; message: string }> } | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    toast.info("CSV dosyası okunuyor...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setCsvData(results.data);
          setModalOpen(true);
          toast.info(`${results.data.length} ürün bulundu. Kategori seçin.`);
        } else {
          toast.error("CSV dosyası boş veya geçersiz.");
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      error: (error) => {
        toast.error("CSV okunurken hata oluştu: " + error.message);
        setUploading(false);
      },
    });
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress({ currentRow: 0, totalRows: csvData.length, importedCount: 0, errorCount: 0 });
    setImportResult(null);

    try {
      const response = await fetch("/api/admin/products/import/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: csvData, category: selectedCategory }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "start") {
              setImportProgress({ currentRow: 0, totalRows: data.totalRows, importedCount: 0, errorCount: 0 });
            } else if (data.type === "progress") {
              setImportProgress({
                currentRow: data.currentRow,
                totalRows: data.totalRows,
                importedCount: data.importedCount,
                errorCount: data.errorCount,
              });
            } else if (data.type === "complete") {
              setImportResult({
                success: true,
                totalRows: data.totalRows,
                importedCount: data.importedCount,
                errorCount: data.errorCount,
                errors: data.errors,
              });
              setIsImporting(false);
              toast.success(`${data.importedCount} ürün başarıyla aktarıldı!`);
              setTimeout(() => window.location.reload(), 2000);
            } else if (data.type === "error") {
              setImportResult({
                success: false,
                totalRows: 0,
                importedCount: 0,
                errorCount: 0,
                errors: [],
              });
              setIsImporting(false);
              toast.error("İçe aktarma hatası: " + data.message);
            }
          }
        }
      }
    } catch (error: any) {
      setIsImporting(false);
      toast.error("Hata: " + error.message);
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setCsvData([]);
    setSelectedCategory("Medya");
    setImportProgress({ currentRow: 0, totalRows: 0, importedCount: 0, errorCount: 0 });
    setImportResult(null);
    setIsImporting(false);
  };

  return (
    <>
      <input
        type="file"
        accept=".csv"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="bg-corp-charcoal text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {uploading ? "İşleniyor..." : "CSV İçe Aktar"}
      </button>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-corp-teal/10 flex items-center justify-center">
                    <FileText size={18} className="text-corp-teal" />
                  </div>
                  <div>
                    <h3 className="font-bold text-corp-charcoal text-sm">CSV İçe Aktar</h3>
                    <p className="text-[11px] text-corp-gray">{csvData.length} ürün bulundu</p>
                  </div>
                </div>
                {!importResult && (
                  <button onClick={closeModal} className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all">
                    <X size={18} />
                  </button>
                )}
              </div>

              <div className="p-6 space-y-5">
                {!importResult && !isImporting && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-corp-charcoal mb-2">
                        Kategori Seçin
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-corp-teal focus:border-corp-teal transition-all bg-white"
                      >
                        <option value="Medya">Medya</option>
                        <option value="Teknoloji">TEKNOLOJİ</option>
                        <option value="Baski">Kurumsal Kimlik &amp; Baskı</option>
                      </select>
                      <p className="text-[11px] text-corp-gray mt-1.5">
                        Tüm ürünler seçilen kategoriye aktarılacak. CSV içindeki kategori sütunu yok sayılacak.
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-xs font-bold text-corp-charcoal mb-2">CSV Formatı</p>
                      <div className="space-y-1 text-[11px] text-corp-gray">
                        <p>• <span className="font-semibold">Name/İsim:</span> Ürün adı (zorunlu)</p>
                        <p>• <span className="font-semibold">Price/Fiyat:</span> Fiyat (TL)</p>
                        <p>• <span className="font-semibold">Description/Açıklama:</span> Ürün açıklaması</p>
                        <p>• <span className="font-semibold">Images/Görseller:</span> Görsel URL'leri (virgülle ayrılmış)</p>
                      </div>
                    </div>
                  </>
                )}

                {isImporting && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-corp-gray">İşleniyor...</span>
                      <span className="font-semibold text-corp-teal">
                        {importProgress.importedCount} / {importProgress.totalRows}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-corp-teal h-full transition-all duration-300"
                        style={{ width: `${(importProgress.currentRow / importProgress.totalRows) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-corp-gray">
                      <span>Satır: {importProgress.currentRow}</span>
                      <span>Hata: {importProgress.errorCount}</span>
                    </div>
                  </div>
                )}

                {importResult && (
                  <div className={`rounded-2xl p-4 text-center ${importResult.success ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-100"}`}>
                    {importResult.success ? (
                      <>
                        <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
                        <p className="font-bold text-green-700">{importResult.importedCount} ürün başarıyla aktarıldı!</p>
                        <p className="text-xs text-green-600 mt-1">Toplam: {importResult.totalRows} satır • Hata: {importResult.errorCount}</p>
                        {importResult.errorCount > 0 && (
                          <div className="mt-3 text-left max-h-32 overflow-y-auto">
                            <p className="text-xs font-semibold text-red-600 mb-1">Hatalı satırlar:</p>
                            {importResult.errors.slice(0, 5).map((err, i) => (
                              <p key={i} className="text-xs text-red-500">Satır {err.row}: {err.message}</p>
                            ))}
                            {importResult.errors.length > 5 && (
                              <p className="text-xs text-red-400">... ve {importResult.errors.length - 5} hata daha</p>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-green-600 mt-2">Sayfa yenileniyor...</p>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={32} className="text-red-500 mx-auto mb-2" />
                        <p className="font-bold text-red-700">Aktarım başarısız</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {!importResult && !isImporting && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                  <button onClick={closeModal} className="px-5 py-2 rounded-xl border border-gray-200 text-corp-gray font-semibold hover:bg-gray-50 text-sm transition-all">
                    İptal
                  </button>
                  <button
                    onClick={handleImport}
                    className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md text-sm active:scale-95"
                  >
                    <UploadCloud size={16} /> İçe Aktar
                  </button>
                </div>
              )}
              {isImporting && (
                <div className="flex justify-end px-6 py-4 border-t border-gray-100">
                  <button onClick={closeModal} className="px-6 py-2 rounded-xl border border-gray-200 text-corp-gray font-semibold hover:bg-gray-50 text-sm">
                    İptal
                  </button>
                </div>
              )}
              {importResult && (
                <div className="flex justify-end px-6 py-4 border-t border-gray-100">
                  <button onClick={closeModal} className="px-6 py-2 rounded-xl border border-gray-200 text-corp-gray font-semibold hover:bg-gray-50 text-sm">
                    Kapat
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
