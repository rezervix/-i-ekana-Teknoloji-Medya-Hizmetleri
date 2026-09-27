import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const reports = await prisma.performanceReport.findMany({
      where: { userId: authResult.user.id },
      orderBy: { periodEnd: "desc" },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error) {
    console.error("Fetch reports error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Raporlar yüklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
