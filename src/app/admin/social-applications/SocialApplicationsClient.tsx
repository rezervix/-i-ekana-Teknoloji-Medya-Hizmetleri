"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Download,
  Filter,
  Eye,
  X,
  Phone,
  Mail,
  MessageCircle,
  Building2,
  Calendar,
  Globe,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  Loader2,
  AlertCircle,
  User,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  APPLICATION_STATUS_META,
  SERVICE_BUDGET_OPTIONS,
  SECTOR_OPTIONS,
} from "@/types/social-application";

export type SocialApplicationItem = {
  id: string;
  applicationNumber: string;
  applicationType?: string;
  fullName?: string | null;
  companyName?: string | null;
  title?: string | null;
  email?: string | null;
  phone: string;
  website?: string | null;
  socialMediaUrl?: string | null;
  sector?: string | null;
  city?: string | null;
  services: string[];
  platforms: string[];
  goals: string[];
  monthlyServiceBudget?: string | null;
  monthlyAdSpendBudget?: string | null;
  preferredPeriod?: string | null;
  currentAccountStatus?: string | null;
  currentAdExperience?: string | null;
  notes?: string | null;
  preferredContactMethod?: string | null;
  budgetConfirmed: boolean;
  budgetConfirmedAt?: string | Date | null;
  kvkkConsent: boolean;
  marketingConsent: boolean;
  status: string;
  followUpDate?: string | Date | null;
  landingPage?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  adminNotes: {
    id: string;
    authorName: string;
    content: string;
    createdAt: string | Date;
  }[];
};

interface Props {
  initialApplications: SocialApplicationItem[];
  initialStats: Record<string, number>;
}

export default function SocialApplicationsClient({
  initialApplications,
  initialStats,
}: Props) {
  const [applications, setApplications] =
    useState<SocialApplicationItem[]>(initialApplications);
  const [stats, setStats] = useState<Record<string, number>>(initialStats);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "quick" | "detailed">("ALL");
  const [budgetFilter, setBudgetFilter] = useState("ALL");
  const [sectorFilter, setSectorFilter] = useState("ALL");

  // Selected for drawer modal
  const [selected, setSelected] = useState<SocialApplicationItem | null>(null);

  // Drawer local states
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [noteSuccess, setNoteSuccess] = useState(false);
  const [followUpDateInput, setFollowUpDateInput] = useState("");
  const [updatingFollowUp, setUpdatingFollowUp] = useState(false);

  // Open modal handler
  const handleOpenDetail = (app: SocialApplicationItem) => {
    setSelected(app);
    setNewNote("");
    setNoteSuccess(false);
    if (app.followUpDate) {
      const d = new Date(app.followUpDate);
      setFollowUpDateInput(d.toISOString().slice(0, 10));
    } else {
      setFollowUpDateInput("");
    }
  };

  // Filter logic
  const filtered = useMemo(() => {
    return applications.filter((app) => {
      // Type (quick vs detailed)
      if (
        typeFilter !== "ALL" &&
        (app.applicationType || "detailed") !== typeFilter
      ) {
        return false;
      }

      // Status
      if (statusFilter !== "ALL" && app.status !== statusFilter) return false;

      // Budget
      if (budgetFilter !== "ALL" && app.monthlyServiceBudget !== budgetFilter)
        return false;

      // Sector
      if (sectorFilter !== "ALL" && app.sector !== sectorFilter) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCompany = app.companyName
          ? app.companyName.toLowerCase().includes(q)
          : false;
        const matchName = app.fullName
          ? app.fullName.toLowerCase().includes(q)
          : false;
        const matchEmail = app.email
          ? app.email.toLowerCase().includes(q)
          : false;
        const matchPhone = app.phone
          ? app.phone.toLowerCase().includes(q)
          : false;
        const matchNo = app.applicationNumber
          ? app.applicationNumber.toLowerCase().includes(q)
          : false;
        const matchCity = app.city ? app.city.toLowerCase().includes(q) : false;
        if (
          !matchCompany &&
          !matchName &&
          !matchEmail &&
          !matchPhone &&
          !matchNo &&
          !matchCity
        ) {
          return false;
        }
      }

      return true;
    });
  }, [applications, statusFilter, typeFilter, budgetFilter, sectorFilter, search]);

  // Update Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selected) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/admin/social-applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Durum güncellenemedi");
      const updated = await res.json();

      setApplications((prev) =>
        prev.map((a) => (a.id === selected.id ? { ...a, status: newStatus } : a))
      );
      setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));

      // Refresh stats
      setStats((prev) => ({
        ...prev,
        [selected.status]: Math.max(0, (prev[selected.status] || 1) - 1),
        [newStatus]: (prev[newStatus] || 0) + 1,
      }));
    } catch (err: any) {
      alert(err.message || "Hata oluştu");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Update Follow Up Date
  const handleSaveFollowUpDate = async () => {
    if (!selected) return;
    setUpdatingFollowUp(true);
    try {
      const res = await fetch(`/api/admin/social-applications/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpDate: followUpDateInput || null }),
      });
      if (!res.ok) throw new Error("Takip tarihi kaydedilemedi");

      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id
            ? { ...a, followUpDate: followUpDateInput || null }
            : a
        )
      );
      setSelected((prev) =>
        prev ? { ...prev, followUpDate: followUpDateInput || null } : null
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingFollowUp(false);
    }
  };

  // Add Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !newNote.trim()) return;

    setAddingNote(true);
    setNoteSuccess(false);
    try {
      const res = await fetch(
        `/api/admin/social-applications/${selected.id}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newNote.trim() }),
        }
      );
      if (!res.ok) throw new Error("Not kaydedilemedi");
      const createdNote = await res.json();

      const updatedNotes = [createdNote, ...(selected.adminNotes || [])];
      setSelected({ ...selected, adminNotes: updatedNotes });
      setApplications((prev) =>
        prev.map((a) =>
          a.id === selected.id ? { ...a, adminNotes: updatedNotes } : a
        )
      );
      setNewNote("");
      setNoteSuccess(true);
      setTimeout(() => setNoteSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAddingNote(false);
    }
  };

  // Delete / Archive Application
  const handleDeleteApplication = async () => {
    if (!selected) return;
    if (
      !confirm(
        `[${selected.applicationNumber}] numaralı başvuruyu kalıcı olarak silmek istediğinize emin misiniz?`
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/social-applications/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme işlemi başarısız");

      setApplications((prev) => prev.filter((a) => a.id !== selected.id));
      setSelected(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // CSV Export with formula injection sanitization
  const handleExportCSV = () => {
    // Sanitizer against CSV formula injection (=, +, -, @, \t, \r)
    const sanitize = (val: any) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=\+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const headers = [
      "Başvuru No",
      "Tür",
      "Tarih",
      "İşletme Adı",
      "Yetkili Kişi",
      "Unvan",
      "E-posta",
      "Telefon",
      "Sektör",
      "Şehir",
      "Hizmet Bütçesi",
      "Reklam Harcaması Bütçesi",
      "Hizmetler",
      "Platformlar",
      "Hedefler",
      "15k Teyit",
      "Durum",
      "Takip Tarihi",
    ];

    const rows = filtered.map((a) => [
      sanitize(a.applicationNumber),
      sanitize(a.applicationType === "quick" ? "Hızlı Başvuru" : "Detaylı Başvuru"),
      sanitize(new Date(a.createdAt).toLocaleString("tr-TR")),
      sanitize(a.companyName || (a.applicationType === "quick" ? "Hızlı İletişim Talebi" : "—")),
      sanitize(a.fullName || (a.applicationType === "quick" ? "Telefon ile Başvuru" : "—")),
      sanitize(a.title || ""),
      sanitize(a.email || "—"),
      sanitize(a.phone),
      sanitize(a.sector || "—"),
      sanitize(a.city || ""),
      sanitize(a.monthlyServiceBudget || "15.000 TL+ (Teyitli)"),
      sanitize(a.monthlyAdSpendBudget || "—"),
      sanitize((a.services || []).join(", ")),
      sanitize((a.platforms || []).join(", ")),
      sanitize((a.goals || []).join(", ")),
      sanitize(a.budgetConfirmed ? "ONAYLANDI" : "HAYIR"),
      sanitize(APPLICATION_STATUS_META[a.status]?.label || a.status),
      sanitize(
        a.followUpDate
          ? new Date(a.followUpDate).toLocaleDateString("tr-TR")
          : ""
      ),
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sosyal-medya-basvurulari-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clean phone number for WhatsApp link
  const getWhatsAppLink = (rawPhone: string, company?: string | null) => {
    const clean = rawPhone.replace(/\D/g, "");
    const formatted = clean.startsWith("0")
      ? "9" + clean
      : clean.startsWith("90")
      ? clean
      : "90" + clean;
    const desc = company ? `${company} için ilettiğiniz` : "iletmiş olduğunuz";
    const text = encodeURIComponent(
      `Merhaba, Çiçekana Teknoloji & Medya'dan ulaşıyorum. ${desc} Sosyal Medya & Reklam Danışmanlığı başvurunuzu değerlendirdik.`
    );
    return `https://wa.me/${formatted}?text=${text}`;
  };

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-corp-charcoal">
              Sosyal Medya Başvuruları
            </h1>
            {stats.NEW > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-corp-teal text-white">
                {stats.NEW} Yeni
              </span>
            )}
          </div>
          <p className="font-body text-[13px] text-corp-gray mt-1">
            Toplam {stats.TOTAL || applications.length} başvuru kayıtlı • Filtrelenen: {filtered.length}
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-corp-border bg-white font-body text-[13px] font-semibold text-corp-charcoal hover:bg-corp-surface hover:text-corp-teal transition-all shadow-sm"
        >
          <Download size={15} />
          <span>CSV Dışa Aktar</span>
        </button>
      </div>

      {/* ── APPLICATION TYPE SELECTOR TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[12px] font-bold text-corp-charcoal shrink-0 mr-1">
          Tür:
        </span>
        <button
          onClick={() => setTypeFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all whitespace-nowrap border ${
            typeFilter === "ALL"
              ? "bg-corp-charcoal text-white border-corp-charcoal shadow-sm"
              : "bg-white text-corp-gray border-corp-border hover:bg-corp-surface"
          }`}
        >
          Tüm Türler ({stats.TOTAL || applications.length})
        </button>
        <button
          onClick={() => setTypeFilter("quick")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all whitespace-nowrap border ${
            typeFilter === "quick"
              ? "bg-sky-600 text-white border-sky-600 shadow-sm"
              : "bg-white text-sky-700 border-sky-200 hover:bg-sky-50"
          }`}
        >
          <span>⚡ Hızlı Başvuru (Hero)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              typeFilter === "quick"
                ? "bg-white text-sky-700"
                : "bg-sky-100 text-sky-800"
            }`}
          >
            {stats.QUICK ||
              applications.filter((a) => a.applicationType === "quick").length}
          </span>
        </button>
        <button
          onClick={() => setTypeFilter("detailed")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all whitespace-nowrap border ${
            typeFilter === "detailed"
              ? "bg-corp-teal text-white border-corp-teal shadow-sm"
              : "bg-white text-corp-teal border-corp-teal/30 hover:bg-corp-teal-50"
          }`}
        >
          <span>📋 Detaylı Başvuru (Form)</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              typeFilter === "detailed"
                ? "bg-white text-corp-teal"
                : "bg-corp-teal-50 text-corp-teal"
            }`}
          >
            {stats.DETAILED ||
              applications.filter(
                (a) => (a.applicationType || "detailed") === "detailed"
              ).length}
          </span>
        </button>
      </div>

      {/* ── STATUS TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`px-3.5 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all whitespace-nowrap border ${
            statusFilter === "ALL"
              ? "bg-corp-teal text-white border-corp-teal shadow-sm"
              : "bg-white text-corp-gray border-corp-border hover:bg-corp-surface"
          }`}
        >
          Tümü ({stats.TOTAL || applications.length})
        </button>

        {Object.entries(APPLICATION_STATUS_META).map(([key, meta]) => {
          const count = stats[key] || 0;
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? "shadow-sm"
                  : "bg-white text-corp-gray border-corp-border hover:bg-corp-surface"
              }`}
              style={{
                backgroundColor: isActive ? meta.bg : undefined,
                color: isActive ? meta.color : undefined,
                borderColor: isActive ? meta.border : undefined,
              }}
            >
              <span>{meta.label}</span>
              {count > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: isActive ? meta.color : "#E5E7EB",
                    color: isActive ? "#FFFFFF" : "#4B5563",
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="bg-white p-4 rounded-xl border border-corp-border shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-3.5 text-corp-gray-light"
          />
          <input
            type="text"
            placeholder="İşletme adı, yetkili, başvuru no, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-corp-border font-body text-[13px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-3 text-corp-gray hover:text-corp-charcoal"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Budget Filter */}
        <div className="w-full md:w-52">
          <select
            value={budgetFilter}
            onChange={(e) => setBudgetFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-corp-border bg-white font-body text-[13px] text-corp-charcoal focus:outline-none focus:border-corp-teal transition-all"
          >
            <option value="ALL">Tüm Hizmet Bütçeleri</option>
            {SERVICE_BUDGET_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Sector Filter */}
        <div className="w-full md:w-48">
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border border-corp-border bg-white font-body text-[13px] text-corp-charcoal focus:outline-none focus:border-corp-teal transition-all"
          >
            <option value="ALL">Tüm Sektörler</option>
            {SECTOR_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── TABLE (DESKTOP) & CARDS (MOBILE) ── */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-corp-border">
          <AlertCircle size={36} className="mx-auto text-corp-gray-light mb-3" />
          <h3 className="font-display text-lg font-bold text-corp-charcoal">
            Eşleşen Başvuru Bulunamadı
          </h3>
          <p className="font-body text-[13px] text-corp-gray mt-1 max-w-sm mx-auto">
            Arama kriterlerinize veya seçilen filtrelere uygun başvuru kaydı bulunmuyor.
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white rounded-2xl border border-corp-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFC] border-b border-corp-border text-corp-gray font-body text-[11px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Başvuru No & Tarih</th>
                    <th className="py-3.5 px-4">İşletme & Yetkili</th>
                    <th className="py-3.5 px-4">İletişim</th>
                    <th className="py-3.5 px-4">Sektör</th>
                    <th className="py-3.5 px-4">Hizmet Bütçesi</th>
                    <th className="py-3.5 px-4">Reklam Bütçesi</th>
                    <th className="py-3.5 px-4">Durum</th>
                    <th className="py-3.5 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-corp-border font-body text-[13px]">
                  {filtered.map((app) => {
                    const statusMeta =
                      APPLICATION_STATUS_META[app.status] || {
                        label: app.status,
                        color: "#6B7280",
                        bg: "#F3F4F6",
                        border: "#E5E7EB",
                      };
                    const dateFormatted = new Date(app.createdAt).toLocaleDateString(
                      "tr-TR",
                      { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
                    );

                    return (
                      <tr
                        key={app.id}
                        onClick={() => handleOpenDetail(app)}
                        className="hover:bg-corp-surface/50 cursor-pointer transition-colors group"
                      >
                        {/* No & Date & Type */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-bold text-corp-charcoal block group-hover:text-corp-teal">
                              {app.applicationNumber}
                            </span>
                            {app.applicationType === "quick" ? (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                ⚡ HIZLI
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                DETAYLI
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-corp-gray">
                            {dateFormatted}
                          </span>
                        </td>

                        {/* Company & Name */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-corp-charcoal block">
                            {app.companyName ||
                              (app.applicationType === "quick"
                                ? "Hızlı İletişim Talebi"
                                : "Belirtilmedi")}
                          </span>
                          <span className="text-[12px] text-corp-gray">
                            {app.fullName ||
                              (app.applicationType === "quick"
                                ? "Telefon ile Başvuru"
                                : "—")}{" "}
                            {app.title ? `(${app.title})` : ""}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-4">
                          <span className="block font-semibold text-[13px] text-corp-charcoal">
                            {app.phone}
                          </span>
                          <span className="text-[11px] text-corp-gray">
                            {app.email || "—"}
                          </span>
                        </td>

                        {/* Sector */}
                        <td className="py-3.5 px-4">
                          <span className="text-[12px] text-corp-charcoal block">
                            {app.sector || "—"}
                          </span>
                          {app.city && (
                            <span className="text-[11px] text-corp-gray">
                              {app.city}
                            </span>
                          )}
                        </td>

                        {/* Service Budget */}
                        <td className="py-3.5 px-4">
                          {app.applicationType === "quick" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 size={12} /> 15.000 TL+ (Teyitli)
                            </span>
                          ) : (
                            <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-corp-teal-50 text-corp-teal border border-corp-teal/20">
                              {app.monthlyServiceBudget}
                            </span>
                          )}
                        </td>

                        {/* Ad Budget */}
                        <td className="py-3.5 px-4">
                          <span className="text-[12px] text-corp-gray">
                            {app.monthlyAdSpendBudget || "—"}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: statusMeta.bg,
                              color: statusMeta.color,
                              border: `1px solid ${statusMeta.border}`,
                            }}
                          >
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDetail(app);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-corp-border text-corp-charcoal hover:text-corp-teal hover:border-corp-teal transition-all text-[12px] font-semibold"
                          >
                            <Eye size={13} />
                            <span>İncele</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE & TABLET CARDS */}
          <div className="lg:hidden space-y-3">
            {filtered.map((app) => {
              const statusMeta =
                APPLICATION_STATUS_META[app.status] || {
                  label: app.status,
                  color: "#6B7280",
                  bg: "#F3F4F6",
                  border: "#E5E7EB",
                };

              return (
                <div
                  key={app.id}
                  onClick={() => handleOpenDetail(app)}
                  className="bg-white p-4 rounded-xl border border-corp-border shadow-sm active:bg-corp-surface/60 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-[11px] font-bold text-corp-teal">
                          {app.applicationNumber}
                        </span>
                        {app.applicationType === "quick" ? (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
                            ⚡ HIZLI
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            DETAYLI
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-[15px] font-bold text-corp-charcoal">
                        {app.companyName ||
                          (app.applicationType === "quick"
                            ? `Hızlı Başvuru (${app.phone})`
                            : "İşletme Belirtilmedi")}
                      </h3>
                      <p className="font-body text-[12px] text-corp-gray">
                        {app.fullName ||
                          (app.applicationType === "quick"
                            ? "Telefon ile Talep"
                            : "—")}{" "}
                        {app.title ? `• ${app.title}` : ""}
                      </p>
                    </div>

                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                      style={{
                        backgroundColor: statusMeta.bg,
                        color: statusMeta.color,
                        border: `1px solid ${statusMeta.border}`,
                      }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-corp-border text-[12px] font-body">
                    <div>
                      <span className="text-corp-gray block text-[10px] uppercase">
                        Hizmet Bütçesi
                      </span>
                      {app.applicationType === "quick" ? (
                        <span className="text-emerald-700 font-bold text-[12px] flex items-center gap-1">
                          <CheckCircle2 size={12} /> 15.000 TL+ Teyitli
                        </span>
                      ) : (
                        <strong className="text-corp-teal font-bold">
                          {app.monthlyServiceBudget}
                        </strong>
                      )}
                    </div>
                    <div>
                      <span className="text-corp-gray block text-[10px] uppercase">
                        Telefon
                      </span>
                      <span className="text-corp-charcoal font-semibold">
                        {app.phone}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-corp-border text-[11px] font-body text-corp-gray">
                    <span>
                      {new Date(app.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="font-semibold text-corp-teal flex items-center gap-1">
                      Detayları Gör <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── DETAIL DRAWER MODAL ── */}
      {selected && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end animate-fade-in">
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Drawer Top Header */}
            <div className="p-6 border-b border-corp-border sticky top-0 bg-white z-10 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-[12px] font-bold text-corp-teal bg-corp-teal-50 px-2.5 py-0.5 rounded border border-corp-teal/20">
                    {selected.applicationNumber}
                  </span>
                  {selected.applicationType === "quick" ? (
                    <span className="text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 px-2 py-0.5 rounded-full">
                      ⚡ Hızlı Başvuru
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-full">
                      📋 Detaylı Başvuru
                    </span>
                  )}
                  <span className="text-[12px] text-corp-gray font-body">
                    {new Date(selected.createdAt).toLocaleString("tr-TR")}
                  </span>
                </div>
                <h2 className="font-display text-xl font-bold text-corp-charcoal">
                  {selected.companyName ||
                    (selected.applicationType === "quick"
                      ? `Hızlı Başvuru: ${selected.phone}`
                      : "İşletme Belirtilmedi")}
                </h2>
                <p className="font-body text-[13px] text-corp-gray">
                  {selected.applicationType === "quick" ? (
                    <span>
                      İletişim Talebi • Telefon:{" "}
                      <strong className="text-corp-charcoal font-semibold">
                        {selected.phone}
                      </strong>
                    </span>
                  ) : (
                    <>
                      Yetkili: <strong>{selected.fullName || "—"}</strong>{" "}
                      {selected.title ? `(${selected.title})` : ""}
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-lg text-corp-gray hover:text-corp-charcoal hover:bg-corp-surface transition-colors"
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 font-body text-[13px]">
              {/* Quick Application Info Alert */}
              {selected.applicationType === "quick" && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-[13px] flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold">
                    ⚡
                  </div>
                  <div className="space-y-1">
                    <strong className="block font-bold text-sky-950">
                      Hero Section Hızlı Başvuru Kaydı
                    </strong>
                    <p className="text-[12px] text-sky-800 leading-relaxed">
                      Bu başvuru, kullanıcının sayfanın en üstündeki formdan yalnızca telefon numarasını girip 15.000 TL asgari bütçe koşulunu teyit etmesiyle oluşturulmuştur.
                      Detaylı şirket ve hizmet hedefleri ilk telefon görüşmesinde belirlenecektir.
                    </p>
                  </div>
                </div>
              )}

              {/* Quick Communication Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <a
                  href={getWhatsAppLink(selected.phone, selected.companyName)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[13px] hover:bg-emerald-100 transition-colors"
                >
                  <MessageCircle size={15} />
                  <span>WhatsApp Başlat</span>
                </a>

                <a
                  href={`tel:${selected.phone}`}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-corp-teal-50 text-corp-teal border border-corp-teal-100 font-semibold text-[13px] hover:bg-corp-teal-100 transition-colors"
                >
                  <Phone size={15} />
                  <span>Ara: {selected.phone}</span>
                </a>

                {selected.email ? (
                  <a
                    href={`mailto:${selected.email}`}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-corp-surface text-corp-charcoal border border-corp-border font-semibold text-[13px] hover:bg-corp-border/60 transition-colors"
                  >
                    <Mail size={15} />
                    <span>E-posta Gönder</span>
                  </a>
                ) : (
                  <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#FAFAFC] text-corp-gray-light border border-corp-border text-[12px]">
                    <Mail size={15} />
                    <span>E-posta Yok (Hızlı)</span>
                  </div>
                )}
              </div>

              {/* Status & Follow Up Actions */}
              <div className="p-4 rounded-xl bg-[#FAFAFC] border border-corp-border space-y-3">
                <span className="font-bold text-[12px] text-corp-charcoal block uppercase tracking-wider">
                  Başvuru Yönetimi & Takip
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-corp-gray mb-1">
                      Başvuru Durumu
                    </label>
                    <select
                      value={selected.status}
                      disabled={updatingStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-corp-border bg-white text-[13px] font-semibold text-corp-charcoal focus:outline-none focus:border-corp-teal"
                    >
                      {Object.entries(APPLICATION_STATUS_META).map(
                        ([key, meta]) => (
                          <option key={key} value={key}>
                            {meta.label}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-corp-gray mb-1">
                      Takip Tarihi (Hatırlatıcı)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={followUpDateInput}
                        onChange={(e) => setFollowUpDateInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-corp-border bg-white text-[13px] text-corp-charcoal focus:outline-none focus:border-corp-teal"
                      />
                      <button
                        onClick={handleSaveFollowUpDate}
                        disabled={updatingFollowUp}
                        className="px-3 py-1.5 rounded-lg bg-corp-teal text-white text-[12px] font-semibold hover:bg-corp-teal-600 transition-colors disabled:opacity-50"
                      >
                        Kaydet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bütçe ve Doğrulama Kartı */}
              <div className="p-4 rounded-xl border border-corp-teal/30 bg-corp-teal-50/40 space-y-2">
                <div className="flex items-center gap-2 text-corp-teal font-bold text-[13px]">
                  <ShieldCheck size={18} />
                  <span>Bütçe ve Ticari Teyit Seviyesi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-[11px] text-corp-gray block">
                      Aylık Ajans Hizmet Bütçesi
                    </span>
                    <strong className="text-corp-charcoal text-[14px]">
                      {selected.monthlyServiceBudget}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-corp-gray block">
                      Aylık Reklam Harcaması Bütçesi
                    </span>
                    <strong className="text-corp-charcoal text-[14px]">
                      {selected.monthlyAdSpendBudget}
                    </strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-corp-teal/20 text-[12px] text-corp-charcoal">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 size={13} /> 15.000 TL Asgari Bütçe Teyidi Verildi
                  </span>
                  {selected.budgetConfirmedAt && (
                    <span className="text-corp-gray text-[11px] ml-2">
                      (Teyit: {new Date(selected.budgetConfirmedAt).toLocaleString("tr-TR")})
                    </span>
                  )}
                </div>
              </div>

              {/* Detailed Specs */}
              <div className="space-y-4">
                <h4 className="font-bold text-[13px] text-corp-charcoal border-b border-corp-border pb-1">
                  Başvuru ve Marka Bilgileri
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <span className="text-corp-gray block">Sektör:</span>
                    <span className="font-semibold text-corp-charcoal">
                      {selected.sector || "Belirtilmedi (Görüşmede alınacak)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-corp-gray block">Şehir:</span>
                    <span className="font-semibold text-corp-charcoal">
                      {selected.city || "Belirtilmedi (TR Geneli)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-corp-gray block">Web Sitesi:</span>
                    {selected.website ? (
                      <a
                        href={selected.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-corp-teal underline flex items-center gap-1 font-medium"
                      >
                        {selected.website} <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-corp-gray-light">Belirtilmedi</span>
                    )}
                  </div>
                  <div>
                    <span className="text-corp-gray block">Sosyal Medya / Instagram:</span>
                    {selected.socialMediaUrl ? (
                      <span className="text-corp-charcoal font-medium">
                        {selected.socialMediaUrl}
                      </span>
                    ) : (
                      <span className="text-corp-gray-light">Belirtilmedi</span>
                    )}
                  </div>
                  <div>
                    <span className="text-corp-gray block">Başlama Dönemi:</span>
                    <span className="text-corp-charcoal font-medium">
                      {selected.preferredPeriod || "Hemen (Öncelikli)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-corp-gray block">İletişim Tercihi:</span>
                    <span className="text-corp-charcoal font-medium">
                      {selected.preferredContactMethod || "Telefon Görüşmesi"}
                    </span>
                  </div>
                </div>

                {/* Services, Platforms, Goals */}
                <div className="space-y-3 pt-2">
                  <div>
                    <span className="text-[11px] font-bold text-corp-gray block mb-1 uppercase">
                      İlgilenilen Hizmetler:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.services && selected.services.length > 0 ? (
                        selected.services.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-1 rounded-md bg-corp-teal-50 text-corp-teal text-[11px] font-semibold border border-corp-teal/10"
                          >
                            {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-corp-gray italic">
                          Hızlı Başvuru — Görüşmede belirlenecek
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-corp-gray block mb-1 uppercase">
                      Yönetilmesi İstenen Platformlar:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.platforms && selected.platforms.length > 0 ? (
                        selected.platforms.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-md bg-corp-surface text-corp-charcoal text-[11px] font-medium border border-corp-border"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-corp-gray italic">
                          Belirtilmedi (Görüşmede kararlaştırılacak)
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-corp-gray block mb-1 uppercase">
                      İşletme Hedefleri:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selected.goals && selected.goals.length > 0 ? (
                        selected.goals.map((g) => (
                          <span
                            key={g}
                            className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200"
                          >
                            {g}
                          </span>
                        ))
                      ) : (
                        <span className="text-[12px] text-corp-gray italic">
                          Belirtilmedi (Görüşmede belirlenecek)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Client Notes */}
                {selected.notes && (
                  <div className="p-3.5 rounded-xl bg-corp-surface/60 border border-corp-border">
                    <span className="text-[11px] font-bold text-corp-gray block uppercase mb-1">
                      Müşteri Açıklaması / Sorunları:
                    </span>
                    <p className="text-[13px] text-corp-charcoal leading-relaxed whitespace-pre-wrap">
                      {selected.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Internal Notes Section */}
              <div className="space-y-3 pt-3 border-t border-corp-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[13px] text-corp-charcoal">
                    Dahili Yönetici Notları ({selected.adminNotes?.length || 0})
                  </h4>
                  <span className="text-[11px] text-corp-gray">
                    Yalnızca yetkili ekip görür
                  </span>
                </div>

                {/* Add note form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Müşteri görüşmesi, teklif durumu veya takip notu ekleyin..."
                    className="w-full p-3 rounded-xl border border-corp-border bg-white text-[13px] text-corp-charcoal focus:outline-none focus:border-corp-teal resize-none"
                  />
                  <div className="flex items-center justify-between">
                    {noteSuccess && (
                      <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                        <Check size={12} /> Not başarıyla eklendi
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={addingNote || !newNote.trim()}
                      className="ml-auto px-4 py-2 rounded-lg bg-corp-teal text-white font-semibold text-[12px] hover:bg-corp-teal-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {addingNote ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      <span>Not Ekle</span>
                    </button>
                  </div>
                </form>

                {/* List of notes */}
                <div className="space-y-2 mt-3 max-h-52 overflow-y-auto pr-1">
                  {selected.adminNotes && selected.adminNotes.length > 0 ? (
                    selected.adminNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-lg bg-corp-surface/70 border border-corp-border/80 text-[12px] space-y-1"
                      >
                        <div className="flex items-center justify-between text-corp-gray text-[11px]">
                          <strong>{note.authorName}</strong>
                          <span>
                            {new Date(note.createdAt).toLocaleString("tr-TR")}
                          </span>
                        </div>
                        <p className="text-corp-charcoal leading-relaxed whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[12px] text-corp-gray italic text-center py-2">
                      Henüz dahili not eklenmemiş.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-corp-border bg-[#FAFAFC] flex items-center justify-between sticky bottom-0">
              <button
                onClick={handleDeleteApplication}
                className="px-3.5 py-2 rounded-lg text-error hover:bg-error/10 text-[12px] font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>Başvuruyu Sil</span>
              </button>

              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-lg bg-white border border-corp-border text-corp-charcoal font-semibold text-[12px] hover:bg-corp-surface transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
