import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (session.user as { role?: string })?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const log = await prisma.cartAbandonmentLog.findUnique({ where: { id } });
    if (!log) return NextResponse.json({ error: "Kayıt bulunamadı" }, { status: 404 });

    // Log reminder email
    await prisma.emailLog.create({
      data: {
        recipient: log.userId || "guest",
        subject: "Sepetinizde ürünler var!",
        status: "sent",
      },
    });

    // Update reminder count and sentAt
    const updated = await prisma.cartAbandonmentLog.update({
      where: { id },
      data: {
        reminderCount: { increment: 1 },
        emailSentAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, log: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
