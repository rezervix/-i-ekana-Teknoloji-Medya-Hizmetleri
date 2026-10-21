export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkCustomerServiceAdminAuth, unauthorizedResponse } from "@/lib/ai/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";
  const search = searchParams.get("search")?.trim() || "";

  const whereClause: any = {};
  if (status !== "ALL") {
    whereClause.status = status;
  }
  if (search) {
    whereClause.question = { contains: search, mode: "insensitive" };
  }

  try {
    const logs = await prisma.unansweredQuestionLog.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const counts = await prisma.unansweredQuestionLog.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {
      PENDING: 0,
      REVIEWED: 0,
      RESOLVED: 0,
      IGNORED: 0,
    };
    for (const c of counts) {
      statusCounts[c.status] = c._count.id;
    }

    return NextResponse.json({
      success: true,
      logs,
      statusCounts,
    });
  } catch (err: any) {
    console.error("[AdminUnansweredListAPI] Error:", err);
    return NextResponse.json(
      { error: "Yanıtsız sorular listelenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const body = await req.json().catch(() => ({}));
    const { id, status, adminNotes } = body;

    if (!id) {
      return NextResponse.json({ error: "Kayıt kimliği gerekli." }, { status: 400 });
    }

    const updated = await prisma.unansweredQuestionLog.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, log: updated });
  } catch (err: any) {
    console.error("[AdminUnansweredUpdateAPI] Error:", err);
    return NextResponse.json({ error: "Kayıt güncellenemedi." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await checkCustomerServiceAdminAuth(req);
  if (!auth) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Kayıt kimliği gerekli." }, { status: 400 });
    }

    await prisma.unansweredQuestionLog.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Kayıt silindi." });
  } catch (err: any) {
    console.error("[AdminUnansweredDeleteAPI] Error:", err);
    return NextResponse.json({ error: "Kayıt silinemedi." }, { status: 500 });
  }
}
