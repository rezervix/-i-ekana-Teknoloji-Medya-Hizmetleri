"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, FileText, FolderOpen, Package, Wrench, Users2, MessageSquareQuote,
  Image, Mail, BarChart3, Settings, LogOut, Menu, X, ChevronRight,
  Brain, UserSquare2, HelpCircle, Building2, Briefcase, LifeBuoy, FolderGit2, Receipt,
} from "lucide-react";
import DatabaseStatus from "./components/DatabaseStatus";
import Logo from "@/components/Logo";



const navSections = [
  {
    label: "Genel",
    items: [
      { icon: LayoutDashboard, label: "Dashboard",           href: "/admin" },
      { icon: BarChart3,       label: "Analitik",             href: "/admin/analytics" },
    ],
  },
  {
    label: "Mağaza",
    items: [
      { icon: Package,            label: "Mağaza Ürünleri",  href: "/admin/magaza/urunler" },
      { icon: Package,            label: "Abonelik Ürünleri", href: "/admin/products" },
      { icon: Receipt,            label: "Abonelikler",      href: "/admin/subscriptions" },
      { icon: Briefcase,          label: "Siparişler",       href: "/admin/magaza/siparisler" },
      { icon: Image,              label: "Tasarım Şablonları", href: "/admin/tasarim-sablonlari" },
      { icon: BarChart3,          label: "Kampanyalar",      href: "/admin/magaza/kampanyalar" },
      { icon: MessageSquareQuote, label: "Yorumlar",         href: "/admin/magaza/yorumlar" },
      { icon: Mail,               label: "Sepet Hatırlatma", href: "/admin/magaza/sepet-hatirlatma" },
    ],
  },
  {
    label: "İçerik",
    items: [
      { icon: FileText,           label: "Blog",             href: "/admin/content/blog" },
      { icon: FolderOpen,         label: "Projeler",         href: "/admin/content/projects" },
      { icon: Wrench,             label: "Hizmetler",        href: "/admin/content/services" },
      { icon: UserSquare2,        label: "Ekip",             href: "/admin/content/team" },
      { icon: MessageSquareQuote, label: "Referanslar",      href: "/admin/content/testimonials" },
      { icon: HelpCircle,         label: "SSS",              href: "/admin/content/faq" },
    ],
  },
  {
    label: "Müşteriler",
    items: [
      { icon: Building2, label: "Markalar & Ortaklar", href: "/admin/clients" },
    ],
  },
  {
    label: "Müşteri Portalı",
    items: [
      { icon: LifeBuoy,     label: "Destek Talepleri",      href: "/admin/customer-portal/support-tickets" },
      { icon: FolderGit2,   label: "Müşteri Projeleri",     href: "/admin/customer-portal/client-projects" },
      { icon: BarChart3,    label: "Raporlar",              href: "/admin/customer-portal/performance-reports" },
      { icon: Receipt,      label: "Faturalar",              href: "/admin/customer-portal/client-invoices" },
      { icon: FileText,     label: "Sözleşmeler",            href: "/admin/customer-portal/client-contracts" },
    ],
  },
  {
    label: "Satış",
    items: [
      { icon: Users2,    label: "Lead / CRM", href: "/admin/leads" },
      { icon: Briefcase, label: "Teklifler",   href: "/admin/quotes" },
    ],
  },
  {
    label: "Sistem",
    items: [
      { icon: Image,    label: "Medya Kütüphanesi", href: "/admin/media" },
      { icon: Mail,     label: "E-posta",            href: "/admin/emails" },
      { icon: Users2,   label: "Kullanıcılar",       href: "/admin/users" },
      { icon: Settings, label: "Ayarlar",            href: "/admin/settings" },
    ],
  },
  {
    label: "",
    items: [
      { icon: Brain, label: "🔴 Sungur AI", href: "/admin/sungur", special: true },
    ],
  },
];

interface Props { children: React.ReactNode; }

export default function AdminLayout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo — same brand identity as main site */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-corp-border flex-shrink-0">
        <Logo width={36} height={36} />
        <div className="flex flex-col leading-none">
          <span className="font-display text-[13px] font-bold tracking-wide text-corp-charcoal">
            ÇİÇEKANA
          </span>
          <span className="font-body text-[9px] tracking-widest font-medium text-corp-gray uppercase mt-0.5">
            ADMIN PANELİ
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin menü">
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="font-body text-[10px] text-corp-gray-light tracking-widest uppercase font-bold px-3 mb-1.5">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-body text-[13px] font-medium transition-all duration-200 group ${
                        (item as any).special ? "mt-2" : ""
                      } ${
                        active
                          ? "bg-corp-teal text-white"
                          : "text-corp-charcoal hover:bg-corp-teal-50 hover:text-corp-teal"
                      }`}
                    >
                      <item.icon
                        size={15}
                        className={
                          active
                            ? "text-white"
                            : "text-corp-gray group-hover:text-corp-teal"
                        }
                      />
                      {item.label}
                      {active && (
                        <ChevronRight size={12} className="ml-auto text-white" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* System Health */}
      <div className="mb-4">
        <DatabaseStatus />
      </div>

      {/* Sign out */}
      <div className="px-3 py-4 border-t border-corp-border flex-shrink-0">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl font-body text-[13px] text-corp-gray hover:text-error hover:bg-error/5 transition-all duration-200"
        >
          <LogOut size={15} />
          Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-corp-surface overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-white border-r border-corp-border">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-corp-border flex flex-col z-10 shadow-luxury">
            <button
              className="absolute top-4 right-4 text-corp-gray hover:text-corp-charcoal p-1 transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Menüyü kapat"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-corp-border bg-white px-3 shadow-corp-nav sm:h-16 sm:px-6">
          <button
            className="lg:hidden text-corp-gray hover:text-corp-charcoal transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="min-w-0 flex flex-1 items-center gap-1.5 overflow-hidden text-corp-gray">
            {pathname
              .split("/")
              .filter(Boolean)
              .map((seg, i, arr) => (
                <React.Fragment key={i}>
                  <span className="truncate font-body text-[12px] capitalize sm:text-[13px]">
                    {seg === "admin" ? "Ana Sayfa" : seg}
                  </span>
                  {i < arr.length - 1 && (
                    <ChevronRight size={13} className="text-corp-gray-light" />
                  )}
                </React.Fragment>
              ))}
          </div>

          {/* User avatar */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-corp-teal flex-shrink-0">
            A
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
