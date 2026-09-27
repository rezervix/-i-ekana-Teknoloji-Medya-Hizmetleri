import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTicketSchema = z.object({
  subject: z.string().min(3, "Konu en az 3 karakter olmalıdır."),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  message: z.string().min(5, "Açıklama en az 5 karakter olmalıdır."),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (!authResult.authorized) return authResult.response;

  try {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId: authResult.user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error) {
    console.error("Fetch support tickets error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Destek talepleri alınamadı." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const parsed = createTicketSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Geçersiz veri." } },
        { status: 400 }
      );
    }

    const { subject, priority, message } = parsed.data;

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: auth.user.id,
        subject,
        priority,
        status: "open",
        messages: {
          create: {
            senderType: "client",
            senderName: auth.user.name || auth.user.email || "Müşteri",
            message,
          },
        },
      },
      include: {
        messages: true,
      },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: auth.user.id,
        title: "Yeni Destek Talebi Açıldı",
        description: `#${ticket.id.slice(-6)}: ${subject}`,
        type: "support",
        link: `/profile?tab=support`,
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    console.error("Create support ticket error:", error);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Destek talebi oluşturulurken hata oluştu." } },
      { status: 500 }
    );
  }
}
