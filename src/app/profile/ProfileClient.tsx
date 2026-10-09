"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Package,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  LayoutGrid,
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Bell,
  Lock,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MailCheck,
  Eye,
  EyeOff,
  FolderGit2,
  BarChart3,
  LifeBuoy,
  Receipt,
  FileText,
  Users,
  Share2,
  Building2,
  Sparkles,
  Send,
  Download,
  Clock,
  MessageSquare,
  Globe,
  Layers,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  Palette,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import OrderDetailModal from "./OrderDetailModal";
import AddressModal from "./AddressModal";
import ProjectDetailModal from "./ProjectDetailModal";
import SupportTicketModal from "./SupportTicketModal";
import TeamInviteModal from "./TeamInviteModal";

interface Props {
  user: any;
  orders: any[];
  subscriptions?: any[];
  initialTab?: string;
}

export default function ProfileClient({
  user: initialUser,
  orders: initialOrders,
  subscriptions: initialSubscriptions = [],
  initialTab,
}: Props) {
  const { data: session, update: updateSession } = useSession();
  
  const resolveTab = (tab?: string) => {
    if (!tab) return "overview";
    if (tab === "support" || tab === "destek") return "support";
    if (tab === "subscriptions" || tab === "abonelikler") return "subscriptions";
    if (tab === "orders" || tab === "siparisler" || tab === "siparis") return "orders";
    return tab;
  };

  const [activeTab, setActiveTab] = useState(() => resolveTab(initialTab));

  // User state
  const [user, setUser] = useState(initialUser);

  // Data states
  const [orders, setOrders] = useState(initialOrders);
  const [subscriptions, setSubscriptions] = useState<any[]>(initialSubscriptions);
  const [cancellingSubId, setCancellingSubId] = useState<string | null>(null);
  const [subError, setSubError] = useState("");
  const [subSuccess, setSubSuccess] = useState("");

  // E-posta Doğrulama States
  const [verifyCode, setVerifyCode] = useState("");
  const [sendingVerifyCode, setSendingVerifyCode] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Loading states
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Form saving states
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Notification message states
  const [accountMsg, setAccountMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [companyMsg, setCompanyMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals & Selection
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any | null>(null);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Forms
  const [accountForm, setAccountForm] = useState({
    name: initialUser?.name || "",
    email: initialUser?.email || "",
    phone: initialUser?.phone || "",
  });

  const [companyForm, setCompanyForm] = useState({
    companyTitle: initialUser?.companyTitle || "",
    taxNumber: initialUser?.taxNumber || "",
    taxOffice: initialUser?.taxOffice || "",
    sector: initialUser?.sector || "",
    accountType: initialUser?.accountType || "individual",
    brandLogo: initialUser?.brandLogo || "",
    brandColor: initialUser?.brandColor || "#00B4D8",
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    projectUpdates: initialUser?.notificationPrefs?.projectUpdates ?? true,
    invoiceAlerts: initialUser?.notificationPrefs?.invoiceAlerts ?? true,
    reportAlerts: initialUser?.notificationPrefs?.reportAlerts ?? true,
    ticketReplies: initialUser?.notificationPrefs?.ticketReplies ?? true,
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Password Live Validation
  const pwChecks = {
    length: passwordForm.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(passwordForm.newPassword),
    lowercase: /[a-z]/.test(passwordForm.newPassword),
    number: /[0-9]/.test(passwordForm.newPassword),
  };
  const pwValidCount = Object.values(pwChecks).filter(Boolean).length;
  const isPasswordValid = pwValidCount === 4 && passwordForm.newPassword === passwordForm.confirmPassword;

  // Fetch initial portal data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t) {
        const resolved = resolveTab(t);
        if (resolved) setActiveTab(resolved);
      }
    }
    fetchAddresses();
    fetchOrders();
    fetchProjects();
    fetchReports();
    fetchTickets();
    fetchInvoices();
    fetchContracts();
    fetchActivities();
    fetchTeam();
  }, []);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetch("/api/profile/addresses");
      const data = await res.json();
      if (data.success) setAddresses(data.addresses || []);
    } catch (err) {
      console.error("Fetch addresses error:", err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/profile/orders");
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (err) {
      console.error("Fetch orders error:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const res = await fetch("/api/profile/projects");
      const data = await res.json();
      if (data.success) setProjects(data.projects || []);
    } catch (err) {
      console.error("Fetch projects error:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const res = await fetch("/api/profile/reports");
      const data = await res.json();
      if (data.success) setReports(data.reports || []);
    } catch (err) {
      console.error("Fetch reports error:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await fetch("/api/profile/support-tickets");
      const data = await res.json();
      if (data.success) setTickets(data.tickets || []);
    } catch (err) {
      console.error("Fetch tickets error:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetch("/api/profile/invoices");
      const data = await res.json();
      if (data.success) setInvoices(data.invoices || []);
    } catch (err) {
      console.error("Fetch invoices error:", err);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const fetchContracts = async () => {
    setLoadingContracts(true);
    try {
      const res = await fetch("/api/profile/contracts");
      const data = await res.json();
      if (data.success) setContracts(data.contracts || []);
    } catch (err) {
      console.error("Fetch contracts error:", err);
    } finally {
      setLoadingContracts(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/profile/activity");
      const data = await res.json();
      if (data.success) setActivities(data.activities || []);
    } catch (err) {
      console.error("Fetch activities error:", err);
    }
  };

  const fetchTeam = async () => {
    setLoadingTeam(true);
    try {
      const res = await fetch("/api/profile/team");
      const data = await res.json();
      if (data.success) setTeamMembers(data.teamMembers || []);
    } catch (err) {
      console.error("Fetch team error:", err);
    } finally {
      setLoadingTeam(false);
    }
  };

  // Form submit handlers
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setAccountMsg(null);

    try {
      const res = await fetch("/api/profile/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });

      const data = await res.json();
      setSavingAccount(false);

      if (!res.ok || !data.success) {
        setAccountMsg({ type: "error", text: data.error?.message || "Güncelleme başarısız." });
        return;
      }

      setUser((prev: any) => ({ ...prev, ...data.user }));
      updateSession();
      setAccountMsg({ type: "success", text: data.message || "Hesap bilgileriniz güncellendi." });
    } catch {
      setAccountMsg({ type: "error", text: "Bağlantı hatası. Lütfen tekrar deneyin." });
      setSavingAccount(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCompany(true);
    setCompanyMsg(null);

    try {
      const res = await fetch("/api/profile/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...companyForm, notificationPrefs }),
      });

      const data = await res.json();
      setSavingCompany(false);

      if (!res.ok || !data.success) {
        setCompanyMsg({ type: "error", text: data.error?.message || "Şirket bilgileri kaydedilemedi." });
        return;
      }

      setUser((prev: any) => ({ ...prev, ...data.user }));
      setCompanyMsg({ type: "success", text: data.message || "Şirket ve marka ayarlarınız kaydedildi." });
    } catch {
      setCompanyMsg({ type: "error", text: "Bağlantı hatası. Lütfen tekrar deneyin." });
      setSavingCompany(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setSavingPassword(true);
    setPasswordMsg(null);

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await res.json();
      setSavingPassword(false);

      if (!res.ok || !data.success) {
        setPasswordMsg({ type: "error", text: data.error?.message || "Şifre değiştirilemedi." });
        return;
      }

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMsg({ type: "success", text: data.message || "Şifreniz başarıyla değiştirildi." });
    } catch {
      setPasswordMsg({ type: "error", text: "Bağlantı hatası. Lütfen tekrar deneyin." });
      setSavingPassword(false);
    }
  };

  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingMessage(true);

    try {
      const res = await fetch(`/api/profile/support-tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });

      const data = await res.json();
      setSendingMessage(false);

      if (data.success && data.message) {
        setReplyMessage("");
        const updatedTicket = {
          ...selectedTicket,
          messages: [...(selectedTicket.messages || []), data.message],
        };
        setSelectedTicket(updatedTicket);
        setTickets((prev) => prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      }
    } catch (err) {
      console.error("Send reply error:", err);
      setSendingMessage(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Bu adresi silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/profile/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchAddresses();
    } catch (err) {
      console.error("Delete address error:", err);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/profile/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      const data = await res.json();
      if (data.success) fetchAddresses();
    } catch (err) {
      console.error("Set default address error:", err);
    }
  };

  const handleDeleteTeamMember = async (id: string) => {
    if (!confirm("Bu ekip üyesini çıkarmak istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/profile/team?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchTeam();
    } catch (err) {
      console.error("Delete team error:", err);
    }
  };

  const handleCancelSubscription = async (id: string) => {
    if (!window.confirm("Bu aboneliği dönem sonunda sonlandırmak istediğinize emin misiniz?")) return;
    setCancellingSubId(id);
    setSubError("");
    setSubSuccess("");
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubError(data.error || "Abonelik iptal edilemedi.");
      } else {
        setSubscriptions((items) =>
          items.map((item) => (item.id === id ? { ...item, cancelAtPeriodEnd: true } : item))
        );
        setSubSuccess("Aboneliğiniz mevcut dönem sonunda sonlandırılacak şekilde ayarlandı.");
      }
    } catch {
      setSubError("Bağlantı hatası oluştu. Lütfen tekrar deneyin.");
    } finally {
      setCancellingSubId(null);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!user?.email) return;
    setSendingVerifyCode(true);
    setVerifyMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      setSendingVerifyCode(false);
      if (data.success) {
        setCodeSent(true);
        setVerifyMsg({
          type: "success",
          text: data.message || "Doğrulama kodu e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.",
        });
      } else {
        setVerifyMsg({
          type: "error",
          text: data.error?.message || "Doğrulama kodu gönderilemedi.",
        });
      }
    } catch {
      setSendingVerifyCode(false);
      setVerifyMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    }
  };

  const handleConfirmVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !verifyCode.trim()) return;
    setVerifyingEmail(true);
    setVerifyMsg(null);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, code: verifyCode.trim() }),
      });
      const data = await res.json();
      setVerifyingEmail(false);
      if (data.success) {
        setUser((prev: any) => ({ ...prev, isEmailVerified: true, emailVerified: new Date() }));
        await updateSession();
        setVerifyMsg({
          type: "success",
          text: "Tebrikler! E-posta adresiniz başarıyla doğrulandı.",
        });
        setCodeSent(false);
        setVerifyCode("");
      } else {
        setVerifyMsg({
          type: "error",
          text: data.error?.message || "Geçersiz veya süresi dolmuş kod.",
        });
      }
    } catch {
      setVerifyingEmail(false);
      setVerifyMsg({ type: "error", text: "Bağlantı hatası oluştu." });
    }
  };

  // Grouped Menu Structure
  const menuGroups = [
    {
      title: "AJANS PORTALI",
      items: [
        { id: "overview", label: "Genel Bakış", icon: User },
        { id: "projects", label: "Projelerim & Hizmetlerim", icon: FolderGit2, badge: projects.length },
        { id: "reports", label: "Raporlar & Performans", icon: BarChart3, badge: reports.length },
        { id: "support", label: "Destek Merkezi", icon: LifeBuoy, badge: tickets.filter((t) => t.status === "open").length },
        { id: "invoices", label: "Faturalar & Ödemeler", icon: Receipt, badge: invoices.filter((i) => i.status === "pending" || i.status === "overdue").length },
        { id: "contracts", label: "Sözleşmelerim & Belgelerim", icon: FileText, badge: contracts.filter((c) => c.status === "sent").length },
      ],
    },
    {
      title: "HESAP & AYARLAR",
      items: [
        { id: "orders", label: "Siparişlerim", icon: Package, badge: orders.length },
        { id: "subscriptions", label: "Aboneliklerim", icon: CreditCard, badge: subscriptions.filter((s) => s.status === "ACTIVE").length || undefined },
        { id: "addresses", label: "Adres Defterim", icon: MapPin, badge: addresses.length },
        { id: "company", label: "Şirket & Marka Bilgileri", icon: Building2 },
        { id: "team", label: "Ekip Üyeleri", icon: Users, badge: teamMembers.length },
        { id: "integrations", label: "Entegrasyonlarım & Bağlı Hesaplar", icon: Share2 },
        { id: "settings", label: "Hesap Bilgileri & Doğrulama", icon: Settings },
        { id: "security", label: "Şifre & Güvenlik", icon: Lock },
      ],
    },
  ];

  const userInitials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  const isEmailVerified = Boolean(user?.isEmailVerified || user?.emailVerified);

  // Financial KPI calculations
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalPending = invoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const totalOverdue = invoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const hasUnsignedContract = contracts.some((c) => c.status === "sent");

  const serviceTypeLabels: Record<string, string> = {
    web_development: "Web Geliştirme",
    ecommerce: "E-Ticaret",
    social_media: "Sosyal Medya",
    advertising: "Dijital Reklam",
    consulting: "Danışmanlık",
    call_center_ai: "Call Center AI",
  };

  const projectStatusBadges: Record<string, { label: string; bg: string; text: string }> = {
    planning: { label: "Planlama", bg: "bg-gray-100", text: "text-gray-700" },
    development: { label: "Geliştirme", bg: "bg-blue-50", text: "text-blue-700" },
    testing: { label: "Test", bg: "bg-amber-50", text: "text-amber-700" },
    live: { label: "Yayında", bg: "bg-emerald-50", text: "text-emerald-700" },
    on_hold: { label: "Beklemede", bg: "bg-orange-50", text: "text-orange-700" },
    completed: { label: "Tamamlandı", bg: "bg-purple-50", text: "text-purple-700" },
  };

  const ORDER_STATUS_MAP: Record<
    string,
    { label: string; bg: string; text: string; border: string }
  > = {
    PENDING: { label: "Ödeme Bekliyor", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    CONFIRMED: { label: "Onaylandı", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    PROCESSING: { label: "Hazırlanıyor", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    SHIPPED: { label: "Kargoya Verildi", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
    DELIVERED: { label: "Teslim Edildi", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    CANCELLED: { label: "İptal Edildi", bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };

  const ticketStatusLabels: Record<string, string> = {
    open: "Açık",
    in_progress: "İşlemde",
    resolved: "Çözüldü",
    closed: "Kapatıldı",
  };

  const ticketPriorityLabels: Record<string, string> = {
    low: "Düşük",
    normal: "Normal",
    high: "Yüksek",
    urgent: "Acil",
  };

  return (
    <main className="min-h-screen bg-corp-surface">
      <Header />

      <div className="pt-28 sm:pt-32 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        {/* Mobile Header & Horizontal Navigation Bar (lg:hidden) */}
        <div className="lg:hidden w-full space-y-3 mb-6">
          {/* User Brief Bar */}
          <div className="bg-white rounded-2xl border border-corp-border p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-corp-teal/10 text-corp-teal flex items-center justify-center font-bold text-sm border border-corp-teal/20 shrink-0 relative shadow-inner">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full rounded-xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Profil";
                      }}
                    />
                  ) : (
                    userInitials
                  )}
                  {isEmailVerified && (
                    <span
                      className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center border border-white"
                      title="Doğrulanmış Hesap"
                    >
                      <CheckCircle2 size={10} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display font-bold text-sm text-corp-charcoal truncate">
                    {user?.companyTitle || user?.name || "Kullanıcı"}
                  </h2>
                  <p className="text-[11px] text-corp-gray truncate">{user?.email}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        isEmailVerified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isEmailVerified ? "Doğrulandı" : "Doğrulanmadı"}
                    </span>
                    {user?.accountType === "corporate" && (
                      <span className="px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 text-[9px] font-bold uppercase border border-blue-200">
                        Kurumsal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* All Menu Trigger */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="min-h-[44px] px-3 py-2 rounded-xl bg-corp-surface border border-corp-border hover:border-corp-teal hover:text-corp-teal text-corp-charcoal font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                aria-label="Tüm menüyü aç"
              >
                <LayoutGrid size={15} className="text-corp-teal" />
                <span>Menü</span>
              </button>
            </div>
          </div>

          {/* Touch-Friendly Horizontal Scrollable Tab Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {menuGroups.flatMap((g) => g.items).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (typeof window !== "undefined") {
                      window.history.replaceState(null, "", `/profile?tab=${item.id}`);
                    }
                  }}
                  className={`min-h-[44px] whitespace-nowrap flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                    isActive
                      ? "bg-corp-teal text-white shadow-md shadow-corp-teal/20 font-bold"
                      : "bg-white text-corp-charcoal border border-corp-border hover:bg-gray-50 hover:text-corp-teal"
                  }`}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? "bg-white text-corp-teal" : "bg-corp-teal/10 text-corp-teal"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sticky Sidebar (hidden on mobile) */}
          <aside className="hidden lg:block lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-3xl border border-corp-border shadow-sm overflow-hidden sticky top-32">
              <div className="p-6 text-center border-b border-corp-border bg-gradient-to-b from-corp-teal/5 to-white">
                <div className="w-20 h-20 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center text-2xl font-bold mx-auto mb-3 border-2 border-corp-teal/20 relative shadow-inner">
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user.name}
                      className="w-full h-full rounded-2xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=Profil";
                      }}
                    />
                  ) : (
                    userInitials
                  )}
                  {isEmailVerified && (
                    <span
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow"
                      title="Doğrulanmış Hesap"
                    >
                      <CheckCircle2 size={13} />
                    </span>
                  )}
                </div>
                <h2 className="font-display text-lg font-bold text-corp-charcoal">{user?.companyTitle || user?.name || "Kullanıcı"}</h2>
                <p className="font-body text-xs text-corp-gray mt-0.5">{user?.email}</p>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      isEmailVerified
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    {isEmailVerified ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                    {isEmailVerified ? "Doğrulanmış" : "E-posta Doğrulanmadı"}
                  </span>
                  {user?.accountType === "corporate" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                      <Building2 size={11} /> Kurumsal
                    </span>
                  )}
                  {user?.role === "SUPER_ADMIN" && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[10px] font-bold uppercase tracking-wider border border-purple-100 hover:bg-purple-100 transition-colors"
                    >
                      <ShieldCheck size={11} /> Admin
                    </Link>
                  )}
                </div>
              </div>

              <nav className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
                {menuGroups.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    <p className="px-4 text-[10px] font-bold text-corp-gray uppercase tracking-widest mb-2">{group.title}</p>
                    <ul className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;

                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => {
                                setActiveTab(item.id);
                                if (typeof window !== "undefined") {
                                  window.history.replaceState(null, "", `/profile?tab=${item.id}`);
                                }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-body text-xs font-semibold transition-all ${
                                isActive
                                  ? "bg-corp-teal text-white shadow-md shadow-corp-teal/20"
                                  : "text-corp-charcoal hover:bg-corp-teal-50 hover:text-corp-teal"
                              }`}
                            >
                              <Icon size={16} />
                              <span className="truncate">{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span
                                  className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isActive ? "bg-white text-corp-teal" : "bg-corp-teal/10 text-corp-teal"
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight
                                size={14}
                                className={`ml-auto ${isActive ? "opacity-100" : "opacity-0"}`}
                              />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <div className="pt-4 border-t border-corp-border">
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-body text-xs font-semibold text-error hover:bg-error/5 transition-all"
                  >
                    <LogOut size={16} />
                    Çıkış Yap
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Warning Banner if Email Not Verified */}
                  {!isEmailVerified && (
                    <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-xs font-bold text-amber-900">E-posta Adresiniz Henüz Doğrulanmadı</p>
                          <p className="text-[11px] text-amber-700">Hesap güvenliğiniz ve fatura/sipariş bildirimleriniz için e-postanızı doğrulayabilirsiniz.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab("settings");
                          if (typeof window !== "undefined") {
                            window.history.replaceState(null, "", "/profile?tab=settings");
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-corp-teal hover:bg-corp-teal-600 text-white font-bold text-xs transition-colors whitespace-nowrap cursor-pointer shadow-sm"
                      >
                        Hemen Doğrula →
                      </button>
                    </div>
                  )}

                  {/* Warning Banner if Unsigned Contract */}
                  {hasUnsignedContract && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-xs font-bold text-amber-900">İmzalanmayı Bekleyen Sözleşmeniz Bulunuyor</p>
                          <p className="text-[11px] text-amber-700">Lütfen Sözleşmelerim sekmesinden belgenizi inceleyip onaylayınız.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab("contracts")}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors"
                      >
                        Sözleşmelere Git →
                      </button>
                    </div>
                  )}

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm flex items-center gap-4 hover:border-corp-teal transition-all">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FolderGit2 size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-corp-charcoal">{projects.length}</p>
                        <p className="text-xs text-corp-gray font-medium">Aktif Proje / Hizmet</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm flex items-center gap-4 hover:border-corp-teal transition-all">
                      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <LifeBuoy size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-corp-charcoal">
                          {tickets.filter((t) => t.status === "open" || t.status === "in_progress").length}
                        </p>
                        <p className="text-xs text-corp-gray font-medium">Açık Destek Talebi</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm flex items-center gap-4 hover:border-corp-teal transition-all">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Receipt size={24} />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-corp-charcoal">₺{totalPending.toLocaleString("tr-TR")}</p>
                        <p className="text-xs text-corp-gray font-medium">Bekleyen Ödeme</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm flex items-center gap-4 hover:border-corp-teal transition-all">
                      <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                        <BarChart3 size={24} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-corp-charcoal">{reports.length}</p>
                        <p className="text-xs text-corp-gray font-medium">Yayınlanan Rapor</p>
                      </div>
                    </div>
                  </div>

                  {/* Account Manager Card */}
                  <div className="bg-gradient-to-r from-corp-charcoal to-gray-900 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-corp-teal/10 blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-corp-teal text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-corp-teal/30">
                        <Building2 size={32} />
                      </div>
                      <div>
                        <span className="px-2.5 py-0.5 rounded-full bg-corp-teal/20 text-corp-teal text-[10px] font-bold uppercase tracking-widest border border-corp-teal/30">
                          Çiçekana B2B Müşteri Portalı
                        </span>
                        <h3 className="font-display text-xl font-bold mt-1">
                          {user?.companyTitle ? `${user.companyTitle} Paneli` : `Hoş Geldiniz, ${user?.name}`}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          Dijital projeleriniz, performans raporlarınız ve destek talepleriniz tek bir merkezde.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                      <button
                        onClick={() => setSupportModalOpen(true)}
                        className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-corp-teal hover:bg-corp-teal-600 text-white font-bold text-xs transition-colors shadow-lg shadow-corp-teal/20 flex items-center justify-center gap-2"
                      >
                        <LifeBuoy size={16} /> Destek Talebi Aç
                      </button>
                      <a
                        href="https://wa.me/905303412156?text=Merhaba,%20danışmanlık%20hizmetleri%20hakkında%20bilgi%20almak%20istiyorum."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors border border-white/10 flex items-center justify-center gap-2"
                      >
                        <MessageSquare size={16} /> Temsilciye Yaz
                      </a>
                    </div>
                  </div>

                  {/* Two Column Grid: Active Projects & Recent Activities */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Active Projects List */}
                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
                      <div className="flex justify-between items-center mb-6 pb-3 border-b border-corp-border">
                        <h4 className="font-display font-bold text-corp-charcoal text-base flex items-center gap-2">
                          <FolderGit2 size={18} className="text-corp-teal" /> Aktif Projelerim
                        </h4>
                        <button
                          onClick={() => setActiveTab("projects")}
                          className="text-xs font-bold text-corp-teal hover:underline flex items-center gap-1"
                        >
                          Tümünü Gör <ChevronRight size={14} />
                        </button>
                      </div>

                      {projects.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-xs text-corp-gray mb-3">Henüz tanımlanmış aktif bir projeniz bulunmuyor.</p>
                          <a
                            href="https://wa.me/905303412156?text=Merhaba,%20yeni%20proje%20hakkında%20görüşmek%20istiyorum."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-4 py-2 rounded-xl bg-corp-teal text-white font-bold text-xs shadow-md shadow-corp-teal/20"
                          >
                            Yeni Proje Talebi Başlat →
                          </a>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {projects.slice(0, 3).map((p) => {
                            const badge = projectStatusBadges[p.status] || { label: p.status, bg: "bg-gray-100", text: "text-gray-700" };

                            return (
                              <div
                                key={p.id}
                                onClick={() => setSelectedProject(p)}
                                className="p-4 rounded-xl border border-corp-border hover:border-corp-teal hover:bg-corp-teal/5 transition-all cursor-pointer group"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold text-corp-teal uppercase tracking-widest">
                                    {serviceTypeLabels[p.serviceType] || p.serviceType}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                <h5 className="font-display font-bold text-corp-charcoal text-sm group-hover:text-corp-teal transition-colors">
                                  {p.title}
                                </h5>

                                <div className="mt-3 flex items-center gap-3">
                                  <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-corp-teal rounded-full"
                                      style={{ width: `${p.progressPercent || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-corp-charcoal">{p.progressPercent || 0}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Activity Stream */}
                    <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
                      <div className="flex justify-between items-center mb-6 pb-3 border-b border-corp-border">
                        <h4 className="font-display font-bold text-corp-charcoal text-base flex items-center gap-2">
                          <Clock size={18} className="text-corp-teal" /> Son Olaylar & Akış
                        </h4>
                        <span className="text-xs text-corp-gray font-medium">{activities.length} Güncelleme</span>
                      </div>

                      {activities.length === 0 ? (
                        <p className="text-xs text-corp-gray italic text-center py-8">Henüz kaydedilmiş bir aktivite yok.</p>
                      ) : (
                        <div className="space-y-4">
                          {activities.slice(0, 5).map((act) => (
                            <div key={act.id} className="flex items-start gap-3 text-xs">
                              <div className="w-8 h-8 rounded-full bg-corp-surface border border-corp-border flex items-center justify-center text-corp-teal flex-shrink-0 mt-0.5">
                                <Sparkles size={14} />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-corp-charcoal">{act.title}</p>
                                {act.description && <p className="text-corp-gray text-[11px] mt-0.5">{act.description}</p>}
                                <span className="text-[10px] text-corp-gray mt-1 block font-mono">
                                  {new Date(act.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: PROJECTS & SERVICES */}
              {activeTab === "projects" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-corp-border">
                    <div>
                      <h3 className="font-display text-xl font-bold text-corp-charcoal">Projelerim & Hizmetlerim</h3>
                      <p className="text-xs text-corp-gray mt-0.5">Aktif web, reklam, sosyal medya ve AI abonelik projelerinizin durumunu takip edin.</p>
                    </div>
                    <a
                      href="https://wa.me/905303412156?text=Merhaba,%20yeni%20bir%20hizmet%20almak%20istiyorum."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20 flex items-center gap-1.5"
                    >
                      <Plus size={16} /> Yeni Hizmet Talebi
                    </a>
                  </div>

                  {loadingProjects ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Projeleriniz yükleniyor...</p>
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="py-16 text-center">
                      <FolderGit2 size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Henüz Aktif Bir Projeniz Bulunmuyor</h4>
                      <p className="text-corp-gray font-body text-xs mb-6 max-w-md mx-auto">
                        Web geliştirme, e-ticaret altyapısı, reklam yönetimi veya Microsoft Call Center AI çözümlerimizden yararlanmak için ekibimizle iletişime geçin.
                      </p>
                      <a
                        href="https://wa.me/905303412156?text=Merhaba,%20hizmetleriniz%20hakkında%20bilgi%20almak%20istiyorum."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20"
                      >
                        Hizmet Paketlerini Keşfet →
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {projects.map((proj) => {
                        const badge = projectStatusBadges[proj.status] || { label: proj.status, bg: "bg-gray-100", text: "text-gray-700" };

                        return (
                          <div
                            key={proj.id}
                            className="p-6 rounded-2xl border border-corp-border bg-white hover:border-corp-teal hover:shadow-lg transition-all flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-3">
                                <span className="px-3 py-1 rounded-full bg-corp-teal-50 text-corp-teal text-[10px] font-bold uppercase tracking-wider">
                                  {serviceTypeLabels[proj.serviceType] || proj.serviceType}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                                  {badge.label}
                                </span>
                              </div>

                              <h4 className="font-display font-bold text-corp-charcoal text-lg mb-2">{proj.title}</h4>

                              {proj.isSubscription && (
                                <div className="mb-4 p-3 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold flex justify-between items-center border border-purple-100">
                                  <span>Abonelik Paketi: {proj.subscriptionTier || "Pro"}</span>
                                  <span className="text-[10px] uppercase font-bold text-purple-600">Aktif</span>
                                </div>
                              )}

                              {/* Progress bar */}
                              <div className="mt-4 space-y-1.5">
                                <div className="flex justify-between text-xs font-bold">
                                  <span className="text-corp-gray">Tamamlanma Oranı</span>
                                  <span className="text-corp-teal">{proj.progressPercent || 0}%</span>
                                </div>
                                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-corp-teal to-emerald-500 rounded-full transition-all"
                                    style={{ width: `${proj.progressPercent || 0}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-corp-border flex items-center justify-between">
                              <span className="text-[11px] text-corp-gray font-medium">
                                {proj.milestones?.length || 0} Adım • {proj.deliverables?.length || 0} Dosya
                              </span>
                              <button
                                onClick={() => setSelectedProject(proj)}
                                className="px-4 py-2 rounded-xl bg-corp-surface hover:bg-corp-teal hover:text-white font-bold text-xs text-corp-charcoal transition-colors border border-corp-border flex items-center gap-1"
                              >
                                Detaylar & Aşama Kontrolü <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REPORTS & PERFORMANCE */}
              {activeTab === "reports" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-8">
                  <div className="pb-6 border-b border-corp-border">
                    <h3 className="font-display text-xl font-bold text-corp-charcoal">Raporlar & Performans Analizi</h3>
                    <p className="text-xs text-corp-gray mt-0.5">Ajans ekibimiz tarafından hazırlanan dijital pazarlama, SEO ve reklam performans raporları.</p>
                  </div>

                  {loadingReports ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Raporlar yükleniyor...</p>
                    </div>
                  ) : reports.length === 0 ? (
                    <div className="py-16 text-center">
                      <BarChart3 size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Henüz Yayınlanmış Bir Raporunuz Yok</h4>
                      <p className="text-corp-gray font-body text-xs mb-6 max-w-md mx-auto">
                        Aylık performans, SEO ve sosyal medya analiz raporlarınız dönem sonunda panelinize yüklenecektir.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {reports.map((rep) => {
                        const summary = rep.summaryJson as any;

                        return (
                          <div key={rep.id} className="p-6 rounded-2xl border border-corp-border bg-white shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-corp-border">
                              <div>
                                <span className="px-2.5 py-0.5 rounded-full bg-corp-teal-50 text-corp-teal text-[10px] font-bold uppercase tracking-wider">
                                  Dönem: {new Date(rep.periodStart).toLocaleDateString("tr-TR")} – {new Date(rep.periodEnd).toLocaleDateString("tr-TR")}
                                </span>
                                <h4 className="font-display font-bold text-corp-charcoal text-lg mt-1">{rep.title}</h4>
                              </div>

                              {rep.pdfUrl && (
                                <a
                                  href={rep.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-md shadow-corp-teal/20 flex items-center gap-2"
                                >
                                  <Download size={15} /> PDF Raporu İndir
                                </a>
                              )}
                            </div>

                            {/* Summary Charts if data present */}
                            {summary?.visits && summary?.visits.length > 0 && (
                              <div className="bg-corp-surface p-6 rounded-2xl border border-corp-border">
                                <h5 className="font-display font-bold text-corp-charcoal text-sm mb-4">Ziyaretçi & Trafik Analizi</h5>
                                <div className="h-64 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={summary.visits}>
                                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                      <XAxis dataKey="date" stroke="#6B7280" fontSize={11} />
                                      <YAxis stroke="#6B7280" fontSize={11} />
                                      <Tooltip />
                                      <Line type="monotone" dataKey="count" stroke="#00B4D8" strokeWidth={3} name="Ziyaretçi" />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SUPPORT CENTER */}
              {activeTab === "support" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-corp-border">
                    <div>
                      <h3 className="font-display text-xl font-bold text-corp-charcoal">Destek Merkezi</h3>
                      <p className="text-xs text-corp-gray mt-0.5">Teknik sorunlar, revize talepleri veya sorularınız için ajanstan destek talep edin.</p>
                    </div>
                    <button
                      onClick={() => setSupportModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20 flex items-center gap-2"
                    >
                      <Plus size={16} /> Yeni Destek Talebi
                    </button>
                  </div>

                  {loadingTickets ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Destek talepleri yükleniyor...</p>
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="py-16 text-center">
                      <LifeBuoy size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Açık Bir Destek Talebiniz Yok</h4>
                      <p className="text-corp-gray font-body text-xs mb-6 max-w-md mx-auto">
                        Herhangi bir teknik konuda yardım almak veya talep iletmek için yeni talep oluşturun.
                      </p>
                      <button
                        onClick={() => setSupportModalOpen(true)}
                        className="px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors"
                      >
                        İlk Talebinizi Oluşturun →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Ticket List Column */}
                      <div className="space-y-3">
                        {tickets.map((t) => {
                          const isSelected = selectedTicket?.id === t.id;
                          const statusColors: Record<string, string> = {
                            open: "bg-blue-50 text-blue-700 border-blue-200",
                            in_progress: "bg-amber-50 text-amber-700 border-amber-200",
                            resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                            closed: "bg-gray-100 text-gray-700 border-gray-200",
                          };

                          return (
                            <div
                              key={t.id}
                              onClick={() => setSelectedTicket(t)}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-corp-teal bg-corp-teal/5 shadow-md shadow-corp-teal/10"
                                  : "border-corp-border bg-white hover:border-corp-gray"
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusColors[t.status] || "bg-gray-100"}`}>
                                  {ticketStatusLabels[t.status] || t.status}
                                </span>
                                <span className="text-[10px] text-corp-gray font-mono">
                                  #{t.id.slice(-6)}
                                </span>
                              </div>
                              <h5 className="font-display font-bold text-corp-charcoal text-sm truncate mt-1">{t.subject}</h5>
                              <p className="text-[11px] text-corp-gray mt-1">
                                {t.messages?.length || 0} Mesaj • Son: {new Date(t.updatedAt).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Ticket Messages Pane */}
                      <div className="lg:col-span-2 bg-corp-surface rounded-2xl border border-corp-border p-6 flex flex-col justify-between min-h-[400px]">
                        {!selectedTicket ? (
                          <div className="m-auto text-center py-12">
                            <MessageSquare size={36} className="mx-auto text-corp-gray mb-2" />
                            <p className="text-xs text-corp-gray">Mesaj geçmişini görüntülemek için soldan bir talep seçiniz.</p>
                          </div>
                        ) : (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="pb-4 border-b border-corp-border flex justify-between items-start">
                                <div>
                                  <h4 className="font-display font-bold text-corp-charcoal text-base">{selectedTicket.subject}</h4>
                                  <p className="text-[11px] text-corp-gray">
                                    Öncelik: <span className="font-bold text-corp-teal">{ticketPriorityLabels[selectedTicket.priority] || selectedTicket.priority}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Message Feed */}
                              <div className="py-4 space-y-4 max-h-[350px] overflow-y-auto pr-2">
                                {selectedTicket.messages?.map((msg: any) => {
                                  const isClient = msg.senderType === "client";

                                  return (
                                    <div key={msg.id} className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}>
                                      <span className="text-[10px] text-corp-gray mb-1 font-semibold">
                                        {msg.senderName} ({isClient ? "Siz" : "Ajans Destek"})
                                      </span>
                                      <div
                                        className={`p-4 rounded-2xl text-xs max-w-md ${
                                          isClient
                                            ? "bg-corp-teal text-white rounded-tr-none shadow-md shadow-corp-teal/20"
                                            : "bg-white text-corp-charcoal rounded-tl-none border border-corp-border shadow-sm"
                                        }`}
                                      >
                                        <p className="whitespace-pre-wrap">{msg.message}</p>
                                      </div>
                                      <span className="text-[9px] text-corp-gray mt-1 font-mono">
                                        {new Date(msg.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Reply Input Box */}
                            <form onSubmit={handleSendTicketReply} className="pt-4 border-t border-corp-border flex gap-2">
                              <input
                                type="text"
                                required
                                placeholder="Yanıtınızı yazın..."
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-xs bg-white"
                              />
                              <button
                                type="submit"
                                disabled={sendingMessage}
                                className="px-5 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                              >
                                {sendingMessage ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                Gönder
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: INVOICES & PAYMENTS */}
              {activeTab === "invoices" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="pb-6 border-b border-corp-border flex justify-between items-center">
                    <div>
                      <h3 className="font-display text-xl font-bold text-corp-charcoal">Faturalar & Ödemeler</h3>
                      <p className="text-xs text-corp-gray mt-0.5">Kurumsal hizmet faturalarınız ve ödeme geçmişiniz.</p>
                    </div>
                  </div>

                  {/* Summary KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Toplam Ödenen</p>
                      <p className="text-2xl font-bold text-emerald-900 mt-1">₺{totalPaid.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">Bekleyen Ödeme</p>
                      <p className="text-2xl font-bold text-amber-900 mt-1">₺{totalPending.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="p-5 rounded-2xl bg-error/10 border border-error/20">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-error">Gecikmiş Tutar</p>
                      <p className="text-2xl font-bold text-error mt-1">₺{totalOverdue.toLocaleString("tr-TR")}</p>
                    </div>
                  </div>

                  {loadingInvoices ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Faturalarınız yükleniyor...</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="py-16 text-center">
                      <Receipt size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Henüz Bir Faturanız Yok</h4>
                      <p className="text-corp-gray font-body text-xs">Kesilen faturalarınız bu alanda listelenecektir.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-corp-border bg-corp-surface text-corp-gray font-bold uppercase tracking-wider">
                            <th className="p-4">Fatura No</th>
                            <th className="p-4">Düzenlenme Tarihi</th>
                            <th className="p-4">Son Ödeme</th>
                            <th className="p-4">Tutar</th>
                            <th className="p-4">Durum</th>
                            <th className="p-4 text-right">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-corp-border">
                          {invoices.map((inv) => {
                            const statusBadges: Record<string, { label: string; bg: string }> = {
                              paid: { label: "Ödendi", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                              pending: { label: "Bekliyor", bg: "bg-amber-50 text-amber-700 border-amber-200" },
                              overdue: { label: "Gecikmiş", bg: "bg-error/10 text-error border-error/20" },
                            };
                            const st = statusBadges[inv.status] || { label: inv.status, bg: "bg-gray-100 text-gray-700" };

                            return (
                              <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-bold text-corp-charcoal">{inv.invoiceNumber}</td>
                                <td className="p-4 text-corp-gray">{new Date(inv.issueDate).toLocaleDateString("tr-TR")}</td>
                                <td className="p-4 text-corp-gray">{new Date(inv.dueDate).toLocaleDateString("tr-TR")}</td>
                                <td className="p-4 font-bold text-corp-charcoal">₺{Number(inv.amount).toLocaleString("tr-TR")}</td>
                                <td className="p-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${st.bg}`}>
                                    {st.label}
                                  </span>
                                </td>
                                <td className="p-4 text-right">
                                  {inv.pdfUrl ? (
                                    <a
                                      href={inv.pdfUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-corp-teal-50 text-corp-teal font-bold hover:bg-corp-teal hover:text-white transition-colors"
                                    >
                                      <Download size={14} /> PDF
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-corp-gray italic">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: CONTRACTS */}
              {activeTab === "contracts" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="pb-6 border-b border-corp-border">
                    <h3 className="font-display text-xl font-bold text-corp-charcoal">Sözleşmelerim & Belgelerim</h3>
                    <p className="text-xs text-corp-gray mt-0.5">Ajansımız ile imzaladığınız veya onay bekleyen resmi sözleşmeler.</p>
                  </div>

                  {loadingContracts ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Sözleşmeleriniz yükleniyor...</p>
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="py-16 text-center">
                      <FileText size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Kayıtlı Bir Sözleşmeniz Bulunmuyor</h4>
                      <p className="text-corp-gray font-body text-xs">Aktif sözleşmeleriniz ve teklif dokümanlarınız burada gösterilecektir.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {contracts.map((c) => {
                        const statusBadges: Record<string, { label: string; bg: string }> = {
                          draft: { label: "Taslak", bg: "bg-gray-100 text-gray-700" },
                          sent: { label: "İmza Bekliyor", bg: "bg-amber-50 text-amber-700 border-amber-200" },
                          signed: { label: "İmzalandı / Aktif", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                        };
                        const st = statusBadges[c.status] || { label: c.status, bg: "bg-gray-100" };

                        return (
                          <div key={c.id} className="p-6 rounded-2xl border border-corp-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <FileText size={24} />
                              </div>
                              <div>
                                <h4 className="font-display font-bold text-corp-charcoal text-base">{c.title}</h4>
                                <p className="text-xs text-corp-gray mt-0.5">
                                  Oluşturulma: {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                                  {c.signedAt && ` • İmzalanma: ${new Date(c.signedAt).toLocaleDateString("tr-TR")}`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${st.bg}`}>
                                {st.label}
                              </span>
                              <a
                                href={c.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors flex items-center gap-1.5"
                              >
                                Görüntüle / İndir <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: ORDERS */}
              {activeTab === "orders" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-corp-border flex justify-between items-center">
                    <div>
                      <h3 className="font-display text-lg font-bold text-corp-charcoal">Sipariş Geçmişi</h3>
                      <p className="text-xs text-corp-gray mt-0.5">Mağazamızdan aldığınız ürün siparişlerini takip edin.</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-corp-teal-50 text-corp-teal text-xs font-bold">
                      {orders.length} Sipariş
                    </span>
                  </div>

                  {loadingOrders ? (
                    <div className="p-12 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray font-medium">Sipariş geçmişiniz yükleniyor...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="p-16 text-center">
                      <Package size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Henüz Bir Siparişiniz Yok</h4>
                      <p className="text-corp-gray font-body text-xs mb-6">Mağazamızdaki yenilikçi ürün ve çözümleri keşfedin.</p>
                      <Link
                        href="/magaza"
                        className="inline-block px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20"
                      >
                        Mağazaya Git ve Alışverişe Başla →
                      </Link>
                    </div>
                  ) : (
                    <div className="divide-y divide-corp-border">
                      {orders.map((order) => {
                        const st = ORDER_STATUS_MAP[order.status] || {
                          label: order.status,
                          bg: "bg-gray-100",
                          text: "text-gray-700",
                          border: "border-gray-200",
                        };

                        return (
                          <div
                            key={order.id}
                            className="p-4 sm:p-6 hover:bg-gray-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="flex items-start sm:items-center gap-3.5">
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-corp-teal/10 border border-corp-teal/20 flex items-center justify-center text-corp-teal flex-shrink-0 mt-0.5 sm:mt-0">
                                <Package size={22} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-body font-bold text-corp-charcoal text-sm">
                                    Sipariş #{order.orderNumber}
                                  </p>
                                  {/* Mobile Status Badge inline */}
                                  <span
                                    className={`md:hidden px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${st.bg} ${st.text} ${st.border}`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                                <p className="text-xs text-corp-gray mt-0.5">
                                  {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                                {order.items && order.items.length > 0 && (
                                  <p className="text-[11px] text-corp-gray font-medium mt-1 truncate">
                                    {order.items.length} Kalem Ürün ({order.items[0]?.product?.name || "Ürün"}
                                    {order.items.length > 1 ? ` ve ${order.items.length - 1} diğer` : ""})
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-3 sm:gap-6 pt-3 md:pt-0 border-t border-gray-100 md:border-none">
                              {/* Desktop Status Badge */}
                              <div className="hidden md:block text-right">
                                <p className="text-[10px] text-corp-gray font-bold uppercase tracking-wider mb-1">Durum</p>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${st.bg} ${st.text} ${st.border}`}
                                >
                                  {st.label}
                                </span>
                              </div>

                              <div className="text-left md:text-right">
                                <p className="text-[10px] text-corp-gray font-bold uppercase tracking-wider mb-0.5">Toplam</p>
                                <p className="font-body font-bold text-corp-charcoal text-base sm:text-lg">
                                  ₺{order.finalAmount?.toLocaleString("tr-TR")}
                                </p>
                              </div>

                              <button
                                onClick={() => setSelectedOrder(order)}
                                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-corp-border bg-white text-corp-charcoal hover:border-corp-teal hover:text-corp-teal hover:bg-corp-teal-50 font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                              >
                                <span>Detay Gör</span>
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: SUBSCRIPTIONS (ABONELİKLERİM) */}
              {activeTab === "subscriptions" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-corp-border">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-corp-teal/10 text-corp-teal flex items-center justify-center flex-shrink-0">
                        <CreditCard size={24} />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold text-corp-charcoal">Aboneliklerim & Dijital Paketler</h3>
                        <p className="text-xs text-corp-gray mt-0.5">Yapay zeka asistanları, otomasyon sistemleri ve ajans paketlerinizin periyodik abonelik durumu.</p>
                      </div>
                    </div>
                    <Link
                      href="/services/ai-automation"
                      className="px-4 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Sparkles size={14} /> Yeni Paket İncele →
                    </Link>
                  </div>

                  {subError && (
                    <div className="p-4 rounded-xl bg-error/10 border border-error/25 text-error text-xs font-semibold">
                      {subError}
                    </div>
                  )}

                  {subSuccess && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                      {subSuccess}
                    </div>
                  )}

                  {subscriptions.length === 0 ? (
                    <div className="p-16 text-center">
                      <CreditCard size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">
                        Henüz Aktif Bir Aboneliğiniz Bulunmuyor
                      </h4>
                      <p className="text-corp-gray font-body text-xs mb-6 max-w-md mx-auto">
                        Çiçekana Yapay Zeka Otomasyon ve Kurumsal Dijital Çözüm paketleriyle iş süreçlerinizi 7/24 kesintisiz otomatikleştirin.
                      </p>
                      <Link
                        href="/services/ai-automation"
                        className="inline-block px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20"
                      >
                        Abonelik Paketlerini Keşfet →
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {subscriptions.map((sub: any) => {
                        const statusBadges: Record<string, { label: string; bg: string; text: string; border: string }> = {
                          ACTIVE: { label: "Aktif", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
                          PENDING: { label: "Ödeme Bekliyor", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
                          CANCELLED: { label: "İptal Edildi", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
                          EXPIRED: { label: "Süresi Doldu", bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" },
                          FAILED: { label: "Başarısız", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
                        };
                        const badge = statusBadges[sub.status] || statusBadges.EXPIRED;
                        const formattedPrice = (sub.priceAtPurchase / 100).toLocaleString("tr-TR");
                        const periodEndFormatted = sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
                          : "Belirtilmedi";

                        return (
                          <div
                            key={sub.id}
                            className="p-6 rounded-2xl border border-corp-border bg-white shadow-sm flex flex-col justify-between hover:border-corp-teal/50 transition-all space-y-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="font-display font-bold text-corp-charcoal text-base">
                                  {sub.plan?.name || "Abonelik Paketi"}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2.5 py-0.5 rounded-full bg-corp-surface text-corp-teal text-[11px] font-semibold border border-corp-border/60">
                                    {sub.planTier?.name || "Standart Paket"}
                                  </span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
                                    {badge.label}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-display font-bold text-lg text-corp-charcoal">₺{formattedPrice}</p>
                                <p className="text-[10px] text-corp-gray">/ dönemlik</p>
                              </div>
                            </div>

                            <div className="pt-3 border-t border-corp-border/60 text-xs text-corp-gray space-y-1.5">
                              <p className="flex items-center gap-2">
                                <Clock size={14} className="text-corp-teal" />
                                <span>Dönem Sonu: <strong className="text-corp-charcoal">{periodEndFormatted}</strong></span>
                              </p>
                              {sub.cancelAtPeriodEnd && (
                                <p className="text-amber-700 font-semibold text-[11px] bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  ⚠️ Mevcut fatura dönemi bitiminde otomatik sonlandırılacaktır.
                                </p>
                              )}
                            </div>

                            <div className="pt-3 border-t border-corp-border/60 flex items-center justify-between">
                              {sub.status === "ACTIVE" && !sub.cancelAtPeriodEnd && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelSubscription(sub.id)}
                                  disabled={cancellingSubId === sub.id}
                                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                                >
                                  {cancellingSubId === sub.id && <Loader2 size={12} className="animate-spin" />}
                                  Dönem Sonunda İptal Et
                                </button>
                              )}

                              {sub.status === "PENDING" && (
                                <Link
                                  href={`/services/ai-automation/${sub.plan?.slug || ""}`}
                                  className="text-xs font-bold text-corp-teal hover:underline flex items-center gap-1 ml-auto"
                                >
                                  Ödemeyi Tamamla →
                                </Link>
                              )}

                              <Link
                                href={`/services/ai-automation/${sub.plan?.slug || ""}`}
                                className="text-xs text-corp-gray hover:text-corp-teal ml-auto"
                              >
                                Paket Detayları ↗
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: ADDRESSES */}
              {activeTab === "addresses" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-corp-border">
                    <div>
                      <h3 className="font-display text-lg font-bold text-corp-charcoal">Adres Defterim</h3>
                      <p className="text-xs text-corp-gray mt-0.5">Teslimat adreslerinizi yönetebilir ve varsayılan adres seçebilirsiniz.</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingAddress(null);
                        setAddressModalOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors flex items-center gap-1.5 shadow-lg shadow-corp-teal/20"
                    >
                      <Plus size={16} /> Yeni Adres Ekle
                    </button>
                  </div>

                  {loadingAddresses ? (
                    <div className="p-12 text-center">
                      <Loader2 size={32} className="animate-spin text-corp-teal mx-auto mb-3" />
                      <p className="text-xs text-corp-gray font-medium">Adresleriniz yükleniyor...</p>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-16">
                      <MapPin size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Kayıtlı Adresiniz Yok</h4>
                      <p className="text-corp-gray font-body text-xs mb-6">Siparişlerde hızlı teslimat için adres ekleyin.</p>
                      <button
                        onClick={() => {
                          setEditingAddress(null);
                          setAddressModalOpen(true);
                        }}
                        className="px-6 py-3 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors"
                      >
                        İlk Adresinizi Ekleyin →
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          className={`p-6 rounded-2xl border transition-all relative ${
                            addr.isDefault
                              ? "border-corp-teal bg-corp-teal/5 shadow-md shadow-corp-teal/10"
                              : "border-corp-border bg-white hover:border-corp-gray"
                          }`}
                        >
                          {addr.isDefault && (
                            <span className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-corp-teal text-white text-[10px] font-bold">
                              Varsayılan
                            </span>
                          )}

                          <div className="flex items-center gap-2 mb-3">
                            <MapPin size={18} className="text-corp-teal" />
                            <h4 className="font-display font-bold text-corp-charcoal text-base">{addr.title}</h4>
                          </div>

                          <p className="font-semibold text-xs text-corp-charcoal">{addr.firstName} {addr.lastName}</p>
                          <p className="text-xs text-corp-gray mt-1 leading-relaxed">{addr.addressDetail}</p>
                          <p className="text-xs text-corp-gray mt-1">{addr.district} / {addr.city}</p>
                          <p className="text-xs text-corp-gray mt-1 font-mono">Tel: {addr.phone}</p>

                          <div className="mt-6 pt-4 border-t border-corp-border/60 flex items-center justify-between text-xs">
                            {!addr.isDefault && (
                              <button
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-corp-teal font-bold hover:underline"
                              >
                                Varsayılan Yap
                              </button>
                            )}
                            <div className="flex items-center gap-3 ml-auto">
                              <button
                                onClick={() => {
                                  setEditingAddress(addr);
                                  setAddressModalOpen(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-corp-surface text-corp-gray hover:text-corp-charcoal"
                                title="Düzenle"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
                                className="p-1.5 rounded-lg hover:bg-error/10 text-corp-gray hover:text-error"
                                title="Sil"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 9: COMPANY INFO & BRAND ASSETS */}
              {activeTab === "company" && (
                <div className="bg-white p-8 rounded-3xl border border-corp-border shadow-sm">
                  <h3 className="font-display text-xl font-bold text-corp-charcoal mb-1">Şirket & Marka Varlıkları</h3>
                  <p className="text-xs text-corp-gray mb-8">Fatura düzenleme, resmi yazışmalar ve projelerde kullanılacak kurumsal marka bilgileriniz.</p>

                  {companyMsg && (
                    <div
                      className={`mb-6 p-4 rounded-xl text-xs font-medium border ${
                        companyMsg.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-error/10 border-error/25 text-error"
                      }`}
                    >
                      {companyMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleUpdateCompany} className="space-y-6 max-w-xl">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                        Hesap Türü
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs font-bold text-corp-charcoal cursor-pointer">
                          <input
                            type="radio"
                            name="accountType"
                            value="individual"
                            checked={companyForm.accountType === "individual"}
                            onChange={(e) => setCompanyForm((prev) => ({ ...prev, accountType: e.target.value }))}
                            className="text-corp-teal focus:ring-corp-teal"
                          />
                          Bireysel Müşteri
                        </label>
                        <label className="flex items-center gap-2 text-xs font-bold text-corp-charcoal cursor-pointer">
                          <input
                            type="radio"
                            name="accountType"
                            value="corporate"
                            checked={companyForm.accountType === "corporate"}
                            onChange={(e) => setCompanyForm((prev) => ({ ...prev, accountType: e.target.value }))}
                            className="text-corp-teal focus:ring-corp-teal"
                          />
                          Kurumsal Şirket
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Resmi Şirket Unvanı
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: ABC Teknoloji Ltd. Şti."
                          value={companyForm.companyTitle}
                          onChange={(e) => setCompanyForm((prev) => ({ ...prev, companyTitle: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Sektör / Faaliyet Alanı
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: E-Ticaret, Lojistik, Medya"
                          value={companyForm.sector}
                          onChange={(e) => setCompanyForm((prev) => ({ ...prev, sector: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Vergi Numarası / T.C. Kimlik No
                        </label>
                        <input
                          type="text"
                          placeholder="10 Haneli Vergi No"
                          value={companyForm.taxNumber}
                          onChange={(e) => setCompanyForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Vergi Dairesi
                        </label>
                        <input
                          type="text"
                          placeholder="Örn: Kadıköy V.D."
                          value={companyForm.taxOffice}
                          onChange={(e) => setCompanyForm((prev) => ({ ...prev, taxOffice: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-corp-border space-y-4">
                      <h4 className="font-display font-bold text-corp-charcoal text-base flex items-center gap-2">
                        <Palette size={18} className="text-corp-teal" /> Marka Varlıkları (Tasarım & Sosyal Medya İçin)
                      </h4>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Marka Logosu URL
                        </label>
                        <input
                          type="url"
                          placeholder="https://sirketiniz.com/logo.png"
                          value={companyForm.brandLogo}
                          onChange={(e) => setCompanyForm((prev) => ({ ...prev, brandLogo: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm font-body"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Ana Marka Rengi (Hex Color)
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={companyForm.brandColor || "#00B4D8"}
                            onChange={(e) => setCompanyForm((prev) => ({ ...prev, brandColor: e.target.value }))}
                            className="w-12 h-10 rounded-lg cursor-pointer border border-corp-border p-1 bg-white"
                          />
                          <input
                            type="text"
                            value={companyForm.brandColor}
                            onChange={(e) => setCompanyForm((prev) => ({ ...prev, brandColor: e.target.value }))}
                            className="w-36 px-4 py-2.5 rounded-xl border border-corp-border font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={savingCompany}
                        className="px-8 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20 disabled:opacity-60 flex items-center gap-2"
                      >
                        {savingCompany && <Loader2 size={16} className="animate-spin" />}
                        Şirket Bilgilerini Kaydet
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 10: TEAM MEMBERS */}
              {activeTab === "team" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-corp-border">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-200">
                        Kurumsal Özellik
                      </span>
                      <h3 className="font-display text-xl font-bold text-corp-charcoal mt-1">Ekip Üyeleri & Yetkiler</h3>
                      <p className="text-xs text-corp-gray">Proje takibi ve faturaları incelemesi için alt kullanıcılarınızı davet edin.</p>
                    </div>
                    <button
                      onClick={() => setTeamModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20 flex items-center gap-2"
                    >
                      <Plus size={16} /> Ekip Üyesi Davet Et
                    </button>
                  </div>

                  {loadingTeam ? (
                    <div className="py-16 text-center">
                      <Loader2 size={32} className="animate-spin text-purple-600 mx-auto mb-3" />
                      <p className="text-xs text-corp-gray">Ekip üyeleri yükleniyor...</p>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="py-16 text-center">
                      <Users size={48} className="mx-auto text-corp-border mb-4" />
                      <h4 className="font-display font-bold text-corp-charcoal text-base mb-1">Henüz Ekip Üyesi Eklemediniz</h4>
                      <p className="text-corp-gray font-body text-xs mb-6 max-w-md mx-auto">
                        Ortaklarınızı veya departman yöneticilerinizi davet ederek ajans portalınıza erişim verebilirsiniz.
                      </p>
                      <button
                        onClick={() => setTeamModalOpen(true)}
                        className="px-6 py-3 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
                      >
                        İlk Ekip Üyesini Davet Et →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((tm) => {
                        const roleBadges: Record<string, string> = {
                          viewer: "Görüntüleyici",
                          approver: "Onaylayan",
                          manager: "Yönetici",
                        };

                        return (
                          <div
                            key={tm.id}
                            className="p-5 rounded-2xl border border-corp-border flex items-center justify-between gap-4 hover:border-purple-200 transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-700 font-bold flex items-center justify-center text-sm">
                                {tm.name ? tm.name[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <h4 className="font-display font-bold text-corp-charcoal text-sm">{tm.name}</h4>
                                <p className="text-xs text-corp-gray">{tm.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                                {roleBadges[tm.role] || tm.role}
                              </span>
                              <button
                                onClick={() => handleDeleteTeamMember(tm.id)}
                                className="p-2 rounded-xl text-corp-gray hover:bg-error/10 hover:text-error transition-colors"
                                title="Çıkar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 11: INTEGRATIONS */}
              {activeTab === "integrations" && (
                <div className="bg-white rounded-3xl border border-corp-border shadow-sm p-6 md:p-8 space-y-6">
                  <div className="pb-6 border-b border-corp-border">
                    <h3 className="font-display text-xl font-bold text-corp-charcoal">Entegrasyonlarım & Bağlı Hesaplar</h3>
                    <p className="text-xs text-corp-gray mt-0.5">Sosyal medya, analitik ve reklam hesaplarınızın ajans yönetim paneli erişim durumları.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      {
                        title: "Google ile Giriş & OAuth",
                        desc: (user?.accounts?.some((a: any) => a.provider === "google") || user?.email?.endsWith("@gmail.com"))
                          ? `Google hesabınız (${user?.email}) bağlı ve tek tıkla güvenli giriş aktif.`
                          : "Google hesabınızı bağlayarak şifresiz, tek tıkla güvenli giriş sağlayın.",
                        connected: Boolean(user?.accounts?.some((a: any) => a.provider === "google") || user?.email?.endsWith("@gmail.com")),
                        icon: "🌐",
                        btnText: (user?.accounts?.some((a: any) => a.provider === "google") || user?.email?.endsWith("@gmail.com")) ? "Bağlı / Aktif" : "Google ile Bağla",
                        action: () => {
                          if (!user?.accounts?.some((a: any) => a.provider === "google")) {
                            window.location.href = "/api/auth/signin/google";
                          }
                        },
                      },
                      {
                        title: "Google Analytics 4 & Tag Manager",
                        desc: "Sözleşmeli web sitenizin canlı trafik, e-ticaret dönüşüm ve dönüşüm hunisi analitiği.",
                        connected: projects.length > 0 && projects.some((p: any) => p.status === "live" || p.status === "completed"),
                        icon: "📊",
                        btnText: "Kurulum Talebi Aç",
                        action: () => {
                          setSupportModalOpen(true);
                        },
                      },
                      {
                        title: "Meta Ads (Facebook & Instagram Pixel)",
                        desc: "Sosyal medya reklam kampanyası yönetimi, katalog senkronizasyonu ve Conversions API.",
                        connected: false,
                        icon: "📲",
                        btnText: "Kurulum Talebi Aç",
                        action: () => {
                          setSupportModalOpen(true);
                        },
                      },
                      {
                        title: "WhatsApp Destek & Bildirim Hattı",
                        desc: user?.phone
                          ? `Profil telefon numaranız (${user.phone}) üzerinden sipariş durumları ve ajans bildirimleri.`
                          : "Sipariş ve destek bildirimlerini anlık WhatsApp üzerinden almak için telefon numaranızı kaydedin.",
                        connected: Boolean(user?.phone),
                        icon: "💬",
                        btnText: user?.phone ? "Numara Tanımlı" : "Telefon Numarası Ekle",
                        action: () => {
                          if (!user?.phone) setActiveTab("settings");
                        },
                      },
                      {
                        title: "Call Center Yapay Zeka Santrali",
                        desc: "Gelen müşteri çağrılarını yanıtlayan ve sipariş alan yapay zeka sesli müşteri temsilcisi entegrasyonu.",
                        connected: subscriptions.some((s: any) => s.status === "ACTIVE"),
                        icon: "🤖",
                        btnText: subscriptions.some((s: any) => s.status === "ACTIVE") ? "Abonelik Aktif" : "Paketleri İncele",
                        action: () => {
                          setActiveTab("subscriptions");
                        },
                      },
                    ].map((item, idx) => (
                      <div key={idx} className="p-6 rounded-2xl border border-corp-border flex flex-col justify-between space-y-4 hover:border-corp-teal/40 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{item.icon}</span>
                            <div>
                              <h4 className="font-display font-bold text-corp-charcoal text-base">{item.title}</h4>
                              <p className="text-xs text-corp-gray mt-0.5 leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-corp-border/80">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              item.connected
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-gray-100 text-gray-600 border-gray-200"
                            }`}
                          >
                            {item.connected ? "Bağlı / Aktif" : "Yapılandırılmadı"}
                          </span>

                          <button
                            type="button"
                            onClick={item.action}
                            className="px-4 py-2 rounded-xl bg-corp-surface hover:bg-corp-teal hover:text-white text-corp-charcoal font-bold text-xs transition-colors border border-corp-border cursor-pointer"
                          >
                            {item.btnText}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 12: ACCOUNT SETTINGS & NOTIFICATIONS */}
              {activeTab === "settings" && (
                <div className="bg-white p-8 rounded-3xl border border-corp-border shadow-sm space-y-8">
                  {/* Dedicated Email Verification Section */}
                  <div className={`p-6 md:p-8 rounded-2xl border transition-all ${
                    isEmailVerified
                      ? "bg-emerald-50/40 border-emerald-200"
                      : "bg-amber-50/50 border-amber-200"
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isEmailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isEmailVerified ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-display font-bold text-base text-corp-charcoal">
                              E-posta Doğrulama Durumu
                            </h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              isEmailVerified
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-amber-100 text-amber-800 border-amber-300"
                            }`}>
                              {isEmailVerified ? "Doğrulandı" : "Doğrulanmadı"}
                            </span>
                          </div>
                          <p className="text-xs text-corp-gray mt-1 leading-relaxed">
                            {isEmailVerified
                              ? `E-posta adresiniz (${user?.email}) güvenle doğrulanmıştır. Tüm hesap ve sipariş bildirimleriniz eksiksiz iletilmektedir.`
                              : `E-posta adresiniz (${user?.email}) henüz onaylanmamış. Hesap güvenliğiniz ve sipariş bildirimleri için lütfen doğrulayınız.`}
                          </p>
                        </div>
                      </div>

                      {!isEmailVerified && !codeSent && (
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={sendingVerifyCode}
                          className="px-5 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap cursor-pointer"
                        >
                          {sendingVerifyCode ? <Loader2 size={14} className="animate-spin" /> : <MailCheck size={14} />}
                          Doğrulama Kodu Gönder
                        </button>
                      )}
                    </div>

                    {verifyMsg && (
                      <div className={`mt-4 p-3.5 rounded-xl text-xs font-medium border ${
                        verifyMsg.type === "success"
                          ? "bg-emerald-100 border-emerald-300 text-emerald-900"
                          : "bg-error/10 border-error/25 text-error"
                      }`}>
                        {verifyMsg.text}
                      </div>
                    )}

                    {!isEmailVerified && codeSent && (
                      <form onSubmit={handleConfirmVerificationCode} className="mt-4 pt-4 border-t border-amber-200/80 flex flex-col sm:flex-row items-center gap-3">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="6 haneli kod"
                          value={verifyCode}
                          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                          className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-corp-border bg-white font-mono text-center text-sm font-bold tracking-widest focus:ring-2 focus:ring-corp-teal outline-none"
                          required
                        />
                        <button
                          type="submit"
                          disabled={verifyingEmail || verifyCode.length !== 6}
                          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-corp-teal text-white font-bold text-xs hover:bg-corp-teal-600 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {verifyingEmail && <Loader2 size={14} className="animate-spin" />}
                          Kodu Onayla
                        </button>
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={sendingVerifyCode}
                          className="text-xs text-corp-gray hover:text-corp-teal underline cursor-pointer ml-auto"
                        >
                          Tekrar Kod Gönder
                        </button>
                      </form>
                    )}
                  </div>

                  <div>
                    <h3 className="font-display text-xl font-bold text-corp-charcoal mb-1">Hesap Bilgileri Güncelleme</h3>
                    <p className="text-xs text-corp-gray mb-6">Ad-soyad, telefon ve iletişim e-posta adresinizi buradan değiştirebilirsiniz.</p>

                    {accountMsg && (
                      <div
                        className={`mb-6 p-4 rounded-xl text-xs font-medium border ${
                          accountMsg.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-error/10 border-error/25 text-error"
                        }`}
                      >
                        {accountMsg.text}
                      </div>
                    )}

                    <form onSubmit={handleUpdateAccount} className="space-y-6 max-w-md">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Ad Soyad
                        </label>
                        <input
                          type="text"
                          required
                          value={accountForm.name}
                          onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none font-body text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          E-posta Adresi
                        </label>
                        <input
                          type="email"
                          required
                          value={accountForm.email}
                          onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none font-body text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                          Telefon Numarası
                        </label>
                        <input
                          type="tel"
                          placeholder="05XXXXXXXXX"
                          value={accountForm.phone}
                          onChange={(e) => setAccountForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none font-body text-sm"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={savingAccount}
                          className="px-8 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20 disabled:opacity-60 flex items-center gap-2"
                        >
                          {savingAccount && <Loader2 size={16} className="animate-spin" />}
                          Değişiklikleri Kaydet
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Notification Preferences Section */}
                  <div className="pt-8 border-t border-corp-border space-y-4 max-w-md">
                    <h4 className="font-display font-bold text-corp-charcoal text-base flex items-center gap-2">
                      <Bell size={18} className="text-corp-teal" /> Bildirim Tercihleri
                    </h4>

                    <div className="space-y-3">
                      {[
                        { key: "projectUpdates", label: "Proje İlerleme ve Milestone Güncellemeleri" },
                        { key: "invoiceAlerts", label: "Fatura Kesimi ve Hatırlatma Bildirimleri" },
                        { key: "reportAlerts", label: "Yeni Rapor Yayınlandı Bildirimleri" },
                        { key: "ticketReplies", label: "Destek Talebi Yanıtlandığında E-Posta Gönder" },
                      ].map((item) => (
                        <label key={item.key} className="flex items-center justify-between p-3.5 rounded-xl bg-corp-surface border border-corp-border cursor-pointer">
                          <span className="text-xs font-semibold text-corp-charcoal">{item.label}</span>
                          <input
                            type="checkbox"
                            checked={(notificationPrefs as any)[item.key]}
                            onChange={(e) => setNotificationPrefs((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                            className="w-4 h-4 text-corp-teal rounded border-corp-border focus:ring-corp-teal"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 13: SECURITY & PASSWORD CHANGE */}
              {activeTab === "security" && (
                <div className="bg-white p-8 rounded-3xl border border-corp-border shadow-sm">
                  <h3 className="font-display text-lg font-bold text-corp-charcoal mb-2">Şifre Değiştirme</h3>
                  <p className="text-xs text-corp-gray mb-8">Güvenliğiniz için güçlü ve benzersiz bir şifre kullanın.</p>

                  {passwordMsg && (
                    <div
                      className={`mb-6 p-4 rounded-xl text-xs font-medium border ${
                        passwordMsg.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-error/10 border-error/25 text-error"
                      }`}
                    >
                      {passwordMsg.text}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                        Mevcut Şifre
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPw ? "text" : "password"}
                          required
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPw(!showCurrentPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal"
                        >
                          {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                        Yeni Şifre
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? "text" : "password"}
                          required
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-corp-gray hover:text-corp-charcoal"
                        >
                          {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      {/* Live Password Strength Bar */}
                      {passwordForm.newPassword.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-corp-surface border border-corp-border/60 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-medium text-corp-gray">
                            <span>Şifre Gücü:</span>
                            <span
                              className={`font-bold ${
                                pwValidCount <= 2 ? "text-error" : pwValidCount === 3 ? "text-amber-500" : "text-emerald-600"
                              }`}
                            >
                              {pwValidCount <= 2 ? "Zayıf" : pwValidCount === 3 ? "Orta" : "Güçlü"}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                pwValidCount <= 2 ? "bg-error" : pwValidCount === 3 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${(pwValidCount / 4) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-corp-gray mb-2">
                        Yeni Şifre (Tekrar)
                      </label>
                      <input
                        type={showNewPw ? "text" : "password"}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-4 py-3 rounded-xl border border-corp-border focus:ring-2 focus:ring-corp-teal outline-none text-sm"
                      />
                      {passwordForm.confirmPassword.length > 0 &&
                        passwordForm.confirmPassword !== passwordForm.newPassword && (
                          <p className="text-[11px] text-error mt-1">Şifreler eşleşmiyor.</p>
                        )}
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={savingPassword || !isPasswordValid}
                        className="px-8 py-3.5 rounded-xl bg-corp-teal text-white font-bold text-sm hover:bg-corp-teal-600 transition-colors shadow-lg shadow-corp-teal/20 disabled:opacity-60 flex items-center gap-2"
                      >
                        {savingPassword && <Loader2 size={16} className="animate-spin" />}
                        Şifreyi Güncelle
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}

      {addressModalOpen && (
        <AddressModal
          initialAddress={editingAddress}
          onClose={() => setAddressModalOpen(false)}
          onSuccess={() => fetchAddresses()}
        />
      )}

      {selectedProject && <ProjectDetailModal project={selectedProject} onClose={() => setSelectedProject(null)} />}

      {supportModalOpen && (
        <SupportTicketModal
          isOpen={supportModalOpen}
          onClose={() => setSupportModalOpen(false)}
          onTicketCreated={(t) => {
            fetchTickets();
            setSelectedTicket(t);
            setActiveTab("support");
          }}
        />
      )}

      {teamModalOpen && (
        <TeamInviteModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          onMemberInvited={() => fetchTeam()}
        />
      )}

      {/* Mobile All Menu Drawer / Modal */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl border border-corp-border shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-corp-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-corp-teal" />
                <h3 className="font-display font-bold text-base text-corp-charcoal">Profil Menüsü</h3>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-corp-gray hover:text-corp-charcoal transition-colors"
                aria-label="Kapat"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-6">
              {menuGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <p className="px-3 text-[10px] font-bold text-corp-gray uppercase tracking-widest mb-2">
                    {group.title}
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                            if (typeof window !== "undefined") {
                              window.history.replaceState(null, "", `/profile?tab=${item.id}`);
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? "bg-corp-teal text-white shadow-md shadow-corp-teal/20"
                              : "text-corp-charcoal hover:bg-gray-100"
                          }`}
                        >
                          <Icon size={16} />
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isActive ? "bg-white text-corp-teal" : "bg-corp-teal/10 text-corp-teal"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                          <ChevronRight size={14} className={`ml-auto ${isActive ? "opacity-100" : "opacity-0"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-corp-border">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold text-error hover:bg-error/5 transition-all"
                >
                  <LogOut size={16} />
                  Çıkış Yap
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
