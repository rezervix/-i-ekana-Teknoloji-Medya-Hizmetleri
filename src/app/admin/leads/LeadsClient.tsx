"use client";

import React, { useState } from "react";
import { formatDate } from "@/lib/utils";
import { X, StickyNote, Download } from "lucide-react";

type Lead = {
  id: string; companyName: string; sector: string; solutionType: string[];
  timeline: string; email: string; brief?: string | null; status: string;
  createdAt: Date; updatedAt: Date;
  notes: { id: string; content: string; createdAt: Date; leadId: string }[];
};

const STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"] as const;
const STATUS_META: Record<string, { label: string; color: string }> = {
  NEW:           { label: "Yeni",              color: "#0A4D68" },
  CONTACTED:     { label: "İletişimde",         color: "#F59E0B" },
  QUALIFIED:     { label: "Nitelikli",          color: "#7C3AED" },
  PROPOSAL_SENT: { label: "Teklif Gönderildi",  color: "#06B6D4" },
  WON:           { label: "Kazanıldı",          color: "#10B981" },
  LOST:          { label: "Kaybedildi",         color: "#EF4444" },
};

const inpCls =
  "flex-1 bg-white border border-corp-border rounded-lg px-3 py-2 font-body text-[13px] text-corp-charcoal placeholder-corp-gray-light focus:outline-none focus:border-corp-teal focus:ring-2 focus:ring-corp-teal/10 transition-all";

export default function LeadsClient({ leads: initialLeads }: { leads: Lead[] }) {
  const [leads, setLeads]           = useState(initialLeads);
  const [selected, setSelected]     = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [note, setNote]             = useState("");

  const filtered = filterStatus === "ALL" ? leads : leads.filter((l) => l.status === filterStatus);

  const updateStatus = async (leadId: string, status: string) => {
    await fetch(`/api/admin/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLeads(leads.map((l) => (l.id === leadId ? { ...l, status } : l)));
    if (selected?.id === leadId) setSelected((s) => (s ? { ...s, status } : null));
  };

  const addNote = async () => {
    if (!note.trim() || !selected) return;
    const res = await fetch(`/api/admin/leads/${selected.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    const newNote = await res.json();
    const updatedLead = { ...selected, notes: [newNote, ...selected.notes] };
    setLeads(leads.map((l) => (l.id === selected.id ? updatedLead : l)));
    setSelected(updatedLead);
    setNote("");
  };

  const exportCSV = () => {
    const headers = ["Şirket", "Sektör", "Çözüm", "E-posta", "Durum", "Tarih"];
    const rows = filtered.map((l) => [
      l.companyName, l.sector, l.solutionType.join("|"),
      l.email, STATUS_META[l.status]?.label, formatDate(l.createdAt),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-corp-charcoal">Lead / CRM</h1>
          <p className="font-body text-[14px] text-corp-gray mt-0.5">{filtered.length} kayıt</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-[13px] font-semibold text-corp-teal border border-corp-teal/30 hover:bg-corp-teal-50 transition-all duration-200"
        >
          <Download size={15} /> CSV İndir
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {["ALL", ...STATUSES].map((s) => {
          const meta   = s === "ALL" ? { label: "Tümü", color: "#6B7280" } : STATUS_META[s];
          const active = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-3 py-1.5 rounded-lg font-body text-[12px] font-semibold transition-all duration-200 border"
              style={{
                background:   active ? `${meta.color}14` : "#fff",
                color:        active ? meta.color : "#6B7280",
                borderColor:  active ? `${meta.color}40` : "#E8E8EE",
              }}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Leads table */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-corp-border bg-corp-surface">
                {["Şirket", "Sektör", "Çözüm", "E-posta", "Durum", "Tarih"].map((h) => (
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
                  <td colSpan={6} className="px-6 py-12 text-center font-body text-[14px] text-corp-gray">
                    Kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => {
                  const st = STATUS_META[lead.status];
                  return (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-body text-[14px] text-corp-charcoal font-semibold">
                        {lead.companyName}
                      </td>
                      <td className="px-6 py-4 font-body text-[13px] text-corp-gray">
                        {lead.sector}
                      </td>
                      <td className="px-6 py-4 font-body text-[13px] text-corp-gray">
                        {lead.solutionType.slice(0, 2).join(", ")}
                      </td>
                      <td className="px-6 py-4 font-body text-[13px] text-corp-gray-light">
                        {lead.email}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-full font-body text-[11px] font-bold"
                          style={{
                            background:  `${st.color}14`,
                            color:        st.color,
                            border:      `1px solid ${st.color}30`,
                          }}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-body text-[12px] text-corp-gray-light whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="w-full max-w-md bg-white border-l border-corp-border flex flex-col overflow-hidden shadow-luxury">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
              <h2 className="font-display text-lg text-corp-charcoal">{selected.companyName}</h2>
              <button
                onClick={() => setSelected(null)}
                className="text-corp-gray hover:text-corp-charcoal transition-colors"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Lead info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: "Sektör",  v: selected.sector },
                  { l: "E-posta", v: selected.email },
                  { l: "Takvim",  v: selected.timeline },
                  { l: "Tarih",   v: formatDate(selected.createdAt) },
                ].map(({ l, v }) => (
                  <div key={l} className="p-3 rounded-xl border border-corp-border bg-corp-surface">
                    <p className="font-body text-[10px] text-corp-gray uppercase tracking-widest mb-1">{l}</p>
                    <p className="font-body text-[13px] text-corp-charcoal font-medium">{v}</p>
                  </div>
                ))}
              </div>

              {/* Solution tags */}
              <div>
                <p className="font-body text-[11px] text-corp-gray uppercase tracking-widest mb-2">Çözümler</p>
                <div className="flex flex-wrap gap-2">
                  {selected.solutionType.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-full font-body text-[12px] text-corp-teal bg-corp-teal-50 border border-corp-teal/25"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Brief */}
              {selected.brief && (
                <div>
                  <p className="font-body text-[11px] text-corp-gray uppercase tracking-widest mb-2">Brief</p>
                  <p className="font-body text-[13px] text-corp-gray leading-relaxed p-4 rounded-xl border border-corp-border bg-corp-surface">
                    {selected.brief}
                  </p>
                </div>
              )}

              {/* Status update */}
              <div>
                <p className="font-body text-[11px] text-corp-gray uppercase tracking-widest mb-2">Durumu Güncelle</p>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map((s) => {
                    const meta   = STATUS_META[s];
                    const active = selected.status === s;
                    return (
                      <button
                        key={s}
                        onClick={() => updateStatus(selected.id, s)}
                        className="p-2.5 rounded-xl font-body text-[12px] font-semibold transition-all duration-200 border"
                        style={{
                          background:  active ? `${meta.color}14` : "#fff",
                          color:       active ? meta.color : "#6B7280",
                          borderColor: active ? `${meta.color}40` : "#E8E8EE",
                        }}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="font-body text-[11px] text-corp-gray uppercase tracking-widest mb-3 flex items-center gap-2">
                  <StickyNote size={12} /> Dahili Notlar
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Not ekle..."
                    className={inpCls}
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                  />
                  <button
                    onClick={addNote}
                    className="px-4 py-2 rounded-lg font-body text-[12px] font-bold text-white bg-corp-teal hover:bg-corp-teal-600 transition-colors"
                  >
                    Ekle
                  </button>
                </div>
                <div className="space-y-2">
                  {selected.notes.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl border border-corp-border bg-corp-surface">
                      <p className="font-body text-[13px] text-corp-charcoal">{n.content}</p>
                      <p className="font-body text-[11px] text-corp-gray-light mt-1">
                        {formatDate(n.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
