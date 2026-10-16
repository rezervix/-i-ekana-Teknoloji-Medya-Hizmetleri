export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

async function checkAdminAuth(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) return null;
  const role = (token as any).role as string | undefined;
  if (!["ADMIN", "SUPER_ADMIN", "EDITOR"].includes(role ?? "")) {
    return null;
  }
  return token;
}

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req);
  if (!auth) {
    return NextResponse.json(
      { error: "Bu işlem için yönetici yetkisi gereklidir." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "ALL";
  const budget = searchParams.get("budget") || "ALL";
  const sector = searchParams.get("sector") || "ALL";
  const type = searchParams.get("type") || "ALL";

  const whereClause: any = {};

  if (status !== "ALL") {
    whereClause.status = status;
  }

  if (type !== "ALL") {
    whereClause.applicationType = type;
  }

  if (budget !== "ALL") {
    whereClause.monthlyServiceBudget = budget;
  }

  if (sector !== "ALL") {
    whereClause.sector = sector;
  }

  if (search) {
    whereClause.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { applicationNumber: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [applications, countsByStatus, countsByType, totalCount] = await Promise.all([
      prisma.socialMediaApplication.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          adminNotes: {
            orderBy: { createdAt: "desc" },
          },
        },
      }),
      prisma.socialMediaApplication.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.socialMediaApplication.groupBy({
        by: ["applicationType"],
        _count: { applicationType: true },
      }),
      prisma.socialMediaApplication.count(),
    ]);

    const stats: Record<string, number> = {
      TOTAL: totalCount,
      QUICK: 0,
      DETAILED: 0,
      NEW: 0,
      REVIEWING: 0,
      CONTACTED: 0,
      PROPOSAL_PREPARING: 0,
      PROPOSAL_SENT: 0,
      WON: 0,
      LOST: 0,
      ARCHIVED: 0,
    };

    countsByStatus.forEach((item) => {
      stats[item.status] = item._count.status;
    });

    countsByType.forEach((item) => {
      if (item.applicationType === "quick") stats.QUICK = item._count.applicationType;
      if (item.applicationType === "detailed") stats.DETAILED = item._count.applicationType;
    });

    return NextResponse.json({
      applications,
      stats,
    });
  } catch (error: any) {
    console.error("[Admin Social Applications GET Error]:", error);
    return NextResponse.json(
      { error: "Başvurular listelenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
