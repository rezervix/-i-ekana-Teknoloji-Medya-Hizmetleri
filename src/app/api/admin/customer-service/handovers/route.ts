export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";
  const status = searchParams.get("status") || "ALL";

  const whereClause: any = {};
  if (status !== "ALL") {
    whereClause.status = status;
  }

  if (search) {
    whereClause.OR = [
      { customerPhone: { contains: search, mode: "insensitive" } },
      { customerName: { contains: search, mode: "insensitive" } },
      { customerEmail: { contains: search, mode: "insensitive" } },
      { unansweredQuestion: { contains: search, mode: "insensitive" } },
      { relatedProduct: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const handovers = await prisma.chatHandover.findMany({
      where: whereClause,
      include: {
        conversation: {
          select: {
            id: true,
            sessionId: true,
            pageUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      handovers,
    });
  } catch (err: any) {
    console.error("[AdminHandoversListAPI] Error:", err);
    return NextResponse.json({ error: "Talepler listelenirken bir hata oluştu." }, { status: 500 });
  }
}
