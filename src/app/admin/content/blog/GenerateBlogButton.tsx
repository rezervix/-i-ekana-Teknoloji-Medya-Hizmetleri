"use client";

import React, { useState, useEffect } from "react";
import { Brain, Loader2, Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { label: "Trend Konular Analiz Ediliyor", min: 0, max: 25 },
  { label: "Gemini AI İçerik Üretiyor", min: 25, max: 70 },
  { label: "SEO Optimizasyonu Yapılıyor", min: 70, max: 90 },
  { label: "Veritabanına Kaydediliyor", min: 90, max: 100 },
];

export default function GenerateBlogButton() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 98) return prev;
          const next = prev + (Math.random() * 2);
          const stepIndex = STEPS.findIndex(s => next >= s.min && next < s.max);
          if (stepIndex !== -1) setCurrentStep(stepIndex);
          return next;
        });
      }, 200);
    } else {
      setProgress(0);
      setCurrentStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleGenerate = async () => {
    if (!confirm("AI ile yeni bir blog yazısı üretilip anında yayına alınacak. Emin misiniz?")) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
      });
      const data = await res.json();
      
      if (res.ok) {
        setProgress(100);
        setCurrentStep(3);
        toast.success("Blog yazısı başarıyla üretildi!");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        if (data.error && (data.error.includes("ECONNREFUSED") || data.error.includes("Can't reach database"))) {
          throw new Error("Veritabanı bağlantısı kurulamadı. Lütfen PostgreSQL servisini başlatın.");
        }
        throw new Error(data.error || "Bir hata oluştu");
      }
    } catch (error: any) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-purple-700 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {loading ? "AI Çalışıyor..." : "AI ile Şimdi Üret"}
      </button>

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 z-[9999] p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-600">
                <Brain size={18} />
                <span className="font-bold text-sm">AI İlerleme Durumu</span>
              </div>
              <span className="text-xs font-bold text-purple-600">%{Math.floor(progress)}</span>
            </div>

            <p className="text-xs text-gray-500 mb-3">{STEPS[currentStep].label}...</p>

            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-purple-500 transition-all" style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-2">
              {STEPS.map((step, i) => (
                <div key={i} className={`flex items-center gap-2 text-[11px] ${i <= currentStep ? "text-black font-bold" : "text-gray-400"}`}>
                  {i < currentStep ? <CheckCircle2 size={12} className="text-green-500" /> : <div className="w-3 h-3 rounded-full border" />}
                  {step.label}
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t border-purple-50 flex items-center justify-between">
              <span className="text-[10px] text-purple-600 font-medium">Lütfen pencereyi kapatmayın.</span>
              <AlertCircle size={14} className="text-purple-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
