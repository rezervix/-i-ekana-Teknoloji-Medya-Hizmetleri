"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, Loader2, Shield } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onMemberInvited: (newMember: any) => void;
}

export default function TeamInviteModal({ isOpen, onClose, onMemberInvited }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/profile/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      setSubmitting(false);

      if (!res.ok || !data.success) {
        setErrorMsg(data.error?.message || "Ekip üyesi eklenemedi.");
        return;
      }

      setName("");
      setEmail("");
      setRole("viewer");
      onMemberInvited(data.member);
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
          className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-corp-border"
        >
          <div className="p-6 bg-corp-surface border-b border-corp-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserPlus size={22} />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-corp-charcoal">Ekip Üyesi Davet Et</h3>
                <p className="text-xs text-corp-gray">Kurumsal profilinize alt kullanıcı ekleyin.</p>
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
                Ad Soyad *
              </label>
              <input
                type="text"
                required
                placeholder="Örn: Mehmet Yılmaz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                E-posta Adresi *
              </label>
              <input
                type="email"
                required
                placeholder="mehmet@sirketiniz.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                Erişim Rolü
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body bg-white"
              >
                <option value="viewer">Görüntüleyici — Sadece rapor ve projeleri inceler</option>
                <option value="approver">Onaylayan — Dosya ve teslimatları onaylayabilir</option>
                <option value="manager">Yönetici — Destek talebi açar, fatura & ekip yönetir</option>
              </select>
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
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={15} />}
                Davet Gönder
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
