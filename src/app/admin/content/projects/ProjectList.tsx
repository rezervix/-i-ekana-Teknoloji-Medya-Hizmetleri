"use client";

import React, { useState } from "react";
import { Plus, Edit, Trash2, Loader2, X, Save, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: string;
  title: string;
  slug: string;
  client: string;
  year: number;
  category: string;
  status: string;
  heroImage?: string | null;
  techTags: string[];
  createdAt: string;
}

interface ProjectListProps {
  initialProjects: Project[];
}

const EMPTY_FORM = {
  title: "",
  client: "",
  year: new Date().getFullYear().toString(),
  category: "Web Geliştirme",
  challenge: "",
  solution: "",
  heroImage: "",
  techTags: "",
  status: "DRAFT",
};

export default function ProjectList({ initialProjects }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [loading, setLoading] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const openModal = () => {
    setFormData(EMPTY_FORM);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.client.trim()) {
      toast.error("Proje adı ve müşteri zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const slug = formData.title
        .toLowerCase()
        .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .trim() + "-" + Math.random().toString(36).substring(2, 6);

      const payload = {
        title: formData.title.trim(),
        slug,
        client: formData.client.trim(),
        year: parseInt(formData.year) || new Date().getFullYear(),
        category: formData.category.trim(),
        challenge: formData.challenge.trim() || undefined,
        solution: formData.solution.trim() || undefined,
        heroImage: formData.heroImage.trim() || undefined,
        techTags: formData.techTags
          ? formData.techTags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        status: formData.status,
      };

      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Kayıt başarısız.");
      }

      const created = await res.json();
      setProjects((prev) => [created, ...prev]);
      toast.success("Proje oluşturuldu.");
      closeModal();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`'${title}' projesini silmek istediğinize emin misiniz?`)) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        toast.success("Proje silindi.");
      } else {
        const d = await res.json();
        throw new Error(d.error || "Silme başarısız.");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(null);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    PUBLISHED: "bg-green-100 text-green-700",
    DRAFT: "bg-gray-100 text-gray-600",
    ARCHIVED: "bg-orange-100 text-orange-600",
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <a
            href="https://www.cicekanatechmedia.com/projects"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-corp-teal hover:underline flex items-center gap-1"
          >
            <ExternalLink size={12} /> Siteyi Görüntüle
          </a>
          <button
            onClick={openModal}
            className="bg-corp-teal text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 text-sm min-h-[44px]"
          >
            <Plus size={16} /> Yeni Proje
          </button>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-corp-border">
          <table className="w-full text-left">
            <thead className="bg-corp-surface border-b border-corp-border text-corp-gray text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4">Proje Adı</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Müşteri</th>
                <th className="p-4">Yıl</th>
                <th className="p-4">Durum</th>
                <th className="p-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-corp-border text-sm">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-corp-gray">
                    Henüz proje eklenmedi.
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-semibold text-corp-charcoal">
                      <div className="flex items-center gap-3">
                        {project.heroImage && (
                          <img
                            src={project.heroImage}
                            alt={project.title}
                            className="w-10 h-10 rounded-lg object-cover border border-corp-border"
                          />
                        )}
                        {project.title}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-corp-gray">{project.category}</td>
                    <td className="p-4 text-sm text-corp-gray">{project.client}</td>
                    <td className="p-4 text-sm text-corp-gray">{project.year}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}>
                        {project.status === "PUBLISHED" ? "Yayında" : project.status === "DRAFT" ? "Taslak" : "Arşiv"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDelete(project.id, project.title)}
                          disabled={loading === project.id}
                          className="p-2 text-corp-gray hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Sil"
                        >
                          {loading === project.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-corp-border bg-white rounded-xl border border-corp-border overflow-hidden">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-corp-gray text-sm">Henüz proje eklenmedi.</div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {project.heroImage && (
                      <img
                        src={project.heroImage}
                        alt={project.title}
                        className="w-10 h-10 rounded-lg object-cover border border-corp-border shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-corp-charcoal text-sm truncate">{project.title}</p>
                      <p className="text-xs text-corp-gray truncate">{project.client} • {project.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${STATUS_COLORS[project.status] || "bg-gray-100 text-gray-600"}`}>
                    {project.status === "PUBLISHED" ? "Yayında" : project.status === "DRAFT" ? "Taslak" : "Arşiv"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-corp-gray pt-1 border-t border-corp-border/50">
                  <span>Yıl: {project.year}</span>
                  <button
                    onClick={() => handleDelete(project.id, project.title)}
                    disabled={loading === project.id}
                    className="min-h-[38px] px-3 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                  >
                    {loading === project.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Sil
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-xl font-bold text-corp-charcoal">Yeni Proje Ekle</h2>
              <button
                onClick={closeModal}
                className="p-2 text-corp-gray hover:text-corp-charcoal hover:bg-gray-100 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Proje Adı <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Örn: Kurumsal Web Sitesi Yenileme"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                    Müşteri / Marka <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData((f) => ({ ...f, client: e.target.value }))}
                    placeholder="Örn: ABC Şirketi"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Yıl</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData((f) => ({ ...f, year: e.target.value }))}
                    placeholder="2026"
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option>Web Geliştirme</option>
                    <option>Mobil Uygulama</option>
                    <option>Dijital Pazarlama</option>
                    <option>E-Ticaret</option>
                    <option>Gerilla Pazarlama</option>
                    <option>Marka Tasarımı</option>
                    <option>Sosyal Medya</option>
                    <option>Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-corp-charcoal mb-1">Durum</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((f) => ({ ...f, status: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm bg-white"
                  >
                    <option value="PUBLISHED">Yayında</option>
                    <option value="DRAFT">Taslak</option>
                    <option value="ARCHIVED">Arşiv</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">Kapak Görsel URL'si</label>
                <input
                  type="url"
                  value={formData.heroImage}
                  onChange={(e) => setFormData((f) => ({ ...f, heroImage: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">
                  Teknoloji Etiketleri <span className="text-corp-gray text-xs">(virgülle ayırın)</span>
                </label>
                <input
                  type="text"
                  value={formData.techTags}
                  onChange={(e) => setFormData((f) => ({ ...f, techTags: e.target.value }))}
                  placeholder="Next.js, Prisma, Tailwind CSS"
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">Zorluk / Problem</label>
                <textarea
                  rows={2}
                  value={formData.challenge}
                  onChange={(e) => setFormData((f) => ({ ...f, challenge: e.target.value }))}
                  placeholder="Müşterinin yaşadığı sorun..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-corp-charcoal mb-1">Çözüm</label>
                <textarea
                  rows={2}
                  value={formData.solution}
                  onChange={(e) => setFormData((f) => ({ ...f, solution: e.target.value }))}
                  placeholder="Sunduğumuz çözüm..."
                  className="w-full px-4 py-2.5 rounded-xl border border-corp-border focus:outline-none focus:ring-2 focus:ring-corp-teal/30 text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-corp-border">
              <button
                onClick={closeModal}
                className="px-5 py-2 rounded-xl border border-corp-border text-corp-gray font-semibold hover:bg-gray-50 transition-all text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-corp-teal text-white px-6 py-2 rounded-xl font-semibold flex items-center gap-2 hover:bg-corp-teal-600 transition-all shadow-md active:scale-95 disabled:opacity-60 text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Kaydediliyor..." : "Projeyi Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
