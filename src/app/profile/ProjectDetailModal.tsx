"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  UserCheck,
  MessageSquare,
  Calendar,
  Layers,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

interface Props {
  project: any | null;
  onClose: () => void;
}

export default function ProjectDetailModal({ project, onClose }: Props) {
  if (!project) return null;

  const serviceTypeLabels: Record<string, string> = {
    web_development: "Web Geliştirme",
    ecommerce: "E-Ticaret Sistemleri",
    social_media: "Sosyal Medya Yönetimi",
    advertising: "Dijital Reklam Yönetimi",
    consulting: "Dijital Dönüşüm Danışmanlığı",
    call_center_ai: "Microsoft Call Center AI",
  };

  const statusBadges: Record<string, { label: string; bg: string; text: string }> = {
    planning: { label: "Planlama", bg: "bg-gray-100", text: "text-gray-700" },
    development: { label: "Geliştirme Aşamasında", bg: "bg-blue-50", text: "text-blue-700" },
    testing: { label: "Test & Kalite Kontrol", bg: "bg-amber-50", text: "text-amber-700" },
    live: { label: "Yayında / Aktif", bg: "bg-emerald-50", text: "text-emerald-700" },
    on_hold: { label: "Beklemede", bg: "bg-orange-50", text: "text-orange-700" },
    completed: { label: "Tamamlandı", bg: "bg-purple-50", text: "text-purple-700" },
  };

  const fileTypeIcons: Record<string, string> = {
    design: "🎨 Tasarım Taslağı",
    source_code: "💻 Kaynak Kod",
    report: "📊 Analiz & Rapor",
    contract: "📜 Sözleşme Dokümanı",
    other: "📁 Genel Dosya",
  };

  const statusInfo = statusBadges[project.status] || { label: project.status, bg: "bg-gray-100", text: "text-gray-700" };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-corp-border my-8"
        >
          {/* Header */}
          <div className="p-6 md:p-8 bg-corp-surface border-b border-corp-border flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <span className="px-3 py-1 rounded-full bg-corp-teal/10 text-corp-teal text-xs font-bold uppercase tracking-wider">
                  {serviceTypeLabels[project.serviceType] || project.serviceType}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusInfo.bg} ${statusInfo.text}`}>
                  {statusInfo.label}
                </span>
                {project.isSubscription && (
                  <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider border border-purple-200">
                    Abonelik ({project.subscriptionTier || "Pro"})
                  </span>
                )}
              </div>
              <h2 className="font-display text-2xl font-bold text-corp-charcoal">{project.title}</h2>
              <p className="text-xs text-corp-gray mt-1">
                Başlangıç: {project.startDate ? new Date(project.startDate).toLocaleDateString("tr-TR") : "Belirtilmedi"}
                {project.endDate && ` • Bitiş / Teslim: ${new Date(project.endDate).toLocaleDateString("tr-TR")}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-200 text-corp-gray hover:text-corp-charcoal transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-8 max-h-[75vh] overflow-y-auto">
            {/* Progress Bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-corp-gray uppercase tracking-widest">Proje İlerleme Durumu</span>
                <span className="text-sm font-bold text-corp-teal">{project.progressPercent || 0}%</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div
                  className="h-full bg-gradient-to-r from-corp-teal to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, project.progressPercent || 0))}%` }}
                />
              </div>
            </div>

            {/* Account Manager Card */}
            {project.accountManagerName && (
              <div className="p-5 rounded-2xl bg-corp-teal/5 border border-corp-teal/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-corp-teal text-white flex items-center justify-center font-bold text-lg shadow-md shadow-corp-teal/20">
                    <UserCheck size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-corp-teal">Atanmış Müşteri Temsilciniz</p>
                    <h4 className="font-display font-bold text-corp-charcoal text-base">{project.accountManagerName}</h4>
                    <p className="text-xs text-corp-gray">{project.accountManagerContact || "Çiçekana Proje Ekibi"}</p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${(project.accountManagerContact || "").replace(/[^0-9]/g, "") || "905303412156"}?text=Merhaba,%20${encodeURIComponent(project.title)}%20projem%20hakkında%20bilgi%20almak%20istiyorum.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm"
                >
                  <MessageSquare size={16} /> WhatsApp ile İletişim
                </a>
              </div>
            )}

            {/* Subscription Info if Subscription */}
            {project.isSubscription && (
              <div className="p-5 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-purple-900 text-sm">Abonelik Paketi ({project.subscriptionTier || "Pro"})</h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Bir sonraki yenileme tarihi:{" "}
                    {project.renewalDate
                      ? new Date(project.renewalDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                      : "Sürekli Abonelik"}
                  </p>
                </div>
                <a
                  href="https://wa.me/905303412156?text=Abonelik%20paketimi%20yükseltmek%20istiyorum."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Planı Yükselt →
                </a>
              </div>
            )}

            {/* Milestones Checklist */}
            <div>
              <h3 className="font-display font-bold text-corp-charcoal text-base mb-4 flex items-center gap-2">
                <Layers size={18} className="text-corp-teal" /> Proje Adımları & Aşama Kontrolü (Milestones)
              </h3>
              {!project.milestones || project.milestones.length === 0 ? (
                <p className="text-xs text-corp-gray italic p-4 bg-gray-50 rounded-xl">Bu proje için henüz aşama tanımlanmadı.</p>
              ) : (
                <div className="space-y-2.5">
                  {project.milestones.map((m: any) => {
                    const isDone = m.status === "done";
                    const isInProgress = m.status === "in_progress";

                    return (
                      <div
                        key={m.id}
                        className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                          isDone
                            ? "bg-emerald-50/50 border-emerald-200"
                            : isInProgress
                            ? "bg-blue-50/50 border-blue-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {isDone ? (
                            <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
                          ) : isInProgress ? (
                            <Clock className="text-blue-600 animate-pulse flex-shrink-0" size={20} />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                          <span className={`text-sm font-semibold ${isDone ? "line-through text-gray-500" : "text-corp-charcoal"}`}>
                            {m.title}
                          </span>
                        </div>

                        {m.dueDate && (
                          <span className="text-[11px] font-medium text-corp-gray flex items-center gap-1">
                            <Calendar size={13} /> {new Date(m.dueDate).toLocaleDateString("tr-TR")}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deliverables List */}
            <div>
              <h3 className="font-display font-bold text-corp-charcoal text-base mb-4 flex items-center gap-2">
                <FileText size={18} className="text-corp-teal" /> Teslim Edilen Dosyalar & Belgeler
              </h3>
              {!project.deliverables || project.deliverables.length === 0 ? (
                <p className="text-xs text-corp-gray italic p-4 bg-gray-50 rounded-xl">Henüz teslim edilmiş bir dosya bulunmuyor.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.deliverables.map((d: any) => (
                    <a
                      key={d.id}
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-xl border border-corp-border hover:border-corp-teal hover:bg-corp-teal/5 transition-all flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-[10px] font-bold uppercase text-corp-teal mb-0.5">
                          {fileTypeIcons[d.fileType] || d.fileType}
                        </p>
                        <p className="text-xs font-bold text-corp-charcoal truncate group-hover:text-corp-teal transition-colors">
                          {d.fileName}
                        </p>
                        <p className="text-[10px] text-corp-gray mt-1">
                          {new Date(d.uploadedAt).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-corp-teal-50 group-hover:bg-corp-teal group-hover:text-white text-corp-teal flex items-center justify-center transition-all flex-shrink-0">
                        <Download size={16} />
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-corp-surface border-t border-corp-border flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-corp-charcoal text-white font-bold text-xs hover:bg-black transition-colors"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
