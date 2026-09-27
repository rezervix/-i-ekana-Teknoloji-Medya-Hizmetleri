import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const activities = await prisma.activityLog.findMany({
      where: { userId: authResult.user.id },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, activities });
  } catch (error) {
    console.error("Fetch activity log error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Aktiviteler alınamadı." } },
      { status: 500 }
    );
  }
}
