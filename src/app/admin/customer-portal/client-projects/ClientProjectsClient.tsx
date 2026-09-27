"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Search, Plus, Edit, Trash2, X, Save, Loader2, Download, Layers, FileText, Calendar, User, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Project = {
  id: string;
  title: string;
  serviceType: string;
  status: string;
  progressPercent: number;
  startDate: Date | null;
  endDate: Date | null;
  isSubscription: boolean;
  subscriptionTier: string | null;
  renewalDate: Date | null;
  accountManagerName: string | null;
  accountManagerContact: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    companyTitle: string | null;
  };
  milestones: {
    id: string;
    title: string;
    status: string;
    dueDate: Date | null;
    order: number;
  }[];
  deliverables: {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadedAt: Date;
  }[];
};

const STATUSES = ["ALL", "planning", "development", "testing", "live", "on_hold", "completed"] as const;
const SERVICE_TYPES = ["ALL", "web_development", "ecommerce", "social_media", "advertising", "consulting", "call_center_ai"] as const;

const STATUS_META: Record<string, { label: string; color: string }> = {
  planning: { label: "Planlama", color: "#6B7280" },
  development: { label: "Geliştirme", color: "#0A4D68" },
  testing: { label: "Test", color: "#F59E0B" },
  live: { label: "Yayında", color: "#10B981" },
  on_hold: { label: "Beklemede", color: "#F97316" },
  completed: { label: "Tamamlandı", color: "#7C3AED" },
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  web_development: "Web Geliştirme",
  ecommerce: "E-Ticaret",
  social_media: "Sosyal Medya",
  advertising: "Dijital Reklam",
  consulting: "Danışmanlık",
  call_center_ai: "Call Center AI",
};

export default function ClientProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterServiceType, setFilterServiceType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    userId: "",
    title: "",
    serviceType: "web_development",
    status: "planning",
    progressPercent: 0,
    startDate: "",
    endDate: "",
    isSubscription: false,
    subscriptionTier: "",
    renewalDate: "",
    accountManagerName: "",
    accountManagerContact: "",
  });

  const filtered = projects.filter((project) => {
    const statusMatch = filterStatus === "ALL" || project.status === filterStatus;
    const serviceMatch = filterServiceType === "ALL" || project.serviceType === filterServiceType;
    const searchMatch =
      !searchQuery ||
      project.user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.user.companyTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.title.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && serviceMatch && searchMatch;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userId || !formData.title.trim()) {
      toast.error("Müşteri ve proje başlığı zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/customer-portal/client-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Proje oluşturulamadı.");
      }

      setProjects((prev) => [data.project, ...prev]);
      toast.success("Proje oluşturuldu.");
      setModalOpen(false);
      setFormData({
        userId: "",
        title: "",
        serviceType: "web_development",
        status: "planning",
        progressPercent: 0,
        startDate: "",
        endDate: "",
        isSubscription: false,
        subscriptionTier: "",
        renewalDate: "",
        accountManagerName: "",
        accountManagerContact: "",
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (!confirm(`'${title}' projesini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/admin/customer-portal/client-projects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Silme başarısız.");
      }

      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Proje silindi.");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setModalOpen(true)}
          className="bg-corp-teal text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 text-sm"
        >
          <Plus size={16} /> Yeni Proje
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-corp-gray" />
          <input
            type="text"
            placeholder="Müşteri adı, proje başlığı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "Tüm Durumlar" : STATUS_META[s]?.label || s}
              </option>
            ))}
          </select>
          
          <select
            value={filterServiceType}
            onChange={(e) => setFilterServiceType(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "Tüm Hizmetler" : SERVICE_TYPE_LABELS[t] || t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects table */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Müşteri", "Proje", "Hizmet", "Durum", "İlerleme", "Tarihler", "İşlemler"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-6 py-3 font-body text-[11px] text-corp-gray tracking-widest uppercase font-bold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((project) => {
                  const st = STATUS_META[project.status] || { label: project.status, color: "#6B7280" };

                  return (
                    <tr
                      key={project.id}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-body text-[14px] text-corp-charcoal font-semibold">
                            {project.user.companyTitle || project.user.name || project.user.email}
                          </p>
                          <p className="font-body text-[12px] text-corp-gray-light">{project.user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-body text-[14px] text-corp-charcoal font-semibold">{project.title}</p>
                          {project.isSubscription && (
                            <span className="text-[10px] text-purple-600 font-medium">Abonelik ({project.subscriptionTier})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body text-[13px] text-corp-gray">
                        {SERVICE_TYPE_LABELS[project.serviceType] || project.serviceType}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-[11px] font-bold"
                          style={{
                            background: `${st.color}14`,
                            color: st.color,
                            border: `1px solid ${st.color}30`,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden w-24">
                            <div
                              className="h-full bg-corp-teal rounded-full"
                              style={{ width: `${project.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-corp-charcoal">{project.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light">
                        {project.startDate ? formatDate(project.startDate) : "-"}
                        {project.endDate && ` → ${formatDate(project.endDate)}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedProject(project);
                              setDetailModalOpen(true);
                            }}
                            className="p-2 text-corp-gray hover:text-corp-teal hover:bg-corp-teal-50 rounded transition-colors"
                            title="Detay"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id, project.title)}
                            className="p-2 text-corp-gray hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Proje Oluştur</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Müşteri E-posta <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.userId}
                  onChange={(e) => setFormData((f) => ({ ...f, userId: e.target.value }))}
                  placeholder="musteri@ornek.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Proje Başlığı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Kurumsal Web Sitesi"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Hizmet Tipi</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData((f) => ({ ...f, serviceType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    {SERVICE_TYPES.filter((t) => t !== "ALL").map((t) => (
                      <option key={t} value={t}>
                        {SERVICE_TYPE_LABELS[t] || t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    {STATUSES.filter((s) => s !== "ALL").map((s) => (
                      <option key={s} value={s}>
                        {STATUS_META[s]?.label || s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isSubscription"
                  checked={formData.isSubscription}
                  onChange={(e) => setFormData((f) => ({ ...f, isSubscription: e.target.checked }))}
                  className="rounded border-corp-border"
                />
                <label htmlFor="isSubscription" className="text-sm font-semibold text-corp-charcoal">
                  Abonelik Projesi
                </label>
              </div>

              {formData.isSubscription && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-corp-charcoal mb-1">Abonelik Paketi</label>
                    <select
                      value={formData.subscriptionTier}
                      onChange={(e) => setFormData((f) => ({ ...f, subscriptionTier: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                    >
                      <option value="">Seçin</option>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-corp-charcoal mb-1">Yenileme Tarihi</label>
                    <input
                      type="date"
                      value={formData.renewalDate}
                      onChange={(e) => setFormData((f) => ({ ...f, renewalDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Hesap Yöneticisi</label>
                  <input
                    type="text"
                    value={formData.accountManagerName}
                    onChange={(e) => setFormData((f) => ({ ...f, accountManagerName: e.target.value }))}
                    placeholder="Ad Soyad"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">İletişim</label>
                  <input
                    type="text"
                    value={formData.accountManagerContact}
                    onChange={(e) => setFormData((f) => ({ ...f, accountManagerContact: e.target.value }))}
                    placeholder="Telefon veya e-posta"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-corp-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? "Kaydediliyor..." : "Projeyi Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      {detailModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">{selectedProject.title}</h2>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="p-4 rounded-xl bg-corp-surface border border-corp-border">
                <h3 className="font-display text-sm font-bold text-corp-charcoal mb-3 flex items-center gap-2">
                  <Building2 size={16} className="text-corp-teal" />
                  Müşteri Bilgisi
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-corp-gray uppercase tracking-widest">Firma</p>
                    <p className="text-sm font-semibold text-corp-charcoal">{selectedProject.user.companyTitle || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-corp-gray uppercase tracking-widest">İsim</p>
                    <p className="text-sm font-semibold text-corp-charcoal">{selectedProject.user.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-corp-gray uppercase tracking-widest">E-posta</p>
                    <p className="text-sm font-semibold text-corp-charcoal">{selectedProject.user.email}</p>
                  </div>
                </div>
              </div>

              {/* Project Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">Hizmet Tipi</p>
                  <p className="text-sm font-semibold text-corp-charcoal">{SERVICE_TYPE_LABELS[selectedProject.serviceType] || selectedProject.serviceType}</p>
                </div>
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">Durum</p>
                  <p className="text-sm font-semibold text-corp-charcoal">{STATUS_META[selectedProject.status]?.label || selectedProject.status}</p>
                </div>
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">İlerleme</p>
                  <p className="text-sm font-semibold text-corp-charcoal">{selectedProject.progressPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-corp-gray uppercase tracking-widest">Tarihler</p>
                  <p className="text-sm font-semibold text-corp-charcoal">
                    {selectedProject.startDate ? formatDate(selectedProject.startDate) : "-"} → {selectedProject.endDate ? formatDate(selectedProject.endDate) : "-"}
                  </p>
                </div>
              </div>

              {/* Milestones */}
              <div>
                <h3 className="font-display text-sm font-bold text-corp-charcoal mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-corp-teal" />
                  Proje Adımları ({selectedProject.milestones.length})
                </h3>
                {selectedProject.milestones.length === 0 ? (
                  <p className="text-sm text-corp-gray italic">Henüz aşama tanımlanmadı.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProject.milestones.map((m) => (
                      <div key={m.id} className="p-3 rounded-lg border border-corp-border bg-corp-surface flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-corp-charcoal">{m.title}</p>
                          <p className="text-xs text-corp-gray">{m.dueDate ? formatDate(m.dueDate) : "Tarih yok"}</p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          m.status === "done" ? "bg-emerald-100 text-emerald-700" :
                          m.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {m.status === "done" ? "Tamamlandı" : m.status === "in_progress" ? "Devam ediyor" : "Bekliyor"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deliverables */}
              <div>
                <h3 className="font-display text-sm font-bold text-corp-charcoal mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-corp-teal" />
                  Teslim Edilen Dosyalar ({selectedProject.deliverables.length})
                </h3>
                {selectedProject.deliverables.length === 0 ? (
                  <p className="text-sm text-corp-gray italic">Henüz dosya yüklenmedi.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedProject.deliverables.map((d) => (
                      <a
                        key={d.id}
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-lg border border-corp-border hover:border-corp-teal hover:bg-corp-teal-5 transition-all flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-corp-charcoal truncate">{d.fileName}</p>
                          <p className="text-xs text-corp-gray">{formatDate(d.uploadedAt)}</p>
                        </div>
                        <Download size={16} className="text-corp-teal flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}