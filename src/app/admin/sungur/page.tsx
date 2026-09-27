"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Wifi, WifiOff, Play, Loader2, Terminal, Copy, Check,
  ChevronDown, Send, Settings, RefreshCw, Server, Mail, Zap,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export const dynamic = "force-dynamic";


// ─── Types ────────────────────────────────────────────────────────────────────
type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
type TabId = "launcher" | "logs" | "campaigns" | "automation" | "config";

interface CrewRun {
  id: string; agentType: string; status: RunStatus;
  startedAt: string; completedAt?: string; logs?: string; output?: string;
}

const AGENT_TYPES = [
  { value: "lead_qualification",     label: "Lead Qualification Agent",      desc: "Lead'i analiz et, 1-10 skoru ver, nitelendirme raporu yaz." },
  { value: "proposal_generator",     label: "Service Proposal Generator",     desc: "Lead verisine göre kişiselleştirilmiş hizmet teklifi oluştur." },
  { value: "email_campaign_writer",  label: "Email Campaign Writer",          desc: "Hedef şirket/sektör için 3-5 e-posta dizisi yaz." },
  { value: "market_research",        label: "Market Research Agent",          desc: "Hedef şirket / sektörü araştır, kısa brifing oluştur." },
  { value: "custom",                 label: "Custom Task",                    desc: "Serbest metin görevi gir." },
];

const STATUS_META: Record<RunStatus, { label: string; color: string }> = {
  PENDING:   { label: "Bekliyor",     color: "#F59E0B" },
  RUNNING:   { label: "Çalışıyor",    color: "#0EA5E9" },
  COMPLETED: { label: "Tamamlandı",   color: "#10B981" },
  FAILED:    { label: "Hata",         color: "#EF4444" },
};

// ─── Tab: Agent Launcher ──────────────────────────────────────────────────────
function AgentLauncher({ onLaunched }: { onLaunched: (runId: string) => void }) {
  const [agent, setAgent] = useState(AGENT_TYPES[0].value);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const selectedAgent = AGENT_TYPES.find((a) => a.value === agent)!;

  const launch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sungur/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentType: agent, inputData: inputs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "VPS hatası");
      toast.success(`Agent başlatıldı — Run ID: ${data.runId}`);
      onLaunched(data.runId);
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const inp = "bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-electric/50 transition-all w-full";

  return (
    <div className="space-y-6">
      <div>
        <label className="block font-body text-[11px] text-text-faint uppercase tracking-ultra mb-3">Agent Tipi</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {AGENT_TYPES.map((a) => (
            <button key={a.value} onClick={() => setAgent(a.value)}
              className="text-left p-4 rounded-xl border transition-all duration-200"
              style={{
                borderColor: agent === a.value ? "rgba(14,165,233,0.5)" : "rgba(255,255,255,0.08)",
                background: agent === a.value ? "rgba(14,165,233,0.08)" : "rgba(255,255,255,0.02)",
              }}>
              <p className="font-body text-[13px] font-semibold mb-1" style={{ color: agent === a.value ? "#0EA5E9" : "white" }}>{a.label}</p>
              <p className="font-body text-[11px] text-text-faint leading-relaxed">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-white/8 space-y-4" style={{ background: "rgba(255,255,255,0.02)" }}>
        <p className="font-body text-[11px] text-text-faint uppercase tracking-ultra">Agent Girdileri</p>

        {agent === "lead_qualification" && (
          <>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Lead ID veya Şirket Adı</label>
              <input className={inp} placeholder="ABC A.Ş." value={inputs.company || ""} onChange={(e) => setInputs({ ...inputs, company: e.target.value })} /></div>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Sektör</label>
              <input className={inp} placeholder="Fintech" value={inputs.sector || ""} onChange={(e) => setInputs({ ...inputs, sector: e.target.value })} /></div>
          </>
        )}
        {agent === "email_campaign_writer" && (
          <>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Hedef Şirket</label>
              <input className={inp} placeholder="XYZ Corp" value={inputs.company || ""} onChange={(e) => setInputs({ ...inputs, company: e.target.value })} /></div>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Sektör</label>
              <input className={inp} placeholder="Lojistik" value={inputs.sector || ""} onChange={(e) => setInputs({ ...inputs, sector: e.target.value })} /></div>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">E-posta Dizisi (kaç adet)</label>
              <input type="number" className={inp} placeholder="3" value={inputs.count || "3"} onChange={(e) => setInputs({ ...inputs, count: e.target.value })} /></div>
          </>
        )}
        {(agent === "market_research" || agent === "proposal_generator") && (
          <>
            <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Şirket / Sektör</label>
              <input className={inp} placeholder="Şirket adı veya sektör" value={inputs.target || ""} onChange={(e) => setInputs({ ...inputs, target: e.target.value })} /></div>
          </>
        )}
        {agent === "custom" && (
          <div><label className="block font-body text-[11px] text-text-faint mb-1.5">Özel Görev</label>
            <textarea rows={4} className={inp + " resize-none"} placeholder="CrewAI'ye ne yapmasını istiyorsunuz?"
              value={inputs.task || ""} onChange={(e) => setInputs({ ...inputs, task: e.target.value })} /></div>
        )}
      </div>

      <button onClick={launch} disabled={loading}
        className="flex items-center gap-3 px-8 py-4 rounded-xl font-body font-bold text-[14px] text-white disabled:opacity-60 transition-all hover:-translate-y-0.5"
        style={{ background: "linear-gradient(135deg,#0EA5E9,#7C3AED)", boxShadow: "0 0 40px rgba(14,165,233,0.25)" }}>
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={16} /> Agent Başlat</>}
      </button>
    </div>
  );
}

// ─── Tab: Live Log Viewer ─────────────────────────────────────────────────────
function LogViewer({ activeRunId }: { activeRunId: string | null }) {
  const [runs, setRuns] = useState<CrewRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(activeRunId);
  const [logs, setLogs] = useState<string[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => { fetch("/api/sungur/runs").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setRuns(d); }); }, []);
  useEffect(() => { if (activeRunId) setSelectedRun(activeRunId); }, [activeRunId]);

  useEffect(() => {
    if (!selectedRun) return;
    esRef.current?.close();
    setLogs([]);
    const es = new EventSource(`/api/sungur/logs/${selectedRun}`);
    es.onmessage = (e) => { setLogs((prev) => [...prev, e.data]); };
    es.onerror = () => { es.close(); };
    esRef.current = es;
    return () => { es.close(); };
  }, [selectedRun]);

  useEffect(() => {
    if (autoScroll && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorLine = (line: string) => {
    if (line.includes("[ERROR]") || line.includes("Error") || line.includes("FAILED")) return "#EF4444";
    if (line.includes("[WARNING]") || line.includes("Warn")) return "#F59E0B";
    if (line.includes("[SUCCESS]") || line.includes("✓") || line.includes("Completed")) return "#10B981";
    if (line.startsWith(">") || line.includes("Tool:") || line.includes("Action:")) return "#0EA5E9";
    return "#94A3B8";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block font-body text-[11px] text-text-faint uppercase tracking-ultra mb-2">Run Seç</label>
          <select onChange={(e) => setSelectedRun(e.target.value)} value={selectedRun || ""}
            className="bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 font-mono text-[13px] text-white focus:outline-none focus:border-electric/50 w-full appearance-none">
            <option value="">-- Run seçin --</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id}>{r.agentType} — {new Date(r.startedAt).toLocaleString("tr-TR")} [{r.status}]</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <button onClick={copyLogs} className="p-2.5 rounded-xl border border-white/10 text-text-faint hover:text-electric hover:border-electric/30 transition-all">
            {copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
          </button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} className="rounded border-white/20 bg-white/5 text-electric" />
            <span className="font-body text-[12px] text-text-faint">Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Terminal */}
      <div ref={logRef}
        className="h-[500px] overflow-y-auto rounded-xl border border-white/8 p-4 font-mono text-[12px] leading-relaxed"
        style={{ background: "#0A0A0F" }}>
        {logs.length === 0 ? (
          <p className="text-text-faint italic">{selectedRun ? "Log bekleniyor..." : "Run seçin veya yeni agent başlatın."}</p>
        ) : (
          logs.map((line, i) => (
            <div key={i} style={{ color: colorLine(line) }}>{line}</div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Tab: VPS Config ──────────────────────────────────────────────────────────
function VPSConfig() {
  const [vpsUrl, setVpsUrl] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [sysInfo, setSysInfo] = useState<any>(null);

  const testConnection = async () => {
    if (!vpsUrl) { toast.error("VPS URL zorunlu"); return; }
    setStatus("testing");
    try {
      const res = await fetch("/api/sungur/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vpsUrl, token }) });
      const data = await res.json();
      if (res.ok) { setStatus("ok"); setSysInfo(data); toast.success("VPS bağlantısı başarılı!"); }
      else { setStatus("fail"); toast.error("Bağlantı başarısız"); }
    } catch { setStatus("fail"); toast.error("Bağlantı hatası"); }
  };

  const save = async () => {
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vpsUrl, sungurToken: token }) });
    toast.success("Ayarlar kaydedildi");
  };

  const inp = "bg-white/4 border border-white/10 rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder-white/25 focus:outline-none focus:border-electric/50 transition-all w-full";

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <label className="block font-body text-[11px] text-text-faint uppercase tracking-ultra mb-2">VPS Base URL</label>
        <input className={inp} placeholder="https://vps.sungur.cicekanatechmedia.com:8001" value={vpsUrl} onChange={(e) => setVpsUrl(e.target.value)} />
      </div>
      <div>
        <label className="block font-body text-[11px] text-text-faint uppercase tracking-ultra mb-2">API Token</label>
        <div className="relative">
          <input type={showToken ? "text" : "password"} className={inp + " pr-12"} placeholder="Bearer ..." value={token} onChange={(e) => setToken(e.target.value)} />
          <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-white">
            {showToken ? "🙈" : "👁"}
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={testConnection} disabled={status === "testing"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[13px] font-bold transition-all border border-electric/40 text-electric hover:bg-electric/8 disabled:opacity-60">
          {status === "testing" ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Bağlantıyı Test Et
        </button>
        <button onClick={save} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-body text-[13px] font-bold text-white"
          style={{ background: "linear-gradient(135deg,#0EA5E9,#7C3AED)" }}>
          Kaydet
        </button>
      </div>

      {status !== "idle" && (
        <div className={`p-4 rounded-xl border ${status === "ok" ? "border-success/30 bg-success/8" : status === "fail" ? "border-error/30 bg-error/8" : "border-white/10"}`}>
          <p className="font-body text-[13px]" style={{ color: status === "ok" ? "#10B981" : status === "fail" ? "#EF4444" : "#94A3B8" }}>
            {status === "ok" ? "✓ VPS bağlantısı aktif" : status === "fail" ? "✗ Bağlantı kurulamadı" : "Test ediliyor..."}
          </p>
          {sysInfo && (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[{ l: "CPU", v: sysInfo.cpu }, { l: "RAM", v: sysInfo.ram }, { l: "Disk", v: sysInfo.disk }].map(({ l, v }) => v && (
                <div key={l} className="text-center"><p className="font-mono text-[14px] text-white">{v}</p><p className="font-body text-[10px] text-text-faint">{l}</p></div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Sungur Page ─────────────────────────────────────────────────────────
export default function SungurPage() {
  const [tab, setTab] = useState<TabId>("launcher");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [lastPing, setLastPing] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // Heartbeat every 30s
  useEffect(() => {
    const ping = async () => {
      try {
        const res = await fetch("/api/sungur/health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        setConnected(res.ok);
        setLastPing(new Date().toLocaleTimeString("tr-TR"));
      } catch { setConnected(false); }
    };
    ping();
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunched = (runId: string) => {
    setActiveRunId(runId);
    setTab("logs");
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "launcher",   label: "Agent Launcher",       icon: Play },
    { id: "logs",       label: "Live Logs",             icon: Terminal },
    { id: "campaigns",  label: "Email Kampanyaları",    icon: Mail },
    { id: "automation", label: "Servis Otomasyonu",     icon: Zap },
    { id: "config",     label: "VPS Yapılandırma",      icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <Toaster theme="dark" position="bottom-right" richColors />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#EF4444,#7C3AED)" }}>
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-white">Sungur AI Control Room</h1>
            <p className="font-body text-[13px] text-text-muted">CrewAI agent yönetimi & otomasyon merkezi</p>
          </div>
        </div>

        {/* VPS connection status */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border"
          style={{ borderColor: connected === true ? "rgba(16,185,129,0.3)" : connected === false ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.1)", background: connected === true ? "rgba(16,185,129,0.08)" : connected === false ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.02)" }}>
          {connected === null ? <Loader2 size={14} className="animate-spin text-text-faint" /> :
           connected ? <Wifi size={14} className="text-success" /> : <WifiOff size={14} className="text-error" />}
          <div>
            <p className="font-body text-[12px] font-semibold" style={{ color: connected === true ? "#10B981" : connected === false ? "#EF4444" : "#94A3B8" }}>
              {connected === null ? "Kontrol ediliyor..." : connected ? "VPS Bağlı" : "VPS Bağlantı Yok"}
            </p>
            {lastPing && <p className="font-body text-[10px] text-text-faint">Son ping: {lastPing}</p>}
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex flex-wrap gap-2 border-b border-white/8 pb-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-body text-[13px] font-semibold transition-all duration-200"
            style={{
              background: tab === t.id ? "linear-gradient(135deg,rgba(239,68,68,0.2),rgba(124,58,237,0.2))" : "rgba(255,255,255,0.03)",
              color: tab === t.id ? "white" : "#475569",
              border: `1px solid ${tab === t.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {tab === "launcher"   && <AgentLauncher onLaunched={handleLaunched} />}
          {tab === "logs"       && <LogViewer activeRunId={activeRunId} />}
          {tab === "campaigns"  && (
            <div className="text-center py-20 rounded-2xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <Mail size={36} className="text-text-faint mx-auto mb-4" />
              <p className="font-body text-text-muted">Email kampanya yönetimi yakında eklenecek.</p>
              <p className="font-body text-[13px] text-text-faint mt-2">Agent Launcher → Email Campaign Writer ile kampanya oluşturun.</p>
            </div>
          )}
          {tab === "automation" && (
            <div className="text-center py-20 rounded-2xl border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
              <Zap size={36} className="text-text-faint mx-auto mb-4" />
              <p className="font-body text-text-muted">Servis pazarlama otomasyonu yakında eklenecek.</p>
            </div>
          )}
          {tab === "config"     && <VPSConfig />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
