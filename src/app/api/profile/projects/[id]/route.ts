import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const { id } = await params;

    const project = await prisma.clientProject.findFirst({
      where: {
        id,
        userId: authResult.user.id, // Strict IDOR protection
      },
      include: {
        milestones: { orderBy: { order: "asc" } },
        deliverables: { orderBy: { uploadedAt: "desc" } },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Proje bulunamadı." } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Fetch project detail error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Proje detayları alınamadı." } },
      { status: 500 }
    );
  }
}
