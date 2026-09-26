"use client";

import Link from "next/link";
import { ArrowRight, FileText, LayoutDashboard, LogOut, Package, ShieldCheck, Users } from "lucide-react";

const adminSections = [
  {
    title: "Genel Bakış",
    description: "Yönetim panelinin ana ekranı ve hızlı erişimler.",
    href: "/admin",
    icon: LayoutDashboard,
    active: true,
  },
  {
    title: "Abonelikler",
    description: "Müşteri aboneliklerini ve ödeme durumlarını yönetin.",
    href: "/admin/subscriptions",
    icon: ShieldCheck,
  },
  {
    title: "Ürünler",
    description: "Mağaza ürünlerini ve hizmet paketlerini yönetin.",
    href: "/magaza",
    icon: Package,
  },
  {
    title: "Blog",
    description: "Yayınlanan içerikleri ve yazıları yönetin.",
    href: "/blog",
    icon: FileText,
  },
  {
    title: "Kullanıcılar",
    description: "Kullanıcı hesaplarını ve erişim rollerini görüntüleyin.",
    href: "/profile",
    icon: Users,
  },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-corp-surface px-6 py-10 md:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="mb-10 flex flex-col gap-5 border-b border-corp-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-corp-teal">
              <ShieldCheck size={18} aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Yönetim Merkezi</span>
            </div>
            <h1 className="font-display text-4xl font-bold text-corp-charcoal">Admin Paneli</h1>
            <p className="mt-2 max-w-2xl text-sm text-corp-gray">
              Çiçekana yönetim araçlarına buradan ulaşabilirsiniz.
            </p>
          </div>
          <Link
            href="/auth?callbackUrl=%2Fadmin"
            className="inline-flex items-center gap-2 self-start rounded-xl border border-corp-border bg-white px-4 py-2 text-sm font-semibold text-corp-charcoal transition-colors hover:bg-corp-surface sm:self-auto"
          >
            <LogOut size={16} aria-hidden="true" />
            Hesap değiştir
          </Link>
        </header>

        <section aria-labelledby="admin-sections-title">
          <div className="mb-5">
            <h2 id="admin-sections-title" className="font-display text-xl font-bold text-corp-charcoal">Yönetim araçları</h2>
            <p className="mt-1 text-sm text-corp-gray">Bir işlem alanı seçerek devam edin.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {adminSections.map(({ title, description, href, icon: Icon, active }) => (
              <Link
                key={title}
                href={href}
                className={`group rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? "border-corp-teal/40 ring-1 ring-corp-teal/10" : "border-corp-border"}`}
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-corp-surface text-corp-teal">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <ArrowRight size={18} aria-hidden="true" className="text-corp-gray transition-transform group-hover:translate-x-1" />
                </div>
                <h3 className="font-display text-lg font-bold text-corp-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-corp-gray">{description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
