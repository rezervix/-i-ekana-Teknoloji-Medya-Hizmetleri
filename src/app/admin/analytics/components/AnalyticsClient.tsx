"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, ShoppingCart, Users, FolderOpen, Mail, FileText,
  Loader2, AlertCircle, ArrowUpRight, CheckCircle2 
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, PieChart, Pie, Cell
} from "recharts";
import FunnelAnalyticsReport from "./FunnelAnalyticsReport";

interface AnalyticsData {
  totalLeads: number;
  newLeads: number;
  totalOrders: number;
  totalRevenue: number;
  completedOrders: number;
  conversionRate: string;
  totalProjects: number;
  publishedProjects: number;
  totalBlogPosts: number;
  publishedPosts: number;
  totalUsers: number;
  recentLeads: Array<{ id: string; companyName: string; status: string; createdAt: string; email: string }>;
  recentOrders: Array<{ id: string; orderNumber: string; status: string; finalAmount: number; createdAt: string }>;
  leadsByStatus: Array<{ name: string; value: number }>;
  ordersByStatus: Array<{ name: string; value: number }>;
  dailyTrends: Array<{ date: string; Gelir: number; Sipariş: number }>;
}

const COLORS = ["#0A4D68", "#05bfdb", "#E8622A", "#ffb84c", "#4e9f3d", "#d83a56"];

export default function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error("Veriler yüklenirken bir sorun oluştu.");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Bilinmeyen hata");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-corp-gray">
        <Loader2 className="animate-spin text-corp-teal mb-3" size={32} />
        <span className="font-body text-sm font-semibold">Analitik verileri hazırlanıyor...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
        <AlertCircle size={24} />
        <div>
          <h4 className="font-bold">Hata Oluştu</h4>
          <p className="text-sm">{error || "Veriler alınamadı."}</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      title: "Toplam Gelir",
      value: `₺${data.totalRevenue.toLocaleString("tr-TR")}`,
      sub: `${data.totalOrders} siparişten elde edilen ciro`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "CRM Lead / Müşteri",
      value: String(data.totalLeads),
      sub: `${data.newLeads} yeni cevaplanmamış talep`,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      title: "Sipariş Dönüşüm Oranı",
      value: `%${data.conversionRate}`,
      sub: "Tamamlanan / Toplam Sipariş",
      icon: ShoppingCart,
      color: "text-corp-teal",
      bg: "bg-teal-50",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title */}
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-corp-border shadow-sm">
        <div>
          <h2 className="font-display text-2xl font-bold text-corp-charcoal">Analitik & Dashboard</h2>
          <p className="text-sm font-body text-corp-gray mt-1">Platform genelindeki son 30 günlük veriler ve güncel performans göstergeleri.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm flex items-start justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="text-sm font-body text-corp-gray mb-1">{stat.title}</p>
              <h3 className="text-2xl font-display font-bold text-corp-charcoal">
                {stat.value}
              </h3>
              <span className="text-xs text-corp-gray mt-1.5 inline-block font-body">{stat.sub}</span>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={stat.color} size={24} />
            </div>
          </div>
        ))}
      </div>

      {/* Faz 5: Dönüşüm Hunisi & A/B Test Raporu */}
      <FunnelAnalyticsReport />

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-corp-charcoal">Gelir ve Sipariş Trendi (Son 30 Gün)</h4>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGelir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0A4D68" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0A4D68" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6B7280", fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="Gelir" stroke="#0A4D68" strokeWidth={2} fillOpacity={1} fill="url(#colorGelir)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Status Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm space-y-4">
          <h4 className="font-display font-bold text-corp-charcoal">Talep / Lead Dağılımı</h4>
          {data.leadsByStatus.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-corp-gray text-sm">
              Henüz lead verisi yok.
            </div>
          ) : (
            <div className="h-72 w-full flex flex-col justify-center items-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.leadsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {data.leadsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {data.leadsByStatus.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs text-corp-gray font-body">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grid Content: Blog/Project count and recent items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent CRM Leads */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-corp-border pb-3">
            <h4 className="font-display font-bold text-corp-charcoal">Son Lead Talepleri</h4>
            <span className="text-xs font-semibold px-2 py-1 bg-teal-50 text-corp-teal rounded-lg">
              Toplam: {data.totalLeads}
            </span>
          </div>
          <div className="divide-y divide-corp-border font-body">
            {data.recentLeads.length === 0 ? (
              <p className="text-sm text-corp-gray py-4">Kayıtlı lead bulunmamaktadır.</p>
            ) : (
              data.recentLeads.map((lead) => (
                <div key={lead.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-corp-charcoal">{lead.companyName}</p>
                    <p className="text-xs text-corp-gray">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      lead.status === "NEW" ? "bg-orange-100 text-orange-700" :
                      lead.status === "CONTACTED" ? "bg-blue-100 text-blue-700" :
                      "bg-green-100 text-green-700"
                    }`}>
                      {lead.status}
                    </span>
                    <p className="text-[10px] text-corp-gray-light mt-1">
                      {new Date(lead.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-2xl border border-corp-border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-corp-border pb-3">
            <h4 className="font-display font-bold text-corp-charcoal">Son Siparişler</h4>
            <span className="text-xs font-semibold px-2 py-1 bg-teal-50 text-corp-teal rounded-lg">
              Toplam: {data.totalOrders}
            </span>
          </div>
          <div className="divide-y divide-corp-border font-body">
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-corp-gray py-4">Kayıtlı sipariş bulunmamaktadır.</p>
            ) : (
              data.recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-corp-charcoal">Sipariş #{order.orderNumber}</p>
                    <p className="text-xs text-corp-teal font-semibold">₺{order.finalAmount.toLocaleString("tr-TR")}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      order.status === "DELIVERED" ? "bg-green-100 text-green-700" :
                      order.status === "PENDING" ? "bg-yellow-100 text-yellow-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {order.status}
                    </span>
                    <p className="text-[10px] text-corp-gray-light mt-1">
                      {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
