import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const [
      totalLeads,
      newLeads,
      totalOrders,
      totalRevenue,
      completedOrders,
      totalProjects,
      publishedProjects,
      totalBlogPosts,
      publishedPosts,
      totalUsers,
      recentLeads,
      recentOrders,
      leadsByStatus,
      ordersByStatus,
      rawOrdersForTrend,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: "NEW" } }),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { finalAmount: true },
        where: { status: { in: ["DELIVERED", "CONFIRMED", "SHIPPED"] } },
      }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: "PUBLISHED" } }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { status: "PUBLISHED" } }),
      prisma.user.count(),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, companyName: true, status: true, createdAt: true, email: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, orderNumber: true, status: true, finalAmount: true, createdAt: true },
      }),
      prisma.lead.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30)), // Last 30 days
          },
        },
        select: {
          createdAt: true,
          finalAmount: true,
          status: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
    ]);

    // Format last 30 days trends
    const dailyTrendsMap: { [key: string]: { revenue: number; orders: number } } = {};
    for (let i = 29; i >= 0; i--) {
      const dateStr = new Date(new Date().setDate(new Date().getDate() - i)).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      });
      dailyTrendsMap[dateStr] = { revenue: 0, orders: 0 };
    }

    rawOrdersForTrend.forEach((order) => {
      const dateStr = new Date(order.createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
      });
      if (dailyTrendsMap[dateStr]) {
        dailyTrendsMap[dateStr].orders += 1;
        if (["DELIVERED", "CONFIRMED", "SHIPPED"].includes(order.status)) {
          dailyTrendsMap[dateStr].revenue += order.finalAmount;
        }
      }
    });

    const dailyTrends = Object.entries(dailyTrendsMap).map(([date, data]) => ({
      date,
      Gelir: data.revenue,
      Sipariş: data.orders,
    }));

    return NextResponse.json({
      totalLeads,
      newLeads,
      totalOrders,
      totalRevenue: totalRevenue._sum.finalAmount || 0,
      completedOrders,
      conversionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : "0.0",
      totalProjects,
      publishedProjects,
      totalBlogPosts,
      publishedPosts,
      totalUsers,
      recentLeads,
      recentOrders,
      leadsByStatus: leadsByStatus.map((item) => ({ name: item.status, value: item._count.id })),
      ordersByStatus: ordersByStatus.map((item) => ({ name: item.status, value: item._count.id })),
      dailyTrends,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
