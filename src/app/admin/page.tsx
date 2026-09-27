export const dynamic = 'force-dynamic';
import React from "react";
import { prisma } from "@/lib/prisma";
import { Users2, FileText, Briefcase, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const LEAD_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW:           { label: "Yeni",              color: "#0A4D68" },
  CONTACTED:     { label: "İletişimde",         color: "#F59E0B" },
  QUALIFIED:     { label: "Nitelikli",          color: "#7C3AED" },
  PROPOSAL_SENT: { label: "Teklif Gönderildi",  color: "#06B6D4" },
  WON:           { label: "Kazanıldı",          color: "#10B981" },
  LOST:          { label: "Kaybedildi",         color: "#EF4444" },
};

async function getDashboardData() {
  try {
    const [leadsThisMonth, openQuotes, publishedPosts, recentLeads, totalOrders, deliveredOrders] = await Promise.all([
      prisma.lead.count({
        where: { createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
      }),
      prisma.quote.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true, companyName: true, sector: true,
          solutionType: true, email: true, status: true, createdAt: true,
        },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: "DELIVERED" } }),
    ]);
    const conversionRate = totalOrders > 0
      ? `%${((deliveredOrders / totalOrders) * 100).toFixed(1)}`
      : "—";
    return { leadsThisMonth, openQuotes, publishedPosts, recentLeads, conversionRate };
  } catch {
    return { leadsThisMonth: 0, openQuotes: 0, publishedPosts: 0, recentLeads: [], conversionRate: "—" };
  }
}

export default async function AdminDashboard() {
  const { leadsThisMonth, openQuotes, publishedPosts, recentLeads, conversionRate } = await getDashboardData();

  const metrics = [
    { icon: Users2,     label: "Bu Ay Yeni Lead",   value: leadsThisMonth, accent: "#0A4D68", href: "/admin/leads" },
    { icon: Briefcase,  label: "Açık Teklifler",     value: openQuotes,     accent: "#7C3AED", href: "/admin/quotes" },
    { icon: FileText,   label: "Yayınlanan Yazılar", value: publishedPosts, accent: "#10B981", href: "/admin/content/blog" },
    { icon: TrendingUp, label: "Ort. Dönüşüm",       value: conversionRate, accent: "#F59E0B", href: "/admin/analytics" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-2xl text-corp-charcoal mb-1">Dashboard</h1>
        <p className="font-body text-[14px] text-corp-gray">
          {new Date().toLocaleDateString("tr-TR", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Link
            key={m.label}
            href={m.href}
            className="group flex items-center gap-4 p-5 rounded-2xl border border-corp-border bg-white shadow-corp-card hover:-translate-y-0.5 hover:shadow-corp-hover transition-all duration-300"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${m.accent}12`, border: `1px solid ${m.accent}28` }}
            >
              <m.icon size={20} style={{ color: m.accent }} />
            </div>
            <div>
              <p className="font-display text-2xl text-corp-charcoal font-bold">{m.value}</p>
              <p className="font-body text-[12px] text-corp-gray">{m.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Yeni Blog Yazısı", href: "/admin/content/blog/new",      accent: "#0A4D68" },
          { label: "Yeni Proje",       href: "/admin/content/projects/new",  accent: "#7C3AED" },
          { label: "Yeni Teklif",      href: "/admin/quotes/new",            accent: "#10B981" },
        ].map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="group flex items-center justify-between p-4 rounded-xl border bg-white hover:shadow-corp-card transition-all duration-300"
            style={{ borderColor: `${a.accent}30`, background: `${a.accent}06` }}
          >
            <span
              className="font-body text-[14px] font-semibold"
              style={{ color: a.accent }}
            >
              {a.label}
            </span>
            <ArrowRight
              size={15}
              style={{ color: a.accent }}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        ))}
      </div>

      {/* Recent leads table */}
      <div className="rounded-2xl border border-corp-border bg-white shadow-corp-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-corp-border">
          <h2 className="font-display text-lg text-corp-charcoal">Son Leadler</h2>
          <Link
            href="/admin/leads"
            className="font-body text-[13px] text-corp-teal hover:underline flex items-center gap-1"
          >
            Tümünü Gör <ArrowRight size={13} />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <div className="text-center py-12">
            <p className="font-body text-corp-gray text-sm">
              Henüz lead yok. İletişim formu dolduğunda burada görünecek.
            </p>
          </div>
        ) : (
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
                {recentLeads.map((lead) => {
                  const st = LEAD_STATUS_LABELS[lead.status];
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-corp-border last:border-0 hover:bg-corp-surface transition-colors"
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
                            background: `${st.color}14`,
                            color: st.color,
                            border: `1px solid ${st.color}30`,
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
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
