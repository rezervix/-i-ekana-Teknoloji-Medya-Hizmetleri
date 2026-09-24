"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, LifeBuoy } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated: (newTicket: any) => void;
}

export default function SupportTicketModal({ isOpen, onClose, onTicketCreated }: Props) {
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState("normal");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, priority, message }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Destek talebi oluşturulamadı.");
        return;
      }

      setSubject("");
      setMessage("");
      setPriority("normal");
      onTicketCreated(data.ticket);
      onClose();
    } catch {
      setErrorMsg("Bağlantı hatası. Lütfen tekrar deneyin.");
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-corp-border"
        >
          <div className="p-6 bg-corp-surface border-b border-corp-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corp-teal-50 text-corp-teal flex items-center justify-center">
                <LifeBuoy size={22} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-corp-charcoal">Yeni Destek Talebi</h3>
                <p className="text-xs text-corp-gray">Ajans ekibimiz en kısa sürede dönüş sağlayacaktır.</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-corp-gray">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-error/10 text-error text-xs font-medium border border-error/20">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                Talep Konusu / Başlık *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: E-Ticaret sitesi ödeme modülü hatası"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                Öncelik Derecesi
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body bg-white"
              >
                <option value="low">Düşük — Genel Soru / Bilgi Talebi</option>
                <option value="normal">Normal — Standart Destek</option>
                <option value="high">Yüksek — Önemli İşlevsel Sorun</option>
                <option value="urgent">Acil — Sistem / Hizmet Kesintisi</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                Detaylı Açıklama *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Lütfen yaşadığınız sorunu veya talebinizi detaylıca belirtiniz..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
              />
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-corp-border text-corp-charcoal font-bold text-xs hover:bg-corp-surface"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 shadow-lg shadow-corp-teal/20 flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
                Talebi Gönder
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
