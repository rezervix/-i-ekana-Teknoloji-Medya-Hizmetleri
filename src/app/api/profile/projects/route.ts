import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const projects = await prisma.clientProject.findMany({
      where: { userId: authResult.user.id },
      include: {
        milestones: { orderBy: { order: "asc" } },
        deliverables: { orderBy: { uploadedAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("Fetch projects error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Projeler yüklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
