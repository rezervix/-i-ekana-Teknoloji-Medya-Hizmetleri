import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const contracts = await prisma.clientContract.findMany({
      where: { userId: authResult.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, contracts });
  } catch (error) {
    console.error("Fetch contracts error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Sözleşmeler yüklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
