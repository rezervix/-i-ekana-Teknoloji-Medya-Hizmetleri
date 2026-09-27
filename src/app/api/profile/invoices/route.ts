import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const invoices = await prisma.clientInvoice.findMany({
      where: { userId: authResult.user.id },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Faturalar yüklenirken hata oluştu." } },
      { status: 500 }
    );
  }
}
